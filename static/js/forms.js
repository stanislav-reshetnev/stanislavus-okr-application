async function fillSelects() {
    const [teams, managers, objectives] = await Promise.all([loadTeams(), loadManagers(), loadObjectivesFlat(selectedCycleId)]);
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

async function prepareObjForm(parentId, teamId, managerId) {
    document.getElementById('objForm').reset();
    document.getElementById('objId').value = '';
    document.getElementById('objModalLabel').textContent = 'Create Objective';
    await fillSelects();
    if (parentId) document.getElementById('objParent').value = parentId;
    if (teamId) document.getElementById('objTeam').value = teamId;
    if (managerId) document.getElementById('objManager').value = managerId;
}

async function editObjective(id) {
    if (!editMode) return;
    const objectives = await loadObjectivesFlat(selectedCycleId);
    const obj = objectives.find(o => o.id === id);
    if (!obj) { showToast('Objective not found', 'error'); return; }
    document.getElementById('objId').value = obj.id;
    document.getElementById('objName').value = obj.name;
    document.getElementById('objModalLabel').textContent = 'Edit Objective';
    await fillSelects();
    document.getElementById('objParent').value = obj.parentId || '';
    document.getElementById('objTeam').value = obj.teamId || '';
    document.getElementById('objManager').value = obj.managerId || '';
    document.getElementById('objDocLink').value = obj.docLink || '';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('objModal')).show();
}

async function deleteObjective(id) {
    if (!editMode) return;
    if (!await showConfirmModal('Delete objective with all sub-objectives and their KRs?')) return;
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
    document.getElementById('krConfidence').value = 'medium';
    const snippetEl = document.getElementById('krCurlSnippet');
    if (snippetEl) snippetEl.textContent = '';
    const addWarning = document.getElementById('krApiWarning');
    if (addWarning) addWarning.classList.add('d-none');
    document.getElementById('krHistoryTabLi').style.display = 'none';
    currentKREdit = null;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('krModal')).show();
}

async function editKR(krId) {
    if (!editMode) return;
    const tree = await loadTree(selectedTeamId, selectedManagerId, selectedCycleId);
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
    document.getElementById('krName').value = found.name;
    document.getElementById('krInitial').value = found.initialValue || 0;
    document.getElementById('krCurrent').value = found.currentValue;
    document.getElementById('krTarget').value = found.targetValue;
    document.getElementById('krUnit').value = found.unit || '';
    document.getElementById('krDocLink').value = found.docLink || '';
    document.getElementById('krDescription').value = found.description || '';
    document.getElementById('krConfidence').value = found.confidence || 'medium';

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

    currentKREdit = found;
    document.getElementById('krHistoryTabLi').style.display = '';
    krHistoryPage = 0;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('krModal')).show();
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
    const confEl = document.getElementById('krDetailConfidence');
    const conf = kr.confidence || 'medium';
    confEl.textContent = conf.charAt(0).toUpperCase() + conf.slice(1);
    confEl.className = 'cs cs-' + conf;
    confEl.title = 'Confidence Score';
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
    bootstrap.Modal.getOrCreateInstance(document.getElementById('krDetailModal')).show();

    loadKRHistory(kr.id).then(history => renderKRChart(kr, history));
}

function _parseDateTime(s) {
    if (!s) return null;
    return new Date(s.replace(' ', 'T') + (s.endsWith('Z') || s.includes('+') ? '' : 'Z'));
}

function _getIntervalBucket(date, interval) {
    const d = new Date(date);
    if (interval === 'day') {
        return d.toISOString().slice(0, 10);
    } else if (interval === 'week') {
        const day = d.getUTCDay();
        const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff)).toISOString().slice(0, 10);
    } else if (interval === 'fortnight') {
        const day = d.getUTCDate();
        return d.toISOString().slice(0, 8) + (day <= 15 ? '01' : '16');
    } else {
        return d.toISOString().slice(0, 7);
    }
}

