"""E2E tests: cycle switcher — switching between cycles updates the tree."""
import uuid


class TestCycleSwitcher:
    """Switch cycles in the filter bar and verify the tree shows the right data."""

    def test_switch_cycle_changes_tree(self, app_page, api, default_cycle_id):
        pg = app_page
        suffix = uuid.uuid4().hex[:6]
        name_a, name_b = f"Cycle A {suffix}", f"Cycle B {suffix}"

        # Create two cycles with one distinct objective each
        cycle_a = api.create_cycle(name_a, "2026-01-01", "2026-03-31")
        assert cycle_a, "Failed to create Cycle A"
        obj_a = api.create_objective(
            "CycleA Objective", cycle_id=cycle_a["id"]
        )
        assert obj_a

        cycle_b = api.create_cycle(
            name_b, "2026-04-01", "2026-06-30", status="in_progress"
        )
        assert cycle_b, "Failed to create Cycle B"
        obj_b = api.create_objective(
            "CycleB Objective", cycle_id=cycle_b["id"]
        )
        assert obj_b

        pg.reload()
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=15000)

        # Wait for cycle switcher menu to be populated
        pg.locator("#cycleSwitcherMenu .dropdown-item").first.wait_for(
            state="attached", timeout=10000
        )

        # Select Cycle A (dropdown items are labeled by cycle name)
        pg.locator("#cycleSwitcher").click()
        pg.locator(
            "#cycleSwitcherMenu .dropdown-item", has_text=name_a
        ).click()
        pg.wait_for_timeout(1000)
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=15000)

        # Should see CycleA Objective, NOT CycleB Objective
        pg.locator(".objective-name", has_text="CycleA Objective").wait_for(
            state="visible", timeout=10000
        )
        assert pg.locator(".objective-name", has_text="CycleB Objective").count() == 0

        # Switch to Cycle B
        pg.locator("#cycleSwitcher").click()
        pg.locator(
            "#cycleSwitcherMenu .dropdown-item", has_text=name_b
        ).click()
        pg.wait_for_timeout(1000)
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=15000)

        # Should see CycleB Objective, NOT CycleA Objective
        pg.locator(".objective-name", has_text="CycleB Objective").wait_for(
            state="visible", timeout=10000
        )
        assert pg.locator(".objective-name", has_text="CycleA Objective").count() == 0

    def test_switcher_shows_colored_status_dot(self, app_page, api, default_cycle_id):
        """Selected cycle status is reflected by a colored dot on the closed switcher."""
        pg = app_page

        pg.reload()
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=15000)
        pg.locator("#cycleSwitcherMenu .dropdown-item").first.wait_for(
            state="attached", timeout=10000
        )

        # In-progress cycle is auto-selected on load; closed button shows blue dot
        dot = pg.locator("#cycleSwitcher > .cycle-dot")
        dot.wait_for(state="visible", timeout=10000)
        class_attr = dot.get_attribute("class") or ""
        assert "cycle-in_progress" in class_attr or "cycle-draft" in class_attr, (
            f"unexpected dot classes: {class_attr}"
        )
