"""E2E tests for search filtering and highlighting."""


class TestSearchHighlight:
    """Scenario: search input filters the tree and highlights matches."""

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

        # The search result remains visible.
        pg.locator(".objective-name", has_text="E2E SearchTarget Unique").wait_for(
            state="visible", timeout=5000
        )

        # A query with no matches must not fall back to rendering the whole tree.
        pg.fill("#searchInput", "definitely-no-such-okr-aaaa")
        pg.wait_for_timeout(500)
        pg.locator(".empty-title", has_text="No results found").wait_for(
            state="visible", timeout=5000
        )
        assert pg.locator(".node").count() == 0
        assert pg.locator(".empty-desc", has_text="definitely-no-such-okr-aaaa").count() == 1

        # Clear search
        pg.fill("#searchInput", "")
        pg.wait_for_timeout(500)

        # Highlights should disappear
        assert pg.locator("mark.search-highlight").count() == 0
        assert pg.locator(".empty-title", has_text="No results found").count() == 0
