document.getElementById('objForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('objId').value;
    const data = {
        name: document.getElementById('objName').value,
        parent_id: document.getElementById('objParent').value || null,
        team_id: document.getElementById('objTeam').value || null,
        manager_id: document.getElementById('objManager').value || null,
        doc_link: document.getElementById('objDocLink').value || ''
    };
    if (id) {
        await fetch(`/api/objectives/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
    } else {
        await fetch('/api/objectives', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
    }
    bootstrap.Modal.getInstance(document.getElementById('objModal')).hide();
    refreshTree();
});

document.getElementById('krForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('krId').value;
    const data = {
        name: document.getElementById('krName').value,
        initial_value: parseFloat(document.getElementById('krInitial').value) || 0,
        current_value: parseFloat(document.getElementById('krCurrent').value) || 0,
        target_value: parseFloat(document.getElementById('krTarget').value) || 0,
        unit: document.getElementById('krUnit').value
    };
    if (id) {
        await fetch(`/api/keyresults/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
    } else {
        const objId = document.getElementById('krObjectiveId').value;
        await fetch(`/api/objectives/${objId}/keyresults`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
    }
    bootstrap.Modal.getInstance(document.getElementById('krModal')).hide();
    refreshTree();
});

document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
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
        alert('Error: ' + (err.error || 'Failed to add user'));
    }
});

document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const current_password = document.getElementById('profileCurrentPassword').value;
    const new_password = document.getElementById('profileNewPassword').value;
    const confirm = document.getElementById('profileConfirmPassword').value;

    if (new_password !== confirm) {
        alert('New passwords do not match.');
        return;
    }

    const resp = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({current_password, new_password})
    });
    if (resp.ok) {
        alert('Password changed successfully.');
        bootstrap.Modal.getInstance(document.getElementById('profileModal')).hide();
    } else {
        const err = await resp.json();
        alert('Error: ' + (err.error || 'Failed to change password'));
    }
});

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
        usersBtn.classList.remove('d-none');
    }

    const avatarBtn = document.getElementById('profileBtn');

    await populateFilters();
    await refreshTree();
    refreshTeamList();
    refreshManagerList();
    setupRootDropZone();
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
            viewModeGroup.classList.add('d-none');
            body.classList.add('edit-mode');
            viewMode = 'hierarchy';
            document.querySelectorAll('#viewModeGroup .btn').forEach(b => b.classList.remove('active'));
            document.querySelector('#viewModeGroup [data-mode="hierarchy"]').classList.add('active');
        } else {
            createObjBtn.classList.add('d-none');
            teamsBtn.classList.add('d-none');
            managersBtn.classList.add('d-none');
            viewModeGroup.classList.remove('d-none');
            body.classList.remove('edit-mode');
        }
        refreshTree();
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
        refreshTree();
    });

    document.getElementById('teamForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('teamName').value;
        const resp = await fetch('/api/teams', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name}) });
        if (resp.ok) { document.getElementById('teamName').value = ''; refreshTeamList(); }
        else { const err = await resp.json(); alert('Error: ' + (err.error || 'Failed to add')); }
    });

    document.getElementById('managerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('managerName').value;
        const resp = await fetch('/api/managers', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name}) });
        if (resp.ok) { document.getElementById('managerName').value = ''; refreshManagerList(); }
        else { const err = await resp.json(); alert('Error: ' + (err.error || 'Failed to add')); }
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
