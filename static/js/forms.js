async function fillSelects() {
    const [teams, managers, objectives] = await Promise.all([loadTeams(), loadManagers(), loadObjectivesFlat()]);
    const parentSelect = document.getElementById('objParent');
    parentSelect.innerHTML = '<option value="">-- None (Root) --</option>';
    objectives.forEach(o => { parentSelect.innerHTML += `<option value="${o.id}">${o.name}</option>`; });
    document.getElementById('objTeam').innerHTML = '<option value="">-- Not selected --</option>' + teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    document.getElementById('objManager').innerHTML = '<option value="">-- Not selected --</option>' + managers.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    document.getElementById('objDocLink').value = '';
}

async function prepareObjForm() {
    document.getElementById('objForm').reset();
    document.getElementById('objId').value = '';
    document.getElementById('objModalLabel').textContent = 'Create Objective';
    await fillSelects();
}

async function editObjective(id) {
    if (!editMode) return;
    const objectives = await loadObjectivesFlat();
    const obj = objectives.find(o => o.id === id);
    if (!obj) { alert('Objective not found'); return; }
    document.getElementById('objId').value = obj.id;
    document.getElementById('objName').value = obj.name;
    document.getElementById('objModalLabel').textContent = 'Edit Objective';
    await fillSelects();
    document.getElementById('objParent').value = obj.parent_id || '';
    document.getElementById('objTeam').value = obj.team_id || '';
    document.getElementById('objManager').value = obj.manager_id || '';
    document.getElementById('objDocLink').value = obj.doc_link || '';
    new bootstrap.Modal(document.getElementById('objModal')).show();
}

async function deleteObjective(id) {
    if (!editMode) return;
    if (!confirm('Delete objective with all sub-objectives and their KRs?')) return;
    await fetch(`/api/objectives/${id}`, { method: 'DELETE' });
    refreshTree();
}

async function addKR(objectiveId) {
    if (!editMode) return;
    document.getElementById('krId').value = '';
    document.getElementById('krObjectiveId').value = objectiveId;
    document.getElementById('krName').value = '';
    document.getElementById('krInitial').value = 0;
    document.getElementById('krCurrent').value = 0;
    document.getElementById('krTarget').value = 0;
    document.getElementById('krUnit').value = '';
    document.getElementById('krCurlSnippet').textContent = '';
    document.getElementById('krApiWarning').classList.add('d-none');
    new bootstrap.Modal(document.getElementById('krModal')).show();
}

async function editKR(krId) {
    if (!editMode) return;
    const tree = await loadTree(selectedTeamId, selectedManagerId);
    let found = null;
    (function find(nodes) {
        for (let node of nodes) {
            if (node.keyresults) {
                found = node.keyresults.find(k => k.id === krId);
                if (found) return;
            }
            if (node.children) find(node.children);
            if (found) return;
        }
    })(tree);
    if (!found) return;
    document.getElementById('krId').value = found.id;
    document.getElementById('krObjectiveId').value = found.objective_id;
    document.getElementById('krName').value = found.name;
    document.getElementById('krInitial').value = found.initial_value || 0;
    document.getElementById('krCurrent').value = found.current_value;
    document.getElementById('krTarget').value = found.target_value;
    document.getElementById('krUnit').value = found.unit || '';

    const apiWarning = document.getElementById('krApiWarning');
    if (found.source === 'api' && found.last_updated) {
        const updated = new Date(found.last_updated.replace(' ', 'T') + 'Z');
        const now = new Date();
        const hoursAgo = (now - updated) / (1000 * 60 * 60);
        if (hoursAgo < 24) {
            apiWarning.classList.remove('d-none');
            apiWarning.title = 'Last API update: ' + found.last_updated;
        } else {
            apiWarning.classList.add('d-none');
        }
    } else {
        apiWarning.classList.add('d-none');
    }

    const curl = `curl -X PUT \\
  -H 'Authorization: Bearer <API_TOKEN>' \\
  -H 'Content-Type: application/json' \\
  -d '{"current_value": <VALUE>, "source": "api"}' \\
  ${appHost}/api/keyresults/${found.id}`;
    document.getElementById('krCurlSnippet').textContent = curl;

    new bootstrap.Modal(document.getElementById('krModal')).show();
}

function copyCurlCode() {
    const el = document.getElementById('krCurlSnippet');
    const text = el.textContent;
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text).then(() => {
        alert('Curl code copied to clipboard');
    }).catch(() => {
        prompt('Copy this code manually:', text);
    });
}

async function deleteKR(krId) {
    if (!editMode) return;
    if (!confirm('Delete this Key Result?')) return;
    await fetch(`/api/keyresults/${krId}`, { method: 'DELETE' });
    refreshTree();
}
