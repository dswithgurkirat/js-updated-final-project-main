/* ══════════════════════════════════════
   PDF GENERATION & REVIEW
 ══════════════════════════════════════ */
function generateFinalPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const W=210, pad=15;
  let y=20;
  const dist=document.getElementById('pdf-district')?.value||'Jalandhar';
  const yr=document.getElementById('pdf-year')?.value||'2025-26';
  const govBlue=[26,51,102];
  const navyArr=[11,29,58];
  const saffron=[224,123,0];
  const addPageHeader=(section)=>{
    doc.setFillColor(...navyArr); doc.rect(0,0,W,14,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(255,255,255);
    doc.text('DISTRICT SURVEY REPORT — GOVERNMENT OF PUNJAB · EMGSM 2020',W/2,8,{align:'center'});
    doc.text(section,W-pad,8,{align:'right'});
    doc.setDrawColor(224,123,0); doc.setLineWidth(0.8); doc.line(pad,15,W-pad,15);
  };
  let coverInserted = false;
  if (S.uploadedPDFs && S.uploadedPDFs.cover && S.uploadedPDFs.cover.length) {
    S.uploadedPDFs.cover.forEach((img, idx) => {
      if (idx > 0) doc.addPage();
      try { doc.addImage(img, 'PNG', 0, 0, W, 297); } catch(e) { try { doc.addImage(img, 'JPEG', 0, 0, W, 297); } catch(_){} }
    });
    coverInserted = true;
  }
  if (!coverInserted) {
    addPageHeader('COVER PAGE');
    doc.setTextColor(...govBlue); doc.setFont('helvetica','bold'); doc.setFontSize(11);
    doc.text('Enforcement & Monitoring Guidelines for Sand Mining', W/2, 30, {align:'center'});
    doc.setDrawColor(...govBlue); doc.setLineWidth(0.5); doc.line(pad,33,W-pad,33);
    doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.setTextColor(...navyArr);
    doc.text(S.frontMatter.title.toUpperCase(), W/2, 55, {align:'center', maxWidth: W - 2*pad});
    doc.setFontSize(14); doc.text('FOR SAND MINING', W/2, 65, {align:'center'});
    doc.setFontSize(20); doc.setTextColor(...saffron);
    doc.text(S.frontMatter.district.toUpperCase() + ' DISTRICT', W/2, 80, {align:'center'});
    doc.setFontSize(13); doc.setTextColor(...navyArr); doc.text(S.frontMatter.state + ' · ' + S.frontMatter.year, W/2, 90, {align:'center'});
    doc.setFontSize(10); doc.setTextColor(...govBlue);
    const prepLines = doc.splitTextToSize('PREPARED BY: ' + S.frontMatter.preparedBy.toUpperCase(), W - 2*pad);
    doc.text(prepLines, W/2, 130, {align:'center'});
    const assistLines = doc.splitTextToSize('ASSISTED BY: ' + S.frontMatter.assistedBy.toUpperCase(), W - 2*pad);
    doc.text(assistLines, W/2, 130 + (prepLines.length * 6), {align:'center'});
  }
  ['cert','toc'].forEach(type => {
    const pages = S.uploadedPDFs && S.uploadedPDFs[type];
    if (pages && pages.length) {
      pages.forEach(img => { doc.addPage(); try { doc.addImage(img, 'PNG', 0, 0, W, 297); } catch(e) { try { doc.addImage(img, 'JPEG', 0, 0, W, 297); } catch(_){} } });
    }
  });
  let prefaceInserted = false;
  if (S.uploadedPDFs && S.uploadedPDFs.pref && S.uploadedPDFs.pref.length) {
    S.uploadedPDFs.pref.forEach(img => { doc.addPage(); try { doc.addImage(img, 'PNG', 0, 0, W, 297); } catch(e) { try { doc.addImage(img, 'JPEG', 0, 0, W, 297); } catch(_){} } });
    prefaceInserted = true;
  }
  if (!prefaceInserted && S.frontMatter.preface) {
    doc.addPage(); y = 25; addPageHeader('PREFACE');
    doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.setTextColor(...navyArr);
    doc.text('PREFACE', W/2, y, {align:'center'}); y += 15;
    doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(50,50,70);
    const prefLines = doc.splitTextToSize(S.frontMatter.preface, W - 2*pad);
    doc.text(prefLines, pad, y);
  }
  if (S.frontMatter.acknowledgement) {
    doc.addPage(); y = 25; addPageHeader('ACKNOWLEDGEMENT');
    doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.setTextColor(...navyArr);
    doc.text('ACKNOWLEDGEMENT', W/2, y, {align:'center'}); y += 15;
    doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(50,50,70);
    const ackLines = doc.splitTextToSize(S.frontMatter.acknowledgement, W - 2*pad);
    doc.text(ackLines, pad, y);
  }
  doc.addPage(); y=25; addPageHeader('CONTENTS');
  doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(...navyArr);
  doc.text('TABLE OF CONTENTS', W/2, y, {align:'center'}); y+=12;
  S.chapters.forEach((ch,i)=>{
    if (y>265){doc.addPage();y=20;addPageHeader('CONTENTS');}
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(50,50,80);
    doc.text(`${i+1}.  ${ch.name}`, pad, y); y+=7;
  });
  S.chapters.forEach((ch,i)=>{
    doc.addPage(); addPageHeader('CHAPTER '+(i+1));
    y=25;
    doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(...navyArr);
    doc.text(ch.name, pad, y, {maxWidth:W-2*pad}); y+=14;
    doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(60,60,80);
    const lines=doc.splitTextToSize(ch.summary, W-2*pad);
    doc.text(lines, pad, y); y+=lines.length*6+8;
    const chapterPages = S.chapterPDFs && S.chapterPDFs[ch.id];
    if (chapterPages && chapterPages.length) {
      doc.setFontSize(9); doc.setTextColor(120,120,140);
      doc.text(`[Chapter content appended from uploaded file: ${ch.fileName || 'document.pdf'}]`, pad, y);
      chapterPages.forEach((img, pageIdx) => {
        doc.addPage();
        doc.setFillColor(...navyArr); doc.rect(0, 0, W, 14, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
        doc.text(`DISTRICT SURVEY REPORT — ${dist.toUpperCase()} · EMGSM 2020`, W/2, 8, {align:'center'});
        doc.text(`CHAPTER ${i+1} — UPLOADED CONTENT (Pg ${pageIdx + 1}/${chapterPages.length})`, W-pad, 8, {align:'right'});
        doc.setDrawColor(224,123,0); doc.setLineWidth(0.8); doc.line(pad,15,W-pad,15);
        doc.setDrawColor(200,200,200); doc.setLineWidth(0.5);
        doc.rect(pad, 20, W - 2*pad, 260); // Frame
        try {
          doc.addImage(img, 'PNG', pad + 1, 21, W - 2*pad - 2, 258);
        } catch(e) {
          try { doc.addImage(img, 'JPEG', pad + 1, 21, W - 2*pad - 2, 258); } catch(_){}
        }
      });
    } else {
      doc.setFontSize(9); doc.setTextColor(120,120,140);
      doc.text('[Full chapter content to be included from uploaded PDF or text data]', pad, y);
    }
  });
  if (S.graphs.length) {
    doc.addPage(); addPageHeader('CROSS SECTION ANALYSIS'); y=25;
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(...navyArr);
    doc.text('CROSS SECTION ANALYSIS & SANDBAR CALCULATIONS', W/2, y, {align:'center'}); y+=12;
    S.graphs.forEach(g=>{
      if (y>220){doc.addPage();y=20;addPageHeader('CROSS SECTION');}
      const o=calcGraph(g);
      doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...navyArr);
      doc.text(g.name, pad, y); y+=7;
      doc.autoTable({
        startY:y,margin:{left:pad,right:pad},styles:{fontSize:9},
        headStyles:{fillColor:navyArr},
        head:[['Metric','Value','Unit']],
        body:[
          ['Average Thickness',o.avgThick.toFixed(3),'m'],
          ['Potential Area',o.pArea.toFixed(2),'Ha'],
          ['Volume',fmtN(o.volume,0),'m³'],
          ['Allowed Excavation',fmtN(o.allowed,0),'MT'],
          ['Bulk Density',g.bulk,'g/cc'],
          ['Mining %',g.pct+'%','EMGSM 2020']
        ]
      });
      y=doc.lastAutoTable.finalY+10;
      const canvas = document.getElementById('canvas-' + g.id + '-post') || document.getElementById('canvas-' + g.id);
      if (canvas) {
        if (y > 200) { doc.addPage(); y=20; addPageHeader('CROSS SECTION GRAPH'); }
        try {
          const imgData = canvas.toDataURL('image/png', 1.0);
          doc.addImage(imgData, 'PNG', pad, y, W - 2*pad, 65);
          y += 75;
        } catch(e) { console.error('Canvas capture failed', e); }
      }
    });
  }
  if (S.plates.length) {
    doc.addPage(); addPageHeader('PLATE SECTION'); y=25;
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(...navyArr);
    doc.text('PLATE SECTION — MAPS & SITE PHOTOGRAPHS', W/2, y, {align:'center'}); y+=10;
    S.plates.forEach((p,i)=>{
      if (y>250){doc.addPage();y=20;addPageHeader('PLATES');}
      doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(60,60,80);
      const fileStatus = p.fileName ? `[File: ${p.fileName}]` : '[No file uploaded]';
      doc.text(`Plate ${i+1}: ${p.name}  ${fileStatus}`, pad, y); y+=7;
    });
    S.plates.forEach((p, i) => {
      if (p.pages && p.pages.length) {
        p.pages.forEach((img, pageIdx) => {
          doc.addPage();
          doc.setFillColor(...navyArr); doc.rect(0, 0, W, 12, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
          doc.text(`PLATE ${i+1}: ${p.name.toUpperCase()} (Page ${pageIdx + 1}/${p.pages.length})`, pad, 8);
          try {
            doc.addImage(img, 'JPEG', 0, 12, W, 285);
          } catch(e) {
            try {
              doc.addImage(img, 'PNG', 0, 12, W, 285);
            } catch(e2) {
              console.error(`Failed to add plate ${i+1} page to PDF:`, e2);
            }
          }
        });
      }
    });
  }
  const allTablesData = [
    { title: 'ANNEXURE I(a) — RIVERS', id: '#anx1-rivers' },
    { title: 'ANNEXURE I(b) — DE-SILTATION', id: '#anx1-desilt' },
    { title: 'ANNEXURE I(c) — PATTA LANDS', id: '#anx1-patta' },
    { title: 'ANNEXURE I(d) — M-SAND PLANTS', id: '#anx1-msand' },
    { title: 'ANNEXURE II(a) — MINING LEASES', id: '#anx2-leases' },
    { title: 'ANNEXURE II(b) — PATTA LANDS', id: '#anx2-patta' },
    { title: 'ANNEXURE II(c) — DE-SILTATION', id: '#anx2-desilt' },
    { title: 'ANNEXURE II(d) — M-SAND PLANTS', id: '#anx2-msand' },
    { title: 'ANNEXURE III(a) — CLUSTERS', id: '#anx3-clusters' },
    { title: 'ANNEXURE III(b) — CONTIGUOUS CLUSTERS', id: '#anx3-contiguous' },
    { title: 'ANNEXURE IV(a) — LEASE ROUTES', id: '#anx4-routes' },
    { title: 'ANNEXURE IV(b) — CLUSTER ROUTES', id: '#anx4-cluster-routes' },
    { title: 'ANNEXURE V — BENCH MARK & CORS', id: '#anx5-benchmarks' },
    { title: 'ANNEXURE VI — FINAL CLUSTERS', id: '#anx6-final-clusters' },
    { title: 'ANNEXURE VII — FINAL PATTA LANDS', id: '#anx7-patta-final' },
    { title: 'ADDITIONAL — SAND GHATS COORDS', id: '#anx-coords-tbl' },
    { title: 'ADDITIONAL — BENCH MARKS', id: '#anx-benchmark-tbl' },
    { title: 'ADDITIONAL — CORS STATIONS', id: '#anx-cors-tbl' },
    { title: 'ADDITIONAL — FINAL CLUSTERS', id: '#anx-final-clusters-tbl' },
    { title: 'ADDITIONAL — FINAL PATTA LANDS', id: '#anx-patta-final-tbl' },
    { title: 'ADDITIONAL — FINAL DE-SILTATION', id: '#anx-desilt-final-tbl' },
    { title: 'DATA TABLE — PROJECTED DEMAND', id: '#demand-tbl' },
    { title: 'DATA TABLE — AUCTIONED SITES', id: '#auction-tbl' },
    { title: 'DATA TABLE — SOURCE SUMMARY', id: '#summary-tbl' }
  ];
  allTablesData.forEach((tblConfig, index) => {
    let tables = [];
    if (tblConfig.id === '#anx2-leases') {
      tables = Array.from(document.querySelectorAll('table[id^="anx2-leases"]'));
    } else {
      const el = document.querySelector(tblConfig.id);
      if (el) tables.push(el);
    }
    tables.forEach((tableEl, tblIdx) => {
      if (tableEl && tableEl.rows.length > 1) { // ensure it has rows beyond header
        doc.addPage(); addPageHeader(tblConfig.title.split(' — ')[0]); y=25;
        doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(...navyArr);
        let title = tblConfig.title;
        if (tblConfig.id === '#anx2-leases' && tables.length > 1) {
          title += ` (Table ${tblIdx + 1})`;
        }
        doc.text(title, W/2, y, {align:'center'}); y+=10;
        const head = []; const body = []; const foot = [];
        let hasActionCol = false;
        tableEl.querySelectorAll('thead tr').forEach(tr => {
          const rowData = [];
          tr.querySelectorAll('th, td').forEach(cell => rowData.push(cell.innerText.trim()));
          if (rowData[rowData.length - 1] === 'Action') {
            hasActionCol = true;
            rowData.pop();
          }
          head.push(rowData);
        });
        tableEl.querySelectorAll('tbody tr').forEach(tr => {
          const rowData = [];
          tr.querySelectorAll('th, td').forEach(cell => {
            const select = cell.querySelector('select');
            rowData.push(select ? select.value : cell.innerText.trim().replace('✕',''));
          });
          if (hasActionCol) rowData.pop();
          body.push(rowData);
        });
        tableEl.querySelectorAll('tfoot tr').forEach(tr => {
          const rowData = [];
          tr.querySelectorAll('th, td').forEach(cell => {
            const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
            rowData.push({ content: cell.innerText.trim(), colSpan: colspan });
          });
          if (hasActionCol && rowData.length > 0 && (rowData[rowData.length - 1].content === '' || rowData[rowData.length - 1].content === '✕')) {
            rowData.pop();
          }
          foot.push(rowData);
        });
        doc.autoTable({
          startY: y, margin: {left:pad, right:pad}, styles: {fontSize: 7, cellPadding: 2},
          headStyles: {fillColor: navyArr},
          footStyles: {fillColor: [240,240,245], textColor: navyArr, fontStyle: 'bold'},
          head: head,
          body: body,
          foot: foot.length > 0 ? foot : false,
          theme: 'grid'
        });
      }
    });
    const currentPrefix = tblConfig.title.split('(')[0].trim().split(' ')[0] + ' ' + tblConfig.title.split('(')[0].trim().split(' ')[1]; // E.g. "ANNEXURE I"
    const nextTblConfig = allTablesData[index + 1];
    let nextPrefix = '';
    if (nextTblConfig) {
      nextPrefix = nextTblConfig.title.split('(')[0].trim().split(' ')[0] + ' ' + nextTblConfig.title.split('(')[0].trim().split(' ')[1];
    }
    if (currentPrefix !== nextPrefix && currentPrefix.startsWith('ANNEXURE')) {
      let uploadKey = '';
      if (currentPrefix === 'ANNEXURE I') uploadKey = 'anx1';
      else if (currentPrefix === 'ANNEXURE II') uploadKey = 'anx2';
      else if (currentPrefix === 'ANNEXURE III') uploadKey = 'anx3';
      else if (currentPrefix === 'ANNEXURE IV') uploadKey = 'anx4';
      if (uploadKey && S.uploadedPDFs && S.uploadedPDFs[uploadKey] && S.uploadedPDFs[uploadKey].length > 0) {
        S.uploadedPDFs[uploadKey].forEach((img, pageIdx) => {
          doc.addPage();
          doc.setFillColor(...navyArr); doc.rect(0, 0, W, 14, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
          doc.text(`DISTRICT SURVEY REPORT — ${dist.toUpperCase()} · EMGSM 2020`, W/2, 8, {align:'center'});
          doc.text(`${currentPrefix} — UPLOADED DOCUMENT (Pg ${pageIdx + 1}/${S.uploadedPDFs[uploadKey].length})`, W-pad, 8, {align:'right'});
          doc.setDrawColor(224,123,0); doc.setLineWidth(0.8); doc.line(pad,15,W-pad,15);
          doc.setDrawColor(200,200,200); doc.setLineWidth(0.5);
          doc.rect(pad, 20, W - 2*pad, 260); // Frame
          try { 
            doc.addImage(img, 'PNG', pad + 1, 21, W - 2*pad - 2, 258); 
          } catch(e) { 
            try { doc.addImage(img, 'JPEG', pad + 1, 21, W - 2*pad - 2, 258); } catch(_){} 
          }
        });
      }
    }
  });
  doc.addPage(); addPageHeader('DIGITAL SIGNATURES'); y=25;
  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(...navyArr);
  doc.text('DIGITAL SIGNATURE REGISTER', W/2, y, {align:'center'}); y+=12;
  doc.autoTable({
    startY:y, margin:{left:pad,right:pad}, styles:{fontSize:9},
    headStyles:{fillColor:navyArr},
    head:[['#','Role','Officer','Status','Signed At','Method']],
    body:S.signatures.map(s=>[s.order,s.role,s.name,s.signed?'SIGNED':'PENDING',s.signedAt||'—',s.method||'—'])
  });
  if (S.sdlcData && S.sdlcData.projectId === S.activeProject.id && S.sdlcData.verified) {
    doc.addPage();
    addPageHeader('SDLC RECONCILIATION REPORT');
    y = 25;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...navyArr);
    doc.text('SDLC SURVEY VERIFICATION REPORT', W/2, y, {align:'center'});
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 70);
    const sdlcDesc = "In compliance with EMGSM 2020 guidelines, this annexure presents the joint physical verification and reconciliation results conducted by the Sub-Divisional Level Committee (SDLC). The tables below highlight differences compared between the draft DSR and the verified ground survey data.";
    const linesDesc = doc.splitTextToSize(sdlcDesc, W - 2*pad);
    doc.text(linesDesc, pad, y);
    y += linesDesc.length * 5 + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Annexure IV — Route Carrying Capacity Verification', pad, y);
    y += 5;
    doc.autoTable({
      startY: y,
      margin: {left:pad, right:pad},
      styles: {fontSize: 8},
      headStyles: {fillColor: navyArr},
      head: [['Route Name', 'DSR Value', 'SDLC Value', 'Variance', 'Status']],
      body: S.sdlcData.anx4.map(row => [row.name, row.dsrVal, row.sdlcVal, row.variance, row.matched ? 'MATCHED' : 'RECONCILED'])
    });
    y = doc.lastAutoTable.finalY + 10;
    if (y > 220) { doc.addPage(); addPageHeader('SDLC RECONCILIATION REPORT'); y = 25; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Annexure V — Elevation Bench Marks Verification', pad, y);
    y += 5;
    doc.autoTable({
      startY: y,
      margin: {left:pad, right:pad},
      styles: {fontSize: 8},
      headStyles: {fillColor: navyArr},
      head: [['BM Station ID', 'DSR Coordinates', 'SDLC Coordinates', 'DSR Elevation', 'SDLC Elevation', 'Status']],
      body: S.sdlcData.anx5.map(row => [row.id, row.dsrCoords, row.sdlcCoords, row.dsrElev, row.sdlcElev, row.matched ? 'MATCHED' : 'RECONCILED'])
    });
    y = doc.lastAutoTable.finalY + 10;
    if (y > 220) { doc.addPage(); addPageHeader('SDLC RECONCILIATION REPORT'); y = 25; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Annexure VI — Quarry Cluster Area Verification', pad, y);
    y += 5;
    doc.autoTable({
      startY: y,
      margin: {left:pad, right:pad},
      styles: {fontSize: 8},
      headStyles: {fillColor: navyArr},
      head: [['Cluster ID', 'DSR Area', 'SDLC Area', 'Variance', 'Status']],
      body: S.sdlcData.anx6.map(row => [row.id, row.dsrVal, row.sdlcVal, row.variance, row.matched ? 'MATCHED' : 'RECONCILED'])
    });
    y = doc.lastAutoTable.finalY + 10;
    if (y > 220) { doc.addPage(); addPageHeader('SDLC RECONCILIATION REPORT'); y = 25; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Annexure VII — Transportation Traffic Density Verification', pad, y);
    y += 5;
    doc.autoTable({
      startY: y,
      margin: {left:pad, right:pad},
      styles: {fontSize: 8},
      headStyles: {fillColor: navyArr},
      head: [['Corridor / Route Name', 'DSR Traffic Density', 'SDLC Traffic Density', 'Variance', 'Status']],
      body: S.sdlcData.anx7.map(row => [row.name, row.dsrVal, row.sdlcVal, row.variance, row.matched ? 'MATCHED' : 'RECONCILED'])
    });
  }
  const total=doc.getNumberOfPages();
  for (let p=1;p<=total;p++) {
    doc.setPage(p);
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(120,120,140);
    doc.setDrawColor(200,200,200); doc.line(pad,287,W-pad,287);
    doc.text(`PREPARED BY: SUB-DIVISIONAL COMMITTEE, ${dist.toUpperCase()} | ASSISTED BY: RSP GREEN DEVELOPMENT AND LABORATORIES PVT. LTD`, pad, 291);
    doc.text(`Page ${p} of ${total}`, W-pad, 291, {align:'right'});
  }
  const fname=`DSR-${dist}-${yr.replace('/','-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fname);
  toast('PDF generated: '+fname,'success');
}
async function generateFinalPDF(regenerate = false) {
  if (!canAccessFinalDsrPdf()) {
    showFinalPdfAccessDenied();
    return;
  }
  const progressBox = document.getElementById('final-pdf-progress');
  const progressLabel = document.getElementById('final-pdf-progress-label');
  const progressPct = document.getElementById('final-pdf-progress-pct');
  const progressBar = document.getElementById('final-pdf-progress-bar');
  const warningBox = document.getElementById('final-pdf-warnings');
  const resultBox = document.getElementById('final-pdf-result');
  const generateBtn = document.getElementById('final-pdf-generate-btn');
  const setProgress = (label, pct) => {
    if (progressBox) progressBox.style.display = 'block';
    if (progressLabel) progressLabel.textContent = label;
    if (progressPct) progressPct.textContent = `${pct}%`;
    if (progressBar) progressBar.style.width = `${pct}%`;
  };
  const showWarnings = (warnings) => {
    if (!warningBox) return;
    if (!warnings.length) {
      warningBox.style.display = 'none';
      warningBox.innerHTML = '';
      return;
    }
    warningBox.style.display = 'block';
    warningBox.innerHTML = `<strong>Warnings:</strong><br>${warnings.map(w => `- ${w}`).join('<br>')}`;
  };
  try {
    if (!window.jspdf || !window.jspdf.jsPDF || !window.jspdf.jsPDF.API.autoTable) {
      setProgress('Loading PDF engine...', 5);
      await ensurePortalVendors(['jspdf', 'autotable']);
    }
    if (generateBtn) generateBtn.disabled = true;
    if (resultBox) resultBox.style.display = 'none';
    setProgress('Collecting Data...', 12);
    if (typeof persistProjectState === 'function') {
      await persistProjectState();
    }
    const warnings = validateFinalPdfInputs();
    showWarnings(warnings);
    setProgress('Building PDF...', 28);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const H = 297;
    const pad = 15;
    const navy = [11, 29, 58];
    const blue = [26, 51, 102];
    const saffron = [196, 154, 88];
    const muted = [86, 96, 112];
    const district = document.getElementById('pdf-district')?.value || S.frontMatter?.district || S.activeProject?.district || 'Punjab';
    const year = document.getElementById('pdf-year')?.value || S.frontMatter?.year || S.activeProject?.year || '2025-26';
    const version = document.getElementById('pdf-version')?.value || S.frontMatter?.version || 'Final Approved Draft';
    const generatedAt = new Date();
    const sectionStarts = [];
    const safe = (value, fallback = '-') => String(value ?? fallback).trim() || fallback;
    const hasText = (value) => String(value ?? '').trim().length > 0;
    const hexToRgb = (hex, fallback = [245, 158, 11]) => {
      const value = String(hex || '').replace('#', '').trim();
      if (!/^[0-9a-f]{6}$/i.test(value)) return fallback;
      return [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16));
    };
    const addHeader = (sectionTitle) => {
      doc.setFillColor(...navy);
      doc.rect(0, 0, W, 14, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('DISTRICT SURVEY REPORT - GOVERNMENT OF PUNJAB - EMGSM 2020', W / 2, 8, { align: 'center' });
      doc.text(sectionTitle.slice(0, 42), W - pad, 8, { align: 'right' });
      doc.setDrawColor(...saffron);
      doc.setLineWidth(0.7);
      doc.line(pad, 15, W - pad, 15);
    };
    const beginSection = (title) => {
      doc.addPage();
      sectionStarts.push({ title, page: doc.getCurrentPageInfo().pageNumber });
      addHeader(title);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(...navy);
      doc.text(title, pad, 28, { maxWidth: W - (pad * 2) });
      doc.setDrawColor(220, 225, 232);
      doc.line(pad, 34, W - pad, 34);
      return 44;
    };
    const writeParagraph = (text, y, options = {}) => {
      if (!hasText(text)) return y;
      doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
      doc.setFontSize(options.size || 10);
      doc.setTextColor(...(options.color || muted));
      const lines = doc.splitTextToSize(String(text), options.width || W - (pad * 2));
      doc.text(lines, options.x || pad, y);
      return y + (lines.length * (options.lineHeight || 5.5)) + (options.after || 6);
    };
    const addImagePage = (src, title) => {
      if (!src) return;
      doc.addPage();
      addHeader(title);
      try {
        const format = String(src).startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
        doc.addImage(src, format, pad, 22, W - (pad * 2), H - 38, undefined, 'FAST');
      } catch (err) {
        try {
          doc.addImage(src, 'JPEG', pad, 22, W - (pad * 2), H - 38, undefined, 'FAST');
        } catch (innerErr) {
          console.warn('Could not embed uploaded page:', innerErr);
        }
      }
    };
    const addUploadedPages = (pages, title) => {
      if (!Array.isArray(pages) || !pages.length) return false;
      pages.forEach((page, index) => addImagePage(page, `${title} - Attachment ${index + 1}`));
      return true;
    };
    const tableRowsFromElement = (table) => {
      if (!table) return null;
      const getCells = (row) => Array.from(row.children)
        .filter(cell => !/action/i.test(cell.innerText || '') && !cell.querySelector('button'))
        .map(cell => {
          const select = cell.querySelector('select');
          return (select ? select.value : cell.innerText || '').replace(/\s+/g, ' ').trim();
        });
      const head = Array.from(table.querySelectorAll('thead tr')).map(getCells).filter(row => row.some(Boolean));
      const bodyRows = Array.from(table.querySelectorAll('tbody tr'))
        .map(row => ({ cells: getCells(row), meta: { origin: row.dataset.phaseOrigin || '', color: row.dataset.phaseColor || '' } }))
        .filter(row => row.cells.some(Boolean));
      const body = bodyRows.map(row => row.cells);
      if (!head.length && !body.length) return null;
      if (!body.some(row => row.some(cell => cell && !/^na$/i.test(cell)))) return null;
      return { head: head.length ? head : [body.shift() || ['Details']], body, rowMeta: bodyRows.map(row => row.meta) };
    };
    const addTable = (table, title) => {
      const data = tableRowsFromElement(table);
      if (!data) return false;
      let y = beginSection(title);
      doc.autoTable({
        startY: y,
        margin: { left: pad, right: pad },
        head: data.head,
        body: data.body,
        theme: 'grid',
        styles: { fontSize: 7.2, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: navy, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 249, 252] },
        didParseCell: (cellData) => {
          if (cellData.section !== 'body') return;
          const rowMeta = data.rowMeta?.[cellData.row.index];
          if (!rowMeta?.color) return;
          cellData.cell.styles.fillColor = hexToRgb(rowMeta.color, [230, 247, 238]);
        }
      });
      return true;
    };
    const addPhaseChangeSummary = () => {
      if (typeof getPhaseChangeSummaryRows !== 'function') return false;
      const rows = getPhaseChangeSummaryRows();
      if (!rows.length) return false;
      let y = beginSection('Phase Change Summary');
      y = writeParagraph(`This report is generated for ${getProjectPhaseLabel(S.activeProject)}. Imported Phase 1 data remains locked; new and updated Phase 2 records are tracked with color metadata.`, y, { size: 9.5, after: 6 });
      doc.autoTable({
        startY: y,
        margin: { left: pad, right: pad },
        head: [['Type', 'Record / Section', 'Color']],
        body: rows.map(row => [row[0], row[1], row[2]]),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2.4 },
        headStyles: { fillColor: navy, textColor: [255, 255, 255] },
        didParseCell: (cellData) => {
          if (cellData.section !== 'body' || cellData.column.index !== 2) return;
          cellData.cell.styles.fillColor = hexToRgb(rows[cellData.row.index]?.[2], [226, 232, 240]);
          cellData.cell.styles.textColor = [20, 24, 32];
        }
      });
      return true;
    };
    const addTables = (configs) => {
      let added = false;
      configs.forEach(cfg => {
        const tables = cfg.all ? Array.from(document.querySelectorAll(cfg.selector)) : [document.querySelector(cfg.selector)].filter(Boolean);
        tables.forEach((table, index) => {
          const suffix = tables.length > 1 ? ` (${index + 1})` : '';
          if (addTable(table, cfg.title + suffix)) added = true;
        });
      });
      return added;
    };
    const addEntryList = (title, entries) => {
      const rows = (entries || []).filter(item => hasText(item.name) || hasText(item.summary) || (item.pages && item.pages.length));
      if (!rows.length) return false;
      let y = beginSection(title);
      rows.forEach((item, index) => {
        if (y > 260) y = beginSection(`${title} Continued`);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...blue);
        doc.text(`${index + 1}. ${safe(item.name, 'Entry')}`, pad, y);
        y += 6;
        y = writeParagraph(item.summary || '', y, { size: 9, after: 4 });
        if (item.fileName) {
          y = writeParagraph(`Attachment: ${item.fileName}`, y, { size: 8.5, color: saffron, after: 6 });
        }
        addUploadedPages(item.pages, `${title} - ${safe(item.name, `Entry ${index + 1}`)}`);
      });
      return true;
    };
    const addGraphSection = () => {
      if (!Array.isArray(S.graphs) || !S.graphs.length) return false;
      let y = beginSection('Cross Section Graphs');
      S.graphs.forEach((g, index) => {
        if (y > 225) y = beginSection('Cross Section Graphs Continued');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...blue);
        doc.text(`${index + 1}. ${safe(g.name || g.subName, 'Cross Section')}`, pad, y);
        y += 7;
        const calc = typeof calcGraph === 'function' ? calcGraph(g) : null;
        doc.autoTable({
          startY: y,
          margin: { left: pad, right: pad },
          head: [['Metric', 'Value']],
          body: [
            ['Distance Points', safe(g.dist)],
            ['Post Monsoon Levels', safe(g.post)],
            ['Reduced Level', safe(g.red)],
            ['Thalweg Level', safe(g.thal)],
            ['Area', safe(g.area)],
            ['Bulk Density', safe(g.bulk)],
            ['Mining Percentage', safe(g.pct) + '%'],
            ['Estimated Volume', calc ? fmtN(calc.volume, 0) : '-']
          ],
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: navy }
        });
        y = doc.lastAutoTable.finalY + 8;
        const canvas = document.getElementById(`canvas-${g.id}-post`) || document.getElementById(`canvas-${g.id}`);
        if (canvas) {
          try {
            doc.addImage(canvas.toDataURL('image/png', 1), 'PNG', pad, y, W - (pad * 2), 65);
            y += 72;
          } catch (err) {
            console.warn('Cross-section canvas capture failed:', err);
          }
        }
      });
      return true;
    };
    const addFrontMatter = () => {
      let y = beginSection('Front Matter');
      y = writeParagraph(safe(S.frontMatter?.title, S.activeProject?.title || 'District Survey Report'), y, { bold: true, size: 14, color: navy, after: 8 });
      const metaRows = [
        ['Project Name', safe(S.activeProject?.title || S.frontMatter?.title)],
        ['District', safe(district)],
        ['Year', safe(year)],
        ['Version', safe(version)],
        ['Generated By', safe(S.user?.name || S.user?.email || 'Portal User')],
        ['Generated On', generatedAt.toLocaleString()]
      ];
      doc.autoTable({
        startY: y,
        margin: { left: pad, right: pad },
        body: metaRows,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2.5 },
        columnStyles: { 0: { fontStyle: 'bold', fillColor: [247, 249, 252] } }
      });
      y = doc.lastAutoTable.finalY + 10;
      y = writeParagraph(S.frontMatter?.preface, y, { after: 8 });
      y = writeParagraph(S.frontMatter?.acknowledgement, y, { after: 8 });
      ['cover', 'cert', 'toc', 'pref'].forEach(key => addUploadedPages(S.uploadedPDFs?.[key], `Front Matter - ${key.toUpperCase()}`));
      return true;
    };
    const addChapter = (chapterNo) => {
      const ch = (S.chapters || []).find(item => Number(item.id) === chapterNo) || (S.chapters || [])[chapterNo - 1];
      if (!ch || (!hasText(ch.name) && !hasText(ch.summary) && !S.chapterPDFs?.[ch.id]?.length)) return false;
      let y = beginSection(`Chapter ${chapterNo}`);
      y = writeParagraph(ch.name || `Chapter ${chapterNo}`, y, { bold: true, size: 13, color: navy, after: 8 });
      y = writeParagraph(ch.summary || 'Chapter content will be appended from uploaded project records.', y);
      if (ch.fileName) y = writeParagraph(`Uploaded source: ${ch.fileName}`, y, { size: 8.5, color: saffron });
      addUploadedPages(S.chapterPDFs?.[ch.id], `Chapter ${chapterNo}`);
      return true;
    };
    const addPlates = () => {
      if (!Array.isArray(S.plates) || !S.plates.length) return false;
      let y = beginSection('All Plate Sections');
      S.plates.forEach((plate, index) => {
        if (y > 260) y = beginSection('All Plate Sections Continued');
        y = writeParagraph(`${index + 1}. ${safe(plate.name, 'Plate')}`, y, { bold: true, size: 10, color: blue, after: 3 });
        y = writeParagraph(plate.summary || '', y, { size: 9, after: 5 });
        if (plate.fileName) y = writeParagraph(`Attachment: ${plate.fileName}`, y, { size: 8.5, color: saffron, after: 5 });
        addUploadedPages(plate.pages, `Plate ${index + 1}`);
      });
      addUploadedPages(S.uploadedPDFs?.plates, 'Plate Section');
      return true;
    };
    const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const withTimeout = (promise, ms, label) => Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms))
    ]);
    const dataUrlToBlob = async (dataUrl) => {
      const res = await fetch(dataUrl);
      return res.blob();
    };
    const pdfBlobToImages = async (blob) => {
      await ensurePortalVendors(['pdfjs']);
      const arrayBuffer = await blob.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pages = [];
      for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
        const page = await pdf.getPage(pageNo);
        const viewport = page.getViewport({ scale: 1.7 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        pages.push(canvas.toDataURL('image/jpeg', 0.92));
      }
      return pages;
    };
    const htmlPreviewToPdfBlob = async (iframe, filename) => {
      await ensurePortalVendors(['html2pdf']);
      const body = iframe?.contentDocument?.body;
      if (!body) return null;
      const opt = {
        margin: 10,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, windowWidth: body.scrollWidth || document.body.scrollWidth },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'h4'] }
      };
      return withTimeout(
        html2pdf().set(opt).from(body).toPdf().get('pdf').then(pdf => pdf.output('blob')),
        9000,
        filename
      );
    };
    const getPreviewIframe = (viewId) => {
      if (window.getAnnexurePreviewIframe) return window.getAnnexurePreviewIframe(viewId);
      const ids = window.pdfPreview?.IFRAME_IDS || {};
      return document.getElementById(ids[viewId] || 'pdf-preview-iframe');
    };
    const waitForPreviewBlob = async (viewId) => {
      const iframe = getPreviewIframe(viewId);
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const src = iframe?.getAttribute('src') || '';
        if (src && src !== 'about:blank') {
          if (src.startsWith('blob:') || src.startsWith('http')) return withTimeout(fetch(src).then(res => res.blob()), 6000, `${viewId} preview fetch`);
          if (src.startsWith('data:application/pdf')) return dataUrlToBlob(src);
        }
        if (iframe?.srcdoc && iframe.contentDocument?.body) {
          return htmlPreviewToPdfBlob(iframe, `${viewId}.pdf`);
        }
        await waitFor(150);
      }
      return null;
    };
    const addNativeTablesAsPreviewFallback = (title, tableConfigs) => {
      const before = doc.getNumberOfPages();
      tableConfigs.forEach(cfg => {
        const tables = cfg.all ? Array.from(document.querySelectorAll(cfg.selector)) : [document.querySelector(cfg.selector)].filter(Boolean);
        tables.forEach((table, index) => addTable(table, `${cfg.title}${tables.length > 1 ? ` (${index + 1})` : ''}`));
      });
      const added = doc.getNumberOfPages() > before;
      if (!added) warnings.push(`${title} has no filled preview tables available.`);
      return added;
    };
    const getAnnexurePreviewPages = async (viewId) => {
      const directPreviewGetters = {
        'annexure-b': 'getAnnexureBPages',
        'annexure-c': 'getAnnexureCPages',
        'annexure-d': 'getAnnexureDPages',
        'annexure-e': 'getAnnexureEPages',
        'annexure-g': 'getAnnexureGPages',
        'annexure-h': 'getAnnexureHPages',
        'annexure-i': 'getAnnexureIPages',
        'annexure-j': 'getAnnexureJPages'
      };
      const getter = directPreviewGetters[viewId];
      if (getter && typeof window.pdfPreview?.[getter] === 'function') {
        return window.pdfPreview[getter]().map(page => typeof page === 'string' ? page : page.src).filter(Boolean);
      }
      const exportFnName = window.pdfPreview?.getAnnexureExportFnName
        ? window.pdfPreview.getAnnexureExportFnName(viewId)
        : `export${viewId.charAt(0).toUpperCase()}${viewId.slice(1)}PDF`;
      if (typeof window[exportFnName] !== 'function') return [];
      const iframe = getPreviewIframe(viewId);
      if (iframe) {
        iframe.removeAttribute('src');
        iframe.removeAttribute('srcdoc');
      }
      const result = window[exportFnName](null, true);
      if (result && typeof result.then === 'function') await result;
      const blob = await waitForPreviewBlob(viewId);
      return blob ? pdfBlobToImages(blob) : [];
    };
    const addAnnexureFromPreview = async (title, viewId) => {
      let pages = [];
      try {
        pages = await withTimeout(getAnnexurePreviewPages(viewId), 14000, title);
      } catch (err) {
        console.warn(`${title} preview capture failed:`, err);
      }
      if (!pages.length) {
        const fallbackTables = {
          anx1: [
            { title: 'Annexure I(a) - Rivers', selector: '#anx1-rivers' },
            { title: 'Annexure I(b) - De-siltation', selector: '#anx1-desilt' },
            { title: 'Annexure I(c) - Patta Lands', selector: '#anx1-patta' },
            { title: 'Annexure I(d) - M-Sand Plants', selector: '#anx1-msand' }
          ],
          anx2: [
            { title: 'Annexure II(a) - Mining Leases', selector: 'table[id^="anx2-leases"]', all: true },
            { title: 'Annexure II(b) - Patta Lands', selector: '#anx2-patta' },
            { title: 'Annexure II(c) - De-siltation', selector: '#anx2-desilt' },
            { title: 'Annexure II(d) - M-Sand Plants', selector: '#anx2-msand' }
          ],
          anx3: [
            { title: 'Annexure III(a) - Clusters', selector: '#anx3-clusters' },
            { title: 'Annexure III(b) - Contiguous Clusters', selector: '#anx3-contiguous' }
          ],
          anx4: [
            { title: 'Annexure IV(a) - Lease Routes', selector: '#anx4-routes' },
            { title: 'Annexure IV(b) - Cluster Routes', selector: '#anx4-cluster-routes' }
          ],
          anx5: [{ title: 'Annexure V - Bench Mark & CORS', selector: '#anx5-benchmarks' }],
          anx6: [{ title: 'Annexure VI - Final Cluster Details', selector: '#anx6-final-clusters' }],
          anx7: [{ title: 'Annexure VII - Transportation Routes', selector: '#anx7-patta-final' }],
          'annexure-f': [
            { title: 'Annexure F - Sand Ghats', selector: '#annexure-f-sand' },
            { title: 'Annexure F - Bench Marks', selector: '#annexure-f-benchmark' },
            { title: 'Annexure F - CORS Stations', selector: '#annexure-f-cors' }
          ],
          'annexure-k': [
            { title: 'Annexure K - Proforma Auctioned Sites', selector: '#annexure-k-proforma' },
            { title: 'Annexure K - Annexure A', selector: '#annexure-k-annexure-a' }
          ]
        };
        if (fallbackTables[viewId]) return addNativeTablesAsPreviewFallback(title, fallbackTables[viewId]);
        warnings.push(`${title} has no PDF Preview pages to include.`);
        return false;
      }
      sectionStarts.push({ title, page: doc.getNumberOfPages() + 1 });
      pages.forEach((page, index) => addImagePage(page, `${title} - Page ${index + 1}`));
      return true;
    };
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...navy);
    doc.text('District Survey Report', W / 2, 70, { align: 'center' });
    doc.setFontSize(16);
    doc.setTextColor(...saffron);
    doc.text(`${district} District`, W / 2, 84, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...muted);
    doc.text(`Final DSR PDF - ${year}`, W / 2, 96, { align: 'center' });
    doc.text(`Generated: ${generatedAt.toLocaleString()}`, W / 2, 106, { align: 'center' });
    doc.text(`Version: ${version}`, W / 2, 116, { align: 'center' });
    doc.addPage();
    const tocPage = doc.getCurrentPageInfo().pageNumber;
    addPhaseChangeSummary();
    addFrontMatter();
    for (let i = 1; i <= 10; i += 1) addChapter(i);
    setProgress('Merging Sections...', 52);
    addPlates();
    addGraphSection();
    const annexurePreviewOrder = [
      ['Annexure I - Sources', 'anx1'],
      ['Annexure II - Leases', 'anx2'],
      ['Annexure III - Clusters', 'anx3'],
      ['Annexure IV - Transport', 'anx4'],
      ['Annexure V - Bench Mark & CORS', 'anx5'],
      ['Annexure VI - Final Cluster Details', 'anx6'],
      ['Annexure VII - Transportation Routes', 'anx7'],
      ['Annexure B', 'annexure-b'],
      ['Annexure C', 'annexure-c'],
      ['Annexure D', 'annexure-d'],
      ['Annexure E', 'annexure-e'],
      ['Annexure F', 'annexure-f'],
      ['Annexure G', 'annexure-g'],
      ['Annexure H', 'annexure-h'],
      ['Annexure I', 'annexure-i'],
      ['Annexure J', 'annexure-j'],
      ['Annexure K', 'annexure-k']
    ];
    for (let annexureIndex = 0; annexureIndex < annexurePreviewOrder.length; annexureIndex += 1) {
      const [title, viewId] = annexurePreviewOrder[annexureIndex];
      setProgress(`Merging Sections... ${title}`, 52 + Math.min(24, Math.round(annexureIndex * 1.4)));
      await addAnnexureFromPreview(title, viewId);
    }
    if (Array.isArray(S.signatures) && S.signatures.length) {
      let y = beginSection('Digital Signature Register');
      doc.autoTable({
        startY: y,
        margin: { left: pad, right: pad },
        head: [['#', 'Role', 'Officer', 'Status', 'Signed At', 'Method']],
        body: S.signatures.map(sig => [
          sig.order || '',
          sig.role || '',
          sig.name || '',
          sig.signed ? 'SIGNED' : 'PENDING',
          sig.signedAt || '-',
          sig.method || '-'
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: navy }
      });
    }
    setProgress('Finalizing Document...', 78);
    doc.setPage(tocPage);
    addHeader('Table of Contents');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...navy);
    doc.text('Table of Contents', pad, 28);
    let tocY = 42;
    sectionStarts.forEach(item => {
      if (tocY > 278) {
        doc.addPage();
        addHeader('Table of Contents');
        tocY = 28;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...muted);
      doc.text(item.title, pad, tocY, { maxWidth: W - 60 });
      doc.text(String(item.page), W - pad, tocY, { align: 'right' });
      doc.setDrawColor(225, 229, 235);
      doc.line(pad, tocY + 1.5, W - pad, tocY + 1.5);
      tocY += 7;
    });
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p += 1) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 126, 140);
      doc.setDrawColor(210, 216, 224);
      doc.line(pad, 286, W - pad, 286);
      doc.text(`Project: ${safe(S.activeProject?.title || S.frontMatter?.title)} | District: ${district} | Version: ${version}`, pad, 291);
      doc.text(`Page ${p} of ${totalPages}`, W - pad, 291, { align: 'right' });
    }
    setProgress('Finalizing Document...', 90);
    const safeDistrict = district.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'Punjab';
    const safeYear = year.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || '2025-26';
    const fileName = `DSR-${safeDistrict}-${safeYear}-Final-${generatedAt.toISOString().slice(0, 10)}.pdf`;
    const dataUri = doc.output('datauristring');
    const base64 = dataUri.split(',')[1];
    if (S.activeProject?.id) {
      await apiFetch('/upload-pdf', {
        method: 'POST',
        body: JSON.stringify({
          projectId: S.activeProject.id,
          fileName,
          pdf: base64,
          annexureId: 'final'
        })
      });
      S.activeProject.finalPdfName = fileName;
      S.activeProject.finalPdfGeneratedAt = generatedAt.toISOString();
      S.activeProject.finalPdfPages = totalPages;
      if (!S.activeProject.pdfData) S.activeProject.pdfData = {};
      S.activeProject.pdfData.final = window.projectPdfUrl ? window.projectPdfUrl('final', true) : `/api/download-pdf?projectId=${encodeURIComponent(S.activeProject.id)}&annexureId=final&inline=true`;
      const idx = S.projects.findIndex(p => String(p.id) === String(S.activeProject.id));
      if (idx !== -1) {
        S.projects[idx].finalPdfName = fileName;
        S.projects[idx].finalPdfGeneratedAt = S.activeProject.finalPdfGeneratedAt;
        S.projects[idx].finalPdfPages = totalPages;
      }
      if (typeof persistProjectState === 'function') await persistProjectState();
      if (typeof renderDashboard === 'function') renderDashboard();
    }
    window.finalDsrPdfBlobUrl = URL.createObjectURL(doc.output('blob'));
    window.finalDsrPdfFileName = fileName;
    setProgress('Finalizing Document...', 100);
    if (resultBox) resultBox.style.display = 'block';
    const pageCountEl = document.getElementById('pdf-page-count');
    if (pageCountEl) pageCountEl.textContent = totalPages;
    showWarnings(warnings);
    if (typeof initLucide === 'function') initLucide();
    toast(`${regenerate ? 'Regenerated' : 'Generated'} final DSR PDF: ${fileName}`, 'success');
  } catch (err) {
    console.error('Final PDF generation failed:', err);
    toast(`Final PDF generation failed: ${err.message || err}`, 'error');
  } finally {
    if (generateBtn) generateBtn.disabled = false;
  }
}
function validateFinalPdfInputs() {
  const warnings = [];
  if (!S.frontMatter || !S.frontMatter.title || !S.frontMatter.district) {
    warnings.push('Front Matter is incomplete.');
  }
  for (let i = 1; i <= 10; i += 1) {
    const ch = (S.chapters || []).find(item => Number(item.id) === i) || (S.chapters || [])[i - 1];
    if (!ch || (!String(ch.summary || '').trim() && !S.chapterPDFs?.[ch.id]?.length)) {
      warnings.push(`Chapter ${i} has no summary or uploaded document.`);
    }
  }
  if (!Array.isArray(S.plates) || !S.plates.length) warnings.push('Plate Section has no plate records.');
  if (!Array.isArray(S.graphs) || !S.graphs.length) warnings.push('Cross Section Graphs are not available.');
  ['anx1', 'anx2', 'anx3', 'anx4', 'anx5', 'anx6', 'anx7'].forEach(key => {
    const hasUpload = Array.isArray(S.uploadedPDFs?.[key]) && S.uploadedPDFs[key].length > 0;
    const hasDomTable = !!document.querySelector(`#${key}-rivers, #${key}-leases, #${key}-clusters, #${key}-routes, #${key}-benchmarks, #${key}-final-clusters, #${key}-patta-final`);
    if (!hasUpload && !hasDomTable) warnings.push(`${key.toUpperCase()} reference data is not loaded or has no attachment.`);
  });
  return warnings;
}
function getFinalPdfUrl(inline = true) {
  if (!S.activeProject?.id || !S.activeProject?.finalPdfName) return window.finalDsrPdfBlobUrl || '';
  return window.projectPdfUrl ? window.projectPdfUrl('final', inline) : `/api/download-pdf?projectId=${encodeURIComponent(S.activeProject.id)}&annexureId=final${inline ? '&inline=true' : ''}`;
}
function canAccessFinalDsrPdf() {
  return S?.role === 'admin' || S?.backendRole === 'ROLE_ADMIN' || S?.user?.email === 'admin@demo.com' || (typeof hasAdminAccess === 'function' && hasAdminAccess());
}
function showFinalPdfAccessDenied() {
  const message = 'Access Denied - Only Administrators can download or email the Final DSR PDF.';
  if (typeof toast === 'function') toast(message, 'error');
  else alert(message);
}
function updateFinalPdfAdminUI() {
  const allowed = canAccessFinalDsrPdf();
  document.querySelectorAll('.final-pdf-admin-action').forEach(el => {
    el.style.display = allowed ? '' : 'none';
    el.disabled = !allowed;
  });
  const lock = document.getElementById('final-pdf-admin-lock');
  if (lock) lock.style.display = allowed ? 'none' : 'block';
}
async function fetchFinalPdfBlob(inline = true) {
  if (!canAccessFinalDsrPdf()) {
    showFinalPdfAccessDenied();
    return null;
  }
  const url = getFinalPdfUrl(inline);
  if (!url) {
    toast('Generate the final PDF first.', 'info');
    return null;
  }
  if (url.startsWith('blob:')) return fetch(url).then(res => res.blob());
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('dsr_token') || ''}`
    }
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || 'Unable to access Final DSR PDF');
  }
  return response.blob();
}
async function previewFinalPDF() {
  const url = getFinalPdfUrl(true);
  try {
    const blob = await fetchFinalPdfBlob(true);
    if (!blob) return;
    window.open(URL.createObjectURL(blob), '_blank');
  } catch (err) {
    toast(err.message || 'Unable to preview Final DSR PDF', 'error');
  }
}
async function downloadFinalPDF() {
  try {
    const blob = await fetchFinalPdfBlob(false);
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = S.activeProject?.finalPdfName || window.finalDsrPdfFileName || 'Final-DSR.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    toast(err.message || 'Unable to download Final DSR PDF', 'error');
  }
}
async function emailFinalPDF() {
  if (!canAccessFinalDsrPdf()) {
    showFinalPdfAccessDenied();
    return;
  }
  if (!S.activeProject?.id || !S.activeProject?.finalPdfName) {
    toast('Generate the final PDF first.', 'info');
    return;
  }
  const email = prompt('Enter recipient email address:', S.user?.email || 'admin@demo.com');
  if (!email) return;
  try {
    await apiFetch('/email-final-pdf', {
      method: 'POST',
      body: JSON.stringify({ projectId: S.activeProject.id, email })
    });
    toast('Final DSR PDF email queued successfully.', 'success');
  } catch (err) {
    toast(err.message || 'Unable to email Final DSR PDF', 'error');
  }
}
window.generateFinalPDF = generateFinalPDF;
window.previewFinalPDF = previewFinalPDF;
window.downloadFinalPDF = downloadFinalPDF;
window.emailFinalPDF = emailFinalPDF;
window.updateFinalPdfAdminUI = updateFinalPdfAdminUI;
window.canAccessFinalDsrPdf = canAccessFinalDsrPdf;
window.showFinalPdfAccessDenied = showFinalPdfAccessDenied;
async function submitForReview(ignoreWarning = false) {
  if (!S.activeProject) return;
  try {
    if (typeof apiFetchReportHistory === 'function') {
      const history = await apiFetchReportHistory(S.activeProject.id);
      if (history && history.length > 0) {
        const latest = history[0];
        if (latest.action === 'RETURN' || latest.action === 'REJECT') {
          alert("Mandatory: You must submit a reply to the reviewer's comments on the dashboard before resubmitting the report.");
          toast("Please submit a reply on the dashboard first.", "error");
          return;
        }
      }
    }
  } catch (err) {
    console.error('Failed to verify report history state:', err);
  }
  try {
    let deoRemarks = 'Submitted by DEO';
    if (!ignoreWarning) {
        const reply = prompt('Enter your reply / remarks for the reviewer (Optional):', '');
        if (reply !== null && reply.trim() !== '') {
            deoRemarks = reply.trim();
        } else if (reply === null) {
            return; // Cancelled
        }
    }
    const payload = { action: 'SUBMIT', remarks: deoRemarks, ignoreWarning: ignoreWarning };
    await apiFetch(`/reports/${S.activeProject.id}/workflow`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    toast('Report submitted to authority dashboard!', 'success');
    if (typeof renderProjects === 'function') renderProjects();
    showView('dashboard', null);
  } catch (e) {
    if (e.isWarning) {
       if (confirm(e.warningData.message || "You are submitting the same data. Do you want to proceed?")) {
           submitForReview(true);
       }
    } else {
       toast('Error submitting report: ' + e.message, 'error');
    }
  }
}
/* ══════════════════════════════════════
   AUTHORITY DASHBOARD
 ══════════════════════════════════════ */
function renderAuthorityReports() {
  const el=document.getElementById('authority-reports'); if(!el) return;
  const reports=[
    { id:1, title:'DSR — Jalandhar Sand Mining 2025-26', district:'Jalandhar', by:'Rajinder Kumar, SDO', at:'May 21, 2026 · 11:42 AM', status:'Awaiting Your Signature', done:1, sections:12 },
    { id:2, title:'DSR — Ludhiana Sand Mining 2025-26', district:'Ludhiana', by:'Priya Sharma, SDO', at:'May 20, 2026 · 3:15 PM', status:'Under Review', done:1, sections:10 },
    { id:3, title:'DSR — Patiala Sand Mining 2025-26', district:'Patiala', by:'Harjinder Singh, SDO', at:'May 19, 2026 · 9:00 AM', status:'Awaiting Your Signature', done:1, sections:11 }
  ];
  el.innerHTML=reports.map(r=>`
    <div class="review-card">
      <div class="review-card-hd">
        <div><div style="font-size:14.5px;font-weight:700;color:var(--text)">${r.title}</div>
          <div style="font-size:11px;color:var(--text-soft);margin-top:2px">Submitted by ${r.by} · ${r.at}</div></div>
        <span class="badge ${r.status.includes('Awaiting')?'badge-saffron':'badge-amber'}">${r.status}</span>
      </div>
      <div class="review-card-bd">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
          <span class="badge badge-navy" style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="map-pin" style="width:12px;height:12px;"></i>${r.district}</span>
          <span class="badge badge-teal" style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="check-circle-2" style="width:12px;height:12px;"></i>${r.done}/5 signed</span>
          <span class="badge badge-navy" style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="file-text" style="width:12px;height:12px;"></i>${r.sections} sections</span>
          <div style="flex:1"></div>
          <button class="btn btn-outline btn-sm" onclick="toast('PDF preview opened','info')">👁 Preview</button>
          <button class="btn btn-navy btn-sm" onclick="toast('DSR-${r.district}-2025-26.pdf downloading...','info')">Download</button>
          <button class="btn btn-saffron btn-sm" onclick="openAuthoritySign(${r.id},'${r.title}')">Sign Now</button>
        </div>
        <div style="font-size:11px;font-weight:600;color:var(--text-soft);margin-bottom:7px">Signature Progress:</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${['SDO','DMO','DC','Director','Pr. Secy'].map((role,i)=>`
            <div style="display:flex;align-items:center;gap:4px;background:${i<r.done?'var(--green-lt)':i===r.done?'var(--saffron-lt)':'var(--bg)'};border:1px solid ${i<r.done?'var(--green)':i===r.done?'var(--saffron)':'var(--border)'};border-radius:99px;padding:4px 10px;font-size:11px;font-weight:600;color:${i<r.done?'var(--green)':i===r.done?'var(--saffron)':'var(--text-faint)'}">
              <i data-lucide="${i<r.done?'check-circle-2':i===r.done?'clock':'minus-circle'}" style="width:12px;height:12px;"></i>
              ${role}
            </div>`).join('')}
        </div>
      </div>
    </div>`).join('');
  initLucide();
}
function openAuthoritySign(id, title) {
  document.getElementById('auth-sign-content').innerHTML=`
    <div style="background:var(--off);border:1px solid var(--border);border-radius:var(--r-md);padding:14px;margin-bottom:14px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-faint);margin-bottom:4px">Report to Sign</div>
      <div style="font-size:14px;font-weight:700;color:var(--text)">${title}</div>
      <div style="font-size:11.5px;color:var(--text-soft);margin-top:3px">Your position: District Mining Officer (Authority #2)</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:9px">
      <label style="display:flex;align-items:center;gap:9px;cursor:pointer;font-size:12.5px"><input type="checkbox" checked> I have reviewed the complete DSR report</label>
      <label style="display:flex;align-items:center;gap:9px;cursor:pointer;font-size:12.5px"><input type="checkbox" checked> I certify data accuracy and EMGSM 2020 compliance</label>
      <label style="display:flex;align-items:center;gap:9px;cursor:pointer;font-size:12.5px"><input type="checkbox" checked> I authorize forwarding to the next authority</label>
    </div>`;
  document.getElementById('auth-otp').value='';
  document.getElementById('modal-auth-sign').classList.add('open');
  if (typeof initSignaturePad === 'function') {
    initSignaturePad('auth-signature-pad');
  }
  initLucide();
}
function authoritySign() {
  if (document.getElementById('auth-otp').value!=='123456') { toast('Invalid OTP. Demo: 123456','error'); return; }
  closeModal('modal-auth-sign');
  toast('Report signed! Deputy Commissioner has been notified.','success');
}
