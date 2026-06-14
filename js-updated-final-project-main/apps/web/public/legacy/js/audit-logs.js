async function loadAuditLogs() {
  const targets = [
    document.getElementById('audit-logs-tbody'),
    document.getElementById('auth-audit-logs-tbody')
  ].filter(Boolean);
  if (!targets.length) return;
  const setAuditRows = (html) => {
    targets.forEach(tbody => { tbody.innerHTML = html; });
  };
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  setAuditRows('<tr><td colspan="5" style="text-align: center; padding: 20px;">Loading audit logs...</td></tr>');
  try {
    const response = await apiFetch('/reports/audit-logs');
    const logs = Array.isArray(response) ? response : [];
    if (!logs || logs.length === 0) {
      const emptyHtml = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No audit logs found.</td></tr>';
      setAuditRows(emptyHtml);
      return;
    }
    let html = '';
    logs.forEach(log => {
      const rawDate = log.performedAt || log.createdAt;
      const dateObj = rawDate ? new Date(rawDate) : null;
      const date = dateObj && !Number.isNaN(dateObj.getTime()) ? dateObj.toLocaleString() : '-';
      let badgeColor = '#6b7280';
      if (log.action === 'APPROVE' || log.action === 'PROJECT_CREATED') badgeColor = '#10b981';
      else if (log.action === 'REJECT' || log.action === 'DOCUMENT_DELETED') badgeColor = '#ef4444';
      else if (log.action === 'RETURN' || log.action === 'SECTION_STATUS_CHANGED') badgeColor = '#f59e0b';
      else if (log.action === 'FORWARD' || log.action === 'SUBMIT') badgeColor = '#3b82f6';
      else if (log.action === 'PROJECT_PHASE_CHANGED') badgeColor = '#8b5cf6';
      else if (log.action === 'DOCUMENT_UPLOADED') badgeColor = '#06b6d4';
      else if (log.action === 'SECTION_REVIEW_REPLY' || log.action === 'DEO_REPLY') badgeColor = '#6366f1';
      html += `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 12px; font-size: 13px;">${escapeHtml(date)}</td>
          <td style="padding: 12px; font-weight: 500;">${escapeHtml(log.projectName || '-')}</td>
          <td style="padding: 12px;">${escapeHtml(log.performedBy || '-')}</td>
          <td style="padding: 12px;">
            <span style="background: ${badgeColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${escapeHtml(log.action || 'AUDIT')}</span>
          </td>
          <td style="padding: 12px; color: var(--text-soft); font-size: 13px; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(log.remarks || '')}">
            ${escapeHtml(log.remarks || '-')}
          </td>
        </tr>
      `;
    });
    setAuditRows(html);
  } catch (err) {
    console.error('Failed to load audit logs:', err);
    const message = /access denied|not logged in|invalid session|401|403/i.test(err?.message || '')
      ? 'Admin access required to view audit logs.'
      : 'Error loading audit logs.';
    setAuditRows(`<tr><td colspan="5" style="text-align: center; padding: 20px;">${message}</td></tr>`);
    if (typeof toast === 'function') toast(message, 'error');
  }
}
window.loadAuditLogs = loadAuditLogs;
