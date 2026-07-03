"""Pytest fixtures for E2E tests.

Fixtures:
    base_url         — session-scoped app URL from $BASE_URL
    wait_for_app     — session autouse, polls until app responds
    admin_credentials — ensures admin user exists via /setup
    default_cycle_id  — ensures at least one in_progress cycle exists
    api              — function-scoped ApiClient (admin), cleans up after test
    app_page         — authenticated browser page on the main screen
    anon_page        — anonymous browser page (no session cookie)

Artifacts (screenshots + traces) are saved to test-results/ on ANY failure,
including fixture setup errors.
"""
import os
import time

import pytest
import requests

from tests.helpers import ApiClient

ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "AdminPass123!"

ARTIFACTS_DIR = "test-results"


def _safe_name(node):
    return node.name.replace("[", "_").replace("]", "").replace("/", "_")


def _save_artifacts(context, pg, test_name, phase):
    """Save screenshot + trace for a failed phase."""
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    try:
        pg.screenshot(path=f"{ARTIFACTS_DIR}/{test_name}_{phase}.png")
    except Exception:
        pass
    try:
        context.tracing.stop(path=f"{ARTIFACTS_DIR}/{test_name}_trace.zip")
    except Exception:
        pass


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Store test phase reports + capture screenshots on ANY failure.

    Screenshots are embedded into the pytest-html report and also saved
    as standalone files in test-results/.
    """
    outcomes = yield
    report = outcomes.get_result()
    setattr(item, f"rep_{report.when}", report)

    if report.failed:
        os.makedirs(ARTIFACTS_DIR, exist_ok=True)
        test_name = _safe_name(item)
        screenshot_path = f"{ARTIFACTS_DIR}/{test_name}_{report.when}.png"

        # Setup failures: screenshot already saved by fixture (_save_artifacts).
        # Call/teardown failures: take from the live page in funcargs.
        if not os.path.exists(screenshot_path):
            for fname in ("app_page", "anon_page"):
                pg = item.funcargs.get(fname)
                if pg:
                    try:
                        pg.screenshot(path=screenshot_path)
                    except Exception:
                        pass
                    break

        # Embed in pytest-html report
        if os.path.exists(screenshot_path):
            try:
                from pytest_html import extras
                if not hasattr(report, "extras"):
                    report.extras = []
                report.extras.append(extras.image(screenshot_path))
            except ImportError:
                pass


@pytest.fixture(scope="session")
def base_url():
    return os.environ.get("BASE_URL", "http://localhost:5099").rstrip("/")


@pytest.fixture(scope="session", autouse=True)
def _clean_artifacts():
    """Remove stale artifacts before each test session.

    Deletes contents but not the directory itself — Docker volume mounts
    cannot be rmtree'd (Device or resource busy).
    """
    import shutil
    if os.path.exists(ARTIFACTS_DIR):
        for entry in os.listdir(ARTIFACTS_DIR):
            path = os.path.join(ARTIFACTS_DIR, entry)
            if os.path.isdir(path):
                shutil.rmtree(path)
            else:
                os.remove(path)
    else:
        os.makedirs(ARTIFACTS_DIR, exist_ok=True)


@pytest.fixture(scope="session", autouse=True)
def wait_for_app(base_url):
    """Poll the app until it responds (max 60s)."""
    for _ in range(60):
        try:
            r = requests.get(f"{base_url}/login", timeout=2)
            if r.status_code in (200, 302, 303):
                return
        except requests.RequestException:
            pass
        time.sleep(1)
    raise RuntimeError(f"App at {base_url} did not become ready in 60s")


@pytest.fixture(scope="session")
def admin_credentials(base_url, wait_for_app):
    """Ensure the admin user exists. Idempotent."""
    creds = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    client = ApiClient(base_url)
    if not client.login(creds["email"], creds["password"]):
        client.setup(creds["email"], creds["password"])
        client.login(creds["email"], creds["password"])
    return creds


@pytest.fixture(scope="session")
def default_cycle_id(base_url, admin_credentials):
    """Ensure at least one in_progress cycle exists, return its ID."""
    client = ApiClient(base_url)
    client.login(admin_credentials["email"], admin_credentials["password"])
    cycles = client.get_cycles()
    for c in cycles:
        if c.get("status") == "in_progress":
            return c["id"]
    # Always create an in_progress cycle — never fall back to draft
    cycle = client.create_cycle(
        "Test Cycle 2026", "2026-01-01", "2026-03-31", status="in_progress"
    )
    return cycle["id"] if cycle else None


@pytest.fixture(autouse=True)
def clean_cycle(base_url, admin_credentials, default_cycle_id):
    """Delete ALL objectives from the default cycle before each test.

    Prevents 409 'Only one root objective allowed' contamination between
    tests that create objectives via UI (not tracked by api.cleanup()).
    """
    client = ApiClient(base_url)
    client.login(admin_credentials["email"], admin_credentials["password"])
    r = client.session.get(f"{base_url}/api/tree?cycleId={default_cycle_id}")
    if not r.ok:
        return
    tree = r.json().get("tree", [])
    ids = []

    def collect(nodes):
        for node in nodes:
            ids.append(node["id"])
            if node.get("children"):
                collect(node["children"])

    collect(tree)
    for oid in reversed(ids):
        client.session.delete(f"{base_url}/api/objectives/{oid}")


@pytest.fixture
def api(base_url, admin_credentials, default_cycle_id):
    """Fresh ApiClient logged in as admin. Auto-cleans created data."""
    client = ApiClient(base_url)
    client.login(admin_credentials["email"], admin_credentials["password"])
    yield client
    client.cleanup()


@pytest.fixture
def app_page(browser, base_url, admin_credentials, default_cycle_id, request):
    """Authenticated browser page on the main screen.

    Uses UI login (not cookie injection) for maximum reliability.
    Saves screenshot + trace on setup or test failure.
    """
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    context.tracing.start(screenshots=True, snapshots=True, sources=True)
    pg = context.new_page()
    test_name = _safe_name(request.node)

    try:
        pg.goto(f"{base_url}/login")
        pg.fill('input[name="email"]', admin_credentials["email"])
        pg.fill('input[name="password"]', admin_credentials["password"])
        pg.click('button[type="submit"]')
        pg.wait_for_url("**/", timeout=10000)
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=15000)
    except Exception:
        _save_artifacts(context, pg, test_name, "setup")
        context.close()
        raise

    yield pg

    # Teardown — check if test failed
    rep = getattr(request.node, "rep_call", None)
    if rep and rep.failed:
        _save_artifacts(context, pg, test_name, "test")
    else:
        context.tracing.stop()
    context.close()


@pytest.fixture
def anon_page(browser, base_url, wait_for_app, request):
    """Anonymous browser page — no session cookie, for auth flow tests.

    Saves screenshot + trace on test failure.
    """
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    context.tracing.start(screenshots=True, snapshots=True, sources=True)
    pg = context.new_page()
    test_name = _safe_name(request.node)

    yield pg

    # Teardown — check if test failed
    rep = getattr(request.node, "rep_call", None)
    if rep and rep.failed:
        _save_artifacts(context, pg, test_name, "test")
    else:
        context.tracing.stop()
    context.close()
