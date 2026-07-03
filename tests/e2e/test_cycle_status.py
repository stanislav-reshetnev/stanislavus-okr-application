"""E2E test: cycle status transitions — API + UI verify.

handleUpdateCycleStatus does NOT use a confirm modal (app.js:152),
so we use the API to change status and then verify via the UI.
"""


class TestCycleStatusTransition:
    """Scenario: advance a cycle from in_progress to completed and verify UI."""

    def test_complete_cycle_via_api(self, app_page, api, default_cycle_id):
        pg = app_page

        # Advance to completed via API
        api.update_cycle_status(default_cycle_id, "completed")

        # Open cycles modal and verify status shows "Completed"
        pg.click("#profileBtn")
        pg.locator("a", has_text="OKR Cycles").click()
        pg.wait_for_selector("#cyclesModal.show", timeout=5000)
        pg.locator("#cycleList .status-completed").first.wait_for(
            state="visible", timeout=10000
        )
        pg.locator("#cyclesModal .btn-close").click()
        pg.wait_for_timeout(300)

        # Revert back to in_progress via API
        api.update_cycle_status(default_cycle_id, "in_progress")

        # Verify in_progress status in UI
        pg.click("#profileBtn")
        pg.locator("a", has_text="OKR Cycles").click()
        pg.wait_for_selector("#cyclesModal.show", timeout=5000)
        pg.locator("#cycleList .status-in_progress").first.wait_for(
            state="visible", timeout=10000
        )
        pg.locator("#cyclesModal .btn-close").click()
