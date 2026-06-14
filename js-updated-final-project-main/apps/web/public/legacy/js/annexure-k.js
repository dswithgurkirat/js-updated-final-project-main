/* ANNEXURE K - PROFORMA AUCTIONED SITES & ANNEXURE A */
const ANNEXURE_K_TABLES = {
  PROFORMA: {
    tableId: 'annexure-k-proforma',
    containerId: 'annexure-k-proforma-container',
    filename: 'Proforma_Auctioned_Sites_Template.csv',
    headers: [
      'Sr No.',
      'Site Name',
      'Type of Mine',
      'Date of Grant of EC',
      'Date of Start of Contract',
      'Quantity Allowed per annum',
      'Quantity Extracted',
      'Balance Quantity',
      'EC Status',
      'Reason For Not Operating Site',
      'Reason for not Applying EC',
      'Remarks'
    ],
    defaultRows: [
      [1, 'Sample_Site', 'PMS', '01/01/2025', '01/02/2025', 1000, 500, 500, 'Granted', '-', '-', '-']
    ],
    emptyRow: ['', '', '', '', '', '', '', '', '', '', '', '', null],
    addLabel: 'Add Auctioned Site',
    uploadLabel: 'Upload Excel (Proforma)',
    minWidth: '1500px',
    pdfTitle: 'Proforma Auctioned Sites',
    fontSize: 5.6
  },
  ANNEXURE_A: {
    tableId: 'annexure-k-annexure-a',
    containerId: 'annexure-k-annexure-a-container',
    filename: 'Annexure_A_Template.csv',
    headers: [
      'Source',
      'No. of proposed sites',
      'Area (Ha)',
      'Total excavation in Tonnes',
      'Total excavation in Tonnes (Considering 60% as per EMGSM, 2020)'
    ],
    defaultRows: [
      ['River bed (Existing)', 1, 100, 100000, 60000]
    ],
    emptyRow: ['', '', '', '', '', null],
    addLabel: 'Add Annexure A Row',
    uploadLabel: 'Upload Excel (Annexure A)',
    minWidth: '1000px',
    pdfTitle: 'Annexure A',
    fontSize: 8
  }
};
function annexureKDeleteButtonHTML() {
  const isReadOnly = typeof isUserReadOnly === 'function' ? isUserReadOnly() : !(window.S && (S.role === 'user' || S.role === 'admin'));
  return `<button class='btn btn-xs btn-danger' onclick='delRowAnnexureK(this)' style='display:${isReadOnly ? 'none' : 'inline-flex'};align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>`;
}
function annexureKCellValue(td) {
  const select = td.querySelector('select');
  if (select) return select.value;
  return td.innerText.trim();
}
function annexureKToCSVValue(value) {
  const text = String(value === undefined || value === null ? '' : value);
  return `"${text.replace(/"/g, '""')}"`;
}
function resolveAnnexureKTable(target, sectionType) {
  if (target && typeof target === 'string') return document.getElementById(target);
  if (target && target.nodeType === 1) {
    if (target.matches('table')) return target;
    const blockTable = target.closest('.annexure-k-table-block')?.querySelector('table');
    if (blockTable) return blockTable;
  }
  const cfg = ANNEXURE_K_TABLES[sectionType];
  return cfg ? document.getElementById(cfg.tableId) : null;
}
function getAnnexureKTables(sectionType) {
  const cfg = ANNEXURE_K_TABLES[sectionType];
  if (!cfg) return [];
  const container = document.getElementById(cfg.containerId);
  if (container) {
    const tables = Array.from(container.querySelectorAll(`table.annexure-k-table[data-section-type="${sectionType}"]`));
    if (tables.length) return tables;
  }
  const table = document.getElementById(cfg.tableId);
  return table ? [table] : [];
}
function getAnnexureKEmptyRow(sectionType) {
  const cfg = ANNEXURE_K_TABLES[sectionType];
  if (!cfg) return [];
  const row = cfg.emptyRow.slice();
  row[row.length - 1] = annexureKDeleteButtonHTML();
  return row;
}
function downloadSectionTemplateAnnexureK(sectionType) {
  const cfg = ANNEXURE_K_TABLES[sectionType];
  if (!cfg) return;
  const defaultRows = (cfg.defaultRows || []).map(row => row.map(annexureKToCSVValue).join(','));
  const csvContent = [
    cfg.headers.map(annexureKToCSVValue).join(','),
    ...defaultRows
  ].join('\n') + '\n';
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', cfg.filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
function handleSectionUploadAnnexureK(event, sectionType) {
  const file = event.target.files[0];
  if (!file) return;
  const table = resolveAnnexureKTable(event.target, sectionType);
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (!rows.length) {
        toast('The uploaded file is empty.', 'warn');
        return;
      }
      processExcelDataAnnexureK(rows, sectionType, table);
    } catch (error) {
      toast('Error parsing file. Please ensure it is a valid Excel or CSV file.', 'error');
      console.error(error);
    }
    event.target.value = '';
  };
  reader.readAsArrayBuffer(file);
}
function processExcelDataAnnexureK(rows, sectionType, targetTable) {
  const cfg = ANNEXURE_K_TABLES[sectionType];
  if (!cfg) return;
  const validRows = rows.filter(row => row.some(cell => String(cell === undefined || cell === null ? '' : cell).trim() !== ''));
  const headerIdx = validRows.findIndex(row => annexureKLooksLikeHeader(row, sectionType));
  const startIndex = headerIdx >= 0 ? headerIdx + 1 : 0;
  const dataRows = validRows.slice(startIndex);
  if (!dataRows.length) {
    toast('No data found after the header in the uploaded file.', 'warn');
    return;
  }
  const table = targetTable || document.getElementById(cfg.tableId);
  const tbody = table ? table.querySelector('tbody') : null;
  if (!tbody) return;
  const uploadRows = dataRows.map((rowData, index) => normalizeAnnexureKRow(rowData, sectionType, index));
  if (typeof rbacApplyExcelRowsToTable === 'function') {
    rbacApplyExcelRowsToTable(table, uploadRows, row => addRowAnnexureK(table, row));
  } else {
    tbody.innerHTML = '';
    uploadRows.forEach(row => addRowAnnexureK(table, row));
  }
  toast(`Uploaded Annexure K ${sectionType === 'PROFORMA' ? 'proforma' : 'annexure a'} data successfully`, 'success');
  if (window.debouncedSaveState) window.debouncedSaveState();
  if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-k') {
    exportAnnexureKPDF(null, true);
  }
}
function annexureKLooksLikeHeader(row, sectionType) {
  const rowStr = row.map(c => String(c || '')).join(' ').toLowerCase();
  if (sectionType === 'PROFORMA') return rowStr.includes('site name') || rowStr.includes('ec status') || rowStr.includes('quantity extracted');
  if (sectionType === 'ANNEXURE_A') return rowStr.includes('source') || rowStr.includes('proposed sites') || rowStr.includes('excavation');
  return false;
}
function normalizeAnnexureKRow(rowData, sectionType, index) {
  const row = Array.from(rowData);
  const del = annexureKDeleteButtonHTML();
  if (sectionType === 'PROFORMA') {
    while (row.length < 12) row.push('');
    return [
      row[0] || String(index + 1),
      row[1],
      row[2],
      row[3],
      row[4],
      row[5],
      row[6],
      row[7],
      row[8],
      row[9],
      row[10],
      row[11],
      del
    ];
  }
  while (row.length < 5) row.push('');
  return [row[0], row[1], row[2], row[3], row[4], del];
}
function addRowAnnexureK(tableId, cellDataArray) {
  const table = resolveAnnexureKTable(tableId);
  const tbody = table ? table.querySelector('tbody') : null;
  if (!tbody) return;
  const tr = document.createElement('tr');
  cellDataArray.forEach((data) => {
    const td = document.createElement('td');
    const dataStr = String(data === undefined || data === null ? '' : data).trim();
    if (dataStr.includes('<button') || dataStr.includes('<select')) {
      td.innerHTML = dataStr;
    } else {
      td.textContent = dataStr;
      const isReadOnly = typeof isUserReadOnly === 'function' ? isUserReadOnly() : !(window.S && (S.role === 'user' || S.role === 'admin'));
      td.contentEditable = isReadOnly ? 'false' : 'true';
      if (isReadOnly) {
        td.style.backgroundColor = 'var(--off)';
        td.style.cursor = 'not-allowed';
      }
    }
    tr.appendChild(td);
  });
  tbody.appendChild(tr);
  if (window.initLucide) window.initLucide();
}
function delRowAnnexureK(btn) {
  const row = btn.closest('tr');
  if (!row) return;
  row.remove();
  if (window.debouncedSaveState) window.debouncedSaveState();
  if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-k') {
    exportAnnexureKPDF(null, true);
  }
}
function renumberAnnexureKTableBlocks(sectionType) {
  const cfg = ANNEXURE_K_TABLES[sectionType];
  const container = cfg ? document.getElementById(cfg.containerId) : null;
  if (!container) return;
  const blocks = container.querySelectorAll('.annexure-k-table-block');
  blocks.forEach((block, index) => {
    const title = block.querySelector('.annexure-k-block-title');
    const delBtn = block.querySelector('.annexure-k-delete-table');
    if (title) title.textContent = index === 0 ? '' : `Table ${index + 1}`;
    if (delBtn) delBtn.style.display = blocks.length <= 1 ? 'none' : 'inline-flex';
  });
}
function deleteAnnexureKTableBlock(btn) {
  const block = btn.closest('.annexure-k-table-block');
  if (!block) return;
  const sectionType = block.getAttribute('data-section-type');
  const cfg = ANNEXURE_K_TABLES[sectionType];
  const container = cfg ? document.getElementById(cfg.containerId) : null;
  if (!container) return;
  if (container.querySelectorAll('.annexure-k-table-block').length <= 1) {
    toast('You cannot delete the last remaining table.', 'warn');
    return;
  }
  if (confirm('Are you sure you want to delete this entire table block?')) {
    block.remove();
    renumberAnnexureKTableBlocks(sectionType);
    toast('Table block deleted.', 'success');
    if (window.debouncedSaveState) window.debouncedSaveState();
    if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-k') {
      exportAnnexureKPDF(null, true);
    }
  }
}
function addAnnexureKTableBlock(sectionType) {
  const cfg = ANNEXURE_K_TABLES[sectionType];
  const container = cfg ? document.getElementById(cfg.containerId) : null;
  const firstTable = document.getElementById(cfg?.tableId);
  if (!cfg || !container || !firstTable) return;
  const tableIdx = container.querySelectorAll('.annexure-k-table-block').length + 1;
  const newTableId = `${cfg.tableId}-${tableIdx}`;
  const headerHtml = Array.from(firstTable.querySelectorAll('thead th')).map(th => th.outerHTML).join('');
  const blockHtml = `
    <div class="annexure-k-table-block" data-section-type="${sectionType}" style="margin-top:18px; padding-top:18px; border-top:1px dashed var(--border);">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
        <div class="annexure-k-block-title" style="font-size:12px; font-weight:700; color:var(--text-mid);">Table ${tableIdx}</div>
        <button class="btn btn-xs btn-danger annexure-k-delete-table" onclick="deleteAnnexureKTableBlock(this)" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
          <span>Delete Table</span>
        </button>
      </div>
      <div style="font-size:12px; font-weight:700; color:var(--text-soft); margin-bottom:8px;">Example input values from ${sectionType === 'PROFORMA' ? 'Proforma_Template_One_Example.xlsx' : 'Annexure_A_Template_One_Example.xlsx'}</div>
      <div class="tbl-wrap">
        <table class="anx-tbl annexure-k-table" data-section-type="${sectionType}" id="${newTableId}" style="min-width:${cfg.minWidth}">
          <thead><tr>${headerHtml}</tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="section-footer" style="margin-top:12px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button class="btn btn-xs btn-outline" onclick="addRowAnnexureK(this,getAnnexureKEmptyRow('${sectionType}'))" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="plus" style="width:12px; height:12px;"></i>
          <span>${cfg.addLabel}</span>
        </button>
        <label class="btn btn-excel-upload btn-xs" style="cursor:pointer; display:inline-flex; align-items:center; gap:6px; margin-bottom:0;">
          <i data-lucide="upload" style="width:12px; height:12px;"></i>
          <span>${cfg.uploadLabel}</span>
          <input type="file" accept=".xlsx,.xls,.csv" hidden onchange="handleSectionUploadAnnexureK(event, '${sectionType}')">
        </label>
      </div>
    </div>`;
  container.insertAdjacentHTML('beforeend', blockHtml);
  (cfg.defaultRows || [getAnnexureKEmptyRow(sectionType)]).forEach((rowData, index) => {
    addRowAnnexureK(document.getElementById(newTableId), normalizeAnnexureKRow(rowData, sectionType, index));
  });
  renumberAnnexureKTableBlocks(sectionType);
  if (typeof applyMoreAnnexureAccess === 'function') applyMoreAnnexureAccess(document.getElementById('view-annexure-k'));
  if (window.initLucide) window.initLucide();
  if (window.debouncedSaveState) window.debouncedSaveState();
  if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-k') {
    exportAnnexureKPDF(null, true);
  }
}
function extractAnnexureKTable(tableId) {
  const table = typeof tableId === 'string' ? document.getElementById(tableId) : tableId;
  if (!table) return { headers: [], rows: [] };
  const headers = Array.from(table.querySelectorAll('thead th'))
    .slice(0, -1)
    .map(th => th.innerText.trim().replace(/\n/g, ' '));
  const rows = [];
  table.querySelectorAll('tbody tr').forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td')).slice(0, -1);
    rows.push(cells.map(annexureKCellValue));
  });
  return { headers, rows };
}
async function exportAnnexureKPDF(btn, isLivePreview = false) {
  if (typeof btn === 'boolean') {
    isLivePreview = btn;
    btn = null;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const border = { x: 30, y: 14, w: pageWidth - 60, h: pageHeight - 42 };
  const tableLeft = 36;
  const tableWidth = pageWidth - (tableLeft * 2);
  const headerLeft = tableLeft + 4;
  const footerY = pageHeight - 38;
  const pageNumberOffset = 490;
  const district = (S.activeProject && S.activeProject.district) || 'Jalandhar';
  const state = (S.activeProject && S.activeProject.state) || 'Punjab';
  const CONTENT_TOP = 72;
  let startY = CONTENT_TOP;
  const drawReportFrame = (data) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.rect(border.x, border.y, border.w, border.h);
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('District Survey Report', headerLeft, 27);
    doc.text(`${district} District`, headerLeft, 39);
    doc.text(state, headerLeft, 51);
    doc.setLineWidth(0.4);
    doc.line(headerLeft, 62, pageWidth - 32, 62);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.text('PREPARED BY:', pageWidth / 2 - 130, footerY - 2, { align: 'left' });
    doc.setFont('times', 'bold');
    doc.text(` SUB-DIVISIONAL COMMITTEE OF ${district.toUpperCase()} DISTRICT`, pageWidth / 2 - 76, footerY - 2, { align: 'left' });
    doc.setFont('times', 'normal');
    doc.text('ASSISTED BY:', pageWidth / 2 - 130, footerY + 10, { align: 'left' });
    doc.setFont('times', 'bold');
    doc.text(' RSP GREEN DEVELOPMENT AND LABORATORIES PVT. LTD', pageWidth / 2 - 78, footerY + 10, { align: 'left' });
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text(String(pageNumberOffset + data.pageNumber), pageWidth - 26, pageHeight - 18, { align: 'right' });
  };
  const sections = ['PROFORMA', 'ANNEXURE_A'].flatMap(sectionType => {
    const cfg = ANNEXURE_K_TABLES[sectionType];
    return getAnnexureKTables(sectionType).map((table, tableIndex) => ({
      sectionType,
      title: tableIndex === 0 ? cfg.pdfTitle : `${cfg.pdfTitle} - Table ${tableIndex + 1}`,
      table,
      tableId: table.id,
      fontSize: cfg.fontSize
    }));
  });
  sections.forEach((section, index) => {
    const titleHeight = 14;
    const tableStartEstimate = startY + titleHeight + 6;
    const isProforma = section.sectionType === 'PROFORMA';
    if (index > 0 && tableStartEstimate + 40 > pageHeight - 40) {
      doc.addPage();
      drawReportFrame({ pageNumber: doc.getCurrentPageInfo().pageNumber });
      startY = CONTENT_TOP;
    }
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(section.title, pageWidth / 2, startY, { align: 'center' });
    startY += titleHeight;
    const tableData = extractAnnexureKTable(section.table);
    doc.autoTable({
      startY,
      head: [tableData.headers],
      body: tableData.rows,
      theme: 'grid',
      styles: {
        font: 'times',
        fontSize: isProforma ? 4.8 : 8.5,
        textColor: 0,
        lineColor: 0,
        lineWidth: 0.4,
        cellPadding: isProforma ? 0.9 : 2.5,
        valign: 'middle',
        halign: 'left',
        overflow: 'linebreak',
        minCellHeight: 0
      },
      headStyles: {
        fillColor: false,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        textColor: 0,
        lineColor: 0,
        lineWidth: 0.4,
        cellPadding: isProforma ? 0.9 : 2.5
      },
      columnStyles: isProforma ? {
        0: { cellWidth: 22 },
        1: { cellWidth: 42 },
        2: { cellWidth: 34 },
        3: { cellWidth: 42 },
        4: { cellWidth: 44 },
        5: { cellWidth: 46 },
        6: { cellWidth: 42 },
        7: { cellWidth: 42 },
        8: { cellWidth: 34 },
        9: { cellWidth: 50 },
        10: { cellWidth: 50 },
        11: { cellWidth: 35 }
      } : {},
      margin: { top: startY, bottom: 40, left: tableLeft, right: tableLeft },
      tableWidth,
      didDrawPage: drawReportFrame
    });
    startY = doc.lastAutoTable.finalY + 18;
  });
  await appendAnnexureKAttachmentPages(doc);
  if (isLivePreview) {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('annexure-k') : document.getElementById('pdf-iframe-annexure-k-preview'));
    if (iframe) iframe.src = blobUrl;
  } else {
    doc.save('Annexure_K_Proforma_Auctioned_Sites_Annexure_A_Merged.pdf');
    toast('PDF downloaded successfully!', 'success');
  }
}
function getAnnexureKAttachment() {
  if (window.S && S.activeProject && S.activeProject.annexureKAttachment) {
    return S.activeProject.annexureKAttachment;
  }
  return window.annexureKAttachment || null;
}
function setAnnexureKAttachment(attachment) {
  window.annexureKAttachment = attachment;
  if (window.S && S.activeProject) {
    S.activeProject.annexureKAttachment = attachment;
    const pIdx = S.projects.findIndex(p => p.id === S.activeProject.id);
    if (pIdx !== -1) S.projects[pIdx].annexureKAttachment = attachment;
  }
}
function renderAttachmentUploadUIAnnexureK() {
  const el = document.getElementById('annexure-k-attachment-info');
  if (!el) return;
  const attachment = getAnnexureKAttachment();
  if (!attachment || !attachment.pages || !attachment.pages.length) {
    el.innerHTML = `
      <div style="padding:14px 16px; border:1px dashed var(--border); border-radius:var(--r-sm); color:var(--text-soft); font-size:13px; background:var(--off);">
        No supporting PDF/image uploaded yet.
      </div>`;
    return;
  }
  el.innerHTML = `
    <div class="file-item" style="margin-top:10px; background:var(--off); border:1px solid var(--border); max-width:560px; display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-radius:var(--r-sm);">
      <div style="display:flex; align-items:center; gap:8px;">
        <div class="file-icon" style="background:var(--teal-lt); color:var(--teal); padding:6px; border-radius:var(--r-xs); font-size:14px;">
          <i data-lucide="file-up" style="width:16px; height:16px;"></i>
        </div>
        <div style="line-height:1.25;">
          <div style="font-size:12px; font-weight:700; color:var(--text);">${attachment.fileName}</div>
          <div style="font-size:10.5px; color:var(--text-faint);">${attachment.fileSize || ''} - ${attachment.pages.length} page(s) will be appended</div>
        </div>
      </div>
      <button type="button" class="btn btn-xs btn-danger" onclick="deleteAttachmentAnnexureK()">Remove</button>
    </div>`;
  if (window.initLucide) window.initLucide();
}
function handleAttachmentUploadAnnexureK(event) {
  const file = event.target.files[0];
  if (!file) return;
  const sizeStr = (file.size / 1024).toFixed(1) + ' KB';
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    toast('Processing supporting PDF...', 'info');
    if (typeof renderPdfToImages !== 'function') {
      toast('PDF renderer is not available on this page.', 'error');
      event.target.value = '';
      return;
    }
    renderPdfToImages(file, (err, imgs) => {
      if (err || !imgs || !imgs.length) {
        console.error(err);
        toast('PDF render failed. Please try another PDF or upload an image.', 'error');
        event.target.value = '';
        return;
      }
      setAnnexureKAttachment({
        fileName: file.name,
        fileSize: sizeStr,
        fileType: 'pdf',
        pages: imgs
      });
      renderAttachmentUploadUIAnnexureK();
      if (window.debouncedSaveState) window.debouncedSaveState();
      toast('Supporting PDF added to Annexure K.', 'success');
      if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-k') {
        exportAnnexureKPDF(null, true);
      }
      event.target.value = '';
    });
    return;
  }
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      setAnnexureKAttachment({
        fileName: file.name,
        fileSize: sizeStr,
        fileType: 'image',
        pages: [evt.target.result]
      });
      renderAttachmentUploadUIAnnexureK();
      if (window.debouncedSaveState) window.debouncedSaveState();
      toast('Supporting image added to Annexure K.', 'success');
      if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-k') {
        exportAnnexureKPDF(null, true);
      }
      event.target.value = '';
    };
    reader.readAsDataURL(file);
    return;
  }
  toast('Unsupported file format. Please upload a PDF or image.', 'error');
  event.target.value = '';
}
function deleteAttachmentAnnexureK() {
  setAnnexureKAttachment(null);
  renderAttachmentUploadUIAnnexureK();
  if (window.debouncedSaveState) window.debouncedSaveState();
  if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-k') {
    exportAnnexureKPDF(null, true);
  }
  toast('Supporting file removed.', 'success');
}
function loadAnnexureKImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
async function appendAnnexureKAttachmentPages(doc) {
  const attachment = getAnnexureKAttachment();
  if (!attachment || !attachment.pages || !attachment.pages.length) return;
  for (const src of attachment.pages) {
    const img = await loadAnnexureKImage(src);
    doc.addPage('a4', 'p');
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const margin = 24;
    const maxW = w - margin * 2;
    const maxH = h - margin * 2;
    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const drawW = img.width * ratio;
    const drawH = img.height * ratio;
    const x = (w - drawW) / 2;
    const y = (h - drawH) / 2;
    const format = String(src).startsWith('data:image/png') ? 'PNG' : 'JPEG';
    doc.addImage(src, format, x, y, drawW, drawH);
  }
}
function renderAnnexureK() {
  renderAttachmentUploadUIAnnexureK();
  ['PROFORMA', 'ANNEXURE_A'].forEach(renumberAnnexureKTableBlocks);
  if (typeof applyMoreAnnexureAccess === 'function') applyMoreAnnexureAccess(document.getElementById('view-annexure-k'));
  if (window.initLucide) window.initLucide();
}
document.addEventListener('input', (e) => {
  if (e.target.closest('#view-annexure-k table')) {
    if (window.anxKDebounceTimer) clearTimeout(window.anxKDebounceTimer);
    window.anxKDebounceTimer = setTimeout(() => {
      exportAnnexureKPDF(null, true);
    }, 1500);
  }
});
window.annexureKDeleteButtonHTML = annexureKDeleteButtonHTML;
window.downloadSectionTemplateAnnexureK = downloadSectionTemplateAnnexureK;
window.handleSectionUploadAnnexureK = handleSectionUploadAnnexureK;
window.addRowAnnexureK = addRowAnnexureK;
window.addAnnexureKTableBlock = addAnnexureKTableBlock;
window.deleteAnnexureKTableBlock = deleteAnnexureKTableBlock;
window.getAnnexureKEmptyRow = getAnnexureKEmptyRow;
window.delRowAnnexureK = delRowAnnexureK;
window.exportAnnexureKPDF = exportAnnexureKPDF;
window.handleAttachmentUploadAnnexureK = handleAttachmentUploadAnnexureK;
window.deleteAttachmentAnnexureK = deleteAttachmentAnnexureK;
window.renderAttachmentUploadUIAnnexureK = renderAttachmentUploadUIAnnexureK;
window.renderAnnexureK = renderAnnexureK;
document.addEventListener('change', (e) => {
  if (e.target.closest('#view-annexure-k table')) {
    if (window.anxKDebounceTimer) clearTimeout(window.anxKDebounceTimer);
    window.anxKDebounceTimer = setTimeout(() => {
      exportAnnexureKPDF(null, true);
    }, 300);
  }
});
