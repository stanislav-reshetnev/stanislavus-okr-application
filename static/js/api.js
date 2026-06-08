async function loadTree(teamId = '', managerId = '', cycleId = '') {
    let url = '/api/tree';
    const params = new URLSearchParams();
    if (teamId) params.append('teamId', teamId);
    if (managerId) params.append('managerId', managerId);
    if (cycleId) params.append('cycleId', cycleId);
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

async function loadObjectivesFlat(cycleId = '') {
    let url = '/api/objectives/flat';
    if (cycleId) url += '?cycleId=' + encodeURIComponent(cycleId);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Objectives flat load error');
    const data = await resp.json();
    return data.objectives;
}

async function loadSettings() {
    const resp = await fetch('/api/settings');
    if (!resp.ok) throw new Error('Settings load error');
    return await resp.json();
}

async function updateSettings(settings) {
    const resp = await fetch('/api/settings', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(settings)
    });
    if (!resp.ok) throw new Error('Settings update error');
    return await resp.json();
}

async function loadCycles() {
    const resp = await fetch('/api/cycles');
    if (!resp.ok) throw new Error('Cycles load error');
    const data = await resp.json();
    return data.cycles;
}

async function createCycle(data) {
    const resp = await fetch('/api/cycles', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Cycle create error');
    }
    return await resp.json();
}

async function apiUpdateCycleStatus(cycleId, status) {
    const resp = await fetch(`/api/cycles/${cycleId}/status`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({status})
    });
    if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Cycle status update error');
    }
    return await resp.json();
}

async function apiUpdateCycle(cycleId, data) {
    const resp = await fetch(`/api/cycles/${cycleId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Cycle update error');
    }
    return await resp.json();
}
