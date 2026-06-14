/* ═══════════════════════════════════════════════════════════
   GRAPHS — CROSS SECTION
   ═══════════════════════════════════════════════════════════ */
function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}
function getYBounds(values) {
  if (!values.length) return { min: 220, max: 230 };
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const diff = maxVal - minVal;
  const pad = Math.max(diff * 0.1, 0.2); // Tighter padding (10% or minimum 0.2m)
  const min = Math.floor((minVal - pad) * 10) / 10;
  const max = Math.ceil((maxVal + pad) * 10) / 10;
  return { min, max };
}
function chartAxisColor() {
  return isDarkMode() ? '#ffffff' : '#000000';
}
function chartGridColor() {
  return isDarkMode() ? 'rgba(255, 255, 255, 0.12)' : '#eeeeee';
}
function chartLabelColor() {
  return isDarkMode() ? '#ffffff' : '#000000';
}
function chartTooltipOptions() {
  const dark = isDarkMode();
  return {
    mode: 'index',
    intersect: false,
    backgroundColor: dark ? '#131f3d' : '#ffffff',
    titleColor: dark ? '#ffffff' : '#0f172a',
    bodyColor: dark ? '#e2e8f0' : '#334155',
    borderColor: dark ? '#3d5294' : '#cbd5e1',
    borderWidth: 1
  };
}
function addGraph() {
  const id = 'g' + Date.now();
  S.graphs.push({
    id,
    name: 'PO_JL_NR_ST_28',
    dist: '0,25,50',
    post: '227.76,227.75,227.65',
    red: '224.30',
    thal: '223.40',
    area: '1.60',
    noMine: '0',
    bulk: '1.52',
    pct: '60',
    calcThick: '3.0', // Override thickness for volume calculation
    hasSubGraph: false, // Optional Pre-Monsoon comparison graph
    subName: 'PR_JL_NR_ST_28',
    subDist: '0,25,50',
    subElev: '227.59,227.39,227.26',
    subRed: '224.30',
    subThal: '223.40',
    pdfLayout: 1
  });
  renderGraphs();
  const platesEl = document.getElementById('view-plates');
  if (platesEl && platesEl.classList.contains('active')) renderPlates();
}
function renderGraphs() {
  Object.values(S.graphCharts).forEach(c => { try { c && c.destroy(); } catch (e) { } });
  S.graphCharts = {};
  const el = document.getElementById('graph-list'); if (!el) return;
  el.innerHTML = S.graphs.map(g => buildGraphHTML(g)).join('');
  S.graphs.forEach(g => drawGraph(g));
}
function calcGraph(g) {
  const dist = (String(g.dist || '')).split(',').map(Number).filter(v => !isNaN(v));
  const post = (String(g.post || '')).split(',').map(Number).filter(v => !isNaN(v));
  const subDistSrc = g.subDist !== undefined ? g.subDist : g.dist;
  const subDist = (String(subDistSrc || '')).split(',').map(Number).filter(v => !isNaN(v));
  const subElevSrc = g.subElev !== undefined ? g.subElev : g.pre;
  const subElev = (String(subElevSrc || '')).split(',').map(Number).filter(v => !isNaN(v));
  const red = Number(g.red) || 0;
  const thal = Number(g.thal) || 0;
  const subRed = g.subRed !== undefined ? Number(g.subRed) : red;
  const subThal = g.subThal !== undefined ? Number(g.subThal) : thal;
  const area = Number(g.area) || 0;
  const noMine = Number(g.noMine) || 0;
  const bulk = Number(g.bulk) || 1.52;
  const pct = Number(g.pct) || 60;
  const thickPre = subElev.map(e => Math.max(0, e - subRed));
  const avgThickPre = thickPre.length ? thickPre.reduce((a, b) => a + b, 0) / thickPre.length : 0;
  const thickPost = post.map(e => Math.max(0, e - red));
  const avgThickPost = thickPost.length ? thickPost.reduce((a, b) => a + b, 0) / thickPost.length : 0;
  const activeCalcThick = g.calcThick && !isNaN(Number(g.calcThick)) ? Number(g.calcThick) : avgThickPost;
  const pArea = Math.max(0, area - noMine);
  const volume = pArea * 10000 * activeCalcThick;
  const tonnes = volume * bulk;
  const allowed = tonnes * (pct / 100);
  return {
    dist, post, subDist, subElev, thickPre, avgThickPre, thickPost, avgThickPost,
    activeCalcThick, avgThick: activeCalcThick, pArea, volume, tonnes, allowed,
    red, thal, subRed, subThal, bulk, area, noMine, pct
  };
}
function buildGraphHTML(g) {
  const o = calcGraph(g);
  const layout = g.pdfLayout || 1;
  const canvasHTML = g.hasSubGraph
    ? `<div style="display:flex; flex-direction:column; gap:16px;">
         <div class="graph-canvas-container">
           <div class="graph-canvas-header">
             <span class="graph-canvas-title">${g.name || 'Post Monsoon'}</span>
             <span class="graph-canvas-badge">POST-MONSOON</span>
           </div>
           <div class="canvas-holder"><canvas id="canvas-${g.id}-post" height="180"></canvas></div>
         </div>
         <div class="graph-canvas-container">
           <div class="graph-canvas-header">
             <span class="graph-canvas-title">${g.subName || 'Pre Monsoon'}</span>
             <span class="graph-canvas-badge">PRE-MONSOON</span>
           </div>
           <div class="canvas-holder"><canvas id="canvas-${g.id}-pre" height="180"></canvas></div>
         </div>
       </div>`
    : `<div class="graph-canvas-container">
         <div class="graph-canvas-header">
           <span class="graph-canvas-title">${g.name || 'Post Monsoon'}</span>
           <span class="graph-canvas-badge">SINGLE GRAPH</span>
         </div>
         <div class="canvas-holder"><canvas id="canvas-${g.id}-post" height="300"></canvas></div>
       </div>`;
  return `
  <div class="graph-block" id="gs-${g.id}">
    <div class="graph-block-hd">
      <div style="flex:1; display:flex; gap:15px; align-items:center;">
        <span class="graph-block-title">Main Graph (Post-Monsoon)</span>
        <input value="${g.name}" placeholder="Main Graph Name" oninput="updateG('${g.id}','name',this.value)" class="graph-name-input">
      </div>
      <!-- PDF Layout Toggle -->
      <div class="layout-pill" style="margin-right: 8px;">
        <span class="layout-pill-label">PDF</span>
        <button class="layout-btn ${layout === 1 ? 'active' : ''}" onclick="updateG('${g.id}','pdfLayout',1)">L1</button>
        <button class="layout-btn ${layout === 2 ? 'active' : ''}" onclick="updateG('${g.id}','pdfLayout',2)">L2</button>
      </div>
      <button class="btn btn-xs btn-danger" style="margin-right: 8px;" onclick="generatePDF('${g.id}')">Download PDF Report</button>
      <button class="btn btn-xs btn-danger" onclick="deleteGraph('${g.id}')">Delete Section</button>
    </div>
    <div class="graph-block-bd">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="field-group">
          <div class="field"><label class="graph-field-label">Distance Array (m)</label><input value="${g.dist}" oninput="updateG('${g.id}','dist',this.value)" class="graph-field-input"></div>
          <div class="field"><label class="graph-field-label">Elevation Array (m)</label><input value="${g.post}" oninput="updateG('${g.id}','post',this.value)" class="graph-field-input"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;align-content:start">
          <div class="field"><label class="graph-field-label">Red Line (m)</label><input type="number" step="0.01" value="${g.red}" oninput="updateG('${g.id}','red',this.value)" class="graph-field-input"></div>
          <div class="field"><label class="graph-field-label">Thalweg (m)</label><input type="number" step="0.01" value="${g.thal}" oninput="updateG('${g.id}','thal',this.value)" class="graph-field-input"></div>
          <div class="field"><label class="graph-field-label">Total Area (Ha)</label><input type="number" step="0.01" value="${g.area}" oninput="updateG('${g.id}','area',this.value)" class="graph-field-input"></div>
          <div class="field"><label class="graph-field-label">No-Mine (Ha)</label><input type="number" step="0.01" value="${g.noMine}" oninput="updateG('${g.id}','noMine',this.value)" class="graph-field-input"></div>
          <div class="field"><label class="graph-field-label">Density (g/cc)</label><input type="number" step="0.01" value="${g.bulk}" oninput="updateG('${g.id}','bulk',this.value)" class="graph-field-input"></div>
          <div class="field"><label class="graph-field-label">Mining %</label><input type="number" value="${g.pct}" oninput="updateG('${g.id}','pct',this.value)" class="graph-field-input"></div>
          <div class="field" style="grid-column: span 3;"><label class="graph-field-label-override">Calculation Thickness Override (m)</label><input type="number" step="0.01" value="${g.calcThick || ''}" placeholder="Defaults to Post Avg if empty" oninput="updateG('${g.id}','calcThick',this.value)" class="graph-field-input-override"></div>
        </div>
      </div>
      ${g.hasSubGraph ? `
        <div class="graph-sub-section">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <strong style="color:#eec34a; font-size:13px;">Sub-Graph for Comparison (Pre-Monsoon)</strong>
            <button class="btn btn-xs btn-danger" onclick="updateG('${g.id}', 'hasSubGraph', false)">Remove Comparison</button>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom: 10px;">
            <div class="field"><label class="graph-field-label">Pre Name</label><input value="${g.subName || ''}" oninput="updateG('${g.id}','subName',this.value)" class="graph-field-input"></div>
            <div class="field"><label class="graph-field-label">Pre Distance (m)</label><input value="${g.subDist || ''}" oninput="updateG('${g.id}','subDist',this.value)" class="graph-field-input"></div>
            <div class="field"><label class="graph-field-label">Pre Elevation (m)</label><input value="${g.subElev || ''}" oninput="updateG('${g.id}','subElev',this.value)" class="graph-field-input"></div>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
            <div class="field"><label class="graph-field-label">Pre Red Line (m)</label><input type="number" step="0.01" value="${g.subRed !== undefined ? g.subRed : g.red}" oninput="updateG('${g.id}','subRed',this.value)" class="graph-field-input"></div>
            <div class="field"><label class="graph-field-label">Pre Thalweg (m)</label><input type="number" step="0.01" value="${g.subThal !== undefined ? g.subThal : g.thal}" oninput="updateG('${g.id}','subThal',this.value)" class="graph-field-input"></div>
          </div>
        </div>
      ` : `
        <div style="margin-bottom: 16px;">
          <button class="btn btn-xs btn-outline" style="background: rgba(238, 195, 74, 0.12); color: #eec34a; border: 1px dashed #eec34a;" onclick="updateG('${g.id}', 'hasSubGraph', true)">+ Add Sub-Graph for Comparison (Pre-Monsoon)</button>
        </div>
      `}
      <div style="display:grid;grid-template-columns:1.5fr 0.5fr;gap:16px">
        <div class="graph-canvas-wrap">${canvasHTML}</div>
        <div>
          <div class="kpi-grid">
            <div class="kpi-item"><div class="kpi-lbl">Post Avg Thick</div><div class="kpi-val" id="kpi-val-avgThickPost-${g.id}">${o.avgThickPost.toFixed(2)}<span class="kpi-unit"> m</span></div></div>
            ${g.hasSubGraph ? `<div class="kpi-item"><div class="kpi-lbl">Pre Avg Thick</div><div class="kpi-val" id="kpi-val-avgThickPre-${g.id}">${o.avgThickPre.toFixed(2)}<span class="kpi-unit"> m</span></div></div>` : ''}
            <div class="kpi-item"><div class="kpi-lbl">Potential Area</div><div class="kpi-val" id="kpi-val-pArea-${g.id}">${o.pArea.toFixed(2)}<span class="kpi-unit"> Ha</span></div></div>
            <div class="kpi-item"><div class="kpi-lbl">Total Excav.</div><div class="kpi-val" id="kpi-val-allowed-${g.id}">${fmtN(o.allowed, 0)}<span class="kpi-unit"> MT</span></div></div>
          </div>
          <div class="result-bar">
            <div class="result-lbl" id="result-lbl-pct-${g.id}">Allowed Excavation (${g.pct}%)</div>
            <div class="result-val" id="result-val-allowed-${g.id}">${fmtN(o.allowed, 2)} MT</div>
            <div class="result-formula" id="result-formula-${g.id}">= ${fmtN(o.pArea, 2)} Ha × 10000 × ${o.activeCalcThick.toFixed(2)}m × ${g.bulk} × ${g.pct}%</div>
          </div>
          <div class="tbl-wrap" style="margin-top:10px;max-height:150px;overflow-y:auto">
            <table class="tbl" style="font-size:11px">
              <thead><tr><th>Dist</th><th>Post</th><th>Thick</th></tr></thead>
              <tbody id="tbl-tbody-${g.id}">${o.dist.map((d, i) => `<tr><td>${d}</td><td>${o.post[i] ?? '—'}</td><td>${(o.thickPost[i] ?? 0).toFixed(2)}</td></tr>`).join('')}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}
function drawGraph(g) {
  try { S.graphCharts[g.id + '_pre']?.destroy(); } catch (e) { }
  try { S.graphCharts[g.id + '_post']?.destroy(); } catch (e) { }
  delete S.graphCharts[g.id + '_pre'];
  delete S.graphCharts[g.id + '_post'];
  const o = calcGraph(g);
  const postY = [...o.post, o.red, o.thal].filter(v => !isNaN(v));
  const { min: postYMin, max: postYMax } = getYBounds(postY);
  const preY = [...(g.hasSubGraph ? o.subElev : []), o.subRed, o.subThal].filter(v => !isNaN(v));
  const { min: preYMin, max: preYMax } = getYBounds(preY);
  const uiPointLabelsPlugin = {
    id: 'uiPointLabels',
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx;
      chart.data.datasets.forEach((dataset, i) => {
        if (dataset.label && dataset.label.includes('Elevation')) {
          const meta = chart.getDatasetMeta(i);
          meta.data.forEach((element, index) => {
            ctx.fillStyle = chartLabelColor();
            ctx.font = '11px "Times New Roman"';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const val = dataset.data[index];
            if (val !== undefined) ctx.fillText(Number(val).toFixed(2), element.x + 8, element.y - 6);
          });
        }
      });
    }
  };
  const buildUIChart = (canvasId, dists, datasets, yMin, yMax) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    return new Chart(canvas, {
      type: 'line',
      data: { labels: dists, datasets },
      plugins: [uiPointLabelsPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: isDarkMode() ? {
            top: 15,
            left: 10,
            right: 15,
            bottom: 10
          } : {
            top: 15,
            left: 15,
            right: 15,
            bottom: 10
          }
        },
        plugins: {
          legend: {
            display: isDarkMode(),
            labels: {
              color: chartAxisColor(),
              font: { family: 'Inter', size: 12, weight: 'bold' },
              boxWidth: 12,
              boxHeight: 12,
              padding: 12
            }
          },
          tooltip: chartTooltipOptions()
        },
        scales: {
          x: {
            ticks: {
              color: chartAxisColor(),
              font: { family: 'Times New Roman', size: 12 },
              padding: 8
            },
            grid: { color: chartGridColor() }
          },
          y: {
            min: yMin,
            max: yMax,
            ticks: {
              color: chartAxisColor(),
              font: { family: 'Times New Roman', size: 12 },
              padding: 10
            },
            grid: { color: chartGridColor() }
          }
        }
      }
    });
  };
  if (document.getElementById('canvas-' + g.id + '-post') && o.dist.length >= 2) {
    const redArrPost = o.dist.map(() => o.red);
    const thalArrPost = o.dist.map(() => o.thal);
    S.graphCharts[g.id + '_post'] = buildUIChart('canvas-' + g.id + '-post', o.dist, [
      { label: 'Post monsoon Elevation', data: o.post, borderColor: '#da8b4e', backgroundColor: '#da8b4e', pointBackgroundColor: '#8ba3b5', tension: 0.1, pointRadius: 4, borderWidth: 1.5, fill: false },
      { label: 'Red Line', data: redArrPost, borderColor: '#de3b3b', pointBackgroundColor: '#e37878', borderWidth: 1.5, pointRadius: 4, fill: false },
      { label: 'Thalweg', data: thalArrPost, borderColor: '#3b8bba', pointBackgroundColor: '#7db1e3', borderWidth: 1.5, pointRadius: 4, fill: false }
    ], postYMin, postYMax);
  }
  if (g.hasSubGraph && document.getElementById('canvas-' + g.id + '-pre') && o.subDist.length >= 2) {
    const redArrPre = o.subDist.map(() => o.subRed);
    const thalArrPre = o.subDist.map(() => o.subThal);
    S.graphCharts[g.id + '_pre'] = buildUIChart('canvas-' + g.id + '-pre', o.subDist, [
      { label: 'Pre monsoon Elevation', data: o.subElev, borderColor: '#eec34a', backgroundColor: '#eec34a', pointBackgroundColor: '#aab6c2', tension: 0.1, pointRadius: 4, borderWidth: 1.5, fill: false },
      { label: 'Red Line', data: redArrPre, borderColor: '#de3b3b', pointBackgroundColor: '#e37878', borderWidth: 1.5, pointRadius: 4, fill: false },
      { label: 'Thalweg', data: thalArrPre, borderColor: '#3b8bba', pointBackgroundColor: '#7db1e3', borderWidth: 1.5, pointRadius: 4, fill: false }
    ], preYMin, preYMax);
  }
}
function updateG(id, key, val) {
  const g = S.graphs.find(x => x.id === id);
  if (!g) return;
  if (key === 'hasSubGraph') {
    val = (val === 'true' || val === true);
  }
  if (key === 'pdfLayout') {
    val = Number(val);
    g[key] = val;
    const block = document.getElementById('gs-' + id);
    if (block) {
      try { S.graphCharts[id + '_pre']?.destroy(); } catch (e) { }
      try { S.graphCharts[id + '_post']?.destroy(); } catch (e) { }
      block.outerHTML = buildGraphHTML(g);
      drawGraph(g);
    }
    return;
  }
  g[key] = val;
  if (key === 'hasSubGraph' && val === true) {
    if (g.subRed === undefined) g.subRed = g.red;
    if (g.subThal === undefined) g.subThal = g.thal;
    if (!g.subDist) g.subDist = g.dist;
    if (!g.subElev) g.subElev = g.post;
  }
  if (key === 'hasSubGraph') {
    try { S.graphCharts[id + '_pre']?.destroy(); } catch (e) { }
    try { S.graphCharts[id + '_post']?.destroy(); } catch (e) { }
    const block = document.getElementById('gs-' + id);
    if (block) {
      block.outerHTML = buildGraphHTML(g);
      drawGraph(g);
    }
  } else {
    clearTimeout(g._t);
    g._t = setTimeout(() => {
      const o = calcGraph(g);
      const elPostAvg = document.getElementById(`kpi-val-avgThickPost-${id}`);
      if (elPostAvg) elPostAvg.innerHTML = `${o.avgThickPost.toFixed(2)}<span class="kpi-unit"> m</span>`;
      const elPreAvg = document.getElementById(`kpi-val-avgThickPre-${id}`);
      if (elPreAvg) elPreAvg.innerHTML = `${o.avgThickPre.toFixed(2)}<span class="kpi-unit"> m</span>`;
      const elPArea = document.getElementById(`kpi-val-pArea-${id}`);
      if (elPArea) elPArea.innerHTML = `${o.pArea.toFixed(2)}<span class="kpi-unit"> Ha</span>`;
      const elAllowed = document.getElementById(`kpi-val-allowed-${id}`);
      if (elAllowed) elAllowed.innerHTML = `${fmtN(o.allowed, 0)}<span class="kpi-unit"> MT</span>`;
      const elResultLbl = document.getElementById(`result-lbl-pct-${id}`);
      if (elResultLbl) elResultLbl.textContent = `Allowed Excavation (${g.pct}%)`;
      const elResultVal = document.getElementById(`result-val-allowed-${id}`);
      if (elResultVal) elResultVal.textContent = `${fmtN(o.allowed, 2)} MT`;
      const elResultFormula = document.getElementById(`result-formula-${id}`);
      if (elResultFormula) elResultFormula.innerHTML = `= ${fmtN(o.pArea, 2)} Ha × 10000 × ${o.activeCalcThick.toFixed(2)}m × ${g.bulk} × ${g.pct}%`;
      const elTbody = document.getElementById(`tbl-tbody-${id}`);
      if (elTbody) {
        elTbody.innerHTML = o.dist.map((d, i) => `<tr><td>${d}</td><td>${o.post[i] ?? '—'}</td><td>${(o.thickPost[i] ?? 0).toFixed(2)}</td></tr>`).join('');
      }
      drawGraph(g);
    }, 400);
  }
}
function deleteGraph(id) {
  customConfirm('Delete this cross section graph?', () => {
    S.graphs = S.graphs.filter(g => g.id !== id);
    try { S.graphCharts[id + '_pre']?.destroy(); } catch (e) { }
    try { S.graphCharts[id + '_post']?.destroy(); } catch (e) { }
    delete S.graphCharts[id + '_pre'];
    delete S.graphCharts[id + '_post'];
    const el = document.getElementById('gs-' + id);
    if (el) el.remove();
    toast('Cross section deleted successfully', 'success');
    const platesEl = document.getElementById('view-plates');
    if (platesEl && platesEl.classList.contains('active')) renderPlates();
  });
}
function buildPdfChartHelper(g, o, type, canvasEl) {
  const isPre = type === 'pre';
  const dists = isPre ? o.subDist : o.dist;
  const elevs = isPre ? o.subElev : o.post;
  const isLayout2 = (g.pdfLayout || 1) === 2;
  const dpiScale = 3; // Render at 3x resolution for high sharpness
  const postY = [...o.post, o.red, o.thal].filter(v => !isNaN(v));
  const { min: postYMin, max: postYMax } = getYBounds(postY);
  const preY = [...(g.hasSubGraph ? o.subElev : []), o.subRed, o.subThal].filter(v => !isNaN(v));
  const { min: preYMin, max: preYMax } = getYBounds(preY);
  const yMin = isPre ? preYMin : postYMin;
  const yMax = isPre ? postYMax : postYMax;
  const redArr = isPre ? dists.map(() => o.subRed) : dists.map(() => o.red);
  const thalArr = isPre ? dists.map(() => o.subThal) : dists.map(() => o.thal);
  const pdfPointLabelsPlugin = {
    id: 'pdfPointLabels',
    afterDatasetsDraw(chart) {
      if (isLayout2) return; // Layout 2 keeps it clean
      const ctx = chart.ctx;
      chart.data.datasets.forEach((dataset) => {
        if (dataset.label && dataset.label.includes('Elevation')) {
          const meta = chart.getDatasetMeta(chart.data.datasets.indexOf(dataset));
          meta.data.forEach((element, index) => {
            ctx.fillStyle = '#000';
            ctx.font = (10 * dpiScale) + 'px "Times New Roman"';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const val = dataset.data[index];
            if (val !== undefined) ctx.fillText(Number(val).toFixed(2), element.x + (6 * dpiScale), element.y - (7 * dpiScale));
          });
        }
      });
    }
  };
  /* Layout 1 colour scheme (original technical style) */
  const L1_elev_color = isPre ? '#eec34a' : '#da8b4e';
  const L1_red_color = '#de3b3b';
  const L1_thal_color = '#3b8bba';
  /* Layout 2 colour scheme (Excel / clean report style) */
  const L2_elev_color = '#1f77b4';    // blue — matches clean report scheme
  const L2_red_color = '#ff7f0e';    // orange
  const L2_thal_color = '#7f7f7f';    // grey
  const elevColor = isLayout2 ? L2_elev_color : L1_elev_color;
  const redColor = isLayout2 ? L2_red_color : L1_red_color;
  const thalColor = isLayout2 ? L2_thal_color : L1_thal_color;
  const elevLabel = isPre ? (isLayout2 ? 'Pre Monsoon' : 'Pre monsoon Elevation') : (isLayout2 ? 'Post Monsoon' : 'Post monsoon Elevation');
  const redLabel = isPre ? (isLayout2 ? 'Red Line (Pre-monsoon)' : 'Red Line') : (isLayout2 ? 'Red Line (Post-monsoon)' : 'Red Line');
  const thalLabel = isPre ? (isLayout2 ? 'Thalweg Line (Pre-monsoon)' : 'Thalweg') : (isLayout2 ? 'Thalweg Line (Post-monsoon)' : 'Thalweg');
  const datasets = [
    { label: elevLabel, data: elevs, borderColor: elevColor, backgroundColor: elevColor, pointBackgroundColor: elevColor, tension: 0.1, pointRadius: isLayout2 ? 3 * dpiScale : 4 * dpiScale, borderWidth: 1.5 * dpiScale, fill: false },
    { label: redLabel, data: redArr, borderColor: redColor, backgroundColor: redColor, pointBackgroundColor: redColor, borderWidth: 1.5 * dpiScale, pointRadius: isLayout2 ? 2 * dpiScale : 4 * dpiScale, fill: false },
    { label: thalLabel, data: thalArr, borderColor: thalColor, backgroundColor: thalColor, pointBackgroundColor: thalColor, borderWidth: 1.5 * dpiScale, pointRadius: isLayout2 ? 2 * dpiScale : 4 * dpiScale, fill: false }
  ];
  return new Chart(canvasEl, {
    type: 'line',
    data: { labels: dists, datasets },
    plugins: [pdfPointLabelsPlugin],
    options: {
      animation: false,
      responsive: false,
      layout: { padding: { top: 15 * dpiScale, right: (isLayout2 ? 8 : 30) * dpiScale, bottom: 5 * dpiScale, left: 5 * dpiScale } },
      plugins: {
        legend: {
          display: isLayout2,
          position: 'right',
          labels: { color: '#000', font: { family: 'Arial', size: 10 * dpiScale }, boxWidth: 24 * dpiScale, padding: 10 * dpiScale }
        }
      },
      scales: {
        x: {
          title: { display: isLayout2, text: 'Distance (m)', color: '#000', font: { family: 'Arial', size: 10 * dpiScale } },
          ticks: { color: '#000', font: { family: isLayout2 ? 'Arial' : 'Times New Roman', size: 10 * dpiScale }, padding: 4 * dpiScale },
          grid: { color: '#e5e5e5', lineWidth: 1 * dpiScale }
        },
        y: {
          min: yMin, max: yMax,
          title: { display: isLayout2, text: 'Elevation (m)', color: '#000', font: { family: 'Arial', size: 10 * dpiScale } },
          ticks: { color: '#000', font: { family: isLayout2 ? 'Arial' : 'Times New Roman', size: 10 * dpiScale }, padding: 4 * dpiScale },
          grid: { color: '#e5e5e5', lineWidth: 1 * dpiScale }
        }
      }
    }
  });
}
function buildPdfPage_L1(g, o, imgPost, imgPre, pageNum) {
  const mathStr = `${o.pArea.toFixed(2)}*10000*${o.activeCalcThick.toFixed(1)}*${g.bulk}=${o.tonnes.toFixed(2)} Tonnes`;
  const allowedStr = o.allowed.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (g.hasSubGraph) {
    const maxLen = Math.max(o.dist.length, o.subDist.length);
    let dualTableRows = '';
    for (let i = 0; i < maxLen; i++) {
      const preVal = o.thickPre[i] !== undefined ? o.thickPre[i].toFixed(2) : '-';
      const postVal = o.thickPost[i] !== undefined ? o.thickPost[i].toFixed(2) : '-';
      dualTableRows += `<tr>
        <td style="background:#f1f3fa;border:1px solid #fff;padding:4px;">${postVal}</td>
        <td style="background:#f1f3fa;border:1px solid #fff;padding:4px;">${preVal}</td>
      </tr>`;
    }
    return `
    <div id="pdf-container" style="width:1040px;height:710px;position:relative;background:#fff;color:#000;font-family:'Times New Roman',serif;box-sizing:border-box;font-size:15px;margin:0;overflow:hidden;">
      <div style="position:absolute;top:50px;left:20px;width:330px;line-height:1.3;">
        <div><b>Source-</b> Primary Data generated<br>by DGPS<br>Hi- Target DGPS ( Model No.<br>V30plus)</div>
        <div style="font-size:18px;font-weight:bold;margin:15px 0 10px 0;">Calculation</div>
        <div style="padding-left:18px;position:relative;"><span style="position:absolute;left:0;">➢</span><b>Total Area: ${g.area}Ha.(Source:Table no. 7.2)</b></div>
        <div style="padding-left:18px;position:relative;margin:8px 0;"><span style="position:absolute;left:0;">➢</span><b>No mining area: ${g.noMine} Ha.</b> &nbsp;&nbsp;&nbsp;&nbsp;(Source: Page No 84)</div>
        <div style="padding-left:18px;font-size:14px;">Potential area(Ha.): Total area(Ha.)- No mining Area(Ha.)<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${g.area}-${g.noMine}=${o.pArea.toFixed(2)} Ha.</div>
        <div style="padding-left:18px;position:relative;margin-top:15px;"><span style="position:absolute;left:0;">➢</span>Potential Area(Ha.):${o.pArea.toFixed(2)}</div>
        <div style="padding-left:18px;position:relative;"><span style="position:absolute;left:0;">➢</span>Average Thickness:${o.activeCalcThick.toFixed(1)}</div>
        <div style="padding-left:18px;position:relative;"><span style="position:absolute;left:0;">➢</span>Bulk Density:${g.bulk}</div>
        <div style="margin:4px 0;font-size:15px;">${mathStr}</div>
        <div style="padding-left:18px;position:relative;"><span style="position:absolute;left:0;">➢</span>Total excavation in Tonnes<br>&nbsp;&nbsp;&nbsp;(Considering ${g.pct}% as per EMGSM,<br>&nbsp;&nbsp;&nbsp;2020)=${allowedStr}</div>
        <div style="margin-top:70px;margin-left:20px;">
          <div style="display:flex;align-items:center;margin-bottom:6px;"><span style="display:inline-block;width:35px;height:3px;background:#de3b3b;margin-right:8px;"></span> Red Line</div>
          <div style="display:flex;align-items:center;margin-bottom:6px;"><span style="display:inline-block;width:35px;height:3px;background:#da8b4e;margin-right:8px;"></span> Post monsoon Elevation</div>
          <div style="display:flex;align-items:center;margin-bottom:6px;"><span style="display:inline-block;width:35px;height:3px;background:#eec34a;margin-right:8px;"></span> Pre monsoon Elevation</div>
          <div style="display:flex;align-items:center;margin-bottom:6px;"><span style="display:inline-block;width:35px;height:3px;background:#3b8bba;margin-right:8px;"></span> Thalweg line</div>
        </div>
      </div>
      <div style="position:absolute;top:480px;left:320px;font-size:16px;transform:rotate(-90deg);transform-origin:left top;">Elevation (m)</div>
      <div style="position:absolute;top:35px;left:360px;width:480px;text-align:center;">
        <div style="font-size:18px;">Cross Section Sand Bar</div>
        <div style="font-size:16px;font-weight:bold;margin-bottom:5px;">${g.name || 'Post Monsoon'}</div>
        <img src="${imgPost}" style="width:100%;margin-bottom:20px;" />
        <div style="font-size:16px;font-weight:bold;margin-bottom:5px;">${g.subName || 'Pre Monsoon'}</div>
        <img src="${imgPre}" style="width:100%;margin-bottom:5px;" />
        <div style="font-size:16px;">Distance of the sand bar from river bank towards river (m)</div>
      </div>
      <div style="position:absolute;top:120px;right:20px;width:180px;text-align:center;font-size:16px;">
        <div style="text-align:left;margin-left:10px;">Post Monsoon<br>Average Thickness:${o.avgThickPost.toFixed(2)}</div>
        <table style="width:100%;border-collapse:collapse;text-align:center;font-size:12px;margin-top:100px;margin-bottom:100px;">
          <tr>
            <th style="background:#e4e7f2;border:1px solid #fff;padding:4px;font-weight:normal;">Post-<br>Thickness</th>
            <th style="background:#e4e7f2;border:1px solid #fff;padding:4px;font-weight:normal;">Pre-<br>Thickness</th>
          </tr>
          ${dualTableRows}
          <tr>
            <td style="background:#e4e7f2;border:1px solid #fff;padding:4px;font-weight:bold;">${o.avgThickPost.toFixed(2)}</td>
            <td style="background:#e4e7f2;border:1px solid #fff;padding:4px;font-weight:bold;">${o.avgThickPre.toFixed(2)}</td>
          </tr>
        </table>
        <div style="text-align:left;margin-left:10px;">Pre Monsoon<br>Average Thickness:${o.avgThickPre.toFixed(2)}</div>
      </div>
      <div style="position:absolute;bottom:30px;left:330px;width:650px;font-size:13px;line-height:1.3;">
        Note: The levels given in the cross- section as observed in the field has been checked and found<br>nearly matching with the office record.
      </div>
      <div style="position:absolute;bottom:-5px;right:0;font-size:20px;font-weight:bold;padding:5px;background:#fff;">${pageNum}</div>
      <div style="position:absolute;top:20px;left:20px;width:1000px;height:670px;border:1px solid #000;pointer-events:none;"></div>
    </div>`;
  } else {
    const singleTableRows = o.dist.map((_d, i) => `<tr><td style="background:#f1f3fa;border:1px solid #fff;padding:4px;">${o.thickPost[i] !== undefined ? o.thickPost[i].toFixed(2) : '-'}</td></tr>`).join('');
    return `
    <div id="pdf-container" style="width:1040px;height:710px;position:relative;background:#fff;color:#000;font-family:'Times New Roman',serif;box-sizing:border-box;font-size:15px;margin:0;overflow:hidden;">
      <div style="position:absolute;top:10px;left:0;width:100%;text-align:center;font-size:18px;">Cross Section Sand Bar</div>
      <div style="position:absolute;top:35px;left:0;width:100%;text-align:center;font-size:17px;font-weight:bold;">${g.name}</div>
      <div style="position:absolute;top:70px;left:20px;width:330px;line-height:1.3;">
        <div><b>Source-</b> Primary Data generated<br>by DGPS<br>Hi- Target DGPS ( Model No.<br>V30plus)</div>
        <div style="font-size:18px;font-weight:bold;margin:15px 0 10px 0;">Calculation</div>
        <div style="padding-left:18px;position:relative;"><span style="position:absolute;left:0;">➢</span><b>Total Area: ${g.area} Ha.</b>(Source: Table 7.2 )</div>
        <div style="padding-left:18px;position:relative;margin-bottom:8px;"><span style="position:absolute;left:0;">➢</span><b>No mining area: ${g.noMine}Ha.</b> (Source: Page No 88)</div>
        <div style="padding-left:18px;">Potential area(Ha.): Total area(Ha.)- No mining Area(Ha.)<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${g.area}-${g.noMine}=${o.pArea.toFixed(2)} Ha.</div>
        <div style="padding-left:18px;position:relative;margin-top:8px;"><span style="position:absolute;left:0;">➢</span>Potential Area(Ha.):${o.pArea.toFixed(2)}</div>
        <div style="padding-left:18px;position:relative;"><span style="position:absolute;left:0;">➢</span>Average Thickness:${o.activeCalcThick.toFixed(2)}</div>
        <div style="padding-left:18px;position:relative;"><span style="position:absolute;left:0;">➢</span>Bulk Density:${g.bulk}</div>
        <div style="margin:4px 0;font-size:15px;">${mathStr.replace('Tonnes', 'Ton<br>nes')}</div>
        <div style="padding-left:18px;position:relative;"><span style="position:absolute;left:0;">➢</span>Total excavation in Tonnes<br>(Considering ${g.pct}% as per EMGSM,<br>2020)=${allowedStr}</div>
        <div style="margin-top:40px;">
          <div style="display:flex;align-items:center;margin-bottom:6px;"><span style="display:inline-block;width:35px;height:3px;background:#de3b3b;margin-right:8px;"></span> Red Line</div>
          <div style="display:flex;align-items:center;margin-bottom:6px;"><span style="display:inline-block;width:35px;height:3px;background:#3b82f6;margin-right:8px;"></span> Post monsoon Elevation</div>
          <div style="display:flex;align-items:center;margin-bottom:6px;"><span style="display:inline-block;width:35px;height:3px;background:#8b5cf6;margin-right:8px;"></span> Thalweg line</div>
        </div>
      </div>
      <div style="position:absolute;top:85px;left:360px;width:550px;text-align:center;">
        <img src="${imgPost}" style="width:100%;margin-bottom:5px;" />
        <div style="font-size:16px;">Distance of the sand bar from river bank towards river (m)</div>
      </div>
      <div style="position:absolute;top:180px;right:20px;width:110px;">
        <table style="width:100%;border-collapse:collapse;text-align:center;font-size:13px;">
          <tr><th style="background:#e4e7f2;border:1px solid #fff;padding:4px;font-weight:normal;">Post -Thickness</th></tr>
          ${singleTableRows}
          <tr><td style="background:#f1f3fa;border:1px solid #fff;padding:4px;font-weight:bold;">${o.avgThickPost.toFixed(2)}</td></tr>
        </table>
      </div>
      <div style="position:absolute;top:375px;right:-15px;width:220px;text-align:center;font-size:16px;line-height:1.3;">
        Post Monsoon<br>Average Thickness: ${o.avgThickPost.toFixed(2)}
      </div>
      <div style="position:absolute;bottom:40px;left:360px;width:550px;font-size:13px;line-height:1.3;">
        Note: The levels given in the cross- section as observed in the field has been checked and found<br>nearly matching with the office record.
      </div>
      <div style="position:absolute;bottom:-5px;right:0;font-size:20px;font-weight:bold;padding:5px;background:#fff;">${pageNum}</div>
      <div style="position:absolute;top:5px;left:5px;width:1025px;height:695px;border:1px solid #000;pointer-events:none;"></div>
    </div>`;
  }
}
function buildPdfPage_L2(g, o, imgPost, imgPre, pageNum) {
  const siteName = g.name || 'Site';
  if (g.hasSubGraph) {
    return `
    <div id="pdf-container" style="width:1040px;height:710px;position:relative;background:#fff;color:#000;font-family:Arial,sans-serif;box-sizing:border-box;padding:16px 20px 10px 20px;overflow:hidden;">
      <div style="text-align:center;font-size:12px;color:#555;margin-bottom:8px;letter-spacing:0.4px;">
        Site: ${siteName}
      </div>
      <div style="border:1px solid #c0c0c0;border-radius:3px;padding:8px 12px 6px 12px;margin-bottom:9px;background:#fff;">
        <div style="font-size:13px;font-weight:bold;text-align:center;margin-bottom:3px;">
          Site: ${siteName} - Pre Monsoon
        </div>
        <img src="${imgPre}" style="width:100%;display:block;" />
        <div style="text-align:center;font-size:10px;color:#444;margin-top:3px;font-weight:600;">Distance (m)</div>
      </div>
      <div style="border:1px solid #c0c0c0;border-radius:3px;padding:8px 12px 6px 12px;background:#fff;">
        <div style="font-size:13px;font-weight:bold;text-align:center;margin-bottom:3px;">
          Site: ${siteName} - Post Monsoon
        </div>
        <img src="${imgPost}" style="width:100%;display:block;" />
        <div style="text-align:center;font-size:10px;color:#444;margin-top:3px;font-weight:600;">Distance (m)</div>
      </div>
      <div style="position:absolute;bottom:5px;right:12px;font-size:11px;color:#666;">${pageNum}</div>
    </div>`;
  } else {
    return `
    <div id="pdf-container" style="width:1040px;height:710px;position:relative;background:#fff;color:#000;font-family:Arial,sans-serif;box-sizing:border-box;padding:24px 30px 16px 30px;overflow:hidden;">
      <div style="text-align:center;font-size:12px;color:#555;margin-bottom:12px;letter-spacing:0.4px;">
        Site: ${siteName}
      </div>
      <div style="border:1px solid #c0c0c0;border-radius:3px;padding:14px 16px 10px 16px;background:#fff;">
        <div style="font-size:15px;font-weight:bold;text-align:center;margin-bottom:8px;">
          Site: ${siteName} - Post Monsoon
        </div>
        <img src="${imgPost}" style="width:100%;display:block;" />
        <div style="text-align:center;font-size:11px;color:#444;margin-top:6px;font-weight:600;">Distance (m)</div>
      </div>
      <div style="position:absolute;bottom:7px;right:14px;font-size:11px;color:#666;">${pageNum}</div>
    </div>`;
  }
}
function buildGraphPdfPageHTML(g, o, imgPost, imgPre, pageNum) {
  return (g.pdfLayout || 1) === 2
    ? buildPdfPage_L2(g, o, imgPost, imgPre, pageNum)
    : buildPdfPage_L1(g, o, imgPost, imgPre, pageNum);
}
function _buildChartImages(g, o) {
  const isLayout2 = (g.pdfLayout || 1) === 2;
  let imgPre = '', imgPost = '';
  const dpiScale = 3; // Render at 3x resolution for high sharpness
  if (g.hasSubGraph) {
    const w = isLayout2 ? 760 : 460;
    const h = isLayout2 ? 225 : 200;
    const canPre = document.createElement('canvas'); canPre.width = w * dpiScale; canPre.height = h * dpiScale;
    const canPost = document.createElement('canvas'); canPost.width = w * dpiScale; canPost.height = h * dpiScale;
    canPre.style.position = 'fixed';
    canPre.style.left = '-9999px';
    canPre.style.top = '0';
    canPost.style.position = 'fixed';
    canPost.style.left = '-9999px';
    canPost.style.top = '0';
    document.body.appendChild(canPre);
    document.body.appendChild(canPost);
    const chartPre = buildPdfChartHelper(g, o, 'pre', canPre);
    const chartPost = buildPdfChartHelper(g, o, 'post', canPost);
    chartPre.update();
    chartPost.update();
    imgPre = canPre.toDataURL('image/png');
    imgPost = canPost.toDataURL('image/png');
    chartPre.destroy(); chartPost.destroy();
    canPre.remove(); canPost.remove();
  } else {
    const w = isLayout2 ? 810 : 600;
    const h = isLayout2 ? 330 : 280;
    const canPost = document.createElement('canvas'); canPost.width = w * dpiScale; canPost.height = h * dpiScale;
    canPost.style.position = 'fixed';
    canPost.style.left = '-9999px';
    canPost.style.top = '0';
    document.body.appendChild(canPost);
    const chartPost = buildPdfChartHelper(g, o, 'post', canPost);
    chartPost.update();
    imgPost = canPost.toDataURL('image/png');
    chartPost.destroy(); canPost.remove();
  }
  return { imgPost, imgPre };
}
function generatePDF(id) {
  const g = S.graphs.find(x => x.id === id);
  if (!g) return;
  const o = calcGraph(g);
  toast('Assembling PDF, please wait…', 'success');
  const { imgPost, imgPre } = _buildChartImages(g, o);
  const pageNum = g.hasSubGraph ? 159 : 170;
  const templateHTML = buildGraphPdfPageHTML(g, o, imgPost, imgPre, pageNum);
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.zIndex = '-100';
  container.style.opacity = '1';
  container.innerHTML = templateHTML;
  document.body.appendChild(container);
  const opt = {
    margin: 0,
    filename: `${(g.hasSubGraph ? g.subName : g.name).replace(/\s+/g, '_')}_Report.pdf`,
    image: { type: 'jpeg', quality: 1.0 },
    html2canvas: { scale: 3, useCORS: true, letterRendering: true, scrollX: 0, scrollY: 0 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
  };
  html2pdf().set(opt).from(container.querySelector('#pdf-container')).save().then(() => {
    container.remove();
    toast('PDF downloaded successfully!', 'success');
  }).catch(err => {
    console.error(err);
    container.remove();
    toast('Failed to export PDF.', 'danger');
  });
}
function generateAllGraphsPDF() {
  if (!S.graphs || S.graphs.length === 0) {
    toast('No cross-sections available to compile.', 'danger');
    return;
  }
  toast('Generating multi-page survey booklet, please wait…', 'success');
  const pagesHTML = [];
  for (let idx = 0; idx < S.graphs.length; idx++) {
    const g = S.graphs[idx];
    const o = calcGraph(g);
    const { imgPost, imgPre } = _buildChartImages(g, o);
    pagesHTML.push(buildGraphPdfPageHTML(g, o, imgPost, imgPre, 159 + idx));
  }
  const pagesSanitized = pagesHTML.map(html => html.replace('id="pdf-container"', 'class="pdf-page-block"'));
  const templateHTML = `<div id="all-pdf-container" style="background:#fff; width: 1040px;">${pagesSanitized.join('\n<div class="html2pdf__page-break"></div>\n')}</div>`;
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.zIndex = '-100';
  container.style.opacity = '1';
  container.innerHTML = templateHTML;
  document.body.appendChild(container);
  const opt = {
    margin: 0,
    filename: 'All_Cross_Sections_Consolidated_Report.pdf',
    image: { type: 'jpeg', quality: 1.0 },
    html2canvas: { scale: 3, useCORS: true, letterRendering: true, scrollX: 0, scrollY: 0 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' },
    pagebreak: { mode: ['css', 'legacy'] }
  };
  html2pdf().set(opt).from(container.querySelector('#all-pdf-container')).save().then(() => {
    container.remove();
    toast('Unified booklet generated successfully!', 'success');
  }).catch(err => {
    console.error(err);
    container.remove();
    toast('Failed to compile consolidated PDF.', 'danger');
  });
}