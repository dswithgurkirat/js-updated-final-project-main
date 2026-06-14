/* ANNEXURE VII - TRANSPORTATION ROUTES */
window.S = window.S || { activeProject: { id: 'demo_proj', anx7PdfName: null }, projects: [] };
window.toast = window.toast || function (msg, type) { alert('[' + (type || 'INFO').toUpperCase() + '] ' + msg); };
window.initLucide = window.initLucide || function () { if (window.lucide) lucide.createIcons(); };
const ANX7_ROUTE_HEADERS = [
  'Sl.No',
  'Lease No.',
  'Transportation Route No.',
  'Number of Tippers/day of lease',
  'Number of tippers/day of all leases on route',
  'Length of Route (Km)',
  'Type of Road (Black Topped/Unpaved)',
  'Recommendation for road (Black Topped/Unpaved)',
  'The road will be constructed by Govt./Lease Owner',
  'Route Map & Location'
];
const ANX7_CLUSTER_HEADERS = [
  'Cluster No',
  'Transportation Route No',
  'Number of tippers/day of cluster',
  'Number of tippers/day of all clusters on route',
  'Length of Route in KM',
  'Type of Road (Black Topped/Unpaved)',
  'Recommendation for road (Black Topped/Unpaved)',
  'The road will be constructed by Govt/Lease Owner',
  'Route Map & Location'
];
const ANX7_ROAD_OPTIONS = ['NA', 'Unpaved', 'Black Topped', 'Metalled', 'WBM', 'Other'];
const ANX7_CONSTRUCTOR_OPTIONS = ['NA', 'Lease Owner', 'Govt', 'Govt./Lease Owner'];
const ANX7_DEFAULT_ROUTES = [
  ['NPRO_JL_PL_ST_43', "EE - EE' &\nFF - FF'", 192, 192, '1.27 &\n1.2', 'Unpaved', 'Unpaved', 'Lease Owner', 'Route Map\nattached'],
  ['NPRO_JL_PL_ST_44', 'GG - GG', 15, 15, '', 'Unpaved', 'Unpaved', 'Lease Owner', 'Route Map\nattached'],
  ['NPRO_JL_PL_ST_45', '', 14, 14, '1.21', 'Unpaved', 'Unpaved', 'Lease Owner', 'Route Map\nattached']
];
const ANX7_DEFAULT_CLUSTERS = [
  ['Jalandhar Sutlej 1,2', "A-A', B-B'", 358, 'NA', 0.73, 'Unpaved', 'Unpaved', 'Lease Owner', 'Route Map\nattached'],
  ['Jalandhar Sutlej 3,4,5,6', "C-C' TO F-\nF'", 343, 'NA', 2.1, 'Unpaved', 'Unpaved', 'Lease Owner', 'Route Map\nattached']
];
function escapeHtmlAnx7(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function makeSelectAnx7(options, selected) {
  return `<select>${options.map(option => `<option${option === selected ? ' selected' : ''}>${escapeHtmlAnx7(option)}</option>`).join('')}</select>`;
}
function cleanTextAnx7(value, fallback = 'NA') {
  const text = String(value === undefined || value === null ? '' : value).trim();
  return text || fallback;
}
function fillNAAnx7(el) {
  if (el && String(el.innerText || '').trim() === '') el.innerText = 'NA';
}
window.fillNAAnx7 = fillNAAnx7;
function getCellTextAnx7(td) {
  const select = td.querySelector('select');
  return cleanTextAnx7(select ? select.value : td.innerText);
}
function renderRouteRowAnx7(data) {
  const row = data.length === 10 ? data : ['', ...data];
  const [sl, lease, route, tipLease, tipAll, length, roadType, recommendation, constructedBy, map] = row;
  return `<tr>
    <td contenteditable="true" onblur="fillNAAnx7(this)">${escapeHtmlAnx7(cleanTextAnx7(sl))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)" style="text-align:left;white-space:pre-wrap">${escapeHtmlAnx7(cleanTextAnx7(lease))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)">${escapeHtmlAnx7(cleanTextAnx7(route))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)">${escapeHtmlAnx7(cleanTextAnx7(tipLease))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)">${escapeHtmlAnx7(cleanTextAnx7(tipAll))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)">${escapeHtmlAnx7(cleanTextAnx7(length))}</td>
    <td>${makeSelectAnx7(ANX7_ROAD_OPTIONS, cleanTextAnx7(roadType))}</td>
    <td>${makeSelectAnx7(ANX7_ROAD_OPTIONS, cleanTextAnx7(recommendation))}</td>
    <td>${makeSelectAnx7(ANX7_CONSTRUCTOR_OPTIONS, cleanTextAnx7(constructedBy))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)" style="white-space:pre-wrap">${escapeHtmlAnx7(cleanTextAnx7(map))}</td>
    <td class="no-print">
      <button class="btn btn-xs btn-danger" onclick="deleteRowAnx7(this)" style="display:inline-flex; align-items:center; justify-content:center; padding:4px;">
        <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
      </button>
    </td>
  </tr>`;
}
function renderClusterRowAnx7(data) {
  const [cluster, route, tipCluster, tipAll, length, roadType, recommendation, constructedBy, map] = data;
  return `<tr>
    <td contenteditable="true" onblur="fillNAAnx7(this)" style="text-align:left;white-space:pre-wrap">${escapeHtmlAnx7(cleanTextAnx7(cluster))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)">${escapeHtmlAnx7(cleanTextAnx7(route))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)">${escapeHtmlAnx7(cleanTextAnx7(tipCluster))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)">${escapeHtmlAnx7(cleanTextAnx7(tipAll))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)">${escapeHtmlAnx7(cleanTextAnx7(length))}</td>
    <td>${makeSelectAnx7(ANX7_ROAD_OPTIONS, cleanTextAnx7(roadType))}</td>
    <td>${makeSelectAnx7(ANX7_ROAD_OPTIONS, cleanTextAnx7(recommendation))}</td>
    <td>${makeSelectAnx7(ANX7_CONSTRUCTOR_OPTIONS, cleanTextAnx7(constructedBy))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)" style="white-space:pre-wrap">${escapeHtmlAnx7(cleanTextAnx7(map))}</td>
    <td class="no-print">
      <button class="btn btn-xs btn-danger" onclick="deleteRowAnx7(this)" style="display:inline-flex; align-items:center; justify-content:center; padding:4px;">
        <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
      </button>
    </td>
  </tr>`;
}
function deleteRowAnx7(btn) {
  const tbody = btn.closest('tbody');
  if (tbody && tbody.rows.length <= 1) {
    toast('At least one row is required.', 'warn');
    return;
  }
  btn.closest('tr').remove();
  renumberRouteRowsAnx7(tbody);
}
window.deleteRowAnx7 = deleteRowAnx7;
function renumberRouteRowsAnx7(tbody) {
  if (!tbody || !tbody.classList.contains('anx7-route-table-body')) return;
  Array.from(tbody.rows).forEach((tr, index) => {
    if (tr.cells[0]) tr.cells[0].innerText = String(index + 1);
  });
}
function addRouteRowAnx7(btn) {
  const card = btn ? btn.closest('.card') : document.querySelector('#anx7-individual-routes-container .table-block-card');
  const tbody = card?.querySelector('.anx7-route-table-body');
  if (!tbody) return;
  const next = tbody.rows.length + 1;
  tbody.insertAdjacentHTML('beforeend', renderRouteRowAnx7([next, 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA']));
  markCardStateAnx7(card, 'edited');
  if (window.initLucide) window.initLucide();
}
window.addRouteRowAnx7 = addRouteRowAnx7;
function addClusterRowAnx7(btn) {
  const card = btn ? btn.closest('.card') : document.querySelector('#anx7-cluster-routes-container .table-block-card');
  const tbody = card?.querySelector('.anx7-cluster-table-body');
  if (!tbody) return;
  tbody.insertAdjacentHTML('beforeend', renderClusterRowAnx7(['NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA']));
  markCardStateAnx7(card, 'edited');
  if (window.initLucide) window.initLucide();
}
window.addClusterRowAnx7 = addClusterRowAnx7;
function markCardStateAnx7(card, state) {
  if (!card) return;
  card.dataset.validationState = state || 'edited';
  card.dataset.exportState = 'dirty';
}
function addRouteTableBlockAnx7(prefill = false, rows = null, title = '') {
  const container = document.getElementById('anx7-individual-routes-container');
  if (!container) return null;
  const index = container.querySelectorAll('.table-block-card').length + 1;
  const safeTitle = title || (index === 1 ? 'Individual Lease Routes' : `Individual Lease Routes - Table ${index}`);
  const id = `anx7-routes-${Date.now()}-${index}`;
  container.insertAdjacentHTML('beforeend', `
  <div class="card table-block-card" style="margin-bottom:24px;" data-type="individual" data-validation-state="clean" data-export-state="clean">
    <div class="card-hd" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div class="card-title-group" style="display:flex; align-items:center; gap:8px;">
        <span class="card-title" contenteditable="true" style="font-weight: 600; border-bottom: 1px dashed var(--border-2); outline: none;">${escapeHtmlAnx7(safeTitle)}</span>
        <span class="text-soft" style="font-size:11px;">(Click to edit title)</span>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="btn btn-excel-template btn-xs" onclick="downloadRouteTemplateAnx7(this)" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="file-spreadsheet" style="width:12px; height:12px;"></i>
          <span>Routes Template</span>
        </button>
        <label class="btn btn-excel-upload btn-xs" style="cursor:pointer; margin-bottom:0; display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="upload" style="width:12px; height:12px;"></i>
          <span>Upload Routes</span>
          <input type="file" accept=".xlsx,.xls,.csv" hidden onchange="uploadRoutesAnx7(event, this)">
        </label>
        <button class="btn btn-xs btn-outline" style="display:inline-flex; align-items:center; gap:6px;" onclick="addRouteRowAnx7(this)">
          <i data-lucide="plus" style="width:12px; height:12px;"></i>
          <span>Add Row</span>
        </button>
        <button class="btn btn-xs btn-danger btn-delete-table" onclick="deleteTableBlockAnx7(this)" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
          <span>Delete Table</span>
        </button>
      </div>
    </div>
    <div class="card-bd">
      <div class="tbl-wrap">
        <table class="anx-tbl anx7-routes-table" id="${id}" style="min-width:1100px">
          <thead>
            <tr>
              <th style="width:50px">Sl.No.</th>
              <th style="min-width:160px">Lease No.</th>
              <th style="min-width:90px">Transportation Route No.</th>
              <th style="min-width:80px">Number of Tippers/day<br>(of lease)</th>
              <th style="min-width:80px">Number of tippers/day<br>(of all leases on route)</th>
              <th style="min-width:80px">Length of Route (Km)</th>
              <th style="min-width:100px">Type of Road</th>
              <th style="min-width:110px">Recommendation for road</th>
              <th style="min-width:110px">The road will be constructed by</th>
              <th style="min-width:100px">Route Map &amp; Location</th>
              <th style="width:50px" class="no-print">Action</th>
            </tr>
          </thead>
          <tbody class="anx7-route-table-body"></tbody>
        </table>
      </div>
    </div>
  </div>`);
  const card = container.lastElementChild;
  const tbody = card.querySelector('.anx7-route-table-body');
  const data = rows || (prefill ? ANX7_DEFAULT_ROUTES.map((row, i) => [i + 1, ...row]) : [[1, 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA']]);
  tbody.innerHTML = data.map((row, i) => renderRouteRowAnx7(row.length === 9 ? [i + 1, ...row] : row)).join('');
  renumberTableBlocksAnx7('individual');
  updateDeleteButtonsVisibilityAnx7('individual');
  if (window.initLucide) window.initLucide();
  return card;
}
window.addRouteTableBlockAnx7 = addRouteTableBlockAnx7;
function addClusterTableBlockAnx7(prefill = false, rows = null, title = '') {
  const container = document.getElementById('anx7-cluster-routes-container');
  if (!container) return null;
  const index = container.querySelectorAll('.table-block-card').length + 1;
  const safeTitle = title || (index === 1 ? 'Cluster Transportation Routes' : `Cluster Transportation Routes - Table ${index}`);
  const id = `anx7-cluster-routes-${Date.now()}-${index}`;
  container.insertAdjacentHTML('beforeend', `
  <div class="card table-block-card" style="margin-bottom:24px;" data-type="cluster" data-validation-state="clean" data-export-state="clean">
    <div class="card-hd" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div class="card-title-group" style="display:flex; align-items:center; gap:8px;">
        <span class="card-title" contenteditable="true" style="font-weight: 600; border-bottom: 1px dashed var(--border-2); outline: none;">${escapeHtmlAnx7(safeTitle)}</span>
        <span class="text-soft" style="font-size:11px;">(Click to edit title)</span>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="btn btn-excel-template btn-xs" onclick="downloadClusterTemplateAnx7(this)" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="file-spreadsheet" style="width:12px; height:12px;"></i>
          <span>Cluster Template</span>
        </button>
        <label class="btn btn-excel-upload btn-xs" style="cursor:pointer; margin-bottom:0; display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="upload" style="width:12px; height:12px;"></i>
          <span>Upload Cluster</span>
          <input type="file" accept=".xlsx,.xls,.csv" hidden onchange="uploadClustersAnx7(event, this)">
        </label>
        <button class="btn btn-xs btn-outline" style="display:inline-flex; align-items:center; gap:6px;" onclick="addClusterRowAnx7(this)">
          <i data-lucide="plus" style="width:12px; height:12px;"></i>
          <span>Add Row</span>
        </button>
        <button class="btn btn-xs btn-danger btn-delete-table" onclick="deleteTableBlockAnx7(this)" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
          <span>Delete Table</span>
        </button>
      </div>
    </div>
    <div class="card-bd">
      <div class="tbl-wrap">
        <table class="anx-tbl anx7-cluster-routes-table" id="${id}" style="min-width:1000px">
          <thead>
            <tr>
              <th style="min-width:130px">Cluster No</th>
              <th style="min-width:90px">Transportation Route No</th>
              <th style="min-width:80px">Number of tippers/day<br>(of cluster)</th>
              <th style="min-width:80px">Number of tippers/day<br>(of all clusters on route)</th>
              <th style="min-width:80px">Length of Route in KM</th>
              <th style="min-width:100px">Type of Road</th>
              <th style="min-width:110px">Recommendation for road</th>
              <th style="min-width:110px">The road will be constructed by</th>
              <th style="min-width:100px">Route Map &amp; Location</th>
              <th style="width:50px" class="no-print">Action</th>
            </tr>
          </thead>
          <tbody class="anx7-cluster-table-body"></tbody>
        </table>
      </div>
    </div>
  </div>`);
  const card = container.lastElementChild;
  const tbody = card.querySelector('.anx7-cluster-table-body');
  const data = rows || (prefill ? ANX7_DEFAULT_CLUSTERS : [['NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA']]);
  tbody.innerHTML = data.map(renderClusterRowAnx7).join('');
  renumberTableBlocksAnx7('cluster');
  updateDeleteButtonsVisibilityAnx7('cluster');
  if (window.initLucide) window.initLucide();
  return card;
}
window.addClusterTableBlockAnx7 = addClusterTableBlockAnx7;
function containerForAnx7(type) {
  return document.getElementById(type === 'individual' ? 'anx7-individual-routes-container' : 'anx7-cluster-routes-container');
}
function renumberTableBlocksAnx7(type) {
  const container = containerForAnx7(type);
  if (!container) return;
  Array.from(container.querySelectorAll('.table-block-card')).forEach((card, index) => {
    const titleEl = card.querySelector('.card-title');
    const base = type === 'individual' ? 'Individual Lease Routes' : 'Cluster Transportation Routes';
    if (titleEl && /^(Individual Lease Routes|Cluster Transportation Routes)( - Table \d+)?$/.test(titleEl.innerText.trim())) {
      titleEl.innerText = index === 0 ? base : `${base} - Table ${index + 1}`;
    }
  });
}
function updateDeleteButtonsVisibilityAnx7(type) {
  const container = containerForAnx7(type);
  if (!container) return;
  const cards = container.querySelectorAll('.table-block-card');
  cards.forEach(card => {
    const btn = card.querySelector('.btn-delete-table');
    if (btn) btn.style.display = cards.length <= 1 ? 'none' : 'inline-flex';
  });
}
function deleteTableBlockAnx7(btn) {
  const card = btn.closest('.card');
  const type = card.getAttribute('data-type');
  const container = card.parentElement;
  if (container.querySelectorAll('.table-block-card').length <= 1) {
    toast('You cannot delete the last remaining table.', 'warn');
    return;
  }
  if (confirm('Are you sure you want to delete this entire table block?')) {
    card.remove();
    renumberTableBlocksAnx7(type);
    updateDeleteButtonsVisibilityAnx7(type);
    toast('Table block deleted.', 'success');
  }
}
window.deleteTableBlockAnx7 = deleteTableBlockAnx7;
function rowsFromRouteCardAnx7(card) {
  return Array.from(card.querySelectorAll('.anx7-route-table-body tr')).map(tr => {
    const cells = tr.querySelectorAll('td');
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(index => index >= 6 && index <= 8 ? cells[index].querySelector('select').value : cells[index].innerText.trim());
  });
}
function rowsFromClusterCardAnx7(card) {
  return Array.from(card.querySelectorAll('.anx7-cluster-table-body tr')).map(tr => {
    const cells = tr.querySelectorAll('td');
    return [0, 1, 2, 3, 4, 5, 6, 7, 8].map(index => index >= 5 && index <= 7 ? cells[index].querySelector('select').value : cells[index].innerText.trim());
  });
}
function downloadTemplateAnx7(headers, rows, sheetName, filename) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = headers.map(h => ({ wch: Math.min(Math.max(String(h).length + 4, 12), 30) }));
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}
function downloadRouteTemplateAnx7(btn) {
  const card = btn.closest('.card');
  const title = card.querySelector('.card-title').innerText.trim().replace(/[^a-z0-9]+/gi, '_');
  downloadTemplateAnx7(ANX7_ROUTE_HEADERS, rowsFromRouteCardAnx7(card), 'Transportation_Routes', `${title}_Template.xlsx`);
  toast('Routes Excel downloaded', 'success');
}
window.downloadRouteTemplateAnx7 = downloadRouteTemplateAnx7;
function downloadClusterTemplateAnx7(btn) {
  const card = btn.closest('.card');
  const title = card.querySelector('.card-title').innerText.trim().replace(/[^a-z0-9]+/gi, '_');
  downloadTemplateAnx7(ANX7_CLUSTER_HEADERS, rowsFromClusterCardAnx7(card), 'Cluster_Routes', `${title}_Template.xlsx`);
  toast('Cluster Excel downloaded', 'success');
}
window.downloadClusterTemplateAnx7 = downloadClusterTemplateAnx7;
function validateFileAnx7(file) {
  if (!file) return 'Missing file.';
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return 'Wrong file type. Please upload .xlsx, .xls, or .csv.';
  return '';
}
function parseWorkbookRowsAnx7(file, callback) {
  const fileError = validateFileAnx7(file);
  if (fileError) throw new Error(fileError);
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheets = workbook.SheetNames.map(name => ({
        name,
        rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' })
      }));
      callback(sheets);
    } catch (error) {
      console.error(error);
      toast('Upload failed: ' + error.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}
function parseRowsAnx7(rows) {
  const cleanRows = rows.filter(row => Array.isArray(row) && row.some(cell => String(cell ?? '').trim() !== ''));
  if (cleanRows.length < 2) throw new Error('No data rows found.');
  return cleanRows.slice(1);
}
function mapRouteRowAnx7(row, index) {
  return [
    row[0] || index + 1,
    cleanTextAnx7(row[1]),
    cleanTextAnx7(row[2]),
    cleanTextAnx7(row[3]),
    cleanTextAnx7(row[4]),
    cleanTextAnx7(row[5]),
    cleanTextAnx7(row[6]),
    cleanTextAnx7(row[7]),
    cleanTextAnx7(row[8]),
    cleanTextAnx7(row[9])
  ];
}
function mapClusterRowAnx7(row) {
  return [
    cleanTextAnx7(row[0]),
    cleanTextAnx7(row[1]),
    cleanTextAnx7(row[2]),
    cleanTextAnx7(row[3]),
    cleanTextAnx7(row[4]),
    cleanTextAnx7(row[5]),
    cleanTextAnx7(row[6]),
    cleanTextAnx7(row[7]),
    cleanTextAnx7(row[8])
  ];
}
function fillRouteCardAnx7(card, dataRows, fileName) {
  const tbody = card.querySelector('.anx7-route-table-body');
  const uploadRows = dataRows.map((row, index) => mapRouteRowAnx7(row, index));
  const table = card.querySelector('table');
  if (typeof rbacApplyExcelRowsToTable === 'function') {
    rbacApplyExcelRowsToTable(table, uploadRows, row => tbody.insertAdjacentHTML('beforeend', renderRouteRowAnx7(row)));
  } else {
    tbody.innerHTML = uploadRows.map(renderRouteRowAnx7).join('');
  }
  renumberRouteRowsAnx7(tbody);
  card.dataset.uploadedExcel = fileName || '';
  card.dataset.validationState = 'valid';
  card.dataset.exportState = 'dirty';
}
function fillClusterCardAnx7(card, dataRows, fileName) {
  const tbody = card.querySelector('.anx7-cluster-table-body');
  const uploadRows = dataRows.map(row => mapClusterRowAnx7(row));
  const table = card.querySelector('table');
  if (typeof rbacApplyExcelRowsToTable === 'function') {
    rbacApplyExcelRowsToTable(table, uploadRows, row => tbody.insertAdjacentHTML('beforeend', renderClusterRowAnx7(row)));
  } else {
    tbody.innerHTML = uploadRows.map(renderClusterRowAnx7).join('');
  }
  card.dataset.uploadedExcel = fileName || '';
  card.dataset.validationState = 'valid';
  card.dataset.exportState = 'dirty';
}
function uploadRoutesAnx7(event, input) {
  const file = event.target.files[0];
  if (!file) return;
  const currentCard = input.closest('.card');
  try {
    parseWorkbookRowsAnx7(file, sheets => {
      const routeSheets = sheets.filter(sheet => !/cluster/i.test(sheet.name));
      const sourceSheets = routeSheets.length ? routeSheets : [sheets[0]];
      let loaded = 0;
      sourceSheets.forEach(sheet => {
        const dataRows = parseRowsAnx7(sheet.rows);
        const card = loaded === 0 && currentCard ? currentCard : addRouteTableBlockAnx7(false, [], `Individual Lease Routes - Table ${document.querySelectorAll('#anx7-individual-routes-container .table-block-card').length + 1}`);
        fillRouteCardAnx7(card, dataRows, file.name);
        loaded += dataRows.length;
      });
      renumberTableBlocksAnx7('individual');
      updateDeleteButtonsVisibilityAnx7('individual');
      if (window.initLucide) window.initLucide();
      toast(`Loaded ${loaded} route row(s).`, 'success');
    });
  } catch (error) {
    toast(error.message, 'error');
  }
  event.target.value = '';
}
window.uploadRoutesAnx7 = uploadRoutesAnx7;
function uploadClustersAnx7(event, input) {
  const file = event.target.files[0];
  if (!file) return;
  const currentCard = input.closest('.card');
  try {
    parseWorkbookRowsAnx7(file, sheets => {
      const clusterSheets = sheets.filter(sheet => /cluster/i.test(sheet.name));
      const sourceSheets = clusterSheets.length ? clusterSheets : [sheets[0]];
      let loaded = 0;
      sourceSheets.forEach(sheet => {
        const dataRows = parseRowsAnx7(sheet.rows);
        const card = loaded === 0 && currentCard ? currentCard : addClusterTableBlockAnx7(false, [], `Cluster Transportation Routes - Table ${document.querySelectorAll('#anx7-cluster-routes-container .table-block-card').length + 1}`);
        fillClusterCardAnx7(card, dataRows, file.name);
        loaded += dataRows.length;
      });
      renumberTableBlocksAnx7('cluster');
      updateDeleteButtonsVisibilityAnx7('cluster');
      if (window.initLucide) window.initLucide();
      toast(`Loaded ${loaded} cluster route row(s).`, 'success');
    });
  } catch (error) {
    toast(error.message, 'error');
  }
  event.target.value = '';
}
window.uploadClustersAnx7 = uploadClustersAnx7;
function handleTableUploadAnx7(file, type) {
  const card = type === 'cluster'
    ? document.querySelector('#anx7-cluster-routes-container .table-block-card')
    : document.querySelector('#anx7-individual-routes-container .table-block-card');
  const fakeEvent = { target: { files: [file], value: '' } };
  if (type === 'cluster') uploadClustersAnx7(fakeEvent, card?.querySelector('input[type="file"]') || card);
  else uploadRoutesAnx7(fakeEvent, card?.querySelector('input[type="file"]') || card);
}
window.handleTableUploadAnx7 = handleTableUploadAnx7;
function getTableDataAnx7(card, type) {
  const selector = type === 'individual' ? '.anx7-route-table-body tr' : '.anx7-cluster-table-body tr';
  return Array.from(card.querySelectorAll(selector)).map(tr => {
    return Array.from(tr.querySelectorAll('td'))
      .filter(td => !td.classList.contains('no-print'))
      .map(getCellTextAnx7);
  });
}
function drawAnx7Furniture(doc, pageNum) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Page " + pageNum, pageW / 2, pageH - 20, { align: 'center' });
}
function exportAnx7PDF(btn, isLivePreview = false) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const drawn = new Set();
  const drawOnce = data => {
    const realPage = doc.internal.getCurrentPageInfo().pageNumber;
    if (drawn.has(realPage)) return;
    drawn.add(realPage);
    drawAnx7Furniture(doc, realPage);
  };
  let currentY = margin + 20;
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Annexure-VII', pageW - margin - 15, currentY, { align: 'right' });
  currentY += 8;
  doc.setFontSize(10);
  doc.text('>  Transportation Routes for individual leases and leases in Cluster:', margin + 8, currentY);
  currentY += 8;
  document.querySelectorAll('#anx7-individual-routes-container .table-block-card').forEach((card, index) => {
    if (currentY + 50 > pageH - 25) { doc.addPage(); currentY = margin + 20; }
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text(`Table ${index + 1}: ${card.querySelector('.card-title').innerText.trim()}`, margin + 8, currentY);
    currentY += 5;
    doc.autoTable({
      head: [[
        'Lease No.',
        'Transport\nation\nRoute No.',
        'Num\nber\nof\nTipp\ners\n/days\nof\nlease',
        'Numbe\nr of\ntippers\n/days of\nall the\nlease on\nroute',
        'Length\nof the\nRoute\nin Km',
        'Type of\nRoad\n(Black\nTopped/\nunpaved)',
        'Recomme\nndation\nfor road\n(Black\nTopped/\nunpaved)',
        'The road will\nbe constructed\nby Govt./Lease\nOwner',
        'Route Map &\nLocation'
      ]],
      body: getTableDataAnx7(card, 'individual').map(row => row.slice(1)),
      startY: currentY,
      margin: { top: margin + 12, bottom: 25, left: margin + 2, right: margin + 2 },
      theme: 'grid',
      styles: { font: 'times', fontSize: 8.5, cellPadding: 1.2, valign: 'middle', halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.3, textColor: [0, 0, 0], overflow: 'linebreak' },
      headStyles: { fillColor: false, textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
      alternateRowStyles: { fillColor: false },
      tableWidth: 178,
      columnStyles: { 0: { cellWidth: 34 }, 1: { cellWidth: 15 }, 2: { cellWidth: 14 }, 3: { cellWidth: 15 }, 4: { cellWidth: 11 }, 5: { cellWidth: 17 }, 6: { cellWidth: 20 }, 7: { cellWidth: 27 }, 8: { cellWidth: 25 } },
      didDrawPage: drawOnce
    });
    card.dataset.exportState = 'exported';
    currentY = doc.lastAutoTable.finalY + 12;
  });
  const clusterCards = document.querySelectorAll('#anx7-cluster-routes-container .table-block-card');
  if (clusterCards.length) {
    if (currentY + 20 > pageH - 25) { doc.addPage(); currentY = margin + 20; }
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('Cluster:', margin + 18, currentY);
    currentY += 6;
  }
  clusterCards.forEach((card, index) => {
    if (currentY + 50 > pageH - 25) { doc.addPage(); currentY = margin + 20; }
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text(`Cluster Table ${index + 1}: ${card.querySelector('.card-title').innerText.trim()}`, margin + 8, currentY);
    currentY += 5;
    doc.autoTable({
      head: [[
        'Cluster No',
        'Transporta\ntion Route\nNo',
        'Num\nber\nof\ntippe\nrs\n/day\nof\nclust\ner',
        'Numbe\nr of\ntipper\ns/day\nof all\nthe\nclusters\non route',
        'Leng\nth of\nRout\ne in\nKM',
        'Type of\nRoad\n(Black\nTopped/\nunpaved)',
        'Recomm\nendation\nfor road\n(Black\nTopped/\nunpaved)',
        'The road\nwill be\nConstru\ncted by\nGovt/Le\na Se\nOwner',
        'Route Map\n& Locati on'
      ]],
      body: getTableDataAnx7(card, 'cluster'),
      startY: currentY,
      margin: { top: margin + 12, bottom: 25, left: margin + 2, right: margin + 2 },
      theme: 'grid',
      styles: { font: 'times', fontSize: 8.5, cellPadding: 1.2, valign: 'middle', halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.3, textColor: [0, 0, 0], overflow: 'linebreak' },
      headStyles: { fillColor: false, textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
      alternateRowStyles: { fillColor: false },
      tableWidth: 178,
      columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 17 }, 2: { cellWidth: 13 }, 3: { cellWidth: 16 }, 4: { cellWidth: 11 }, 5: { cellWidth: 19 }, 6: { cellWidth: 21 }, 7: { cellWidth: 21 }, 8: { cellWidth: 28 } },
      didDrawPage: drawOnce
    });
    card.dataset.exportState = 'exported';
    currentY = doc.lastAutoTable.finalY + 12;
  });
  if (isLivePreview) {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx7') : document.getElementById('pdf-iframe-anx7'));
    if (iframe) iframe.src = blobUrl;
  } else {
    doc.save('Annexure_VII_Transportation_Routes.pdf');
    toast('PDF downloaded successfully!', 'success');
  }
}
window.exportAnx7PDF = exportAnx7PDF;
function renderPdfUploadUIAnx7() {
  const els = {
    name: document.getElementById('anx7-uploaded-filename'),
    dl: document.getElementById('anx7-download-btn'),
    del: document.getElementById('anx7-delete-btn'),
    prev: document.getElementById('anx7-preview-btn'),
    sec: document.getElementById('pdf-preview-section-anx7'),
    iframe: (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx7') : document.getElementById('pdf-iframe-anx7'))
  };
  if (!els.name || !els.dl) return;
  if (!S.activeProject || !S.activeProject.anx7PdfName) {
    els.name.style.display = 'none';
    els.dl.style.display = 'none';
    if (els.del) els.del.style.display = 'none';
    if (els.prev) els.prev.style.display = 'none';
    if (els.sec) { els.sec.style.display = 'none'; if (els.iframe) els.iframe.src = 'about:blank'; }
    return;
  }
  els.name.textContent = S.activeProject.anx7PdfName;
  els.name.style.display = 'inline-block';
  els.dl.style.display = 'inline-flex';
  if (els.del) els.del.style.display = 'inline-flex';
  if (els.prev) els.prev.style.display = 'inline-flex';
  if (els.sec && els.sec.style.display === 'block' && els.iframe && S.activeProject?.pdfData?.anx7) {
    els.iframe.src = S.activeProject.pdfData.anx7;
  }
  if (window.initLucide) window.initLucide();
}
window.renderPdfUploadUIAnx7 = renderPdfUploadUIAnx7;
function togglePDFPreviewAnx7() {
  const sec = document.getElementById('pdf-preview-section-anx7');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx7') : document.getElementById('pdf-iframe-anx7'));
  if (!sec || !iframe) return;
  if (sec.style.display === 'block') {
    closePDFPreviewAnx7();
  } else if (S.activeProject?.pdfData?.anx7) {
    iframe.src = S.activeProject.pdfData.anx7;
    sec.style.display = 'block';
  } else {
    toast('No PDF preview available. Please re-upload.', 'warn');
  }
}
window.togglePDFPreviewAnx7 = togglePDFPreviewAnx7;
function closePDFPreviewAnx7() {
  const sec = document.getElementById('pdf-preview-section-anx7');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx7') : document.getElementById('pdf-iframe-anx7'));
  if (sec) sec.style.display = 'none';
  if (iframe) {
    if (iframe.src.startsWith('blob:')) URL.revokeObjectURL(iframe.src);
    iframe.src = 'about:blank';
  }
}
window.closePDFPreviewAnx7 = closePDFPreviewAnx7;
function downloadPdfAnx7() {
  if (!S.activeProject?.anx7PdfName) { toast('No PDF uploaded yet.', 'warn'); return; }
  if (window.downloadStoredPdf) {
    downloadStoredPdf('anx7', S.activeProject.anx7PdfName, S.activeProject.pdfData?.anx7);
    return;
  }
  const a = document.createElement('a');
  a.href = S.activeProject.pdfData?.anx7 || '';
  a.download = S.activeProject.anx7PdfName;
  a.style.display = 'none';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
window.downloadPdfAnx7 = downloadPdfAnx7;
function deletePdfAnx7() {
  if (!S.activeProject || !confirm('Delete the uploaded PDF?')) return;
  closePDFPreviewAnx7();
  S.activeProject.anx7PdfName = null;
  if (S.activeProject.pdfData) S.activeProject.pdfData.anx7 = null;
  const pi = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pi >= 0) { S.projects[pi].anx7PdfName = null; if (S.projects[pi].pdfData) S.projects[pi].pdfData.anx7 = null; }
  renderPdfUploadUIAnx7();
  if (window.debouncedSaveState) window.debouncedSaveState();
  toast('PDF deleted.', 'success');
}
window.deletePdfAnx7 = deletePdfAnx7;
function handlePDFUploadAnx7(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) { toast('Only PDF files allowed.', 'error'); event.target.value = ''; return; }
  if (!S.activeProject) { toast('Select a project first.', 'warn'); event.target.value = ''; return; }
  const fileURL = URL.createObjectURL(file);
  S.activeProject.anx7PdfName = file.name;
  if (!S.activeProject.pdfData) S.activeProject.pdfData = {};
  S.activeProject.pdfData.anx7 = fileURL;
  if (window.storeProjectPdf) {
    window.storeProjectPdf('anx7', file).catch(err => console.error('Backend PDF upload failed:', err));
  }
  const pi = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pi >= 0) { S.projects[pi].anx7PdfName = file.name; if (!S.projects[pi].pdfData) S.projects[pi].pdfData = {}; S.projects[pi].pdfData.anx7 = fileURL; }
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx7') : document.getElementById('pdf-iframe-anx7'));
  const sec = document.getElementById('pdf-preview-section-anx7');
  if (iframe && sec) { iframe.src = fileURL; sec.style.display = 'block'; }
  renderPdfUploadUIAnx7();
  if (window.debouncedSaveState) window.debouncedSaveState();
  toast('PDF uploaded and preview loaded!', 'success');
  event.target.value = '';
}
window.handlePDFUploadAnx7 = handlePDFUploadAnx7;
function initAnx7() {
  if (!document.getElementById('anx7-individual-routes-container')) return;
  const individual = document.getElementById('anx7-individual-routes-container');
  const cluster = document.getElementById('anx7-cluster-routes-container');
  if (individual && !individual.querySelector('.table-block-card')) addRouteTableBlockAnx7(true);
  if (cluster && !cluster.querySelector('.table-block-card')) addClusterTableBlockAnx7(true);
  renderPdfUploadUIAnx7();
}
window.initAnx7 = initAnx7;
window.addEventListener('DOMContentLoaded', initAnx7);
document.addEventListener('input', (e) => {
  if (e.target.closest('#view-anx7 table')) {
    if (window.anx7DebounceTimer) clearTimeout(window.anx7DebounceTimer);
    window.anx7DebounceTimer = setTimeout(() => {
       exportAnx7PDF(null, true);
    }, 1500); // 1.5 seconds after typing stops
  }
});
document.addEventListener('change', (e) => {
  if (e.target.closest('#view-anx7 table')) {
    if (window.anx7DebounceTimer) clearTimeout(window.anx7DebounceTimer);
    window.anx7DebounceTimer = setTimeout(() => {
      exportAnx7PDF(null, true);
    }, 300);
  }
});
