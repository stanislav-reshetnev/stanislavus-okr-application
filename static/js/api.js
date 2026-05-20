async function loadTree(teamId = '', managerId = '') {
    let url = '/api/tree';
    const params = new URLSearchParams();
    if (teamId) params.append('teamId', teamId);
    if (managerId) params.append('managerId', managerId);
    if (params.toString()) url += '?' + params.toString();
    const resp = await fetch(url);
    const data = await resp.json();
    return data.tree;
}

async function loadTeams() {
    const resp = await fetch('/api/teams');
    if (!resp.ok) throw new Error('Teams load error');
    const data = await resp.json();
    return data.teams;
}

async function loadManagers() {
    const resp = await fetch('/api/managers');
    if (!resp.ok) throw new Error('Managers load error');
    const data = await resp.json();
    return data.managers;
}

async function loadObjectivesFlat() {
    const resp = await fetch('/api/objectives/flat');
    if (!resp.ok) throw new Error('Objectives flat load error');
    const data = await resp.json();
    return data.objectives;
}
