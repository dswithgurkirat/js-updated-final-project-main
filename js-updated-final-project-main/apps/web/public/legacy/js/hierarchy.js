/* Role, module, chapter, and table-level access rules */
const RBAC_ROLE_RULES = {
  ADMIN: {
    label: 'Admin',
    upload: true,
    review: true,
    admin: true,
    modules: ['*'],
    chapters: 'all',
    access: 'Full'
  },
  IIT_ROPAR: {
    label: 'IIT Ropar',
    upload: true,
    review: true,
    modules: ['dashboard', 'projects', 'front-matter', 'chapters', 'anx1', 'anx2', 'annexure-f', 'workflow', 'history'],
    chapters: [1, 2, 3, 4, 5],
    access: 'Survey + Reviewer'
  },
  SDLC: {
    label: 'SDLC',
    upload: true,
    review: false,
    modules: ['sdlc-portal', 'dashboard', 'projects', 'history'],
    chapters: [],
    access: 'District-level data'
  },
  SDO: {
    label: 'SDO',
    upload: true,
    review: false,
    modules: ['chapters', 'anx1', 'anx2', 'anx3', 'anx5', 'annexure-f', 'workflow', 'history', 'dashboard', 'projects'],
    chapters: [5, 6, 7, 8, 9, 10],
    annexureColumns: [1, 2, 3],
    access: 'Assigned block'
  },
  JE: {
    label: 'JE',
    upload: true,
    review: false,
    modules: ['anx1', 'anx2', 'anx3', 'annexure-f', 'workflow', 'history', 'dashboard', 'projects'],
    annexureColumns: [1, 2],
    access: 'Field data'
  },
  AXEN: {
    label: 'AXEN',
    upload: true,
    review: false,
    modules: ['anx4', 'anx5', 'anx6', 'anx7', 'annexure-k', 'workflow', 'history', 'dashboard', 'projects'],
    annexureColumns: [3, 4, 5],
    access: 'Assigned section'
  },
  GIS: {
    label: 'GIS',
    upload: true,
    review: true,
    modules: ['dashboard', 'projects', 'plates', 'graphs', 'anx1', 'anx2', 'anx3', 'anx4', 'anx5', 'anx6', 'anx7', 'annexure-b', 'annexure-c', 'annexure-d', 'annexure-e', 'annexure-f', 'annexure-g', 'annexure-h', 'annexure-i', 'annexure-j', 'annexure-k'],
    annexureColumns: [2, 3, 4, 5, 6, 7, 8],
    access: 'Plates + Graphs + Annexures'
  },
  REVIEWER: {
    label: 'Reviewer',
    upload: false,
    review: true,
    modules: ['*'],
    readOnly: true,
    access: 'Govt review'
  },
  REVIEWER_1: {
    label: 'Reviewer 1',
    upload: false,
    review: true,
    modules: ['*'],
    readOnly: true,
    access: 'Govt review'
  },
  REVIEWER_2: {
    label: 'Reviewer 2',
    upload: false,
    review: true,
    modules: ['*'],
    readOnly: true,
    access: 'Govt review'
  },
  OFFICER: {
    label: 'Officer',
    upload: true,
    review: false,
    modules: ['*'],
    chapters: 'all',
    access: 'Report data entry'
  },
  DATA_ENTRY: {
    label: 'Data Entry',
    upload: true,
    review: false,
    modules: ['*'],
    chapters: 'all',
    access: 'Report data entry'
  },
  DISTRICT_OWNER: {
    label: 'District Owner',
    upload: false,
    review: true,
    modules: ['*'],
    readOnly: true,
    access: 'District review'
  },
  STATE_ADMIN: {
    label: 'State Admin',
    upload: false,
    review: true,
    modules: ['*'],
    readOnly: true,
    access: 'State review'
  }
};
const RBAC_TABLE_COLUMN_RULES = {
  IIT_ROPAR: {
    default: [1, 2],
    anx1: {
      'anx1-rivers': [1, 2],
      'anx1-desilt': [1, 2, 3],
      'anx1-patta': [1, 2],
      'anx1-msand': [1, 2]
    },
    anx2: {
      'anx2-leases': [1, 2, 3, 4],
      'anx2-patta': [1, 2, 3],
      'anx2-desilt': [1, 2],
      'anx2-msand': [1, 2]
    },
    'annexure-f': {
      'annexure-f-sand': [1, 2, 3],
      'annexure-f-benchmark': [1, 2],
      'annexure-f-cors': [1, 2]
    }
  },
  SDO: {
    default: [1, 2, 3],
    anx1: {
      'anx1-rivers': [1, 2, 3, 4, 5],
      'anx1-desilt': [1, 2, 3, 4],
      'anx1-patta': [1, 2, 3],
      'anx1-msand': [1, 2, 3]
    },
    anx2: {
      'anx2-leases': [1, 2, 3, 4, 5],
      'anx2-patta': [1, 2, 3, 4],
      'anx2-desilt': [1, 2, 3],
      'anx2-msand': [1, 2, 3]
    },
    anx3: {
      'anx3-clusters': [1, 2, 3, 4, 5],
      'anx3-contiguous': [1, 2, 3, 4, 5, 6]
    },
    anx5: {
      'anx5-benchmarks': [1, 2, 3],
      'anx5-mining': [1, 2, 3, 4, 5],
      'anx5-patta': [1, 2, 3, 4],
      'anx5-desilt': [1, 2, 3],
      'anx5-msand': [1, 2, 3]
    },
    'annexure-f': {
      'annexure-f-sand': [1, 2, 3, 4, 5],
      'annexure-f-benchmark': [1, 2, 3],
      'annexure-f-cors': [1, 2, 3]
    }
  },
  JE: {
    default: [1, 2],
    anx1: {
      'anx1-rivers': [1, 2, 3],
      'anx1-desilt': [1, 2, 3],
      'anx1-patta': [1, 2],
      'anx1-msand': [1, 2]
    },
    anx2: {
      'anx2-leases': [1, 2, 3],
      'anx2-patta': [1, 2],
      'anx2-desilt': [1, 2],
      'anx2-msand': [1, 2]
    },
    anx3: {
      'anx3-clusters': [1, 2, 3],
      'anx3-contiguous': [1, 2, 3]
    },
    'annexure-f': {
      'annexure-f-sand': [1, 2, 3],
      'annexure-f-benchmark': [1, 2],
      'annexure-f-cors': [1, 2]
    }
  },
  AXEN: {
    default: [3, 4, 5],
    anx4: {
      default: [1, 2, 3, 4, 5, 6]
    },
    anx5: {
      'anx5-benchmarks': [3, 4, 5],
      'anx5-mining': [3, 4, 5, 6, 7],
      'anx5-patta': [3, 4, 5],
      'anx5-desilt': [3, 4, 5],
      'anx5-msand': [3, 4]
    },
    anx6: {
      'anx6-final-clusters': [3, 4, 5, 6, 7],
      'anx6-contiguous-clusters': [3, 4, 5, 6, 7]
    },
    anx7: {
      default: [3, 4, 5, 6]
    },
    'annexure-k': {
      'annexure-k-proforma': [3, 4, 5, 6],
      'annexure-k-annexure-a': [3, 4, 5]
    }
  },
  GIS: {
    default: [2, 3, 4, 5, 6, 7, 8]
  }
};
function getBackendRole() {
  const raw = (window.S && (S.backendRole || S.user?.backendRole || S.user?.roleCode)) || '';
  const cleaned = String(raw).replace(/^ROLE_/, '').toUpperCase();
  if (cleaned) return cleaned;
  if (S?.role === 'admin') return 'ADMIN';
  if (S?.role === 'reviewer') return 'REVIEWER';
  if (S?.role === 'sdlc') return 'SDLC';
  return 'OFFICER';
}
function getRoleRule() {
  return RBAC_ROLE_RULES[getBackendRole()] || RBAC_ROLE_RULES.OFFICER;
}
function hasPermission(permission) {
  const perms = S?.permissions || [];
  if (perms.includes(permission)) return true;
  const rule = getRoleRule();
  if (permission === 'UPLOAD') return !!rule.upload;
  if (permission === 'REVIEW') return !!rule.review;
  if (permission === 'ADMIN') return !!rule.admin;
  return false;
}
function hasModuleAccess(viewId) {
  if (!viewId) return true;
  if (viewId === 'audit-logs') return true;
  const rule = getRoleRule();
  if (rule.modules?.includes('*')) return true;
  return rule.modules?.includes(viewId);
}
function getFirstAllowedView() {
  const preferredViews = [
    'dashboard', 'projects', 'front-matter', 'chapters', 'plates', 'graphs',
    'anx1', 'anx2', 'anx3', 'anx4', 'anx5', 'anx6', 'anx7',
    'annexure-b', 'annexure-c', 'annexure-d', 'annexure-e', 'annexure-f',
    'annexure-g', 'annexure-h', 'annexure-i', 'annexure-j', 'annexure-k',
    'workflow', 'history', 'sdlc-portal', 'users', 'audit-logs'
  ];
  return preferredViews.find(viewId => hasModuleAccess(viewId) && document.getElementById('view-' + viewId)) || 'dashboard';
}
function getFirstAllowedProjectView() {
  const projectViews = [
    'front-matter', 'chapters', 'plates', 'graphs',
    'anx1', 'anx2', 'anx3', 'anx4', 'anx5', 'anx6', 'anx7',
    'annexure-b', 'annexure-c', 'annexure-d', 'annexure-e', 'annexure-f',
    'annexure-g', 'annexure-h', 'annexure-i', 'annexure-j', 'annexure-k',
    'sdlc-portal', 'workflow', 'history'
  ];
  return projectViews.find(viewId => hasModuleAccess(viewId) && document.getElementById('view-' + viewId)) || 'projects';
}
function showUnauthorizedAccessError() {
  const message = 'Access not provided. You are not authorized to access this section.';
  if (typeof toast === 'function') toast(message, 'error');
  else alert(message);
}
function canEditView(viewId) {
  if (typeof isActivePhaseLocked === 'function' && isActivePhaseLocked()) return false;
  const role = getBackendRole();
  const rule = getRoleRule();
  if (role === 'ADMIN' || role === 'OFFICER' || role === 'DATA_ENTRY') return true;
  if (rule.readOnly) return false;
  if (!rule.upload) return false;
  if (viewId === 'dashboard' || viewId === 'projects' || viewId === 'workflow' || viewId === 'history') return false;
  return hasModuleAccess(viewId);
}
function canEditChapter(chapterNo) {
  const role = getBackendRole();
  const rule = getRoleRule();
  if (role === 'ADMIN' || role === 'OFFICER' || role === 'DATA_ENTRY') return true;
  if (rule.chapters === 'all') return true;
  return Array.isArray(rule.chapters) && rule.chapters.includes(Number(chapterNo));
}
function hasWriteAccess() {
  if (typeof S === 'undefined' || !S || !S.user) return false;
  const activeView = document.querySelector('.view.active');
  const viewId = activeView ? activeView.id.replace('view-', '') : '';
  return canEditView(viewId);
}
function isUserReadOnly() {
  return !hasWriteAccess();
}
function hasReviewAccess() {
  if (typeof S === 'undefined' || !S || !S.user) return false;
  return hasPermission('REVIEW');
}
function hasAdminAccess() {
  if (typeof S === 'undefined' || !S || !S.user) return false;
  return hasPermission('ADMIN') || getBackendRole() === 'ADMIN';
}
function setLockedElement(el, locked, label) {
  if (!el) return;
  el.classList.toggle('rbac-locked', locked);
  if (locked) {
    el.setAttribute('aria-disabled', 'true');
    el.title = label || 'Locked for your role';
    el.dataset.rbacBadge = 'Locked';
  } else {
    el.removeAttribute('aria-disabled');
    el.removeAttribute('title');
    delete el.dataset.rbacBadge;
  }
}
function lockFormElement(el, locked, label) {
  if (!el) return;
  if (el.matches('[contenteditable], td, th')) {
    el.setAttribute('contenteditable', locked ? 'false' : 'true');
  } else {
    el.disabled = locked;
  }
  setLockedElement(el, locked, label);
}
function isNavigationOrSafeButton(btn) {
  const onclickAttr = btn.getAttribute('onclick') || '';
  return btn.closest('#reviewer-actions') ||
    btn.closest('#reviewer-floating-notes') ||
    btn.closest('.top-nav') ||
    btn.closest('.header-row') ||
    btn.closest('.tb-dropdown-menu') ||
    btn.classList.contains('modal-close') ||
    onclickAttr.includes('showView') ||
    onclickAttr.includes('filterDashboardByDistrict') ||
    onclickAttr.includes('toggle') ||
    onclickAttr.includes('closeModal');
}
function isEditActionElement(el) {
  const text = (el.textContent || '').toLowerCase();
  const attrs = `${el.getAttribute('onclick') || ''} ${el.getAttribute('onchange') || ''}`;
  return /add|upload|save|delete|remove|submit|edit|clear|replace|move|sign|approve|return/.test(text) ||
    /add|upload|save|delete|remove|submit|handle|clear|replace|move|sign|approve|return/i.test(attrs) ||
    el.classList.contains('upload-zone') ||
    el.querySelector?.('input[type="file"]');
}
function applyMoreAnnexureAccess(root) {
  const container = root || document.querySelector('.view.active');
  if (!container || !container.id || !container.id.startsWith('view-annexure-')) return;
  applyAnnexureColumnLocks(container);
}
function applyChapterAccess(root) {
  const container = root || document.getElementById('view-chapters');
  if (!container) return;
  container.querySelectorAll('.chapter-item').forEach((item, idx) => {
    const allowed = canEditChapter(idx + 1);
    const label = allowed ? '' : `Chapter ${idx + 1} is locked for ${getRoleRule().label}`;
    item.querySelectorAll('input, textarea, select').forEach(el => lockFormElement(el, !allowed, label));
    item.querySelectorAll('button, label.btn').forEach(el => {
      if (isEditActionElement(el)) el.style.display = allowed ? '' : 'none';
    });
    setLockedElement(item, !allowed, label);
  });
}
function getTableColumnPolicy(role, viewId, table) {
  const tableId = table?.id || '';
  const policy = RBAC_TABLE_COLUMN_RULES[role];
  if (!policy) return null;
  const viewPolicy = policy[viewId];
  if (viewPolicy) {
    for (const [key, columns] of Object.entries(viewPolicy)) {
      if (key === 'default') continue;
      if (tableId === key || tableId.startsWith(`${key}-`)) return columns;
    }
    if (viewPolicy.default) return viewPolicy.default;
  }
  return policy.default || null;
}
function getEditableColumnsForTable(table) {
  const role = getBackendRole();
  const view = table?.closest?.('.view');
  const viewId = view ? view.id.replace('view-', '') : '';
  const rule = getRoleRule();
  const fullAccess = role === 'ADMIN' || role === 'OFFICER' || role === 'DATA_ENTRY';
  if (fullAccess) return null;
  return getTableColumnPolicy(role, viewId, table) || rule.annexureColumns || [];
}
function isActionCellContent(value) {
  const text = String(value === undefined || value === null ? '' : value);
  return /<button|onclick=|btn-danger|trash-2/i.test(text);
}
function setRbacUploadCellValue(cell, value) {
  if (!cell) return;
  const valueText = String(value === undefined || value === null || value === '' ? 'NUL' : value);
  const select = cell.querySelector('select');
  if (select && !String(valueText).includes('<select')) {
    const match = Array.from(select.options).find(opt => opt.text.trim().toLowerCase() === valueText.trim().toLowerCase());
    if (match) select.value = match.value;
    return;
  }
  if (String(valueText).includes('<select') || String(valueText).includes('<button')) {
    cell.innerHTML = valueText;
  } else {
    cell.textContent = valueText;
  }
}
function buildSafeUploadRowForTable(table, rowData, editableColumns) {
  if (!Array.isArray(rowData)) return [];
  if (!editableColumns) return rowData.slice();
  return rowData.map((value, idx) => {
    const colNo = idx + 1;
    if (isActionCellContent(value)) return value;
    return editableColumns.includes(colNo) ? value : 'LOCKED';
  });
}
function rbacApplyExcelRowsToTable(tableOrId, rows, addRowFn, options = {}) {
  const table = typeof tableOrId === 'string' ? document.getElementById(tableOrId) : tableOrId;
  const tbody = table ? table.querySelector('tbody') : null;
  if (!table || !tbody || !Array.isArray(rows)) return { updated: 0, protected: 0 };
  const editableColumns = getEditableColumnsForTable(table);
  const fullAccess = editableColumns === null;
  const addRow = typeof addRowFn === 'function'
    ? addRowFn
    : (row) => {
      const tr = document.createElement('tr');
      row.forEach(value => {
        const td = document.createElement('td');
        setRbacUploadCellValue(td, value);
        if (!isActionCellContent(value)) td.contentEditable = 'true';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    };
  if (fullAccess || options.replaceForPartial === true) {
    tbody.innerHTML = '';
    rows.forEach(row => addRow(row));
    if (typeof enforceActiveViewHierarchy === 'function') enforceActiveViewHierarchy(true);
    return { updated: rows.length, protected: 0 };
  }
  let updated = 0;
  let protectedCells = 0;
  rows.forEach((rowData, rowIndex) => {
    let row = tbody.rows[rowIndex];
    if (!row) {
      addRow(buildSafeUploadRowForTable(table, rowData, editableColumns));
      row = tbody.rows[rowIndex];
    }
    if (!row) return;
    Array.from(rowData).forEach((value, idx) => {
      if (isActionCellContent(value)) return;
      const colNo = idx + 1;
      const cell = row.children[idx];
      if (!editableColumns.includes(colNo)) {
        protectedCells += 1;
        return;
      }
      setRbacUploadCellValue(cell, value);
    });
    updated += 1;
  });
  if (typeof enforceActiveViewHierarchy === 'function') enforceActiveViewHierarchy(true);
  if (typeof initLucide === 'function') initLucide();
  if (protectedCells && typeof toast === 'function' && options.silent !== true) {
    toast(`${protectedCells} locked cell(s) were protected during Excel sync.`, 'info');
  }
  return { updated, protected: protectedCells };
}
function applyAnnexureColumnLocks(root) {
  const container = root || document.querySelector('.view.active');
  if (!container) return;
  const viewId = container.id.replace('view-', '');
  if (!/^anx[1-7]$/.test(viewId) && !/^annexure-[b-k]$/.test(viewId)) return;
  const role = getBackendRole();
  const rule = getRoleRule();
  const fullAccess = role === 'ADMIN' || role === 'OFFICER' || role === 'DATA_ENTRY';
  const canModuleEdit = canEditView(viewId);
  container.querySelectorAll('table').forEach(table => {
    const tableColumns = getTableColumnPolicy(role, viewId, table);
    const editableColumns = fullAccess ? null : (tableColumns || rule.annexureColumns || []);
    table.querySelectorAll('tbody tr').forEach(row => {
      Array.from(row.children).forEach((cell, idx) => {
        if (cell.querySelector('button')) return;
        const colNo = idx + 1;
        const allowed = canModuleEdit && (fullAccess || editableColumns.includes(colNo));
        const label = `Column ${colNo} locked for ${rule.label}`;
        lockFormElement(cell, !allowed, allowed ? '' : label);
        cell.querySelectorAll('input, textarea, select').forEach(el => lockFormElement(el, !allowed, label));
      });
    });
  });
  if (canModuleEdit && !fullAccess) {
    container.querySelectorAll('button, label.btn, .upload-zone').forEach(el => {
      const text = (el.textContent || '').toLowerCase();
      const attrs = `${el.getAttribute('onclick') || ''} ${el.getAttribute('onchange') || ''}`;
      if (/upload|replace|delete|remove|clear|move/.test(text) || /upload|replace|delete|remove|clear|move/i.test(attrs)) {
        el.style.display = 'none';
      }
    });
  }
}
function updateRolePermissionUI() {
  const adminAccess = hasAdminAccess();
  [
    document.getElementById('tb-btn-new-project'),
    document.getElementById('view-btn-new-project'),
    document.getElementById('sidebar-new-project-section')
  ].forEach(el => {
    if (el) el.style.display = adminAccess ? '' : 'none';
  });
  document.querySelectorAll('[onclick*="newProjectModal"], [onclick*="deleteProject"]').forEach(el => {
    el.style.display = adminAccess ? '' : 'none';
  });
  const navAuditLogs = document.getElementById('nav-audit-logs');
  if (navAuditLogs) navAuditLogs.style.display = 'block';
  const tbNavAuditLogs = document.getElementById('tb-nav-audit-logs');
  if (tbNavAuditLogs) tbNavAuditLogs.style.display = 'inline-flex';
  const dashMenuAuditLogs = document.getElementById('dash-menu-audit-logs');
  if (dashMenuAuditLogs) dashMenuAuditLogs.style.display = 'block';
  const projectsMenuAuditLogs = document.getElementById('projects-menu-audit-logs');
  if (projectsMenuAuditLogs) projectsMenuAuditLogs.style.display = 'block';
  const navUsers = document.getElementById('nav-users');
  if (navUsers) navUsers.style.display = adminAccess ? 'block' : 'none';
  const roleText = document.querySelector('.sb-role-text');
  if (roleText && S?.user) roleText.textContent = getRoleRule().label;
}
function enforceActiveViewHierarchy(force = false) {
  const activeView = document.querySelector('.view.active');
  if (!activeView || typeof S === 'undefined' || !S.user) return;
  const viewId = activeView.id.replace('view-', '');
  const rbacSignature = [
    getBackendRole(),
    viewId,
    S.activeProject?.id || '',
    activeView.querySelectorAll('input, textarea, select, [contenteditable], button, label.btn, .upload-zone').length,
    activeView.querySelectorAll('tbody tr').length,
    activeView.querySelectorAll('td, th').length
  ].join('|');
  if (!force && activeView.dataset.rbacSignature === rbacSignature) {
    updateRolePermissionUI();
    return;
  }
  const canEdit = canEditView(viewId);
  const label = `${getRoleRule().label} cannot edit this section`;
  activeView.querySelectorAll('input, textarea, select').forEach(el => {
    if (el.closest('#modal-review') || el.id === 'dash-district-filter' || el.closest('#reviewer-actions') || el.closest('#reviewer-floating-notes')) return;
    lockFormElement(el, !canEdit, label);
  });
  activeView.querySelectorAll('[contenteditable], [contenteditable="true"]').forEach(el => {
    lockFormElement(el, !canEdit, label);
  });
  activeView.querySelectorAll('button, label.btn, .upload-zone').forEach(el => {
    if (el.tagName === 'BUTTON' && isNavigationOrSafeButton(el)) return;
    if (!isEditActionElement(el)) return;
    if (hasAdminAccess() && activeView.id === 'view-users') {
      el.style.display = '';
      return;
    }
    el.style.display = canEdit ? '' : 'none';
  });
  if (viewId === 'chapters') applyChapterAccess(activeView);
  applyAnnexureColumnLocks(activeView);
  applyMoreAnnexureAccess(activeView);
  const reviewerActions = document.getElementById('reviewer-actions');
  if (reviewerActions) {
    reviewerActions.style.display = (hasReviewAccess() && S.activeProject) ? 'flex' : 'none';
  }
  updateRolePermissionUI();
  activeView.dataset.rbacSignature = rbacSignature;
}
function ensureRbacStyles() {
  if (document.getElementById('rbac-style')) return;
  const style = document.createElement('style');
  style.id = 'rbac-style';
  style.textContent = `
    .rbac-locked {
      filter: blur(1.1px);
      opacity: 0.48;
      cursor: not-allowed !important;
      user-select: none;
    }
    td.rbac-locked,
    th.rbac-locked {
      filter: none;
      opacity: 1;
      position: relative;
      color: transparent !important;
      text-shadow: 0 0 6px rgba(15, 23, 42, 0.55);
      background: rgba(254, 226, 226, 0.35);
    }
    td.rbac-locked::after,
    th.rbac-locked::after {
      content: attr(data-rbac-badge);
      position: absolute;
      inset: 50% auto auto 50%;
      transform: translate(-50%, -50%);
      padding: 2px 7px;
      border-radius: 6px;
      background: rgba(127, 29, 29, 0.9);
      color: #fff;
      text-shadow: none;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0;
      pointer-events: none;
      white-space: nowrap;
    }
    td.rbac-locked > *,
    th.rbac-locked > * {
      filter: blur(1.1px);
      opacity: 0.48;
    }
    .chapter-item.rbac-locked {
      filter: none;
      opacity: 0.72;
      border-style: dashed;
    }
    .chapter-item.rbac-locked .ch-body {
      filter: blur(0.8px);
    }
  `;
  document.head.appendChild(style);
}
function bindRbacLockedClickHandler() {
  if (window.__rbacLockedClickHandlerBound) return;
  window.__rbacLockedClickHandlerBound = true;
  document.addEventListener('click', event => {
    const locked = event.target.closest?.('.rbac-locked');
    if (!locked) return;
    event.preventDefault();
    event.stopPropagation();
    showUnauthorizedAccessError();
  }, true);
}
document.addEventListener('DOMContentLoaded', ensureRbacStyles);
document.addEventListener('DOMContentLoaded', bindRbacLockedClickHandler);
ensureRbacStyles();
bindRbacLockedClickHandler();
