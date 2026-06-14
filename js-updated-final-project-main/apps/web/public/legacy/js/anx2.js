/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ANNEXURE II â€” MINING LEASES
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function downloadSectionTemplateAnx2(sectionType) {
  let csvContent = "";
  let filename = "";
  switch(sectionType) {
    case 'A':
      csvContent = "River Details,Sand Bar Code,Lease Details,Area (Ha),Latitude,Longitude,Distance from PA/WC (KM),Mining leases within 500m (Yes/No),Bulk Density (gm/cc),Depth of Deposits (m),Total Excavation (MT/YR),Total Excavation (Net 60%),Mineral to be mined,Existing/Proposed,Remarks\n";
      filename = "Table_A_Leases_Template.csv";
      break;
    case 'B':
      csvContent = "Owner Name,Sy.No (Khasra No),Area (Ha),Latitude,Longitude,District,Tehsil,Village,Total Reserve (MT),Total Mineral (60%),Existing/Proposed,Remarks\n";
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
function handleSectionUploadAnx2(event, sectionType) {
  const file = event.target.files[0];
  if (!file) return;
  const input = event.target;
  const sectionBlock = input.closest('.anx-section') || input.closest('.section-a-block');
  const table = sectionBlock ? sectionBlock.querySelector('table') : null;
  const targetTableId = table ? table.id : '';
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
      if (rows.length === 0) {
        toast("The uploaded file is empty.", "warn");
        return;
      }
      processExcelDataAnx2(rows, sectionType, targetTableId);
    } catch (error) {
      toast("Error parsing file. Please ensure it is a valid Excel or CSV file.", "error");
      console.error(error);
    }
    event.target.value = ''; 
  };
  reader.readAsArrayBuffer(file);
}
function processExcelDataAnx2(rows, sectionType, tableId) {
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
    if (sectionType === 'A') tableId = 'anx2-leases';
    if (sectionType === 'B') tableId = 'anx2-patta';
    if (sectionType === 'C') tableId = 'anx2-desilt';
    if (sectionType === 'D') tableId = 'anx2-msand';
  }
  const uploadRows = [];
  dataRows.forEach((rowData, index) => {
    while (rowData.length < 18) rowData.push(""); 
    const isReadOnly = isUserReadOnly();
    let cellDataArray = [];
    const actionBtn = `<button class='btn btn-xs btn-danger' onclick='delRowAnx2(this)' style='display:${isReadOnly ? 'none' : 'inline-flex'};align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>`;
    if (sectionType === 'A') {
      let slNo = String(index + 1);
      let area = parseFloat(rowData[3]) || 0; 
      let bulkDensity = parseFloat(rowData[8]) || 1.54;
      let depth = parseFloat(rowData[9]) || 3.0;
      let gross = area * 10000 * depth * bulkDensity;
      let net = gross * 0.60;
      let withinVal = String(rowData[7] || "").trim();
      let epVal = String(rowData[13] || "").trim().toLowerCase();
      let epSelect = `<select ${isReadOnly ? 'disabled' : ''}><option ${epVal === 'existing' || epVal !== 'proposed' ? 'selected' : ''}>Existing</option><option ${epVal === 'proposed' ? 'selected' : ''}>Proposed</option></select>`;
      cellDataArray = [
        slNo,
        rowData[0], // River Details
        rowData[1], // Sand Bar Code
        rowData[2], // Lease Details
        area.toString(), // Area
        rowData[4], // Latitude
        rowData[5], // Longitude
        rowData[6], // Distance
        withinVal,  // Within 500m
        bulkDensity.toString(),
        depth.toString(),
        gross.toFixed(2),
        net.toFixed(2),
        rowData[12] || "Sand", // Mineral
        epSelect,
        rowData[14], // Remarks
        actionBtn
      ];
    } 
    else if (sectionType === 'B') {
      let slNo = String(index + 1);
      let area = parseFloat(rowData[2]) || 0;
      let reserve = Math.round(area * 10000 * 3 * 1.52);
      let mineral = Math.round(reserve * 0.60);
      let epVal = String(rowData[10] || "").trim().toLowerCase();
      let epSelect = `<select ${isReadOnly ? 'disabled' : ''}><option ${epVal === 'existing' || epVal !== 'proposed' ? 'selected' : ''}>Existing</option><option ${epVal === 'proposed' ? 'selected' : ''}>Proposed</option></select>`;
      cellDataArray = [
        slNo,
        rowData[0], // Owner
        rowData[1], // Sy.No
        area.toString(),
        rowData[3], // Latitude
        rowData[4], // Longitude
        rowData[5] || "Jalandhar", // District
        rowData[6], // Tehsil
        rowData[7], // Village
        reserve.toString(),
        mineral.toString(),
        epSelect,
        rowData[11], // Remarks
        actionBtn
      ];
    } 
    else if (sectionType === 'C') {
      let epVal = String(rowData[9] || "").trim().toLowerCase();
      let epSelect = `<select ${isReadOnly ? 'disabled' : ''}><option ${epVal === 'existing' || epVal !== 'proposed' ? 'selected' : ''}>Existing</option><option ${epVal === 'proposed' ? 'selected' : ''}>Proposed</option></select>`;
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
      let epSelect = `<select ${isReadOnly ? 'disabled' : ''}><option ${epVal === 'existing' || epVal !== 'proposed' ? 'selected' : ''}>Existing</option><option ${epVal === 'proposed' ? 'selected' : ''}>Proposed</option></select>`;
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
    rbacApplyExcelRowsToTable(tableId, uploadRows, row => addRowAnx2(tableId, row));
  } else {
    const tbody = document.getElementById(tableId).querySelector('tbody');
    tbody.innerHTML = '';
    uploadRows.forEach(row => addRowAnx2(tableId, row));
  }
  if (sectionType === 'B') updatePattaGrandTotals();
  if (sectionType === 'C') updateDesiltGrandTotals();
  toast(`Uploaded section ${sectionType} data successfully`, 'success');
}
function addRowAnx2(tableId, cellDataArray) {
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
      if (isUserReadOnly()) {
        td.contentEditable = "false";
        td.style.backgroundColor = 'var(--off)';
        td.style.cursor = 'not-allowed';
      } else {
        td.contentEditable = "true";
      }
      td.textContent = dataStr;
      if (tableId.startsWith('anx2-leases')) {
        if (index === 4 || index === 9 || index === 10) {
          td.addEventListener('input', function() { calcLeaseRow(this); });
        }
      } else if (tableId === 'anx2-patta') {
        if (index === 3) {
          td.addEventListener('input', function() { calcPattaRow(this); });
        }
      } else if (tableId === 'anx2-desilt') {
        if (index === 7) {
          td.addEventListener('input', function() { calcDesiltRow(this); });
        }
      }
    } else {
      td.innerHTML = dataStr;
    }
    tr.appendChild(td);
  });
  if (tableId.startsWith('anx2-leases')) {
    tr.children[11].classList.add('calc-total');
    tr.children[12].classList.add('calc-net');
    tr.children[11].contentEditable = "false";
    tr.children[12].contentEditable = "false";
  }
  else if(tableId === 'anx2-patta') {
    tr.children[9].classList.add('p-reserve');
    tr.children[10].classList.add('p-min');
    tr.children[9].addEventListener('input', updatePattaGrandTotals);
    tr.children[10].addEventListener('input', updatePattaGrandTotals);
  }
  else if(tableId === 'anx2-desilt') {
    tr.children[7].addEventListener('input', updateDesiltGrandTotals);
  }
  tbody.appendChild(tr);
  if (window.initLucide) window.initLucide();
}
function calcLeaseRow(element) {
  const row = element.closest('tr');
  const cells = row.cells;
  const area = parseFloat(cells[4].innerText) || 0;
  const bulkDensity = parseFloat(cells[9].innerText) || 0;
  const depth = parseFloat(cells[10].innerText) || 0;
  const gross = area * 10000 * depth * bulkDensity;
  const net = gross * 0.60;
  cells[11].innerText = gross > 0 ? gross.toFixed(2) : "0.00";
  cells[12].innerText = net > 0 ? net.toFixed(2) : "0.00";
}
function calcPattaRow(element) {
  const row = element.closest('tr');
  const cells = row.cells;
  const area = parseFloat(cells[3].innerText) || 0;
  const reserve = Math.round(area * 10000 * 3 * 1.52);
  const mineral = Math.round(reserve * 0.60);
  cells[9].innerText = reserve;
  cells[10].innerText = mineral;
  updatePattaGrandTotals();
}
function calcDesiltRow(element) {
  updateDesiltGrandTotals();
}
function updatePattaGrandTotals() {
  const table = document.getElementById('anx2-patta');
  if (!table) return;
  let areaSum = 0, resSum = 0, minSum = 0;
  table.querySelectorAll('tbody tr').forEach(tr => {
    areaSum += parseFloat(tr.children[3].innerText) || 0;
    resSum += parseFloat(tr.querySelector('.p-reserve')?.innerText || tr.children[9].innerText) || 0;
    minSum += parseFloat(tr.querySelector('.p-min')?.innerText || tr.children[10].innerText) || 0;
  });
  const sumAreaEl = document.getElementById('patta-sum-area');
  const sumReserveEl = document.getElementById('patta-sum-reserve');
  const sumMineralEl = document.getElementById('patta-sum-mineral');
  if (sumAreaEl) sumAreaEl.innerText = areaSum.toFixed(2);
  if (sumReserveEl) sumReserveEl.innerText = resSum.toFixed(0);
  if (sumMineralEl) sumMineralEl.innerText = minSum.toFixed(2);
}
function updatePattaTotals() {
  updatePattaGrandTotals();
}
function updateDesiltGrandTotals() {
  const table = document.getElementById('anx2-desilt');
  if (!table) return;
  let sizeSum = 0;
  table.querySelectorAll('tbody tr').forEach(tr => {
    sizeSum += parseFloat(tr.children[7].innerText) || 0;
  });
  const sumSizeEl = document.getElementById('desilt-sum-size');
  if (sumSizeEl) sumSizeEl.innerText = sizeSum.toFixed(2);
}
function updateDesiltTotals() {
  updateDesiltGrandTotals();
}
function delRowAnx2(btn) {
  const table = btn.closest('table');
  const tableId = table.id;
  btn.closest('tr').remove();
  if (tableId === 'anx2-patta') {
    updatePattaGrandTotals();
  } else if (tableId === 'anx2-desilt') {
    updateDesiltGrandTotals();
  }
}
function addNewLeaseRow(btn) {
  const tableId = btn.closest('.anx-section').querySelector('table').id;
  const isReadOnly = isUserReadOnly();
  addRowAnx2(tableId, ['', '', '', '', '0', '', '', '', '', '1.54', '3.00', '0.00', '0.00', 'Sand', `<select ${isReadOnly ? 'disabled' : ''}><option>Existing</option><option>Proposed</option></select>`, '', `<button class='btn btn-xs btn-danger' onclick='delRowAnx2(this)' style='display:${isReadOnly ? 'none' : 'inline-flex'};align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>`]);
}
let sectionACount = 1;
function addSectionABlock() {
  sectionACount++;
  const wrapper = document.getElementById('section-a-wrapper');
  const originalBlock = wrapper.querySelector('.section-a-block'); 
  const newBlock = originalBlock.cloneNode(true);
  newBlock.querySelector('.rm-sec-a-btn').style.display = 'inline-flex';
  const title = newBlock.querySelector('.anx-section-title');
  title.innerText = `a) Potential Mining Leases (Existing & Proposed) Rivers - Table ${sectionACount}:`;
  const newTable = newBlock.querySelector('table');
  newTable.id = 'anx2-leases-' + sectionACount;
  const tbody = newTable.querySelector('tbody');
  tbody.innerHTML = '';
  wrapper.appendChild(newBlock);
  addNewLeaseRow(newBlock.querySelector('.section-footer button'));
}
function getCellText(td) {
  const select = td.querySelector('select');
  if (select) return select.value;
  return td.innerText.trim();
}
function exportAnx2PDF(btn, isLivePreview = false) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'pt', 'a4'); 
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let startY = 80;
  const drawHeaderFooter = (data) => {
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Page " + data.pageNumber, pageWidth / 2, pageHeight - 20, { align: "center" });
  };
  const extractData = (tableId) => {
    const tbl = document.getElementById(tableId);
    const headers = Array.from(tbl.querySelectorAll('thead th')).slice(0, -1).map(th => th.innerText.trim().replace(/\n/g, ' '));
    const rows = [];
    tbl.querySelectorAll('tbody tr').forEach(tr => {
      const row = [];
      const tds = tr.querySelectorAll('td');
      for (let i = 0; i < tds.length - 1; i++) {
        row.push(getCellText(tds[i]));
      }
      rows.push(row);
    });
    return { headers, rows };
  };
  const sectionABlocks = document.querySelectorAll('.section-a-block');
  sectionABlocks.forEach((block, index) => {
    if (index > 0) {
      doc.addPage();
      startY = 80;
    }
    if (index === 0) {
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Annexure-II", pageWidth - 40, 55, { align: "right" }); // Top right annexure label
    }
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const titleExt = sectionABlocks.length > 1 ? ` (Table ${index + 1})` : '';
    doc.text(`> List of Potential Mining Leases (Existing & Proposed) Rivers${titleExt}:`, 40, startY);
    startY += 15;
    const tableId = block.querySelector('table').id;
    const leaseData = extractData(tableId);
    doc.autoTable({
      startY: startY,
      head: [leaseData.headers],
      body: leaseData.rows,
      theme: 'grid',
      styles: { font: 'times', fontSize: 8, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 3, valign: 'middle', halign: 'center' },
      headStyles: { fillColor: false, fontStyle: 'bold', halign: 'center', textColor: 0 },
      columnStyles: {
        5: { cellWidth: 70 }, // Latitude wrap
        6: { cellWidth: 70 }, // Longitude wrap
      },
      didDrawPage: (data) => drawHeaderFooter(data)
    });
    startY = doc.lastAutoTable.finalY + 15;
  });
  doc.addPage();
  startY = 80;
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("> Patta Lands/Khatedari Land: (Existing & Proposed):", 40, startY);
  startY += 15;
  const pattaData = extractData('anx2-patta');
  doc.autoTable({
    startY: startY,
    head: [pattaData.headers],
    body: pattaData.rows,
    foot: [
      [{content: 'Total', colSpan: 3, styles: {halign: 'center', fontStyle: 'bold'}},
       {content: document.getElementById('patta-sum-area').innerText, styles: {fontStyle: 'bold'}},
       '', '', '', '', '',
       {content: document.getElementById('patta-sum-reserve').innerText, styles: {fontStyle: 'bold'}},
       {content: document.getElementById('patta-sum-mineral').innerText, styles: {fontStyle: 'bold'}},
       '', '']
    ],
    theme: 'grid',
    styles: { font: 'times', fontSize: 8, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 3, valign: 'middle', halign: 'center' },
    headStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 },
    footStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 },
    didDrawPage: (data) => drawHeaderFooter(data)
  });
  startY = doc.lastAutoTable.finalY + 15;
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.text("(Reference: Table of the Proforma for the district of Jalandhar , Page no 560 -563 )", pageWidth - 40, startY, {align: 'right'});
  startY += 20;
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("> De-Siltation Location: (Lakes/Ponds/Dams etc.) (Existing & Proposed)", 40, startY);
  startY += 15;
  const desiltData = extractData('anx2-desilt');
  doc.autoTable({
    startY: startY,
    head: [desiltData.headers],
    body: desiltData.rows,
    foot: [
      [{content: 'Total', colSpan: 7, styles: {halign: 'center', fontStyle: 'bold'}},
       {content: document.getElementById('desilt-sum-size').innerText, styles: {fontStyle: 'bold'}},
       '', '']
    ],
    theme: 'grid',
    styles: { font: 'times', fontSize: 8, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 3, valign: 'middle', halign: 'center' },
    headStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 },
    footStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 }
  });
  startY = doc.lastAutoTable.finalY + 15;
  doc.setFont("times", "bold");
  doc.text("Note: The quantity of De-silting shall be assessed as per actual site conditions at the time of de-silting and got approved from the competent authority.", pageWidth / 2, startY, {align: 'center'});
  startY += 30;
  doc.setFontSize(11);
  doc.text("> M-Sand Plants : ( Existing & Proposed)", 40, startY);
  startY += 15;
  const msandData = extractData('anx2-msand');
  doc.autoTable({
    startY: startY,
    head: [msandData.headers],
    body: msandData.rows,
    theme: 'grid',
    styles: { font: 'times', fontSize: 8, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 3, valign: 'middle', halign: 'center' },
    headStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 },
    margin: { left: doc.internal.pageSize.getWidth()/2 - 300, right: doc.internal.pageSize.getWidth()/2 - 300 } 
  });
  if (isLivePreview) {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx2') : document.getElementById('pdf-iframe-anx2'));
    if (iframe) iframe.src = blobUrl;
  } else {
    doc.save('Annexure_II_Mining_Leases.pdf');
    toast('PDF downloaded successfully!', 'success');
  }
}
function renderPdfUploadUIAnx2() {
  const nameEl = document.getElementById('anx2-uploaded-filename');
  const dlBtn = document.getElementById('anx2-download-btn');
  const delBtn = document.getElementById('anx2-delete-btn');
  const previewBtn = document.getElementById('anx2-preview-btn');
  const previewSection = document.getElementById('pdf-preview-section-anx2');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx2') : document.getElementById('pdf-iframe-anx2'));
  if (!nameEl || !dlBtn) return;
  if (!S.activeProject) {
    nameEl.style.display = 'none';
    dlBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none';
    if (previewBtn) previewBtn.style.display = 'none';
    if (previewSection) previewSection.style.display = 'none';
    return;
  }
  const pdfName = S.activeProject.anx2PdfName;
  if (!pdfName) {
    nameEl.style.display = 'none';
    dlBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none';
    if (previewBtn) previewBtn.style.display = 'none';
    if (previewSection) {
      previewSection.style.display = 'none';
      if (iframe) iframe.src = 'about:blank';
    }
  } else {
    nameEl.textContent = pdfName;
    nameEl.style.display = 'inline-block';
    dlBtn.style.display = 'inline-flex';
    if (delBtn) delBtn.style.display = !isUserReadOnly() ? 'inline-flex' : 'none';
    if (previewBtn) previewBtn.style.display = 'inline-flex';
    if (previewSection && previewSection.style.display === 'block' && iframe) {
      if (S.activeProject.pdfData && S.activeProject.pdfData.anx2) {
        if (iframe.src !== S.activeProject.pdfData.anx2) {
          iframe.src = S.activeProject.pdfData.anx2;
        }
      }
    }
  }
  if (window.initLucide) window.initLucide();
}
window.renderPdfUploadUIAnx2 = renderPdfUploadUIAnx2;
function togglePDFPreviewAnx2() {
  const previewSection = document.getElementById('pdf-preview-section-anx2');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx2') : document.getElementById('pdf-iframe-anx2'));
  if (!previewSection || !iframe) return;
  if (previewSection.style.display === 'block') {
    previewSection.style.display = 'none';
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  } else {
    if (S.activeProject && S.activeProject.pdfData && S.activeProject.pdfData.anx2) {
      iframe.src = S.activeProject.pdfData.anx2;
      previewSection.style.display = 'block';
    } else {
      toast('No PDF preview available. Please re-upload.', 'warn');
    }
  }
}
async function deletePdfAnx2() {
  if (!S.activeProject) return;
  if (!confirm("Are you sure you want to delete the uploaded PDF? This will remove the file from the server.")) {
    return;
  }
  const previewSection = document.getElementById('pdf-preview-section-anx2');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx2') : document.getElementById('pdf-iframe-anx2'));
  if (previewSection) previewSection.style.display = 'none';
  if (iframe) {
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  }
  toast("Deleting PDF...", "info");
  S.activeProject.anx2PdfName = null;
  if (S.activeProject.pdfData) {
    if (S.activeProject.pdfData.anx2 && S.activeProject.pdfData.anx2.startsWith('blob:')) {
       URL.revokeObjectURL(S.activeProject.pdfData.anx2);
    }
    S.activeProject.pdfData.anx2 = null;
  }
  const pIdx = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pIdx !== -1) {
    S.projects[pIdx].anx2PdfName = null;
    if (S.projects[pIdx].pdfData) S.projects[pIdx].pdfData.anx2 = null;
  }
  renderPdfUploadUIAnx2();
  toast("PDF deleted successfully.", "success");
}
function handlePDFUploadAnx2(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    toast('Error: Only PDF files are allowed.', 'danger');
    event.target.value = '';
    return;
  }
  toast('Uploading PDF...', 'info');
  const fileURL = URL.createObjectURL(file);
  S.activeProject.anx2PdfName = file.name;
  if (!S.activeProject.pdfData) S.activeProject.pdfData = {};
  S.activeProject.pdfData.anx2 = fileURL;
  if (window.storeProjectPdf) {
    window.storeProjectPdf('anx2', file).catch(err => console.error('Backend PDF upload failed:', err));
  }
  if (window.renderPdfToImages) {
    window.renderPdfToImages(file, (err, imgs) => {
      if (!err && imgs) {
        if (!S.uploadedPDFs) S.uploadedPDFs = {};
        S.uploadedPDFs.anx2 = imgs;
        if (window.debouncedSaveState) window.debouncedSaveState();
      }
    });
  }
  const pIdx = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pIdx !== -1) {
    S.projects[pIdx].anx2PdfName = file.name;
    if (!S.projects[pIdx].pdfData) S.projects[pIdx].pdfData = {};
    S.projects[pIdx].pdfData.anx2 = fileURL;
  }
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx2') : document.getElementById('pdf-iframe-anx2'));
  if (iframe) {
    iframe.src = fileURL;
  }
  renderPdfUploadUIAnx2();
  toast('PDF uploaded and preview loaded!', 'success');
  event.target.value = '';
}
function closePDFPreviewAnx2() {
  const previewSection = document.getElementById('pdf-preview-section-anx2');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx2') : document.getElementById('pdf-iframe-anx2'));
  if (previewSection) previewSection.style.display = 'none';
  if (iframe) {
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  }
}
function downloadPdfAnx2() {
  if (!S.activeProject) {
    toast('Please select and open a project first.', 'warn');
    return;
  }
  if (!S.activeProject.anx2PdfName) {
    toast('No PDF has been uploaded for this project yet. Please upload a PDF first.', 'warn');
    return;
  }
  if (window.downloadStoredPdf) {
    downloadStoredPdf('anx2', S.activeProject.anx2PdfName, S.activeProject.pdfData?.anx2);
    return;
  }
  const a = document.createElement('a');
  a.href = S.activeProject.pdfData.anx2;
  a.download = S.activeProject.anx2PdfName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
document.addEventListener('input', (e) => {
  if (e.target.closest('#view-anx2 table')) {
    if (window.anx2DebounceTimer) clearTimeout(window.anx2DebounceTimer);
    window.anx2DebounceTimer = setTimeout(() => {
       exportAnx2PDF(null, true);
    }, 1500); // 1.5 seconds after typing stops
  }
});
document.addEventListener('change', (e) => {
  if (e.target.closest('#view-anx2 table')) {
    if (window.anx2DebounceTimer) clearTimeout(window.anx2DebounceTimer);
    window.anx2DebounceTimer = setTimeout(() => {
      exportAnx2PDF(null, true);
    }, 300);
  }
});
window.exportAnx2PDF = exportAnx2PDF;
