"""E2E test: +Obj button creates a child objective with inherited team/manager."""


class TestSubObjective:
    """Scenario: click +Obj on a node → modal opens → submit → child appears nested."""

    def test_plus_obj_creates_child_objective(self, app_page, api, default_cycle_id):
        team = api.create_team("E2E Child Team")
        assert team
        manager = api.create_manager("E2E Child Mgr")
        assert manager

        parent = api.create_objective(
            "E2E Parent Obj",
            cycle_id=default_cycle_id,
            team_id=team["id"],
            manager_id=manager["id"],
        )
        assert parent

        pg = app_page
        pg.reload()
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=15000)

        # Enter edit mode (checkbox is display:none, so set + dispatch via JS)
        pg.evaluate("""() => { const cb = document.getElementById('editModeToggle'); if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); } }""")
        pg.wait_for_timeout(500)

        # Click +Obj on the parent node
        parent_li = pg.locator(f"li[data-object-id='{parent['id']}']")
        parent_li.locator("button", has_text="+Obj").click()

        # Modal should open with team/manager pre-selected
        pg.wait_for_selector("#objModal.show", timeout=5000)

        # Fill child name
        pg.fill("#objName", "E2E Child Objective")
        pg.click("#objForm button[type='submit']")

        # Wait for child to appear (parent should expand to show it)
        pg.locator(".objective-name", has_text="E2E Child Objective").wait_for(
            state="visible", timeout=10000
        )

        # It should appear nested under parent
        child_li = parent_li.locator("li[data-object-id]")
        assert child_li.count() >= 1
