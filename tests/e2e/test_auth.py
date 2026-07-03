"""E2E tests: authentication flows (setup, login, roles, logout).

test_setup_creates_admin runs first — on a fresh Docker DB it tests the
initial setup flow; if an admin already exists it skips gracefully.
"""
import pytest

ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "AdminPass123!"


class TestSetup:
    """Scenario 1: initial admin setup on fresh DB."""

    def test_setup_creates_admin(self, anon_page, base_url):
        pg = anon_page
        pg.goto(f"{base_url}/")
        # If admin already exists → redirected to /login, not /setup
        if "/login" in pg.url:
            pytest.skip("Admin already exists — not a fresh DB")

        assert "/setup" in pg.url
        pg.fill('input[name="email"]', ADMIN_EMAIL)
        pg.fill('input[name="password"]', ADMIN_PASSWORD)
        pg.fill('input[name="confirm"]', ADMIN_PASSWORD)
        pg.click('button[type="submit"]')

        pg.wait_for_url("**/", timeout=10000)
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=10000)
        # Admin should see the edit mode toggle
        assert pg.locator(".mode-switch").is_visible()


class TestLogin:
    """Scenario 2: admin login via UI."""

    def test_login_admin_success(self, anon_page, base_url):
        pg = anon_page
        pg.goto(f"{base_url}/login")

        pg.fill('input[name="email"]', ADMIN_EMAIL)
        pg.fill('input[name="password"]', ADMIN_PASSWORD)
        pg.click('button[type="submit"]')

        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=10000)
        assert pg.url.rstrip("/") == base_url

    def test_login_view_role_no_edit_toggle(self, anon_page, base_url, api):
        """Scenario 3: view-role user must not see edit mode toggle."""
        api.create_user("viewer@test.com", "ViewerPass123!", role="view")

        pg = anon_page
        pg.goto(f"{base_url}/login")
        pg.fill('input[name="email"]', "viewer@test.com")
        pg.fill('input[name="password"]', "ViewerPass123!")
        pg.click('button[type="submit"]')

        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=10000)
        # .mode-switch should be display:none for view role
        mode_switch = pg.locator(".mode-switch")
        assert not mode_switch.is_visible(), (
            "Edit mode toggle should be hidden for view role"
        )


class TestLogout:
    """Scenario 10: logout redirects to login."""

    def test_logout_redirects_to_login(self, app_page, base_url):
        pg = app_page
        # Open profile dropdown
        pg.click("#profileBtn")
        pg.click('a[href="/logout"]')

        pg.wait_for_url("**/login", timeout=10000)
        assert "/login" in pg.url
