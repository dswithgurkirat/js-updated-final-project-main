/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ANNEXURE V â€” SAND MINING REPORT
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
window.S = window.S || { activeProject: { id: 'demo_proj', anx5PdfName: null }, projects: [] };
window.toast = window.toast || function (msg, type) { alert('[' + (type || 'INFO').toUpperCase() + '] ' + msg); };
window.initLucide = window.initLucide || function () { if (window.lucide) lucide.createIcons(); };
var ANX5_STORAGE_PREFIX = 'anx5_heading_';
function saveAnx5Heading(el) {
  var key = el.getAttribute('data-key');
  if (!key) return;
  try { localStorage.setItem(ANX5_STORAGE_PREFIX + key, el.innerText.trim()); } catch (e) {}
}
window.saveAnx5Heading = saveAnx5Heading;
function loadAnx5Headings() {
  document.querySelectorAll('#view-anx5 .editable-title[data-key]').forEach(function (el) {
    var key = el.getAttribute('data-key');
    var saved = null;
    try { saved = localStorage.getItem(ANX5_STORAGE_PREFIX + key); } catch (e) {}
    if (saved) el.innerText = saved;
  });
}
window.loadAnx5Headings = loadAnx5Headings;
function downloadSectionTemplateAnx5(sectionType) {
  let csvContent = "";
  let filename = "";
  switch (sectionType) {
    case 'A':
      csvContent = "River Details,Sand Bar Code,Lease Details,Area (Ha.),Latitude,Longitude,Distance (KM) from PA/BR/WC,Distance from Forest Area (KM),Mining leases within 500 m,Bulk Density (gm/cc),Depth of Deposit,Total Excavation (MT/YR),Total Excavation (Net 60%),Mineral to be mined,Existing/Proposed,Remarks\n";
      filename = "Table_A_Mining_Leases_Template.csv";
      break;
    case 'B':
      csvContent = "Owner,Sy.No (khasra No),Area,Latitude,Longitude,District,Tehsil,Village,Total Reserve (MT),Total Mineral (60%),Existing/Proposed,Remarks\n";
      filename = "Table_B_Patta_Lands_Template.csv";
      break;
    case 'C':
      csvContent = "Name of Reservoir/Dams,Maintain/Controlled by,Latitude,Longitude,District,Tehsil,Village,Size (Ha),Quantity MT/Year,Existing/Proposed\n";
      filename = "Table_C_DeSiltation_Template.csv";
      break;
    case 'D':
      csvContent = "Plant Name,Owner,District,Tehsil,Village,Geo-location,Quantity Tonnes/Annum,Existing/Proposed\n";
      filename = "Table_D_MSand_Template.csv";
      break;
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
}
window.downloadSectionTemplateAnx5 = downloadSectionTemplateAnx5;
function handleSectionUploadAnx5(event, sectionType) {
  const file = event.target.files[0];
  if (!file) return;
  const input = event.target;
  const sectionBlock = input.closest('.anx-section') || input.closest('[class*="-block"]');
  const table = sectionBlock ? sectionBlock.querySelector('table') : null;
  const targetTableId = table ? table.id : '';
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
      if (rows.length === 0) {
        toast("The uploaded file is empty.", "warn");
        return;
      }
      processExcelDataAnx5(rows, sectionType, targetTableId);
    } catch (error) {
      toast("Error parsing file. Please ensure it is a valid Excel or CSV file.", "error");
      console.error(error);
    }
    event.target.value = '';
  };
  reader.readAsArrayBuffer(file);
}
window.handleSectionUploadAnx5 = handleSectionUploadAnx5;
function processExcelDataAnx5(rows, sectionType, tableId) {
  const validRows = rows.filter(row => row.some(cell => String(cell !== undefined && cell !== null ? cell : "").trim() !== ""));
  let startIndex = 0;
  const headerIdx = validRows.findIndex(row => {
    const rowStr = row.map(c => String(c || '')).join(' ').toLowerCase();
    if (sectionType === 'A') return rowStr.includes('lease') || rowStr.includes('river');
    if (sectionType === 'B') return rowStr.includes('owner') || rowStr.includes('patta');
    if (sectionType === 'C') return rowStr.includes('reservoir') || rowStr.includes('desilt');
    if (sectionType === 'D') return rowStr.includes('plant') || rowStr.includes('msand');
    return false;
  });
  if (headerIdx >= 0) {
    startIndex = headerIdx + 1;
  }
  const dataRows = validRows.slice(startIndex);
  if (dataRows.length === 0) {
    toast("No data found after the header in the uploaded file.", "warn");
    return;
  }
  if (!tableId) {
    if (sectionType === 'A') tableId = 'anx5-mining';
    if (sectionType === 'B') tableId = 'anx5-patta';
    if (sectionType === 'C') tableId = 'anx5-desilt';
    if (sectionType === 'D') tableId = 'anx5-msand';
  }
  const uploadRows = [];
  dataRows.forEach((rowData, index) => {
    while (rowData.length < 18) rowData.push("");
    let cellDataArray = [];
    const actionBtn = `<button class='btn btn-xs btn-danger' onclick='delRowAnx5(this)' style='display:inline-flex;align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>`;
    if (sectionType === 'A') {
      let slNo = String(index + 1);
      let area = parseFloat(rowData[4]) || 0;
      let bulkDensity = parseFloat(rowData[10]) || 1.54;
      let depth = parseFloat(rowData[11]) || 1.74;
      let gross = area * 10000 * depth * bulkDensity;
      let net = gross * 0.60;
      let epVal = String(rowData[15] || "").trim().toLowerCase();
      let epSelect = `<select><option ${epVal === 'existing' || epVal !== 'proposed' ? 'selected' : ''}>Existing</option><option ${epVal === 'proposed' ? 'selected' : ''}>Proposed</option></select>`;
      cellDataArray = [
        slNo,
        rowData[1], // River Details
        rowData[2], // Sand Bar Code
        rowData[3], // Lease Details
        area.toString(), // Area
        rowData[5], // Latitude
        rowData[6], // Longitude
        rowData[7], // Distance from PA
        rowData[8], // Forest Distance
        rowData[9], // Cluster
        bulkDensity.toString(),
        depth.toString(),
        gross.toFixed(2),
        net.toFixed(2),
        rowData[14] || "Sand", // Mineral
        epSelect,
        rowData[16], // Remarks
        actionBtn
      ];
    }
    else if (sectionType === 'B') {
      let slNo = String(index + 1);
      let area = parseFloat(rowData[3]) || 0;
      let reserve = Math.round(area * 10000 * 3 * 1.52);
      let mineral = Math.round(reserve * 0.60);
      let epVal = String(rowData[11] || "").trim().toLowerCase();
      let epSelect = `<select><option ${epVal === 'existing' || epVal !== 'proposed' ? 'selected' : ''}>Existing</option><option ${epVal === 'proposed' ? 'selected' : ''}>Proposed</option></select>`;
      cellDataArray = [
        slNo,
        rowData[1], // Owner
        rowData[2], // Sy.No
        area.toString(),
        rowData[4], // Latitude
        rowData[5], // Longitude
        rowData[6] || "Jalandhar", // District
        rowData[7], // Tehsil
        rowData[8], // Village
        reserve.toString(),
        mineral.toString(),
        epSelect,
        rowData[12], // Remarks
        actionBtn
      ];
    }
    else if (sectionType === 'C') {
      let epVal = String(rowData[9] || "").trim().toLowerCase();
      let epSelect = `<select><option ${epVal === 'existing' || epVal !== 'proposed' ? 'selected' : ''}>Existing</option><option ${epVal === 'proposed' ? 'selected' : ''}>Proposed</option></select>`;
      cellDataArray = [
        rowData[0], // Name of Reservoir/Dams
        rowData[1], // Maintain/Controlled by
        rowData[2], // Latitude
        rowData[3], // Longitude
        rowData[4] || "Jalandhar", // District
        rowData[5], // Tehsil
        rowData[6], // Village
        rowData[7], // Size
        rowData[8], // Qty
        epSelect,
        actionBtn
      ];
    }
    else if (sectionType === 'D') {
      let epVal = String(rowData[7] || "").trim().toLowerCase();
      let epSelect = `<select><option ${epVal === 'existing' || epVal !== 'proposed' ? 'selected' : ''}>Existing</option><option ${epVal === 'proposed' ? 'selected' : ''}>Proposed</option></select>`;
      cellDataArray = [
        rowData[0], // Plant Name
        rowData[1], // Owner
        rowData[2] || "Jalandhar", // District
        rowData[3], // Tehsil
        rowData[4], // Village
        rowData[5], // Geo-location
        rowData[6], // Quantity
        epSelect,
        actionBtn
      ];
    }
    uploadRows.push(cellDataArray);
  });
  if (typeof rbacApplyExcelRowsToTable === 'function') {
    rbacApplyExcelRowsToTable(tableId, uploadRows, row => addRowAnx5(tableId, row));
  } else {
    const tbody = document.getElementById(tableId).querySelector('tbody');
    tbody.innerHTML = '';
    uploadRows.forEach(row => addRowAnx5(tableId, row));
  }
  recalcAnx5Totals();
  toast(`Uploaded section ${sectionType} data successfully`, 'success');
}
function addRowAnx5(tableId, cellDataArray) {
  const tbody = document.querySelector('#' + tableId + ' tbody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  cellDataArray.forEach((data, index) => {
    const td = document.createElement('td');
    let dataStr = String(data !== undefined && data !== null ? data : '').trim();
    if (dataStr === '' && !dataStr.includes('<button') && !dataStr.includes('<select')) {
      dataStr = 'NUL';
    }
    if (!dataStr.includes('<button') && !dataStr.includes('<select')) {
      td.contentEditable = "true";
      td.textContent = dataStr;
      if (tableId.startsWith('anx5-mining')) {
        if (index === 4 || index === 10 || index === 11) {
          td.addEventListener('input', function () { calcAnx5MiningRow(this); });
        }
      } else if (tableId.startsWith('anx5-patta')) {
        if (index === 3) {
          td.addEventListener('input', function () { calcAnx5PattaRow(this); });
        }
      } else if (tableId.startsWith('anx5-desilt')) {
        if (index === 7) {
          td.addEventListener('input', function () { calcAnx5DesiltRow(this); });
        }
      }
    } else {
      td.innerHTML = dataStr;
    }
    tr.appendChild(td);
  });
  if (tableId.startsWith('anx5-mining')) {
    tr.children[12].classList.add('calc-total');
    tr.children[13].classList.add('calc-net');
    tr.children[12].contentEditable = "false";
    tr.children[13].contentEditable = "false";
  }
  else if (tableId.startsWith('anx5-patta')) {
    tr.children[9].classList.add('calc-reserve');
    tr.children[10].classList.add('calc-mineral');
    tr.children[9].addEventListener('input', recalcAnx5Totals);
    tr.children[10].addEventListener('input', recalcAnx5Totals);
  }
  else if (tableId.startsWith('anx5-desilt')) {
    tr.children[7].addEventListener('input', recalcAnx5Totals);
  }
  tbody.appendChild(tr);
  if (window.initLucide) window.initLucide();
}
window.addRowAnx5 = addRowAnx5;
function addNewMiningRowAnx5(btn) {
  const tableId = btn.closest('.anx-section').querySelector('table').id;
  addRowAnx5(tableId, ['', '', '', '', '0', '', '', '', '', '', '1.54', '1.74', '0.00', '0.00', 'Sand', '<select><option>Existing</option><option>Proposed</option></select>', '', "<button class='btn btn-xs btn-danger' onclick='delRowAnx5(this)' style='display:inline-flex;align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>"]);
}
window.addNewMiningRowAnx5 = addNewMiningRowAnx5;
function addNewPattaRowAnx5(btn) {
  const tableId = btn.closest('.anx-section').querySelector('table').id;
  addRowAnx5(tableId, ['', '', '', '0', '', '', 'Jalandhar', '', '', '0', '0', '<select><option>Existing</option><option>Proposed</option></select>', '', "<button class='btn btn-xs btn-danger' onclick='delRowAnx5(this)' style='display:inline-flex;align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>"]);
}
window.addNewPattaRowAnx5 = addNewPattaRowAnx5;
function addNewDesiltRowAnx5(btn) {
  const tableId = btn.closest('.anx-section').querySelector('table').id;
  addRowAnx5(tableId, ['', '', '', '', 'Jalandhar', '', '', '0.00', '-', '<select><option>Existing</option><option>Proposed</option></select>', "<button class='btn btn-xs btn-danger' onclick='delRowAnx5(this)' style='display:inline-flex;align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>"]);
}
window.addNewDesiltRowAnx5 = addNewDesiltRowAnx5;
function addNewMsandRowAnx5(btn) {
  const tableId = btn.closest('.anx-section').querySelector('table').id;
  addRowAnx5(tableId, ['', '', 'Jalandhar', '', '', '', 'Not Available', '<select><option>Existing</option><option>Proposed</option></select>', "<button class='btn btn-xs btn-danger' onclick='delRowAnx5(this)' style='display:inline-flex;align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>"]);
}
window.addNewMsandRowAnx5 = addNewMsandRowAnx5;
function delRowAnx5(btn) {
  const table = btn.closest('table');
  btn.closest('tr').remove();
  recalcAnx5Totals();
}
window.delRowAnx5 = delRowAnx5;
let sectionBlockCounts = { A: 1, B: 1, C: 1, D: 1 };
function addAnx5SectionBlock(sectionType) {
  sectionBlockCounts[sectionType]++;
  const sectionNum = sectionBlockCounts[sectionType];
  let wrapperId, blockClass, baseTableId;
  if (sectionType === 'A') {
    wrapperId = 'anx5-section-a-wrapper';
    blockClass = 'anx5-section-a-block';
    baseTableId = 'anx5-mining';
  } else if (sectionType === 'B') {
    wrapperId = 'anx5-section-b-wrapper';
    blockClass = 'anx5-section-b-block';
    baseTableId = 'anx5-patta';
  } else if (sectionType === 'C') {
    wrapperId = 'anx5-section-c-wrapper';
    blockClass = 'anx5-section-c-block';
    baseTableId = 'anx5-desilt';
  } else if (sectionType === 'D') {
    wrapperId = 'anx5-section-d-wrapper';
    blockClass = 'anx5-section-d-block';
    baseTableId = 'anx5-msand';
  }
  const wrapper = document.getElementById(wrapperId);
  const originalBlock = wrapper.querySelector('.' + blockClass);
  const newBlock = originalBlock.cloneNode(true);
  newBlock.querySelector('.rm-sec-btn').style.display = 'inline-flex';
  const titleEl = newBlock.querySelector('.editable-title');
  if (titleEl) {
    let baseText = titleEl.innerText.replace(/ - Table \d+:$/, '');
    var newTitle = baseText + ' - Table ' + sectionNum + ':';
    titleEl.innerText = newTitle;
    var newKey = 'anx5-title-' + sectionType + '-' + Date.now();
    titleEl.setAttribute('data-key', newKey);
    try { localStorage.setItem(ANX5_STORAGE_PREFIX + newKey, newTitle); } catch (e) {}
  }
  const newTable = newBlock.querySelector('table');
  const newTableId = baseTableId + '-' + sectionNum;
  newTable.id = newTableId;
  const tbody = newTable.querySelector('tbody');
  tbody.innerHTML = '';
  newTable.querySelector('tfoot')?.remove();
  const fileInput = newBlock.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.setAttribute('data-table-id', newTableId);
  }
  wrapper.appendChild(newBlock);
  if (window.initLucide) window.initLucide();
  const addRowBtn = newBlock.querySelector('.section-footer button');
  if (addRowBtn) {
    addRowBtn.click();
  }
}
window.addAnx5SectionBlock = addAnx5SectionBlock;
function calcAnx5MiningRow(element) {
  const row = element.closest('tr');
  const cells = row.cells;
  const area = parseFloat(cells[4].innerText) || 0;
  const bulkDensity = parseFloat(cells[10].innerText) || 0;
  const depth = parseFloat(cells[11].innerText) || 0;
  const gross = area * 10000 * depth * bulkDensity;
  const net = gross * 0.60;
  cells[12].innerText = gross > 0 ? gross.toFixed(2) : "0.00";
  cells[13].innerText = net > 0 ? net.toFixed(2) : "0.00";
  recalcAnx5Totals();
}
window.calcAnx5MiningRow = calcAnx5MiningRow;
function calcAnx5PattaRow(element) {
  const row = element.closest('tr');
  const cells = row.cells;
  const area = parseFloat(cells[3].innerText) || 0;
  const reserve = Math.round(area * 10000 * 3 * 1.52);
  const mineral = Math.round(reserve * 0.60);
  cells[9].innerText = reserve;
  cells[10].innerText = mineral;
  recalcAnx5Totals();
}
window.calcAnx5PattaRow = calcAnx5PattaRow;
function calcAnx5DesiltRow(element) {
  recalcAnx5Totals();
}
window.calcAnx5DesiltRow = calcAnx5DesiltRow;
function recalcAnx5Totals() {
  const miningTables = document.querySelectorAll('[id^="anx5-mining"]');
  let miningArea = 0, miningExc = 0, miningExc60 = 0;
  miningTables.forEach(table => {
    table.querySelectorAll('tbody tr').forEach(tr => {
      const cells = tr.cells;
      if (cells.length > 13) {
        miningArea += parseFloat(cells[4]?.textContent) || 0;
        miningExc += parseFloat(cells[12]?.textContent) || 0;
        miningExc60 += parseFloat(cells[13]?.textContent) || 0;
      }
    });
  });
  const miningAreaEl = document.getElementById('mining-total-area');
  const miningExcEl = document.getElementById('mining-total-exc');
  const miningExc60El = document.getElementById('mining-total-exc60');
  if (miningAreaEl) miningAreaEl.textContent = miningArea.toFixed(2);
  if (miningExcEl) miningExcEl.textContent = miningExc.toFixed(2);
  if (miningExc60El) miningExc60El.textContent = miningExc60.toFixed(2);
  const pattaTables = document.querySelectorAll('[id^="anx5-patta"]');
  let pattaArea = 0, pattaRes = 0, pattaMin = 0;
  pattaTables.forEach(table => {
    table.querySelectorAll('tbody tr').forEach(tr => {
      const cells = tr.cells;
      if (cells.length > 10) {
        pattaArea += parseFloat(cells[3]?.textContent) || 0;
        pattaRes += parseFloat(cells[9]?.textContent) || 0;
        pattaMin += parseFloat(cells[10]?.textContent) || 0;
      }
    });
  });
  const pattaAreaEl = document.getElementById('patta-total-area');
  const pattaResEl = document.getElementById('patta-total-res');
  const pattaMinEl = document.getElementById('patta-total-min');
  if (pattaAreaEl) pattaAreaEl.textContent = pattaArea.toFixed(2);
  if (pattaResEl) pattaResEl.textContent = pattaRes.toFixed(0);
  if (pattaMinEl) pattaMinEl.textContent = pattaMin.toFixed(2);
  const desiltTables = document.querySelectorAll('[id^="anx5-desilt"]');
  let desiltSize = 0;
  desiltTables.forEach(table => {
    table.querySelectorAll('tbody tr').forEach(tr => {
      const cells = tr.cells;
      if (cells.length > 7) {
        desiltSize += parseFloat(cells[7]?.textContent) || 0;
      }
    });
  });
  const desiltSizeEl = document.getElementById('desilt-total-size');
  if (desiltSizeEl) desiltSizeEl.textContent = desiltSize.toFixed(2);
}
window.recalcAnx5Totals = recalcAnx5Totals;
function exportAnx5PDF(btn, isLivePreview = false) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let startY = 80;
  let isFirstPage = true;
  const drawHeaderFooter = (data) => {
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Page " + data.pageNumber, pageWidth / 2, pageHeight - 20, { align: "center" });
  };
  const getCellTextAnx5 = (td) => {
    const select = td.querySelector('select');
    if (select) return select.value;
    return td.innerText.trim();
  };
  const extractDataAnx5 = (tableId) => {
    const tbl = document.getElementById(tableId);
    if (!tbl) return null;
    const headers = Array.from(tbl.querySelectorAll('thead th')).filter(th => !th.classList.contains('no-print') && th.innerText.trim() !== 'Action').map(th => th.innerText.trim().replace(/\n/g, ' '));
    const rows = [];
    tbl.querySelectorAll('tbody tr').forEach(tr => {
      const row = [];
      tr.querySelectorAll('td').forEach(td => {
        if (!td.classList.contains('no-print')) {
          row.push(getCellTextAnx5(td));
        }
      });
      rows.push(row);
    });
    return { headers, rows };
  };
  const miningBlocks = document.querySelectorAll('.anx5-section-a-block');
  miningBlocks.forEach((block, index) => {
    if (startY > pageHeight - 120) {
      doc.addPage();
      startY = 80;
    }
    if (isFirstPage) {
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Annexure-V", pageWidth - 40, 55, { align: "right" });
      isFirstPage = false;
    }
    const titleEl = block.querySelector('.editable-title');
    const titleText = titleEl ? titleEl.textContent.trim() : `Final List of Potential Mining Leases (Existing & Proposed) Rivers:`;
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(titleText.startsWith('>') ? titleText : `> ${titleText}`, 40, startY);
    startY += 15;
    const tableId = block.querySelector('table').id;
    const data = extractDataAnx5(tableId);
    let foot = undefined;
    if (index === miningBlocks.length - 1) {
      foot = [[
        { content: 'Total', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: document.getElementById('mining-total-area')?.textContent || '0.00', styles: { fontStyle: 'bold' } },
        '', '', '', '', '', '', '',
        { content: document.getElementById('mining-total-exc')?.textContent || '0.00', styles: { fontStyle: 'bold' } },
        { content: document.getElementById('mining-total-exc60')?.textContent || '0.00', styles: { fontStyle: 'bold' } },
        '', '', ''
      ]];
    }
    doc.autoTable({
      startY: startY,
      head: [data.headers],
      body: data.rows,
      foot: foot,
      theme: 'grid',
      styles: { font: 'times', fontSize: 7.5, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 3, valign: 'middle', halign: 'center' },
      headStyles: { fillColor: false, fontStyle: 'bold', halign: 'center', textColor: 0 },
      footStyles: { fillColor: false, fontStyle: 'bold', halign: 'center', textColor: 0 },
      columnStyles: {
        5: { cellWidth: 70 }, // Latitude wrap
        6: { cellWidth: 70 }, // Longitude wrap
      },
      didDrawPage: (d) => drawHeaderFooter(d)
    });
    startY = doc.lastAutoTable.finalY + 15;
  });
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.text("(Reference: Table of the Proforma for the district of Jalandhar, Page no 560 -563 )", pageWidth - 40, startY, { align: 'right' });
  startY += 25;
  if (startY > pageHeight - 120) {
    doc.addPage();
    startY = 80;
  }
  const pattaBlocks = document.querySelectorAll('.anx5-section-b-block');
  pattaBlocks.forEach((block, index) => {
    if (startY > pageHeight - 120) {
      doc.addPage();
      startY = 80;
    }
    const titleEl = block.querySelector('.editable-title');
    const titleText = titleEl ? titleEl.textContent.trim() : `Final Patta Lands / Khatedari Land (Existing & Proposed):`;
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(titleText.startsWith('>') ? titleText : `> ${titleText}`, 40, startY);
    startY += 15;
    const tableId = block.querySelector('table').id;
    const data = extractDataAnx5(tableId);
    let foot = undefined;
    if (index === pattaBlocks.length - 1) {
      foot = [[
        { content: 'Total', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: document.getElementById('patta-total-area')?.textContent || '0.00', styles: { fontStyle: 'bold' } },
        '', '', '', '', '',
        { content: document.getElementById('patta-total-res')?.textContent || '0.00', styles: { fontStyle: 'bold' } },
        { content: document.getElementById('patta-total-min')?.textContent || '0.00', styles: { fontStyle: 'bold' } },
        '', ''
      ]];
    }
    doc.autoTable({
      startY: startY,
      head: [data.headers],
      body: data.rows,
      foot: foot,
      theme: 'grid',
      styles: { font: 'times', fontSize: 7.5, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 3, valign: 'middle', halign: 'center' },
      headStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 },
      footStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 },
      didDrawPage: (d) => drawHeaderFooter(d)
    });
    startY = doc.lastAutoTable.finalY + 15;
  });
  if (startY > pageHeight - 120) {
    doc.addPage();
    startY = 80;
  }
  const desiltBlocks = document.querySelectorAll('.anx5-section-c-block');
  desiltBlocks.forEach((block, index) => {
    if (startY > pageHeight - 120) {
      doc.addPage();
      startY = 80;
    }
    const titleEl = block.querySelector('.editable-title');
    const titleText = titleEl ? titleEl.textContent.trim() : `De-Siltation Location: (Lakes/Ponds/Dams etc.) (Existing & Proposed):`;
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(titleText.startsWith('>') ? titleText : `> ${titleText}`, 40, startY);
    startY += 15;
    const tableId = block.querySelector('table').id;
    const data = extractDataAnx5(tableId);
    let foot = undefined;
    if (index === desiltBlocks.length - 1) {
      foot = [[
        { content: 'Total', colSpan: 7, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: document.getElementById('desilt-total-size')?.textContent || '0.00', styles: { fontStyle: 'bold' } },
        '', ''
      ]];
    }
    doc.autoTable({
      startY: startY,
      head: [data.headers],
      body: data.rows,
      foot: foot,
      theme: 'grid',
      styles: { font: 'times', fontSize: 7.5, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 3, valign: 'middle', halign: 'center' },
      headStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 },
      footStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 },
      didDrawPage: (d) => drawHeaderFooter(d)
    });
    startY = doc.lastAutoTable.finalY + 15;
  });
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.text("Note: The quantity of De-silting shall be assessed as per actual site conditions at the time of de-silting and got approved from the competent authority.", pageWidth / 2, startY, { align: 'center' });
  startY += 25;
  if (startY > pageHeight - 120) {
    doc.addPage();
    startY = 80;
  }
  const msandBlocks = document.querySelectorAll('.anx5-section-d-block');
  msandBlocks.forEach((block, index) => {
    if (startY > pageHeight - 120) {
      doc.addPage();
      startY = 80;
    }
    const titleEl = block.querySelector('.editable-title');
    const titleText = titleEl ? titleEl.textContent.trim() : `M-Sand Plants: (Existing & Proposed):`;
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(titleText.startsWith('>') ? titleText : `> ${titleText}`, 40, startY);
    startY += 15;
    const tableId = block.querySelector('table').id;
    const data = extractDataAnx5(tableId);
    doc.autoTable({
      startY: startY,
      head: [data.headers],
      body: data.rows,
      theme: 'grid',
      styles: { font: 'times', fontSize: 7.5, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 3, valign: 'middle', halign: 'center' },
      headStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 },
      margin: { left: pageWidth / 2 - 300, right: pageWidth / 2 - 300 },
      didDrawPage: (d) => drawHeaderFooter(d)
    });
    startY = doc.lastAutoTable.finalY + 15;
  });
  if (isLivePreview) {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx5') : document.getElementById('pdf-iframe-anx5'));
    if (iframe) iframe.src = blobUrl;
  } else {
    doc.save('Annexure_V_Sand_Mining_Report.pdf');
    toast('PDF downloaded successfully!', 'success');
  }
}
window.exportAnx5PDF = exportAnx5PDF;
function renderPdfUploadUIAnx5() {
  const nameEl = document.getElementById('anx5-uploaded-filename');
  const dlBtn = document.getElementById('anx5-download-btn');
  const delBtn = document.getElementById('anx5-delete-btn');
  const prevBtn = document.getElementById('anx5-preview-btn');
  const prevSec = document.getElementById('pdf-preview-section-anx5');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx5') : document.getElementById('pdf-iframe-anx5'));
  if (!nameEl || !dlBtn) return;
  if (!S.activeProject) {
    nameEl.style.display = 'none'; dlBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none'; if (prevBtn) prevBtn.style.display = 'none';
    if (prevSec) { prevSec.style.display = 'none'; if (iframe) iframe.src = 'about:blank'; }
    return;
  }
  const pdfName = S.activeProject.anx5PdfName;
  if (!pdfName) {
    nameEl.style.display = 'none'; dlBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none'; if (prevBtn) prevBtn.style.display = 'none';
    if (prevSec) { prevSec.style.display = 'none'; if (iframe) iframe.src = 'about:blank'; }
  } else {
    nameEl.textContent = pdfName;
    nameEl.style.display = 'inline-block';
    dlBtn.style.display = 'inline-flex';
    if (delBtn) delBtn.style.display = 'inline-flex';
    if (prevBtn) prevBtn.style.display = 'inline-flex';
    if (prevSec && prevSec.style.display === 'block' && iframe && S.activeProject.pdfData?.anx5) {
      if (!iframe.src.includes(S.activeProject.pdfData.anx5)) iframe.src = S.activeProject.pdfData.anx5;
    }
  }
  if (window.initLucide) window.initLucide();
}
window.renderPdfUploadUIAnx5 = renderPdfUploadUIAnx5;
function togglePDFPreviewAnx5() {
  const sec = document.getElementById('pdf-preview-section-anx5');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx5') : document.getElementById('pdf-iframe-anx5'));
  if (!sec || !iframe) return;
  if (sec.style.display === 'block') {
    sec.style.display = 'none'; if (iframe.src.startsWith('blob:')) URL.revokeObjectURL(iframe.src); iframe.src = 'about:blank';
  } else if (S.activeProject?.pdfData?.anx5) {
    iframe.src = S.activeProject.pdfData.anx5; sec.style.display = 'block';
  } else {
    toast('No PDF preview available. Please re-upload.', 'warn');
  }
}
window.togglePDFPreviewAnx5 = togglePDFPreviewAnx5;
function closePDFPreviewAnx5() {
  const sec = document.getElementById('pdf-preview-section-anx5');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx5') : document.getElementById('pdf-iframe-anx5'));
  if (sec) sec.style.display = 'none';
  if (iframe) { if (iframe.src.startsWith('blob:')) URL.revokeObjectURL(iframe.src); iframe.src = 'about:blank'; }
}
window.closePDFPreviewAnx5 = closePDFPreviewAnx5;
function downloadPdfAnx5() {
  if (!S.activeProject?.anx5PdfName) { toast('No PDF uploaded yet.', 'warn'); return; }
  if (window.downloadStoredPdf) {
    downloadStoredPdf('anx5', S.activeProject.anx5PdfName, S.activeProject.pdfData?.anx5);
    return;
  }
  const a = document.createElement('a');
  a.href = S.activeProject.pdfData?.anx5 || '';
  a.download = S.activeProject.anx5PdfName;
  a.style.display = 'none';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
window.downloadPdfAnx5 = downloadPdfAnx5;
function deletePdfAnx5() {
  if (!S.activeProject || !confirm('Delete the uploaded PDF?')) return;
  const sec = document.getElementById('pdf-preview-section-anx5');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx5') : document.getElementById('pdf-iframe-anx5'));
  if (sec) sec.style.display = 'none';
  if (iframe) { if (iframe.src.startsWith('blob:')) URL.revokeObjectURL(iframe.src); iframe.src = 'about:blank'; }
  S.activeProject.anx5PdfName = null;
  if (S.activeProject.pdfData) S.activeProject.pdfData.anx5 = null;
  const pi = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pi >= 0) { S.projects[pi].anx5PdfName = null; if (S.projects[pi].pdfData) S.projects[pi].pdfData.anx5 = null; }
  renderPdfUploadUIAnx5();
  toast('PDF deleted.', 'success');
}
window.deletePdfAnx5 = deletePdfAnx5;
function handlePDFUploadAnx5(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) { toast('Only PDF files allowed.', 'error'); event.target.value = ''; return; }
  if (!S.activeProject) { toast('Select a project first.', 'warn'); event.target.value = ''; return; }
  const fileURL = URL.createObjectURL(file);
  S.activeProject.anx5PdfName = file.name;
  if (!S.activeProject.pdfData) S.activeProject.pdfData = {};
  S.activeProject.pdfData.anx5 = fileURL;
  if (window.storeProjectPdf) {
    window.storeProjectPdf('anx5', file).catch(err => console.error('Backend PDF upload failed:', err));
  }
  const pi = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pi >= 0) { S.projects[pi].anx5PdfName = file.name; if (!S.projects[pi].pdfData) S.projects[pi].pdfData = {}; S.projects[pi].pdfData.anx5 = fileURL; }
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx5') : document.getElementById('pdf-iframe-anx5'));
  const sec = document.getElementById('pdf-preview-section-anx5');
  if (iframe && sec) { iframe.src = fileURL; sec.style.display = 'block'; }
  renderPdfUploadUIAnx5();
  toast('PDF uploaded and preview loaded!', 'success');
  event.target.value = '';
}
window.handlePDFUploadAnx5 = handlePDFUploadAnx5;
document.addEventListener('DOMContentLoaded', function () {
  setTimeout(loadAnx5Headings, 50);
});
document.addEventListener('input', (e) => {
  if (e.target.closest('#view-anx5 table')) {
    if (window.anx5DebounceTimer) clearTimeout(window.anx5DebounceTimer);
    window.anx5DebounceTimer = setTimeout(() => {
       exportAnx5PDF(null, true);
    }, 1500); // 1.5 seconds after typing stops
  }
});
document.addEventListener('change', (e) => {
  if (e.target.closest('#view-anx5 table')) {
    if (window.anx5DebounceTimer) clearTimeout(window.anx5DebounceTimer);
    window.anx5DebounceTimer = setTimeout(() => {
      exportAnx5PDF(null, true);
    }, 300);
  }
});
