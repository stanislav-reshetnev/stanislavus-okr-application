async function fillSelects() {
    const [teams, managers, objectives] = await Promise.all([loadTeams(), loadManagers(), loadObjectivesFlat()]);
    const parentSelect = document.getElementById('objParent');
    const numbered = buildNumberedTree(objectives);
    const hasRoot = objectives.some(o => !o.parentId);
    const editing = !!document.getElementById('objId').value;
    const rootDisabled = hasRoot && !editing;
    parentSelect.innerHTML = `<option value="" ${rootDisabled ? 'disabled' : ''}>-- None (Root) --${rootDisabled ? ' (already exists)' : ''}</option>`;
    numbered.forEach(o => {
        const depth = o.displayCode.split('.').length - 1;
        const indent = '\u00A0\u00A0'.repeat(depth);
        const rootTag = depth === 0 ? '[Root] ' : '';
        parentSelect.innerHTML += `<option value="${o.id}">${indent}${rootTag}${o.displayCode}\u00A0\u00A0${o.name}</option>`;
    });
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
    document.getElementById('objParent').value = obj.parentId || '';
    document.getElementById('objTeam').value = obj.teamId || '';
    document.getElementById('objManager').value = obj.managerId || '';
    document.getElementById('objDocLink').value = obj.docLink || '';
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
    document.getElementById('krDocLink').value = '';
    document.getElementById('krDescription').value = '';
    document.getElementById('krCurlSnippet').textContent = '';
    const addWarning = document.getElementById('krApiWarning');
    if (addWarning) addWarning.classList.add('d-none');
    new bootstrap.Modal(document.getElementById('krModal')).show();
}

async function editKR(krId) {
    if (!editMode) return;
    const tree = await loadTree(selectedTeamId, selectedManagerId);
    let found = null;
    (function find(nodes) {
        for (let node of nodes) {
            if (node.keyResults) {
                found = node.keyResults.find(k => k.id === krId);
                if (found) return;
            }
            if (node.children) find(node.children);
            if (found) return;
        }
    })(tree);
    if (!found) return;
    document.getElementById('krId').value = found.id;
    document.getElementById('krObjectiveId').value = found.objectiveId;
    document.getElementById('krInitial').value = found.initialValue || 0;
    document.getElementById('krCurrent').value = found.currentValue;
    document.getElementById('krTarget').value = found.targetValue;
    document.getElementById('krUnit').value = found.unit || '';
    document.getElementById('krDocLink').value = found.docLink || '';
    document.getElementById('krDescription').value = found.description || '';

    const apiWarning = document.getElementById('krApiWarning');
    if (apiWarning) {
        if (found.source === 'api' && found.lastUpdated) {
            const updated = new Date(found.lastUpdated.replace(' ', 'T') + 'Z');
            const now = new Date();
            const hoursAgo = (now - updated) / (1000 * 60 * 60);
            if (hoursAgo < 24) {
                apiWarning.classList.remove('d-none');
                apiWarning.title = 'Last API update: ' + found.lastUpdated;
            } else {
                apiWarning.classList.add('d-none');
            }
        } else {
            apiWarning.classList.add('d-none');
        }
    }

    const curl = `curl -X PUT \\
  -H 'Authorization: Bearer <API_TOKEN>' \\
  -H 'Content-Type: application/json' \\
  -d '{"currentValue": <VALUE>, "source": "api"}' \\
  ${appHost}/api/keyresults/${found.id}`;
    document.getElementById('krCurlSnippet').textContent = curl;

    new bootstrap.Modal(document.getElementById('krModal')).show();
}

function showKRDetail(kr, krNumber) {
    const rawPct = calculateKRProgress(kr);
    const pct = rawPct === -1 ? -1 : Math.round(rawPct);
    document.getElementById('krDetailLabel').textContent = krNumber + ': ' + kr.name;
    const bar = document.getElementById('krDetailProgressBar');
    if (pct === -1) {
        bar.style.width = '100%';
        bar.textContent = 'N/A';
        bar.className = 'progress-bar progress-bar-empty';
    } else {
        bar.style.width = pct + '%';
        bar.textContent = pct + '%';
        bar.className = 'progress-bar';
    }
    document.getElementById('krDetailInitial').textContent = kr.initialValue ?? 0;
    document.getElementById('krDetailCurrent').textContent = kr.currentValue;
    if (pct === -1) {
        document.getElementById('krDetailTarget').textContent = '—';
        document.getElementById('krDetailSource').textContent = '—';
    } else {
        document.getElementById('krDetailTarget').textContent = (kr.targetValue + ' ' + kr.unit).trim();
        document.getElementById('krDetailSource').textContent = kr.source === 'api' ? 'External API' : 'Manual edit';
    }
    let lastUpdated = '—';
    if (kr.lastUpdated && pct !== -1) {
        const d = new Date(kr.lastUpdated + 'Z');
        lastUpdated = isNaN(d) ? '—' : d.toLocaleString();
    }
    document.getElementById('krDetailLastUpdated').textContent = lastUpdated;
    const descEl = document.getElementById('krDetailDescription');
    const descWrap = document.getElementById('krDetailDescriptionWrap');
    if (kr.description) {
        descEl.textContent = kr.description;
        descWrap.style.display = '';
    } else {
        descWrap.style.display = 'none';
    }
    const linkEl = document.getElementById('krDetailDocLink');
    if (kr.docLink) {
        linkEl.href = kr.docLink;
        linkEl.style.display = 'inline-flex';
    } else {
        linkEl.style.display = 'none';
    }
    new bootstrap.Modal(document.getElementById('krDetailModal')).show();
}

function copyCurlCode() {
    const el = document.getElementById('krCurlSnippet');
    const text = el.textContent;
    if (!text || text === '—') return;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Curl code copied to clipboard');
        }).catch(() => {
            prompt('Copy this code manually:', text);
        });
    } else {
        prompt('Copy this code manually:', text);
    }
}

async function deleteKR(krId) {
    if (!editMode) return;
    if (!confirm('Delete this Key Result?')) return;
    await fetch(`/api/keyresults/${krId}`, { method: 'DELETE' });
    refreshTree();
}

document.getElementById('krDetailModal').addEventListener('hide.bs.modal', function () {
    if (this.contains(document.activeElement)) {
        document.body.focus();
    }
});