function _groupSnapshotsByInterval(snapshots, interval) {
    if (!snapshots.length) return [];
    const buckets = {};
    snapshots.forEach(s => {
        const dt = _parseDateTime(s.recordedAt);
        if (!dt) return;
        const key = _getIntervalBucket(dt, interval);
        if (!buckets[key] || dt > buckets[key]._dt) {
            buckets[key] = {...s, _dt: dt};
        }
    });
    return Object.keys(buckets).sort().map(k => {
        const {_dt, ...rest} = buckets[k];
        return rest;
    });
}

function renderKRChart(kr, history) {
    const canvas = document.getElementById('krDetailChart');
    const wrap = document.getElementById('krDetailChartWrap');
    if (!canvas || !wrap) return;

    if (krChartInstance) {
        krChartInstance.destroy();
        krChartInstance = null;
    }

    if (!history || history.length < 2) {
        wrap.style.display = 'none';
        return;
    }
    wrap.style.display = '';

    const grouped = _groupSnapshotsByInterval(history, krChartInterval);

    const actualData = grouped.map(s => ({
        x: _parseDateTime(s.recordedAt),
        y: s.value
    }));

    const cycle = cyclesList.find(c => c.id === selectedCycleId);
    const startDate = cycle && cycle.startDate ? new Date(cycle.startDate + 'T00:00:00Z') : actualData[0].x;
    const endDate = cycle && cycle.endDate ? new Date(cycle.endDate + 'T23:59:59Z') : new Date();

    const initVal = kr.initialValue || 0;
    const targetVal = kr.targetValue || 0;

    const targetData = targetVal > 0 ? [
        {x: startDate, y: targetVal},
        {x: endDate, y: targetVal}
    ] : [];

    const idealData = (targetVal > 0 && initVal !== targetVal) ? [
        {x: startDate, y: initVal},
        {x: endDate, y: targetVal}
    ] : [];

    const datasets = [{
        label: 'Actual',
        data: actualData,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: false,
        tension: 0.2,
        pointRadius: 4,
        pointBackgroundColor: '#2563eb',
        borderWidth: 2
    }];
    if (targetData.length) {
        datasets.push({
            label: 'Target',
            data: targetData,
            borderColor: '#16a34a',
            borderDash: [6, 4],
            fill: false,
            pointRadius: 0,
            borderWidth: 1.5
        });
    }
    if (idealData.length) {
        datasets.push({
            label: 'Ideal Pace',
            data: idealData,
            borderColor: '#9ca3af',
            borderDash: [2, 3],
            fill: false,
            pointRadius: 0,
            borderWidth: 1
        });
    }

    const unitLabel = kr.unit || '';
    const timeUnit = krChartInterval === 'day' ? 'day' : krChartInterval === 'month' ? 'month' : 'week';

    krChartInstance = new Chart(canvas, {
        type: 'line',
        data: {datasets},
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {unit: timeUnit},
                    min: startDate,
                    max: endDate
                },
                y: {
                    beginAtZero: true,
                    title: {display: !!unitLabel, text: unitLabel}
                }
            },
            plugins: {
                legend: {position: 'bottom', labels: {boxWidth: 20, padding: 10}},
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            const label = ctx.dataset.label || '';
                            const val = ctx.parsed.y;
                            return label + ': ' + val + (unitLabel ? ' ' + unitLabel : '');
                        }
                    }
                }
            }
        }
    });
}

