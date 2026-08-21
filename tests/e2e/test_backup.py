"""E2E tests: admin-only JSON backup export/import."""
import requests


class TestBackupAccess:
    """Menu visibility and role guards."""

    def test_menu_visible_for_admin(self, app_page):
        pg = app_page
        pg.locator("#profileBtn").click()
        pg.locator("#backupMenuItem").wait_for(state="visible", timeout=5000)

    def test_menu_hidden_and_api_forbidden_for_view_user(
        self, browser, base_url, api
    ):
        api.create_user("e2e-backup-view@test.com", "ViewPass123!", role="view")

        # Browser: login as view user, menu item must stay hidden
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        pg = context.new_page()
        try:
            pg.goto(f"{base_url}/login")
            pg.fill('input[name="email"]', "e2e-backup-view@test.com")
            pg.fill('input[name="password"]', "ViewPass123!")
            pg.click('button[type="submit"]')
            pg.wait_for_url("**/", timeout=10000)
            pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=15000)
            # Item stays in DOM but hidden via d-none for non-admins
            assert not pg.locator("#backupMenuItem").is_visible()
        finally:
            context.close()

        # API: all three endpoints must return 403 for the view user
        s = requests.Session()
        s.post(
            f"{base_url}/login",
            data={"email": "e2e-backup-view@test.com", "password": "ViewPass123!"},
        )
        assert s.get(f"{base_url}/api/backup/stats").status_code == 403
        assert s.post(
            f"{base_url}/api/backup/export", json={"tables": ["users"]}
        ).status_code == 403
        assert s.post(
            f"{base_url}/api/backup/import",
            json={"version": 1, "data": {"users": []}},
        ).status_code == 403


