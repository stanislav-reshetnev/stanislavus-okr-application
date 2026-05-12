async function refreshUserList() {
    const resp = await fetch('/api/users');
    if (!resp.ok) return;
    const users = await resp.json();
    document.getElementById('userList').dataset.users = JSON.stringify(users);
    document.getElementById('userList').innerHTML = users.map(u => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <span>
                <span style="cursor:pointer" onclick="copyEmail('${u.id}')" title="Click to copy login">${u.email}</span>
                <span class="badge ${u.role === 'admin' ? 'bg-danger' : u.role === 'edit' ? 'bg-warning text-dark' : 'bg-secondary'}">${u.role}</span>
                <br>
                <small class="text-muted">
                    Token: ${u.api_token ? `<code class="user-token" style="cursor:pointer" onclick="copyToken('${u.id}')" title="Click to copy">${u.api_token.substring(0, 12)}...</code>` : '<em>not generated</em>'}
                </small>
            </span>
            <span>
                <button class="btn btn-outline-info btn-sm py-0 me-1" onclick="regenerateToken('${u.id}')" title="Regenerate API token">🔄</button>
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

async function regenerateToken(id) {
    if (!confirm('Regenerate API token for this user? The old token will stop working immediately.')) return;
    const resp = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({regenerate_token: true})
    });
    if (!resp.ok) {
        const err = await resp.json();
        alert('Error: ' + (err.error || 'Failed to regenerate token'));
        return;
    }
    refreshUserList();
}

function copyToken(id) {
    const users = JSON.parse(document.getElementById('userList').dataset.users || '[]');
    const user = users.find(u => u.id === id);
    if (user && user.api_token) {
        navigator.clipboard.writeText(user.api_token).then(() => {
            alert('Token copied to clipboard');
        }).catch(() => {
            prompt('Copy this token manually:', user.api_token);
        });
    }
}

function copyEmail(id) {
    const users = JSON.parse(document.getElementById('userList').dataset.users || '[]');
    const user = users.find(u => u.id === id);
    if (user && user.email) {
        navigator.clipboard.writeText(user.email).then(() => {
            alert('Email copied to clipboard');
        }).catch(() => {
            prompt('Copy this email manually:', user.email);
        });
    }
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
