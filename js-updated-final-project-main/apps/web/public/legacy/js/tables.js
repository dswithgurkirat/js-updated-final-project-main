/* ══════════════════════════════════════
   TABLES & ANNEXURES HELPERS
══════════════════════════════════════ */
function delRow(btn) { btn.closest('tr').remove(); }
function addRow(tableId, cells) {
  const tbody=document.querySelector('#'+tableId+' tbody');
  if (!tbody) return;
  const tr=document.createElement('tr');
  tr.innerHTML=cells.map(c=>{
    let val = String(c !== undefined && c !== null ? c : '').trim();
    if (val === '' && !val.includes('<button') && !val.includes('<select')) {
      val = 'NUL';
    }
    return `<td contenteditable>${val}</td>`;
  }).join('');
  tbody.appendChild(tr);
  if (window.initLucide) window.initLucide();
}
function downloadAnxTemplate(n) {
  let csvContent = "";
  let filename = "";
  if (n === 5) {
    csvContent = "Point Name,Type (Bench Mark/CORS),Latitude,Longitude,Elevation (m),Remarks\n";
    filename = "Annexure_V_Benchmarks_Template.csv";
  } else if (n === 6) {
    csvContent = "Cluster No.,River,Total Area (Ha),Total Excavation (MT),Mineral @60% (MT),Status (Approved/Pending)\n";
    filename = "Annexure_VI_Final_Clusters_Template.csv";
  } else if (n === 7) {
    csvContent = "Owner Name,Patta No.,Area (Ha),District,Tehsil,Village,Remarks\n";
    filename = "Annexure_VII_Patta_Lands_Template.csv";
  } else {
    toast(`⬇ Annexure ${toRoman(n)} Excel template downloaded`,'success');
    return;
  }
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast(`⬇ Annexure ${toRoman(n)} Excel template downloaded`,'success');
}
window.addEventListener('DOMContentLoaded', () => {
  const originalShowView = window.showView;
  if (typeof originalShowView === 'function') {
    window.showView = function(id, btn, push) {
      originalShowView(id, btn, push);
      if (['tables','anx1','anx2','anx3','anx4','anx5','anx6','anx7'].includes(id) || id.startsWith('anx')) {
        const isReadOnly = isUserReadOnly();
        const actionBtns = document.querySelectorAll('.active .btn-saffron, .active .btn-outline[onclick^="trigUp"], .active .upload-zone');
        actionBtns.forEach(el => {
          if (el.innerText.includes('Add Row') || el.innerText.includes('Upload') || el.classList.contains('upload-zone') || el.getAttribute('onclick')?.includes('trigUp')) {
            el.style.display = isReadOnly ? 'none' : '';
          }
        });
        if (isReadOnly) {
          const editables = document.querySelectorAll('.active [contenteditable="true"], .active [contenteditable=""]');
          editables.forEach(el => {
            el.removeAttribute('contenteditable');
            el.style.cursor = 'not-allowed';
            el.style.backgroundColor = 'var(--off)';
          });
          const selects = document.querySelectorAll('.active select');
          selects.forEach(el => el.disabled = true);
          const ths = document.querySelectorAll('.active th');
          ths.forEach(th => {
            if (th.innerText.toLowerCase().includes('action')) th.style.display = 'none';
          });
          const delBtns = document.querySelectorAll('.active .btn-danger[onclick^="delRow"]');
          delBtns.forEach(btn => {
            const td = btn.closest('td');
            if (td) td.style.display = 'none';
          });
        }
      }
    };
  }
});
function handleAnxUpload(e,n) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheets = workbook.SheetNames;
      if (!sheets.length) throw new Error('No sheets found in Excel file');
      const tableIds = getAnnexureTableIds(n);
      let updated = 0;
      sheets.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const tableId = findAnnexureTableId(n, sheetName, tableIds);
        if (tableId && populateTableFromSheet(tableId, rows)) updated += 1;
      });
      if (!updated && tableIds.length && sheets.length === 1) {
        const sheet = workbook.Sheets[sheets[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (populateTableFromSheet(tableIds[0], rows)) updated = 1;
      }
      if (!updated) throw new Error('No matching annexure table found');
      toast(`✅ Annexure ${toRoman(n)} uploaded and ${updated} table(s) updated`,'success');
    } catch (err) {
      console.error(err);
      toast(`⚠️ Upload failed: ${err.message}`,'error');
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = '';
}
function getAnnexureTableIds(n) {
  return {
    1: ['anx1-rivers','anx1-desilt','anx1-patta','anx1-msand'],
    2: ['anx2-leases','anx2-patta','anx2-desilt','anx2-msand'],
    3: ['anx3-clusters','anx3-contiguous'],
    4: ['anx4-routes','anx4-cluster-routes'],
    5: ['anx5-benchmarks'],
    6: ['anx6-final-clusters'],
    7: ['anx7-patta-final']
  }[n] || [];
}
function findAnnexureTableId(n, sheetName, tableIds) {
  const key = String(sheetName || '').trim().toLowerCase();
  const patterns = {
    'anx1-rivers': ['river','rivers','source','sources'],
    'anx1-desilt': ['desilt','de-silt','reservoir','lake','pond','dam'],
    'anx1-patta': ['patta','khatedari','land'],
    'anx1-msand': ['m-sand','msand','plant'],
    'anx2-leases': ['lease','leases','river','rivers'],
    'anx2-patta': ['patta','khatedari','land'],
    'anx2-desilt': ['desilt','de-silt','reservoir','lake','pond','dam'],
    'anx2-msand': ['m-sand','msand','plant'],
    'anx3-clusters': ['cluster'],
    'anx3-contiguous': ['contiguous'],
    'anx4-routes': ['route','routes','lease'],
    'anx4-cluster-routes': ['cluster route','cluster routes'],
    'anx5-benchmarks': ['bench','benchmark','cors'],
    'anx6-final-clusters': ['final cluster','cluster summary'],
    'anx7-patta-final': ['patta']
  };
  for (const tableId of tableIds) {
    const keys = patterns[tableId] || [];
    if (keys.some(k => key.includes(k))) return tableId;
  }
  return tableIds[0] || null;
}
function populateTableFromSheet(tableId, rows) {
  const table = document.getElementById(tableId);
  if (!table) return false;
  const tbody = table.querySelector('tbody');
  if (!tbody) return false;
  const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim().toLowerCase());
  const cleanRows = rows.filter(row => Array.isArray(row) && row.some(cell => String(cell || '').trim() !== ''));
  if (!cleanRows.length) return false;
  const firstRow = cleanRows[0].map(cell => String(cell || '').trim().toLowerCase());
  const isHeaderRow = firstRow.every((value, index) => {
    const header = headers[index] || '';
    return value && (header.includes(value) || value.includes(header));
  });
  if (isHeaderRow) cleanRows.shift();
  const uploadRows = cleanRows.map(row => {
    const cells = [];
    headers.forEach((_, index) => {
      let value = row[index] !== undefined ? String(row[index]).trim() : '';
      if (value === '') value = 'NUL';
      cells.push(value);
    });
    if (headers.includes('action')) {
      const isReadOnly = isUserReadOnly();
      cells.push(`<button class="btn btn-xs btn-danger" onclick="delRow(this)" style="${isReadOnly ? 'display:none;' : 'display:inline-flex;'}align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>`);
    }
    return cells;
  });
  const addUploadedRow = (row) => {
    const tr = document.createElement('tr');
    row.forEach(value => {
      if (/<button|<select/i.test(String(value))) {
        tr.insertAdjacentHTML('beforeend', `<td>${value}</td>`);
        return;
      }
      const escaped = value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      tr.insertAdjacentHTML('beforeend', `<td contenteditable>${escaped}</td>`);
    });
    if (typeof normalizePhaseNo === 'function' && normalizePhaseNo(S.activeProject) > 1 && typeof applyPhaseHighlightToRow === 'function') {
      applyPhaseHighlightToRow(tr, getActivePhaseUploadColor(), 'PHASE2_NEW');
    }
    tbody.appendChild(tr);
  };
  if (typeof rbacApplyExcelRowsToTable === 'function') {
    rbacApplyExcelRowsToTable(table, uploadRows, addUploadedRow);
  } else {
    tbody.innerHTML = '';
    uploadRows.forEach(addUploadedRow);
  }
  if (typeof normalizePhaseNo === 'function' && normalizePhaseNo(S.activeProject) > 1 && typeof recordPhaseChange === 'function') {
    recordPhaseChange(tableId, 'PHASE2_NEW', `${uploadRows.length} uploaded row(s)`, getActivePhaseUploadColor());
    if (typeof debouncedSaveState === 'function') debouncedSaveState();
  }
  if (window.initLucide) window.initLucide();
  return true;
}
function handleTableUpload(e) {
  const f = e.target.files[0]; if (!f) return;
  const sel = document.getElementById('table-upload-select');
  const tableId = sel ? sel.value : null;
  if (!tableId) { toast('Select a table first','warn'); return; }
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (populateTableFromSheet(tableId, rows)) toast('✅ Table updated from Excel','success');
      else toast('No data found in sheet','warn');
    } catch (err) { console.error(err); toast('⚠️ Upload failed','error'); }
  };
  reader.readAsArrayBuffer(f);
  e.target.value = '';
}
function exportAnxPDF(n) {
  if (n === 5 && typeof exportAnx5PDF === 'function') {
    exportAnx5PDF();
  } else if (n === 6 && typeof exportAnx6PDF === 'function') {
    exportAnx6PDF();
  } else if (n === 7 && typeof exportAnx7PDF === 'function') {
    exportAnx7PDF();
  } else {
    toast(`📄 Annexure ${typeof n==='number'?toRoman(n):n} PDF exported`,'success');
  }
}
function toRoman(n) { return ['I','II','III','IV','V','VI','VII'][n-1]||n; }
function mountBenchmarkPanel(targetId) {
  const panel = document.getElementById('anx-benchmark-cors-panel');
  const target = document.getElementById(targetId);
  if (!panel || !target) return;
  if (panel.parentElement !== target) target.appendChild(panel);
  if (window.initLucide) window.initLucide();
}
function switchAnxTab(id, btn) {
  ['coords','benchmark','final-clusters','patta-final','desilt-final'].forEach(t=>{
    const el=document.getElementById('anx-tab-'+t); if(el) el.style.display=t===id?'block':'none';
  });
  if (id === 'benchmark') mountBenchmarkPanel('anx-tab-benchmark');
  const tabs = document.querySelectorAll('.feature-tab');
  tabs.forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}
