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
            await fetch(`/api/initiatives/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
        } else {
            const objId = document.getElementById('initiativeObjectiveId').value;
            await fetch(`/api/objectives/${objId}/initiatives`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
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
            await fetch(`/api/keyresults/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
        } else {
            const objId = document.getElementById('krObjectiveId').value;
            await fetch(`/api/objectives/${objId}/keyresults`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
        }
        bootstrap.Modal.getInstance(document.getElementById('krModal')).hide();
        refreshTree({ ensureExpanded: document.getElementById('krObjectiveId').value });
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

async function onCycleChange(sel) {
    selectedCycleId = sel.value;
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
    createObjBtn.classList.add('d-none');
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
            createObjBtn.classList.remove('d-none');
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
            createObjBtn.classList.add('d-none');
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
            await updateSettings({ cycle_length: cycleLength });
            showToast('Settings saved.', 'success');
        } catch (e) {
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

    document.querySelectorAll('.dropdown-menu .dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const dropdown = bootstrap.Dropdown.getInstance(document.getElementById('profileBtn'));
            if (dropdown) dropdown.hide();
        });
    });
});
