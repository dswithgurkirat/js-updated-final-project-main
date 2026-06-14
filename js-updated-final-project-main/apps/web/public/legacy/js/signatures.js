/* ══════════════════════════════════════
   SIGNATURES & CHECKLISTS
 ══════════════════════════════════════ */
function renderSignatures() {
  const el=document.getElementById('sig-list'); if(!el) return;
  el.innerHTML=S.signatures.map((s,i)=>{
    const prevSigned=i===0||S.signatures[i-1].signed;
    const canSign=prevSigned&&!s.signed;
    return `<div class="sig-card">
      <div class="sig-num" style="background:${s.signed?'var(--green-lt)':canSign?'var(--saffron-lt)':'var(--bg)'};color:${s.signed?'var(--green)':canSign?'var(--saffron)':'var(--text-faint)'};display:flex;align-items:center;justify-content:center;">
        <i data-lucide="${s.signed?'check':canSign?'clock':'lock'}" style="width:16px;height:16px;"></i>
      </div>
      <div class="sig-info">
        <div class="sig-role">Authority ${s.order} — ${s.role}</div>
        <div class="sig-name">${s.name}</div>
        <div class="sig-dept">${s.dept}</div>
        ${s.signed?`<div style="font-size:10.5px;color:var(--green);margin-top:3px">Signed: ${s.signedAt} via ${s.method}</div>
        ${s.signatureImage ? `<div style="margin-top:6px; background:white; padding:4px; border-radius:4px; display:inline-block;"><img src="${s.signatureImage}" style="height:35px; border-bottom:1px solid #ddd; filter: brightness(0); mix-blend-mode: multiply;"></div>` : ''}`:''}
      </div>
      <div class="sig-status">
        <span class="badge ${s.signed?'badge-green':canSign?'badge-saffron':'badge-gray'}" style="display:inline-flex;align-items:center;gap:4px;">
          <i data-lucide="${s.signed?'check':canSign?'clock':'lock'}" style="width:12px;height:12px;"></i>
          ${s.signed?'Signed':canSign?'Pending':'Locked'}
        </span>
        ${canSign?`<button class="btn btn-saffron btn-xs" onclick="openSign(${s.id})">Sign Now</button>`:''}
      </div>
    </div>`;
  }).join('');
  const pendingCountEl = document.getElementById('sb-pending-sigs');
  if (pendingCountEl) pendingCountEl.textContent=S.signatures.filter(s=>!s.signed).length;
  initLucide();
}
function openSign(id) {
  const s=S.signatures.find(x=>x.id===id);
  document.getElementById('sign-modal-title').textContent=`Sign — ${s.role}`;
  document.getElementById('sign-modal-content').innerHTML=`
    <div style="background:var(--off);border:1px solid var(--border);border-radius:var(--r-md);padding:14px;margin-bottom:14px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-faint);margin-bottom:4px">Signing as</div>
      <div style="font-size:14px;font-weight:700;color:var(--text)">${s.name}</div>
      <div style="font-size:11.5px;color:var(--text-soft)">${s.dept}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:9px">
      <label style="display:flex;align-items:center;gap:9px;cursor:pointer;font-size:12.5px"><input type="checkbox" checked> I have reviewed the complete DSR report</label>
      <label style="display:flex;align-items:center;gap:9px;cursor:pointer;font-size:12.5px"><input type="checkbox" checked> I certify the data accuracy and EMGSM 2020 compliance</label>
      <label style="display:flex;align-items:center;gap:9px;cursor:pointer;font-size:12.5px"><input type="checkbox" checked> I authorize forwarding to the next authority</label>
    </div>
    <div style="margin-top:12px"><label style="font-size:11px;font-weight:700;color:var(--text-mid);text-transform:uppercase;letter-spacing:.04em">Sign Method</label>
      <div style="display:flex;gap:8px;margin-top:6px">
        <label class="btn btn-outline btn-xs" style="cursor:pointer"><input type="radio" name="signmethod" value="aadhaar" checked style="margin-right:4px"> Aadhaar eSign</label>
        <label class="btn btn-outline btn-xs" style="cursor:pointer"><input type="radio" name="signmethod" value="dsc" style="margin-right:4px"> DSC</label>
        <label class="btn btn-outline btn-xs" style="cursor:pointer"><input type="radio" name="signmethod" value="otp" style="margin-right:4px"> OTP</label>
      </div>
    </div>`;
  S.pendingOTPsigId=id;
  document.getElementById('sign-otp').value='';
  document.getElementById('modal-sign').classList.add('open');
  initSignaturePad();
  initLucide();
}
let sigCanvas, sigCtx, isSigDrawing = false;
function initSignaturePad(canvasId = 'signature-pad') {
  sigCanvas = document.getElementById(canvasId);
  if(!sigCanvas) return;
  sigCtx = sigCanvas.getContext('2d');
  clearSignatureCanvas();
  sigCanvas.onmousedown = (e) => { isSigDrawing = true; drawSig(e); };
  sigCanvas.onmouseup = () => { isSigDrawing = false; sigCtx.beginPath(); };
  sigCanvas.onmousemove = drawSig;
  sigCanvas.onmouseout = () => { isSigDrawing = false; sigCtx.beginPath(); };
  sigCanvas.ontouchstart = (e) => { e.preventDefault(); isSigDrawing = true; drawSig(e.touches[0]); };
  sigCanvas.ontouchend = (e) => { e.preventDefault(); isSigDrawing = false; sigCtx.beginPath(); };
  sigCanvas.ontouchmove = (e) => { e.preventDefault(); drawSig(e.touches[0]); };
}
function drawSig(e) {
  if(!isSigDrawing) return;
  const rect = sigCanvas.getBoundingClientRect();
  const scaleX = sigCanvas.width / rect.width;
  const scaleY = sigCanvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  sigCtx.lineWidth = 3;
  sigCtx.lineCap = 'round';
  sigCtx.strokeStyle = document.documentElement.classList.contains('dark') ? '#ffffff' : '#0d1d36';
  sigCtx.lineTo(x, y);
  sigCtx.stroke();
  sigCtx.beginPath();
  sigCtx.moveTo(x, y);
}
function clearSignatureCanvas() {
  if(!sigCtx) return;
  sigCtx.clearRect(0,0,sigCanvas.width, sigCanvas.height);
  sigCtx.beginPath();
}
function doSign() {
  const otp=document.getElementById('sign-otp').value;
  if (otp!=='123456') { toast('Invalid OTP. Demo: 123456','error'); return; }
  const s=S.signatures.find(x=>x.id===S.pendingOTPsigId);
  if (s) {
    s.signed=true; s.signedAt=new Date().toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});
    const method=document.querySelector('input[name="signmethod"]:checked')?.value||'Aadhaar eSign';
    s.method=method==='aadhaar'?'Aadhaar eSign':method==='dsc'?'DSC Token':'OTP Verified';
    if(sigCanvas) {
      s.signatureImage = sigCanvas.toDataURL('image/png');
    }
  }
  closeModal('modal-sign');
  renderSignatures(); renderFinalChecklist();
  if (S.activeProject && S.activeProject.id) {
    const stateSnapshot = {
      frontMatter: S.frontMatter, chapters: S.chapters, plates: S.plates, graphs: S.graphs,
      graphCharts: S.graphCharts, signatures: S.signatures, demandDistricts: S.demandDistricts,
      summarySources: S.summarySources, auctionData: S.auctionData, uploadedPDFs: S.uploadedPDFs,
      annexureB: S.annexureB, annexureC: S.annexureC, annexureD: S.annexureD, annexureE: S.annexureE,
      annexureG: S.annexureG, annexureH: S.annexureH, annexureI: S.annexureI, annexureJ: S.annexureJ
    };
    apiFetch(`/projects/${S.activeProject.id}/state`, {
      method: 'PUT',
      body: JSON.stringify({ state: JSON.stringify(stateSnapshot) })
    }).then(() => {
      toast('Signed successfully! Next authority has been notified.','success');
      const nextSig=S.signatures.find(x=>!x.signed);
      if (nextSig) toast(`Notification sent to ${nextSig.role}`,'info');
      else toast('All signatures complete! PDF can now be generated.','success');
    }).catch(e => {
      console.error('Failed to persist signature:', e);
      toast('Error saving signature to server.','error');
    });
  } else {
    toast('Signed successfully (Local).','success');
  }
}
function renderFinalChecklist() {
  const el=document.getElementById('final-checklist'); if(!el) return;
  const sigs=S.signatures.filter(s=>s.signed).length;
  const items=[
    { name:'Front Matter', sub:'Cover, preface, content page', ok:true },
    { name:'Chapters (10)', sub:'All 10 EMGSM 2020 chapters', ok:S.chapters.length>=10 },
    { name:'Plates', sub:'Maps, graphs, and site images', ok:S.plates.length>0 },
    { name:'Cross Section Graphs', sub:'Elevation profiles generated', ok:S.graphs.length>0 },
    { name:'Annexure I — Sources', sub:'Rivers, de-siltation, patta lands, M-sand', ok:true },
    { name:'Annexure II — Mining Leases', sub:'All potential leases listed', ok:true },
    { name:'Annexure III — Clusters', sub:'Cluster and contiguous cluster details', ok:true },
    { name:'Annexure IV — Transportation', sub:'Route details for all leases', ok:true },
    { name:'Demand & Summary Tables', sub:'District-wise projections', ok:true },
    { name:`E-Signatures (${sigs}/5)`, sub:'Sequential authority signing', ok:sigs===5 }
  ];
  el.innerHTML=items.map(it=>`
    <div class="checklist-item ${it.ok?'done':''}" style="margin-bottom:8px">
      <div class="ci-left">
        <div class="ci-icon" style="background:${it.ok?'var(--green-lt)':'var(--bg)'};color:${it.ok?'var(--green)':'var(--text-faint)'};display:flex;align-items:center;justify-content:center;">
          <i data-lucide="${it.ok?'check':'minus'}" style="width:16px;height:16px;"></i>
        </div>
        <div><div class="ci-name">${it.name}</div><div class="ci-sub">${it.sub}</div></div>
      </div>
      <span class="badge ${it.ok?'badge-green':'badge-gray'}">${it.ok?'Ready':'Pending'}</span>
    </div>`).join('');
  const total=10;
  const countEl = document.getElementById('pdf-page-count');
  if (countEl) countEl.textContent = S.activeProject?.finalPdfPages || `~${(S.chapters.length*4)+(S.plates.length*1)+32} estimated`;
  const resultBox = document.getElementById('final-pdf-result');
  if (resultBox) resultBox.style.display = S.activeProject?.finalPdfName ? 'block' : 'none';
  const warningBox = document.getElementById('final-pdf-warnings');
  if (warningBox && S.activeProject?.finalPdfName) warningBox.style.display = 'none';
  if (typeof updateFinalPdfAdminUI === 'function') updateFinalPdfAdminUI();
  initLucide();
}
function renderWorkflowChecklist() {
  const el=document.getElementById('workflow-checklist'); if(!el) return;
  const items=[
    {n:'Project Setup',ok:true,note:'District, year, mineral type'},
    {n:'Front Matter',ok:true,note:'Cover, preface, acknowledgement'},
    {n:'All 10 Chapters',ok:S.chapters.length>=10,note:`${S.chapters.length}/10 chapters added`},
    {n:'Plate Section',ok:S.plates.length>0,note:`${S.plates.length} plates setup`},
    {n:'Cross Section Graphs',ok:S.graphs.length>0,note:`${S.graphs.length} sections generated`},
    {n:'Annexures I–IV',ok:true,note:'All 4 annexures filled'},
    {n:'Data Tables',ok:true,note:'Demand, auction, summary tables'},
    {n:'E-Signatures',ok:false,note:`${S.signatures.filter(s=>s.signed).length}/5 signed`}
  ];
  el.innerHTML=items.map(it=>`
    <div style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid var(--border)">
      <span style="display:flex;align-items:center;color:${it.ok?'var(--green)':'var(--text-faint)'}">
        <i data-lucide="${it.ok?'check-circle-2':'circle'}" style="width:16px;height:16px;"></i>
      </span>
      <div style="flex:1"><div style="font-size:12.5px;font-weight:600;color:var(--text)">${it.n}</div><div style="font-size:10.5px;color:var(--text-soft)">${it.note}</div></div>
      <span class="badge ${it.ok?'badge-green':'badge-amber'}">${it.ok?'Done':'Pending'}</span>
    </div>`).join('');
  initLucide();
}