class TestBackupApi:
    """API behavior: stats, full/partial roundtrip, validation."""

    def _tree_names(self, api, cycle_id):
        r = api.session.get(
            f"{api.base_url}/api/tree", params={"cycleId": cycle_id}
        )
        assert r.ok
        return [root["name"] for root in r.json()["tree"]]

    def _export_all(self, api):
        r = api.session.post(f"{api.base_url}/api/backup/export", json={
            "tables": ["users", "teams", "managers", "cycles", "objectives",
                       "key_results", "kr_snapshots", "initiatives", "settings"],
        })
        assert r.ok, f"export failed: {r.status_code} {r.text}"
        return r.json()

    def _import(self, api, payload):
        r = api.session.post(f"{api.base_url}/api/backup/import", json=payload)
        return r

    def test_stats_reflect_data(self, api):
        team = api.create_team("e2e Backup Stats Team")
        r = api.session.get(f"{api.base_url}/api/backup/stats")
        assert r.ok
        stats = {t["name"]: t for t in r.json()["tables"]}
        assert set(stats) == {
            "users", "teams", "managers", "cycles", "objectives",
            "key_results", "kr_snapshots", "initiatives", "settings",
        }
        assert stats["teams"]["count"] >= 1
        assert stats["teams"]["sizeBytes"] > 0

    def test_full_roundtrip_restores_deleted_data(self, api, default_cycle_id):
        baseline = self._export_all(api)

        cycle = api.create_cycle("e2e Backup Cycle", "2026-07-01", "2026-09-30")
        team = api.create_team("e2e Backup Team")
        obj = api.create_objective(
            "e2e Backup Objective", cycle_id=cycle["id"], team_id=team["id"]
        )
        kr = api.create_kr(obj["id"], "e2e Backup KR", initial=0, current=40, target=100)
        api.add_kr_snapshot(kr["id"], 40, "2026-08-01T10:00:00")
        api.create_initiative(obj["id"], "e2e Backup Initiative")

        backup = self._export_all(api)
        assert len(backup["data"]["objectives"]) == len(baseline["data"]["objectives"]) + 1

        # Destroy: delete objective (cascades KR + snapshots + initiatives)
        api.session.delete(f"{api.base_url}/api/objectives/{obj['id']}")
        assert "e2e Backup Objective" not in self._tree_names(api, cycle["id"])

        # Restore
        r = self._import(api, backup)
        assert r.ok, f"import failed: {r.status_code} {r.text}"
        assert "e2e Backup Objective" in self._tree_names(api, cycle["id"])
        r = api.session.get(
            f"{api.base_url}/api/tree", params={"cycleId": cycle["id"]}
        )
        restored_obj = next(
            root for root in r.json()["tree"]
            if root["name"] == "e2e Backup Objective"
        )
        assert restored_obj["keyResults"][0]["name"] == "e2e Backup KR"
        history = api.get_kr_history(kr["id"])
        assert len(history) >= 1, "KR snapshots were not restored"

        # Users survived the restore
        users = api.session.get(f"{api.base_url}/api/users").json()
        assert any(u["email"] == "admin@test.com" for u in users.get("users", []))

        # Roll DB back to the pre-test state
        r = self._import(api, baseline)
        assert r.ok
        assert "e2e Backup Objective" not in self._tree_names(api, cycle["id"])

    def _flat_names(self, api):
        r = api.session.get(f"{api.base_url}/api/objectives/flat")
        assert r.ok
        return [o["name"] for o in r.json()["objectives"]]

    def test_partial_import_replaces_only_file_tables(self, api):
        team = api.create_team("e2e Partial Team")
        obj = api.create_objective("e2e Partial Objective")

        # Export ONLY teams
        r = api.session.post(f"{api.base_url}/api/backup/export",
                             json={"tables": ["teams"]})
        assert r.ok
        partial = r.json()
        assert set(partial["data"].keys()) == {"teams"}

        # Mutate: rename team, delete objective
        teams_before = api.get_teams()
        target_id = next(t["id"] for t in teams_before if t["name"] == "e2e Partial Team")
        api.session.put(f"{api.base_url}/api/teams/{target_id}",
                        json={"name": "e2e Renamed Team"})
        api.session.delete(f"{api.base_url}/api/objectives/{obj['id']}")

        # Import partial backup: team restored, objectives untouched
        r = self._import(api, partial)
        assert r.ok
        teams_after = api.get_teams()
        assert any(t["name"] == "e2e Partial Team" for t in teams_after)
        assert "e2e Partial Objective" not in self._flat_names(api), \
            "objectives must not be resurrected by a teams-only import"

    def test_invalid_imports_rejected(self, api):
        # Wrong version
        r = self._import(api, {"version": 2, "data": {"teams": []}})
        assert r.status_code == 400
        # Unknown table
        r = self._import(api, {"version": 1, "data": {"nope": []}})
        assert r.status_code == 400
        # Table rows not a list
        r = self._import(api, {"version": 1, "data": {"teams": {"id": "x"}}})
        assert r.status_code == 400
        # Row missing id
        r = self._import(api, {"version": 1, "data": {"teams": [{"name": "x"}]}})
        assert r.status_code == 400
        # Unknown column
        r = self._import(api, {"version": 1, "data": {"teams": [{"id": "x", "hacker": 1}]}})
        assert r.status_code == 400

    def test_export_rejects_unknown_tables(self, api):
        r = api.session.post(f"{api.base_url}/api/backup/export",
                             json={"tables": ["unknown_table"]})
        assert r.status_code == 400
        r = api.session.post(f"{api.base_url}/api/backup/export",
                             json={"tables": []})
        assert r.status_code == 400


class TestBackupModal:
    """UI: modal renders table list with counts."""

    def test_modal_lists_all_tables_with_counts(self, app_page):
        pg = app_page
        pg.locator("#profileBtn").click()
        pg.locator("#backupMenuItem").click()
        pg.wait_for_selector("#backupModal.show", timeout=5000)
        pg.locator("#backupTableList .backup-table-row").first.wait_for(
            state="visible", timeout=10000
        )
        rows = pg.locator("#backupTableList .backup-table-row")
        assert rows.count() == 9
        assert rows.locator("input[data-table='users']").first.is_checked()
        meta = rows.locator(".backup-table-meta").first.text_content()
        assert "records" in meta
        pg.locator("#backupModal .btn-close").click(force=True)
