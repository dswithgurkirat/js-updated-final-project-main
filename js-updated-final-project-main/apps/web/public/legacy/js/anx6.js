/* ANNEXURE VI - FINAL CLUSTER DETAILS */
window.S = window.S || { activeProject: { id: 'demo_proj', anx6PdfName: null }, projects: [] };
window.toast = window.toast || function (msg, type) { alert('[' + (type || 'INFO').toUpperCase() + '] ' + msg); };
window.initLucide = window.initLucide || function () { if (window.lucide) lucide.createIcons(); };
const ANX6_CLUSTER_HEADERS = [
  'River Name',
  'Cluster No.',
  'Lease No',
  'Location (Riverbed/Patta Land)',
  'Village',
  'Area (in Ha.)',
  'Total Excavation (MT)',
  'Total Mineral Excavation (MT)'
];
const ANX6_CONTIGUOUS_HEADERS = [
  'River Name',
  'Contiguous Cluster No.',
  'Cluster No',
  'Number of leases in the cluster',
  'Location (Riverbed / Patta Land)',
  'Distance between clusters',
  'Village',
  'Area Of Cluster (Ha)',
  'Total Mineral Excavation (MT)'
];
let anx6ClusterData = [
  { river: 'Sutlej', cluster: '1', lease: 'Jalandhar Sutlej 1,2', location: 'Riverbed', village: 'Kadiana', area: 25.27, excavation: 1074334.80, mineral: 644600.88 },
  { river: 'Sutlej', cluster: '2', lease: 'Jalandhar Sutlej 3,4,5,6', location: 'Riverbed', village: 'Chhuala', area: 23.43, excavation: 1027755.96, mineral: 616653.576 },
  { river: 'Sutlej', cluster: '3', lease: 'Jalandhar Sutlej 14,15,16,17,18', location: 'Riverbed', village: 'Burj Hassan', area: 21.93, excavation: 697078.08, mineral: 418246.848 }
];
let anx6ContiguousData = [
  { river: 'Sutlej', contiguous: '1', cluster: '10,11', leases: '10', location: 'Riverbed', distance: '0.55km', village: 'Minwal, Mau Sahib', area: 71.01, mineral: 1978752.45 },
  { river: 'Sutlej', contiguous: '2', cluster: '16,17', leases: '10', location: 'Riverbed', distance: '1.38km', village: 'Burewal, Chak hathiana\nNaurangpur\nBurewal,\nNaurangpur', area: 127.91, mineral: 2664913.66 }
];
function anx6ActionButton(kind, index) {
  const fn = kind === 'cluster' ? `deleteClusterRowAnx6(${index})` : `deleteContiguousRowAnx6(${index})`;
  return `<button class="btn btn-xs btn-danger" onclick="${fn}" style="display:inline-flex;align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>`;
}
function escapeHtmlAnx6(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function toNumberAnx6(value) {
  const num = parseFloat(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(num) ? num : 0;
}
function defaultNAAnx6(value) {
  const text = String(value === undefined || value === null ? '' : value).trim();
  return text || 'NA';
}
function fillNAAnx6(el) {
  if (el && String(el.innerText || '').trim() === '') el.innerText = 'NA';
}
window.fillNAAnx6 = fillNAAnx6;
function formatNumberAnx6(value, decimals = 2) {
  if (String(value === undefined || value === null ? '' : value).trim() === '' || String(value).trim().toUpperCase() === 'NA') return 'NA';
  const num = toNumberAnx6(value);
  return num ? num.toFixed(decimals) : '0.00';
}
function getCellTextAnx6(td) {
  const select = td.querySelector('select');
  return defaultNAAnx6(select ? select.value : td.innerText);
}
function renderAnx6() {
  renderAnx6Clusters();
  renderAnx6Contiguous();
}
window.renderAnx6 = renderAnx6;
function renderAnx6Clusters() {
  const tbody = document.getElementById('anx6-cluster-body');
  const tfoot = document.getElementById('anx6-cluster-foot');
  if (!tbody || !tfoot) return;
  let totalArea = 0, totalExcavation = 0, totalMineral = 0;
  tbody.innerHTML = '';
  anx6ClusterData.forEach((row, index) => {
    const mineral = String(row.mineral ?? '').trim().toUpperCase() === 'NA'
      ? 'NA'
      : row.mineral !== '' && row.mineral !== null && row.mineral !== undefined
        ? toNumberAnx6(row.mineral)
        : toNumberAnx6(row.excavation) * 0.6;
    totalArea += toNumberAnx6(row.area);
    totalExcavation += toNumberAnx6(row.excavation);
    totalMineral += toNumberAnx6(mineral);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Cluster(${index}, 'river', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.river))}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Cluster(${index}, 'cluster', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.cluster))}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" style="white-space:pre-line;" oninput="updateAnx6Cluster(${index}, 'lease', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.lease))}</td>
      <td>
        <select onchange="updateAnx6Cluster(${index}, 'location', this.value)">
          <option ${row.location === 'Riverbed' ? 'selected' : ''}>Riverbed</option>
          <option ${row.location === 'Patta Land' ? 'selected' : ''}>Patta Land</option>
        </select>
      </td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" style="white-space:pre-line;" oninput="updateAnx6Cluster(${index}, 'village', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.village))}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Cluster(${index}, 'area', this.innerText); renderAnx6ClusterTotals();">${formatNumberAnx6(row.area)}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Cluster(${index}, 'excavation', this.innerText); updateAnx6ClusterMineral(${index}); renderAnx6ClusterTotals();">${formatNumberAnx6(row.excavation)}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Cluster(${index}, 'mineral', this.innerText); renderAnx6ClusterTotals();">${formatNumberAnx6(mineral)}</td>
      <td class="no-print">${anx6ActionButton('cluster', index)}</td>`;
    tbody.appendChild(tr);
  });
  tfoot.innerHTML = `<tr class="total-row" style="font-weight:bold; background-color:#e5e7eb; text-align:center;">
    <td colspan="5">Total</td>
    <td id="anx6-cluster-total-area">${totalArea.toFixed(2)}</td>
    <td id="anx6-cluster-total-excavation">${totalExcavation.toFixed(2)}</td>
    <td id="anx6-cluster-total-mineral">${totalMineral.toFixed(2)}</td>
    <td class="no-print"></td>
  </tr>`;
  if (window.initLucide) window.initLucide();
}
function renderAnx6ClusterTotals() {
  const rows = document.querySelectorAll('#anx6-final-clusters tbody tr');
  let area = 0, excavation = 0, mineral = 0;
  rows.forEach(tr => {
    area += toNumberAnx6(tr.cells[5]?.innerText);
    excavation += toNumberAnx6(tr.cells[6]?.innerText);
    mineral += toNumberAnx6(tr.cells[7]?.innerText);
  });
  const areaEl = document.getElementById('anx6-cluster-total-area');
  const excavationEl = document.getElementById('anx6-cluster-total-excavation');
  const mineralEl = document.getElementById('anx6-cluster-total-mineral');
  if (areaEl) areaEl.textContent = area.toFixed(2);
  if (excavationEl) excavationEl.textContent = excavation.toFixed(2);
  if (mineralEl) mineralEl.textContent = mineral.toFixed(2);
}
window.renderAnx6ClusterTotals = renderAnx6ClusterTotals;
function updateAnx6Cluster(index, key, value) {
  if (!anx6ClusterData[index]) return;
  anx6ClusterData[index][key] = ['area', 'excavation', 'mineral'].includes(key) ? defaultNAAnx6(value) : defaultNAAnx6(value);
}
window.updateAnx6Cluster = updateAnx6Cluster;
function updateAnx6ClusterMineral(index) {
  const row = anx6ClusterData[index];
  if (!row) return;
  row.mineral = String(row.excavation).trim().toUpperCase() === 'NA' ? 'NA' : toNumberAnx6(row.excavation) * 0.6;
  const tr = document.querySelectorAll('#anx6-final-clusters tbody tr')[index];
  if (tr?.cells[7]) tr.cells[7].innerText = row.mineral === 'NA' ? 'NA' : toNumberAnx6(row.mineral).toFixed(2);
}
window.updateAnx6ClusterMineral = updateAnx6ClusterMineral;
function renderAnx6Contiguous() {
  const tbody = document.getElementById('anx6-contiguous-body');
  const tfoot = document.getElementById('anx6-contiguous-foot');
  if (!tbody || !tfoot) return;
  let totalArea = 0, totalMineral = 0;
  tbody.innerHTML = '';
  anx6ContiguousData.forEach((row, index) => {
    totalArea += toNumberAnx6(row.area);
    totalMineral += toNumberAnx6(row.mineral);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Contiguous(${index}, 'river', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.river))}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Contiguous(${index}, 'contiguous', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.contiguous))}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Contiguous(${index}, 'cluster', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.cluster))}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Contiguous(${index}, 'leases', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.leases))}</td>
      <td>
        <select onchange="updateAnx6Contiguous(${index}, 'location', this.value)">
          <option ${row.location === 'Riverbed' ? 'selected' : ''}>Riverbed</option>
          <option ${row.location === 'Patta Land' ? 'selected' : ''}>Patta Land</option>
        </select>
      </td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Contiguous(${index}, 'distance', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.distance))}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" style="white-space:pre-line;" oninput="updateAnx6Contiguous(${index}, 'village', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.village))}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Contiguous(${index}, 'area', this.innerText); renderAnx6ContiguousTotals();">${formatNumberAnx6(row.area)}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Contiguous(${index}, 'mineral', this.innerText); renderAnx6ContiguousTotals();">${formatNumberAnx6(row.mineral)}</td>
      <td class="no-print">${anx6ActionButton('contiguous', index)}</td>`;
    tbody.appendChild(tr);
  });
  tfoot.innerHTML = `<tr class="total-row" style="font-weight:bold; background-color:#e5e7eb; text-align:center;">
    <td colspan="7">Total</td>
    <td id="anx6-contiguous-total-area">${totalArea.toFixed(2)}</td>
    <td id="anx6-contiguous-total-mineral">${totalMineral.toFixed(2)}</td>
    <td class="no-print"></td>
  </tr>`;
  if (window.initLucide) window.initLucide();
}
function renderAnx6ContiguousTotals() {
  const rows = document.querySelectorAll('#anx6-contiguous-clusters tbody tr');
  let area = 0, mineral = 0;
  rows.forEach(tr => {
    area += toNumberAnx6(tr.cells[7]?.innerText);
    mineral += toNumberAnx6(tr.cells[8]?.innerText);
  });
  const areaEl = document.getElementById('anx6-contiguous-total-area');
  const mineralEl = document.getElementById('anx6-contiguous-total-mineral');
  if (areaEl) areaEl.textContent = area.toFixed(2);
  if (mineralEl) mineralEl.textContent = mineral.toFixed(2);
}
window.renderAnx6ContiguousTotals = renderAnx6ContiguousTotals;
function updateAnx6Contiguous(index, key, value) {
  if (!anx6ContiguousData[index]) return;
  anx6ContiguousData[index][key] = defaultNAAnx6(value);
}
window.updateAnx6Contiguous = updateAnx6Contiguous;
function addClusterRowAnx6() {
  anx6ClusterData.push({ river: 'NA', cluster: 'NA', lease: 'NA', location: 'Riverbed', village: 'NA', area: 'NA', excavation: 'NA', mineral: 'NA' });
  renderAnx6Clusters();
}
window.addClusterRowAnx6 = addClusterRowAnx6;
function addContiguousRowAnx6() {
  anx6ContiguousData.push({ river: 'NA', contiguous: 'NA', cluster: 'NA', leases: 'NA', location: 'Riverbed', distance: 'NA', village: 'NA', area: 'NA', mineral: 'NA' });
  renderAnx6Contiguous();
}
window.addContiguousRowAnx6 = addContiguousRowAnx6;
function deleteClusterRowAnx6(index) {
  if (anx6ClusterData.length <= 1) { toast('At least one cluster row is required.', 'warn'); return; }
  anx6ClusterData.splice(index, 1);
  renderAnx6Clusters();
}
window.deleteClusterRowAnx6 = deleteClusterRowAnx6;
function deleteContiguousRowAnx6(index) {
  if (anx6ContiguousData.length <= 1) { toast('At least one contiguous row is required.', 'warn'); return; }
  anx6ContiguousData.splice(index, 1);
  renderAnx6Contiguous();
}
window.deleteContiguousRowAnx6 = deleteContiguousRowAnx6;
function downloadSectionTemplateAnx6(sectionType) {
  const headers = sectionType === 'cluster' ? ANX6_CLUSTER_HEADERS : ANX6_CONTIGUOUS_HEADERS;
  const filename = sectionType === 'cluster' ? 'Cluster_Details_Template.csv' : 'Contiguous_Clusters_Template.csv';
  const csv = headers.join(',') + '\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
window.downloadSectionTemplateAnx6 = downloadSectionTemplateAnx6;
function normalizeHeaderAnx6(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function findHeaderIndexAnx6(rows, requiredHeaders) {
  return rows.findIndex(row => {
    const normalized = row.map(normalizeHeaderAnx6);
    return requiredHeaders.every(header => normalized.some(cell => cell.includes(normalizeHeaderAnx6(header)) || normalizeHeaderAnx6(header).includes(cell)));
  });
}
function validateFileAnx6(file) {
  if (!file) return 'Missing file.';
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return 'Wrong file type. Please upload .xlsx, .xls, or .csv.';
  return '';
}
function handleSectionUploadAnx6(event, sectionType) {
  const file = event.target.files[0];
  const fileError = validateFileAnx6(file);
  if (fileError) { toast(fileError, 'error'); event.target.value = ''; return; }
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) throw new Error('Missing worksheet.');
      const sheetName = pickWorksheetAnx6(workbook, sectionType);
      if (!sheetName) throw new Error('Missing worksheet for ' + (sectionType === 'cluster' ? 'Final Cluster Details.' : 'Final Contiguous Clusters.'));
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      processExcelDataAnx6(rows, sectionType);
    } catch (error) {
      console.error(error);
      toast('Upload failed: ' + error.message, 'error');
    }
    event.target.value = '';
  };
  reader.readAsArrayBuffer(file);
}
window.handleSectionUploadAnx6 = handleSectionUploadAnx6;
function pickWorksheetAnx6(workbook, sectionType) {
  const keywords = sectionType === 'cluster'
    ? ['cluster_details', 'cluster details', 'cluster']
    : ['contiguous_clusters', 'contiguous clusters', 'contiguous'];
  return workbook.SheetNames.find(name => {
    const key = String(name || '').toLowerCase();
    return keywords.some(k => key.includes(k));
  }) || workbook.SheetNames[0];
}
function processExcelDataAnx6(rows, sectionType) {
  const cleanRows = rows.filter(row => Array.isArray(row) && row.some(cell => String(cell ?? '').trim() !== ''));
  if (!cleanRows.length) throw new Error('Empty rows. No data found in worksheet.');
  const required = sectionType === 'cluster'
    ? ['River Name', 'Cluster No', 'Lease No', 'Location', 'Village', 'Area', 'Total Excavation']
    : ['River Name', 'Contiguous Cluster No', 'Cluster No', 'Number of leases', 'Location', 'Distance', 'Village', 'Area', 'Total Mineral Excavation'];
  const headerIndex = findHeaderIndexAnx6(cleanRows, required);
  if (headerIndex < 0) throw new Error('Missing columns. Please use the Annexure-6 template columns.');
  const header = cleanRows[headerIndex];
  const dataRows = cleanRows.slice(headerIndex + 1).filter(row => row.some(cell => String(cell ?? '').trim() !== ''));
  if (!dataRows.length) throw new Error('Empty rows. No data found after the header.');
  const mapped = dataRows.map((row, index) => mapAnx6Row(row, header, sectionType, index + 2)).filter(Boolean);
  if (!mapped.length) throw new Error('No valid rows found.');
  if (sectionType === 'cluster') {
    anx6ClusterData = mergeAnx6UploadByRole(anx6ClusterData, mapped, 'anx6-final-clusters', ['river', 'cluster', 'lease', 'location', 'village', 'area', 'excavation', 'mineral']);
    renderAnx6Clusters();
  } else {
    anx6ContiguousData = mergeAnx6UploadByRole(anx6ContiguousData, mapped, 'anx6-contiguous-clusters', ['river', 'contiguous', 'cluster', 'leases', 'location', 'distance', 'village', 'area', 'mineral']);
    renderAnx6Contiguous();
  }
  toast(`Uploaded ${mapped.length} Annexure VI ${sectionType === 'cluster' ? 'cluster' : 'contiguous cluster'} row(s).`, 'success');
}
window.processExcelDataAnx6 = processExcelDataAnx6;
function mergeAnx6UploadByRole(existingRows, uploadedRows, tableId, columnKeys) {
  const table = document.getElementById(tableId);
  const editableColumns = typeof getEditableColumnsForTable === 'function' ? getEditableColumnsForTable(table) : null;
  if (editableColumns === null) return uploadedRows;
  const allowed = Array.isArray(editableColumns) ? editableColumns : [];
  let protectedCells = 0;
  const merged = uploadedRows.map((incoming, rowIndex) => {
    const current = existingRows[rowIndex] || {};
    const out = { ...current };
    columnKeys.forEach((key, idx) => {
      if (allowed.includes(idx + 1)) out[key] = incoming[key];
      else {
        if (!(key in out)) out[key] = 'LOCKED';
        protectedCells += 1;
      }
    });
    return out;
  });
  if (existingRows.length > uploadedRows.length) {
    merged.push(...existingRows.slice(uploadedRows.length));
  }
  if (protectedCells && typeof toast === 'function') {
    toast(`${protectedCells} locked cell(s) were protected during Excel sync.`, 'info');
  }
  return merged;
}
function columnValueAnx6(row, header, aliases) {
  const normalizedHeaders = header.map(normalizeHeaderAnx6);
  for (const alias of aliases) {
    const key = normalizeHeaderAnx6(alias);
    const idx = normalizedHeaders.findIndex(h => h === key || h.includes(key) || key.includes(h));
    if (idx >= 0) return row[idx];
  }
  return '';
}
function mapAnx6Row(row, header, sectionType, rowNumber) {
  if (sectionType === 'cluster') {
    const mapped = {
      river: defaultNAAnx6(columnValueAnx6(row, header, ['River Name'])),
      cluster: defaultNAAnx6(columnValueAnx6(row, header, ['Cluster No.', 'Cluster No'])),
      lease: defaultNAAnx6(columnValueAnx6(row, header, ['Lease No'])),
      location: String(columnValueAnx6(row, header, ['Location (Riverbed/Patta Land)', 'Location']) || 'Riverbed').trim(),
      village: defaultNAAnx6(columnValueAnx6(row, header, ['Village'])),
      area: defaultNAAnx6(columnValueAnx6(row, header, ['Area (in Ha.)', 'Area'])),
      excavation: defaultNAAnx6(columnValueAnx6(row, header, ['Total Excavation (MT)', 'Total Excavation'])),
      mineral: defaultNAAnx6(columnValueAnx6(row, header, ['Total Mineral Excavation (MT)', 'Total Mineral Excavation']))
    };
    validateMappedAnx6Row(mapped, sectionType, rowNumber);
    if (mapped.mineral === 'NA' && mapped.excavation !== 'NA') mapped.mineral = toNumberAnx6(mapped.excavation) * 0.6;
    return mapped;
  }
  const mapped = {
    river: defaultNAAnx6(columnValueAnx6(row, header, ['River Name'])),
    contiguous: defaultNAAnx6(columnValueAnx6(row, header, ['Contiguous Cluster No.', 'Contiguous Cluster No'])),
    cluster: defaultNAAnx6(columnValueAnx6(row, header, ['Cluster No'])),
    leases: defaultNAAnx6(columnValueAnx6(row, header, ['Number of leases in the cluster', 'Number of leases'])),
    location: String(columnValueAnx6(row, header, ['Location (Riverbed / Patta Land)', 'Location']) || 'Riverbed').trim(),
    distance: defaultNAAnx6(columnValueAnx6(row, header, ['Distance between clusters', 'Distance'])),
    village: defaultNAAnx6(columnValueAnx6(row, header, ['Village'])),
    area: defaultNAAnx6(columnValueAnx6(row, header, ['Area Of Cluster (Ha)', 'Area'])),
    mineral: defaultNAAnx6(columnValueAnx6(row, header, ['Total Mineral Excavation (MT)', 'Total Mineral Excavation']))
  };
  validateMappedAnx6Row(mapped, sectionType, rowNumber);
  return mapped;
}
window.mapAnx6Row = mapAnx6Row;
function validateMappedAnx6Row(row, sectionType, rowNumber) {
  const required = sectionType === 'cluster'
    ? ['river', 'cluster', 'lease', 'location', 'village']
    : ['river', 'contiguous', 'cluster', 'leases', 'location', 'distance', 'village'];
  const missing = required.filter(key => !String(row[key] ?? '').trim());
  if (missing.length) throw new Error(`Required field missing in row ${rowNumber}: ${missing.join(', ')}.`);
  const numeric = sectionType === 'cluster' ? ['area', 'excavation'] : ['area', 'mineral'];
  const invalid = numeric.filter(key => String(row[key]).trim().toUpperCase() !== 'NA' && (!Number.isFinite(toNumberAnx6(row[key])) || toNumberAnx6(row[key]) < 0));
  if (invalid.length) throw new Error(`Invalid values in row ${rowNumber}: ${invalid.join(', ')} must be valid numbers.`);
}
function extractTableDataAnx6(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return { headers: [], rows: [], foot: [] };
  const headers = Array.from(table.querySelectorAll('thead th'))
    .filter(th => !th.classList.contains('no-print'))
    .map(th => th.innerText.trim().replace(/\n/g, ' '));
  const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
    return Array.from(tr.querySelectorAll('td'))
      .filter(td => !td.classList.contains('no-print'))
      .map(getCellTextAnx6);
  });
  const foot = Array.from(table.querySelectorAll('tfoot tr')).map(tr => {
    const out = [];
    Array.from(tr.querySelectorAll('td')).forEach(td => {
      if (td.classList.contains('no-print')) return;
      const span = parseInt(td.getAttribute('colspan') || '1', 10);
      out.push(td.innerText.trim());
      for (let i = 1; i < span; i++) out.push('');
    });
    return out.slice(0, headers.length);
  });
  return { headers, rows, foot };
}
function exportAnx6PDF(btn, isLivePreview = false) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const district = S.activeProject ? S.activeProject.district || 'Jalandhar' : 'Jalandhar';
  const districtUpper = district.toUpperCase();
  let startY = 80;
  const drawHeaderFooter = (data) => {
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Page " + data.pageNumber, pageWidth / 2, pageHeight - 20, { align: 'center' });
  };
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Annexure-VI', pageWidth - 55, 60, { align: 'right' });
  const clusterTitle = document.querySelector('#view-anx6 .anx-section:nth-of-type(1) .editable-title')?.innerText.trim() || 'Final Cluster & Contiguous Cluster details Clusters:';
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.text('> ' + clusterTitle, 60, startY);
  startY += 35;
  const cluster = extractTableDataAnx6('anx6-final-clusters');
  doc.autoTable({
    startY,
    head: [cluster.headers],
    body: cluster.rows,
    foot: cluster.foot,
    theme: 'grid',
    margin: { left: 55, right: 40, bottom: 70 },
    styles: { font: 'times', fontSize: 6.7, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 2, valign: 'middle', halign: 'center', overflow: 'linebreak' },
    headStyles: { fillColor: false, fontStyle: 'bold', textColor: 0, halign: 'center' },
    footStyles: { fillColor: false, fontStyle: 'bold', textColor: 0, halign: 'center' },
    columnStyles: { 2: { cellWidth: 92 }, 4: { cellWidth: 68 }, 7: { cellWidth: 86 } },
    didDrawPage: drawHeaderFooter
  });
  startY = doc.lastAutoTable.finalY + 28;
  if (startY > pageHeight - 170) {
    doc.addPage();
    startY = 80;
  }
  const contiguousTitle = document.querySelector('#view-anx6 .anx-section:nth-of-type(2) .editable-title')?.innerText.trim() || 'Final Contiguous Clusters:';
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.text(contiguousTitle, 60, startY);
  startY += 18;
  const contiguous = extractTableDataAnx6('anx6-contiguous-clusters');
  doc.autoTable({
    startY,
    head: [contiguous.headers],
    body: contiguous.rows,
    foot: contiguous.foot,
    theme: 'grid',
    margin: { left: 55, right: 40, bottom: 70 },
    styles: { font: 'times', fontSize: 7, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 2, valign: 'middle', halign: 'center', overflow: 'linebreak' },
    headStyles: { fillColor: false, fontStyle: 'bold', textColor: 0, halign: 'center' },
    footStyles: { fillColor: false, fontStyle: 'bold', textColor: 0, halign: 'center' },
    columnStyles: { 1: { cellWidth: 58 }, 3: { cellWidth: 62 }, 6: { cellWidth: 76 }, 8: { cellWidth: 88 } },
    didDrawPage: drawHeaderFooter
  });
  if (isLivePreview) {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx6') : document.getElementById('pdf-iframe-anx6'));
    if (iframe) iframe.src = blobUrl;
  } else {
    doc.save('Annexure_VI_Final_Cluster_Details.pdf');
    toast('PDF downloaded successfully!', 'success');
  }
}
window.exportAnx6PDF = exportAnx6PDF;
function renderPdfUploadUIAnx6() {
  const els = {
    name: document.getElementById('anx6-uploaded-filename'),
    dl: document.getElementById('anx6-download-btn'),
    del: document.getElementById('anx6-delete-btn'),
    prev: document.getElementById('anx6-preview-btn'),
    sec: document.getElementById('pdf-preview-section-anx6'),
    iframe: (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx6') : document.getElementById('pdf-iframe-anx6'))
  };
  if (!els.name || !els.dl) return;
  if (!S.activeProject || !S.activeProject.anx6PdfName) {
    els.name.style.display = 'none';
    els.dl.style.display = 'none';
    if (els.del) els.del.style.display = 'none';
    if (els.prev) els.prev.style.display = 'none';
    if (els.sec) { els.sec.style.display = 'none'; if (els.iframe) els.iframe.src = 'about:blank'; }
    return;
  }
  els.name.textContent = S.activeProject.anx6PdfName;
  els.name.style.display = 'inline-block';
  els.dl.style.display = 'inline-flex';
  if (els.del) els.del.style.display = 'inline-flex';
  if (els.prev) els.prev.style.display = 'inline-flex';
  if (els.sec && els.sec.style.display === 'block' && els.iframe && S.activeProject?.pdfData?.anx6) {
    els.iframe.src = S.activeProject.pdfData.anx6;
  }
  if (window.initLucide) window.initLucide();
}
window.renderPdfUploadUIAnx6 = renderPdfUploadUIAnx6;
function togglePDFPreviewAnx6() {
  const sec = document.getElementById('pdf-preview-section-anx6');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx6') : document.getElementById('pdf-iframe-anx6'));
  if (!sec || !iframe) return;
  if (sec.style.display === 'block') {
    sec.style.display = 'none';
    if (iframe.src.startsWith('blob:')) URL.revokeObjectURL(iframe.src);
    iframe.src = 'about:blank';
  } else if (S.activeProject?.pdfData?.anx6) {
    iframe.src = S.activeProject.pdfData.anx6;
    sec.style.display = 'block';
  } else {
    toast('No PDF preview available. Please re-upload.', 'warn');
  }
}
window.togglePDFPreviewAnx6 = togglePDFPreviewAnx6;
function closePDFPreviewAnx6() {
  const sec = document.getElementById('pdf-preview-section-anx6');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx6') : document.getElementById('pdf-iframe-anx6'));
  if (sec) sec.style.display = 'none';
  if (iframe) { if (iframe.src.startsWith('blob:')) URL.revokeObjectURL(iframe.src); iframe.src = 'about:blank'; }
}
window.closePDFPreviewAnx6 = closePDFPreviewAnx6;
function downloadPdfAnx6() {
  if (!S.activeProject?.anx6PdfName) { toast('No PDF uploaded yet.', 'warn'); return; }
  if (window.downloadStoredPdf) {
    downloadStoredPdf('anx6', S.activeProject.anx6PdfName, S.activeProject.pdfData?.anx6);
    return;
  }
  const a = document.createElement('a');
  a.href = S.activeProject.pdfData?.anx6 || '';
  a.download = S.activeProject.anx6PdfName;
  a.style.display = 'none';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
window.downloadPdfAnx6 = downloadPdfAnx6;
function deletePdfAnx6() {
  if (!S.activeProject || !confirm('Delete the uploaded PDF?')) return;
  closePDFPreviewAnx6();
  S.activeProject.anx6PdfName = null;
  if (S.activeProject.pdfData) S.activeProject.pdfData.anx6 = null;
  const pi = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pi >= 0) { S.projects[pi].anx6PdfName = null; if (S.projects[pi].pdfData) S.projects[pi].pdfData.anx6 = null; }
  renderPdfUploadUIAnx6();
  if (window.debouncedSaveState) window.debouncedSaveState();
  toast('PDF deleted.', 'success');
}
window.deletePdfAnx6 = deletePdfAnx6;
function handlePDFUploadAnx6(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) { toast('Only PDF files allowed.', 'error'); event.target.value = ''; return; }
  if (!S.activeProject) { toast('Select a project first.', 'warn'); event.target.value = ''; return; }
  const fileURL = URL.createObjectURL(file);
  S.activeProject.anx6PdfName = file.name;
  if (!S.activeProject.pdfData) S.activeProject.pdfData = {};
  S.activeProject.pdfData.anx6 = fileURL;
  if (window.storeProjectPdf) {
    window.storeProjectPdf('anx6', file).catch(err => console.error('Backend PDF upload failed:', err));
  }
  const pi = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pi >= 0) { S.projects[pi].anx6PdfName = file.name; if (!S.projects[pi].pdfData) S.projects[pi].pdfData = {}; S.projects[pi].pdfData.anx6 = fileURL; }
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx6') : document.getElementById('pdf-iframe-anx6'));
  const sec = document.getElementById('pdf-preview-section-anx6');
  if (iframe && sec) { iframe.src = fileURL; sec.style.display = 'block'; }
  renderPdfUploadUIAnx6();
  if (window.debouncedSaveState) window.debouncedSaveState();
  toast('PDF uploaded and preview loaded!', 'success');
  event.target.value = '';
}
window.handlePDFUploadAnx6 = handlePDFUploadAnx6;
var ANX6_STORAGE_PREFIX = 'anx6_heading_';
function saveAnx6Heading(el) {
  var key = el.getAttribute('data-key');
  if (!key) return;
  try { localStorage.setItem(ANX6_STORAGE_PREFIX + key, el.innerText.trim()); } catch (e) {}
}
window.saveAnx6Heading = saveAnx6Heading;
function loadAnx6Headings() {
  document.querySelectorAll('#view-anx6 .editable-title[data-key]').forEach(function (el) {
    var key = el.getAttribute('data-key');
    var saved = null;
    try { saved = localStorage.getItem(ANX6_STORAGE_PREFIX + key); } catch (e) {}
    if (saved) el.innerText = saved;
  });
}
window.loadAnx6Headings = loadAnx6Headings;
window.addEventListener('DOMContentLoaded', () => {
  renderAnx6();
  loadAnx6Headings();
  setTimeout(initLucide, 50);
});
document.addEventListener('input', (e) => {
  if (e.target.closest('#view-anx6 table')) {
    if (window.anx6DebounceTimer) clearTimeout(window.anx6DebounceTimer);
    window.anx6DebounceTimer = setTimeout(() => {
       exportAnx6PDF(null, true);
    }, 1500); // 1.5 seconds after typing stops
  }
});
document.addEventListener('change', (e) => {
  if (e.target.closest('#view-anx6 table')) {
    if (window.anx6DebounceTimer) clearTimeout(window.anx6DebounceTimer);
    window.anx6DebounceTimer = setTimeout(() => {
      exportAnx6PDF(null, true);
    }, 300);
  }
});
