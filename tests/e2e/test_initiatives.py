"""E2E test: add Initiative — appears in tree, parent auto-expands."""


class TestAddInitiative:
    """Scenario 7: add Initiative via modal → visible → parent expanded."""

    def test_add_initiative_auto_expands_parent(self, app_page, api, default_cycle_id):
        obj = api.create_objective("E2E Init Parent", cycle_id=default_cycle_id)
        assert obj

        pg = app_page
        pg.reload()
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=10000)

        # Enter edit mode (checkbox is display:none, so set + dispatch via JS)
        pg.evaluate("""() => { const cb = document.getElementById('editModeToggle'); if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); } }""")
        pg.wait_for_timeout(500)

        # Click +Init on the objective node
        node = pg.locator(f"li[data-object-id='{obj['id']}']")
        node.locator("button", has_text="+Init").click()

        # Fill initiative modal
        pg.wait_for_selector("#initiativeName:visible", timeout=5000)
        init_name = "E2E Test Initiative"
        pg.fill("#initiativeName", init_name)
        pg.click("#initiativeForm button[type='submit']")

        # Initiative should appear in tree
        pg.locator(".init-name", has_text=init_name).wait_for(
            state="visible", timeout=10000
        )

        # Visual confirmation: initiative row inside the parent
        pg.locator(f"li[data-object-id='{obj['id']}'] .init-row").wait_for(
            state="visible", timeout=5000
        )
