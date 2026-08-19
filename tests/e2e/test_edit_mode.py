"""E2E test: edit mode toggle shows action buttons."""


class TestEditMode:
    """Scenario 4: entering edit mode reveals action buttons on a node."""

    def test_edit_mode_shows_action_buttons(self, app_page, api, default_cycle_id):
        # Seed an objective so we can check action buttons on a node
        obj = api.create_objective("E2E EditMode Obj", cycle_id=default_cycle_id)
        assert obj, "Failed to seed objective"

        pg = app_page
        pg.reload()
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=10000)

        # Enter edit mode (checkbox is display:none, so set + dispatch via JS)
        pg.evaluate("""() => { const cb = document.getElementById('editModeToggle'); if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); } }""")
        pg.wait_for_timeout(500)  # let JS apply changes

        # Action buttons should appear on the seeded node
        node = pg.locator(f"li[data-object-id='{obj['id']}']")
        node.locator("button.btn-outline-secondary[title='Edit']").wait_for(
            state="visible", timeout=10000
        )
        assert node.locator("button[title='Add Key Result']").is_visible()
        assert node.locator("button[title='Add Initiative']").is_visible()
        assert node.locator("button[title='Add Sub-Objective']").is_visible()
        assert node.locator("button.btn-outline-danger").is_visible()
