/* ANNEXURE F - BENCH MARK, CORS & SAND GHAT COORDINATES */
const ANNEXURE_F_TABLES = {
  CORS: {
    tableId: 'annexure-f-cors',
    containerId: 'annexure-f-cors-container',
    filename: 'Annexure_F_CORS_Stations_Template.csv',
    headers: ['CORS Station Name', 'Lat', 'Lon', 'Height', 'Station Code'],
    emptyRow: ['', '', '', '', '', '', null],
    addLabel: 'Add CORS Station',
    uploadLabel: 'Upload Excel (CORS)',
    minWidth: '900px',
    pdfTitle: '> Survey of India CORS Stations:',
    fontSize: 8
  },
  BENCHMARK: {
    tableId: 'annexure-f-benchmark',
    containerId: 'annexure-f-benchmark-container',
    filename: 'Annexure_F_Benchmark_Template.csv',
    headers: ['Permanent Bench Mark', 'Coordinates', 'Elevation', 'Sandbars Code'],
    emptyRow: ['', '', '', '', '', null],
    addLabel: 'Add Benchmark',
    uploadLabel: 'Upload Excel (Benchmark)',
    minWidth: '1000px',
    pdfTitle: '> Permanent Bench Marks:',
    fontSize: 8
  },
  SAND: {
    tableId: 'annexure-f-sand',
    containerId: 'annexure-f-sand-container',
    filename: 'Annexure_F_Sand_Ghats_Coordinates_Template.csv',
    headers: ['SL.NO', 'River Details', 'Sand Bar_Code', 'Lease Details', 'Area (Ha.)', 'Latitude', 'Longitude'],
    emptyRow: ['', '', '', '', '', '', '', null],
    addLabel: 'Add Sand Ghat',
    uploadLabel: 'Upload Excel (Sand Ghats)',
    minWidth: '1200px',
    pdfTitle: '> Final Block Sand Ghats Coordinates:',
    fontSize: 7.5
  }
};
function annexureFDeleteButtonHTML() {
  const isReadOnly = typeof isUserReadOnly === 'function' ? isUserReadOnly() : !(window.S && (S.role === 'user' || S.role === 'admin'));
  return `<button class='btn btn-xs btn-danger' onclick='delRowAnnexureF(this)' style='display:${isReadOnly ? 'none' : 'inline-flex'};align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>`;
}
function annexureFCellValue(td) {
  const select = td.querySelector('select');
  if (select) return select.value;
  return td.innerText.trim();
}
function annexureFToCSVValue(value) {
  const text = String(value === undefined || value === null ? '' : value);
  return `"${text.replace(/"/g, '""')}"`;
}
function downloadSectionTemplateAnnexureF(sectionType) {
  const cfg = ANNEXURE_F_TABLES[sectionType];
  if (!cfg) return;
  const csvContent = cfg.headers.map(annexureFToCSVValue).join(',') + '\n';
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
function resolveAnnexureFTable(target, sectionType) {
  if (target && typeof target === 'string') return document.getElementById(target);
  if (target && target.nodeType === 1) {
    if (target.matches('table')) return target;
    const blockTable = target.closest('.annexure-f-table-block')?.querySelector('table');
    if (blockTable) return blockTable;
  }
  const cfg = ANNEXURE_F_TABLES[sectionType];
  return cfg ? document.getElementById(cfg.tableId) : null;
}
function getAnnexureFTables(sectionType) {
  const cfg = ANNEXURE_F_TABLES[sectionType];
  if (!cfg) return [];
  const container = document.getElementById(cfg.containerId);
  if (container) {
    const tables = Array.from(container.querySelectorAll(`table.annexure-f-table[data-section-type="${sectionType}"]`));
    if (tables.length) return tables;
  }
  const table = document.getElementById(cfg.tableId);
  return table ? [table] : [];
}
function getAnnexureFEmptyRow(sectionType) {
  const cfg = ANNEXURE_F_TABLES[sectionType];
  if (!cfg) return [];
  const row = cfg.emptyRow.slice();
  row[row.length - 1] = annexureFDeleteButtonHTML();
  return row;
}
function handleSectionUploadAnnexureF(event, sectionType) {
  const file = event.target.files[0];
  if (!file) return;
  const table = resolveAnnexureFTable(event.target, sectionType);
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
      processExcelDataAnnexureF(rows, sectionType, table);
    } catch (error) {
      toast('Error parsing file. Please ensure it is a valid Excel or CSV file.', 'error');
      console.error(error);
    }
    event.target.value = '';
  };
  reader.readAsArrayBuffer(file);
}
function processExcelDataAnnexureF(rows, sectionType, targetTable) {
  const cfg = ANNEXURE_F_TABLES[sectionType];
  if (!cfg) return;
  const validRows = rows.filter(row => row.some(cell => String(cell === undefined || cell === null ? '' : cell).trim() !== ''));
  const headerIdx = validRows.findIndex(row => annexureFLooksLikeHeader(row, sectionType));
  const startIndex = headerIdx >= 0 ? headerIdx + 1 : 0;
  const dataRows = validRows.slice(startIndex);
  if (!dataRows.length) {
    toast('No data found after the header in the uploaded file.', 'warn');
    return;
  }
  const table = targetTable || document.getElementById(cfg.tableId);
  const tbody = table ? table.querySelector('tbody') : null;
  if (!tbody) return;
  const uploadRows = dataRows.map((rowData, index) => normalizeAnnexureFRow(rowData, sectionType, index));
  if (typeof rbacApplyExcelRowsToTable === 'function') {
    rbacApplyExcelRowsToTable(table, uploadRows, row => addRowAnnexureF(table, row));
  } else {
    tbody.innerHTML = '';
    uploadRows.forEach(row => addRowAnnexureF(table, row));
  }
  toast(`Uploaded Annexure F ${sectionType.toLowerCase()} data successfully`, 'success');
  if (window.debouncedSaveState) window.debouncedSaveState();
  if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-f') {
    exportAnnexureFPDF(null, true);
  }
}
function annexureFLooksLikeHeader(row, sectionType) {
  const rowStr = row.map(c => String(c || '')).join(' ').toLowerCase();
  if (sectionType === 'CORS') return rowStr.includes('cors') || rowStr.includes('station code');
  if (sectionType === 'BENCHMARK') return rowStr.includes('bench') || rowStr.includes('elevation');
  if (sectionType === 'SAND') return rowStr.includes('sand') || rowStr.includes('lease') || rowStr.includes('river');
  return false;
}
function normalizeAnnexureFRow(rowData, sectionType, index) {
  const row = Array.from(rowData);
  const del = annexureFDeleteButtonHTML();
  if (sectionType === 'CORS') {
    while (row.length < 5) row.push('');
    return [
      String(index + 1),
      row[0],
      row[1],
      row[2],
      row[3],
      row[4],
      del
    ];
  }
  if (sectionType === 'BENCHMARK') {
    while (row.length < 4) row.push('');
    return [
      String(index + 1),
      row[0],
      row[1],
      row[2],
      row[3],
      del
    ];
  }
  while (row.length < 7) row.push('');
  return [
    row[0] || String(index + 1),
    row[1],
    row[2],
    row[3],
    row[4],
    row[5],
    row[6],
    del
  ];
}
function addRowAnnexureF(tableId, cellDataArray) {
  const table = resolveAnnexureFTable(tableId);
  const tbody = table ? table.querySelector('tbody') : null;
  if (!tbody) return;
  const tableDomId = table.id || '';
  const tr = document.createElement('tr');
  cellDataArray.forEach((data, index) => {
    const td = document.createElement('td');
    let dataStr = String(data === undefined || data === null ? '' : data).trim();
    if (dataStr === '' && !dataStr.includes('<button') && !dataStr.includes('<select')) {
      dataStr = 'NUL';
    }
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
      if (
        (tableDomId.startsWith('annexure-f-cors') && (index === 2 || index === 3)) ||
        (tableDomId.startsWith('annexure-f-benchmark') && index === 2) ||
        (tableDomId.startsWith('annexure-f-sand') && (index === 2 || index === 5 || index === 6))
      ) {
        td.classList.add('coord-input');
      }
    }
    tr.appendChild(td);
  });
  tbody.appendChild(tr);
  if (window.initLucide) window.initLucide();
}
function renumberAnnexureFTableBlocks(sectionType) {
  const cfg = ANNEXURE_F_TABLES[sectionType];
  const container = cfg ? document.getElementById(cfg.containerId) : null;
  if (!container) return;
  const blocks = container.querySelectorAll('.annexure-f-table-block');
  blocks.forEach((block, index) => {
    const title = block.querySelector('.annexure-f-block-title');
    const delBtn = block.querySelector('.annexure-f-delete-table');
    if (title) title.textContent = index === 0 ? '' : `Table ${index + 1}`;
    if (delBtn) delBtn.style.display = blocks.length <= 1 ? 'none' : 'inline-flex';
  });
}
function deleteAnnexureFTableBlock(btn) {
  const block = btn.closest('.annexure-f-table-block');
  if (!block) return;
  const sectionType = block.getAttribute('data-section-type');
  const cfg = ANNEXURE_F_TABLES[sectionType];
  const container = cfg ? document.getElementById(cfg.containerId) : null;
  if (!container) return;
  if (container.querySelectorAll('.annexure-f-table-block').length <= 1) {
    toast('You cannot delete the last remaining table.', 'warn');
    return;
  }
  if (confirm('Are you sure you want to delete this entire table block?')) {
    block.remove();
    renumberAnnexureFTableBlocks(sectionType);
    toast('Table block deleted.', 'success');
    if (window.debouncedSaveState) window.debouncedSaveState();
    if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-f') {
      exportAnnexureFPDF(null, true);
    }
  }
}
function addAnnexureFTableBlock(sectionType) {
  const cfg = ANNEXURE_F_TABLES[sectionType];
  const container = cfg ? document.getElementById(cfg.containerId) : null;
  const firstTable = document.getElementById(cfg?.tableId);
  if (!cfg || !container || !firstTable) return;
  const tableIdx = container.querySelectorAll('.annexure-f-table-block').length + 1;
  const newTableId = `${cfg.tableId}-${tableIdx}`;
  const headerHtml = Array.from(firstTable.querySelectorAll('thead th')).map(th => th.outerHTML).join('');
  const blockHtml = `
    <div class="annexure-f-table-block" data-section-type="${sectionType}" style="margin-top:18px; padding-top:18px; border-top:1px dashed var(--border);">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
        <div class="annexure-f-block-title" style="font-size:12px; font-weight:700; color:var(--text-mid);">Table ${tableIdx}</div>
        <button class="btn btn-xs btn-danger annexure-f-delete-table" onclick="deleteAnnexureFTableBlock(this)" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
          <span>Delete Table</span>
        </button>
      </div>
      <div class="tbl-wrap">
        <table class="anx-tbl annexure-f-table" data-section-type="${sectionType}" id="${newTableId}" style="min-width:${cfg.minWidth}">
          <thead><tr>${headerHtml}</tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="section-footer" style="margin-top:12px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button class="btn btn-xs btn-outline" onclick="addRowAnnexureF(this,getAnnexureFEmptyRow('${sectionType}'))" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="plus" style="width:12px; height:12px;"></i>
          <span>${cfg.addLabel}</span>
        </button>
        <label class="btn btn-excel-upload btn-xs" style="cursor:pointer; display:inline-flex; align-items:center; gap:6px; margin-bottom:0;">
          <i data-lucide="upload" style="width:12px; height:12px;"></i>
          <span>${cfg.uploadLabel}</span>
          <input type="file" accept=".xlsx,.xls,.csv" hidden onchange="handleSectionUploadAnnexureF(event, '${sectionType}')">
        </label>
      </div>
    </div>`;
  container.insertAdjacentHTML('beforeend', blockHtml);
  addRowAnnexureF(document.getElementById(newTableId), getAnnexureFEmptyRow(sectionType));
  renumberAnnexureFTableBlocks(sectionType);
  if (typeof applyMoreAnnexureAccess === 'function') applyMoreAnnexureAccess(document.getElementById('view-annexure-f'));
  if (window.initLucide) window.initLucide();
  if (window.debouncedSaveState) window.debouncedSaveState();
  if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-f') {
    exportAnnexureFPDF(null, true);
  }
}
function delRowAnnexureF(btn) {
  const row = btn.closest('tr');
  if (!row) return;
  row.remove();
  if (window.debouncedSaveState) window.debouncedSaveState();
  if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-f') {
    exportAnnexureFPDF(null, true);
  }
}
function extractAnnexureFTable(tableId) {
  const table = typeof tableId === 'string' ? document.getElementById(tableId) : tableId;
  if (!table) return { headers: [], rows: [] };
  const headers = Array.from(table.querySelectorAll('thead th'))
    .slice(0, -1)
    .map(th => th.innerText.trim().replace(/\n/g, ' '));
  const rows = [];
  table.querySelectorAll('tbody tr').forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td')).slice(0, -1);
    rows.push(cells.map(annexureFCellValue));
  });
  return { headers, rows };
}
async function exportAnnexureFPDF(btn, isLivePreview = false) {
  if (typeof btn === 'boolean') {
    isLivePreview = btn;
    btn = null;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const border = { x: 30, y: 14, w: pageWidth - 60, h: pageHeight - 42 };
  const tableLeft = 52;
  const tableWidth = pageWidth - tableLeft - 36;
  const headerLeft = tableLeft + 4;
  const footerY = pageHeight - 38;
  const pageNumberOffset = 490;
  const district = (S.activeProject && S.activeProject.district) || 'Jalandhar';
  const state = (S.activeProject && S.activeProject.state) || 'Punjab';
  const CONTENT_TOP = 72;
  let startY = CONTENT_TOP;
  const normalizeSectionTitle = (title) => String(title || '')
    .replace(/^>\s*/, '')
    .replace(/:$/, '');
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
    doc.line(tableLeft, 62, pageWidth - 32, 62);
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
  const sections = ['SAND', 'BENCHMARK', 'CORS'].flatMap(sectionType => {
    const cfg = ANNEXURE_F_TABLES[sectionType];
    return getAnnexureFTables(sectionType).map((table, tableIndex) => ({
      sectionType,
      title: tableIndex === 0 ? cfg.pdfTitle : `${cfg.pdfTitle} Table ${tableIndex + 1}`,
      table,
      tableId: table.id,
      fontSize: cfg.fontSize
    }));
  });
  sections.forEach((section, index) => {
    const titleHeight = 14;
    const tableStartEstimate = startY + titleHeight + 6;
    if (index > 0 && tableStartEstimate + 40 > pageHeight - 40) {
      doc.addPage();
      drawReportFrame({ pageNumber: doc.getCurrentPageInfo().pageNumber });
      startY = CONTENT_TOP;
    }
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(normalizeSectionTitle(section.title), pageWidth / 2, startY, { align: 'center' });
    startY += titleHeight;
    const tableData = extractAnnexureFTable(section.table);
    const columnStyles = section.tableId && section.tableId.startsWith('annexure-f-sand') ? {
      0: { cellWidth: 40 },
      1: { cellWidth: 40 },
      2: { cellWidth: 108 },
      3: { cellWidth: 52 },
      4: { cellWidth: 34 },
      5: { cellWidth: 88 },
      6: { cellWidth: 88 }
    } : {};
    doc.autoTable({
      startY,
      head: [tableData.headers],
      body: tableData.rows,
      theme: 'grid',
      styles: {
        font: 'times',
        fontSize: section.tableId && section.tableId.startsWith('annexure-f-sand') ? 9 : 8.5,
        textColor: 0,
        lineColor: 0,
        lineWidth: 0.4,
        cellPadding: 2.5,
        valign: 'middle',
        halign: 'left',
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
        cellPadding: 2.5
      },
      columnStyles,
      margin: { top: startY, bottom: 40, left: tableLeft, right: tableLeft },
      tableWidth,
      didDrawPage: drawReportFrame
    });
    startY = doc.lastAutoTable.finalY + 18;
  });
  await appendAnnexureFAttachmentPages(doc);
  if (isLivePreview) {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('annexure-f') : document.getElementById('pdf-iframe-annexure-f-preview'));
    if (iframe) iframe.src = blobUrl;
  } else {
    doc.save('Annexure_F_Sand_Ghats_Benchmarks_CORS_Merged.pdf');
    toast('PDF downloaded successfully!', 'success');
  }
}
function getAnnexureFAttachment() {
  if (window.S && S.activeProject && S.activeProject.annexureFAttachment) {
    return S.activeProject.annexureFAttachment;
  }
  return window.annexureFAttachment || null;
}
function setAnnexureFAttachment(attachment) {
  window.annexureFAttachment = attachment;
  if (window.S && S.activeProject) {
    S.activeProject.annexureFAttachment = attachment;
    const pIdx = S.projects.findIndex(p => p.id === S.activeProject.id);
    if (pIdx !== -1) S.projects[pIdx].annexureFAttachment = attachment;
  }
}
function renderAttachmentUploadUIAnnexureF() {
  const el = document.getElementById('annexure-f-attachment-info');
  if (!el) return;
  const attachment = getAnnexureFAttachment();
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
      <button type="button" class="btn btn-xs btn-danger" onclick="deleteAttachmentAnnexureF()">Remove</button>
    </div>`;
  if (window.initLucide) window.initLucide();
}
function handleAttachmentUploadAnnexureF(event) {
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
      setAnnexureFAttachment({
        fileName: file.name,
        fileSize: sizeStr,
        fileType: 'pdf',
        pages: imgs
      });
      renderAttachmentUploadUIAnnexureF();
      if (window.debouncedSaveState) window.debouncedSaveState();
      toast('Supporting PDF added to Annexure F.', 'success');
      if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-f') {
        exportAnnexureFPDF(null, true);
      }
      event.target.value = '';
    });
    return;
  }
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      setAnnexureFAttachment({
        fileName: file.name,
        fileSize: sizeStr,
        fileType: 'image',
        pages: [evt.target.result]
      });
      renderAttachmentUploadUIAnnexureF();
      if (window.debouncedSaveState) window.debouncedSaveState();
      toast('Supporting image added to Annexure F.', 'success');
      if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-f') {
        exportAnnexureFPDF(null, true);
      }
      event.target.value = '';
    };
    reader.readAsDataURL(file);
    return;
  }
  toast('Unsupported file format. Please upload a PDF or image.', 'error');
  event.target.value = '';
}
function deleteAttachmentAnnexureF() {
  setAnnexureFAttachment(null);
  renderAttachmentUploadUIAnnexureF();
  if (window.debouncedSaveState) window.debouncedSaveState();
  if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-f') {
    exportAnnexureFPDF(null, true);
  }
  toast('Supporting file removed.', 'success');
}
function loadAnnexureFImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
async function appendAnnexureFAttachmentPages(doc) {
  const attachment = getAnnexureFAttachment();
  if (!attachment || !attachment.pages || !attachment.pages.length) return;
  for (const src of attachment.pages) {
    const img = await loadAnnexureFImage(src);
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
function renderAnnexureF() {
  renderAttachmentUploadUIAnnexureF();
  ['SAND', 'BENCHMARK', 'CORS'].forEach(renumberAnnexureFTableBlocks);
  if (typeof applyMoreAnnexureAccess === 'function') applyMoreAnnexureAccess(document.getElementById('view-annexure-f'));
  if (window.initLucide) window.initLucide();
}
document.addEventListener('input', (e) => {
  if (e.target.closest('#view-annexure-f table')) {
    if (window.anxNDebounceTimer) clearTimeout(window.anxNDebounceTimer);
    window.anxNDebounceTimer = setTimeout(() => {
      exportAnnexureFPDF(null, true);
    }, 1500);
  }
});
window.annexureFDeleteButtonHTML = annexureFDeleteButtonHTML;
window.downloadSectionTemplateAnnexureF = downloadSectionTemplateAnnexureF;
window.handleSectionUploadAnnexureF = handleSectionUploadAnnexureF;
window.addRowAnnexureF = addRowAnnexureF;
window.addAnnexureFTableBlock = addAnnexureFTableBlock;
window.deleteAnnexureFTableBlock = deleteAnnexureFTableBlock;
window.getAnnexureFEmptyRow = getAnnexureFEmptyRow;
window.delRowAnnexureF = delRowAnnexureF;
window.exportAnnexureFPDF = exportAnnexureFPDF;
window.handleAttachmentUploadAnnexureF = handleAttachmentUploadAnnexureF;
window.deleteAttachmentAnnexureF = deleteAttachmentAnnexureF;
window.renderAttachmentUploadUIAnnexureF = renderAttachmentUploadUIAnnexureF;
window.renderAnnexureF = renderAnnexureF;
document.addEventListener('change', (e) => {
  if (e.target.closest('#view-annexure-f table')) {
    if (window.anxNDebounceTimer) clearTimeout(window.anxNDebounceTimer);
    window.anxNDebounceTimer = setTimeout(() => {
      exportAnnexureFPDF(null, true);
    }, 300);
  }
});
