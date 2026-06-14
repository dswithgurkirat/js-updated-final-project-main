/* ══════════════════════════════════════
   AUTH
 ══════════════════════════════════════ */
function switchAuthMode(mode) {
  const facultyTab = document.getElementById('tab-btn-faculty');
  const authorityTab = document.getElementById('tab-btn-authority');
  const sdlcTab = document.getElementById('tab-btn-sdlc');
  const facultyForm = document.getElementById('auth-form-faculty');
  const authorityForm = document.getElementById('auth-form-authority');
  const sdlcForm = document.getElementById('auth-form-sdlc');
  if (facultyTab && authorityTab && facultyForm && authorityForm) {
    facultyTab.classList.toggle('active', mode === 'faculty');
    authorityTab.classList.toggle('active', mode === 'authority');
    if (sdlcTab) sdlcTab.classList.toggle('active', mode === 'sdlc');
    facultyForm.classList.toggle('active', mode === 'faculty');
    authorityForm.classList.toggle('active', mode === 'authority');
    if (sdlcForm) {
      sdlcForm.style.display = mode === 'sdlc' ? 'flex' : 'none';
      sdlcForm.classList.toggle('active', mode === 'sdlc');
    }
  }
  if (window.initLucide) initLucide();
}
function toggleSignUp(show) {
  const tabs = document.querySelector('.auth-tabs');
  const facultyForm = document.getElementById('auth-form-faculty');
  const authorityForm = document.getElementById('auth-form-authority');
  const signupForm = document.getElementById('auth-form-signup');
  if (show) {
    if (tabs) tabs.style.display = 'none';
    if (facultyForm) facultyForm.classList.remove('active');
    if (authorityForm) authorityForm.classList.remove('active');
    if (signupForm) {
      signupForm.style.display = 'flex';
      signupForm.classList.add('active');
    }
  } else {
    if (tabs) tabs.style.display = 'flex';
    if (signupForm) {
      signupForm.style.display = 'none';
      signupForm.classList.remove('active');
    }
    switchAuthMode('faculty');
  }
}
function fillDemoLogin(username) {
  const emailEl = document.getElementById('login-email');
  const passEl = document.getElementById('login-pass');
  if (emailEl && username) emailEl.value = username;
  if (passEl) passEl.value = 'password123';
}
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  const distEl = document.getElementById('login-district');
  const district = distEl ? distEl.value : 'ALL';
  const err = document.getElementById('login-error');
  if (!email || !pass) { err.style.display='block'; err.textContent='Please fill all fields.'; return; }
  err.style.display='none';
  try {
      const data = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: email, password: pass })
      });
      if (data.token) {
          localStorage.setItem('dsr_token', data.token);
      } else {
          localStorage.removeItem('dsr_token');
      }
      const backendRole = data.role || 'ROLE_OFFICER';
      S.backendRole = backendRole;
      S.permissions = data.permissions || [];
      S.scope = data.scope || {};
      S.accessLabel = data.accessLabel || '';
      let uiRole = 'user';
      if (backendRole.includes('ADMIN')) {
          uiRole = 'admin';
      } else if (backendRole.includes('SDLC')) {
          uiRole = 'sdlc';
      } else if (backendRole.includes('DISTRICT_OWNER')) {
          uiRole = 'authority';
      } else if (backendRole.includes('REVIEWER') || backendRole.includes('STATE_ADMIN') || backendRole.includes('IIT_ROPAR') || backendRole.includes('GIS')) {
          uiRole = 'reviewer';
      }
      S.user = {
          name: data.fullName || data.username,
          email: data.email || email,
          role: uiRole,
          backendRole,
          district: data.scope?.district || district,
          scope: data.scope || {},
          accessLabel: data.accessLabel || ''
      };
      S.role = uiRole;
      if (typeof currentDistrictFilter !== 'undefined') currentDistrictFilter = 'ALL';
  await showAppScreen();
      setTimeout(() => {
        try {
          const filterDropdown = document.getElementById('dash-district-filter');
          if (filterDropdown) filterDropdown.value = 'ALL';
          if (typeof filterDashboardByDistrict === 'function') filterDashboardByDistrict('ALL');
          if (typeof updateRolePermissionUI === 'function') updateRolePermissionUI();
        } catch (uiError) {
          console.warn('Post-login UI refresh skipped:', uiError);
        }
      }, 100);
  } catch (error) {
      err.style.display='block'; 
      err.textContent = error.message || 'Login failed. Please check credentials.';
  }
}
function doAuthorityVerify() {
  const authorityInput = document.getElementById('auth-nic-id') || document.getElementById('auth-authority-id');
  const authorityId = authorityInput ? authorityInput.value.trim() : '';
  const pin = document.getElementById('auth-security-pin').value;
  const err = document.getElementById('auth-error');
  if (!authorityId || !pin) {
    err.style.display = 'block';
    err.textContent = 'Please enter both Authority ID and Security PIN.';
    return;
  }
  err.style.display = 'none';
  S.user = { name: 'Dr. Suresh Verma', email: 'dmo@punjab.gov.in', role: 'authority' };
  S.role = 'authority';
  showAuthorityScreen();
}
function doAuthorityQuickLogin() {
  S.user = { name:'Dr. Suresh Verma', email:'dmo@punjab.gov.in', role:'authority' };
  S.role = 'authority';
  showAuthorityScreen();
}
function togglePinReveal() {
  const pinInput = document.getElementById('auth-security-pin');
  if (pinInput) {
    pinInput.type = pinInput.type === 'password' ? 'text' : 'password';
  }
}
async function doSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-pass').value;
  const err = document.getElementById('signup-error');
  const ok = document.getElementById('signup-success');
  if (!name||!email||!pass) { err.style.display='block'; err.textContent='Please fill all required fields.'; return; }
  if (pass.length<10 || !/[A-Za-z]/.test(pass) || !/[0-9]/.test(pass)) {
    err.style.display='block';
    err.textContent='Password must be at least 10 characters and include letters and numbers.';
    return;
  }
  err.style.display='none'; 
  try {
      await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ fullName: name, username: email, email: email, password: pass })
      });
      ok.style.display='block'; 
      ok.textContent='Account created! You can now log in.';
      setTimeout(()=>switchAuthMode('faculty'),1500);
  } catch (error) {
      err.style.display='block'; 
      err.textContent = error.message || 'Signup failed.';
  }
}
function doLogout() {
  try {
    apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
  } catch (e) {}
  localStorage.removeItem('dsr_token');
  if (typeof clearActiveProject === 'function') {
    clearActiveProject();
  }
  if (typeof resetSState === 'function') {
    resetSState();
  } else {
    S.user = null;
    S.role = 'user';
    S.activeProject = null;
    S.projects = [];
  }
  viewHistory = [];
  currentViewId = 'dashboard';
  const backBtn = document.getElementById('tb-back-btn');
  if (backBtn) backBtn.style.display = 'none';
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-auth').classList.add('active');
  switchAuthMode('faculty');
  if (typeof applyTheme === 'function') {
    applyTheme('light', false);
  }
  if (typeof updateDarkModeIcon === 'function') {
    updateDarkModeIcon();
  }
}
async function doSdlcLogin() {
  const email = document.getElementById('sdlc-email').value.trim();
  const pass = document.getElementById('sdlc-pass').value;
  const err = document.getElementById('sdlc-error');
  if (!email || !pass) { err.style.display='block'; err.textContent='Please fill all fields.'; return; }
  err.style.display='none';
  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: email, password: pass })
    });
    if (data.token) {
      localStorage.setItem('dsr_token', data.token);
    } else {
      localStorage.removeItem('dsr_token');
    }
    S.backendRole = data.role || 'ROLE_SDLC';
    S.permissions = data.permissions || [];
    S.scope = data.scope || {};
    S.accessLabel = data.accessLabel || '';
    S.user = {
      name: data.fullName || data.username || 'SDLC Committee',
      email: data.email || email,
      role: 'sdlc',
      backendRole: S.backendRole,
      district: data.scope?.district || 'Jalandhar',
      scope: data.scope || {},
      accessLabel: data.accessLabel || ''
    };
    S.role = 'sdlc';
    await showAppScreen();
  } catch (error) {
    err.style.display='block';
    err.textContent = error.message || 'Invalid SDLC credentials.';
  }
}
async function showAppScreen() {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-app').classList.add('active');
  if (typeof initThemeFromStorage === 'function') {
    initThemeFromStorage();
  }
  if (typeof updateDarkModeIcon === 'function') updateDarkModeIcon();
  const init = S.user.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
  const sidebarAvatar = document.getElementById('sb-avatar');
  if (sidebarAvatar) sidebarAvatar.textContent = init;
  const sidebarName = document.getElementById('sb-uname');
  if (sidebarName) sidebarName.textContent = S.user.name;
  const isSdlc = S.role === 'sdlc';
  const roleLabel = (typeof getRoleRule === 'function') ? getRoleRule().label : (S.role==='admin'?'System Admin':S.role==='reviewer'?'Section Reviewer':isSdlc?'SDLC Committee':'Report Coordinator');
  const sidebarRole = document.getElementById('sb-urole');
  if (sidebarRole) sidebarRole.textContent = S.accessLabel || roleLabel;
  const navAuditLogs = document.getElementById('nav-audit-logs');
  if (navAuditLogs) {
    navAuditLogs.style.display = 'block';
  }
  const tbNavAuditLogs = document.getElementById('tb-nav-audit-logs');
  if (tbNavAuditLogs) {
    tbNavAuditLogs.style.display = 'inline-flex';
  }
  const dashMenuAuditLogs = document.getElementById('dash-menu-audit-logs');
  if (dashMenuAuditLogs) {
    dashMenuAuditLogs.style.display = 'block';
  }
  const projectsMenuAuditLogs = document.getElementById('projects-menu-audit-logs');
  if (projectsMenuAuditLogs) {
    projectsMenuAuditLogs.style.display = 'block';
  }
  const navUsers = document.getElementById('nav-users');
  if (navUsers) {
    navUsers.style.display = S.role === 'admin' ? 'block' : 'none';
  }
  const tbNavUsers = document.getElementById('tb-nav-users');
  if (tbNavUsers) {
    tbNavUsers.style.display = S.role === 'admin' ? 'block' : 'none';
  }
  ['dash-menu-users', 'projects-menu-users'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = S.role === 'admin' ? 'block' : 'none';
  });
  const sdlcNav = document.getElementById('sdlc-nav');
  if (sdlcNav) sdlcNav.style.display = isSdlc ? 'block' : 'none';
  ['report-nav', 'annexure-nav', 'tables-nav', 'finalize-nav'].forEach(navId => {
    const el = document.getElementById(navId);
    if (el) {
      if (isSdlc) el.style.display = 'none';
    }
  });
  await initApp();
  if (typeof repairMainContentStructure === 'function') repairMainContentStructure();
  let targetView = window.location.hash ? window.location.hash.slice(1).trim() : currentViewId;
  if (isSdlc) {
    targetView = 'sdlc-portal';
  } else if (targetView === 'sdlc-portal') {
    targetView = 'dashboard';
  }
  if (typeof hasModuleAccess === 'function' && !hasModuleAccess(targetView)) {
    targetView = typeof getFirstAllowedView === 'function' ? getFirstAllowedView() : 'dashboard';
  }
  if (targetView && document.getElementById('view-' + targetView)) {
    showView(targetView, null, false);
  } else {
    showView(currentViewId, null, false);
  }
  if (window.initLucide) initLucide();
  if (typeof updateRolePermissionUI === 'function') updateRolePermissionUI();
  if (typeof preloadPortalVendorsAfterLogin === 'function') preloadPortalVendorsAfterLogin();
}
function showAuthorityScreen() {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-authority').classList.add('active');
  document.getElementById('auth-user-label').textContent = S.user.name + ' · Authority';
  renderAuthorityReports();
  if (typeof initThemeFromStorage === 'function') {
    initThemeFromStorage();
  }
  if (typeof updateDarkModeIcon === 'function') updateDarkModeIcon();
  if (window.initLucide) initLucide();
}
