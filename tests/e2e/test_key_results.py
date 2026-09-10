"""E2E test: add Key Result — appears in tree, parent auto-expands."""


class TestAddKeyResult:
    """Scenario 6: add KR via modal → KR visible → parent expanded."""

    def test_add_kr_auto_expands_parent(self, app_page, api, default_cycle_id):
        obj = api.create_objective("E2E KR Parent", cycle_id=default_cycle_id)
        assert obj

        pg = app_page
        pg.reload()
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=10000)

        # Enter edit mode (checkbox is display:none, so set + dispatch via JS)
        pg.evaluate("""() => { const cb = document.getElementById('editModeToggle'); if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); } }""")
        pg.wait_for_timeout(500)

        # Click +KR on the objective node
        node = pg.locator(f"li[data-object-id='{obj['id']}']")
        node.locator("button[title='Add Key Result']").click()

        # Fill KR modal
        pg.wait_for_selector("#krName:visible", timeout=5000)
        kr_name = "E2E Test KR"
        pg.fill("#krName", kr_name)
        pg.fill("#krTarget", "100")
        pg.fill("#krCurrent", "25")
        pg.click("#krForm button[type='submit']")

        # KR should appear in tree
        pg.locator(".kr-name", has_text=kr_name).wait_for(
            state="visible", timeout=10000
        )

        # Parent should be expanded: caret has caret-down class
        parent_li = pg.locator(f"li[data-object-id='{obj['id']}']")
        parent_li.locator(".caret.caret-down").wait_for(timeout=5000)


class TestKRDescriptionLimit:
    """Regression: 10K description limit + honest 4xx handling in the UI."""

    def test_api_accepts_10k_description(self, api, default_cycle_id):
        obj = api.create_objective("E2E KR Desc Limit", cycle_id=default_cycle_id)
        kr = api.create_kr(obj["id"], "E2E KR Desc")
        api.update_kr(kr["id"], description="x" * 10000)
        # PUT returns {'status': 'updated'} — read back from the tree
        tree = api.get_tree()
        node = next(o for o in tree if o["id"] == obj["id"])
        saved = next(k for k in node["keyResults"] if k["id"] == kr["id"])
        assert len(saved["description"]) == 10000

    def test_oversized_description_shows_error_not_saved(
        self, app_page, api, default_cycle_id
    ):
        obj = api.create_objective("E2E KR Desc Error", cycle_id=default_cycle_id)
        kr = api.create_kr(obj["id"], "E2E KR Oversize")
        assert kr

        pg = app_page
        pg.reload()
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=10000)
        pg.evaluate("""() => { const cb = document.getElementById('editModeToggle'); if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); } }""")
        pg.wait_for_timeout(500)

        # Expand the objective so the KR row is rendered
        node = pg.locator(f"li[data-object-id='{obj['id']}']")
        node.locator(".caret").click()
        pg.wait_for_timeout(300)

        # Open KR edit modal
        kr_row = pg.locator(f"li[data-object-id='{obj['id']}'] .kr-row", has_text="E2E KR Oversize")
        kr_row.locator("button[title='Edit']").click()
        pg.wait_for_selector("#krModal.show", timeout=5000)

        # Bypass maxlength via JS to simulate an oversized payload (curl path)
        pg.evaluate("""() => {
            const ta = document.getElementById('krDescription');
            ta.value = 'x'.repeat(10500);
        }""")
        pg.click("#krForm button[type='submit']")

        # Error toast appears, no success toast, modal stays open
        pg.locator(".toast-notification.error").first.wait_for(
            state="visible", timeout=10000
        )
        assert pg.locator(".toast-notification", has_text="Saved").count() == 0
        assert pg.locator("#krModal.show").count() == 1

        # Close modal to not leak into other tests
        pg.locator("#krModal .btn-close").click(force=True)
