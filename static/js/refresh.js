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

async function refreshTree() {
    const treeContainer = document.getElementById('tree');
    treeContainer.innerHTML = '';
    objectivesMap = {};
    const data = await loadTree(selectedTeamId, selectedManagerId);
    collectObjectives(data);

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
        renderTree(data, treeContainer, true);
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
        renderTreeGraphic(data, treeContainer);
    }
}
