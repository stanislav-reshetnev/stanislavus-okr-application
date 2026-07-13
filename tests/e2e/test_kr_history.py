"""E2E test: KR progress chart appears in detail modal after value updates."""


class TestKRHistoryChart:
    """Scenario: update KR value via API → chart visible in detail modal."""

    def test_chart_appears_after_value_updates(self, app_page, api, default_cycle_id):
        obj = api.create_objective("E2E Chart Obj", cycle_id=default_cycle_id)
        kr = api.create_kr(obj["id"], "E2E Chart KR", initial=0, current=10, target=100, unit="%")

        api.update_kr(kr["id"], currentValue=50)

        pg = app_page
        pg.reload()
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=10000)

        pg.locator(f"li[data-object-id='{obj['id']}'] .caret").click()
        pg.wait_for_selector(".kr-row", state="visible", timeout=5000)

        pg.locator(".kr-row").first.click()
        pg.wait_for_selector("#krDetailModal.show", timeout=5000)
        pg.wait_for_selector("#krDetailChart", state="visible", timeout=5000)

    def test_snapshot_import_creates_history(self, app_page, api, default_cycle_id):
        """POST /snapshots adds a point without changing currentValue."""
        obj = api.create_objective("E2E Snap Obj", cycle_id=default_cycle_id)
        kr = api.create_kr(obj["id"], "E2E Snap KR", initial=0, current=50, target=100, unit="%")

        api.add_kr_snapshot(kr["id"], value=20, recorded_at="2026-01-15T10:00:00")

        history = api.get_kr_history(kr["id"])
        assert len(history) >= 2
        assert any(h["value"] == 20 for h in history)

        tree = api.get_tree()
        def find_kr(nodes):
            for n in nodes:
                if n.get("keyResults"):
                    for k in n["keyResults"]:
                        if k["id"] == kr["id"]:
                            return k
                if n.get("children"):
                    r = find_kr(n["children"])
                    if r:
                        return r
            return None
        kr_data = find_kr(tree)
        assert kr_data is not None
        assert float(kr_data["currentValue"]) == 50
