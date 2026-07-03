"""E2E test: settings — change default cycle length."""


class TestSettings:
    """Scenario: open settings modal, change cycle length, save, verify."""

    def test_change_cycle_length(self, app_page):
        pg = app_page

        # Open profile dropdown → Settings
        pg.click("#profileBtn")
        pg.locator("a", has_text="Settings").click()
        pg.wait_for_selector("#settingsModal.show", timeout=5000)

        # Get current value
        pg.wait_for_selector("#settingCycleLength", timeout=5000)
        current_val = pg.evaluate(
            "document.getElementById('settingCycleLength').value"
        )

        # Toggle to a different value
        new_val = "month" if current_val != "month" else "year"
        pg.select_option("#settingCycleLength", new_val)
        pg.click("#settingsForm button[type='submit']")

        # Wait for toast notification
        pg.wait_for_timeout(1000)

        # Close modal
        pg.locator("#settingsModal .btn-close").click()

        # Reopen and verify
        pg.wait_for_timeout(500)
        pg.click("#profileBtn")
        pg.locator("a", has_text="Settings").click()
        pg.wait_for_selector("#settingsModal.show", timeout=5000)
        pg.wait_for_selector("#settingCycleLength", timeout=5000)

        saved_val = pg.evaluate(
            "document.getElementById('settingCycleLength').value"
        )
        assert saved_val == new_val, (
            f"Expected {new_val}, got {saved_val}"
        )

        # Restore original value
        pg.select_option("#settingCycleLength", current_val)
        pg.click("#settingsForm button[type='submit']")
        pg.wait_for_timeout(500)
        pg.locator("#settingsModal .btn-close").click()
