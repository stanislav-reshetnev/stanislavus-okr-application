async function populateFilters() {
    const [teams, managers] = await Promise.all([loadTeams(), loadManagers()]);
    const teamSelect = document.getElementById('filterTeam');
    const managerSelect = document.getElementById('filterManager');
    teamSelect.innerHTML = '<option value="">-- All Teams --</option>' +
        teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    managerSelect.innerHTML = '<option value="">-- All Managers --</option>' +
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

async function moveObjective(objectiveId, newParentId) {
    await fetch(`/api/objectives/${objectiveId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_id: newParentId })
    });
    refreshTree();
}

function setupRootDropZone() {
    treePanel.addEventListener('dragover', (e) => {
        if (!editMode) return;
        if (!e.target.closest('.node')) e.preventDefault();
    });
    treePanel.addEventListener('drop', (e) => {
        if (!editMode) return;
        const closestNode = e.target.closest('.node');
        if (!closestNode) {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('text/plain');
            if (draggedId) moveObjective(draggedId, null);
        }
    });
}

function filterTree(nodes, query) {
    if (!query) return nodes;
    const q = query.toLowerCase();
    return nodes.reduce((acc, node) => {
        const nameMatch = node.name.toLowerCase().includes(q);
        const filteredKRs = nameMatch || !node.keyresults
            ? node.keyresults
            : node.keyresults.filter(kr => kr.name.toLowerCase().includes(q));
        const krMatch = !nameMatch && filteredKRs && filteredKRs.length > 0;
        const filteredChildren = node.children ? filterTree(node.children, q) : [];
        if (nameMatch || krMatch || filteredChildren.length > 0) {
            acc.push({ ...node, keyresults: filteredKRs, children: filteredChildren });
        }
        return acc;
    }, []);
}

async function refreshTree() {
    const treeContainer = document.getElementById('tree');
    treeContainer.innerHTML = '';
    objectivesMap = {};
    const data = await loadTree(selectedTeamId, selectedManagerId);
    collectObjectives(data);
    const filtered = filterTree(data, searchQuery);

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
        renderTree(filtered, treeContainer, true);
        document.querySelectorAll('.caret').forEach(caret => {
            caret.addEventListener('click', function() {
                this.classList.toggle('caret-down');
                const li = this.closest('li');
                if (li) {
                    const krBlock = li.querySelector('.kr-item');
                    if (krBlock) krBlock.classList.toggle('active');
                }
            });
        });
    } else if (viewMode === 'tree') {
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
