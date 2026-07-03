"""E2E test: search highlights matching text in the tree."""


class TestSearchHighlight:
    """Scenario: search input highlights matching text without hiding nodes."""

    def test_search_highlights_text(self, app_page, api, default_cycle_id):
        obj = api.create_objective(
            "E2E SearchTarget Unique", cycle_id=default_cycle_id
        )
        assert obj

        pg = app_page
        pg.reload()
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=15000)

        # Ensure objective is visible
        pg.locator(".objective-name", has_text="E2E SearchTarget Unique").wait_for(
            state="visible", timeout=5000
        )

        # Enable search
        pg.click("#searchToggleBtn")
        pg.wait_for_selector("#searchInput:visible", timeout=5000)

        # Type search query
        pg.fill("#searchInput", "SearchTarget")
        pg.wait_for_timeout(500)

        # Matching text should be wrapped in <mark class="search-highlight">
        highlight = pg.locator("mark.search-highlight", has_text="SearchTarget")
        assert highlight.count() >= 1

        # Extra: non-matching objective should still be visible (not hidden)
        pg.locator(".objective-name", has_text="E2E SearchTarget Unique").wait_for(
            state="visible", timeout=5000
        )

        # Clear search
        pg.fill("#searchInput", "")
        pg.wait_for_timeout(500)

        # Highlights should disappear
        assert pg.locator("mark.search-highlight").count() == 0
