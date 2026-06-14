/* ══════════════════════════════════════
   ENTRY POINT / BOOTSTRAP
══════════════════════════════════════ */
const PORTAL_FONT_MIN = 85;
const PORTAL_FONT_MAX = 125;
const PORTAL_FONT_STEP = 5;
let currentFontScale = Number(localStorage.getItem('portalFontScale') || 100);
const PORTAL_I18N = {
  en: {
    languageApplied: 'English language enabled.',
    brandBilingual: 'Government of Punjab - IIT Ropar Research Cell - EMGSM 2020',
    brandTitle: 'District Survey Report Automation Portal',
    brandSubtitle: 'DSR Automation for Sand Mining',
    screenReader: 'Screen Reader',
    skipContent: 'Skip to Content',
    navHome: 'Home',
    navAbout: 'About DSR',
    navProjects: 'Projects',
    navNewProject: '+ New Project',
    navWorkflow: 'Workflow',
    navAudit: 'Audit Logs',
    navDistricts: 'Districts',
    navContact: 'Contact',
    searchPlaceholder: 'Search portal...',
    noticeLabel: 'Notice',
    noticeText: 'DSR submissions for Punjab districts 2025-26 are now open - Deadline: 30 September 2026 - New: Digital E-Sign integration live for all districts - EMGSM 2020 compliance mandatory',
    langEnglish: 'English',
    langHindi: 'Hindi',
    langPunjabi: 'Punjabi'
  },
  hi: {
    languageApplied: 'हिंदी भाषा सक्षम है।',
    brandBilingual: 'पंजाब सरकार - आईआईटी रोपड़ रिसर्च सेल - EMGSM 2020',
    brandTitle: 'जिला सर्वेक्षण रिपोर्ट ऑटोमेशन पोर्टल',
    brandSubtitle: 'रेत खनन के लिए DSR ऑटोमेशन',
    screenReader: 'स्क्रीन रीडर',
    skipContent: 'मुख्य सामग्री पर जाएं',
    navHome: 'होम',
    navAbout: 'DSR के बारे में',
    navProjects: 'परियोजनाएं',
    navNewProject: '+ नई परियोजना',
    navWorkflow: 'वर्कफ्लो',
    navAudit: 'ऑडिट लॉग',
    navDistricts: 'जिले',
    navContact: 'संपर्क',
    searchPlaceholder: 'पोर्टल खोजें...',
    noticeLabel: 'सूचना',
    noticeText: 'पंजाब जिलों के लिए DSR जमा करना 2025-26 के लिए खुला है - अंतिम तिथि: 30 सितंबर 2026 - नया: सभी जिलों के लिए डिजिटल ई-साइन लाइव - EMGSM 2020 अनुपालन अनिवार्य',
    langEnglish: 'अंग्रेजी',
    langHindi: 'हिंदी',
    langPunjabi: 'पंजाबी'
  },
  pa: {
    languageApplied: 'ਪੰਜਾਬੀ ਭਾਸ਼ਾ ਚਾਲੂ ਹੈ।',
    brandBilingual: 'ਪੰਜਾਬ ਸਰਕਾਰ - ਆਈਆਈਟੀ ਰੋਪੜ ਰਿਸਰਚ ਸੈੱਲ - EMGSM 2020',
    brandTitle: 'ਜ਼ਿਲ੍ਹਾ ਸਰਵੇਖਣ ਰਿਪੋਰਟ ਆਟੋਮੇਸ਼ਨ ਪੋਰਟਲ',
    brandSubtitle: 'ਰੇਤ ਖਣਨ ਲਈ DSR ਆਟੋਮੇਸ਼ਨ',
    screenReader: 'ਸਕ੍ਰੀਨ ਰੀਡਰ',
    skipContent: 'ਮੁੱਖ ਸਮੱਗਰੀ ਤੇ ਜਾਓ',
    navHome: 'ਹੋਮ',
    navAbout: 'DSR ਬਾਰੇ',
    navProjects: 'ਪ੍ਰੋਜੈਕਟ',
    navNewProject: '+ ਨਵਾਂ ਪ੍ਰੋਜੈਕਟ',
    navWorkflow: 'ਵਰਕਫਲੋ',
    navAudit: 'ਆਡਿਟ ਲਾਗ',
    navDistricts: 'ਜ਼ਿਲ੍ਹੇ',
    navContact: 'ਸੰਪਰਕ',
    searchPlaceholder: 'ਪੋਰਟਲ ਖੋਜੋ...',
    noticeLabel: 'ਸੂਚਨਾ',
    noticeText: 'ਪੰਜਾਬ ਦੇ ਜ਼ਿਲ੍ਹਿਆਂ ਲਈ DSR ਜਮ੍ਹਾਂ 2025-26 ਲਈ ਖੁੱਲ੍ਹੇ ਹਨ - ਆਖਰੀ ਤਾਰੀਖ: 30 ਸਤੰਬਰ 2026 - ਨਵਾਂ: ਸਾਰੇ ਜ਼ਿਲ੍ਹਿਆਂ ਲਈ ਡਿਜ਼ਿਟਲ ਈ-ਸਾਈਨ ਲਾਈਵ - EMGSM 2020 ਦੀ ਪਾਲਣਾ ਲਾਜ਼ਮੀ',
    langEnglish: 'ਅੰਗਰੇਜ਼ੀ',
    langHindi: 'ਹਿੰਦੀ',
    langPunjabi: 'ਪੰਜਾਬੀ'
  }
};
let currentPortalLanguage = localStorage.getItem('portalLanguage') || 'en';
function clampPortalFontScale(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(PORTAL_FONT_MAX, Math.max(PORTAL_FONT_MIN, parsed));
}
function refreshFontControls() {
  document.querySelectorAll('.dash-font-btn').forEach((btn) => {
    const label = (btn.textContent || '').trim();
    const isActive = (label === 'A' && currentFontScale === 100)
      || (label === 'A-' && currentFontScale < 100)
      || (label === 'A+' && currentFontScale > 100);
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}
function applyPortalFontScale() {
  currentFontScale = clampPortalFontScale(currentFontScale);
  const scale = currentFontScale / 100;
  document.documentElement.style.fontSize = `${scale * 15}px`;
  document.documentElement.style.setProperty('--portal-font-scale', String(scale));
  if (document.body) {
    document.body.style.zoom = String(scale);
    document.body.classList.toggle('portal-font-custom', currentFontScale !== 100);
  }
  localStorage.setItem('portalFontScale', String(currentFontScale));
  refreshFontControls();
}
window.changeFontSize = function(delta) {
  currentFontScale = delta === 0 ? 100 : currentFontScale + (delta * PORTAL_FONT_STEP);
  applyPortalFontScale();
};
function refreshLanguageControls(lang) {
  const labels = PORTAL_I18N[lang] || PORTAL_I18N.en;
  const buttonText = {
    en: labels.langEnglish,
    hi: labels.langHindi,
    pa: labels.langPunjabi
  };
  document.querySelectorAll('.dash-lang-btn').forEach((btn) => {
    const btnLang = btn.dataset.lang || 'en';
    btn.textContent = buttonText[btnLang] || btnLang.toUpperCase();
    const isActive = btnLang === lang;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}
window.applyPortalLanguage = function(lang, showToast = true) {
  const nextLang = PORTAL_I18N[lang] ? lang : 'en';
  const labels = PORTAL_I18N[nextLang];
  currentPortalLanguage = nextLang;
  localStorage.setItem('portalLanguage', nextLang);
  document.documentElement.lang = nextLang === 'pa' ? 'pa-IN' : nextLang === 'hi' ? 'hi-IN' : 'en-IN';
  document.documentElement.dataset.portalLanguage = nextLang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key && labels[key]) el.textContent = labels[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (key && labels[key]) {
      el.setAttribute('placeholder', labels[key]);
      el.setAttribute('aria-label', labels[key]);
    }
  });
  refreshLanguageControls(nextLang);
  if (showToast && typeof dashPortalToast === 'function') {
    dashPortalToast(labels.languageApplied, 'success');
  }
};
window.addEventListener('DOMContentLoaded',()=>{
  applyPortalFontScale();
  applyPortalLanguage(currentPortalLanguage, false);
  if (typeof repairMainContentStructure === 'function') {
    repairMainContentStructure();
    setTimeout(repairMainContentStructure, 0);
  }
  const workflowView = document.getElementById('view-workflow');
  if (workflowView) {
    workflowView.addEventListener('click', renderWorkflowChecklist, {once:true});
  }
  if (window.initLucide) initLucide();
  document.body.addEventListener('focusout', function(e) {
    if (e.target.tagName === 'TD' && (e.target.contentEditable === 'true' || e.target.hasAttribute('contenteditable'))) {
      const text = e.target.innerText.trim();
      if (text === '') {
        e.target.innerText = 'NUL';
        const inputEvent = new Event('input', { bubbles: true });
        e.target.dispatchEvent(inputEvent);
      }
    }
  });
});
function enforceReviewerReadOnly() {
    if (typeof enforceActiveViewHierarchy === 'function') {
        enforceActiveViewHierarchy();
    }
}
window.reviewerNotes = {};
window.reviewerNotesMinimized = localStorage.getItem('reviewerNotesMinimized') !== '0';
function applyReviewerNotesMinimizedState() {
    const box = document.getElementById('reviewer-floating-notes');
    const btn = document.getElementById('reviewer-notes-minimize-btn');
    if (!box) return;
    box.classList.toggle('is-minimized', !!window.reviewerNotesMinimized);
    if (btn) {
        btn.title = window.reviewerNotesMinimized ? 'Expand reviewer notes' : 'Minimize reviewer notes';
        btn.setAttribute('aria-label', btn.title);
        btn.innerHTML = window.reviewerNotesMinimized
            ? '<i data-lucide="maximize-2" style="width:14px; height:14px;"></i>'
            : '<i data-lucide="minus" style="width:14px; height:14px;"></i>';
    }
    if (window.initLucide) initLucide();
}
function toggleReviewerNotesMinimized() {
    window.reviewerNotesMinimized = !window.reviewerNotesMinimized;
    localStorage.setItem('reviewerNotesMinimized', window.reviewerNotesMinimized ? '1' : '0');
    applyReviewerNotesMinimizedState();
}
window.toggleReviewerNotesMinimized = toggleReviewerNotesMinimized;
function loadReviewerNoteForView(viewId, viewTitle) {
    const notesBox = document.getElementById('reviewer-floating-notes');
    if (typeof S === 'undefined' || !hasReviewAccess() || !S.activeProject) {
        if (notesBox) notesBox.style.display = 'none';
        return;
    }
    if (['dashboard', 'workflow', 'users', 'history'].includes(viewId)) {
        if (notesBox) notesBox.style.display = 'none';
        return;
    }
    if (notesBox) notesBox.style.display = 'flex';
    applyReviewerNotesMinimizedState();
    document.getElementById('reviewer-notes-section-title').textContent = viewTitle || viewId;
    document.getElementById('reviewer-section-note').value = window.reviewerNotes[viewId] || '';
    document.getElementById('reviewer-section-note').dataset.viewId = viewId;
    if (window.lucide) window.lucide.createIcons();
}
function saveReviewerNote() {
    const el = document.getElementById('reviewer-section-note');
    const viewId = el.dataset.viewId;
    if (viewId) {
        window.reviewerNotes[viewId] = el.value;
    }
}
function openReviewModal() {
    let aggregated = '';
    for (let [viewId, note] of Object.entries(window.reviewerNotes)) {
        if (note.trim()) {
            aggregated += `[${viewId.toUpperCase()}]\n${note.trim()}\n\n`;
        }
    }
    document.getElementById('review-aggregated-notes').value = aggregated.trim();
    document.getElementById('modal-review').classList.add('open');
}
async function submitReviewReturn() {
    const comments = document.getElementById('review-aggregated-notes').value.trim();
    if (!comments) { toast('Please enter review comments', 'error'); return; }
    if (!S.activeProject) { toast('No active project', 'error'); return; }
    try {
        await apiSubmitWorkflowAction(S.activeProject.id, 'RETURN', comments);
        toast('Report returned to Data Entry', 'success');
        window.reviewerNotes = {};
        if (S.activeProject) {
            localStorage.removeItem(`reviewerNotes_${S.activeProject.id}`);
        }
        const noteArea = document.getElementById('reviewer-section-note');
        if (noteArea) noteArea.value = '';
        closeModal('modal-review');
        if (typeof renderProjects === 'function') renderProjects();
        showView('dashboard', null);
    } catch (e) {
        toast('Error returning report: ' + e.message, 'error');
    }
}
async function submitReviewApprove() {
    if (!S.activeProject) return;
    try {
        await apiSubmitWorkflowAction(S.activeProject.id, 'APPROVE', 'Section review approved');
        toast('Sections Approved!', 'success');
        if (typeof renderProjects === 'function') renderProjects();
        showView('dashboard', null);
    } catch (e) {
        toast('Error approving report: ' + e.message, 'error');
    }
}
async function checkReviewStatus(projectId) {
    if (S.role !== 'user') return; // Only show alert to data entry
    try {
        const history = await apiFetchReportHistory(projectId);
        if (history && history.length > 0) {
            const latest = history[0];
            if (latest.action === 'RETURN') {
                const banner = document.getElementById('dash-review-banner');
                if (banner) {
                    banner.innerHTML = `
                        <div style="background:var(--amber-lt); border:1px solid var(--amber); border-radius:var(--r-md); padding:16px; display:flex; align-items:start; gap:12px;">
                            <i data-lucide="alert-circle" style="color:var(--amber); width:20px; height:20px; flex-shrink:0; margin-top:2px;"></i>
                            <div>
                                <div style="font-weight:700; color:var(--text); font-size:14px; margin-bottom:4px;">Report Returned for Review</div>
                                <div style="font-size:13px; color:var(--text-mid);">${latest.remarks || 'No comments provided.'}</div>
                            </div>
                        </div>
                    `;
                    banner.style.display = 'block';
                    if (window.initLucide) initLucide();
                }
                const notifDot = document.getElementById('tb-notif-dot');
                if (notifDot) notifDot.style.display = 'block';
                if (latest.remarks) {
                    window.reviewerNotes = {};
                    const sections = latest.remarks.split('[');
                    for (let sec of sections) {
                        if (!sec.trim()) continue;
                        const endIdx = sec.indexOf(']');
                        if (endIdx !== -1) {
                            const key = sec.substring(0, endIdx).toLowerCase().trim();
                            const val = sec.substring(endIdx + 1).trim();
                            if (val) window.reviewerNotes[key] = val;
                        }
                    }
                    if (window.renderReviewerNotes) renderReviewerNotes();
                }
            }
        }
    } catch (e) {
        console.error('Error fetching review status:', e);
    }
}
async function renderHistoryTable() {
    if (!S.activeProject) return;
    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading history...</td></tr>';
    try {
        const history = await apiFetchReportHistory(S.activeProject.id);
        if (!history || history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No history available</td></tr>';
            return;
        }
        let html = '';
        history.forEach(log => {
            const dateStr = new Date(log.performedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
            let badgeCls = 'badge-gray';
            if (log.action === 'APPROVE') badgeCls = 'badge-green';
            if (log.action === 'RETURN' || log.action === 'REJECT') badgeCls = 'badge-amber';
            if (log.action === 'SUBMIT') badgeCls = 'badge-blue';
            if (log.action === 'WARNING_IGNORED' || log.action === 'WARNING_IGNORED_SAME_CONTENT') badgeCls = 'badge-red';
            html += `<tr>
                <td>${dateStr}</td>
                <td><span class="badge ${badgeCls}">${log.action}</span></td>
                <td>User ID: ${log.performedBy}</td>
                <td>${log.remarks || '-'}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red;">Failed to load history</td></tr>`;
    }
}
function toggleNotificationDropdown() {
  const dd = document.getElementById('tb-notif-dropdown');
  if (dd) {
    dd.classList.toggle('show');
  }
}
function updateNotificationUI(returnedReports) {
  const dot = document.getElementById('tb-notif-dot');
  const list = document.getElementById('tb-notif-list');
  if (!dot || !list) return;
  if (returnedReports && returnedReports.length > 0) {
    dot.style.display = 'block';
    let html = '';
    returnedReports.forEach(r => {
      html += `<div style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;" onclick="openProjectAndWorkflow(${r.projectId})">
        <div style="font-size: 13px; font-weight: 600; color: #b91c1c;">Project Returned</div>
        <div style="font-size: 12px; color: #666; margin-top: 4px;">Project ID: ${r.projectId} needs revision.</div>
      </div>`;
    });
    list.innerHTML = html;
  } else {
    dot.style.display = 'none';
    list.innerHTML = '<div style="padding: 8px; color: #666; font-size: 13px; text-align: center;">No new notifications</div>';
  }
}
function openProjectAndWorkflow(projectId) {
  toggleNotificationDropdown();
  const proj = S.projects.find(p => p.id === projectId);
  if (proj) {
    S.activeProject = proj;
    showView('workflow', null);
  }
}
async function syncNotificationsAndReviewStatus() {
  if (typeof S === 'undefined') return;
  const banner = document.getElementById('dash-review-banner');
  const dot = document.getElementById('tb-notif-dot');
  const list = document.getElementById('tb-notif-list');
  if (banner) {
    banner.style.display = 'none';
    banner.innerHTML = '';
  }
  if (dot) dot.style.display = 'none';
  if (list) list.innerHTML = '<div style="padding: 8px; color: var(--text-soft); font-size: 13px; text-align: center;">Loading notifications...</div>';
  let bannerHtml = '';
  let notifHtml = '';
  let hasUnresolvedReturn = false;
  if (!S.projects) return;
  for (let p of S.projects) {
    try {
      const history = await apiFetchReportHistory(p.id);
      if (history && history.length > 0) {
        const latest = history[0];
        if (latest.action === 'RETURN' || latest.action === 'REJECT') {
          hasUnresolvedReturn = true;
          if (banner) {
            bannerHtml += `
              <div style="background:var(--amber-lt); border:1.5px solid var(--amber); border-radius:var(--r-md); padding:16px; margin-bottom:12px; display:flex; flex-direction:column; gap:10px; box-shadow: 0 4px 12px rgba(245,158,11,0.15);">
                <div style="display:flex; align-items:start; gap:12px;">
                  <i data-lucide="alert-circle" style="color:var(--amber); width:20px; height:20px; flex-shrink:0; margin-top:2px;"></i>
                  <div style="flex:1;">
                    <div style="font-weight:700; color:var(--text); font-size:14px; margin-bottom:2px;">
                      Project "${p.title}" (${p.district}) Returned for Revision
                    </div>
                    <div style="font-size:11px; color:var(--text-faint); margin-bottom:6px;">
                      Returned by Reviewer · ${new Date(latest.performedAt).toLocaleString()}
                    </div>
                    <div style="font-size:13px; color:var(--text-mid); background:var(--card); border: 1px solid var(--border-2); padding: 10px; border-radius: 6px; font-style: italic;">
                      ${latest.remarks || 'No comments provided.'}
                    </div>
                  </div>
                </div>
                <!-- Reply Section -->
                <div style="display:flex; flex-direction:column; gap:8px; margin-top:4px; padding-left:32px;">
                  <textarea id="reply-text-${p.id}" placeholder="Type your reply to the reviewer here..." style="width:100%; min-height:60px; padding:10px; border-radius:6px; border:1px solid var(--border-2); background:var(--bg); color:var(--text); font-size:12.5px; resize:vertical; outline:none;" oninput="this.style.borderColor='var(--amber)'" onblur="this.style.borderColor='var(--border-2)'"></textarea>
                  <div style="display:flex; justify-content:flex-end;">
                    <button class="btn btn-navy btn-sm" onclick="submitDeoReply(${p.id})" style="padding: 6px 16px; font-size: 12px; background:var(--primary); font-weight:700; border-radius:6px;">Submit Reply & Remarks</button>
                  </div>
                </div>
              </div>
            `;
          }
          notifHtml += `
            <div style="padding: 10px; border-bottom: 1px solid var(--border); cursor: pointer;" onclick="openProjectAndWorkflow(${p.id})">
              <div style="font-size: 13px; font-weight: 600; color: #ef4444; display:flex; align-items:center; gap:6px;">
                <span style="display:inline-block; width:6px; height:6px; background:#ef4444; border-radius:50%;"></span>
                Project Returned
              </div>
              <div style="font-size: 12px; color: var(--text); font-weight:500; margin-top: 4px;">Project "${p.title}" needs revision.</div>
              <div style="font-size: 11px; color: var(--text-soft); margin-top: 2px; font-style:italic; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">"${latest.remarks || ''}"</div>
            </div>
          `;
        }
      }
    } catch (e) {
      console.error('Error syncing project status:', p.id, e);
    }
  }
  if (hasUnresolvedReturn) {
    if (dot) dot.style.display = 'block';
    if (list && notifHtml) list.innerHTML = notifHtml;
    if (banner && bannerHtml) {
      banner.innerHTML = bannerHtml;
      banner.style.display = 'block';
      banner.style.border = 'none';
      banner.style.background = 'transparent';
      banner.style.padding = '0';
      if (window.initLucide) initLucide();
    }
  } else if (list) {
    const projects = Array.isArray(S.projects) ? S.projects.slice(0, 5) : [];
    if (projects.length) {
      if (dot) dot.style.display = 'block';
      list.innerHTML = projects.map(p => `
        <div style="padding: 10px; border-bottom: 1px solid var(--border); cursor: pointer;" onclick="openProjectAndWorkflow(${p.id})">
          <div style="font-size: 13px; font-weight: 700; color: var(--text); display:flex; align-items:center; gap:6px;">
            <span style="display:inline-block; width:6px; height:6px; background:${Number(p.progress) >= 100 ? 'var(--green)' : 'var(--saffron)'}; border-radius:50%;"></span>
            ${p.title || 'DSR Project'}
          </div>
          <div style="font-size: 12px; color: var(--text-soft); margin-top: 4px;">${p.district || 'Punjab'} · ${p.status || 'In Progress'} · ${Number(p.progress) || 0}% complete</div>
        </div>
      `).join('');
    } else {
      if (dot) dot.style.display = 'none';
      list.innerHTML = '<div style="padding: 10px; color: var(--text-soft); font-size: 13px; text-align: center;">No projects yet. Notifications will appear after project activity.</div>';
    }
  }
}
async function submitDeoReply(projectId) {
  const textEl = document.getElementById(`reply-text-${projectId}`);
  const remarks = textEl ? textEl.value.trim() : '';
  if (!remarks) { toast('Please enter a reply message', 'error'); return; }
  try {
    await apiFetch(`/reports/${projectId}/workflow`, {
      method: 'POST',
      body: JSON.stringify({ action: 'DEO_REPLY', remarks: remarks })
    });
    toast('Reply submitted successfully!', 'success');
    if (textEl) textEl.value = '';
    await syncNotificationsAndReviewStatus();
    if (typeof renderProjects === 'function') renderProjects();
    if (typeof renderHistoryTable === 'function' && S.activeProject && S.activeProject.id === projectId) {
      renderHistoryTable();
    }
  } catch (e) {
    toast('Failed to send reply: ' + e.message, 'error');
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const transitionLinks = document.querySelectorAll('a[href$=".html"], a.nav-link-item, a.btn-premium-cta');
  transitionLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const targetUrl = this.getAttribute('href');
      if (targetUrl && !targetUrl.startsWith('#') && !targetUrl.startsWith('javascript:')) {
        e.preventDefault();
        if (targetUrl.includes('index.html') || targetUrl === '/' || targetUrl === '') {
          document.body.classList.add('slide-to-right');
        } else {
          document.body.classList.add('slide-to-left');
        }
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 180);
      }
    });
  });
});
