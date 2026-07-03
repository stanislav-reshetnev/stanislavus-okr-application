"""HTTP API client for seeding test data via the real backend."""
import sys
import requests


class ApiClient:
    """Thin wrapper over requests.Session that tracks created IDs for cleanup."""

    def __init__(self, base_url):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self._created = {
            "initiatives": [],
            "key_results": [],
            "objectives": [],
            "users": [],
            "teams": [],
            "managers": [],
            "cycles": [],
        }

    def _log_and_raise(self, r, context):
        """Log response details and raise on API error."""
        body = r.text[:500] if r.text else "(empty)"
        msg = f"API {r.request.method} {r.url} -> {r.status_code}: {body}"
        print(msg, file=sys.stderr)
        raise AssertionError(f"{context}: {msg}")

    # ── Auth ──────────────────────────────────────────────────────

    def setup(self, email, password):
        r = self.session.post(
            f"{self.base_url}/setup",
            data={"email": email, "password": password, "confirm": password},
            allow_redirects=False,
        )
        return r.status_code in (302, 303)

    def login(self, email, password):
        r = self.session.post(
            f"{self.base_url}/login",
            data={"email": email, "password": password},
            allow_redirects=True,
        )
        # Follow redirects and check final URL: "/" = success, "/setup" = no users, "/login" = failure
        return r.url.rstrip("/") == f"{self.base_url}"

    def get_session_cookie(self):
        return self.session.cookies.get("session")

    # ── Cycles ────────────────────────────────────────────────────

    def get_cycles(self):
        r = self.session.get(f"{self.base_url}/api/cycles")
        return r.json().get("cycles", []) if r.ok else []

    def get_current_cycle_id(self):
        cycles = self.get_cycles()
        for c in cycles:
            if c.get("status") == "in_progress":
                return c["id"]
        return cycles[0]["id"] if cycles else None

    def create_cycle(self, name, start_date, end_date, status="draft"):
        r = self.session.post(
            f"{self.base_url}/api/cycles",
            json={"name": name, "startDate": start_date, "endDate": end_date},
        )
        if not r.ok:
            self._log_and_raise(r, "create_cycle")
        data = r.json()
        cid = data.get("id")
        if cid:
            self._created["cycles"].append(cid)
            if status == "in_progress":
                self.session.put(
                    f"{self.base_url}/api/cycles/{cid}/status",
                    json={"status": "in_progress"},
                )
            elif status == "completed":
                self.session.put(
                    f"{self.base_url}/api/cycles/{cid}/status",
                    json={"status": "in_progress"},
                )
                self.session.put(
                    f"{self.base_url}/api/cycles/{cid}/status",
                    json={"status": "completed"},
                )
        return data

    # ── Teams / Managers ──────────────────────────────────────────

    def create_team(self, name):
        r = self.session.post(f"{self.base_url}/api/teams", json={"name": name})
        if not r.ok:
            self._log_and_raise(r, "create_team")
        data = r.json()
        if data.get("id"):
            self._created["teams"].append(data["id"])
        return data

    def create_manager(self, name):
        r = self.session.post(f"{self.base_url}/api/managers", json={"name": name})
        if not r.ok:
            self._log_and_raise(r, "create_manager")
        data = r.json()
        if data.get("id"):
            self._created["managers"].append(data["id"])
        return data

    def get_teams(self):
        r = self.session.get(f"{self.base_url}/api/teams")
        return r.json().get("teams", []) if r.ok else []

    def get_managers(self):
        r = self.session.get(f"{self.base_url}/api/managers")
        return r.json().get("managers", []) if r.ok else []

    # ── Objectives ────────────────────────────────────────────────

    def create_objective(self, name, cycle_id=None, parent_id=None,
                         team_id=None, manager_id=None, doc_link=""):
        payload = {"name": name, "docLink": doc_link}
        if cycle_id is not None:
            payload["cycleId"] = cycle_id
        if parent_id is not None:
            payload["parentId"] = parent_id
        if team_id is not None:
            payload["teamId"] = team_id
        if manager_id is not None:
            payload["managerId"] = manager_id
        r = self.session.post(f"{self.base_url}/api/objectives", json=payload)
        if not r.ok:
            self._log_and_raise(r, "create_objective")
        obj = r.json()
        if obj.get("id"):
            self._created["objectives"].append(obj["id"])
        return obj

    def get_tree(self):
        r = self.session.get(f"{self.base_url}/api/tree")
        return r.json().get("tree", []) if r.ok else []

    # ── Key Results ───────────────────────────────────────────────

    def create_kr(self, objective_id, name, initial=0, current=0, target=100,
                  unit="%"):
        r = self.session.post(
            f"{self.base_url}/api/objectives/{objective_id}/keyresults",
            json={
                "name": name,
                "initialValue": initial,
                "currentValue": current,
                "targetValue": target,
                "unit": unit,
            },
        )
        if not r.ok:
            self._log_and_raise(r, "create_kr")
        kr = r.json()
        if kr.get("id"):
            self._created["key_results"].append(kr["id"])
        return kr

    # ── Initiatives ───────────────────────────────────────────────

    def create_initiative(self, objective_id, name, what="", impact="",
                          status="backlog"):
        r = self.session.post(
            f"{self.base_url}/api/objectives/{objective_id}/initiatives",
            json={"name": name, "what": what, "impact": impact, "status": status},
        )
        if not r.ok:
            self._log_and_raise(r, "create_initiative")
        init = r.json()
        if init.get("id"):
            self._created["initiatives"].append(init["id"])
        return init

    # ── Users ─────────────────────────────────────────────────────

    def create_user(self, email, password, role="view"):
        r = self.session.post(
            f"{self.base_url}/api/users",
            json={"email": email, "password": password, "role": role},
        )
        if not r.ok:
            self._log_and_raise(r, "create_user")
        user = r.json()
        if user.get("id"):
            self._created["users"].append(user["id"])
        return user

    def update_cycle_status(self, cycle_id, status):
        r = self.session.put(
            f"{self.base_url}/api/cycles/{cycle_id}/status",
            json={"status": status},
        )
        if not r.ok:
            self._log_and_raise(r, "update_cycle_status")
        return r.json()

    # ── Cleanup ───────────────────────────────────────────────────

    def cleanup(self):
        """Delete everything created during this session, LIFO order."""
        for endpoint, ids in [
            ("initiatives", self._created["initiatives"]),
            ("keyresults", self._created["key_results"]),
            ("objectives", self._created["objectives"]),
            ("users", self._created["users"]),
            ("teams", self._created["teams"]),
            ("managers", self._created["managers"]),
        ]:
            for item_id in reversed(ids):
                try:
                    self.session.delete(f"{self.base_url}/api/{endpoint}/{item_id}")
                except Exception:
                    pass
        for cid in reversed(self._created["cycles"]):
            try:
                self.session.delete(f"{self.base_url}/api/cycles/{cid}")
            except Exception:
                pass
        self._created = {k: [] for k in self._created}
