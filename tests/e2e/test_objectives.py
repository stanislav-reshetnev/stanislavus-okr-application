"""E2E tests: objective CRUD (create, edit, delete).

All tests enter edit mode, interact with modals, and verify the tree updates.
"""


class TestCreateObjective:
    """Scenario 5: create objective → appears in tree → still in edit mode."""

    def test_create_objective_stays_in_edit_mode(self, app_page, default_cycle_id):
        pg = app_page

        # Enter edit mode (checkbox is display:none, so set + dispatch via JS)
        pg.evaluate("""() => { const cb = document.getElementById('editModeToggle'); if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); } }""")
        pg.locator("#createObjBtn").wait_for(state="visible", timeout=5000)

        # Open create modal
        pg.click("#createObjBtn")
        pg.wait_for_selector("#objName:visible", timeout=5000)

        obj_name = "E2E Created Objective"
        pg.fill("#objName", obj_name)
        pg.click("#objForm button[type='submit']")

        # Objective should appear in tree
        pg.locator(".objective-name", has_text=obj_name).wait_for(
            state="visible", timeout=10000
        )

        # Should still be in edit mode
        assert pg.is_checked("#editModeToggle"), (
            "Should remain in edit mode after creating objective"
        )
        assert pg.locator("#createObjBtn").is_visible()


class TestEditObjective:
    """Scenario 8: edit objective name → updated in tree."""

    def test_edit_objective_name(self, app_page, api, default_cycle_id):
        obj = api.create_objective("E2E Before Edit", cycle_id=default_cycle_id)
        assert obj

        pg = app_page
        pg.reload()
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=10000)

        # Enter edit mode (checkbox is display:none, so set + dispatch via JS)
        pg.evaluate("""() => { const cb = document.getElementById('editModeToggle'); if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); } }""")
        pg.wait_for_timeout(500)

        # Click edit button on the objective
        node = pg.locator(f"li[data-object-id='{obj['id']}']")
        node.locator("button.btn-outline-secondary").first.click()

        # Wait for modal, change name
        pg.wait_for_selector("#objName:visible", timeout=5000)
        pg.fill("#objName", "")
        pg.fill("#objName", "E2E After Edit")
        pg.click("#objForm button[type='submit']")

        # New name should appear, old name should not
        pg.locator(".objective-name", has_text="E2E After Edit").wait_for(
            state="visible", timeout=10000
        )
        assert pg.locator(".objective-name", has_text="E2E Before Edit").count() == 0


class TestDeleteObjective:
    """Scenario 9: delete objective → removed from tree."""

    def test_delete_objective(self, app_page, api, default_cycle_id):
        obj = api.create_objective("E2E Delete Me", cycle_id=default_cycle_id)
        assert obj

        pg = app_page
        pg.reload()
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=10000)

        # Verify it exists
        pg.locator(".objective-name", has_text="E2E Delete Me").wait_for(
            state="visible", timeout=5000
        )

        # Enter edit mode (checkbox is display:none, so set + dispatch via JS)
        pg.evaluate("""() => { const cb = document.getElementById('editModeToggle'); if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); } }""")
        pg.wait_for_timeout(500)

        # Click delete button
        node = pg.locator(f"li[data-object-id='{obj['id']}']")
        node.locator("button.btn-outline-danger").click()

        # Confirm in dynamic modal (btn-danger = "Confirm" button)
        pg.wait_for_selector(".modal.show .btn-danger", timeout=5000)
        pg.click(".modal.show .btn-danger")

        # Wait for tree refresh after deletion
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=15000)
        pg.wait_for_timeout(1000)

        # Objective should be gone from tree
        assert pg.locator(".objective-name", has_text="E2E Delete Me").count() == 0
