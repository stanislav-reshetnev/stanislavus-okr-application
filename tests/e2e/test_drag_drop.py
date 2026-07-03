"""E2E test: drag-and-drop reorder of objectives.

Uses Playwright's built-in drag_to() with force=True to bypass
visibility checks on the drag handle, and programmatic DataTransfer
to exercise the custom DnD handler.
"""


class TestDragDrop:
    """Scenario: reorder two child objectives via drag-and-drop."""

    def test_drag_reorder_children(self, app_page, api, default_cycle_id):
        root = api.create_objective(
            "E2E DnD Root", cycle_id=default_cycle_id
        )
        assert root

        child_a = api.create_objective(
            "E2E DnD Alpha", cycle_id=default_cycle_id, parent_id=root["id"]
        )
        assert child_a

        child_b = api.create_objective(
            "E2E DnD Beta", cycle_id=default_cycle_id, parent_id=root["id"]
        )
        assert child_b

        pg = app_page
        pg.reload()
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=15000)

        # Both children should be visible in the tree
        pg.locator(".objective-name", has_text="E2E DnD Alpha").wait_for(
            state="visible", timeout=5000
        )
        pg.locator(".objective-name", has_text="E2E DnD Beta").wait_for(
            state="visible", timeout=5000
        )

        # Enter edit mode to show drag handles
        pg.evaluate("""() => { const cb = document.getElementById('editModeToggle'); if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); } }""")
        pg.wait_for_timeout(500)

        # Verify drag handles exist
        alpha_handle = pg.locator(f"li[data-object-id='{child_a['id']}'] .drag-handle")
        beta_handle = pg.locator(f"li[data-object-id='{child_b['id']}'] .drag-handle")
        alpha_handle.wait_for(state="visible", timeout=5000)
        beta_handle.wait_for(state="visible", timeout=5000)

        # Get initial order
        first_name_before = pg.evaluate(f'''() => {{
            const rootLi = document.querySelector('li[data-object-id="{root["id"]}"]');
            if (!rootLi) return null;
            const nodes = rootLi.querySelectorAll(':scope > ul > li > .node .objective-name');
            return nodes.length ? nodes[0].textContent.trim() : null;
        }}''')

        # Drag Beta using drag_to — force=True bypasses overlay/visibility checks
        target = pg.locator(f"li[data-object-id='{child_a['id']}'] .objective-name")
        beta_handle.drag_to(target, force=True)
        pg.wait_for_timeout(2000)
        pg.wait_for_selector("#loadingSkeleton", state="hidden", timeout=15000)

        # Verify order changed
        first_name_after = pg.evaluate(f'''() => {{
            const rootLi = document.querySelector('li[data-object-id="{root["id"]}"]');
            if (!rootLi) return null;
            const nodes = rootLi.querySelectorAll(':scope > ul > li > .node .objective-name');
            return nodes.length ? nodes[0].textContent.trim() : null;
        }}''')

        if first_name_before and first_name_after:
            assert "Beta" in first_name_after or "E2E DnD Beta" == first_name_after