function renderKREditChart(kr, history) {
    const canvas = document.getElementById('krEditChart');
    if (!canvas) return;
    if (krEditChartInstance) {
        krEditChartInstance.destroy();
        krEditChartInstance = null;
    }
    if (!history || history.length < 2) return;

    const grouped = _groupSnapshotsByInterval(history, krChartInterval);
    const actualData = grouped.map(s => ({ x: _parseDateTime(s.recordedAt), y: s.value }));
    const cycle = cyclesList.find(c => c.id === selectedCycleId);
    const startDate = cycle && cycle.startDate ? new Date(cycle.startDate + 'T00:00:00Z') : actualData[0].x;
    const endDate = cycle && cycle.endDate ? new Date(cycle.endDate + 'T23:59:59Z') : new Date();
    const initVal = kr.initialValue || 0;
    const targetVal = kr.targetValue || 0;
    const unitLabel = kr.unit || '';
    const timeUnit = krChartInterval === 'day' ? 'day' : krChartInterval === 'month' ? 'month' : 'week';

    const datasets = [{
        label: 'Actual', data: actualData,
        borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: false, tension: 0.2, pointRadius: 4, pointBackgroundColor: '#2563eb', borderWidth: 2
    }];
    if (targetVal > 0) {
        datasets.push({ label: 'Target', data: [{x: startDate, y: targetVal}, {x: endDate, y: targetVal}],
            borderColor: '#16a34a', borderDash: [6, 4], fill: false, pointRadius: 0, borderWidth: 1.5 });
    }
    if (targetVal > 0 && initVal !== targetVal) {
        datasets.push({ label: 'Ideal Pace', data: [{x: startDate, y: initVal}, {x: endDate, y: targetVal}],
            borderColor: '#9ca3af', borderDash: [2, 3], fill: false, pointRadius: 0, borderWidth: 1 });
    }

    krEditChartInstance = new Chart(canvas, {
        type: 'line',
        data: {datasets},
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { type: 'time', time: {unit: timeUnit}, min: startDate, max: endDate },
                y: { beginAtZero: true, title: {display: !!unitLabel, text: unitLabel} }
            },
            plugins: {
                legend: {position: 'bottom', labels: {boxWidth: 20, padding: 10}},
                tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + ctx.parsed.y + (unitLabel ? ' ' + unitLabel : '') } }
            }
        }
    });
}

async function loadKRHistoryTab(krId) {
    const history = await loadKRHistory(krId);
    krHistoryData = history;
    if (currentKREdit) renderKREditChart(currentKREdit, history);
    renderHistoryTable(history, krId);
}

function renderHistoryTable(history, krId) {
    krHistoryData = history;
    const totalPages = Math.max(1, Math.ceil(history.length / KR_HIST_PAGE_SIZE));
    if (krHistoryPage >= totalPages) krHistoryPage = totalPages - 1;
    const start = krHistoryPage * KR_HIST_PAGE_SIZE;
    const pageData = history.slice(start, start + KR_HIST_PAGE_SIZE);

    const tbody = document.getElementById('krHistoryTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    pageData.forEach((s, i) => {
        const tr = document.createElement('tr');
        const dt = _parseDateTime(s.recordedAt);
        const dateStr = !dt || isNaN(dt) ? s.recordedAt : dt.toLocaleString();
        const sourceIcon = s.source === 'api' ? '🤖 API' : '✎ Manual';
        tr.innerHTML = `<td>${start + i + 1}</td><td>${s.value}</td><td class="kr-hist-date">${dateStr}</td><td>${sourceIcon}</td>` +
            `<td><button class="btn btn-outline-danger btn-sm py-0 px-1" onclick="deleteSnapshot('${krId}', '${s.id}')">🗑</button></td>`;
        tbody.appendChild(tr);
    });

    const pagEl = document.getElementById('krHistoryPagination');
    if (pagEl) {
        pagEl.innerHTML = '';
        if (totalPages > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'btn btn-sm btn-outline-secondary' + (krHistoryPage === 0 ? ' disabled' : '');
            prevBtn.textContent = '‹ Prev';
            prevBtn.onclick = () => { if (krHistoryPage > 0) { krHistoryPage--; renderHistoryTable(krHistoryData, krId); } };
            pagEl.appendChild(prevBtn);

            const info = document.createElement('span');
            info.className = 'small text-muted';
            info.textContent = `Page ${krHistoryPage + 1} of ${totalPages}`;
            pagEl.appendChild(info);

            const nextBtn = document.createElement('button');
            nextBtn.className = 'btn btn-sm btn-outline-secondary' + (krHistoryPage >= totalPages - 1 ? ' disabled' : '');
            nextBtn.textContent = 'Next ›';
            nextBtn.onclick = () => { if (krHistoryPage < totalPages - 1) { krHistoryPage++; renderHistoryTable(krHistoryData, krId); } };
            pagEl.appendChild(nextBtn);
        }
    }
}

