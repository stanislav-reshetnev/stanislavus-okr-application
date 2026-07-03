"""E2E test: profile — change password via Edit Profile modal."""


class TestProfile:
    """Scenario: open profile, change password, then restore original password."""

    def test_change_password(self, app_page, base_url, admin_credentials):
        pg = app_page

        # Open profile dropdown → Edit Profile
        pg.click("#profileBtn")
        pg.locator("a", has_text="Edit Profile").click()
        pg.wait_for_selector("#profileModal.show", timeout=5000)

        email_text = pg.locator("#profileEmail").text_content()
        assert email_text == admin_credentials["email"]

        # Fill password form with a new password
        new_pw = admin_credentials["password"] + "!"
        pg.fill("#profileCurrentPassword", admin_credentials["password"])
        pg.fill("#profileNewPassword", new_pw)
        pg.fill("#profileConfirmPassword", new_pw)
        pg.click("#profileForm button[type='submit']")
        pg.wait_for_timeout(1500)

        # Close modal
        modal = pg.locator("#profileModal.show")
        if modal.count():
            pg.locator("#profileModal .btn-close").click()
            pg.wait_for_timeout(500)

        # Restore original password via direct API call
        import requests
        s = requests.Session()
        s.post(
            f"{base_url}/login",
            data={"email": admin_credentials["email"], "password": new_pw},
            allow_redirects=False,
        )
        # The profile endpoint expects a session; submitting the form again
        pg.goto(f"{base_url}/")
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=15000)
        pg.click("#profileBtn")
        pg.locator("a", has_text="Edit Profile").click()
        pg.wait_for_selector("#profileModal.show", timeout=5000)
        pg.fill("#profileCurrentPassword", new_pw)
        pg.fill("#profileNewPassword", admin_credentials["password"])
        pg.fill("#profileConfirmPassword", admin_credentials["password"])
        pg.click("#profileForm button[type='submit']")
        pg.wait_for_timeout(1500)
