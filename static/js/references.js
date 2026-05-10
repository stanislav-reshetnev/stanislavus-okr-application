async function refreshTeamList() {
    const teams = await loadTeams();
    document.getElementById('teamList').innerHTML = teams.map(t => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <span id="team-name-${t.id}">${t.name}</span>
            <span>
                <button class="btn btn-outline-secondary btn-sm py-0 me-1" onclick="editTeam('${t.id}')">✎</button>
                <button class="btn btn-outline-danger btn-sm py-0" onclick="deleteTeam('${t.id}')">🗑️</button>
            </span>
        </li>`).join('');
}

async function editTeam(id) {
    const newName = prompt('New team name:', document.getElementById(`team-name-${id}`).textContent);
    if (!newName) return;
    await fetch(`/api/teams/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: newName}) });
    refreshTeamList(); refreshTree();
}

async function deleteTeam(id) {
    if (!confirm('Delete team? Objectives will lose their team association.')) return;
    await fetch(`/api/teams/${id}`, { method: 'DELETE' });
    refreshTeamList(); refreshTree();
}

async function refreshManagerList() {
    const managers = await loadManagers();
    document.getElementById('managerList').innerHTML = managers.map(m => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <span id="manager-name-${m.id}">${m.name}</span>
            <span>
                <button class="btn btn-outline-secondary btn-sm py-0 me-1" onclick="editManager('${m.id}')">✎</button>
                <button class="btn btn-outline-danger btn-sm py-0" onclick="deleteManager('${m.id}')">🗑️</button>
            </span>
        </li>`).join('');
}

async function editManager(id) {
    const newName = prompt('New manager name:', document.getElementById(`manager-name-${id}`).textContent);
    if (!newName) return;
    await fetch(`/api/managers/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: newName}) });
    refreshManagerList(); refreshTree();
}

async function deleteManager(id) {
    if (!confirm('Delete manager? Objectives will lose their manager association.')) return;
    await fetch(`/api/managers/${id}`, { method: 'DELETE' });
    refreshManagerList(); refreshTree();
}