async function addSnapshotFromForm() {
    const krId = document.getElementById('krId').value;
    const valueStr = document.getElementById('krHistValue').value;
    const date = document.getElementById('krHistDate').value;
    if (!krId || !valueStr || !date) {
        showToast('Value and date are required', 'error');
        return;
    }
    const value = parseFloat(valueStr);
    if (isNaN(value)) {
        showToast('Invalid value', 'error');
        return;
    }
    const resp = await fetch(`/api/keyresults/${krId}/snapshots`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({value, recordedAt: date})
    });
    if (resp.ok) {
        document.getElementById('krHistValue').value = '';
        document.getElementById('krHistDate').value = '';
        const history = await loadKRHistory(krId);
        const totalPages = Math.max(1, Math.ceil(history.length / KR_HIST_PAGE_SIZE));
        krHistoryPage = totalPages - 1;
        if (currentKREdit) renderKREditChart(currentKREdit, history);
        renderHistoryTable(history, krId);
        showToast('Snapshot added', 'success');
    } else {
        showToast('Failed to add snapshot', 'error');
    }
}

async function deleteSnapshot(krId, snapshotId) {
    const resp = await fetch(`/api/keyresults/${krId}/snapshots/${snapshotId}`, { method: 'DELETE' });
    if (resp.ok) {
        const history = await loadKRHistory(krId);
        const totalPages = Math.max(1, Math.ceil(history.length / KR_HIST_PAGE_SIZE));
        if (krHistoryPage >= totalPages) krHistoryPage = totalPages - 1;
        if (currentKREdit) renderKREditChart(currentKREdit, history);
        renderHistoryTable(history, krId);
        showToast('Snapshot deleted', 'success');
    } else {
        showToast('Failed to delete snapshot', 'error');
    }
}

function showInitiativeDetail(init, initNumber, objCode, objName) {
    document.getElementById('initDetailLabel').textContent = initNumber + ': ' + init.name;
    document.getElementById('initDetailObjective').textContent = 'O' + objCode + ' — ' + (objName || '');
    const statusMap = { backlog: 'Backlog', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };
    const statusVal = init.status || 'backlog';
    const statusEl = document.getElementById('initDetailStatus');
    statusEl.textContent = statusMap[statusVal] || statusVal;
    statusEl.className = 'status status-' + statusVal;
    const whatEl = document.getElementById('initDetailWhat');
    const impactEl = document.getElementById('initDetailImpact');
    whatEl.textContent = init.what || '—';
    impactEl.textContent = init.impact || '—';
    const linkEl = document.getElementById('initDetailDocLink');
    if (init.docLink) {
        linkEl.href = init.docLink;
        linkEl.style.display = 'inline-flex';
    } else {
        linkEl.style.display = 'none';
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('initiativeDetailModal')).show();
}

async function copyCurlCode(elementId) {
    const el = document.getElementById(elementId || 'krCurlSnippet');
    const text = el.textContent;
    if (!text || text === '—') return;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Curl code copied to clipboard', 'success');
        }).catch(async () => {
            await showPromptModal('Copy this code manually:', text);
        });
    } else {
        await showPromptModal('Copy this code manually:', text);
    }
}

async function addInitiative(objectiveId) {
    if (!editMode) return;
    document.getElementById('initiativeId').value = '';
    document.getElementById('initiativeObjectiveId').value = objectiveId;
    document.getElementById('initiativeName').value = '';
    document.getElementById('initiativeWhat').value = '';
    document.getElementById('initiativeImpact').value = '';
    document.getElementById('initiativeDocLink').value = '';
    document.getElementById('initiativeStatus').value = 'backlog';
    const snippetEl = document.getElementById('initiativeCurlSnippet');
    if (snippetEl) snippetEl.textContent = '';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('initiativeModal')).show();
}

