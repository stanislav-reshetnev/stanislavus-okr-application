document.getElementById('objForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    try {
        const id = document.getElementById('objId').value;
        const data = {
            name: document.getElementById('objName').value,
            parentId: document.getElementById('objParent').value || null,
            teamId: document.getElementById('objTeam').value || null,
            managerId: document.getElementById('objManager').value || null,
            docLink: document.getElementById('objDocLink').value || '',
            cycleId: selectedCycleId || null
        };
        let resp;
        if (id) {
            resp = await fetch(`/api/objectives/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
        } else {
            resp = await fetch('/api/objectives', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
        }
        if (!resp.ok) {
            const err = await resp.json();
            showToast(err.error || 'Failed to save objective', 'error');
            return;
        }
        bootstrap.Modal.getInstance(document.getElementById('objModal')).hide();
        refreshTree();
    } finally {
        setButtonLoading(btn, false);
    }
});

document.getElementById('initiativeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    try {
        const id = document.getElementById('initiativeId').value;
        const data = {
            name: document.getElementById('initiativeName').value,
            what: document.getElementById('initiativeWhat').value || '',
            impact: document.getElementById('initiativeImpact').value || '',
            docLink: document.getElementById('initiativeDocLink').value || '',
            status: document.getElementById('initiativeStatus').value || 'backlog'
        };
        if (id) {
            const resp = await fetch(`/api/initiatives/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
            if (!resp.ok) {
                await showApiError(resp, 'Failed to save initiative');
                return;
            }
        } else {
            const objId = document.getElementById('initiativeObjectiveId').value;
            const resp = await fetch(`/api/objectives/${objId}/initiatives`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
            if (!resp.ok) {
                await showApiError(resp, 'Failed to save initiative');
                return;
            }
        }
        bootstrap.Modal.getInstance(document.getElementById('initiativeModal')).hide();
        refreshTree({ ensureExpanded: document.getElementById('initiativeObjectiveId').value });
    } finally {
        setButtonLoading(btn, false);
    }
});

