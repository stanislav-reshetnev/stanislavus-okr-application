async function loadTree(teamId = '', managerId = '') {
    let url = '/api/tree';
    const params = new URLSearchParams();
    if (teamId) params.append('team_id', teamId);
    if (managerId) params.append('manager_id', managerId);
    if (params.toString()) url += '?' + params.toString();
    const resp = await fetch(url);
    return resp.json();
}

async function loadTeams() {
    const resp = await fetch('/api/teams');
    if (!resp.ok) throw new Error('Teams load error');
    return resp.json();
}

async function loadManagers() {
    const resp = await fetch('/api/managers');
    if (!resp.ok) throw new Error('Managers load error');
    return resp.json();
}

async function loadObjectivesFlat() {
    const resp = await fetch('/api/objectives/flat');
    if (!resp.ok) throw new Error('Objectives flat load error');
    return resp.json();
}