async function editInitiative(initiativeId) {
    if (!editMode) return;
    const tree = await loadTree(selectedTeamId, selectedManagerId, selectedCycleId);
    let found = null;
    (function find(nodes) {
        for (let node of nodes) {
            if (node.initiatives) {
                found = node.initiatives.find(i => i.id === initiativeId);
                if (found) return;
            }
            if (node.children) find(node.children);
            if (found) return;
        }
    })(tree);
    if (!found) return;
    document.getElementById('initiativeId').value = found.id;
    document.getElementById('initiativeObjectiveId').value = found.objectiveId;
    document.getElementById('initiativeName').value = found.name;
    document.getElementById('initiativeWhat').value = found.what || '';
    document.getElementById('initiativeImpact').value = found.impact || '';
    document.getElementById('initiativeDocLink').value = found.docLink || '';
    document.getElementById('initiativeStatus').value = found.status || 'backlog';
    const curl = `curl -X PUT \
  -H 'Authorization: Bearer <API_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"status": "in_progress"}' \
  ${appHost}/api/initiatives/${found.id}`;
    const snippetEl = document.getElementById('initiativeCurlSnippet');
    if (snippetEl) snippetEl.textContent = curl;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('initiativeModal')).show();
}

async function deleteInitiative(initiativeId) {
    if (!editMode) return;
    if (!await showConfirmModal('Delete this Initiative?')) return;
    await fetch(`/api/initiatives/${initiativeId}`, { method: 'DELETE' });
    refreshTree();
}

async function deleteKR(krId) {
    if (!editMode) return;
    if (!await showConfirmModal('Delete this Key Result?')) return;
    await fetch(`/api/keyresults/${krId}`, { method: 'DELETE' });
    refreshTree();
}

document.getElementById('krDetailModal').addEventListener('hide.bs.modal', function () {
    if (this.contains(document.activeElement)) {
        document.body.focus();
    }
});

async function showSettingsModal() {
    try {
        const settings = await loadSettings();
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        document.getElementById('settingTheme').value = settings.theme || currentTheme;
        document.getElementById('settingCycleLength').value = settings.cycle_length || 'quarter';
        document.getElementById('settingKrChartInterval').value = settings.kr_chart_interval || 'week';
        bootstrap.Modal.getOrCreateInstance(document.getElementById('settingsModal')).show();
    } catch (e) {
        showToast('Failed to load settings', 'error');
    }
}

async function showCyclesModal() {
    await refreshCycleList();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('cyclesModal')).show();
}

async function refreshCycleList() {
    const cycles = await loadCycles();
    const list = document.getElementById('cycleList');
    const editingId = list.dataset.editingId || '';
    list.innerHTML = cycles.map(c => {
        const statusMap = { draft: 'Draft', in_progress: 'In Progress', completed: 'Completed' };
        const canAdvance = c.status === 'draft';
        const canComplete = c.status === 'in_progress';
        if (c.id === editingId) {
            return `<div class="list-group-item flex-column align-items-stretch" data-cycle-id="${c.id}">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <input type="text" class="form-control form-control-sm" id="editCycleName" value="${c.name}" placeholder="Name">
                    <input type="date" class="form-control form-control-sm" id="editCycleStartDate" value="${c.startDate}" style="max-width:160px">
                    <input type="date" class="form-control form-control-sm" id="editCycleEndDate" value="${c.endDate}" style="max-width:160px">
                    <button class="btn btn-sm btn-primary" onclick="saveCycle('${c.id}')">Save</button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="cancelEditCycle()">Cancel</button>
                </div>
            </div>`;
        }
        return `<div class="list-group-item d-flex align-items-center justify-content-between">
            <div>
                <strong>${c.name}</strong>
                <span class="status status-${c.status} ms-2">${statusMap[c.status] || c.status}</span>
                <div class="text-secondary" style="font-size:0.8rem">${c.startDate} — ${c.endDate}</div>
            </div>
            <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-info" onclick="editCycle('${c.id}')" title="Edit">✎</button>
                ${canAdvance ? `<button class="btn btn-outline-primary" onclick="handleUpdateCycleStatus('${c.id}','in_progress')">Start</button>` : ''}
                ${canComplete ? `<button class="btn btn-outline-success" onclick="handleUpdateCycleStatus('${c.id}','completed')">Complete</button>` : ''}
                ${c.status === 'in_progress' ? `<button class="btn btn-outline-secondary" onclick="handleUpdateCycleStatus('${c.id}','draft')">Revert</button>` : ''}
            </div>
        </div>`;
    }).join('');
    populateCycleSwitcher(cycles, selectedCycleId);
}

