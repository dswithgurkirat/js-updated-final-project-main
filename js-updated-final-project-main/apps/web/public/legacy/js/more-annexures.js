function registerSimpleAnnexure(letter) {
  const lower = letter.toLowerCase();
  const stateKey = `annexure${letter}`;
  const slug = `annexure-${lower}`;
  const renderName = `renderAnnexure${letter}`;
  const saveAndPreview = () => {
    if (window.pdfPreview) window.pdfPreview.notifyUpdate(slug);
    if (window.debouncedSaveState) window.debouncedSaveState();
  };
  const ensureDefaultRow = () => {
    if (!Array.isArray(S[stateKey])) S[stateKey] = [];
    if (!S[stateKey].length) {
      S[stateKey].push({
        id: Date.now(),
        name: `Annexure ${letter} - Entry 1`,
        summary: `Upload your Annexure ${letter} PDF or image here.`,
        fileName: null,
        fileSize: null,
        pages: null
      });
    }
  };
  window[renderName] = function() {
    const el = document.getElementById(`${slug}-list`);
    if (!el) return;
    ensureDefaultRow();
    el.innerHTML = S[stateKey].map((p, i) => {
      const fileInfoHTML = p.fileName ? `
        <div class="file-item" style="margin-top:10px; background:var(--off); border:1px solid var(--border); max-width:480px; display:flex; align-items:center; justify-content:space-between; padding:8px 12px; border-radius:var(--r-sm);">
          <div style="display:flex; align-items:center; gap:6px;">
            <div class="file-icon" style="background:var(--teal-lt); color:var(--teal); padding:6px; border-radius:var(--r-xs); font-size:14px;">ðŸ“„</div>
            <div style="line-height:1.2;">
              <div style="font-size:11.5px; font-weight:600; color:var(--text);">${p.fileName}</div>
              <div style="font-size:9.5px; color:var(--text-faint);">${p.fileSize || ''} Â· ${p.pages ? p.pages.length : 0} Page(s)</div>
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <label class="btn btn-xs btn-outline" style="cursor:pointer; margin:0;">
              Replace <input type="file" accept=".pdf,image/*" hidden onchange="handleAnnexure${letter}Upload(event,${p.id})">
            </label>
            <button type="button" class="btn btn-xs btn-danger" onclick="deleteAnnexure${letter}File(${p.id})">Remove</button>
          </div>
        </div>` : `
        <div>
          <label class="btn btn-xs btn-outline" style="cursor:pointer;">
            ðŸ“Ž Upload PDF/Image <input type="file" accept=".pdf,image/*" hidden onchange="handleAnnexure${letter}Upload(event,${p.id})">
          </label>
        </div>`;
      return `
    <div class="chapter-item">
      <div class="ch-num" style="background:var(--teal)">${letter}${i + 1}</div>
      <div class="ch-body">
        <input class="ch-name-input" value="${p.name}" oninput="S.${stateKey}[${i}].name=this.value" placeholder="Entry Name">
        <textarea class="ch-summary" rows="2" oninput="S.${stateKey}[${i}].summary=this.value" placeholder="Entry Description...">${p.summary}</textarea>
        <div style="margin-top:8px; display:flex; flex-direction:column; gap:6px;">
          ${fileInfoHTML}
        </div>
      </div>
      <div style="display:flex; gap:5px; flex-shrink:0">
        ${i > 0 ? `<button class="btn btn-xs btn-outline" onclick="moveAnnexure${letter}(${i},-1)">â†‘</button>` : ''}
        ${i < S[stateKey].length - 1 ? `<button class="btn btn-xs btn-outline" onclick="moveAnnexure${letter}(${i},1)">â†“</button>` : ''}
        <button class="btn btn-xs btn-danger" onclick="deleteAnnexure${letter}Req(${p.id})">âœ•</button>
      </div>
    </div>`;
    }).join('');
    if (typeof applyMoreAnnexureAccess === 'function') applyMoreAnnexureAccess(document.getElementById(`view-${slug}`));
  };
  window[`addAnnexure${letter}`] = function() {
    ensureDefaultRow();
    S[stateKey].push({ id: Date.now(), name: 'NEW ENTRY â€” ENTER TITLE', summary: 'Enter description here...', fileName: null, fileSize: null, pages: null });
    window[renderName]();
    if (window.debouncedSaveState) window.debouncedSaveState();
  };
  window[`deleteAnnexure${letter}Req`] = function(id) {
    customConfirm('Remove this annexure entry completely?', () => {
      S[stateKey] = S[stateKey].filter(p => p.id !== id);
      window[renderName]();
      saveAndPreview();
      toast('Entry removed', 'info');
    });
  };
  window[`moveAnnexure${letter}`] = function(idx, dir) {
    [S[stateKey][idx], S[stateKey][idx + dir]] = [S[stateKey][idx + dir], S[stateKey][idx]];
    window[renderName]();
    saveAndPreview();
  };
  window[`handleAnnexure${letter}Upload`] = function(e, id) {
    const f = e.target.files[0];
    if (!f) return;
    const p = S[stateKey].find(x => x.id === id);
    if (!p) return;
    const sizeStr = (f.size / 1024).toFixed(1) + ' KB';
    const finish = () => {
      window[renderName]();
      saveAndPreview();
    };
    if (f.type === 'application/pdf') {
      p.fileName = f.name;
      p.fileSize = 'Processing PDF...';
      window[renderName]();
      if (typeof renderPdfToImages === 'function') {
        renderPdfToImages(f, (err, imgs) => {
          if (err) {
            console.error(err);
            toast('âš ï¸ PDF render failed, falling back to basic preview', 'error');
            p.pages = [URL.createObjectURL(f)];
            p.fileSize = sizeStr;
            finish();
            return;
          }
          p.pages = imgs;
          p.fileSize = sizeStr;
          toast(`ðŸ“„ ${f.name} processed and loaded!`, 'success');
          finish();
        });
      } else {
        p.pages = [URL.createObjectURL(f)];
        p.fileSize = sizeStr;
        finish();
      }
    } else if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(evt) {
        p.pages = [evt.target.result];
        p.fileName = f.name;
        p.fileSize = sizeStr;
        toast(`ðŸ–¼ï¸ ${f.name} uploaded successfully!`, 'success');
        finish();
      };
      reader.readAsDataURL(f);
    } else {
      toast('âŒ Unsupported file format. Please upload a PDF or an Image.', 'error');
    }
  };
  window[`deleteAnnexure${letter}File`] = function(id) {
    const p = S[stateKey].find(x => x.id === id);
    if (!p) return;
    p.fileName = null;
    p.fileSize = null;
    p.pages = null;
    window[renderName]();
    saveAndPreview();
    toast('File removed', 'success');
  };
}
window.registerSimpleAnnexure = registerSimpleAnnexure;
