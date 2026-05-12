async function refreshUserList() {
    const resp = await fetch('/api/users');
    if (!resp.ok) return;
    const users = await resp.json();
    document.getElementById('userList').innerHTML = users.map(u => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <span>${u.email} <span class="badge ${u.role === 'admin' ? 'bg-danger' : u.role === 'edit' ? 'bg-warning text-dark' : 'bg-secondary'}">${u.role}</span></span>
            <span>
                <button class="btn btn-outline-secondary btn-sm py-0 me-1" onclick="editUser('${u.id}')">✎</button>
                <button class="btn btn-outline-danger btn-sm py-0" onclick="deleteUser('${u.id}')">🗑️</button>
            </span>
        </li>`).join('');
}

async function editUser(id) {
    const newPassword = prompt('New password (leave empty to keep current):');
    if (newPassword === null) return;

    const newRole = prompt('New role (view / edit / admin):');
    if (newRole === null) return;
    if (!['view', 'edit', 'admin'].includes(newRole)) {
        alert('Invalid role. Use: view, edit, or admin');
        return;
    }

    const body = {};
    if (newPassword) body.password = newPassword;
    body.role = newRole;

    await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });
    refreshUserList();
}

async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    const resp = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (!resp.ok) {
        const err = await resp.json();
        alert('Error: ' + (err.error || 'Failed to delete'));
        return;
    }
    refreshUserList();
}

function showProfileModal() {
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileForm').reset();
    new bootstrap.Modal(document.getElementById('profileModal')).show();
}
