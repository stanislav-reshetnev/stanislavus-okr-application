"""E2E tests: filter by team and manager — tree updates accordingly.

Only one root objective is allowed per cycle, so we create a single root
and add additional objectives as children.
"""


class TestFilterByTeam:
    """Scenario: filter by team shows only matching objectives."""

    def test_filter_by_team(self, app_page, api, default_cycle_id):
        team = api.create_team("E2E Test Team")
        assert team, "Failed to create team"

        root = api.create_objective(
            "E2E Root With Team", cycle_id=default_cycle_id, team_id=team["id"]
        )
        assert root

        child = api.create_objective(
            "E2E Child No Team", cycle_id=default_cycle_id, parent_id=root["id"]
        )
        assert child

        pg = app_page
        pg.reload()
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=15000)

        # Both should be visible initially (tree shows all)
        pg.locator(".objective-name", has_text="E2E Root With Team").wait_for(
            state="visible", timeout=5000
        )
        # The child is inside the root — root may be collapsed, but the node exists
        pg.locator(".objective-name", has_text="E2E Child No Team").wait_for(
            state="visible", timeout=5000
        )

        # Filter by team
        pg.select_option("#filterTeam", label="E2E Test Team")
        pg.wait_for_timeout(1000)

        # Root (matches filter) should remain, child (no team) should be hidden
        pg.locator(".objective-name", has_text="E2E Root With Team").wait_for(
            state="visible", timeout=5000
        )
        assert pg.locator(
            ".objective-name", has_text="E2E Child No Team"
        ).count() == 0

        # Reset filter
        pg.click("#resetFilterBtn")
        pg.wait_for_timeout(500)

        # Child should be visible again
        pg.locator(".objective-name", has_text="E2E Child No Team").wait_for(
            state="visible", timeout=5000
        )


class TestFilterByManager:
    """Scenario: filter by manager shows only matching objectives."""

    def test_filter_by_manager(self, app_page, api, default_cycle_id):
        manager = api.create_manager("E2E Test Manager")
        assert manager, "Failed to create manager"

        root = api.create_objective(
            "E2E Root With Mgr",
            cycle_id=default_cycle_id,
            manager_id=manager["id"],
        )
        assert root

        child = api.create_objective(
            "E2E Child No Mgr", cycle_id=default_cycle_id, parent_id=root["id"]
        )
        assert child

        pg = app_page
        pg.reload()
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=15000)

        pg.locator(".objective-name", has_text="E2E Root With Mgr").wait_for(
            state="visible", timeout=5000
        )

        # Filter by manager
        pg.select_option("#filterManager", label="E2E Test Manager")
        pg.wait_for_timeout(1000)

        # Root (matches filter) should remain, child (no manager) should be hidden
        pg.locator(".objective-name", has_text="E2E Root With Mgr").wait_for(
            state="visible", timeout=5000
        )
        assert pg.locator(
            ".objective-name", has_text="E2E Child No Mgr"
        ).count() == 0
