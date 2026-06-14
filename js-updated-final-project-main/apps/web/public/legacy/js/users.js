/* User management */
const USER_ROLE_OPTIONS = [
  'IIT_ROPAR', 'SDLC', 'SDO', 'JE', 'AXEN', 'GIS',
  'REVIEWER_1', 'REVIEWER_2', 'ADMIN', 'OFFICER', 'DATA_ENTRY', 'REVIEWER'
];
function usersBadge(ok) {
  return ok
    ? '<span class="badge badge-green">Yes</span>'
    : '<span class="badge badge-red">No</span>';
}
function formatUserScope(user) {
  const parts = [];
  if (user.district) parts.push(user.district);
  if (user.block) parts.push(user.block);
  if (user.section) parts.push(user.section);
  return parts.length ? parts.join(' / ') : 'All';
}
async function renderUsers() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;
  if (typeof hasAdminAccess === 'function' && !hasAdminAccess()) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Only Admin can manage users.</td></tr>';
    return;
  }
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Loading users...</td></tr>';
  try {
    const users = await apiFetch('/users');
    tbody.innerHTML = users.map(user => {
      const perms = user.permissions || [];
      const activeLabel = user.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Inactive</span>';
      return `
        <tr>
          <td>
            <div style="font-weight:700;">${user.email || user.username}</div>
            <div style="font-size:11px;color:var(--text-soft);">${user.fullName || ''}</div>
          </td>
          <td>${renderRoleSelect(user)}</td>
          <td>${usersBadge(perms.includes('UPLOAD'))}</td>
          <td>${usersBadge(perms.includes('REVIEW'))}</td>
          <td>${user.accessLabel || '-'}</td>
          <td>${formatUserScope(user)}</td>
          <td>${activeLabel}</td>
          <td style="display:flex;gap:6px;align-items:center;">
            <button class="btn btn-xs btn-outline" onclick="editUserScope(${user.id})">Scope</button>
            <button class="btn btn-xs ${user.active ? 'btn-danger' : 'btn-saffron'}" onclick="toggleUserActive(${user.id}, ${!user.active})">${user.active ? 'Disable' : 'Enable'}</button>
          </td>
        </tr>`;
    }).join('');
    if (window.initLucide) window.initLucide();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--red);">${e.message || 'Failed to load users'}</td></tr>`;
  }
}
function renderRoleSelect(user) {
  const options = USER_ROLE_OPTIONS.map(role => `<option value="${role}" ${role === user.role ? 'selected' : ''}>${role.replace(/_/g, ' ')}</option>`).join('');
  return `<select style="min-width:150px;" onchange="updateUserRole(${user.id}, this.value)">${options}</select>`;
}
async function updateUserRole(userId, role) {
  try {
    await apiFetch(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
    toast('Role updated', 'success');
    renderUsers();
  } catch (e) {
    toast(e.message || 'Failed to update role', 'error');
  }
}
async function toggleUserActive(userId, active) {
  try {
    await apiFetch(`/users/${userId}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ active })
    });
    toast(active ? 'User enabled' : 'User disabled', 'success');
    renderUsers();
  } catch (e) {
    toast(e.message || 'Failed to update user', 'error');
  }
}
async function editUserScope(userId) {
  const district = prompt('Assigned district (blank = all):', 'Jalandhar');
  if (district === null) return;
  const block = prompt('Assigned block (optional):', '');
  if (block === null) return;
  const section = prompt('Assigned section (optional):', '');
  if (section === null) return;
  try {
    await apiFetch(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ district, block, section })
    });
    toast('Scope updated', 'success');
    renderUsers();
  } catch (e) {
    toast(e.message || 'Failed to update scope', 'error');
  }
}
async function openAddUserPrompt() {
  const username = prompt('Email / username for new user:', '');
  if (!username) return;
  const fullName = prompt('Full name:', username) || username;
  const role = prompt(`Role (${USER_ROLE_OPTIONS.join(', ')}):`, 'SDO') || 'SDO';
  const district = prompt('Assigned district:', 'Jalandhar') || '';
  try {
    await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify({
        username,
        email: username,
        fullName,
        role,
        district,
        password: 'password123',
        active: 'true'
      })
    });
    toast('User created with password password123', 'success');
    renderUsers();
  } catch (e) {
    toast(e.message || 'Failed to create user', 'error');
  }
}
window.renderUsers = renderUsers;
window.updateUserRole = updateUserRole;
window.toggleUserActive = toggleUserActive;
window.editUserScope = editUserScope;
window.openAddUserPrompt = openAddUserPrompt;