function editCycle(cycleId) {
    document.getElementById('cycleList').dataset.editingId = cycleId;
    refreshCycleList();
}

function cancelEditCycle() {
    delete document.getElementById('cycleList').dataset.editingId;
    refreshCycleList();
}

async function saveCycle(cycleId) {
    const name = document.getElementById('editCycleName').value.trim();
    const startDate = document.getElementById('editCycleStartDate').value;
    const endDate = document.getElementById('editCycleEndDate').value;
    if (!name || !startDate || !endDate) return;
    const data = { name, startDate, endDate };
    try {
        await apiUpdateCycle(cycleId, data);
        delete document.getElementById('cycleList').dataset.editingId;
        await refreshCycleList();
    } catch (e) {
        showToast(e.message || 'Failed to save cycle', 'error');
    }
}

function populateCycleSwitcher(cycles, selectedId) {
    const sel = document.getElementById('cycleSwitcher');
    if (!sel) return;
    cyclesList = cycles;
    const symbols = { draft: '🟡', in_progress: '🟢', completed: '✅' };
    if (!cycles.length) {
        sel.innerHTML = '<option value="" disabled selected>No cycles</option>';
        updateCycleProgress();
        return;
    }
    sel.innerHTML = cycles.map(c =>
        `<option value="${c.id}">${symbols[c.status] || '○'} ${c.name}</option>`
    ).join('');
    if (selectedId && cycles.some(c => c.id === selectedId)) {
        sel.value = selectedId;
    }
    updateCycleProgress();
}

function updateCycleProgress() {
    const wrap = document.getElementById('cycleProgressWrap');
    const bar = document.getElementById('cycleProgressBar');
    if (!wrap || !bar) return;
    const cycle = cyclesList.find(c => c.id === selectedCycleId);
    if (!cycle || !cycle.startDate || !cycle.endDate) {
        wrap.style.display = 'none';
        return;
    }
    wrap.style.display = '';
    const start = new Date(cycle.startDate + 'T00:00:00');
    const end = new Date(cycle.endDate + 'T00:00:00');
    const now = new Date();
    let pct;
    if (now <= start) pct = 0;
    else if (now >= end) pct = 100;
    else pct = ((now - start) / (end - start)) * 100;
    pct = Math.min(100, Math.max(0, pct));
    bar.style.width = pct + '%';
    bar.classList.toggle('draft', cycle.status === 'draft');
    bar.classList.toggle('completed', pct >= 100);
    wrap.title = `OKR Cycle: ${cycle.startDate} → ${cycle.endDate}`;
    populateCycleTicks(cycle.startDate, cycle.endDate);
}

function populateCycleTicks(startDate, endDate) {
    const container = document.getElementById('cycleTicks');
    if (!container) return;
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const totalDays = (end - start) / 86400000;
    if (totalDays <= 0) { container.innerHTML = ''; return; }

    let tickDates = [];
    if (totalDays <= 21) {
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 7))
            tickDates.push(new Date(d));
    } else if (totalDays <= 70) {
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 14))
            tickDates.push(new Date(d));
    } else {
        let d = new Date(start);
        d.setDate(1);
        d.setMonth(d.getMonth() + 1);
        while (d < end) {
            tickDates.push(new Date(d));
            d.setMonth(d.getMonth() + 1);
        }
    }

    container.innerHTML = tickDates.map(t => {
        const left = ((t - start) / (end - start)) * 100;
        return `<div class="cycle-tick" style="left:${left}%"></div>`;
    }).join('');
}
