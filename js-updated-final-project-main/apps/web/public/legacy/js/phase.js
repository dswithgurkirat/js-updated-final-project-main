/* Phase lifecycle and color metadata helpers */
const PHASE_UPLOAD_COLORS = [
  { name: 'Green', value: '#34C759' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Red', value: '#EF4444' }
];
function normalizePhaseNo(project) {
  return Math.max(1, Number(project?.phaseNo || project?.phaseMetadata?.phaseNo || 1));
}
function getProjectPhaseLabel(project) {
  return `Phase ${normalizePhaseNo(project)}`;
}
function getActivePhaseMetadata() {
  if (!S.phaseMetadata || typeof S.phaseMetadata !== 'object') {
    S.phaseMetadata = {
      phaseNo: normalizePhaseNo(S.activeProject),
      parentPhaseId: S.activeProject?.parentPhaseId || null,
      locked: Boolean(S.activeProject?.phaseLocked),
      defaultUploadColor: '#34C759'
    };
  }
  return S.phaseMetadata;
}
function getActivePhaseUploadColor() {
  const meta = getActivePhaseMetadata();
  return meta.defaultUploadColor || meta.uploadColor || '#34C759';
}
function phaseColorOptionsHtml(selectedColor) {
  const selected = String(selectedColor || '#34C759').toUpperCase();
  return PHASE_UPLOAD_COLORS.map(color => {
    const isSelected = color.value.toUpperCase() === selected ? ' selected' : '';
    return `<option value="${color.value}"${isSelected}>${color.name}</option>`;
  }).join('');
}
function setPhaseUploadColor(color) {
  const meta = getActivePhaseMetadata();
  meta.defaultUploadColor = color || '#34C759';
  if (S.activeProject) S.activeProject.defaultUploadColor = meta.defaultUploadColor;
  if (typeof debouncedSaveState === 'function') debouncedSaveState();
}
function recordPhaseChange(section, type, label, color) {
  const meta = getActivePhaseMetadata();
  if (!Array.isArray(S.phaseChangeLog)) S.phaseChangeLog = [];
  const entry = {
    section: section || 'Project',
    type: type || 'PHASE2_UPDATED',
    label: label || 'Updated data',
    color: color || getActivePhaseUploadColor(),
    phaseNo: meta.phaseNo || normalizePhaseNo(S.activeProject),
    at: new Date().toISOString(),
    by: S.user?.email || S.user?.name || 'Portal User'
  };
  S.phaseChangeLog.push(entry);
  return entry;
}
function applyPhaseHighlightToRow(row, color, origin = 'PHASE2_NEW') {
  if (!row) return;
  const phaseColor = color || getActivePhaseUploadColor();
  row.dataset.phaseOrigin = origin;
  row.dataset.phaseColor = phaseColor;
  row.style.background = `linear-gradient(90deg, ${phaseColor}26, transparent 70%)`;
  row.style.boxShadow = `inset 4px 0 0 ${phaseColor}`;
}
function getPhaseChangeSummaryRows() {
  const meta = getActivePhaseMetadata();
  const rows = [];
  if (Number(meta.phaseNo || 1) > 1) {
    rows.push([
      `Imported from Phase ${meta.parentPhaseNo || Math.max(1, Number(meta.phaseNo || 2) - 1)}`,
      meta.parentPhaseTitle || S.activeProject?.phaseOrigin || 'Previous DSR phase',
      '#94A3B8'
    ]);
  }
  (S.phaseChangeLog || []).forEach(item => {
    rows.push([
      item.type || 'PHASE2_UPDATED',
      `${item.section || 'Project'} - ${item.label || 'Updated data'}`,
      item.color || '#F59E0B'
    ]);
  });
  return rows;
}
function isActivePhaseLocked() {
  return Boolean(S.activeProject?.phaseLocked || S.phaseMetadata?.locked);
}
window.PHASE_UPLOAD_COLORS = PHASE_UPLOAD_COLORS;
window.normalizePhaseNo = normalizePhaseNo;
window.getProjectPhaseLabel = getProjectPhaseLabel;
window.getActivePhaseMetadata = getActivePhaseMetadata;
window.getActivePhaseUploadColor = getActivePhaseUploadColor;
window.phaseColorOptionsHtml = phaseColorOptionsHtml;
window.setPhaseUploadColor = setPhaseUploadColor;
window.recordPhaseChange = recordPhaseChange;
window.applyPhaseHighlightToRow = applyPhaseHighlightToRow;
window.getPhaseChangeSummaryRows = getPhaseChangeSummaryRows;
window.isActivePhaseLocked = isActivePhaseLocked;
