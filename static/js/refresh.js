async function populateFilters() {
    const [teams, managers] = await Promise.all([loadTeams(), loadManagers()]);
    const teamSelect = document.getElementById('filterTeam');
    const managerSelect = document.getElementById('filterManager');
    teamSelect.innerHTML = '<option value="">All Teams</option>' +
        teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    managerSelect.innerHTML = '<option value="">All Managers</option>' +
        managers.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
}

async function applyFilter(selectEl) {
    const teamSelect = document.getElementById('filterTeam');
    const managerSelect = document.getElementById('filterManager');
    if (selectEl === teamSelect) {
        managerSelect.value = '';
        selectedManagerId = '';
        selectedTeamId = teamSelect.value;
    } else {
        teamSelect.value = '';
        selectedTeamId = '';
        selectedManagerId = managerSelect.value;
    }
    document.getElementById('resetFilterBtn').style.display = (selectedTeamId || selectedManagerId) ? 'inline-block' : 'none';
    await refreshTree();
}

function resetFilter() {
    document.getElementById('filterTeam').value = '';
    document.getElementById('filterManager').value = '';
    selectedTeamId = '';
    selectedManagerId = '';
    document.getElementById('resetFilterBtn').style.display = 'none';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) { searchInput.value = ''; searchQuery = ''; }
    refreshTree();
}

async function reorderObjectives(items) {
    await fetch('/api/objectives/reorder', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({items})
    });
    await refreshTree({ skipSkeleton: true });
}

async function reorderKRs(items) {
    await fetch('/api/keyresults/reorder', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({items})
    });
    await refreshTree({ skipSkeleton: true });
}

async function reorderInitiatives(items) {
    await fetch('/api/initiatives/reorder', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({items})
    });
    await refreshTree({ skipSkeleton: true });
}

async function refreshTree(opts = {}) {
    const { skipSkeleton, ensureExpanded } = opts;
    const treeContainer = document.getElementById('tree');
    const skeleton = document.getElementById('loadingSkeleton');
    const emptyState = document.getElementById('emptyState');

    const expandedObjectives = new Set();
    document.querySelectorAll('.kr-item.active').forEach(el => {
        const li = el.closest('li[data-object-id]');
        if (li) expandedObjectives.add(li.dataset.objectId);
    });
    if (ensureExpanded) {
        const ids = Array.isArray(ensureExpanded) ? ensureExpanded : [ensureExpanded];
        ids.forEach(id => expandedObjectives.add(String(id)));
    }

    if (!skipSkeleton) {
        treeContainer.innerHTML = '';
        if (skeleton) skeleton.style.display = '';
        if (emptyState) emptyState.style.display = 'none';
        treeContainer.style.display = 'none';
    }

    const data = await loadTree(selectedTeamId, selectedManagerId, selectedCycleId);
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        (function walk(nodes) {
            for (const node of nodes) {
                const nameMatch = node.name.toLowerCase().includes(q);
                const krMatch = node.keyResults?.some(kr => kr.name.toLowerCase().includes(q));
                const initMatch = node.initiatives?.some(i => i.name.toLowerCase().includes(q));
                if (nameMatch || krMatch || initMatch) expandedObjectives.add(String(node.id));
                if (node.children) walk(node.children);
            }
        })(data);
    }
    const filtered = data;

    if (!skipSkeleton) {
        if (skeleton) skeleton.style.display = 'none';
        if (!filtered.length) {
            if (emptyState) emptyState.style.display = '';
            treeContainer.style.display = 'none';
        } else {
            treeContainer.style.display = '';
        }
    }

    const treePanel = document.getElementById('treePanel');
    if (viewMode === 'tree') {
        treePanel.classList.add('tree-mode');
        fullscreenBtn.style.display = 'block';
        collapseKRBtn.style.display = 'none';
    } else {
        treePanel.classList.remove('tree-mode');
        fullscreenBtn.style.display = 'none';
        collapseKRBtn.style.display = 'block';
    }

    if (viewMode === 'hierarchy') {
        if (graphResizeHandler) {
            window.removeEventListener('resize', graphResizeHandler);
            graphResizeHandler = null;
        }
        graphCurrentRoots = null;

        const fragment = document.createDocumentFragment();
        renderTree(filtered, fragment, true);
        expandedObjectives.forEach(id => {
            const li = fragment.querySelector(`li[data-object-id="${id}"]`);
            if (li) {
                const caret = li.querySelector('.caret');
                const krBlocks = li.querySelectorAll('.kr-item');
                if (caret) caret.classList.add('caret-down');
                krBlocks.forEach(block => block.classList.add('active'));
            }
        });
        treeContainer.innerHTML = '';
        treeContainer.appendChild(fragment);

        document.querySelectorAll('.caret').forEach(caret => {
            caret.addEventListener('click', function() {
                this.classList.toggle('caret-down');
                const li = this.closest('li');
                if (li) {
                    li.querySelectorAll('.kr-item').forEach(el => el.classList.toggle('active'));
                }
            });
        });
    } else if (viewMode === 'tree') {
        treeContainer.innerHTML = '';
        renderTreeGraphic(filtered, treeContainer);
    }
}

function initSearch() {
    const toggleBtn = document.getElementById('searchToggleBtn');
    const input = document.getElementById('searchInput');
    if (!toggleBtn || !input) return;

    toggleBtn.addEventListener('click', () => {
        const hidden = input.style.display === 'none';
        input.style.display = hidden ? '' : 'none';
        if (hidden) input.focus();
        else { input.value = ''; doSearch(''); }
    });

    input.addEventListener('input', () => doSearch(input.value));

    function doSearch(q) {
        searchQuery = q.trim();
        refreshTree();
    }
}