document.getElementById('krForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    try {
        const id = document.getElementById('krId').value;
        const data = {
            name: document.getElementById('krName').value,
            initialValue: parseFloat(document.getElementById('krInitial').value) || 0,
            currentValue: parseFloat(document.getElementById('krCurrent').value) || 0,
            targetValue: parseFloat(document.getElementById('krTarget').value) || 0,
            unit: document.getElementById('krUnit').value,
            docLink: document.getElementById('krDocLink').value || '',
            description: document.getElementById('krDescription').value || '',
            confidence: document.getElementById('krConfidence').value || 'medium'
        };
        if (id) {
            const resp = await fetch(`/api/keyresults/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
            if (!resp.ok) {
                await showApiError(resp, 'Failed to save KR');
                return;
            }
            refreshTree({ ensureExpanded: document.getElementById('krObjectiveId').value });
            showToast('Saved', 'success');
        } else {
            const objId = document.getElementById('krObjectiveId').value;
            const resp = await fetch(`/api/objectives/${objId}/keyresults`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
            if (!resp.ok) {
                await showApiError(resp, 'Failed to save KR');
                return;
            }
            bootstrap.Modal.getInstance(document.getElementById('krModal')).hide();
            refreshTree({ ensureExpanded: objId });
        }
    } catch (e) {
        showToast('Failed to save KR', 'error');
    } finally {
        setButtonLoading(btn, false);
    }
});

document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    try {
        const email = document.getElementById('userEmail').value;
        const password = document.getElementById('userPassword').value;
        const role = document.getElementById('userRole').value;
        const resp = await fetch('/api/users', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email, password, role})
        });
        if (resp.ok) {
            document.getElementById('userEmail').value = '';
            document.getElementById('userPassword').value = '';
            document.getElementById('userRole').value = 'view';
            refreshUserList();
        } else {
            const err = await resp.json();
            showToast(err.error || 'Failed to add user', 'error');
        }
    } finally {
        setButtonLoading(btn, false);
    }
});

document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const current_password = document.getElementById('profileCurrentPassword').value;
    const new_password = document.getElementById('profileNewPassword').value;
    const confirm = document.getElementById('profileConfirmPassword').value;

    if (new_password !== confirm) {
        showToast('New passwords do not match.', 'error');
        return;
    }

    setButtonLoading(btn, true);
    try {
        const resp = await fetch('/api/profile/password', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({current_password, new_password})
        });
        if (resp.ok) {
            showToast('Password changed successfully.', 'success');
            bootstrap.Modal.getInstance(document.getElementById('profileModal')).hide();
        } else {
            const err = await resp.json();
            showToast(err.error || 'Failed to change password', 'error');
        }
    } finally {
        setButtonLoading(btn, false);
    }
});

async function onCycleChange(cycleId) {
    selectedCycleId = cycleId;
    populateCycleSwitcher(cyclesList, cycleId);
    updateCycleProgress();
    await refreshTree();
}

async function handleUpdateCycleStatus(cycleId, status) {
    try {
        await apiUpdateCycleStatus(cycleId, status);
        await refreshCycleList();
    } catch (e) {
        showToast(e.message || 'Failed to update cycle status', 'error');
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    editMode = false;
    editModeToggle.checked = false;
    teamsBtn.classList.add('d-none');
    managersBtn.classList.add('d-none');
    usersBtn.classList.add('d-none');
    viewModeGroup.classList.remove('d-none');
    body.classList.remove('edit-mode');

    if (currentUser.role === 'view') {
        editModeToggle.closest('.mode-switch').style.display = 'none';
    }

    if (currentUser.role === 'admin') {
        document.getElementById('settingsMenuItem').classList.remove('d-none');
        document.getElementById('cyclesMenuItem').classList.remove('d-none');
        document.getElementById('backupMenuItem').classList.remove('d-none');
    }

    const avatarBtn = document.getElementById('profileBtn');

    await populateFilters();

    let cycles, currentId;
    try {
        cycles = await loadCycles();
        const currentCycle = cycles.find(c => c.status === 'in_progress') || cycles[0];
        currentId = currentCycle ? currentCycle.id : '';
    } catch {
        cycles = [];
        currentId = '';
        showToast('Failed to load cycles', 'error');
    }
    selectedCycleId = currentId;
    populateCycleSwitcher(cycles, currentId);

    await refreshTree();

    refreshTeamList();
    refreshManagerList();
    initSearch();
    initTreePan();

    fullscreenBtn.addEventListener('click', () => {
        if (treePanel.requestFullscreen) {
            treePanel.requestFullscreen();
        } else if (treePanel.webkitRequestFullscreen) {
            treePanel.webkitRequestFullscreen();
        } else if (treePanel.msRequestFullscreen) {
            treePanel.msRequestFullscreen();
        }
    });

    editModeToggle.addEventListener('change', () => {
        editMode = editModeToggle.checked;
        if (editMode) {
            teamsBtn.classList.remove('d-none');
            managersBtn.classList.remove('d-none');
            if (currentUser.role === 'admin') {
                usersBtn.classList.remove('d-none');
            }
            viewModeGroup.classList.add('d-none');
            body.classList.add('edit-mode');
            viewMode = 'hierarchy';
            document.querySelectorAll('#viewModeGroup .btn').forEach(b => b.classList.remove('active'));
            document.querySelector('#viewModeGroup [data-mode="hierarchy"]').classList.add('active');
        } else {
            teamsBtn.classList.add('d-none');
            managersBtn.classList.add('d-none');
            usersBtn.classList.add('d-none');
            viewModeGroup.classList.remove('d-none');
            body.classList.remove('edit-mode');
        }
        refreshTree({ skipSkeleton: true });
    });

    viewModeGroup.addEventListener('click', (e) => {
        if (editMode) return;
        const btn = e.target.closest('button');
        if (!btn) return;
        const mode = btn.dataset.mode;
        if (!mode || mode === viewMode) return;
        viewMode = mode;
        viewModeGroup.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        refreshTree({ skipSkeleton: true });
    });

    document.getElementById('teamForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        setButtonLoading(btn, true);
        try {
            const name = document.getElementById('teamName').value;
            const resp = await fetch('/api/teams', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name}) });
            if (resp.ok) { document.getElementById('teamName').value = ''; refreshTeamList(); }
            else { const err = await resp.json(); showToast(err.error || 'Failed to add', 'error'); }
        } finally {
            setButtonLoading(btn, false);
        }
    });

    document.getElementById('managerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        setButtonLoading(btn, true);
        try {
            const name = document.getElementById('managerName').value;
            const resp = await fetch('/api/managers', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name}) });
            if (resp.ok) { document.getElementById('managerName').value = ''; refreshManagerList(); }
            else { const err = await resp.json(); showToast(err.error || 'Failed to add', 'error'); }
        } finally {
            setButtonLoading(btn, false);
        }
    });

    document.getElementById('settingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        setButtonLoading(btn, true);
        try {
            const cycleLength = document.getElementById('settingCycleLength').value;
            const krInterval = document.getElementById('settingKrChartInterval').value;
            const themeSelect = document.getElementById('settingTheme');
            const theme = themeSelect ? themeSelect.value : (document.documentElement.getAttribute('data-theme') || 'light');
            await updateSettings({ cycle_length: cycleLength, kr_chart_interval: krInterval, theme });
            krChartInterval = krInterval;
            document.documentElement.setAttribute('data-theme', theme);
            document.documentElement.setAttribute('data-bs-theme', theme === 'light' ? 'light' : 'dark');
            showToast('Settings saved.', 'success');
        } catch (e) {
            console.error('Settings save error:', e);
            showToast('Failed to save settings', 'error');
        } finally {
            setButtonLoading(btn, false);
        }
    });

    document.getElementById('createCycleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const name = document.getElementById('newCycleName').value.trim();
        const startDate = document.getElementById('newCycleStartDate').value;
        const endDate = document.getElementById('newCycleEndDate').value;
        if (!name || !startDate || !endDate) return;
        setButtonLoading(btn, true);
        try {
            await createCycle({ name, startDate, endDate });
            document.getElementById('newCycleName').value = '';
            document.getElementById('newCycleStartDate').value = '';
            document.getElementById('newCycleEndDate').value = '';
            await refreshCycleList();
        } catch (e) {
            showToast(e.message || 'Failed to create cycle', 'error');
        } finally {
            setButtonLoading(btn, false);
        }
    });

    document.getElementById('teamModal').addEventListener('show.bs.modal', refreshTeamList);
    document.getElementById('managerModal').addEventListener('show.bs.modal', refreshManagerList);
    document.getElementById('userModal').addEventListener('show.bs.modal', refreshUserList);

    document.getElementById('krDetailModal').addEventListener('hidden.bs.modal', () => {
        if (krChartInstance) {
            krChartInstance.destroy();
            krChartInstance = null;
        }
    });

    document.getElementById('krTabHistoryBtn').addEventListener('shown.bs.tab', () => {
        const krId = document.getElementById('krId').value;
        if (krId) loadKRHistoryTab(krId);
    });

    document.getElementById('krModal').addEventListener('hidden.bs.modal', () => {
        if (krEditChartInstance) {
            krEditChartInstance.destroy();
            krEditChartInstance = null;
        }
        const editTab = bootstrap.Tab.getInstance(document.getElementById('krTabEditBtn'));
        if (editTab) editTab.show();
        const subtitle = document.getElementById('krModalSubtitle');
        if (subtitle) subtitle.textContent = '';
    });

    // ── Data Backup ──────────────────────────────────────────────
    const backupTableList = document.getElementById('backupTableList');
    if (backupTableList) {
        // child → parents: export stays restorable via FK-safe cascade
        const backupDeps = {
            key_results: ['objectives'],
            kr_snapshots: ['key_results'],
            initiatives: ['objectives'],
            objectives: ['cycles', 'teams', 'managers']
        };
        const checkWithDeps = (table) => {
            const seen = new Set();
            const stack = [table];
            while (stack.length) {
                const t = stack.pop();
                if (seen.has(t)) continue;
                seen.add(t);
                const cb = backupTableList.querySelector(`input[data-table="${t}"]`);
                if (cb) cb.checked = true;
                (backupDeps[t] || []).forEach(dep => stack.push(dep));
            }
        };
        backupTableList.addEventListener('change', (e) => {
            const cb = e.target.closest('input[data-table]');
            if (cb && cb.checked) checkWithDeps(cb.dataset.table);
        });
    }

    const backupSelectAllBtn = document.getElementById('backupSelectAllBtn');
    if (backupSelectAllBtn) {
        backupSelectAllBtn.addEventListener('click', () => {
            backupTableList.querySelectorAll('input[data-table]').forEach(cb => { cb.checked = true; });
        });
    }

    const backupExportBtn = document.getElementById('backupExportBtn');
    if (backupExportBtn) {
        backupExportBtn.addEventListener('click', async () => {
            const selected = [...backupTableList.querySelectorAll('input[data-table]:checked')]
                .map(cb => cb.dataset.table);
            if (!selected.length) {
                showToast('Select at least one table to export', 'error');
                return;
            }
            setButtonLoading(backupExportBtn, true);
            try {
                const payload = await exportBackup(selected);
                const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const now = new Date();
                const pad = n => String(n).padStart(2, '0');
                a.href = url;
                a.download = `okr-backup-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Backup exported.', 'success');
            } catch (e) {
                showToast(e.message || 'Backup export failed', 'error');
            } finally {
                setButtonLoading(backupExportBtn, false);
            }
        });
    }

    const backupImportFile = document.getElementById('backupImportFile');
    const backupImportBtn = document.getElementById('backupImportBtn');
    if (backupImportFile && backupImportBtn) {
        backupImportFile.addEventListener('change', () => {
            backupImportBtn.disabled = !backupImportFile.files.length;
        });
        backupImportBtn.addEventListener('click', async () => {
            const file = backupImportFile.files[0];
            if (!file) return;
            let payload;
            try {
                payload = JSON.parse(await file.text());
            } catch {
                showToast('Invalid JSON file', 'error');
                return;
            }
            if (!payload || payload.version !== 1 || !payload.data || typeof payload.data !== 'object') {
                showToast('Not a valid backup file', 'error');
                return;
            }
            const tableNames = Object.keys(payload.data);
            const ok = await showConfirmModal(
                `Replace data with this backup (${tableNames.length} table(s))? This cannot be undone.`
            );
            if (!ok) return;
            setButtonLoading(backupImportBtn, true);
            try {
                await importBackup(payload);
                showToast('Backup imported. Reloading…', 'success');
                setTimeout(() => location.reload(), 800);
            } catch (e) {
                showToast(e.message || 'Backup import failed', 'error');
                setButtonLoading(backupImportBtn, false);
            }
        });
    }

    try {
        const settings = await loadSettings();
        if (settings.kr_chart_interval) {
            krChartInterval = settings.kr_chart_interval;
            const sel = document.getElementById('settingKrChartInterval');
            if (sel) sel.value = krChartInterval;
        }
    } catch {}

    document.querySelectorAll('.dropdown-menu .dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const dropdown = bootstrap.Dropdown.getInstance(document.getElementById('profileBtn'));
            if (dropdown) dropdown.hide();
        });
    });

    // Enable drag & resize for major modals (skip transient confirm/prompt)
    ['objModal', 'krModal', 'initiativeModal', 'settingsModal', 'cyclesModal',
     'teamModal', 'managerModal', 'userModal', 'profileModal',
     'krDetailModal', 'initiativeDetailModal', 'backupModal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) initModalDragResize(el);
    });

    // KR chart refresh buttons
    const detailRefreshBtn = document.getElementById('krDetailRefreshBtn');
    if (detailRefreshBtn) detailRefreshBtn.addEventListener('click', refreshKRDetailChart);
    const editRefreshBtn = document.getElementById('krEditRefreshBtn');
    if (editRefreshBtn) editRefreshBtn.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.classList.add('loading');
        try {
            if (currentKREdit) await loadKRHistoryTab(currentKREdit.id);
        } catch {
            showToast('Failed to refresh chart', 'error');
        } finally {
            btn.classList.remove('loading');
        }
    });
});
