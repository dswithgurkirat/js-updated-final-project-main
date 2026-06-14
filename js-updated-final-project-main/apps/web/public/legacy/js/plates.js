/* ══════════════════════════════════════
   PLATES SECTION MANAGEMENT
   ══════════════════════════════════════ */
function renderPlates() {
  const el = document.getElementById('plate-list');
  if (!el) return;
  if (!S.plates.length) {
    el.innerHTML = '<div class="empty-state"><span class="empty-icon">🗂️</span><h3>No plates added yet</h3><p>Click "Add Plate" to setup maps, graphs, and images</p></div>';
    return;
  }
  el.innerHTML = S.plates.map((p, i) => {
    let fileInfoHTML = '';
    if (p.fileName) {
      fileInfoHTML = `
        <div class="file-item" style="margin-top:10px; background:var(--off); border:1px solid var(--border); max-width:480px; display:flex; align-items:center; justify-content:space-between; padding:8px 12px; border-radius:var(--r-sm);">
          <div style="display:flex; align-items:center; gap:6px;">
            <div class="file-icon" style="background:var(--teal-lt); color:var(--teal); padding:6px; border-radius:var(--r-xs); font-size:14px;">📄</div>
            <div style="line-height:1.2;">
              <div style="font-size:11.5px; font-weight:600; color:var(--text);">${p.fileName}</div>
              <div style="font-size:9.5px; color:var(--text-faint);">${p.fileSize || ''} · ${p.pages ? p.pages.length : 0} Page(s)</div>
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <label class="btn btn-xs btn-outline" style="cursor:pointer; margin:0;">
              Replace <input type="file" accept=".pdf,image/*" hidden onchange="handlePlateUpload(event,${p.id})">
            </label>
            <button type="button" class="btn btn-xs btn-danger" onclick="deletePlateFile(${p.id})">Remove</button>
          </div>
        </div>`;
    } else {
      fileInfoHTML = `
        <div>
          <label class="btn btn-xs btn-outline" style="cursor:pointer;">
            📎 Upload PDF/Image <input type="file" accept=".pdf,image/*" hidden onchange="handlePlateUpload(event,${p.id})">
          </label>
        </div>`;
    }
    return `
    <div class="chapter-item">
      <div class="ch-num" style="background:var(--teal)">P${i + 1}</div>
      <div class="ch-body">
        <input class="ch-name-input" value="${p.name}" oninput="S.plates[${i}].name=this.value" placeholder="Plate Name">
        <textarea class="ch-summary" rows="2" oninput="S.plates[${i}].summary=this.value" placeholder="Plate Description...">${p.summary}</textarea>
        <div style="margin-top:8px; display:flex; flex-direction:column; gap:6px;">
          ${fileInfoHTML}
        </div>
      </div>
      <div style="display:flex; gap:5px; flex-shrink:0">
        ${i > 0 ? `<button class="btn btn-xs btn-outline" onclick="movePlate(${i},-1)">↑</button>` : ''}
        ${i < S.plates.length - 1 ? `<button class="btn btn-xs btn-outline" onclick="movePlate(${i},1)">↓</button>` : ''}
        <button class="btn btn-xs btn-danger" onclick="deletePlateReq(${p.id})">✕</button>
      </div>
    </div>`;
  }).join('');
}
function addPlate() {
  S.plates.push({
    id: Date.now(),
    name: 'NEW PLATE — ENTER TITLE',
    summary: 'Enter plate description here...',
    fileName: null,
    fileSize: null,
    pages: null
  });
  renderPlates();
  if (window.debouncedSaveState) window.debouncedSaveState();
}
function deletePlateReq(id) {
  customConfirm('Remove this plate completely?', () => {
    S.plates = S.plates.filter(p => p.id !== id);
    renderPlates();
    if (window.pdfPreview) window.pdfPreview.notifyUpdate('plates');
    if (window.debouncedSaveState) window.debouncedSaveState();
    toast('Plate removed', 'info');
  });
}
function movePlate(idx, dir) {
  [S.plates[idx], S.plates[idx + dir]] = [S.plates[idx + dir], S.plates[idx]];
  renderPlates();
  if (window.pdfPreview) window.pdfPreview.notifyUpdate('plates');
  if (window.debouncedSaveState) window.debouncedSaveState();
}
function handlePlateUpload(e, id) {
  const f = e.target.files[0];
  if (!f) return;
  const p = S.plates.find(x => x.id === id);
  if (!p) return;
  const sizeStr = (f.size / 1024).toFixed(1) + ' KB';
  if (f.type === 'application/pdf') {
    p.fileName = f.name;
    p.fileSize = 'Processing PDF...';
    renderPlates();
    if (typeof renderPdfToImages === 'function') {
      renderPdfToImages(f, (err, imgs) => {
        if (err) {
          console.error(err);
          toast('⚠️ PDF render failed, falling back to basic preview', 'error');
          const url = URL.createObjectURL(f);
          p.pages = [url];
          p.fileSize = sizeStr;
          renderPlates();
          if (window.pdfPreview) window.pdfPreview.notifyUpdate('plates');
          if (window.debouncedSaveState) window.debouncedSaveState();
          return;
        }
        p.pages = imgs;
        p.fileSize = sizeStr;
        toast(`📄 ${f.name} processed and loaded!`, 'success');
        renderPlates();
        if (window.pdfPreview) window.pdfPreview.notifyUpdate('plates');
        if (window.debouncedSaveState) window.debouncedSaveState();
      });
    } else {
      const url = URL.createObjectURL(f);
      p.pages = [url];
      p.fileSize = sizeStr;
      renderPlates();
      if (window.pdfPreview) window.pdfPreview.notifyUpdate('plates');
      if (window.debouncedSaveState) window.debouncedSaveState();
    }
  } else if (f.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = function (evt) {
      p.pages = [evt.target.result];
      p.fileName = f.name;
      p.fileSize = sizeStr;
      toast(`🖼️ ${f.name} uploaded successfully!`, 'success');
      renderPlates();
      if (window.pdfPreview) window.pdfPreview.notifyUpdate('plates');
      if (window.debouncedSaveState) window.debouncedSaveState();
    };
    reader.readAsDataURL(f);
  } else {
    toast('❌ Unsupported file format. Please upload a PDF or an Image.', 'error');
  }
}
function deletePlateFile(id) {
  const p = S.plates.find(x => x.id === id);
  if (p) {
    p.fileName = null;
    p.fileSize = null;
    p.pages = null;
    renderPlates();
    if (window.pdfPreview) window.pdfPreview.notifyUpdate('plates');
    if (window.debouncedSaveState) window.debouncedSaveState();
    toast('Plate file removed', 'success');
  }
}
window.deletePlateFile = deletePlateFile;
window.handlePlateUpload = handlePlateUpload;
window.addPlate = addPlate;
window.deletePlateReq = deletePlateReq;
window.movePlate = movePlate;