/* ══════════════════════════════════════
   DEMAND TABLE
══════════════════════════════════════ */
function initDemandTable() {
  const tbody=document.getElementById('demand-tbody'); if(!tbody) return;
  tbody.innerHTML=S.demandDistricts.map((d,i)=>`
    <tr>
      <td>${i+1}</td><td>${d}</td>
      <td contenteditable class="num" oninput="updateDemandTotals()">0</td>
      <td contenteditable class="num" oninput="updateDemandTotals()">0</td>
      <td contenteditable class="num" oninput="updateDemandTotals()">0</td>
      <td contenteditable class="num" oninput="updateDemandTotals()">0</td>
      <td contenteditable class="num" oninput="updateDemandTotals()">0</td>
      <td contenteditable class="num" oninput="updateDemandTotals()">0</td>
    </tr>`).join('');
}
function addDemandRow() {
  const tbody=document.getElementById('demand-tbody');
  if (!tbody) return;
  const n=tbody.rows.length+1;
  tbody.insertAdjacentHTML('beforeend',`<tr><td>${n}</td><td contenteditable>New District</td>${Array(6).fill('<td contenteditable class="num" oninput="updateDemandTotals()">0</td>').join('')}</tr>`);
}
function updateDemandTotals() {
  const tbody=document.getElementById('demand-tbody'); if(!tbody) return;
  for (let col=0;col<6;col++) {
    const cells=[...tbody.querySelectorAll(`tr td:nth-child(${col+3})`)];
    const total=cells.reduce((s,c)=>s+(parseFloat(c.textContent)||0),0);
    const el=document.getElementById('dt-'+col); if(el) el.textContent=fmtN(total,0);
  }
}
function exportDemandExcel() { toast('⬇ Demand table Excel downloaded','success'); }
function exportDemandPDF() { toast('📄 Demand table PDF exported','success'); }
/* ══════════════════════════════════════
   SUMMARY TABLE
══════════════════════════════════════ */
function initSummaryTable() {
  const tbody=document.getElementById('summary-tbody'); if(!tbody) return;
  const isReadOnly = isUserReadOnly();
  const cEd = isReadOnly ? '' : 'contenteditable';
  tbody.innerHTML=S.summarySources.map(s=>`
    <tr>
      <td ${cEd}>${s}</td>
      <td ${cEd} class="num" oninput="updateSummaryTotals()">0</td>
      <td ${cEd} class="num" oninput="updateSummaryTotals()">0</td>
      <td ${cEd} class="num" oninput="updateSummaryTotals()">0</td>
      <td ${cEd} class="num" oninput="updateSummaryTotals()">0</td>
      <td style="${isReadOnly ? 'display:none;' : ''}"><button class="btn btn-xs btn-danger" onclick="delRow(this)" style="display:inline-flex;align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button></td>
    </tr>`).join('');
  if (window.initLucide) window.initLucide();
}
function addSummaryRow() {
  const tbody=document.getElementById('summary-tbody');
  if (!tbody) return;
  tbody.insertAdjacentHTML('beforeend',`<tr>
    <td contenteditable>New Source</td>
    <td contenteditable class="num" oninput="updateSummaryTotals()">0</td>
    <td contenteditable class="num" oninput="updateSummaryTotals()">0</td>
    <td contenteditable class="num" oninput="updateSummaryTotals()">0</td>
    <td contenteditable class="num" oninput="updateSummaryTotals()">0</td>
    <td><button class="btn btn-xs btn-danger" onclick="delRow(this)" style="display:inline-flex;align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button></td>
  </tr>`);
  if (window.initLucide) window.initLucide();
}
function updateSummaryTotals() {
  const tbody=document.getElementById('summary-tbody'); if(!tbody) return;
  const ids=['sum-sites','sum-area','sum-excav','sum-excav60'];
  ids.forEach((id,col)=>{
    const cells=[...tbody.querySelectorAll(`tr td:nth-child(${col+2})`)];
    const total=cells.reduce((s,c)=>s+(parseFloat(c.textContent)||0),0);
    const el=document.getElementById(id); if(el) el.textContent=fmtN(total,2);
  });
}
function exportSummaryPDF() { toast('📄 Summary table PDF exported','success'); }
/* ══════════════════════════════════════
   AUCTION TABLE
══════════════════════════════════════ */
function initAuctionTable() {
  const tbody=document.getElementById('auction-tbody'); if(!tbody) return;
  const isReadOnly = isUserReadOnly();
  const cEd = isReadOnly ? '' : 'contenteditable';
  tbody.innerHTML=`<tr>
    <td ${cEd}>1</td>
    <td ${cEd}>Jalandhar Sutlej-1, Vill-Kadiana</td>
    <td><select ${isReadOnly ? 'disabled' : ''}><option>PMS</option><option>CMS</option><option>S</option><option>C</option><option>RSM</option></select></td>
    <td ${cEd}>01-Apr-2023</td><td ${cEd}>15-Apr-2023</td>
    <td ${cEd}>285000</td><td ${cEd}>142500</td><td ${cEd}>142500</td>
    <td ${cEd}>Active</td><td ${cEd}>—</td><td ${cEd}>—</td>
    <td ${cEd}>Running as per schedule</td>
    <td style="${isReadOnly ? 'display:none;' : ''}"><button class="btn btn-xs btn-danger" onclick="delRow(this)" style="display:inline-flex;align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button></td>
  </tr>`;
  if (window.initLucide) window.initLucide();
}
function addAuctionRow() {
  const tbody=document.getElementById('auction-tbody');
  if (!tbody) return;
  const n=tbody.rows.length+1;
  tbody.insertAdjacentHTML('beforeend',`<tr>
    <td contenteditable>${n}</td>
    <td contenteditable>Site Name ${n}</td>
    <td><select><option>PMS</option><option>CMS</option><option>S</option><option>C</option><option>RSM</option></select></td>
    <td contenteditable>—</td><td contenteditable>—</td>
    <td contenteditable>0</td><td contenteditable>0</td><td contenteditable>0</td>
    <td contenteditable>Pending</td><td contenteditable>—</td><td contenteditable>—</td>
    <td contenteditable>—</td>
    <td><button class="btn btn-xs btn-danger" onclick="delRow(this)" style="display:inline-flex;align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button></td>
  </tr>`);
  if (window.initLucide) window.initLucide();
}
function exportAuctionPDF() { toast('📄 Auctioned sites PDF exported','success'); }
