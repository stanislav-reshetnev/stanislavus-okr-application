"""E2E tests: user CRUD via the Users modal.

Requires admin role (the app_page fixture logs in as admin).
"""


class TestUserCRUD:
    """Scenario: create, edit role, and delete a user via UI."""

    def _open_users_modal(self, pg):
        """Enter edit mode and open Users modal."""
        pg.evaluate("""() => { const cb = document.getElementById('editModeToggle'); if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); } }""")
        pg.wait_for_timeout(300)
        pg.locator("#usersBtn").wait_for(state="visible", timeout=5000)
        pg.click("#usersBtn")
        pg.wait_for_selector("#userModal.show", timeout=5000)
        pg.wait_for_selector("#userList li", timeout=5000)

    def test_create_user_via_ui(self, app_page, api):
        pg = app_page

        self._open_users_modal(pg)

        # Fill user form
        pg.fill("#userEmail", "e2e-new@test.com")
        pg.fill("#userPassword", "NewPass123!")
        pg.select_option("#userRole", "view")

        # Count users before
        count_before = pg.locator("#userList li").count()

        # Submit
        pg.click("#userForm button[type='submit']")
        pg.wait_for_timeout(1000)

        # Should appear in list
        pg.locator("#userList li", has_text="e2e-new@test.com").wait_for(
            state="visible", timeout=10000
        )
        assert pg.locator("#userList li").count() > count_before

        # Close modal
        pg.locator("#userModal .btn-close").click()

    def test_edit_user_role_via_ui(self, app_page, api):
        """Change role of the created user via the Edit button."""
        # Ensure user exists
        api.create_user("e2e-edit@test.com", "EditPass123!", role="view")

        pg = app_page
        self._open_users_modal(pg)

        # Find user and click edit
        user_li = pg.locator("#userList li", has_text="e2e-edit@test.com")
        user_li.wait_for(state="visible", timeout=5000)
        user_li.locator("button", has_text="✎").click()

        # First prompt: password (leave empty, just click OK)
        # Use type='button' to avoid matching the user form submit (type='submit')
        pg.wait_for_selector(".modal.show .btn-primary[type='button']", timeout=5000)
        pg.click(".modal.show .btn-primary[type='button']")

        # Second prompt: role
        pg.wait_for_selector(".modal.show input", timeout=5000)
        pg.fill(".modal.show input", "edit")
        pg.click(".modal.show .btn-primary[type='button']")

        # Wait for prompt modal to close, then dismiss user modal
        # (force=True bypasses any lingering prompt modal backdrop)
        pg.wait_for_selector("#userModal.show", timeout=5000)
        pg.locator("#userModal .btn-close").click(force=True)

    def test_delete_user_via_ui(self, app_page, api):
        """Delete the created user."""
        api.create_user("e2e-delete@test.com", "DelPass123!", role="view")

        pg = app_page
        self._open_users_modal(pg)

        # Find user and click delete
        user_li = pg.locator("#userList li", has_text="e2e-delete@test.com")
        user_li.wait_for(state="visible", timeout=5000)
        user_li.locator("button.btn-outline-danger").click()

        # Confirm deletion
        pg.wait_for_selector(".modal.show .btn-danger", timeout=5000)
        pg.click(".modal.show .btn-danger")
        pg.wait_for_timeout(1000)

        # Should be gone from list
        assert pg.locator("#userList li", has_text="e2e-delete@test.com").count() == 0

        # Close modal (force=True in case confirm modal backdrop lingers)
        pg.locator("#userModal .btn-close").click(force=True)
