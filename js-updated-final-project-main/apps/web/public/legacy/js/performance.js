/* Lightweight runtime loader for heavy third-party assets. */
const PORTAL_VENDOR_ASSETS = {
  chart: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js',
  xlsx: 'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js',
  jspdf: 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
  autotable: 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js',
  pdfjs: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/build/pdf.min.js',
  html2pdf: 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js'
};
const portalVendorPromises = {};
function loadPortalScript(src, key) {
  const id = key || src;
  if (portalVendorPromises[id]) return portalVendorPromises[id];
  const existing = document.querySelector(`script[data-portal-loader="${id}"]`);
  if (existing) {
    portalVendorPromises[id] = new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
    return portalVendorPromises[id];
  }
  portalVendorPromises[id] = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.dataset.portalLoader = id;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
  return portalVendorPromises[id];
}
function ensurePortalVendor(name) {
  if (name === 'chart' && window.Chart) return Promise.resolve();
  if (name === 'xlsx' && window.XLSX) return Promise.resolve();
  if (name === 'jspdf' && window.jspdf) return Promise.resolve();
  if (name === 'autotable' && window.jspdf?.jsPDF?.API?.autoTable) return Promise.resolve();
  if (name === 'pdfjs' && window.pdfjsLib) return Promise.resolve();
  if (name === 'html2pdf' && window.html2pdf) return Promise.resolve();
  return loadPortalScript(PORTAL_VENDOR_ASSETS[name], name);
}
function ensurePortalVendors(names) {
  return names.reduce((chain, name) => chain.then(() => ensurePortalVendor(name)), Promise.resolve());
}
function runWhenIdle(fn, timeout = 1400) {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(fn, { timeout });
  }
  return window.setTimeout(fn, Math.min(timeout, 350));
}
function preloadPortalVendorsAfterLogin() {
  runWhenIdle(() => {
    ensurePortalVendor('xlsx').catch(() => {});
  }, 500);
  runWhenIdle(() => {
    ensurePortalVendors(['chart', 'jspdf', 'autotable']).catch(() => {});
  }, 1800);
  runWhenIdle(() => {
    ensurePortalVendors(['html2pdf', 'pdfjs']).catch(() => {});
  }, 3600);
}
function ensurePortalAssetsForView(viewId, done) {
  const required = [];
  if (viewId === 'graphs') required.push('chart');
  if (viewId === 'generate') {
    required.push('jspdf', 'autotable');
  }
  if (!required.length) return true;
  const ready = required.every(name => {
    if (name === 'chart') return !!window.Chart;
    if (name === 'jspdf') return !!window.jspdf;
    if (name === 'autotable') return !!window.jspdf?.jsPDF?.API?.autoTable;
    return false;
  });
  if (ready) return true;
  if (typeof toast === 'function') toast('Preparing section tools...', 'info');
  ensurePortalVendors(required)
    .then(() => {
      if (typeof done === 'function') done();
    })
    .catch(err => {
      console.error(err);
      if (typeof toast === 'function') toast('Required tools could not load. Please refresh once.', 'error');
    });
  return false;
}
document.addEventListener('pointerdown', event => {
  const target = event.target?.closest?.('button,label,.upload-zone,input[type="file"]');
  if (!target) return;
  const text = `${target.textContent || ''} ${target.getAttribute('accept') || ''}`.toLowerCase();
  if (text.includes('excel') || text.includes('xlsx') || text.includes('csv')) {
    ensurePortalVendor('xlsx').catch(() => {});
  }
  if (text.includes('pdf') || text.includes('download')) {
    ensurePortalVendors(['jspdf', 'autotable']).catch(() => {});
  }
}, { capture: true, passive: true });
document.addEventListener('change', event => {
  const input = event.target;
  if (!input || input.type !== 'file' || !input.files?.length) return;
  const fileName = input.files[0]?.name || '';
  const accept = input.getAttribute('accept') || '';
  const isExcel = /\.(xlsx|xls|csv)$/i.test(fileName) || /xlsx|xls|csv/i.test(accept);
  if (!isExcel || window.XLSX) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  ensurePortalVendor('xlsx')
    .then(() => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })
    .catch(err => {
      console.error(err);
      if (typeof toast === 'function') toast('Excel tools could not load. Please try again.', 'error');
    });
}, { capture: true });
document.addEventListener('click', event => {
  const target = event.target?.closest?.('button,a,label');
  if (!target || target.dataset.portalPdfReady === 'true') return;
  const text = `${target.textContent || ''} ${target.getAttribute('onclick') || ''}`.toLowerCase();
  const looksLikePdfAction = text.includes('pdf') || text.includes('generatefinal') || text.includes('download final');
  if (!looksLikePdfAction || (window.jspdf && window.html2pdf)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (typeof toast === 'function') toast('Preparing PDF tools...', 'info');
  ensurePortalVendors(['jspdf', 'autotable', 'html2pdf', 'pdfjs'])
    .then(() => {
      target.dataset.portalPdfReady = 'true';
      target.click();
      setTimeout(() => { delete target.dataset.portalPdfReady; }, 500);
    })
    .catch(err => {
      console.error(err);
      if (typeof toast === 'function') toast('PDF tools could not load. Please try again.', 'error');
    });
}, { capture: true });
window.ensurePortalVendor = ensurePortalVendor;
window.ensurePortalVendors = ensurePortalVendors;
window.ensurePortalAssetsForView = ensurePortalAssetsForView;
window.preloadPortalVendorsAfterLogin = preloadPortalVendorsAfterLogin;
window.runWhenIdle = runWhenIdle;
