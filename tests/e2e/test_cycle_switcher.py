"""E2E tests: cycle switcher — switching between cycles updates the tree."""


class TestCycleSwitcher:
    """Switch cycles in the filter bar and verify the tree shows the right data."""

    def test_switch_cycle_changes_tree(self, app_page, api, default_cycle_id):
        pg = app_page

        # Create two cycles with one distinct objective each
        cycle_a = api.create_cycle("Cycle A", "2026-01-01", "2026-03-31")
        assert cycle_a, "Failed to create Cycle A"
        obj_a = api.create_objective(
            "CycleA Objective", cycle_id=cycle_a["id"]
        )
        assert obj_a

        cycle_b = api.create_cycle(
            "Cycle B", "2026-04-01", "2026-06-30", status="in_progress"
        )
        assert cycle_b, "Failed to create Cycle B"
        obj_b = api.create_objective(
            "CycleB Objective", cycle_id=cycle_b["id"]
        )
        assert obj_b

        pg.reload()
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=15000)

        # Wait for cycle switcher to be populated
        pg.locator("#cycleSwitcher option").first.wait_for(
            state="attached", timeout=10000
        )

        # Select Cycle A (by value, labels have emoji prefixes like "🟡 Cycle A")
        pg.select_option("#cycleSwitcher", value=cycle_a["id"])
        pg.wait_for_timeout(1000)
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=15000)

        # Should see CycleA Objective, NOT CycleB Objective
        pg.locator(".objective-name", has_text="CycleA Objective").wait_for(
            state="visible", timeout=10000
        )
        assert pg.locator(".objective-name", has_text="CycleB Objective").count() == 0

        # Switch to Cycle B (by value)
        pg.select_option("#cycleSwitcher", value=cycle_b["id"])
        pg.wait_for_timeout(1000)
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=15000)

        # Should see CycleB Objective, NOT CycleA Objective
        pg.locator(".objective-name", has_text="CycleB Objective").wait_for(
            state="visible", timeout=10000
        )
        assert pg.locator(".objective-name", has_text="CycleA Objective").count() == 0
