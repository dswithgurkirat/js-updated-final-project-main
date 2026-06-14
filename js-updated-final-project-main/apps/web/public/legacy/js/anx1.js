/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ANNEXURE I â€” SAND SOURCES
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function downloadSectionTemplate(sectionType) {
  let csvContent = "";
  let filename = "";
  switch(sectionType) {
    case 'A':
      csvContent = "River Name/M-Sand Plant,Total Stretch of River (in KM),Type of River (Perennial or Non Perennial)\n";
      filename = "Table_A_Rivers_Template.csv";
      break;
    case 'B':
      csvContent = "b) De-Siltation Location (Lakes/Ponds/Dams etc.),,,,,,,\n,,,,,,,\nName of Reservoir/Dams,Maintain/Controlled by State Govt./PSU etc.,Latitude,Longitude,District,Tehsil,Village,Size (Ha)\n";
      filename = "Table_B_DeSiltation_Template.csv";
      break;
    case 'C':
      csvContent = "Owner,SL. No,Area (Ha),District,Tehsil,Village,Agricultural Land (Yes/No)\n";
      filename = "Table_C_Patta_Lands_Template.csv";
      break;
    case 'D':
      csvContent = "Plant Name,Owner,District,Tehsil,Village,Geo-location,Quantity Tonnes/Annum\n";
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
function handleSectionUpload(event, sectionType) {
  const file = event.target.files[0];
  if (!file) return;
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
      processExcelData(rows, sectionType);
    } catch (error) {
      toast("Error parsing file. Please ensure it is a valid Excel or CSV file.", "error");
      console.error(error);
    }
    event.target.value = ''; 
  };
  reader.readAsArrayBuffer(file);
}
function processExcelData(rows, sectionType) {
  const validRows = rows.filter(row => row.some(cell => String(cell !== undefined && cell !== null ? cell : "").trim() !== ""));
  let startIndex = 0; 
  const headerIdx = validRows.findIndex(row => {
    const rowStr = row.map(c => String(c || '')).join(' ').toLowerCase();
    if (sectionType === 'A') return rowStr.includes('river');
    if (sectionType === 'B') return rowStr.includes('reservoir');
    if (sectionType === 'C') return rowStr.includes('owner');
    if (sectionType === 'D') return rowStr.includes('plant');
    return false;
  });
  if (headerIdx >= 0) {
    startIndex = headerIdx + 1;
  }
  const dataRows = validRows.slice(startIndex);
  if(dataRows.length === 0) {
    toast("No data found after the header in the uploaded file.", "warn");
    return;
  }
  let tableId = '';
  if (sectionType === 'A') tableId = 'anx1-rivers';
  if (sectionType === 'B') tableId = 'anx1-desilt';
  if (sectionType === 'C') tableId = 'anx1-patta';
  if (sectionType === 'D') tableId = 'anx1-msand';
  const uploadRows = [];
  dataRows.forEach(rowData => {
    while (rowData.length < 8) rowData.push(""); 
    let cellDataArray = [];
    const isReadOnly = isUserReadOnly();
    const actionBtn = `<button class='btn btn-xs btn-danger' onclick='delRow(this)' style='display:${isReadOnly ? 'none' : 'inline-flex'};align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>`;
    if (sectionType === 'A') {
      let typeVal = String(rowData[2] || "").trim();
      let isNonPerennial = typeVal.toLowerCase().includes("non");
      let typeSelect = `<select ${isReadOnly ? 'disabled' : ''}><option ${!isNonPerennial ? 'selected' : ''}>Perennial</option><option ${isNonPerennial ? 'selected' : ''}>Non-Perennial</option></select>`;
      cellDataArray = [rowData[0], rowData[1], typeSelect, actionBtn];
    } 
    else if (sectionType === 'B') {
      cellDataArray = [rowData[0], rowData[1], rowData[2], rowData[3], rowData[4], rowData[5], rowData[6], rowData[7], actionBtn];
    } 
    else if (sectionType === 'C') {
      let agVal = String(rowData[6] || "").trim().toLowerCase();
      let agSelect = `<select ${isReadOnly ? 'disabled' : ''}><option ${agVal === 'yes' ? 'selected' : ''}>Yes</option><option ${agVal === 'no' ? 'selected' : ''}>No</option></select>`;
      cellDataArray = [rowData[0], rowData[1], rowData[2], rowData[3], rowData[4], rowData[5], agSelect, actionBtn];
    } 
    else if (sectionType === 'D') {
      cellDataArray = [rowData[0], rowData[1], rowData[2], rowData[3], rowData[4], rowData[5], rowData[6], actionBtn];
    }
    uploadRows.push(cellDataArray);
  });
  if (typeof rbacApplyExcelRowsToTable === 'function') {
    rbacApplyExcelRowsToTable(tableId, uploadRows, row => addRowAnx1(tableId, row));
  } else {
    const tbody = document.getElementById(tableId).querySelector('tbody');
    tbody.innerHTML = '';
    uploadRows.forEach(row => addRowAnx1(tableId, row));
  }
  toast(`Uploaded section ${sectionType} data successfully`, 'success');
  scheduleAnx1LivePreview(200);
}
function addRowAnx1(tableId, cellDataArray) {
  const tbody = document.querySelector('#' + tableId + ' tbody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  cellDataArray.forEach((data) => {
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
    } else {
      td.innerHTML = dataStr;
    }
    tr.appendChild(td);
  });
  tbody.appendChild(tr);
  if (window.initLucide) window.initLucide();
  scheduleAnx1LivePreview(250);
}
function escapeAnx1Html(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function getAnx1TableRows(tableId) {
  return Array.from(document.querySelectorAll(`#${tableId} tbody tr`)).map(row => (
    Array.from(row.querySelectorAll('td')).slice(0, -1).map(cell => {
      const select = cell.querySelector('select');
      return select ? select.value : cell.innerText.trim();
    })
  ));
}
function buildAnx1PreviewMarkup() {
  const sections = [
    {
      id: 'anx1-rivers',
      title: 'a) Rivers:',
      headers: ['River Name/M-Sand Plant', 'Total Stretch of River (in KM)', 'Type of River (Perennial or Non Perennial)']
    },
    {
      id: 'anx1-desilt',
      title: 'b) De-Siltation Location (Lakes/Ponds/Dams etc.):',
      headers: ['Name of Reservoir/Dams', 'Maintain/Controlled by State Govt./PSU etc.', 'Latitude', 'Longitude', 'District', 'Tehsil', 'Village', 'Size (Ha)']
    },
    {
      id: 'anx1-patta',
      title: 'c) Patta lands/Khatedari land:',
      headers: ['Owner', 'SL. No', 'Area (Ha)', 'District', 'Tehsil', 'Village', 'Agricultural Land (Yes/No)']
    },
    {
      id: 'anx1-msand',
      title: 'd) M-Sand Plants:',
      headers: ['Plant Name', 'Owner', 'District', 'Tehsil', 'Village', 'Geo-location', 'Quantity Tonnes/Annum']
    }
  ];
  const sectionHtml = sections.map(section => {
    const rows = getAnx1TableRows(section.id);
    const body = rows.length
      ? rows.map(row => `<tr>${section.headers.map((_, i) => `<td>${escapeAnx1Html(row[i] || 'NUL')}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${section.headers.length}" class="empty">Data not provided</td></tr>`;
    return `
      <section class="anx1-section">
        <h2>${escapeAnx1Html(section.title)}</h2>
        <table>
          <thead><tr>${section.headers.map(h => `<th>${escapeAnx1Html(h)}</th>`).join('')}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </section>`;
  }).join('');
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #eef2f7; color: #111827; font-family: Arial, Helvetica, sans-serif; }
      .page { width: min(100%, 980px); min-height: 100vh; margin: 0 auto; padding: 28px 30px 40px; background: #fff; box-shadow: 0 12px 32px rgba(15,23,42,.12); }
      h1 { margin: 0 0 4px; text-align: center; font-size: 22px; text-decoration: underline; }
      .sub { margin: 0 0 26px; text-align: center; font-size: 15px; }
      .anx1-section { margin: 0 0 24px; page-break-inside: avoid; }
      h2 { margin: 0 0 10px; font-size: 14px; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
      th, td { border: 1px solid #111827; padding: 6px 7px; vertical-align: top; word-break: break-word; overflow-wrap: anywhere; }
      th { background: #f3f4f6; font-weight: 700; text-align: left; }
      .empty { text-align: center; color: #6b7280; }
      @media (max-width: 720px) {
        .page { padding: 18px 14px 28px; box-shadow: none; }
        h1 { font-size: 18px; }
        .sub { font-size: 13px; }
        table { min-width: 680px; font-size: 10px; }
        .anx1-section { overflow-x: auto; padding-bottom: 8px; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <h1>Annexure-I</h1>
      <p class="sub">Details of Sand/M-Sand Sources</p>
      ${sectionHtml}
    </main>
  </body>
</html>`;
}
function renderAnx1LivePreviewHtml() {
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx1') : document.getElementById('pdf-preview-iframe'));
  if (!iframe) return null;
  iframe.style.display = 'block';
  iframe.removeAttribute('src');
  iframe.srcdoc = buildAnx1PreviewMarkup();
  return iframe;
}
function scheduleAnx1LivePreview(delay = 500) {
  if (window.anx1DebounceTimer) clearTimeout(window.anx1DebounceTimer);
  window.anx1DebounceTimer = setTimeout(() => {
    if (window.pdfPreview && window.pdfPreview.currentView === 'anx1') {
      exportAnx1PDF(null, true);
    }
  }, delay);
}
function exportAnx1PDF(btn, isLivePreview = false) {
  if (isLivePreview) {
    renderAnx1LivePreviewHtml();
    return;
  }
  if (typeof html2pdf === 'undefined') {
    const originalText = btn ? btn.innerText : 'Loading...';
    if (btn) btn.innerText = "Loading PDF Engine...";
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => {
      if (btn) btn.innerText = originalText;
      executePDFExport(isLivePreview);
    };
    script.onerror = () => {
      if (btn) btn.innerText = originalText;
      toast("Failed to load PDF engine. Please check your internet connection.", "error");
    };
    document.head.appendChild(script);
  } else {
    executePDFExport(isLivePreview);
  }
}
function executePDFExport(isLivePreview) {
  const mainView = document.getElementById('view-anx1');
  const printElement = document.createElement('div');
  printElement.id = 'pdf-render-container';
  printElement.style.width = '100%';
  printElement.style.maxWidth = '1000px'; 
  printElement.style.margin = '0 auto';
  printElement.style.fontFamily = 'Arial, Helvetica, sans-serif';
  printElement.style.color = '#000000';
  printElement.style.backgroundColor = '#ffffff';
  printElement.innerHTML = buildAnx1PreviewMarkup();
  printElement.style.position = 'absolute';
  printElement.style.top = '0';
  printElement.style.left = '0';
  printElement.style.zIndex = '-9999';
  printElement.style.opacity = '0';
  document.body.appendChild(printElement);
  const opt = {
    margin:       10,
    filename:     'Annexure_1_Sources.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, windowWidth: document.body.scrollWidth },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak:    { mode: ['css', 'legacy'], avoid: ['tr', 'h4'] }
  };
  if (isLivePreview) {
    html2pdf().set(opt).from(printElement).toPdf().get('pdf').then(function(pdf) {
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text("Page " + i, pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
      }
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      document.body.removeChild(printElement);
      const iframe = window.setAnnexurePreviewIframeSrc
        ? window.setAnnexurePreviewIframeSrc('anx1', blobUrl)
        : (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx1') : document.getElementById('pdf-preview-iframe'));
      if (iframe) iframe.removeAttribute('srcdoc');
    }).catch(err => {
      if(document.body.contains(printElement)) document.body.removeChild(printElement);
      console.error(err);
    });
  } else {
    let originalBodyPadding = document.body.style.padding;
    let originalBodyBg = document.body.style.backgroundColor;
    document.body.style.padding = '0';
    document.body.style.backgroundColor = '#ffffff';
    html2pdf().set(opt).from(printElement).toPdf().get('pdf').then(function(pdf) {
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text("Page " + i, pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
      }
    }).save().then(() => {
      document.body.removeChild(printElement);
      document.body.style.padding = originalBodyPadding;
      document.body.style.backgroundColor = originalBodyBg;
      toast('PDF downloaded successfully!', 'success');
    }).catch(err => {
      console.error("PDF Error: ", err);
      if(document.body.contains(printElement)) document.body.removeChild(printElement);
      document.body.style.padding = originalBodyPadding;
      document.body.style.backgroundColor = originalBodyBg;
      toast('Failed to generate PDF', 'error');
    });
  }
}
window.exportAnx1PDF = exportAnx1PDF;
document.addEventListener('input', (e) => {
  if (e.target.closest('#anx1-rivers, #anx1-desilt, #anx1-patta, #anx1-msand')) {
    scheduleAnx1LivePreview(700);
  }
});
function renderPdfUploadUIAnx1() {
  const nameEl = document.getElementById('anx1-uploaded-filename');
  const dlBtn = document.getElementById('anx1-download-btn');
  const delBtn = document.getElementById('anx1-delete-btn');
  const previewBtn = document.getElementById('anx1-preview-btn');
  const previewSection = document.getElementById('pdf-preview-section');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx1') : document.getElementById('pdf-iframe'));
  if (!nameEl || !dlBtn) return;
  if (!S.activeProject) {
    nameEl.style.display = 'none';
    dlBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none';
    if (previewBtn) previewBtn.style.display = 'none';
    return;
  }
  const pdfName = S.activeProject.anx1PdfName;
  const canEdit = !isUserReadOnly();
  const uploadInput = document.getElementById('anx1-upload');
  if (uploadInput) {
    uploadInput.disabled = !canEdit;
    uploadInput.parentElement.style.display = canEdit ? 'inline-block' : 'none';
  }
  if (!pdfName) {
    nameEl.style.display = 'none';
    dlBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none';
    if (previewBtn) previewBtn.style.display = 'none';
  } else {
    nameEl.textContent = pdfName;
    nameEl.style.display = 'inline-block';
    dlBtn.style.display = 'inline-flex';
    if (delBtn) delBtn.style.display = canEdit ? 'inline-flex' : 'none';
    if (previewBtn) previewBtn.style.display = 'inline-flex';
    if (previewSection && previewSection.style.display !== 'none' && iframe) {
      if (S.activeProject.pdfData && S.activeProject.pdfData.anx1) {
        if (iframe.src !== S.activeProject.pdfData.anx1) {
          iframe.src = S.activeProject.pdfData.anx1;
        }
      } else {
        if (!window.anx1InitialPreviewGenerated) {
           setTimeout(() => { exportAnx1PDF(null, true); }, 500);
           window.anx1InitialPreviewGenerated = true;
        }
      }
    }
  }
  if (window.initLucide) window.initLucide();
}
window.renderPdfUploadUIAnx1 = renderPdfUploadUIAnx1;
function togglePDFPreviewAnx1() {
  if (window.pdfPreview) window.pdfPreview.show('anx1');
  exportAnx1PDF(null, true);
}
async function deletePdfAnx1() {
  if (!S.activeProject) return;
  if (!confirm("Are you sure you want to delete the uploaded PDF? This will remove the file from the server.")) {
    return;
  }
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx1') : document.getElementById('pdf-iframe'));
  if (iframe) {
    iframe.removeAttribute('srcdoc');
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  }
  toast("Deleting PDF...", "info");
  S.activeProject.anx1PdfName = null;
  if (S.activeProject.pdfData) {
    if (S.activeProject.pdfData.anx1 && S.activeProject.pdfData.anx1.startsWith('blob:')) {
       URL.revokeObjectURL(S.activeProject.pdfData.anx1);
    }
    S.activeProject.pdfData.anx1 = null;
  }
  const pIdx = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pIdx !== -1) {
    S.projects[pIdx].anx1PdfName = null;
    if (S.projects[pIdx].pdfData) S.projects[pIdx].pdfData.anx1 = null;
  }
  renderPdfUploadUIAnx1();
  toast("PDF deleted successfully.", "success");
}
function handlePDFUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    toast('Error: Only PDF files are allowed.', 'danger');
    event.target.value = '';
    return;
  }
  toast('Uploading PDF...', 'info');
  const fileURL = URL.createObjectURL(file);
  S.activeProject.anx1PdfName = file.name;
  if (!S.activeProject.pdfData) S.activeProject.pdfData = {};
  S.activeProject.pdfData.anx1 = fileURL;
  if (window.storeProjectPdf) {
    window.storeProjectPdf('anx1', file).catch(err => console.error('Backend PDF upload failed:', err));
  }
  if (window.renderPdfToImages) {
    window.renderPdfToImages(file, (err, imgs) => {
      if (!err && imgs) {
        if (!S.uploadedPDFs) S.uploadedPDFs = {};
        S.uploadedPDFs.anx1 = imgs;
        if (window.debouncedSaveState) window.debouncedSaveState();
      }
    });
  }
  const pIdx = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pIdx !== -1) {
    S.projects[pIdx].anx1PdfName = file.name;
    if (!S.projects[pIdx].pdfData) S.projects[pIdx].pdfData = {};
    S.projects[pIdx].pdfData.anx1 = fileURL;
  }
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx1') : document.getElementById('pdf-iframe'));
  if (iframe) {
    iframe.removeAttribute('srcdoc');
    iframe.src = fileURL;
  }
  renderPdfUploadUIAnx1();
  toast('PDF uploaded and preview loaded!', 'success');
  event.target.value = '';
}
function closePDFPreview() {
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx1') : document.getElementById('pdf-iframe'));
  if (iframe) {
    iframe.removeAttribute('srcdoc');
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  }
}
function downloadPdfAnx1() {
  if (!S.activeProject) {
    toast('Please select and open a project first.', 'warn');
    return;
  }
  if (!S.activeProject.anx1PdfName) {
    toast('No PDF has been uploaded for this project yet. Please upload a PDF first.', 'warn');
    return;
  }
  if (window.downloadStoredPdf) {
    downloadStoredPdf('anx1', S.activeProject.anx1PdfName, S.activeProject.pdfData?.anx1);
    return;
  }
  const a = document.createElement('a');
  a.href = S.activeProject.pdfData.anx1;
  a.download = S.activeProject.anx1PdfName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
document.addEventListener('input', (e) => {
  if (e.target.closest('#view-anx1 table')) {
    scheduleAnx1LivePreview(700);
  }
});
document.addEventListener('change', (e) => {
  if (e.target.closest('#view-anx1 table')) {
    scheduleAnx1LivePreview(300);
  }
});
