/* ══════════════════════════════════════
   PROJECTS & DASHBOARD
══════════════════════════════════════ */
let currentDistrictFilter = 'ALL';
function getPunjabDistricts() {
  return Array.isArray(window.PUNJAB_DISTRICTS) && window.PUNJAB_DISTRICTS.length
    ? window.PUNJAB_DISTRICTS
    : ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga', 'Pathankot', 'Patiala', 'Rupnagar', 'Sahibzada Ajit Singh Nagar', 'Sangrur', 'Shaheed Bhagat Singh Nagar', 'Sri Muktsar Sahib', 'Tarn Taran'];
}
function hydrateDistrictSelect(selectId, includeAll = false) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const current = select.value || (includeAll ? 'ALL' : 'Jalandhar');
  const options = includeAll ? ['ALL', ...getPunjabDistricts()] : getPunjabDistricts();
  select.innerHTML = options.map(d => {
    const label = d === 'ALL' ? 'All Districts (Punjab)' : d;
    return `<option value="${d}">${label}</option>`;
  }).join('');
  select.value = options.includes(current) ? current : (includeAll ? 'ALL' : 'Jalandhar');
}
function normalizeBackendProjects(data) {
  const rows = Array.isArray(data) ? data : (Array.isArray(data?.value) ? data.value : []);
  return rows.map(p => ({
    id: p.id,
    title: p.title || p.projectName || `District Survey Report - ${p.district || 'Punjab'}`,
    projectName: p.projectName || p.title,
    district: p.district || 'Punjab',
    year: p.year || '2025-26',
    mineral: p.mineral || 'Sand',
    rivers: p.rivers || 'Not specified',
    progress: Number.isFinite(Number(p.progress)) ? Number(p.progress) : 0,
    status: p.status === 'IN_PROGRESS' || p.status === 'ACTIVE' ? 'In Progress' : (p.status || 'In Progress'),
    phaseNo: Number.isFinite(Number(p.phaseNo)) ? Number(p.phaseNo) : 1,
    parentPhaseId: p.parentPhaseId || null,
    phaseLocked: Boolean(p.phaseLocked),
    phaseOrigin: p.phaseOrigin || null,
    createdAt: p.createdAt ? new Date(p.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
    signatures: Number.isFinite(Number(p.signatures)) ? Number(p.signatures) : 0,
    projectState: p.projectState || null,
    finalPdfName: p.finalPdfName || null,
    finalPdfGeneratedAt: p.finalPdfGeneratedAt || null,
    finalPdfPages: p.finalPdfPages || 0
  }));
}
async function refreshProjectsFromBackend(renderAfter = true) {
  try {
    const data = await apiFetch('/projects');
    S.projects = normalizeBackendProjects(data);
    S.projectLoadError = '';
    S.projectsLoadedAt = new Date().toLocaleTimeString();
    updateProjectBadgeCount();
    updateTopBarProjectsDropdown();
    if (renderAfter) {
      renderProjects();
      if (typeof renderDashboard === 'function') renderDashboard();
    }
    return S.projects;
  } catch (err) {
    S.projectLoadError = err.message || 'Failed to load projects from backend';
    if (renderAfter) renderProjects();
    throw err;
  }
}
function updateProjectBadgeCount() {
  const badgeEl = document.getElementById('badge-projs');
  if (badgeEl) badgeEl.textContent = S.projects.length;
}
function updateTopBarProjectsDropdown() {
  const dropdown = document.getElementById('tb-projects-dropdown');
  if (!dropdown) return;
  let html = `<a href="#" onclick="showView('projects',null); return false;">View All Projects</a>`;
  if (typeof hasAdminAccess === 'function' && hasAdminAccess()) {
    html += `<a href="#" onclick="newProjectModal(); return false;">+ Add New Project</a>`;
  }
  if (S.projects && S.projects.length > 0) {
    html += `<div style="height:1px; background:var(--border); margin:4px 0;"></div>`;
    html += `<div style="padding: 4px 20px; font-size:11px; font-weight:700; color:var(--text-soft); text-transform:uppercase; letter-spacing:.05em;">Recent Projects</div>`;
    S.projects.slice(0, 5).forEach(p => {
      html += `<a href="#" onclick="openProject(${p.id}); return false;" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;" title="${p.title}">
        ${p.title} <span style="color:var(--text-soft); font-size:11px;">(${p.district})</span>
      </a>`;
    });
  }
  dropdown.innerHTML = html;
}
function getProjectLiveProgressStatus(p) {
  if (!p) return '<span style="color:var(--text-soft)">No project selected</span>';
  const progress = Number(p.progress) || 0;
  if (p.status === 'Completed') return '<span style="color:var(--green)">✓ Fully Approved & Generated</span>';
  if (progress >= 100) return '<span style="color:var(--teal)">Pending Authority E-Signatures</span>';
  if (progress > 80) return '<span style="color:var(--saffron)">Finalizing Annexures & Tables</span>';
  if (progress > 40) return '<span style="color:var(--saffron)">Uploading Chapters & Plates</span>';
  if (progress > 0) return '<span style="color:var(--primary)">Front Matter & Baseline Data</span>';
  return '<span style="color:var(--text-soft)">Initial Project Setup</span>';
}
function populateWorkflowProjectSelect() {
  const select = document.getElementById('workflow-project-select');
  if (!select) return;
  const activeId = S.activeProject ? String(S.activeProject.id) : '';
  select.innerHTML = '<option value="">-- Select Project --</option>' + (S.projects || []).map(p => {
    const selected = String(p.id) === activeId ? ' selected' : '';
    return `<option value="${p.id}"${selected}>${p.title} (${p.district})</option>`;
  }).join('');
}
function renderWorkflowProjectLiveCard() {
  populateWorkflowProjectSelect();
  const card = document.getElementById('workflow-project-live-card');
  const badge = document.getElementById('workflow-live-status-badge');
  if (!card) return;
  const p = S.activeProject;
  if (!p) {
    card.innerHTML = '<div style="font-size:13px; color:var(--text-soft);">Choose a project to see live completion progress.</div>';
    if (badge) {
      badge.textContent = 'No project selected';
      badge.className = 'badge badge-blue';
    }
    return;
  }
  const progress = Math.max(0, Math.min(100, Number(p.progress) || 0));
  const statusClass = progress >= 100 ? 'badge-green' : progress > 40 ? 'badge-amber' : 'badge-blue';
  if (badge) {
    badge.textContent = `${p.status || 'In Progress'} · ${progress}%`;
    badge.className = `badge ${statusClass}`;
  }
  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:10px;">
      <div style="min-width:0;">
        <div style="font-size:13.5px; font-weight:800; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.title}</div>
        <div style="font-size:12px; color:var(--text-soft); margin-top:3px;">${p.district} District · ${p.year || '2025-26'} · ${p.mineral || 'Sand'}</div>
      </div>
      ${getDistrictBadgeHTML(p.district)}
    </div>
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
      <div class="progress-bar" style="flex:1;"><div class="progress-fill" style="width:${progress}%; background:${progress >= 100 ? 'var(--green)' : 'linear-gradient(90deg,var(--teal),var(--saffron))'};"></div></div>
      <span style="font-size:12px; font-weight:900; color:var(--text);">${progress}%</span>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
      <div style="font-size:12.5px; color:var(--text-mid);">Current Stage: <strong>${getProjectLiveProgressStatus(p)}</strong></div>
      <button type="button" class="btn btn-outline btn-sm" onclick="openWorkflowActiveProject()">
        <i data-lucide="external-link" style="width:13px;height:13px;"></i> Open Current Project
      </button>
    </div>`;
  if (typeof refreshDistrictBadgesInDOM === 'function') refreshDistrictBadgesInDOM();
  if (window.initLucide) initLucide(card);
}
async function selectWorkflowProject(projectId) {
  if (!projectId) {
    clearActiveProject();
    showView('workflow', null);
    renderWorkflowProjectLiveCard();
    return;
  }
  await openProject(Number(projectId) || projectId);
  showView('workflow', null);
  renderWorkflowProjectLiveCard();
}
function openWorkflowActiveProject() {
  if (!S.activeProject) {
    toast('Select a project first.', 'info');
    return;
  }
  const target = typeof getFirstAllowedProjectView === 'function' ? getFirstAllowedProjectView() : 'front-matter';
  showView(target === 'workflow' ? 'front-matter' : target, null);
}
window.selectWorkflowProject = selectWorkflowProject;
window.openWorkflowActiveProject = openWorkflowActiveProject;
window.renderWorkflowProjectLiveCard = renderWorkflowProjectLiveCard;
function filterDashboardByDistrict(val) {
  currentDistrictFilter = val;
  const selector = document.getElementById('dash-district-filter');
  if (selector && selector.value !== val) selector.value = val;
  renderDashboard();
  renderProjects();
}
function dashPortalToast(message, type = 'info') {
  if (typeof toast === 'function') toast(message, type);
  else console.log(message);
}
function dashFocusSearch() {
  const input = document.getElementById('dash-portal-search') || document.getElementById('projects-portal-search') || document.getElementById('tb-portal-search');
  if (!input) return;
  input.focus();
  input.select();
}
function dashRunSearch(event) {
  if (event && event.key !== 'Enter') return;
  const input = document.getElementById('dash-portal-search') || document.getElementById('projects-portal-search') || document.getElementById('tb-portal-search');
  const query = (input && input.value ? input.value : '').trim().toLowerCase();
  if (!query) {
    dashPortalToast('Type a keyword, then press Enter.');
    return;
  }
  const routes = [
    { words: ['project', 'projects', 'dsr'], view: 'projects', label: 'projects' },
    { words: ['new', 'create', 'add'], action: () => newProjectModal(), label: 'new project' },
    { words: ['sign', 'signature', 'esign', 'approval'], view: 'esign', label: 'e-signature panel' },
    { words: ['workflow', 'review', 'status'], view: 'workflow', label: 'workflow' },
    { words: ['pdf', 'download', 'guideline', 'guidelines', 'generate'], view: 'generate', label: 'downloads and PDF generation' },
    { words: ['help', 'faq', 'support', 'contact', 'rti'], view: 'sdlc-portal', label: 'help and support' },
    { words: ['district', 'progress', 'dashboard'], action: () => document.getElementById('dash-main-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), label: 'dashboard district section' }
  ];
  const match = routes.find(route => route.words.some(word => query.includes(word)));
  if (!match) {
    dashPortalToast('No dashboard shortcut found. Try project, workflow, sign, PDF, district, or help.', 'error');
    return;
  }
  if (match.view) showView(match.view, null);
  if (match.action) match.action();
  dashPortalToast(`Opened ${match.label}.`, 'success');
}
async function dashSharePortal() {
  const url = window.location.href.split('#')[0] + '#dashboard';
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      dashPortalToast('Dashboard link copied.', 'success');
    } else {
      window.prompt('Copy dashboard link:', url);
    }
  } catch (err) {
    window.prompt('Copy dashboard link:', url);
  }
}
async function renderDashboard() {
  hydrateDistrictSelect('dash-district-filter', true);
  hydrateDistrictSelect('proj-district', false);
  hydrateDistrictSelect('pdf-district', false);
  const filteredProjs = currentDistrictFilter === 'ALL'
    ? S.projects
    : S.projects.filter(p => p.district === currentDistrictFilter);
  const done = filteredProjs.filter(p=>p.progress===100).length;
  const pend = filteredProjs.reduce((sum, p) => sum + Math.max(0, 5 - (Number(p.signatures) || 0)), 0);
  const generatedPdfCount = filteredProjs.filter(p => !!p.finalPdfName).length;
  const totalEl = document.getElementById('d-total');
  const doneEl = document.getElementById('d-done');
  const sigsEl = document.getElementById('d-sigs');
  const pdfsEl = document.getElementById('d-pdfs');
  try {
    if (currentDistrictFilter !== 'ALL') throw new Error('Use local filtered dashboard stats');
    const stats = await apiFetch('/dashboard/stats');
    if (totalEl) totalEl.textContent = stats.totalProjects || 0;
    if (doneEl) doneEl.textContent = stats.completedReports || 0;
    if (sigsEl) sigsEl.textContent = stats.pendingReports || 0;
    if (pdfsEl) pdfsEl.textContent = stats.generatedPdfs || generatedPdfCount || 0;
  } catch (err) {
    if (totalEl) totalEl.textContent = filteredProjs.length;
    if (doneEl) doneEl.textContent = done;
    if (sigsEl) sigsEl.textContent = pend;
    if (pdfsEl) pdfsEl.textContent = generatedPdfCount;
  }
  const totalVal = parseInt(totalEl ? totalEl.textContent : 0) || 0;
  const doneVal = parseInt(doneEl ? doneEl.textContent : 0) || 0;
  const sigsVal = parseInt(sigsEl ? sigsEl.textContent : 0) || 0;
  const pdfsVal = parseInt(pdfsEl ? pdfsEl.textContent : 0) || 0;
  const totalPct = 100;
  const donePct = totalVal > 0 ? Math.round((doneVal / totalVal) * 100) : 0;
  const sigsPct = totalVal > 0 ? Math.min(100, Math.round((sigsVal / totalVal) * 100)) : 0;
  const pdfsPct = totalVal > 0 ? Math.round((pdfsVal / totalVal) * 100) : 0;
  const totalFill = document.getElementById('d-total-fill');
  const totalPctEl = document.getElementById('d-total-pct');
  if (totalFill) totalFill.style.width = totalPct + '%';
  if (totalPctEl) totalPctEl.textContent = totalPct + '%';
  const doneFill = document.getElementById('d-done-fill');
  const donePctEl = document.getElementById('d-done-pct');
  if (doneFill) doneFill.style.width = donePct + '%';
  if (donePctEl) donePctEl.textContent = donePct + '%';
  const sigsFill = document.getElementById('d-sigs-fill');
  const sigsPctEl = document.getElementById('d-sigs-pct');
  if (sigsFill) sigsFill.style.width = sigsPct + '%';
  if (sigsPctEl) sigsPctEl.textContent = sigsPct + '%';
  const pdfsFill = document.getElementById('d-pdfs-fill');
  const pdfsPctEl = document.getElementById('d-pdfs-pct');
  if (pdfsFill) pdfsFill.style.width = pdfsPct + '%';
  if (pdfsPctEl) pdfsPctEl.textContent = pdfsPct + '%';
  const progressEl = document.getElementById('dash-district-progress');
  if (progressEl) {
    const districtsList = getPunjabDistricts();
    let progressHtml = '';
    districtsList.forEach(d => {
      const distProjs = S.projects.filter(p => p.district === d);
      const avgProgress = distProjs.length > 0 ? Math.round(distProjs.reduce((acc, p) => acc + p.progress, 0) / distProjs.length) : 0;
      const style = getDistrictStyle(d);
      progressHtml += `
        <div class="dist-progress-item">
          <span class="dist-progress-name">
            <span style="width:8px; height:8px; border-radius:50%; background:${style.border}; display:inline-block;"></span>
            ${d}
          </span>
          <div class="dist-progress-bar-container">
            <div class="dist-progress-bar">
              <div class="dist-progress-fill" style="width:${avgProgress}%; background:${style.border};"></div>
            </div>
            <span class="dist-progress-pct">${avgProgress}%</span>
          </div>
        </div>
      `;
    });
    progressEl.innerHTML = progressHtml;
  }
  const el = document.getElementById('dash-recent');
  if (el) {
    if (filteredProjs.length === 0) {
      el.innerHTML = `<div style="text-align:center; padding: 24px; color:var(--text-soft); font-size:13px;">No projects yet. Use <strong>+ Create New DSR Project</strong> to add one${currentDistrictFilter !== 'ALL' ? ` for ${currentDistrictFilter}` : ''}.</div>`;
    } else {
      el.innerHTML = filteredProjs.slice(0,3).map(p=>`
        <div class="file-item" style="margin-bottom:8px;cursor:pointer" onclick="openProject(${p.id})">
          <div class="file-icon" style="background:${p.progress===100?'rgba(22,163,74,0.12)':'rgba(37,99,235,0.12)'}; color:${p.progress===100?'var(--green)':'var(--primary)'}"><i data-lucide="${p.progress===100?'check-circle':'file-text'}"></i></div>
          <div class="file-info" style="flex:1; min-width:0;">
            <div class="file-name" style="display:flex; align-items:center; gap:8px;">
              ${p.title}
              ${getDistrictBadgeHTML(p.district)}
            </div>
            <div class="file-meta">${p.district} District · ${p.year}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px; flex-shrink:0;">
            <span class="badge ${p.status==='Completed'?'badge-green':p.status==='In Progress'?'badge-amber':'badge-red'}">${p.status}</span>
            <span style="font-size:10px;color:var(--text-faint)">${p.progress}%</span>
            ${hasAdminAccess() ? `<button type="button" class="btn btn-danger btn-xs" onclick="deleteProject(${p.id}, event)" title="Delete project">Delete</button>` : ''}
          </div>
        </div>`).join('');
    }
  }
  updateActiveDistrictUI(currentDistrictFilter !== 'ALL' ? currentDistrictFilter : (S.activeProject ? S.activeProject.district : 'Punjab'));
  renderDistrictLegends();
  if (typeof refreshDistrictBadgesInDOM === 'function') refreshDistrictBadgesInDOM();
  if (typeof updateRolePermissionUI === 'function') updateRolePermissionUI();
  initLucide();
}
let projectRenderLimit = 60;
function showMoreProjects() {
  projectRenderLimit += 60;
  renderProjects();
}
window.showMoreProjects = showMoreProjects;
function renderProjects() {
  updateTopBarProjectsDropdown();
  const grid = document.getElementById('projects-grid');
  if (!grid) return;
  const statusEl = document.getElementById('projects-load-status');
  if (statusEl) {
    if (S.projectLoadError) {
      statusEl.textContent = 'Project API error: ' + S.projectLoadError;
      statusEl.style.color = 'var(--red)';
    } else {
      statusEl.textContent = `${S.projects.length} project(s) loaded from backend${S.projectsLoadedAt ? ' at ' + S.projectsLoadedAt : ''}`;
      statusEl.style.color = 'var(--text-soft)';
    }
  }
  if (S.projectLoadError) {
    grid.innerHTML = `
      <div class="projects-empty-state">
        <div class="projects-empty-state__inner">
          <div class="projects-empty-state__icon"><i data-lucide="alert-triangle" style="width:24px;height:24px;"></i></div>
          <h3>Projects Not Loading</h3>
          <p>${S.projectLoadError}</p>
          <button type="button" class="btn btn-saffron" onclick="initApp()">Retry Load</button>
        </div>
      </div>`;
    initLucide();
    return;
  }
  const filteredProjs = currentDistrictFilter === 'ALL'
    ? S.projects
    : S.projects.filter(p => p.district === currentDistrictFilter);
  if (filteredProjs.length === 0) {
    const districtHint = currentDistrictFilter === 'ALL' ? '' : ` for ${currentDistrictFilter}`;
    const canCreateProject = typeof hasAdminAccess === 'function' && hasAdminAccess();
    grid.innerHTML = `
      <div class="projects-empty-state">
        <div class="projects-empty-state__inner">
          <div class="projects-empty-state__icon">
            <i data-lucide="folder-plus" style="width:24px; height:24px;"></i>
          </div>
          <h3>No DSR Projects Yet</h3>
          <p>${canCreateProject ? `Click <strong>+ New Project</strong> to create your first district survey report${districtHint}.` : `No district survey report has been created yet${districtHint}. Once Admin creates a project, it will appear here.`}</p>
          ${canCreateProject ? `<button type="button" class="btn btn-saffron" onclick="newProjectModal()">+ New Project</button>` : ''}
        </div>
      </div>`;
    initLucide();
    if (typeof updateRolePermissionUI === 'function') updateRolePermissionUI();
    return;
  }
  const visibleProjects = filteredProjs.slice(0, projectRenderLimit);
  grid.innerHTML = visibleProjects.map(p=>`
    <div class="proj-card">
      <div class="proj-card-top" style="cursor:pointer" onclick="openProject(${p.id})">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:8px;">
          <h3 style="font-size:14px; font-weight:700; color:var(--text);">${p.title}</h3>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
            ${getDistrictBadgeHTML(p.district)}
            <span class="badge ${p.phaseLocked ? 'badge-red' : normalizePhaseNo(p) > 1 ? 'badge-blue' : 'badge-navy'}">${getProjectPhaseLabel(p)}${p.phaseLocked ? ' Locked' : ''}</span>
          </div>
        </div>
        <p style="font-size:12px; color:var(--text-soft);">${p.district} District · ${p.year}</p>
      </div>
      <div class="proj-card-bd">
        <div class="proj-meta">
          <span class="badge badge-navy">${p.mineral}</span>
          ${renderRiverTags(p.rivers)}
          <span class="badge ${p.status==='Completed'?'badge-green':p.status==='In Progress'?'badge-amber':'badge-red'}">${p.status}</span>
        </div>
        <div style="font-size:10.5px;color:var(--text-faint);margin-bottom:10px">Created: ${p.createdAt} · Sigs: ${p.signatures}/5</div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:${p.progress}%;background:${p.progress===100?'var(--green)':'linear-gradient(90deg,var(--teal),var(--teal-2))'}"></div></div>
          <span style="font-size:12px;font-weight:700;color:var(--text)">${p.progress}%</span>
        </div>
        <div style="background:var(--bg); padding:10px 12px; border-radius:var(--r-md); margin-bottom:16px; font-size:13px; border:1px solid var(--border-2);">
          <div style="font-weight:800; margin-bottom:6px; color:var(--text); display:flex; align-items:center; gap:6px;">
            <i data-lucide="activity" style="width:14px; height:14px; color:var(--primary);"></i> Live Progress Report
          </div>
          <div style="color:var(--text-mid); font-weight:500;">
            Current Stage: <strong>${getProjectLiveProgressStatus(p)}</strong>
          </div>
        </div>
        <div class="proj-card-actions">
          <button type="button" class="btn btn-outline btn-sm" style="flex:1" onclick="openProject(${p.id})">Open Project</button>
          ${hasAdminAccess() ? `<button type="button" class="btn btn-green btn-sm" onclick="initiateNextPhase(${p.id}, event)"><i data-lucide="git-branch-plus"></i> Next Phase</button>` : ''}
          ${p.finalPdfName && typeof canAccessFinalDsrPdf === 'function' && canAccessFinalDsrPdf() ? `<button type="button" class="btn btn-navy btn-sm final-pdf-admin-action" onclick="downloadProjectFinalPDF(${p.id}, event)"><i data-lucide="download"></i> PDF</button>` : ''}
          ${hasAdminAccess() ? `<button type="button" class="btn btn-danger btn-sm" onclick="deleteProject(${p.id}, event)"><i data-lucide="trash-2"></i> Delete</button>` : ''}
        </div>
      </div>
    </div>`).join('');
  if (filteredProjs.length > visibleProjects.length) {
    grid.insertAdjacentHTML('beforeend', `
      <div class="projects-load-more">
        <button type="button" class="btn btn-outline" onclick="showMoreProjects()">Show ${Math.min(60, filteredProjs.length - visibleProjects.length)} more projects</button>
      </div>`);
  }
  renderDistrictLegends();
  if (typeof refreshDistrictBadgesInDOM === 'function') refreshDistrictBadgesInDOM();
  if (typeof updateRolePermissionUI === 'function') updateRolePermissionUI();
  initLucide();
}
async function downloadProjectFinalPDF(projectId, event) {
  if (event) event.stopPropagation();
  if (typeof canAccessFinalDsrPdf === 'function' && !canAccessFinalDsrPdf()) {
    if (typeof showFinalPdfAccessDenied === 'function') showFinalPdfAccessDenied();
    return;
  }
  const project = S.projects.find(p => String(p.id) === String(projectId));
  if (!project || !project.finalPdfName) {
    toast('No generated final PDF found for this project.', 'info');
    return;
  }
  try {
    const response = await fetch(`/api/download-pdf?projectId=${encodeURIComponent(projectId)}&annexureId=final`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('dsr_token') || ''}` }
    });
    if (!response.ok) throw new Error(await response.text());
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = project.finalPdfName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    toast(err.message || 'Unable to download Final DSR PDF', 'error');
  }
}
window.downloadProjectFinalPDF = downloadProjectFinalPDF;
window.initiateNextPhase = initiateNextPhase;
window.createNextPhase = createNextPhase;
async function openProject(id) {
  S.activeProject = S.projects.find(p=>p.id===id);
  if (!S.activeProject) return;
  if (typeof resetProjectWorkingState === 'function') {
    resetProjectWorkingState(S.activeProject);
  }
  S.phaseMetadata = {
    phaseNo: normalizePhaseNo(S.activeProject),
    parentPhaseId: S.activeProject.parentPhaseId || null,
    locked: Boolean(S.activeProject.phaseLocked),
    defaultUploadColor: S.activeProject.defaultUploadColor || '#34C759',
    origin: S.activeProject.phaseOrigin || null
  };
  S.phaseChangeLog = [];
  try {
    const projData = await apiFetch(`/projects/${id}`);
    S.activeProject.phaseNo = projData.phaseNo || S.activeProject.phaseNo || 1;
    S.activeProject.parentPhaseId = projData.parentPhaseId || null;
    S.activeProject.phaseLocked = Boolean(projData.phaseLocked);
    S.activeProject.phaseOrigin = projData.phaseOrigin || null;
    if (projData.projectState) {
      const stateSnapshot = JSON.parse(projData.projectState);
      S.phaseMetadata = {
        ...S.phaseMetadata,
        ...(stateSnapshot.phaseMetadata || {}),
        phaseNo: stateSnapshot.phaseMetadata?.phaseNo || projData.phaseNo || S.activeProject.phaseNo || 1,
        parentPhaseId: stateSnapshot.phaseMetadata?.parentPhaseId || projData.parentPhaseId || null,
        locked: Boolean(stateSnapshot.phaseMetadata?.locked || projData.phaseLocked)
      };
      S.phaseChangeLog = Array.isArray(stateSnapshot.phaseChangeLog) ? stateSnapshot.phaseChangeLog : [];
      if (stateSnapshot.frontMatter) S.frontMatter = stateSnapshot.frontMatter;
      if (stateSnapshot.chapters) S.chapters = stateSnapshot.chapters;
      if (stateSnapshot.plates) S.plates = stateSnapshot.plates;
      if (stateSnapshot.graphs) S.graphs = stateSnapshot.graphs;
      if (stateSnapshot.graphCharts) S.graphCharts = stateSnapshot.graphCharts;
      if (stateSnapshot.signatures) S.signatures = stateSnapshot.signatures;
      if (stateSnapshot.demandDistricts) S.demandDistricts = stateSnapshot.demandDistricts;
      if (stateSnapshot.summarySources) S.summarySources = stateSnapshot.summarySources;
      if (stateSnapshot.auctionData) S.auctionData = stateSnapshot.auctionData;
      if (stateSnapshot.uploadedPDFs) S.uploadedPDFs = stateSnapshot.uploadedPDFs;
      S.frontMatterFiles = stateSnapshot.frontMatterFiles || {};
      if (stateSnapshot.chapterPDFs) S.chapterPDFs = stateSnapshot.chapterPDFs;
      S.annexureB = stateSnapshot.annexureB || [];
      S.annexureC = stateSnapshot.annexureC || [];
      S.annexureD = stateSnapshot.annexureD || [];
      S.annexureE = stateSnapshot.annexureE || [];
      S.annexureG = stateSnapshot.annexureG || [];
      S.annexureH = stateSnapshot.annexureH || [];
      S.annexureI = stateSnapshot.annexureI || [];
      S.annexureJ = stateSnapshot.annexureJ || [];
      if (stateSnapshot.finalPdfName) S.activeProject.finalPdfName = stateSnapshot.finalPdfName;
      if (stateSnapshot.finalPdfGeneratedAt) S.activeProject.finalPdfGeneratedAt = stateSnapshot.finalPdfGeneratedAt;
      if (stateSnapshot.finalPdfPages) S.activeProject.finalPdfPages = stateSnapshot.finalPdfPages;
      if (stateSnapshot.sdlcData) S.sdlcData = stateSnapshot.sdlcData;
      else S.sdlcData = null;
      if (stateSnapshot.anx6PdfName) {
        S.activeProject.anx6PdfName = stateSnapshot.anx6PdfName;
        const index = S.projects.findIndex(p => p.id === S.activeProject.id);
        if (index >= 0) S.projects[index].anx6PdfName = stateSnapshot.anx6PdfName;
      }
      if (stateSnapshot.anx7PdfName) {
        S.activeProject.anx7PdfName = stateSnapshot.anx7PdfName;
        const index = S.projects.findIndex(p => p.id === S.activeProject.id);
        if (index >= 0) S.projects[index].anx7PdfName = stateSnapshot.anx7PdfName;
      }
    }
  } catch (err) {
    console.error('Could not load project state:', err);
  }
  ['report-nav','annexure-nav','tables-nav','finalize-nav'].forEach(n=>{
    const el=document.getElementById(n); if(el) el.style.display='block';
  });
  const dist = S.activeProject.district;
  updateActiveDistrictUI(dist);
  if (typeof updateActiveProjectCardUI === 'function') updateActiveProjectCardUI();
  filterDashboardByDistrict(dist);
  const fmDistEl = document.getElementById('fm-district');
  if (fmDistEl) fmDistEl.value=dist;
  if (typeof checkReviewStatus === 'function') {
      checkReviewStatus(id);
  }
  if (typeof setSidebarCollapsed === 'function') {
    setSidebarCollapsed(false);
  } else if (typeof isSidebarPinned !== 'undefined') {
    isSidebarPinned = true;
    document.body.classList.remove('sidebar-hidden');
  }
  if (typeof updateSidebarToggleVisibility === 'function') {
    updateSidebarToggleVisibility();
  }
  const firstAllowedView = typeof getFirstAllowedProjectView === 'function'
    ? getFirstAllowedProjectView()
    : (typeof getFirstAllowedView === 'function' ? getFirstAllowedView() : 'projects');
  showView(firstAllowedView, null);
  toast('Opened: '+dist+' DSR Project','info');
}
function newProjectModal() { 
  if (typeof hasAdminAccess === 'function' && !hasAdminAccess()) {
    toast('Permission Denied: Only Administrators can create new projects.', 'error');
    alert('Permission Denied: Only Administrators can create new projects.');
    return;
  }
  const el = document.getElementById('modal-project');
  hydrateDistrictSelect('proj-district', false);
  if (el) el.classList.add('open'); 
}
let pendingPhaseSourceId = null;
function initiateNextPhase(projectId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (typeof hasAdminAccess === 'function' && !hasAdminAccess()) {
    toast('Only Administrators can initiate the next phase.', 'error');
    return;
  }
  const source = S.projects.find(p => String(p.id) === String(projectId));
  if (!source) {
    toast('Source DSR phase not found.', 'error');
    return;
  }
  pendingPhaseSourceId = source.id;
  const nextNo = normalizePhaseNo(source) + 1;
  const titleEl = document.getElementById('phase-source-title');
  const nextEl = document.getElementById('phase-next-no');
  const nameEl = document.getElementById('phase-title');
  const colorEl = document.getElementById('phase-upload-color');
  if (titleEl) titleEl.textContent = `${source.title} (${getProjectPhaseLabel(source)})`;
  if (nextEl) nextEl.textContent = `Phase ${nextNo}`;
  if (nameEl) nameEl.value = `${String(source.title || source.projectName || 'District Survey Report').replace(/\s+-\s+Phase\s+\d+$/i, '')} - Phase ${nextNo}`;
  if (colorEl) colorEl.innerHTML = phaseColorOptionsHtml('#34C759');
  const modal = document.getElementById('modal-phase');
  if (modal) modal.classList.add('open');
}
async function createNextPhase() {
  if (!pendingPhaseSourceId) {
    toast('Select a source phase first.', 'error');
    return;
  }
  const source = S.projects.find(p => String(p.id) === String(pendingPhaseSourceId));
  if (!source) {
    toast('Source DSR phase not found.', 'error');
    return;
  }
  const color = document.getElementById('phase-upload-color')?.value || '#34C759';
  const title = document.getElementById('phase-title')?.value || '';
  try {
    const created = await apiFetch(`/projects/${pendingPhaseSourceId}/phases`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        uploadColor: color,
        phaseNo: normalizePhaseNo(source) + 1
      })
    });
    const [phaseProject] = normalizeBackendProjects([created]);
    S.projects = S.projects.map(p => String(p.id) === String(source.id) ? { ...p, phaseLocked: true } : p);
    S.projects.unshift(phaseProject);
    closeModal('modal-phase');
    pendingPhaseSourceId = null;
    renderProjects();
    renderDashboard();
    updateProjectBadgeCount();
    await openProject(phaseProject.id);
    toast(`${getProjectPhaseLabel(phaseProject)} initiated from ${getProjectPhaseLabel(source)}. Source phase is locked.`, 'success');
  } catch (err) {
    toast('Failed to initiate next phase: ' + (err.message || err), 'error');
  }
}
async function persistProjectState() {
  if (!S.activeProject || !S.activeProject.id) return;
  if (typeof isActivePhaseLocked === 'function' && isActivePhaseLocked()) return;
  if (!hasWriteAccess()) return;
  const stateSnapshot = {
    frontMatter: S.frontMatter,
    chapters: S.chapters,
    plates: S.plates,
    graphs: S.graphs,
    graphCharts: S.graphCharts,
    signatures: S.signatures,
    demandDistricts: S.demandDistricts,
    summarySources: S.summarySources,
    auctionData: S.auctionData,
    uploadedPDFs: S.uploadedPDFs,
    frontMatterFiles: S.frontMatterFiles,
    chapterPDFs: S.chapterPDFs,
    annexureB: S.annexureB,
    annexureC: S.annexureC,
    annexureD: S.annexureD,
    annexureE: S.annexureE,
    annexureG: S.annexureG,
    annexureH: S.annexureH,
    annexureI: S.annexureI,
    annexureJ: S.annexureJ,
    finalPdfName: S.activeProject.finalPdfName || null,
    finalPdfGeneratedAt: S.activeProject.finalPdfGeneratedAt || null,
    finalPdfPages: S.activeProject.finalPdfPages || 0,
    anx6PdfName: S.activeProject.anx6PdfName,
    anx7PdfName: S.activeProject.anx7PdfName,
    sdlcData: S.sdlcData,
    phaseMetadata: S.phaseMetadata || null,
    phaseChangeLog: S.phaseChangeLog || []
  };
  try {
    await apiFetch(`/projects/${S.activeProject.id}/state`, {
      method: 'PUT',
      body: JSON.stringify({ state: JSON.stringify(stateSnapshot) })
    });
  } catch (err) {
    console.error('Failed to persist project state:', err);
  }
}
async function createProject() {
  const title = document.getElementById('proj-title').value || `District Survey Report — ${document.getElementById('proj-district').value}`;
  const payload = {
    projectName: title,
    district: document.getElementById('proj-district').value,
    year: document.getElementById('proj-year').value,
    mineral: document.getElementById('proj-mineral').value,
    rivers: document.getElementById('proj-rivers').value || 'Not specified',
    status: 'ACTIVE'
  };
  try {
    const createdProject = await apiFetch('/projects', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const proj = {
      id: createdProject.id, 
      title: createdProject.projectName,
      district: createdProject.district,
      year: document.getElementById('proj-year').value,
      mineral: document.getElementById('proj-mineral').value,
      rivers: document.getElementById('proj-rivers').value || 'Not specified',
      progress: 0, 
      status: 'In Progress', 
      phaseNo: 1,
      parentPhaseId: null,
      phaseLocked: false,
      createdAt: new Date().toLocaleString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}), 
      signatures: 0
    };
    S.projects.unshift(proj);
    closeModal('modal-project');
    document.getElementById('proj-title').value = '';
    document.getElementById('proj-rivers').value = '';
    renderProjects();
    renderDashboard();
    updateProjectBadgeCount();
    openProject(proj.id);
    toast('DSR Project created successfully!','success');
    await persistProjectState();
  } catch (err) {
    toast('Failed to create project: ' + err.message, 'error');
  }
}
let saveStateTimeout = null;
function debouncedSaveState() {
  if (!S.activeProject || !S.activeProject.id) return;
  if (saveStateTimeout) clearTimeout(saveStateTimeout);
  saveStateTimeout = setTimeout(() => {
    persistProjectState();
  }, 1000);
}
document.addEventListener('input', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    debouncedSaveState();
  }
});
document.addEventListener('change', (e) => {
  debouncedSaveState();
});
function deleteProject(id, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (typeof hasAdminAccess === 'function' && !hasAdminAccess()) {
    toast('Permission Denied: Only Administrators can delete projects.', 'error');
    return;
  }
  const proj = S.projects.find(p => p.id === id);
  if (!proj) return;
  customConfirm(
    `Permanently delete "${proj.title}" (${proj.district} District)? This action cannot be undone.`,
    async () => {
      try {
        toast("Deleting project from server...", "info");
        await apiFetch(`/projects/${id}`, {
          method: 'DELETE'
        });
        const wasActive = S.activeProject && S.activeProject.id === id;
        S.projects = S.projects.filter(p => p.id !== id);
        if (wasActive) {
          clearActiveProject();
        }
        renderProjects();
        renderDashboard();
        updateProjectBadgeCount();
        renderDistrictLegends();
        toast("Project deleted successfully!", "success");
      } catch (err) {
        toast("Failed to delete project: " + err.message, "error");
      }
    }
  );
}
