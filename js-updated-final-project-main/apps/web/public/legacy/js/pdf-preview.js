/* ══════════════════════════════════════
   PDF PREVIEW PANEL
   Split workspace for Front Matter,
   Chapters, and Plate Section.
══════════════════════════════════════ */
const pdfPreview = {
  scale: 1.0,
  currentView: null,
  panel: null,
  body: null,
  scrollEl: null,
  viewerEl: null,
  titleEl: null,
  zoomLabels: [],
  currentPage: 1,
  totalPages: 0,
  _scrollRaf: null,
  _textRefreshTimer: null,
  _annexureRefreshTimers: {},
  _objectUrls: {},
  _pdfRenderJobs: {},
  fitPdfViewerUrl(src) {
    if (!src || src === 'about:blank' || src.startsWith('blob:') || src.startsWith('data:')) return src || 'about:blank';
    const base = String(src).split('#')[0];
    return `${base}#view=FitH&zoom=page-width`;
  },
  SECTION_TITLES: {
    'front-matter': 'Live Preview',
    'chapters': 'Live Preview',
    'plates': 'PDF Preview',
    'anx1': 'Annexure I Preview',
    'anx2': 'Annexure II Preview',
    'anx3': 'Annexure III Preview',
    'anx4': 'Annexure IV Preview',
    'anx5': 'Annexure V Preview',
    'anx6': 'Annexure VI Preview',
    'anx7': 'Annexure VII Preview',
    'annexure-b': 'PDF Preview',
    'annexure-c': 'PDF Preview',
    'annexure-d': 'PDF Preview',
    'annexure-e': 'PDF Preview',
    'annexure-f': 'PDF Preview',
    'annexure-g': 'PDF Preview',
    'annexure-h': 'PDF Preview',
    'annexure-i': 'PDF Preview',
    'annexure-j': 'PDF Preview',
    'annexure-k': 'PDF Preview'
  },
  IFRAME_IDS: {
    'anx1': 'pdf-iframe',
    'anx2': 'pdf-iframe-anx2',
    'anx3': 'pdf-iframe-anx3',
    'anx4': 'pdf-iframe-anx4',
    'anx5': 'pdf-iframe-anx5',
    'anx6': 'pdf-iframe-anx6',
    'anx7': 'pdf-iframe-anx7',
    'annexure-f': 'pdf-iframe-annexure-f-preview',
    'annexure-k': 'pdf-iframe-annexure-k-preview'
  },
  isAnnexureView(viewId) {
    return !!viewId && (viewId.startsWith('anx') || viewId.startsWith('annexure-'));
  },
  FM_ORDER: ['cover', 'toc', 'pref', 'ack', 'cert'],
  FM_LABELS: {
    cover: 'Cover Page',
    toc: 'Content Page',
    pref: 'Preface',
    ack: 'Acknowledgement',
    cert: 'Certificate of Compliance'
  },
  init() {
    this.panel = document.getElementById('pdf-preview-panel');
    if (!this.panel) return;
    const workspace = document.querySelector('.app-workspace');
    if (workspace && this.panel.parentElement !== workspace) {
      workspace.appendChild(this.panel);
    }
    this.body = this.panel.querySelector('.pdf-preview-body');
    this.scrollEl = document.getElementById('pdf-preview-scroll') || this.body;
    this.viewerEl = document.getElementById('pdf-preview-viewer');
    this.titleEl = document.getElementById('pdf-preview-title');
    this.zoomLabels = [
      document.getElementById('pdf-preview-zoom-lbl'),
      document.getElementById('pdf-preview-float-zoom-lbl')
    ].filter(Boolean);
    this.bindEvents();
    this.bindMobileTabs();
  },
  bindEvents() {
    const el = (id) => document.getElementById(id);
    const zoomIn = () => this.zoomIn();
    const zoomOut = () => this.zoomOut();
    el('pdf-preview-zoom-in')?.addEventListener('click', zoomIn);
    el('pdf-preview-zoom-out')?.addEventListener('click', zoomOut);
    el('pdf-preview-inner-zoom-in')?.addEventListener('click', zoomIn);
    el('pdf-preview-inner-zoom-out')?.addEventListener('click', zoomOut);
    el('pdf-preview-float-zoom-in')?.addEventListener('click', zoomIn);
    el('pdf-preview-float-zoom-out')?.addEventListener('click', zoomOut);
    el('pdf-preview-refresh')?.addEventListener('click', () => this.refresh());
    el('pdf-preview-fullscreen')?.addEventListener('click', () => this.fullScreen());
    el('pdf-preview-inner-fullscreen')?.addEventListener('click', () => this.fullScreen());
    el('pdf-preview-download')?.addEventListener('click', () => this.download());
    if (this.scrollEl) {
      this.scrollEl.addEventListener('scroll', () => {
        if (this._scrollRaf) cancelAnimationFrame(this._scrollRaf);
        this._scrollRaf = requestAnimationFrame(() => this.updateVisiblePage());
      });
    }
  },
  bindMobileTabs() {
    const tabs = document.getElementById('pdf-preview-mobile-tabs');
    if (!tabs) return;
    tabs.querySelectorAll('.pdf-preview-mobile-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        document.body.classList.remove('preview-mobile-tab-editor', 'preview-mobile-tab-preview');
        if (tab === 'preview') document.body.classList.add('preview-mobile-tab-preview');
        else document.body.classList.add('preview-mobile-tab-editor');
        tabs.querySelectorAll('.pdf-preview-mobile-tab').forEach(b => b.classList.toggle('active', b === btn));
      });
    });
  },
  show(viewId) {
    this.currentView = viewId;
    document.body.classList.add('preview-open');
    document.body.classList.add('preview-mobile-tab-editor');
    document.body.classList.remove('preview-mobile-tab-preview');
    document.querySelector('.app-workspace')?.classList.add('preview-open');
    if (this.panel) {
      this.panel.hidden = false;
      this.panel.classList.add('open');
    }
    const mobileTabs = document.getElementById('pdf-preview-mobile-tabs');
    if (mobileTabs) mobileTabs.setAttribute('aria-hidden', 'false');
    if (this.titleEl) this.titleEl.textContent = this.SECTION_TITLES[viewId] || 'PDF Preview';
    const isAnnexure = this.isAnnexureView(viewId);
    const scrollContainer = this.scrollEl;
    const iframe = document.getElementById('pdf-preview-iframe') || document.querySelector('.pdf-preview-viewer iframe');
    const innerBar = document.querySelector('.pdf-preview-inner-bar');
    const floatZoom = document.querySelector('.pdf-preview-float-zoom');
    const floatPage = document.getElementById('pdf-preview-float-page');
    const actionToolbarLeft = document.querySelector('.pdf-preview-actions-left');
    if (isAnnexure) {
      if (scrollContainer) scrollContainer.style.display = 'none';
      if (innerBar) innerBar.style.display = 'none';
      if (floatZoom) floatZoom.style.display = 'none';
      if (floatPage) floatPage.style.display = 'none';
      if (actionToolbarLeft) actionToolbarLeft.style.display = 'none';
      if (iframe) {
        iframe.style.display = 'block';
        iframe.id = this.IFRAME_IDS[viewId] || 'pdf-preview-iframe';
        const savedPdf = S.activeProject && S.activeProject.pdfData && S.activeProject.pdfData[viewId];
        if (savedPdf) {
          iframe.src = this.fitPdfViewerUrl(savedPdf);
        } else {
          iframe.src = 'about:blank';
          this.generateAnnexureLivePreview(viewId, 700);
        }
      }
    } else {
      if (scrollContainer) scrollContainer.style.display = 'flex';
      if (innerBar) innerBar.style.display = 'flex';
      if (floatZoom) floatZoom.style.display = 'flex';
      if (floatPage) floatPage.style.display = 'block';
      if (actionToolbarLeft) actionToolbarLeft.style.display = 'flex';
      if (iframe) {
        iframe.style.display = 'none';
        iframe.src = 'about:blank';
        iframe.id = 'pdf-preview-iframe';
      }
    }
    this.scale = 1.0;
    this.refresh();
    if (window.initLucide) initLucide();
  },
  hide() {
    this.currentView = null;
    document.body.classList.remove('preview-open', 'preview-mobile-tab-editor', 'preview-mobile-tab-preview');
    document.querySelector('.app-workspace')?.classList.remove('preview-open');
    if (this.panel) {
      this.panel.classList.remove('open');
      this.panel.hidden = true;
      this.panel.style.transform = '';
    }
    const mobileTabs = document.getElementById('pdf-preview-mobile-tabs');
    if (mobileTabs) mobileTabs.setAttribute('aria-hidden', 'true');
    const fsTarget = this.viewerEl || this.panel;
    if (document.fullscreenElement === fsTarget) {
      document.exitFullscreen().catch(() => {});
    }
  },
  notifyUpdate(viewId) {
    if (this.currentView === viewId) {
      if (viewId === 'front-matter') {
        clearTimeout(this._textRefreshTimer);
        this._textRefreshTimer = setTimeout(() => this.refresh(), 180);
      } else {
        this.refresh();
      }
    }
  },
  refresh() {
    if (!this.currentView) return;
    const viewId = this.currentView;
    const isAnnexure = this.isAnnexureView(viewId);
    if (isAnnexure) {
      const uploadedImgs = S.uploadedPDFs && S.uploadedPDFs[viewId];
      const targetIframeId = this.IFRAME_IDS[viewId] || 'pdf-preview-iframe';
      const iframe = document.getElementById(targetIframeId) || document.getElementById('pdf-preview-iframe');
      const scrollContainer = this.scrollEl;
      const innerBar = document.querySelector('.pdf-preview-inner-bar');
      const floatZoom = document.querySelector('.pdf-preview-float-zoom');
      const floatPage = document.getElementById('pdf-preview-float-page');
      const actionToolbarLeft = document.querySelector('.pdf-preview-actions-left');
      if (uploadedImgs && uploadedImgs.length) {
        if (iframe) iframe.style.display = 'none';
        if (scrollContainer) scrollContainer.style.display = 'flex';
        if (innerBar) innerBar.style.display = 'flex';
        if (floatZoom) floatZoom.style.display = 'flex';
        if (floatPage) floatPage.style.display = 'block';
        if (actionToolbarLeft) actionToolbarLeft.style.display = 'flex';
        this.renderPages(uploadedImgs);
      } else {
        if (scrollContainer) scrollContainer.style.display = 'none';
        if (innerBar) innerBar.style.display = 'none';
        if (floatZoom) floatZoom.style.display = 'none';
        if (floatPage) floatPage.style.display = 'none';
        if (actionToolbarLeft) actionToolbarLeft.style.display = 'none';
        if (iframe) {
          iframe.style.display = 'block';
          const savedPdf = S.activeProject && S.activeProject.pdfData && S.activeProject.pdfData[viewId];
          const fittedPdf = this.fitPdfViewerUrl(savedPdf);
          if (savedPdf && iframe.src !== fittedPdf) {
            iframe.src = fittedPdf;
          } else if (!savedPdf) {
            iframe.src = 'about:blank';
            this.generateAnnexureLivePreview(viewId, 300);
          }
        }
      }
    } else {
      if (!this.body) return;
      switch (this.currentView) {
        case 'front-matter': this.renderFrontMatter(); break;
        case 'chapters': this.renderChapters(); break;
        case 'plates': this.renderPlates(); break;
        case 'annexure-b': this.renderAnnexureB(); break;
        case 'annexure-c': this.renderAnnexureC(); break;
        case 'annexure-d': this.renderAnnexureD(); break;
        case 'annexure-e': this.renderAnnexureE(); break;
        case 'annexure-g': this.renderAnnexureG(); break;
        case 'annexure-h': this.renderAnnexureH(); break;
        case 'annexure-i': this.renderAnnexureI(); break;
        case 'annexure-j': this.renderAnnexureJ(); break;
      }
    }
    if (window.initLucide) initLucide();
  },
  getAnnexureExportFnName(viewId) {
    if (viewId === 'annexure-f') return 'exportAnnexureFPDF';
    if (viewId === 'annexure-k') return 'exportAnnexureKPDF';
    return 'export' + viewId.charAt(0).toUpperCase() + viewId.slice(1) + 'PDF';
  },
  annexureNeedsPdfVendors(viewId) {
    return viewId !== 'anx1';
  },
  getAnnexureSourceView(viewId) {
    return document.getElementById(`view-${viewId}`);
  },
  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
  async renderPdfUrlToImages(src) {
    if (!src) throw new Error('Missing PDF source.');
    if (typeof pdfjsLib === 'undefined') {
      if (typeof ensurePortalVendor === 'function') {
        await ensurePortalVendor('pdfjs');
      } else {
        throw new Error('PDF.js library is not loaded on this page.');
      }
    }
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }
    const headers = {};
    const token = localStorage.getItem('dsr_token');
    if (token && /^\/?api\//i.test(String(src).replace(/^https?:\/\/[^/]+/i, '').replace(/^\//, ''))) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(src, {
      credentials: 'same-origin',
      headers
    });
    if (!response.ok) throw new Error(`Unable to load uploaded PDF (${response.status}).`);
    const data = new Uint8Array(await response.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const pages = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
      pages.push(canvas.toDataURL('image/jpeg', 0.85));
    }
    return pages;
  },
  ensureUploadedPdfRendered(type, src, meta = {}) {
    if (!type || !src || !window.S) return;
    if (!S.uploadedPDFs) S.uploadedPDFs = {};
    if (Array.isArray(S.uploadedPDFs[type]) && S.uploadedPDFs[type].some(item => /^data:image\//i.test(String(item || '')))) return;
    const jobKey = `${type}:${src}`;
    if (this._pdfRenderJobs[jobKey]) return;
    this._pdfRenderJobs[jobKey] = this.renderPdfUrlToImages(src)
      .then(pages => {
        if (!pages || !pages.length) throw new Error('No PDF pages rendered.');
        if (!S.uploadedPDFs) S.uploadedPDFs = {};
        S.uploadedPDFs[type] = pages;
        if (!S.frontMatterFiles) S.frontMatterFiles = {};
        S.frontMatterFiles[type] = {
          ...(S.frontMatterFiles[type] || {}),
          ...meta,
          pages: pages.length
        };
        if (this.currentView === 'front-matter') this.refresh();
      })
      .catch(err => {
        console.warn('Uploaded PDF live preview render failed:', err);
        if (!S.frontMatterFiles) S.frontMatterFiles = {};
        S.frontMatterFiles[type] = {
          ...(S.frontMatterFiles[type] || {}),
          previewError: err.message || 'Unable to render uploaded PDF.'
        };
        if (this.currentView === 'front-matter') this.refresh();
      })
      .finally(() => {
        delete this._pdfRenderJobs[jobKey];
      });
  },
  cleanupAnnexurePreviewClone(clone) {
    clone.querySelectorAll([
      'script',
      'style',
      'input[type="file"]',
      'button',
      '.btn',
      '.actions',
      '.toolbar',
      '.page-actions',
      '.upload-actions',
      '.header-row',
      '.notif',
      '.page-title',
      '.page-sub',
      '.annexure-line-instructions',
      '.annexure-instructions-card'
    ].join(',')).forEach(el => el.remove());
    clone.querySelectorAll('input, textarea, select').forEach(el => {
      const value = el.tagName === 'SELECT'
        ? (el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : el.value)
        : el.value;
      const span = document.createElement('span');
      span.className = 'field-value';
      span.textContent = value || 'NUL';
      el.replaceWith(span);
    });
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    clone.querySelectorAll('[style]').forEach(el => {
      const keep = [];
      const style = el.getAttribute('style') || '';
      style.split(';').forEach(part => {
        if (/grid-template-columns|min-width|text-align/i.test(part)) keep.push(part);
      });
      if (keep.length) el.setAttribute('style', keep.join(';'));
      else el.removeAttribute('style');
    });
    clone.querySelectorAll('table').forEach(table => {
      const rows = table.querySelectorAll('tr');
      rows.forEach(row => {
        const cells = Array.from(row.children);
        const last = cells[cells.length - 1];
        if (last && /action|delete|remove/i.test(last.textContent || '')) last.remove();
      });
    });
    return clone;
  },
  buildAnnexureHtmlDocument(viewId) {
    const source = this.getAnnexureSourceView(viewId);
    if (!source) return '';
    const clone = this.cleanupAnnexurePreviewClone(source.cloneNode(true));
    const title = this.SECTION_TITLES[viewId] || 'Annexure Preview';
    const district = (window.S && S.frontMatter && S.frontMatter.district) || 'Jalandhar';
    const year = (window.S && S.frontMatter && S.frontMatter.year) || '2025-26';
    const bodyHtml = clone.innerHTML.trim() || '<p class="empty">No annexure data entered yet.</p>';
    return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            *{box-sizing:border-box}
            body{margin:0;background:#e9eef5;color:#111827;font-family:Arial,Helvetica,sans-serif;}
            .sheet{width:min(100%,1040px);min-height:100vh;margin:0 auto;padding:30px;background:#fff;box-shadow:0 14px 34px rgba(15,23,42,.14);}
            .doc-head{border-bottom:2px solid #17324d;padding-bottom:14px;margin-bottom:20px;text-align:center;}
            .doc-head h1{margin:0 0 8px;color:#17324d;font-size:24px;line-height:1.2;}
            .doc-head p{margin:0;color:#526172;font-size:13px;}
            h1,h2,h3{color:#17324d;line-height:1.25;}
            h1{font-size:24px;margin:0 0 14px;} h2{font-size:18px;margin:20px 0 10px;} h3{font-size:15px;margin:16px 0 8px;}
            p,.muted,label{color:#526172;font-size:13px;line-height:1.55;}
            .card,.section,.panel,.annexure-line-main{border:0!important;background:transparent!important;box-shadow:none!important;padding:0!important;margin:0 0 18px!important;}
            .g2,.grid,.annexure-line-layout{display:block!important;}
            table{width:100%;border-collapse:collapse;margin:10px 0 18px;font-size:11px;table-layout:auto;}
            th,td{border:1px solid #111827;padding:6px 7px;vertical-align:top;word-break:break-word;overflow-wrap:anywhere;}
            th{background:#f3f4f6;font-weight:700;text-align:left;}
            .field-value{display:inline-block;min-width:80px;padding:4px 6px;border-bottom:1px solid #cbd5e1;color:#111827;}
            .empty{padding:24px;border:1px dashed #cbd5e1;border-radius:8px;text-align:center;}
            img{max-width:100%;height:auto;}
          </style>
        </head>
        <body>
          <main class="sheet">
            <header class="doc-head">
              <h1>${this.escapeHtml(title)}</h1>
              <p>District Survey Report - ${this.escapeHtml(district)} | ${this.escapeHtml(year)}</p>
            </header>
            ${bodyHtml}
          </main>
        </body>
      </html>`;
  },
  renderAnnexureHtmlPreview(viewId) {
    const iframe = getAnnexurePreviewIframe(viewId);
    const html = this.buildAnnexureHtmlDocument(viewId);
    if (!iframe || !html) return false;
    iframe.style.display = 'block';
    iframe.removeAttribute('src');
    iframe.srcdoc = html;
    return true;
  },
  renderAnnexureFallback(viewId, message) {
    const iframe = getAnnexurePreviewIframe(viewId);
    if (!iframe) return;
    iframe.style.display = 'block';
    iframe.removeAttribute('src');
    const title = this.SECTION_TITLES[viewId] || 'Annexure Preview';
    iframe.srcdoc = `<!doctype html>
      <html><head><meta charset="utf-8">
      <style>
        body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#f8fafc;color:#17324d;}
        .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px;box-sizing:border-box;}
        .box{max-width:620px;border:1px solid #d7dee8;border-radius:10px;background:#fff;padding:28px;box-shadow:0 12px 30px rgba(23,50,77,.12);}
        h1{font-size:24px;margin:0 0 12px;} p{font-size:14px;line-height:1.55;margin:0;color:#526172;}
      </style></head><body><div class="wrap"><div class="box"><h1>${title}</h1><p>${message || 'Live preview is preparing. Use Refresh if it does not appear automatically.'}</p></div></div></body></html>`;
  },
  generateAnnexureLivePreview(viewId, delay = 0) {
    if (this.renderAnnexureHtmlPreview(viewId)) return;
    const exportFnName = this.getAnnexureExportFnName(viewId);
    if (typeof window[exportFnName] !== 'function') {
      this.renderAnnexureFallback(viewId, 'Live preview function is loading. Please switch back to this annexure or click Refresh once.');
      return;
    }
    clearTimeout(this._annexureRefreshTimers[viewId]);
    this._annexureRefreshTimers[viewId] = setTimeout(() => {
      const runExport = () => {
        if (this.currentView && this.currentView !== viewId) return;
        try {
          window[exportFnName](null, true);
        } catch (err) {
          console.error(`Live preview failed for ${viewId}:`, err);
          this.renderAnnexureFallback(viewId, 'Live preview could not be generated from the current table data. Please check the annexure entries and try Refresh.');
          if (typeof toast === 'function') toast('Live preview could not be generated. Please try refresh.', 'error');
        }
      };
      if (!this.annexureNeedsPdfVendors(viewId)) {
        runExport();
      } else if (typeof ensurePortalVendors === 'function') {
        ensurePortalVendors(['jspdf', 'autotable']).then(runExport).catch(err => {
          console.error(`PDF tools failed for ${viewId}:`, err);
          this.renderAnnexureFallback(viewId, 'PDF preview tools could not load. Please check your connection and try Refresh.');
          if (typeof toast === 'function') toast('PDF preview tools could not load. Please check your connection.', 'error');
        });
      } else {
        runExport();
      }
    }, delay);
  },
  /** Build a simple A4-style page image from title + body text */
  renderTextPageCanvas(title, bodyText, subtitle) {
    const canvas = document.createElement('canvas');
    const W = 620;
    const H = 880;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0a2540';
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText(title, W / 2, 120);
    if (subtitle) {
      ctx.font = '12px Georgia, serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(subtitle, W / 2, 150);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#334155';
    ctx.font = '14px Georgia, serif';
    const margin = 56;
    const maxWidth = W - margin * 2;
    const words = (bodyText || '').split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach(word => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    let y = 200;
    const lineHeight = 22;
    lines.forEach(l => {
      if (y > H - 80) return;
      ctx.fillText(l, margin, y);
      y += lineHeight;
    });
    return canvas.toDataURL('image/jpeg', 0.92);
  },
  renderCoverPageCanvas() {
    const fm = S.frontMatter || {};
    const canvas = document.createElement('canvas');
    const W = 620;
    const H = 880;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    const navy = '#0a2540';
    const accent = '#e07b00';
    ctx.strokeStyle = navy;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, 100, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = navy;
    ctx.textAlign = 'center';
    ctx.font = '11px Georgia, serif';
    ctx.fillText('GOVERNMENT OF PUNJAB', W / 2, 160);
    ctx.font = 'bold 20px Georgia, serif';
    const title = (fm.title || 'District Survey Report').toUpperCase();
    this._wrapCenteredText(ctx, title, W / 2, 220, W - 80, 26);
    ctx.font = '16px Georgia, serif';
    ctx.fillStyle = accent;
    ctx.fillText(`${(fm.district || 'District').toUpperCase()} DISTRICT`, W / 2, 310);
    ctx.fillStyle = navy;
    ctx.font = '13px Georgia, serif';
    ctx.fillText(`${fm.state || 'Punjab'} · ${fm.year || ''}`, W / 2, 340);
    ctx.font = '11px Georgia, serif';
    ctx.fillStyle = '#475569';
    const prep = `Prepared by: ${fm.preparedBy || ''}`;
    this._wrapCenteredText(ctx, prep, W / 2, 420, W - 80, 18);
    const assist = `Assisted by: ${fm.assistedBy || ''}`;
    this._wrapCenteredText(ctx, assist, W / 2, 460, W - 80, 18);
    ctx.font = '12px Georgia, serif';
    ctx.fillStyle = navy;
    ctx.fillText(fm.version || '', W / 2, H - 60);
    return canvas.toDataURL('image/jpeg', 0.92);
  },
  _wrapCenteredText(ctx, text, cx, startY, maxWidth, lineHeight) {
    const words = (text || '').split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach(word => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    let y = startY;
    lines.forEach(l => {
      ctx.fillText(l, cx, y);
      y += lineHeight;
    });
  },
  getFrontMatterPages() {
    const pages = [];
    const pdfs = S.uploadedPDFs || {};
    this.FM_ORDER.forEach(type => {
      const sectionLabel = this.FM_LABELS[type] || type;
      const uploaded = pdfs[type];
      if (uploaded && uploaded.length) {
        uploaded.forEach((img, idx) => {
          pages.push({
            src: img,
            label: uploaded.length > 1 ? `${sectionLabel} — Page ${idx + 1}` : sectionLabel
          });
        });
        return;
      }
      if (type === 'cover') {
        pages.push({ src: this.renderCoverPageCanvas(), label: sectionLabel, generated: true });
      } else if (type === 'pref' && S.frontMatter && S.frontMatter.preface) {
        pages.push({
          src: this.renderTextPageCanvas('PREFACE', S.frontMatter.preface, 'District Survey Report'),
          label: sectionLabel,
          generated: true
        });
      } else if (type === 'ack' && S.frontMatter && S.frontMatter.acknowledgement) {
        pages.push({
          src: this.renderTextPageCanvas('ACKNOWLEDGEMENT', S.frontMatter.acknowledgement, 'District Survey Report'),
          label: sectionLabel,
          generated: true
        });
      }
    });
    return pages;
  },
  getFrontMatterPages() {
    const pages = [];
    const pdfs = S.uploadedPDFs || {};
    const fileMeta = S.frontMatterFiles || {};
    this.FM_ORDER.forEach(type => {
      const sectionLabel = this.FM_LABELS[type] || type;
      const uploaded = pdfs[type];
      const uploadedImages = Array.isArray(uploaded)
        ? uploaded.filter(src => this.isPreviewImageSource(src))
        : [];
      if (uploadedImages.length) {
        uploadedImages.forEach((img, idx) => {
          pages.push({
            src: img,
            label: uploadedImages.length > 1 ? `${sectionLabel} - Page ${idx + 1}` : sectionLabel
          });
        });
        return;
      }
      const storedUrl = fileMeta[type]?.storedUrl || S.activeProject?.pdfData?.[type] || '';
      const staleOrPdfSource = (Array.isArray(uploaded) && uploaded.find(src => this.isPdfPreviewSource(src))) || storedUrl;
      if (staleOrPdfSource && storedUrl) {
        this.ensureUploadedPdfRendered(type, storedUrl, fileMeta[type] || {});
      }
      const generatedPage = this.getGeneratedFrontMatterPage(type, sectionLabel);
      if (generatedPage) pages.push(generatedPage);
    });
    return pages;
  },
  isPreviewImageSource(src) {
    const value = String(src || '');
    return /^data:image\//i.test(value) || /\.(?:png|jpe?g|webp)(?:[?#]|$)/i.test(value);
  },
  isPdfPreviewSource(src) {
    const value = String(src || '');
    return /^data:application\/pdf/i.test(value)
      || /(?:download-pdf|\.pdf)(?:[?#]|$)/i.test(value)
      || /^blob:/i.test(value);
  },
  getGeneratedFrontMatterPage(type, sectionLabel) {
    if (type === 'cover') {
      return { src: this.renderCoverPageCanvas(), label: sectionLabel, generated: true };
    }
    if (type === 'toc') {
      return {
        src: this.renderTextPageCanvas('CONTENTS', '1. Cover Page\n2. Preface\n3. Acknowledgement\n4. Certificate of Compliance\n5. Report Chapters', 'District Survey Report'),
        label: sectionLabel,
        generated: true
      };
    }
    if (type === 'pref' && S.frontMatter && S.frontMatter.preface) {
      return {
        src: this.renderTextPageCanvas('PREFACE', S.frontMatter.preface, 'District Survey Report'),
        label: sectionLabel,
        generated: true
      };
    }
    if (type === 'ack' && S.frontMatter && S.frontMatter.acknowledgement) {
      return {
        src: this.renderTextPageCanvas('ACKNOWLEDGEMENT', S.frontMatter.acknowledgement, 'District Survey Report'),
        label: sectionLabel,
        generated: true
      };
    }
    if (type === 'cert') {
      const fm = S.frontMatter || {};
      const district = fm.district || S.activeProject?.district || 'District';
      const state = fm.state || 'Punjab';
      const year = fm.year || S.activeProject?.year || '';
      return {
        src: this.renderTextPageCanvas('CERTIFICATE OF COMPLIANCE', `This District Survey Report has been prepared for ${district} District, ${state}${year ? `, for ${year}` : ''}.\n\nThe report content is maintained in the DSR Automation Portal and can be reviewed section by section before final PDF generation.`, 'District Survey Report'),
        label: sectionLabel,
        generated: true
      };
    }
    return null;
  },
  getChapterPages() {
    const pages = [];
    S.chapters.forEach((ch, i) => {
      const imgs = S.chapterPDFs && S.chapterPDFs[ch.id];
      if (imgs && imgs.length) {
        imgs.forEach((img, idx) => {
          pages.push({
            src: img,
            label: imgs.length > 1
              ? `Chapter ${i + 1} — Page ${idx + 1}`
              : `Chapter ${i + 1}: ${ch.name}`
          });
        });
      }
    });
    return pages;
  },
  getChapterPages() {
    const pages = [];
    S.chapters.forEach((ch, i) => {
      const imgs = S.chapterPDFs && S.chapterPDFs[ch.id];
      const uploadedImages = Array.isArray(imgs)
        ? imgs.filter(src => this.isPreviewImageSource(src))
        : [];
      if (uploadedImages.length) {
        uploadedImages.forEach((img, idx) => {
          pages.push({
            src: img,
            label: uploadedImages.length > 1
              ? `Chapter ${i + 1} - Page ${idx + 1}`
              : `Chapter ${i + 1}: ${ch.name}`
          });
        });
        return;
      }
      if (String(ch.name || ch.summary || '').trim()) {
        pages.push({
          src: this.renderTextPageCanvas(ch.name || `CHAPTER ${i + 1}`, ch.summary || 'Upload a chapter PDF to preview the original chapter document here.', `Chapter ${i + 1}`),
          label: `Chapter ${i + 1}`,
          generated: true
        });
      }
    });
    return pages;
  },
  getPlatePages() {
    const pages = [];
    S.plates.forEach((p, i) => {
      if (p.pages && p.pages.length) {
        p.pages.forEach((img, idx) => {
          pages.push({
            src: img,
            label: p.pages.length > 1
              ? `Plate ${i + 1} — Page ${idx + 1}`
              : `Plate ${i + 1}: ${p.name}`
          });
        });
      }
    });
    return pages;
  },
  renderFrontMatter() {
    this.renderPages(this.getFrontMatterPages());
  },
  renderChapters() {
    this.renderPages(this.getChapterPages());
  },
  renderPlates() {
    this.renderPages(this.getPlatePages());
  },
  getAnnexureBPages() {
    const pages = [];
    (S.annexureB || []).forEach((p, i) => {
      if (p.pages && p.pages.length) {
        p.pages.forEach((img, idx) => {
          pages.push({
            src: img,
            label: p.pages.length > 1
              ? `Annexure B — Page ${idx + 1}`
              : `Annexure B: ${p.name}`
          });
        });
      }
    });
    return pages;
  },
  renderAnnexureB() {
    this.renderPages(this.getAnnexureBPages());
  },
  getAnnexureCPages() {
    const pages = [];
    (S.annexureC || []).forEach((p, i) => {
      if (p.pages && p.pages.length) {
        p.pages.forEach((img, idx) => {
          pages.push({
            src: img,
            label: p.pages.length > 1
              ? `Annexure C — Page ${idx + 1}`
              : `Annexure C: ${p.name}`
          });
        });
      }
    });
    return pages;
  },
  renderAnnexureC() {
    this.renderPages(this.getAnnexureCPages());
  },
  getAnnexureDPages() {
    const pages = [];
    (S.annexureD || []).forEach((p, i) => {
      if (p.pages && p.pages.length) {
        p.pages.forEach((img, idx) => {
          pages.push({
            src: img,
            label: p.pages.length > 1
              ? `Annexure D — Page ${idx + 1}`
              : `Annexure D: ${p.name}`
          });
        });
      }
    });
    return pages;
  },
  renderAnnexureD() {
    this.renderPages(this.getAnnexureDPages());
  },
  getAnnexureEPages() {
    const pages = [];
    (S.annexureE || []).forEach((p, i) => {
      if (p.pages && p.pages.length) {
        p.pages.forEach((img, idx) => {
          pages.push({
            src: img,
            label: p.pages.length > 1
              ? `Annexure E — Page ${idx + 1}`
              : `Annexure E: ${p.name}`
          });
        });
      }
    });
    return pages;
  },
  renderAnnexureE() {
    this.renderPages(this.getAnnexureEPages());
  },
  getAnnexureGPages() {
    const pages = [];
    (S.annexureG || []).forEach((p, i) => {
      if (p.pages && p.pages.length) {
        p.pages.forEach((img, idx) => {
          pages.push({
            src: img,
            label: p.pages.length > 1
              ? `Annexure G — Page ${idx + 1}`
              : `Annexure G: ${p.name}`
          });
        });
      }
    });
    return pages;
  },
  renderAnnexureG() {
    this.renderPages(this.getAnnexureGPages());
  },
  getAnnexureHPages() {
    const pages = [];
    (S.annexureH || []).forEach((p, i) => {
      if (p.pages && p.pages.length) {
        p.pages.forEach((img, idx) => {
          pages.push({
            src: img,
            label: p.pages.length > 1
              ? `Annexure H — Page ${idx + 1}`
              : `Annexure H: ${p.name}`
          });
        });
      }
    });
    return pages;
  },
  renderAnnexureH() {
    this.renderPages(this.getAnnexureHPages());
  },
  getAnnexureIPages() {
    const pages = [];
    (S.annexureI || []).forEach((p, i) => {
      if (p.pages && p.pages.length) {
        p.pages.forEach((img, idx) => {
          pages.push({
            src: img,
            label: p.pages.length > 1
              ? `Annexure I — Page ${idx + 1}`
              : `Annexure I: ${p.name}`
          });
        });
      }
    });
    return pages;
  },
  renderAnnexureI() {
    this.renderPages(this.getAnnexureIPages());
  },
  getAnnexureJPages() {
    const pages = [];
    (S.annexureJ || []).forEach((p, i) => {
      if (p.pages && p.pages.length) {
        p.pages.forEach((img, idx) => {
          pages.push({
            src: img,
            label: p.pages.length > 1
              ? `Annexure J — Page ${idx + 1}`
              : `Annexure J: ${p.name}`
          });
        });
      }
    });
    return pages;
  },
  renderAnnexureJ() {
    this.renderPages(this.getAnnexureJPages());
  },
  renderPages(pages) {
    if (!this.body) return;
    if (!pages || !pages.length) {
      this.body.innerHTML = `
        <div class="pdf-preview-empty">
          <div class="pdf-preview-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div class="pdf-preview-empty-title">No pages yet</div>
          <div class="pdf-preview-empty-sub">Upload PDFs on the left or fill in front matter fields to see a live combined preview here.</div>
        </div>`;
      this.totalPages = 0;
      this.currentPage = 0;
      this.updatePageIndicators();
      return;
    }
    this.body.innerHTML = pages.map((page, i) => {
      const src = typeof page === 'string' ? page : page.src;
      const label = typeof page === 'string' ? `Page ${i + 1}` : (page.label || `Page ${i + 1}`);
      const safeLabel = String(label).replace(/"/g, '&quot;');
      return `
        <div class="pdf-preview-page-wrap" data-page="${i + 1}">
          <img src="${src}" class="pdf-preview-page" alt="${safeLabel}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'pdf-preview-empty',textContent:'Preview page could not be loaded. Re-upload this PDF once to refresh the saved preview.'}))">
        </div>`;
    }).join('');
    this.totalPages = pages.length;
    this.currentPage = 1;
    this.applyScale();
    this.updatePageIndicators();
    requestAnimationFrame(() => this.updateVisiblePage());
  },
  getChapterHtmlPages() {
    const chapters = Array.isArray(S.chapters) ? S.chapters : [];
    if (!chapters.length) return [];
    return chapters.flatMap((ch, i) => {
      const imgs = S.chapterPDFs && S.chapterPDFs[ch.id];
      const pageCount = imgs && imgs.length ? imgs.length : 0;
      const fileName = ch.fileName ? this.escapeHtml(ch.fileName) : '';
      const fileMeta = fileName
        ? `<div class="html-note"><strong>Uploaded PDF:</strong> ${fileName}${pageCount ? ` (${pageCount} page(s))` : ''}</div>`
        : '<div class="html-note html-note-muted">No chapter PDF uploaded. Showing chapter title and summary as HTML.</div>';
      const name = this.escapeHtml(ch.name || `Chapter ${i + 1}`);
      const summary = this.escapeHtml(ch.summary || 'Chapter summary will appear here.').replace(/\n/g, '<br>');
      const basePage = {
        label: `Chapter ${i + 1}`,
        html: `
          <article class="html-chapter-page">
            <div class="html-kicker">Chapter ${i + 1}</div>
            <h1>${name}</h1>
            <p>${summary}</p>
            ${fileMeta}
          </article>`
      };
      const uploadedPages = this.getUploadedHtmlPages(imgs, `Chapter ${i + 1}: ${ch.name || ''}`, {
        name: ch.fileName,
        sizeLabel: ch.fileSize,
        type: 'application/pdf'
      });
      return [basePage, ...uploadedPages];
    });
  },
  getUploadedHtmlPages(items, label, meta = {}) {
    if (!items || !items.length) return [];
    return items.map((src, idx) => {
      const rawSrc = String(src || '');
      const normalizedSrc = /^blob:/.test(rawSrc) && meta.storedUrl ? meta.storedUrl : rawSrc;
      const title = items.length > 1 ? `${label} - Uploaded Page ${idx + 1}` : `${label} - Uploaded File`;
      const safeTitle = this.escapeHtml(title);
      const safeSrc = this.escapeHtml(normalizedSrc);
      const type = String(meta.type || '').toLowerCase();
      const isImage = /^data:image\//i.test(normalizedSrc) || /^image\//i.test(type);
      const isPdfLike = /^data:application\/pdf/i.test(normalizedSrc)
        || /^blob:/i.test(normalizedSrc)
        || /(?:download-pdf|\.pdf)(?:[?#]|$)/i.test(normalizedSrc)
        || type === 'application/pdf';
      if (isPdfLike && !isImage && meta.typeKey && !meta.previewError) {
        this.ensureUploadedPdfRendered(meta.typeKey, normalizedSrc, meta);
      }
      if (!isImage) return null;
      return {
        label: title,
        direct: true,
        html: `
          <img class="html-uploaded-img html-uploaded-direct-img" src="${safeSrc}" alt="${safeTitle}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'html-note html-note-muted',textContent:'Preview image could not be loaded. Please re-upload the file.'}))">`
      };
    }).filter(Boolean);
  },
  renderHtmlPages(pages, emptySub) {
    if (!this.body) return;
    if (!pages || !pages.length) {
      this.body.innerHTML = `
        <div class="pdf-preview-empty">
          <div class="pdf-preview-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div class="pdf-preview-empty-title">No HTML preview yet</div>
          <div class="pdf-preview-empty-sub">${this.escapeHtml(emptySub || 'Content will appear here.')}</div>
        </div>`;
      this.totalPages = 0;
      this.currentPage = 0;
      this.updatePageIndicators();
      return;
    }
    this.body.innerHTML = pages.map((page, i) => `
      <div class="pdf-preview-page-wrap pdf-preview-html-wrap" data-page="${i + 1}">
        <div class="pdf-preview-html-page${page.direct ? ' pdf-preview-uploaded-direct-page' : ''}" aria-label="${this.escapeHtml(page.label || `Page ${i + 1}`)}">
          ${page.html || ''}
        </div>
      </div>`).join('');
    this.totalPages = pages.length;
    this.currentPage = 1;
    this.applyScale();
    this.updatePageIndicators();
    requestAnimationFrame(() => this.updateVisiblePage());
  },
  updatePageIndicators() {
    const indicator = document.getElementById('pdf-preview-page-indicator');
    const floatPage = document.getElementById('pdf-preview-float-page');
    const cur = this.totalPages ? this.currentPage : 0;
    const total = this.totalPages;
    if (indicator) indicator.textContent = total ? `${cur} / ${total}` : '0 / 0';
    if (floatPage) floatPage.textContent = total ? `Page ${cur} of ${total}` : 'Page 0 of 0';
  },
  updateVisiblePage() {
    if (!this.scrollEl || !this.totalPages) return;
    const wraps = this.scrollEl.querySelectorAll('.pdf-preview-page-wrap');
    if (!wraps.length) return;
    const scrollMid = this.scrollEl.scrollTop + this.scrollEl.clientHeight / 2;
    let active = 1;
    wraps.forEach((wrap, idx) => {
      const top = wrap.offsetTop;
      const bottom = top + wrap.offsetHeight;
      if (scrollMid >= top && scrollMid < bottom) active = idx + 1;
    });
    if (active !== this.currentPage) {
      this.currentPage = active;
      this.updatePageIndicators();
    }
  },
  zoomIn() {
    this.scale = Math.min(this.scale + 0.25, 3);
    this.applyScale();
  },
  zoomOut() {
    this.scale = Math.max(this.scale - 0.25, 0.25);
    this.applyScale();
  },
  applyScale() {
    if (!this.body) return;
    const pct = `${Math.round(this.scale * 100)}%`;
    this.body.querySelectorAll('.pdf-preview-page').forEach(el => {
      el.style.width = `${this.scale * 100}%`;
      el.style.maxWidth = `${620 * this.scale}px`;
    });
    this.body.querySelectorAll('.pdf-preview-html-page').forEach(el => {
      el.style.transform = `scale(${this.scale})`;
      el.style.transformOrigin = 'top center';
      el.parentElement.style.minHeight = `${el.offsetHeight * this.scale}px`;
    });
    this.zoomLabels.forEach(el => { el.textContent = pct; });
  },
  fullScreen() {
    const target = this.viewerEl || this.panel;
    if (!target) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      target.requestFullscreen().catch(() => {});
    }
  },
  download() {
    if (this.body && this.body.querySelector('.pdf-preview-html-page')) {
      toast('Front Matter and Chapters are direct HTML previews. Use Final PDF generation for PDF download.', 'info');
      return;
    }
    const allPages = this.body ? this.body.querySelectorAll('.pdf-preview-page') : [];
    if (!allPages.length) {
      toast('No pages to download', 'info');
      return;
    }
    try {
      this.generateMergedPDF(allPages);
    } catch (e) {
      toast('Failed to generate merged PDF: ' + e.message, 'error');
    }
  },
  getDownloadFilename() {
    const dist = (S.frontMatter && S.frontMatter.district) || 'District';
    const yr = ((S.frontMatter && S.frontMatter.year) || 'year').replace('/', '-');
    const section = this.currentView === 'front-matter' ? 'front-matter'
      : this.currentView === 'chapters' ? 'chapters'
      : this.currentView === 'plates' ? 'plates'
      : this.currentView === 'annexure-b' ? 'annexure-b'
      : this.currentView === 'annexure-c' ? 'annexure-c'
      : this.currentView === 'annexure-d' ? 'annexure-d'
      : this.currentView === 'annexure-e' ? 'annexure-e'
      : this.currentView === 'annexure-g' ? 'annexure-g'
      : this.currentView === 'annexure-h' ? 'annexure-h'
      : this.currentView === 'annexure-i' ? 'annexure-i'
      : this.currentView === 'annexure-j' ? 'annexure-j' : 'preview';
    return `DSR-${dist}-${yr}-${section}.pdf`;
  },
  generateMergedPDF(images) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, H = 297;
    images.forEach((img, i) => {
      if (i > 0) doc.addPage();
      const src = img.getAttribute('src');
      if (!src) return;
      try { doc.addImage(src, 'JPEG', 0, 0, W, H); }
      catch (e) { try { doc.addImage(src, 'PNG', 0, 0, W, H); } catch (_) {} }
    });
    const fname = this.getDownloadFilename();
    doc.save(fname);
    toast(`Merged PDF saved: ${fname}`, 'success');
  }
};
function getAnnexurePreviewIframe(viewId) {
  const ids = (window.pdfPreview && window.pdfPreview.IFRAME_IDS) || {};
  const preferredId = ids[viewId];
  let iframe = preferredId ? document.getElementById(preferredId) : null;
  if (!iframe) iframe = document.getElementById('pdf-preview-iframe');
  if (!iframe) iframe = document.querySelector('#pdf-preview-viewer iframe');
  return iframe || null;
}
function setAnnexurePreviewIframeSrc(viewId, src) {
  const iframe = getAnnexurePreviewIframe(viewId);
  if (!iframe) return null;
  iframe.style.display = 'block';
  iframe.removeAttribute('srcdoc');
  iframe.src = src || 'about:blank';
  return iframe;
}
window.getAnnexurePreviewIframe = getAnnexurePreviewIframe;
window.setAnnexurePreviewIframeSrc = setAnnexurePreviewIframeSrc;
window.pdfPreview = pdfPreview;
window.addEventListener('DOMContentLoaded', () => {
  pdfPreview.init();
});
