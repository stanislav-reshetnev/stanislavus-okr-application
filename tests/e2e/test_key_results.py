"""E2E test: add Key Result — appears in tree, parent auto-expands."""


class TestAddKeyResult:
    """Scenario 6: add KR via modal → KR visible → parent expanded."""

    def test_add_kr_auto_expands_parent(self, app_page, api, default_cycle_id):
        obj = api.create_objective("E2E KR Parent", cycle_id=default_cycle_id)
        assert obj

        pg = app_page
        pg.reload()
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=10000)

        # Enter edit mode (checkbox is display:none, so set + dispatch via JS)
        pg.evaluate("""() => { const cb = document.getElementById('editModeToggle'); if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); } }""")
        pg.wait_for_timeout(500)

        # Click +KR on the objective node
        node = pg.locator(f"li[data-object-id='{obj['id']}']")
        node.locator("button", has_text="+KR").click()

        # Fill KR modal
        pg.wait_for_selector("#krName:visible", timeout=5000)
        kr_name = "E2E Test KR"
        pg.fill("#krName", kr_name)
        pg.fill("#krTarget", "100")
        pg.fill("#krCurrent", "25")
        pg.click("#krForm button[type='submit']")

        # KR should appear in tree
        pg.locator(".kr-name", has_text=kr_name).wait_for(
            state="visible", timeout=10000
        )

        # Parent should be expanded: caret has caret-down class
        parent_li = pg.locator(f"li[data-object-id='{obj['id']}']")
        parent_li.locator(".caret.caret-down").wait_for(timeout=5000)
