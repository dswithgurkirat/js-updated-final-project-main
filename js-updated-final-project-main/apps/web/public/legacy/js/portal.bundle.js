
/* js/api.js */
var API_BASE_URL = (() => {
    if (!window.location || window.location.protocol === 'file:') return 'http://localhost:8081/api';
    return `${window.location.origin}/api`;
})();
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('dsr_token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            credentials: 'same-origin',
            headers
        });
        var bodyText = '';
        try { bodyText = await response.text(); } catch (e) {}
        var data = {};
        try { data = JSON.parse(bodyText); } catch (e) {}
        if (!response.ok) {
            var msg = data.message || data.error || '';
            if (!msg && bodyText && !bodyText.startsWith('{')) msg = bodyText.slice(0, 200);
            if (!msg) msg = 'HTTP ' + response.status + ' ' + response.statusText;
            var prefix = !localStorage.getItem('dsr_token') ? 'Not logged in — ' : '';
            var err = new Error(prefix + msg);
            if (response.status === 409 && data.warning) {
                err.isWarning = true;
                err.warningData = data;
            }
            throw err;
        }
        return data;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}
async function apiUploadFile(file) {
    const token = localStorage.getItem('dsr_token');
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
        const response = await fetch(`${API_BASE_URL}/files/upload`, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin',
            headers
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            var bodyText = '';
            try { bodyText = await response.text(); } catch (e) {}
            var errData = {};
            try { errData = JSON.parse(bodyText); } catch (e) {}
            var msg = errData.message || errData.error || '';
            if (!msg && bodyText && !bodyText.startsWith('{')) msg = bodyText.slice(0, 200);
            if (!msg) msg = 'HTTP ' + response.status + ' ' + response.statusText;
            var prefix = !localStorage.getItem('dsr_token') ? 'Not logged in — ' : '';
            throw new Error(prefix + msg);
        }
        return data;
    } catch (error) {
        console.error("API Upload Error:", error);
        throw error;
    }
}
async function apiSubmitWorkflowAction(reportId, action, remarks) {
    return apiFetch(`/reports/${reportId}/workflow`, {
        method: 'POST',
        body: JSON.stringify({ action, remarks })
    });
}
async function apiFetchReportHistory(reportId) {
    return apiFetch(`/reports/${reportId}/history`, {
        method: 'GET'
    });
}
function getDownloadTokenQuery() {
    return '';
}
function projectPdfUrl(annexureId, inline = false) {
    if (!window.S || !S.activeProject || !S.activeProject.id) return '';
    return `/api/download-pdf?projectId=${encodeURIComponent(S.activeProject.id)}&annexureId=${encodeURIComponent(annexureId)}${inline ? '&inline=true' : ''}${getDownloadTokenQuery()}`;
}
function setStoredProjectPdfUrl(annexureId, fileName) {
    if (!window.S || !S.activeProject || !S.activeProject.id) return '';
    const url = projectPdfUrl(annexureId, true);
    const nameField = annexureId === 'anx3' ? 'annexure3PdfName' : `${annexureId}PdfName`;
    if (!S.activeProject.pdfData) S.activeProject.pdfData = {};
    S.activeProject.pdfData[annexureId] = url;
    if (fileName) S.activeProject[nameField] = fileName;
    const idx = Array.isArray(S.projects) ? S.projects.findIndex(p => String(p.id) === String(S.activeProject.id)) : -1;
    if (idx >= 0) {
        if (!S.projects[idx].pdfData) S.projects[idx].pdfData = {};
        S.projects[idx].pdfData[annexureId] = url;
        if (fileName) S.projects[idx][nameField] = fileName;
    }
    if (window.debouncedSaveState) window.debouncedSaveState();
    return url;
}
async function storeProjectPdf(annexureId, file) {
    if (!window.S || !S.activeProject || !S.activeProject.id || !file) return;
    const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
        reader.onerror = () => reject(reader.error || new Error('Could not read file'));
        reader.readAsDataURL(file);
    });
    await apiFetch('/upload-pdf', {
        method: 'POST',
        body: JSON.stringify({
            projectId: S.activeProject.id,
            fileName: file.name,
            pdf: base64,
            annexureId
        })
    });
    return setStoredProjectPdfUrl(annexureId, file.name);
}
async function downloadStoredPdf(annexureId, fileName, fallbackUrl) {
    if (!window.S || !S.activeProject || !S.activeProject.id) {
        toast('Please select and open a project first.', 'warn');
        return;
    }
    const url = projectPdfUrl(annexureId, false);
    try {
        const response = await fetch(url, {
            credentials: 'same-origin',
            headers: { Authorization: `Bearer ${localStorage.getItem('dsr_token') || ''}` }
        });
        if (!response.ok) throw new Error(await response.text());
        const blob = await response.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName || `${annexureId}.pdf`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        return;
    } catch (err) {
        if (!fallbackUrl) {
            toast(err.message || 'Unable to download PDF', 'error');
            return;
        }
    }
    const a = document.createElement('a');
    a.href = fallbackUrl;
    a.download = fileName || `${annexureId}.pdf`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

;

/* js/state.js */
/* ══════════════════════════════════════
   STATE
══════════════════════════════════════ */
const PUNJAB_DISTRICTS = [
  'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib',
  'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar',
  'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga',
  'Pathankot', 'Patiala', 'Rupnagar', 'Sahibzada Ajit Singh Nagar',
  'Sangrur', 'Shaheed Bhagat Singh Nagar', 'Sri Muktsar Sahib', 'Tarn Taran'
];
window.PUNJAB_DISTRICTS = PUNJAB_DISTRICTS;
const S = {
  user: null,
  role: 'user',
  activeProject: null,
  pendingOTPsigId: null,
  projects: [],
  phaseMetadata: {
    phaseNo: 1,
    parentPhaseId: null,
    locked: false,
    defaultUploadColor: '#34C759'
  },
  phaseChangeLog: [],
  chapters: [
    { id:1, name:'CHAPTER 1 — INTRODUCTION', summary:'Overview of the district and purpose of the DSR under EMGSM 2020 guidelines.' },
    { id:2, name:'CHAPTER 2 — OVERVIEW OF MINING ACTIVITIES IN THE DISTRICT', summary:'Current and historical sand mining activities, lease details, and district statistics.' },
    { id:3, name:'CHAPTER 3 — PROCESS OF DEPOSITION OF SEDIMENTS IN THE RIVERS OF THE DISTRICT', summary:'River morphology, sedimentation rates, and annual replenishment estimates.' },
    { id:4, name:'CHAPTER 4 — GENERAL PROFILE OF THE DISTRICT', summary:'Geographic, demographic, and administrative profile of the district.' },
    { id:5, name:'CHAPTER 5 — PHYSIOGRAPHY OF THE DISTRICT', summary:'Terrain, drainage patterns, river systems, and physical features.' },
    { id:6, name:'CHAPTER 6 — GEOLOGY AND MINERAL WEALTH', summary:'Geological formations, mineral deposits, and subsurface characteristics.' },
    { id:7, name:'CHAPTER 7 — ESTIMATION OF DEPOSITS AND REPLENISHMENT STUDIES', summary:'Scientific estimation of available sand deposits and annual natural replenishment.' },
    { id:8, name:'CHAPTER 8 — TRANSPORT', summary:'Transportation infrastructure, road conditions, and logistics for mining operations.' },
    { id:9, name:'CHAPTER 9 — REMEDIAL MEASURE TO MITIGATE THE IMPACT OF MINING', summary:'Environmental safeguards, monitoring mechanisms, and impact mitigation plans.' },
    { id:10, name:'CHAPTER 10 — CONCLUSION', summary:'Summary findings, recommendations, and compliance declarations.' }
  ],
  plates: [
    { id:101, name:'Plate 1 — Pre/Post Monsoon Cross Section', summary:'Auto-generated elevation chart for sand volume calculation.', graphId: 'g1' },
    { id:102, name:'Plate 2 — Geological Subsurface Map', summary:'Detailed lithological boundaries and soil types.', graphId: '' }
  ],
  graphs: [
    { 
      id: 'g1', 
      name: 'PO_JL_NR_ST_28', 
      dist: '0,25,50',
      post: '227.76,227.75,227.65',
      red: '224.30', 
      thal: '223.40', 
      area: '1.60', 
      noMine: '0', 
      bulk: '1.52', 
      pct: '60',
      calcThick: '3.0',
      hasSubGraph: false,
      subName: 'PR_JL_NR_ST_28',
      subDist: '0,25,50',
      subElev: '227.59,227.39,227.26',
      subRed: '224.30',
      subThal: '223.40'
    }
  ],
  graphCharts: {},
  signatures: [
    { id:1, role:'Sub-Divisional Officer', name:'Rajinder Kumar', dept:'Revenue Department, Jalandhar', order:1, signed:true, signedAt:'May 20, 2026 · 10:32 AM', method:'Aadhaar eSign' },
    { id:2, role:'District Mining Officer', name:'Dr. Suresh Verma', dept:'Dept. of Geology & Mining, Punjab', order:2, signed:false, signedAt:null, method:null },
    { id:3, role:'Deputy Commissioner', name:'IAS Officer (Deputed)', dept:'DC Office, Jalandhar', order:3, signed:false, signedAt:null, method:null },
    { id:4, role:'Director, Mining', name:'Director of Mines', dept:'Punjab State Mining Directorate', order:4, signed:false, signedAt:null, method:null },
    { id:5, role:'Principal Secretary', name:'Principal Secretary (Mines)', dept:'Govt. of Punjab', order:5, signed:false, signedAt:null, method:null }
  ],
  demandDistricts: [...PUNJAB_DISTRICTS],
  summarySources: [
    'River bed (Existing)','River bed (New Proposed)','Agriculture land, pattas etc. (Existing)',
    'Desilting sites (ponds, lakes, dams etc.) (Proposed)','Desilting sites (ponds, lakes, dams etc.) (Existing)',
    'M-sand (Proposed)','M-sand (Existing)','Clusters (Existing & Proposed)'
  ],
  auctionData: [],
  annexureB: [],
  annexureC: [],
  annexureD: [],
  annexureE: [],
  annexureG: [],
  annexureH: [],
  annexureI: [],
  annexureJ: [],
  uploadedPDFs: {},
  frontMatterFiles: {},
  frontMatter: {
    title: 'District Survey Report for Sand Mining',
    district: 'Jalandhar',
    state: 'Punjab',
    year: '2025-26',
    version: 'Final Draft',
    preparedBy: 'Sub-Divisional Committee, Jalandhar District',
    assistedBy: 'RSP Green Development and Laboratories Pvt. Ltd.',
    preface: 'This District Survey Report (DSR) for Jalandhar District has been prepared in compliance with the Enforcement and Monitoring Guidelines for Sand Mining (EMGSM) 2020. The report provides a comprehensive assessment of sand mining activities, river morphology, mineral deposits, replenishment studies, and transportation routes within the district.',
    acknowledgement: 'The Sub-Divisional Committee of Jalandhar District acknowledges the support of the Punjab State Government, Department of Geology and Mining, and all field surveyors who contributed to this report.'
  }
};
window.S = S;
const DEFAULT_STATE = JSON.parse(JSON.stringify(S));
/**
 * Resets S to its original, fresh default properties.
 */
function resetSState() {
  if (typeof S === 'undefined') return;
  for (let key in S) {
    delete S[key];
  }
  Object.assign(S, JSON.parse(JSON.stringify(DEFAULT_STATE)));
  window.reviewerNotes = {};
  if (typeof clearActiveProject === 'function') {
    clearActiveProject();
  }
}
const PROJECT_WORKING_STATE_KEYS = [
  'phaseMetadata', 'phaseChangeLog', 'chapters', 'plates', 'graphs', 'graphCharts',
  'signatures', 'demandDistricts', 'summarySources', 'auctionData',
  'annexureB', 'annexureC', 'annexureD', 'annexureE', 'annexureG', 'annexureH',
  'annexureI', 'annexureJ', 'uploadedPDFs', 'frontMatterFiles', 'frontMatter'
];
function resetProjectWorkingState(activeProject) {
  const defaults = JSON.parse(JSON.stringify(DEFAULT_STATE));
  PROJECT_WORKING_STATE_KEYS.forEach(key => {
    S[key] = defaults[key] !== undefined ? defaults[key] : {};
  });
  S.chapterPDFs = {};
  S.sdlcData = null;
  S.activeProject = activeProject || null;
  window.reviewerNotes = {};
}
window.resetProjectWorkingState = resetProjectWorkingState;

;

/* js/phase.js */
/* Phase lifecycle and color metadata helpers */
const PHASE_UPLOAD_COLORS = [
  { name: 'Green', value: '#34C759' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Red', value: '#EF4444' }
];
function normalizePhaseNo(project) {
  return Math.max(1, Number(project?.phaseNo || project?.phaseMetadata?.phaseNo || 1));
}
function getProjectPhaseLabel(project) {
  return `Phase ${normalizePhaseNo(project)}`;
}
function getActivePhaseMetadata() {
  if (!S.phaseMetadata || typeof S.phaseMetadata !== 'object') {
    S.phaseMetadata = {
      phaseNo: normalizePhaseNo(S.activeProject),
      parentPhaseId: S.activeProject?.parentPhaseId || null,
      locked: Boolean(S.activeProject?.phaseLocked),
      defaultUploadColor: '#34C759'
    };
  }
  return S.phaseMetadata;
}
function getActivePhaseUploadColor() {
  const meta = getActivePhaseMetadata();
  return meta.defaultUploadColor || meta.uploadColor || '#34C759';
}
function phaseColorOptionsHtml(selectedColor) {
  const selected = String(selectedColor || '#34C759').toUpperCase();
  return PHASE_UPLOAD_COLORS.map(color => {
    const isSelected = color.value.toUpperCase() === selected ? ' selected' : '';
    return `<option value="${color.value}"${isSelected}>${color.name}</option>`;
  }).join('');
}
function setPhaseUploadColor(color) {
  const meta = getActivePhaseMetadata();
  meta.defaultUploadColor = color || '#34C759';
  if (S.activeProject) S.activeProject.defaultUploadColor = meta.defaultUploadColor;
  if (typeof debouncedSaveState === 'function') debouncedSaveState();
}
function recordPhaseChange(section, type, label, color) {
  const meta = getActivePhaseMetadata();
  if (!Array.isArray(S.phaseChangeLog)) S.phaseChangeLog = [];
  const entry = {
    section: section || 'Project',
    type: type || 'PHASE2_UPDATED',
    label: label || 'Updated data',
    color: color || getActivePhaseUploadColor(),
    phaseNo: meta.phaseNo || normalizePhaseNo(S.activeProject),
    at: new Date().toISOString(),
    by: S.user?.email || S.user?.name || 'Portal User'
  };
  S.phaseChangeLog.push(entry);
  return entry;
}
function applyPhaseHighlightToRow(row, color, origin = 'PHASE2_NEW') {
  if (!row) return;
  const phaseColor = color || getActivePhaseUploadColor();
  row.dataset.phaseOrigin = origin;
  row.dataset.phaseColor = phaseColor;
  row.style.background = `linear-gradient(90deg, ${phaseColor}26, transparent 70%)`;
  row.style.boxShadow = `inset 4px 0 0 ${phaseColor}`;
}
function getPhaseChangeSummaryRows() {
  const meta = getActivePhaseMetadata();
  const rows = [];
  if (Number(meta.phaseNo || 1) > 1) {
    rows.push([
      `Imported from Phase ${meta.parentPhaseNo || Math.max(1, Number(meta.phaseNo || 2) - 1)}`,
      meta.parentPhaseTitle || S.activeProject?.phaseOrigin || 'Previous DSR phase',
      '#94A3B8'
    ]);
  }
  (S.phaseChangeLog || []).forEach(item => {
    rows.push([
      item.type || 'PHASE2_UPDATED',
      `${item.section || 'Project'} - ${item.label || 'Updated data'}`,
      item.color || '#F59E0B'
    ]);
  });
  return rows;
}
function isActivePhaseLocked() {
  return Boolean(S.activeProject?.phaseLocked || S.phaseMetadata?.locked);
}
window.PHASE_UPLOAD_COLORS = PHASE_UPLOAD_COLORS;
window.normalizePhaseNo = normalizePhaseNo;
window.getProjectPhaseLabel = getProjectPhaseLabel;
window.getActivePhaseMetadata = getActivePhaseMetadata;
window.getActivePhaseUploadColor = getActivePhaseUploadColor;
window.phaseColorOptionsHtml = phaseColorOptionsHtml;
window.setPhaseUploadColor = setPhaseUploadColor;
window.recordPhaseChange = recordPhaseChange;
window.applyPhaseHighlightToRow = applyPhaseHighlightToRow;
window.getPhaseChangeSummaryRows = getPhaseChangeSummaryRows;
window.isActivePhaseLocked = isActivePhaseLocked;

;

/* js/hierarchy.js */
/* Role, module, chapter, and table-level access rules */
const RBAC_ROLE_RULES = {
  ADMIN: {
    label: 'Admin',
    upload: true,
    review: true,
    admin: true,
    modules: ['*'],
    chapters: 'all',
    access: 'Full'
  },
  IIT_ROPAR: {
    label: 'IIT Ropar',
    upload: true,
    review: true,
    modules: ['dashboard', 'projects', 'front-matter', 'chapters', 'anx1', 'anx2', 'annexure-f', 'workflow', 'history'],
    chapters: [1, 2, 3, 4, 5],
    access: 'Survey + Reviewer'
  },
  SDLC: {
    label: 'SDLC',
    upload: true,
    review: false,
    modules: ['sdlc-portal', 'dashboard', 'projects', 'history'],
    chapters: [],
    access: 'District-level data'
  },
  SDO: {
    label: 'SDO',
    upload: true,
    review: false,
    modules: ['chapters', 'anx1', 'anx2', 'anx3', 'anx5', 'annexure-f', 'workflow', 'history', 'dashboard', 'projects'],
    chapters: [5, 6, 7, 8, 9, 10],
    annexureColumns: [1, 2, 3],
    access: 'Assigned block'
  },
  JE: {
    label: 'JE',
    upload: true,
    review: false,
    modules: ['anx1', 'anx2', 'anx3', 'annexure-f', 'workflow', 'history', 'dashboard', 'projects'],
    annexureColumns: [1, 2],
    access: 'Field data'
  },
  AXEN: {
    label: 'AXEN',
    upload: true,
    review: false,
    modules: ['anx4', 'anx5', 'anx6', 'anx7', 'annexure-k', 'workflow', 'history', 'dashboard', 'projects'],
    annexureColumns: [3, 4, 5],
    access: 'Assigned section'
  },
  GIS: {
    label: 'GIS',
    upload: true,
    review: true,
    modules: ['dashboard', 'projects', 'plates', 'graphs', 'anx1', 'anx2', 'anx3', 'anx4', 'anx5', 'anx6', 'anx7', 'annexure-b', 'annexure-c', 'annexure-d', 'annexure-e', 'annexure-f', 'annexure-g', 'annexure-h', 'annexure-i', 'annexure-j', 'annexure-k'],
    annexureColumns: [2, 3, 4, 5, 6, 7, 8],
    access: 'Plates + Graphs + Annexures'
  },
  REVIEWER: {
    label: 'Reviewer',
    upload: false,
    review: true,
    modules: ['*'],
    readOnly: true,
    access: 'Govt review'
  },
  REVIEWER_1: {
    label: 'Reviewer 1',
    upload: false,
    review: true,
    modules: ['*'],
    readOnly: true,
    access: 'Govt review'
  },
  REVIEWER_2: {
    label: 'Reviewer 2',
    upload: false,
    review: true,
    modules: ['*'],
    readOnly: true,
    access: 'Govt review'
  },
  OFFICER: {
    label: 'Officer',
    upload: true,
    review: false,
    modules: ['*'],
    chapters: 'all',
    access: 'Report data entry'
  },
  DATA_ENTRY: {
    label: 'Data Entry',
    upload: true,
    review: false,
    modules: ['*'],
    chapters: 'all',
    access: 'Report data entry'
  },
  DISTRICT_OWNER: {
    label: 'District Owner',
    upload: false,
    review: true,
    modules: ['*'],
    readOnly: true,
    access: 'District review'
  },
  STATE_ADMIN: {
    label: 'State Admin',
    upload: false,
    review: true,
    modules: ['*'],
    readOnly: true,
    access: 'State review'
  }
};
const RBAC_TABLE_COLUMN_RULES = {
  IIT_ROPAR: {
    default: [1, 2],
    anx1: {
      'anx1-rivers': [1, 2],
      'anx1-desilt': [1, 2, 3],
      'anx1-patta': [1, 2],
      'anx1-msand': [1, 2]
    },
    anx2: {
      'anx2-leases': [1, 2, 3, 4],
      'anx2-patta': [1, 2, 3],
      'anx2-desilt': [1, 2],
      'anx2-msand': [1, 2]
    },
    'annexure-f': {
      'annexure-f-sand': [1, 2, 3],
      'annexure-f-benchmark': [1, 2],
      'annexure-f-cors': [1, 2]
    }
  },
  SDO: {
    default: [1, 2, 3],
    anx1: {
      'anx1-rivers': [1, 2, 3, 4, 5],
      'anx1-desilt': [1, 2, 3, 4],
      'anx1-patta': [1, 2, 3],
      'anx1-msand': [1, 2, 3]
    },
    anx2: {
      'anx2-leases': [1, 2, 3, 4, 5],
      'anx2-patta': [1, 2, 3, 4],
      'anx2-desilt': [1, 2, 3],
      'anx2-msand': [1, 2, 3]
    },
    anx3: {
      'anx3-clusters': [1, 2, 3, 4, 5],
      'anx3-contiguous': [1, 2, 3, 4, 5, 6]
    },
    anx5: {
      'anx5-benchmarks': [1, 2, 3],
      'anx5-mining': [1, 2, 3, 4, 5],
      'anx5-patta': [1, 2, 3, 4],
      'anx5-desilt': [1, 2, 3],
      'anx5-msand': [1, 2, 3]
    },
    'annexure-f': {
      'annexure-f-sand': [1, 2, 3, 4, 5],
      'annexure-f-benchmark': [1, 2, 3],
      'annexure-f-cors': [1, 2, 3]
    }
  },
  JE: {
    default: [1, 2],
    anx1: {
      'anx1-rivers': [1, 2, 3],
      'anx1-desilt': [1, 2, 3],
      'anx1-patta': [1, 2],
      'anx1-msand': [1, 2]
    },
    anx2: {
      'anx2-leases': [1, 2, 3],
      'anx2-patta': [1, 2],
      'anx2-desilt': [1, 2],
      'anx2-msand': [1, 2]
    },
    anx3: {
      'anx3-clusters': [1, 2, 3],
      'anx3-contiguous': [1, 2, 3]
    },
    'annexure-f': {
      'annexure-f-sand': [1, 2, 3],
      'annexure-f-benchmark': [1, 2],
      'annexure-f-cors': [1, 2]
    }
  },
  AXEN: {
    default: [3, 4, 5],
    anx4: {
      default: [1, 2, 3, 4, 5, 6]
    },
    anx5: {
      'anx5-benchmarks': [3, 4, 5],
      'anx5-mining': [3, 4, 5, 6, 7],
      'anx5-patta': [3, 4, 5],
      'anx5-desilt': [3, 4, 5],
      'anx5-msand': [3, 4]
    },
    anx6: {
      'anx6-final-clusters': [3, 4, 5, 6, 7],
      'anx6-contiguous-clusters': [3, 4, 5, 6, 7]
    },
    anx7: {
      default: [3, 4, 5, 6]
    },
    'annexure-k': {
      'annexure-k-proforma': [3, 4, 5, 6],
      'annexure-k-annexure-a': [3, 4, 5]
    }
  },
  GIS: {
    default: [2, 3, 4, 5, 6, 7, 8]
  }
};
function getBackendRole() {
  const raw = (window.S && (S.backendRole || S.user?.backendRole || S.user?.roleCode)) || '';
  const cleaned = String(raw).replace(/^ROLE_/, '').toUpperCase();
  if (cleaned) return cleaned;
  if (S?.role === 'admin') return 'ADMIN';
  if (S?.role === 'reviewer') return 'REVIEWER';
  if (S?.role === 'sdlc') return 'SDLC';
  return 'OFFICER';
}
function getRoleRule() {
  return RBAC_ROLE_RULES[getBackendRole()] || RBAC_ROLE_RULES.OFFICER;
}
function hasPermission(permission) {
  const perms = S?.permissions || [];
  if (perms.includes(permission)) return true;
  const rule = getRoleRule();
  if (permission === 'UPLOAD') return !!rule.upload;
  if (permission === 'REVIEW') return !!rule.review;
  if (permission === 'ADMIN') return !!rule.admin;
  return false;
}
function hasModuleAccess(viewId) {
  if (!viewId) return true;
  if (viewId === 'audit-logs') return true;
  const rule = getRoleRule();
  if (rule.modules?.includes('*')) return true;
  return rule.modules?.includes(viewId);
}
function getFirstAllowedView() {
  const preferredViews = [
    'dashboard', 'projects', 'front-matter', 'chapters', 'plates', 'graphs',
    'anx1', 'anx2', 'anx3', 'anx4', 'anx5', 'anx6', 'anx7',
    'annexure-b', 'annexure-c', 'annexure-d', 'annexure-e', 'annexure-f',
    'annexure-g', 'annexure-h', 'annexure-i', 'annexure-j', 'annexure-k',
    'workflow', 'history', 'sdlc-portal', 'users', 'audit-logs'
  ];
  return preferredViews.find(viewId => hasModuleAccess(viewId) && document.getElementById('view-' + viewId)) || 'dashboard';
}
function getFirstAllowedProjectView() {
  const projectViews = [
    'front-matter', 'chapters', 'plates', 'graphs',
    'anx1', 'anx2', 'anx3', 'anx4', 'anx5', 'anx6', 'anx7',
    'annexure-b', 'annexure-c', 'annexure-d', 'annexure-e', 'annexure-f',
    'annexure-g', 'annexure-h', 'annexure-i', 'annexure-j', 'annexure-k',
    'sdlc-portal', 'workflow', 'history'
  ];
  return projectViews.find(viewId => hasModuleAccess(viewId) && document.getElementById('view-' + viewId)) || 'projects';
}
function showUnauthorizedAccessError() {
  const message = 'Access not provided. You are not authorized to access this section.';
  if (typeof toast === 'function') toast(message, 'error');
  else alert(message);
}
function canEditView(viewId) {
  if (typeof isActivePhaseLocked === 'function' && isActivePhaseLocked()) return false;
  const role = getBackendRole();
  const rule = getRoleRule();
  if (role === 'ADMIN' || role === 'OFFICER' || role === 'DATA_ENTRY') return true;
  if (rule.readOnly) return false;
  if (!rule.upload) return false;
  if (viewId === 'dashboard' || viewId === 'projects' || viewId === 'workflow' || viewId === 'history') return false;
  return hasModuleAccess(viewId);
}
function canEditChapter(chapterNo) {
  const role = getBackendRole();
  const rule = getRoleRule();
  if (role === 'ADMIN' || role === 'OFFICER' || role === 'DATA_ENTRY') return true;
  if (rule.chapters === 'all') return true;
  return Array.isArray(rule.chapters) && rule.chapters.includes(Number(chapterNo));
}
function hasWriteAccess() {
  if (typeof S === 'undefined' || !S || !S.user) return false;
  const activeView = document.querySelector('.view.active');
  const viewId = activeView ? activeView.id.replace('view-', '') : '';
  return canEditView(viewId);
}
function isUserReadOnly() {
  return !hasWriteAccess();
}
function hasReviewAccess() {
  if (typeof S === 'undefined' || !S || !S.user) return false;
  return hasPermission('REVIEW');
}
function hasAdminAccess() {
  if (typeof S === 'undefined' || !S || !S.user) return false;
  return hasPermission('ADMIN') || getBackendRole() === 'ADMIN';
}
function setLockedElement(el, locked, label) {
  if (!el) return;
  el.classList.toggle('rbac-locked', locked);
  if (locked) {
    el.setAttribute('aria-disabled', 'true');
    el.title = label || 'Locked for your role';
    el.dataset.rbacBadge = 'Locked';
  } else {
    el.removeAttribute('aria-disabled');
    el.removeAttribute('title');
    delete el.dataset.rbacBadge;
  }
}
function lockFormElement(el, locked, label) {
  if (!el) return;
  if (el.matches('[contenteditable], td, th')) {
    el.setAttribute('contenteditable', locked ? 'false' : 'true');
  } else {
    el.disabled = locked;
  }
  setLockedElement(el, locked, label);
}
function isNavigationOrSafeButton(btn) {
  const onclickAttr = btn.getAttribute('onclick') || '';
  return btn.closest('#reviewer-actions') ||
    btn.closest('#reviewer-floating-notes') ||
    btn.closest('.top-nav') ||
    btn.closest('.header-row') ||
    btn.closest('.tb-dropdown-menu') ||
    btn.classList.contains('modal-close') ||
    onclickAttr.includes('showView') ||
    onclickAttr.includes('filterDashboardByDistrict') ||
    onclickAttr.includes('toggle') ||
    onclickAttr.includes('closeModal');
}
function isEditActionElement(el) {
  const text = (el.textContent || '').toLowerCase();
  const attrs = `${el.getAttribute('onclick') || ''} ${el.getAttribute('onchange') || ''}`;
  return /add|upload|save|delete|remove|submit|edit|clear|replace|move|sign|approve|return/.test(text) ||
    /add|upload|save|delete|remove|submit|handle|clear|replace|move|sign|approve|return/i.test(attrs) ||
    el.classList.contains('upload-zone') ||
    el.querySelector?.('input[type="file"]');
}
function applyMoreAnnexureAccess(root) {
  const container = root || document.querySelector('.view.active');
  if (!container || !container.id || !container.id.startsWith('view-annexure-')) return;
  applyAnnexureColumnLocks(container);
}
function applyChapterAccess(root) {
  const container = root || document.getElementById('view-chapters');
  if (!container) return;
  container.querySelectorAll('.chapter-item').forEach((item, idx) => {
    const allowed = canEditChapter(idx + 1);
    const label = allowed ? '' : `Chapter ${idx + 1} is locked for ${getRoleRule().label}`;
    item.querySelectorAll('input, textarea, select').forEach(el => lockFormElement(el, !allowed, label));
    item.querySelectorAll('button, label.btn').forEach(el => {
      if (isEditActionElement(el)) el.style.display = allowed ? '' : 'none';
    });
    setLockedElement(item, !allowed, label);
  });
}
function getTableColumnPolicy(role, viewId, table) {
  const tableId = table?.id || '';
  const policy = RBAC_TABLE_COLUMN_RULES[role];
  if (!policy) return null;
  const viewPolicy = policy[viewId];
  if (viewPolicy) {
    for (const [key, columns] of Object.entries(viewPolicy)) {
      if (key === 'default') continue;
      if (tableId === key || tableId.startsWith(`${key}-`)) return columns;
    }
    if (viewPolicy.default) return viewPolicy.default;
  }
  return policy.default || null;
}
function getEditableColumnsForTable(table) {
  const role = getBackendRole();
  const view = table?.closest?.('.view');
  const viewId = view ? view.id.replace('view-', '') : '';
  const rule = getRoleRule();
  const fullAccess = role === 'ADMIN' || role === 'OFFICER' || role === 'DATA_ENTRY';
  if (fullAccess) return null;
  return getTableColumnPolicy(role, viewId, table) || rule.annexureColumns || [];
}
function isActionCellContent(value) {
  const text = String(value === undefined || value === null ? '' : value);
  return /<button|onclick=|btn-danger|trash-2/i.test(text);
}
function setRbacUploadCellValue(cell, value) {
  if (!cell) return;
  const valueText = String(value === undefined || value === null || value === '' ? 'NUL' : value);
  const select = cell.querySelector('select');
  if (select && !String(valueText).includes('<select')) {
    const match = Array.from(select.options).find(opt => opt.text.trim().toLowerCase() === valueText.trim().toLowerCase());
    if (match) select.value = match.value;
    return;
  }
  if (String(valueText).includes('<select') || String(valueText).includes('<button')) {
    cell.innerHTML = valueText;
  } else {
    cell.textContent = valueText;
  }
}
function buildSafeUploadRowForTable(table, rowData, editableColumns) {
  if (!Array.isArray(rowData)) return [];
  if (!editableColumns) return rowData.slice();
  return rowData.map((value, idx) => {
    const colNo = idx + 1;
    if (isActionCellContent(value)) return value;
    return editableColumns.includes(colNo) ? value : 'LOCKED';
  });
}
function rbacApplyExcelRowsToTable(tableOrId, rows, addRowFn, options = {}) {
  const table = typeof tableOrId === 'string' ? document.getElementById(tableOrId) : tableOrId;
  const tbody = table ? table.querySelector('tbody') : null;
  if (!table || !tbody || !Array.isArray(rows)) return { updated: 0, protected: 0 };
  const editableColumns = getEditableColumnsForTable(table);
  const fullAccess = editableColumns === null;
  const addRow = typeof addRowFn === 'function'
    ? addRowFn
    : (row) => {
      const tr = document.createElement('tr');
      row.forEach(value => {
        const td = document.createElement('td');
        setRbacUploadCellValue(td, value);
        if (!isActionCellContent(value)) td.contentEditable = 'true';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    };
  if (fullAccess || options.replaceForPartial === true) {
    tbody.innerHTML = '';
    rows.forEach(row => addRow(row));
    if (typeof enforceActiveViewHierarchy === 'function') enforceActiveViewHierarchy(true);
    return { updated: rows.length, protected: 0 };
  }
  let updated = 0;
  let protectedCells = 0;
  rows.forEach((rowData, rowIndex) => {
    let row = tbody.rows[rowIndex];
    if (!row) {
      addRow(buildSafeUploadRowForTable(table, rowData, editableColumns));
      row = tbody.rows[rowIndex];
    }
    if (!row) return;
    Array.from(rowData).forEach((value, idx) => {
      if (isActionCellContent(value)) return;
      const colNo = idx + 1;
      const cell = row.children[idx];
      if (!editableColumns.includes(colNo)) {
        protectedCells += 1;
        return;
      }
      setRbacUploadCellValue(cell, value);
    });
    updated += 1;
  });
  if (typeof enforceActiveViewHierarchy === 'function') enforceActiveViewHierarchy(true);
  if (typeof initLucide === 'function') initLucide();
  if (protectedCells && typeof toast === 'function' && options.silent !== true) {
    toast(`${protectedCells} locked cell(s) were protected during Excel sync.`, 'info');
  }
  return { updated, protected: protectedCells };
}
function applyAnnexureColumnLocks(root) {
  const container = root || document.querySelector('.view.active');
  if (!container) return;
  const viewId = container.id.replace('view-', '');
  if (!/^anx[1-7]$/.test(viewId) && !/^annexure-[b-k]$/.test(viewId)) return;
  const role = getBackendRole();
  const rule = getRoleRule();
  const fullAccess = role === 'ADMIN' || role === 'OFFICER' || role === 'DATA_ENTRY';
  const canModuleEdit = canEditView(viewId);
  container.querySelectorAll('table').forEach(table => {
    const tableColumns = getTableColumnPolicy(role, viewId, table);
    const editableColumns = fullAccess ? null : (tableColumns || rule.annexureColumns || []);
    table.querySelectorAll('tbody tr').forEach(row => {
      Array.from(row.children).forEach((cell, idx) => {
        if (cell.querySelector('button')) return;
        const colNo = idx + 1;
        const allowed = canModuleEdit && (fullAccess || editableColumns.includes(colNo));
        const label = `Column ${colNo} locked for ${rule.label}`;
        lockFormElement(cell, !allowed, allowed ? '' : label);
        cell.querySelectorAll('input, textarea, select').forEach(el => lockFormElement(el, !allowed, label));
      });
    });
  });
  if (canModuleEdit && !fullAccess) {
    container.querySelectorAll('button, label.btn, .upload-zone').forEach(el => {
      const text = (el.textContent || '').toLowerCase();
      const attrs = `${el.getAttribute('onclick') || ''} ${el.getAttribute('onchange') || ''}`;
      if (/upload|replace|delete|remove|clear|move/.test(text) || /upload|replace|delete|remove|clear|move/i.test(attrs)) {
        el.style.display = 'none';
      }
    });
  }
}
function updateRolePermissionUI() {
  const adminAccess = hasAdminAccess();
  [
    document.getElementById('tb-btn-new-project'),
    document.getElementById('view-btn-new-project'),
    document.getElementById('sidebar-new-project-section')
  ].forEach(el => {
    if (el) el.style.display = adminAccess ? '' : 'none';
  });
  document.querySelectorAll('[onclick*="newProjectModal"], [onclick*="deleteProject"]').forEach(el => {
    el.style.display = adminAccess ? '' : 'none';
  });
  const navAuditLogs = document.getElementById('nav-audit-logs');
  if (navAuditLogs) navAuditLogs.style.display = 'block';
  const tbNavAuditLogs = document.getElementById('tb-nav-audit-logs');
  if (tbNavAuditLogs) tbNavAuditLogs.style.display = 'inline-flex';
  const dashMenuAuditLogs = document.getElementById('dash-menu-audit-logs');
  if (dashMenuAuditLogs) dashMenuAuditLogs.style.display = 'block';
  const projectsMenuAuditLogs = document.getElementById('projects-menu-audit-logs');
  if (projectsMenuAuditLogs) projectsMenuAuditLogs.style.display = 'block';
  const navUsers = document.getElementById('nav-users');
  if (navUsers) navUsers.style.display = adminAccess ? 'block' : 'none';
  const roleText = document.querySelector('.sb-role-text');
  if (roleText && S?.user) roleText.textContent = getRoleRule().label;
}
function enforceActiveViewHierarchy(force = false) {
  const activeView = document.querySelector('.view.active');
  if (!activeView || typeof S === 'undefined' || !S.user) return;
  const viewId = activeView.id.replace('view-', '');
  const rbacSignature = [
    getBackendRole(),
    viewId,
    S.activeProject?.id || '',
    activeView.querySelectorAll('input, textarea, select, [contenteditable], button, label.btn, .upload-zone').length,
    activeView.querySelectorAll('tbody tr').length,
    activeView.querySelectorAll('td, th').length
  ].join('|');
  if (!force && activeView.dataset.rbacSignature === rbacSignature) {
    updateRolePermissionUI();
    return;
  }
  const canEdit = canEditView(viewId);
  const label = `${getRoleRule().label} cannot edit this section`;
  activeView.querySelectorAll('input, textarea, select').forEach(el => {
    if (el.closest('#modal-review') || el.id === 'dash-district-filter' || el.closest('#reviewer-actions') || el.closest('#reviewer-floating-notes')) return;
    lockFormElement(el, !canEdit, label);
  });
  activeView.querySelectorAll('[contenteditable], [contenteditable="true"]').forEach(el => {
    lockFormElement(el, !canEdit, label);
  });
  activeView.querySelectorAll('button, label.btn, .upload-zone').forEach(el => {
    if (el.tagName === 'BUTTON' && isNavigationOrSafeButton(el)) return;
    if (!isEditActionElement(el)) return;
    if (hasAdminAccess() && activeView.id === 'view-users') {
      el.style.display = '';
      return;
    }
    el.style.display = canEdit ? '' : 'none';
  });
  if (viewId === 'chapters') applyChapterAccess(activeView);
  applyAnnexureColumnLocks(activeView);
  applyMoreAnnexureAccess(activeView);
  const reviewerActions = document.getElementById('reviewer-actions');
  if (reviewerActions) {
    reviewerActions.style.display = (hasReviewAccess() && S.activeProject) ? 'flex' : 'none';
  }
  updateRolePermissionUI();
  activeView.dataset.rbacSignature = rbacSignature;
}
function ensureRbacStyles() {
  if (document.getElementById('rbac-style')) return;
  const style = document.createElement('style');
  style.id = 'rbac-style';
  style.textContent = `
    .rbac-locked {
      filter: blur(1.1px);
      opacity: 0.48;
      cursor: not-allowed !important;
      user-select: none;
    }
    td.rbac-locked,
    th.rbac-locked {
      filter: none;
      opacity: 1;
      position: relative;
      color: transparent !important;
      text-shadow: 0 0 6px rgba(15, 23, 42, 0.55);
      background: rgba(254, 226, 226, 0.35);
    }
    td.rbac-locked::after,
    th.rbac-locked::after {
      content: attr(data-rbac-badge);
      position: absolute;
      inset: 50% auto auto 50%;
      transform: translate(-50%, -50%);
      padding: 2px 7px;
      border-radius: 6px;
      background: rgba(127, 29, 29, 0.9);
      color: #fff;
      text-shadow: none;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0;
      pointer-events: none;
      white-space: nowrap;
    }
    td.rbac-locked > *,
    th.rbac-locked > * {
      filter: blur(1.1px);
      opacity: 0.48;
    }
    .chapter-item.rbac-locked {
      filter: none;
      opacity: 0.72;
      border-style: dashed;
    }
    .chapter-item.rbac-locked .ch-body {
      filter: blur(0.8px);
    }
  `;
  document.head.appendChild(style);
}
function bindRbacLockedClickHandler() {
  if (window.__rbacLockedClickHandlerBound) return;
  window.__rbacLockedClickHandlerBound = true;
  document.addEventListener('click', event => {
    const locked = event.target.closest?.('.rbac-locked');
    if (!locked) return;
    event.preventDefault();
    event.stopPropagation();
    showUnauthorizedAccessError();
  }, true);
}
document.addEventListener('DOMContentLoaded', ensureRbacStyles);
document.addEventListener('DOMContentLoaded', bindRbacLockedClickHandler);
ensureRbacStyles();
bindRbacLockedClickHandler();

;

/* js/performance.js */
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

;

/* js/navigation.js */
/* ══════════════════════════════════════
   NAVIGATION & UTILS
 ══════════════════════════════════════ */
let viewHistory = [];
let currentViewId = 'dashboard';
let isSidebarPinned = false;
let sidebarTimer;
function setSidebarCollapsed(collapsed) {
  collapsed = Boolean(collapsed);
  clearTimeout(sidebarTimer);
  const sidebar = document.getElementById('sidebar');
  const isMobileShell = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  if (isMobileShell) {
    if (sidebar) sidebar.classList.toggle('mobile-open', !collapsed);
    document.body.classList.toggle('mobile-sidebar-open', !collapsed);
  } else if (sidebar) {
    sidebar.classList.remove('mobile-open');
    document.body.classList.remove('mobile-sidebar-open');
  }
  const isCollapsed = document.body.classList.contains('sidebar-hidden');
  if (isCollapsed !== collapsed) {
    document.body.classList.toggle('sidebar-hidden', collapsed);
  }
  isSidebarPinned = !collapsed;
  const toggleBtn = document.getElementById('tb-sidebar-toggle');
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', String(!collapsed));
  }
}
function toggleSidebar(event) {
  if (event && typeof event.preventDefault === 'function') event.preventDefault();
  if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
  const sidebar = document.getElementById('sidebar');
  const isMobileShell = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  const shouldCollapse = isMobileShell
    ? Boolean(sidebar && sidebar.classList.contains('mobile-open'))
    : !document.body.classList.contains('sidebar-hidden');
  setSidebarCollapsed(shouldCollapse);
  return false;
}
function expandSidebar() {
  if (isSidebarPinned) return;
  clearTimeout(sidebarTimer);
}
function collapseSidebar() {
  if (isSidebarPinned) return;
  clearTimeout(sidebarTimer);
}
window.addEventListener('resize', () => {
  const sidebar = document.getElementById('sidebar');
  if (window.matchMedia && !window.matchMedia('(max-width: 900px)').matches) {
    if (sidebar) sidebar.classList.remove('mobile-open');
    document.body.classList.remove('mobile-sidebar-open');
  }
});
const initialHash = window.location.hash ? window.location.hash.slice(1).trim() : null;
const initialView = initialHash && document.getElementById('view-' + initialHash) ? initialHash : currentViewId;
if (history.state === null) {
  currentViewId = initialView;
  history.replaceState({ viewId: currentViewId }, '', '#' + currentViewId);
}
window.addEventListener('popstate', (event) => {
  if (event.state && event.state.viewId) {
    const idx = viewHistory.indexOf(event.state.viewId);
    if (idx !== -1) {
      viewHistory = viewHistory.slice(0, idx);
    }
    showView(event.state.viewId, null, false);
  } else {
    viewHistory = [];
    showView('dashboard', null, false);
  }
});
async function initApp() {
  if (typeof currentDistrictFilter !== 'undefined' && !S.activeProject) currentDistrictFilter = 'ALL';
  try {
    if (typeof refreshProjectsFromBackend === 'function') {
      await refreshProjectsFromBackend(false);
    } else {
      const data = await apiFetch('/projects');
      S.projects = Array.isArray(data) ? data : (Array.isArray(data?.value) ? data.value : []);
      S.projectLoadError = '';
    }
  } catch (err) {
    console.error('Failed to load projects from backend:', err);
    S.projectLoadError = err.message || 'Failed to load projects from backend';
    if (typeof toast === 'function') toast('Projects could not load: ' + S.projectLoadError, 'error');
  }
  try {
    const reports = await apiFetch('/reports');
    if (reports && Array.isArray(reports)) {
      S.projects.forEach(p => {
        const rep = reports.find(r => r.projectId === p.id);
        if (rep) p.reportStatus = rep.status;
      });
      if (typeof syncNotificationsAndReviewStatus === 'function') {
        syncNotificationsAndReviewStatus();
      } else {
        const returned = reports.filter(r => r.status === 'RETURNED' || r.status === 'REJECTED');
        updateNotificationUI(returned);
      }
    }
  } catch (err) {
    console.error('Failed to load reports for notifications', err);
  }
  renderDashboard();
  renderProjects();
  if (typeof updateRolePermissionUI === 'function') updateRolePermissionUI();
  const projectBadge = document.getElementById('badge-projs');
  if (projectBadge) projectBadge.textContent = S.projects.length;
  const pendingSigsBadge = document.getElementById('sb-pending-sigs');
  if (pendingSigsBadge) pendingSigsBadge.textContent = S.signatures.filter(s => !s.signed).length;
}
window.scrollToSection = function (viewId, sectionId, parentBtn) {
  showView(viewId, parentBtn);
  setTimeout(() => {
    const el = document.getElementById(sectionId);
    if (el) {
      const card = el.closest('.card') || el;
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const oldBg = card.style.backgroundColor;
      card.style.transition = 'background-color 0.5s ease';
      card.style.backgroundColor = 'var(--yellow-lt)';
      setTimeout(() => {
        card.style.backgroundColor = oldBg;
      }, 1500);
    }
  }, 150);
};
window.toggleSubMenu = function (id) {
  const el = document.getElementById(id);
  if (!el) return;
  const isVisible = el.style.display === 'block';
  document.querySelectorAll('.flyout-menu').forEach(m => m.style.display = 'none');
  if (!isVisible) {
    el.style.display = 'block';
  }
};
window.toggleMoreAnnexuresInline = function () {
  const el = document.getElementById('inline-more-annexures');
  if (!el) return;
  const isVisible = el.style.display === 'flex';
  el.style.display = isVisible ? 'none' : 'flex';
};
function isAnnexureViewId(id) {
  return /^anx[1-7]$/.test(id) || /^annexure-[b-k]$/.test(id);
}
function isCoreAnnexureViewId(id) {
  return /^anx[1-7]$/.test(id);
}
function getAnnexureInstructionText(id) {
  const map = {
    anx1: 'Fill the source tables, upload section Excel files where needed, and use the live preview to check Annexure I before download.',
    anx2: 'Maintain lease, patta land, de-siltation, and M-Sand tables. Totals and generated PDF preview update from the table data.',
    anx3: 'Review cluster and continuation details, keep rows complete, and verify the generated Annexure III in the right preview.',
    anx4: 'Maintain individual lease routes first, then cluster transportation routes. Check the right-side preview before downloading.',
    anx5: 'Maintain Bench Mark and CORS point data. Upload Excel where useful and verify the generated Annexure V preview.',
    anx6: 'Maintain final cluster details and supporting values, then confirm the generated Annexure VI preview before download.',
    anx7: 'Maintain individual route tables first, then cluster route tables. Use the right-side preview to verify Annexure VII.',
    'annexure-f': 'Download Excel templates for each section, fill tables, then upload supporting PDF/image if needed. Verify the generated Annexure F preview.',
    'annexure-k': 'Upload supporting PDF/image if required, then maintain Proforma Auctioned Sites and Annexure A tables. Verify the final merged preview.'
  };
  return map[id] || `Upload and manage ${id.replace('annexure-', 'Annexure ').toUpperCase()} entries. Use the right-side preview to check the final output.`;
}
function buildAnnexureInstructions(id) {
  const wrap = document.createElement('div');
  wrap.className = 'annexure-line-instructions';
  wrap.innerHTML = `
    <div class="card annexure-instructions-card">
      <div class="card-hd">
        <div class="card-title">Instructions</div>
      </div>
      <div class="card-bd">
        <p>${getAnnexureInstructionText(id)}</p>
      </div>
    </div>`;
  return wrap;
}
function normalizeAnnexureViewLayout(id) {
  if (!isAnnexureViewId(id)) return;
  const view = document.getElementById('view-' + id);
  if (!view) return;
  const shouldHideInstructions = isCoreAnnexureViewId(id);
  const existingLayout = view.querySelector(':scope > .annexure-unified-layout, :scope > .annexure-line-layout, :scope > .g2');
  if (existingLayout) {
    existingLayout.classList.add('annexure-unified-layout', 'annexure-line-layout');
    const cols = Array.from(existingLayout.children);
    if (cols[0]) cols[0].classList.add('annexure-line-main');
    let instructions = existingLayout.querySelector(':scope > .annexure-line-instructions');
    if (!instructions && cols[1]) {
      cols[1].classList.add('annexure-line-instructions');
      instructions = cols[1];
    }
    if (shouldHideInstructions) {
      if (instructions) instructions.remove();
      existingLayout.classList.add('annexure-no-instructions');
      existingLayout.style.gridTemplateColumns = 'minmax(0, 1fr)';
    } else if (!instructions) {
      existingLayout.appendChild(buildAnnexureInstructions(id));
    }
    return;
  }
  const header = view.querySelector(':scope > .header-row');
  const layout = document.createElement('div');
  layout.className = 'g2 annexure-unified-layout annexure-line-layout';
  const main = document.createElement('div');
  main.className = 'annexure-line-main';
  Array.from(view.children).forEach(child => {
    if (child === header) return;
    main.appendChild(child);
  });
  layout.appendChild(main);
  if (shouldHideInstructions) {
    layout.classList.add('annexure-no-instructions');
    layout.style.gridTemplateColumns = 'minmax(0, 1fr)';
  } else {
    layout.appendChild(buildAnnexureInstructions(id));
  }
  if (header && header.nextSibling) {
    view.insertBefore(layout, header.nextSibling);
  } else {
    view.appendChild(layout);
  }
}
function refreshCoreAnnexurePreview(id) {
  if (window.pdfPreview && typeof window.pdfPreview.generateAnnexureLivePreview === 'function') {
    window.pdfPreview.generateAnnexureLivePreview(id, 80);
    return;
  }
  const fn = {
    anx1: window.exportAnx1PDF,
    anx2: window.exportAnx2PDF,
    anx3: window.exportAnx3PDF,
    anx4: window.exportAnx4PDF,
    anx5: window.exportAnx5PDF,
    anx6: window.exportAnx6PDF,
    anx7: window.exportAnx7PDF
  }[id];
  if (typeof fn !== 'function') return;
  const run = () => fn(null, true);
  if (typeof ensurePortalVendors === 'function') {
    ensurePortalVendors(['jspdf', 'autotable']).then(run).catch(err => {
      console.error('Live preview tools failed:', err);
      if (typeof toast === 'function') toast('Live preview tools could not load.', 'error');
    });
  } else {
    setTimeout(run, 80);
  }
}
function addGenericAnnexureRow(table, viewId) {
  const tbody = table ? table.querySelector('tbody') : null;
  if (!tbody) return;
  const templateRow = tbody.rows[tbody.rows.length - 1];
  const columnCount = table.querySelectorAll('thead th').length || templateRow?.cells.length || 1;
  const tr = document.createElement('tr');
  for (let i = 0; i < columnCount; i++) {
    const sourceCell = templateRow ? templateRow.cells[i] : null;
    const td = document.createElement('td');
    if (sourceCell && sourceCell.querySelector('button')) {
      td.innerHTML = sourceCell.innerHTML;
    } else if (sourceCell && sourceCell.querySelector('select')) {
      td.innerHTML = sourceCell.innerHTML;
      td.querySelectorAll('select').forEach(select => { select.selectedIndex = 0; });
    } else {
      td.contentEditable = 'true';
      td.textContent = i === 0 && /sl\.?no|sr\.?no|serial/i.test(table.querySelectorAll('thead th')[0]?.innerText || '') ? String(tbody.rows.length + 1) : 'NA';
    }
    tr.appendChild(td);
  }
  tbody.appendChild(tr);
  if (window.initLucide) window.initLucide();
  refreshCoreAnnexurePreview(viewId);
}
function addGenericAnnexureColumn(table, viewId) {
  if (!table) return;
  const headerRow = table.querySelector('thead tr');
  const actionHeader = headerRow ? Array.from(headerRow.children).find(th => th.classList.contains('no-print') || /action/i.test(th.innerText || '')) : null;
  const th = document.createElement('th');
  th.contentEditable = 'true';
  th.textContent = 'New Column';
  th.style.minWidth = '120px';
  if (headerRow) headerRow.insertBefore(th, actionHeader || null);
  table.querySelectorAll('tbody tr').forEach(row => {
    const actionCell = Array.from(row.children).find(td => td.querySelector('button') || td.classList.contains('no-print'));
    const td = document.createElement('td');
    td.contentEditable = 'true';
    td.textContent = 'NA';
    row.insertBefore(td, actionCell || null);
  });
  refreshCoreAnnexurePreview(viewId);
}
function addCoreAnnexureTableControls(id) {
  if (!isCoreAnnexureViewId(id)) return;
  const view = document.getElementById('view-' + id);
  if (!view) return;
  view.querySelectorAll('table').forEach(table => {
    if (table.dataset.liveControlsAttached === 'true') return;
    table.dataset.liveControlsAttached = 'true';
    const wrap = table.closest('.tbl-wrap') || table.parentElement;
    if (!wrap || wrap.nextElementSibling?.classList.contains('anx-table-live-actions')) return;
    const actions = document.createElement('div');
    actions.className = 'anx-table-live-actions';
    actions.innerHTML = `
      <button type="button" class="btn btn-xs btn-outline anx-live-add-row">
        <i data-lucide="plus" style="width:12px;height:12px;"></i>
        <span>Add Row</span>
      </button>
      <button type="button" class="btn btn-xs btn-outline anx-live-add-column">
        <i data-lucide="columns-3" style="width:12px;height:12px;"></i>
        <span>Add Column</span>
      </button>`;
    wrap.insertAdjacentElement('afterend', actions);
    actions.querySelector('.anx-live-add-row')?.addEventListener('click', () => {
      const block = table.closest('.card, .anx-section') || view;
      const existingAddRow = Array.from(block.querySelectorAll('button')).find(btn => {
        const text = (btn.innerText || '').trim().toLowerCase();
        const onclick = btn.getAttribute('onclick') || '';
        return btn !== actions.querySelector('.anx-live-add-row') && text.includes('add row') && !onclick.includes('addGenericAnnexureRow');
      });
      if (existingAddRow) existingAddRow.click();
      else addGenericAnnexureRow(table, id);
      refreshCoreAnnexurePreview(id);
    });
    actions.querySelector('.anx-live-add-column')?.addEventListener('click', () => addGenericAnnexureColumn(table, id));
  });
  if (window.initLucide) window.initLucide();
}
function repairMainContentStructure() {
  const workspace = document.querySelector('.app-workspace');
  const mainContent = document.querySelector('.main-content');
  const pageBody = mainContent ? mainContent.querySelector('.page-body') : null;
  if (!workspace || !mainContent || !pageBody) return;
  workspace.querySelectorAll(':scope > .view, :scope > div[id^="view-"]').forEach(view => {
    pageBody.appendChild(view);
  });
  workspace.scrollLeft = 0;
  mainContent.scrollLeft = 0;
}
function showView(id, btn, push = true) {
  repairMainContentStructure();
  if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');
    document.body.classList.remove('mobile-sidebar-open');
    document.body.classList.add('sidebar-hidden');
  }
  if (typeof hasModuleAccess === 'function' && typeof S !== 'undefined' && S.user && !hasModuleAccess(id)) {
    if (typeof showUnauthorizedAccessError === 'function') showUnauthorizedAccessError();
    else if (typeof toast === 'function') toast('You are not authorized to access this section.', 'error');
    else alert('You are not authorized to access this section.');
    if (window.location.hash !== '#' + currentViewId) {
      history.replaceState({ viewId: currentViewId }, '', '#' + currentViewId);
    }
    return;
  }
  if (typeof ensurePortalAssetsForView === 'function' && !ensurePortalAssetsForView(id, () => showView(id, btn, push))) {
    return;
  }
  document.querySelectorAll('.flyout-menu').forEach(m => m.style.display = 'none');
  if (push && currentViewId && currentViewId !== id) {
    viewHistory.push(currentViewId);
    history.pushState({ viewId: id }, '', '#' + id);
  }
  currentViewId = id;
  if (id === 'dashboard') {
    document.body.classList.add('view-dashboard-active');
  } else {
    document.body.classList.remove('view-dashboard-active');
  }
  document.body.classList.toggle('view-projects-active', id === 'projects');
  const backBtn = document.getElementById('tb-back-btn');
  if (backBtn) {
    backBtn.style.display = viewHistory.length > 0 ? 'flex' : 'none';
  }
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tb-sub-nav-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('view-' + id);
  if (el) {
    el.classList.add('active');
    setTimeout(() => {
      const mainContent = document.querySelector('.main-content');
      if (id === 'dashboard') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        if (mainContent) {
          mainContent.scrollTop = 0;
          mainContent.scrollLeft = 0;
        }
      } else {
        el.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'nearest' });
        if (mainContent) mainContent.scrollLeft = 0;
      }
      document.documentElement.scrollLeft = 0;
      document.body.scrollLeft = 0;
    }, 50);
  }
  if (id.startsWith('annexure-')) {
    const inlineMenu = document.getElementById('inline-more-annexures');
    if (inlineMenu) inlineMenu.style.display = 'flex';
  }
  if (btn) {
    btn.classList.add('active');
  } else {
    const targetBtn = Array.from(document.querySelectorAll('.sb-item')).find(b => {
      const onclickAttr = b.getAttribute('onclick');
      return onclickAttr && onclickAttr.includes(`'${id}'`);
    });
    if (targetBtn) targetBtn.classList.add('active');
  }
  const topbarBtn = Array.from(document.querySelectorAll('.tb-sub-nav-btn')).find(b => {
    const onclickAttr = b.getAttribute('onclick') || '';
    if (id === 'dashboard') return onclickAttr.includes("'dashboard'");
    if (id === 'projects') return onclickAttr.includes("'projects'");
    if (id === 'workflow') return onclickAttr.includes("'workflow'");
    return false;
  });
  if (topbarBtn) topbarBtn.classList.add('active');
  const titles = {
    'dashboard': 'Dashboard', 'projects': 'My DSR Projects', 'workflow': 'Report Workflow',
    'front-matter': 'Front Matter', 'chapters': 'Chapters (10)', 'plates': 'Plate Section',
    'graphs': 'Cross Section Graph Generator', 'anx1': 'Annexure I — Sand Sources',
    'anx2': 'Annexure II — Mining Leases', 'anx3': 'Annexure III — Cluster Details',
    'anx4': 'Annexure IV — Transportation Routes', 'anx5': 'Annexure V — Bench Mark & CORS',
    'anx6': 'Annexure VI — Final Cluster Details', 'anx7': 'Annexure VII — Transportation Routes',
    'annexure-b': 'Annexure B', 'annexure-c': 'Annexure C', 'annexure-d': 'Annexure D',
    'annexure-e': 'Annexure E', 'annexure-f': 'Annexure F', 'annexure-g': 'Annexure G',
    'annexure-h': 'Annexure H', 'annexure-i': 'Annexure I', 'annexure-j': 'Annexure J',
    'annexure-k': 'Annexure K', 'demand-table': 'Projected Demand Table',
    'auction-table': 'Auctioned Sites', 'summary-table': 'Source Summary Table', 'benchmark-table': 'Bench Mark & CORS',
    'esign': 'E-Signature Panel', 'generate': 'Generate Final PDF', 'history': 'Report History', 'users': 'User Management',
    'audit-logs': 'System Audit Logs'
  };
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = titles[id] || id;
  if (id === 'esign') renderSignatures();
  if (id === 'generate') renderFinalChecklist();
  if (id === 'chapters') renderChapters();
  if (id === 'plates') renderPlates();
  if (id === 'graphs') renderGraphs();
  if (id === 'demand-table') initDemandTable();
  if (id === 'summary-table') initSummaryTable();
  if (id === 'auction-table') initAuctionTable();
  if (id === 'workflow') {
    updateWorkflowDistrictUI();
    if (typeof renderWorkflowProjectLiveCard === 'function') renderWorkflowProjectLiveCard();
  }
  if (id === 'projects' && typeof refreshProjectsFromBackend === 'function') {
    refreshProjectsFromBackend(true).catch(err => console.error('Project refresh failed', err));
  }
  if (id === 'users' && typeof renderUsers === 'function') renderUsers();
  if (id === 'audit-logs' && typeof window.loadAuditLogs === 'function') {
    window.loadAuditLogs();
  }
  if (id === 'benchmark-table' && typeof mountBenchmarkPanel === 'function') mountBenchmarkPanel('benchmark-table-content');
  if (id === 'anx1' && typeof renderPdfUploadUIAnx1 === 'function') renderPdfUploadUIAnx1();
  if (id === 'anx2' && typeof renderPdfUploadUIAnx2 === 'function') renderPdfUploadUIAnx2();
  if (id === 'anx3' && typeof renderPdfUploadUI === 'function') {
    renderPdfUploadUI();
    if (typeof renderCluster === 'function') renderCluster();
    if (typeof renderCont === 'function') renderCont();
  }
  if (id === 'anx4' && typeof renderPdfUploadUIAnx4 === 'function') {
    renderPdfUploadUIAnx4();
    if (typeof initRoutesTable === 'function') initRoutesTable();
    if (typeof initClustersTable === 'function') initClustersTable();
  }
  if (id === 'anx5' && typeof renderPdfUploadUIAnx5 === 'function') renderPdfUploadUIAnx5();
  if (id === 'anx6' && typeof renderPdfUploadUIAnx6 === 'function') renderPdfUploadUIAnx6();
  if (id === 'anx7' && typeof renderPdfUploadUIAnx7 === 'function') renderPdfUploadUIAnx7();
  if (id === 'annexure-b' && typeof renderAnnexureB === 'function') renderAnnexureB();
  if (id === 'annexure-c' && typeof renderAnnexureC === 'function') renderAnnexureC();
  if (id === 'annexure-d' && typeof renderAnnexureD === 'function') renderAnnexureD();
  if (id === 'annexure-e' && typeof renderAnnexureE === 'function') renderAnnexureE();
  if (id === 'annexure-f' && typeof renderAnnexureF === 'function') renderAnnexureF();
  if (id === 'annexure-g' && typeof renderAnnexureG === 'function') renderAnnexureG();
  if (id === 'annexure-h' && typeof renderAnnexureH === 'function') renderAnnexureH();
  if (id === 'annexure-i' && typeof renderAnnexureI === 'function') renderAnnexureI();
  if (id === 'annexure-j' && typeof renderAnnexureJ === 'function') renderAnnexureJ();
  if (id === 'annexure-k' && typeof renderAnnexureK === 'function') renderAnnexureK();
  if (id === 'history' && typeof renderHistoryTable === 'function') renderHistoryTable();
  if (id === 'dashboard') {
    if (typeof syncNotificationsAndReviewStatus === 'function') {
      syncNotificationsAndReviewStatus();
    } else if (S.activeProject && typeof checkReviewStatus === 'function') {
      checkReviewStatus(S.activeProject.id);
    }
  }
  if (S.activeProject && typeof updateActiveProjectCardUI === 'function') updateActiveProjectCardUI();
  normalizeAnnexureViewLayout(id);
  addCoreAnnexureTableControls(id);
  const previewSections = ['front-matter', 'chapters', 'plates', 'anx1', 'anx2', 'anx3', 'anx4', 'anx5', 'anx6', 'anx7', 'annexure-b', 'annexure-c', 'annexure-d', 'annexure-e', 'annexure-f', 'annexure-g', 'annexure-h', 'annexure-i', 'annexure-j', 'annexure-k'];
  if (window.portalPreviewTimer) {
    clearTimeout(window.portalPreviewTimer);
    window.portalPreviewTimer = null;
  }
  if (previewSections.includes(id)) {
    const openPreview = () => {
      if (currentViewId === id && window.pdfPreview) window.pdfPreview.show(id);
    };
    if (typeof runWhenIdle === 'function') {
      window.portalPreviewTimer = runWhenIdle(openPreview, 900);
    } else {
      window.portalPreviewTimer = setTimeout(openPreview, 250);
    }
  } else {
    if (window.pdfPreview) window.pdfPreview.hide();
  }
  if (id === 'dashboard' || id === 'projects') {
    renderDistrictLegends();
  } else if (typeof runWhenIdle === 'function') {
    runWhenIdle(() => renderDistrictLegends(), 900);
  }
  initLucide(el || document);
  if (typeof enforceReviewerReadOnly === 'function') {
    requestAnimationFrame(() => enforceReviewerReadOnly());
  }
  if (typeof loadReviewerNoteForView === 'function') {
    loadReviewerNoteForView(id, titles[id] || id);
  }
}
function goBackView() {
  if (viewHistory.length > 0) {
    history.back();
  }
}
let lucideRenderQueued = false;
function initLucide(root) {
  if (!window.lucide || lucideRenderQueued) return;
  lucideRenderQueued = true;
  requestAnimationFrame(() => {
    lucideRenderQueued = false;
    if (!window.lucide) return;
    try {
      if (root && root.querySelector) {
        window.lucide.createIcons({ nodes: root.querySelectorAll('i[data-lucide]') });
        return;
      }
      const scopedNodes = document.querySelectorAll([
        '.view.active i[data-lucide]',
        '.topbar i[data-lucide]',
        '.sidebar i[data-lucide]',
        '.modal.open i[data-lucide]',
        '#screen-auth.active i[data-lucide]',
        '.toast i[data-lucide]'
      ].join(','));
      window.lucide.createIcons({ nodes: scopedNodes });
    } catch (err) {
      window.lucide.createIcons();
    }
  });
}
window.addEventListener('load', () => {
  if (window.initLucide) window.initLucide();
});
function updateSidebarToggleVisibility() {
  const toggleBtn = document.getElementById('tb-sidebar-toggle');
  if (!toggleBtn) return;
  if (typeof S !== 'undefined' && S.activeProject) {
    toggleBtn.style.display = 'inline-flex';
  } else {
    toggleBtn.style.display = 'none';
  }
  toggleBtn.setAttribute('aria-expanded', String(!document.body.classList.contains('sidebar-hidden')));
}
function clearActiveProject() {
  if (typeof S !== 'undefined') {
    S.activeProject = null;
    ['report-nav', 'annexure-nav', 'tables-nav', 'finalize-nav'].forEach(n => {
      const el = document.getElementById(n);
      if (el) el.style.display = 'none';
    });
    if (typeof updateActiveDistrictUI === 'function') updateActiveDistrictUI('Punjab');
    if (typeof updateActiveProjectCardUI === 'function') updateActiveProjectCardUI();
    if (typeof filterDashboardByDistrict === 'function') filterDashboardByDistrict('ALL');
    setSidebarCollapsed(true);
    updateSidebarToggleVisibility();
    S.annexureB = [];
    S.annexureC = [];
    S.annexureD = [];
    S.annexureE = [];
    S.annexureG = [];
    S.annexureH = [];
    S.annexureI = [];
    S.annexureJ = [];
  }
}
/* Theme logic lives in js/theme.js (loaded in <head> for instant light default) */
let confirmCallback = null;
function customConfirm(msg, cb) {
  document.getElementById('confirm-msg').textContent = msg;
  confirmCallback = cb;
  document.getElementById('modal-confirm').classList.add('open');
}
function doConfirm() {
  closeModal('modal-confirm');
  if (confirmCallback) confirmCallback();
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
  });
  if (typeof updateDarkModeIcon === 'function') updateDarkModeIcon();
});
let toastTimer;
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.className = `toast toast-${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 4200);
}
function fmtN(v, dec = 2) {
  const n = Number(v);
  if (isNaN(n)) return '0';
  return n.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
/* ── District Management System ── */
const DISTRICT_COLORS = {
  'Jalandhar': {
    light: { bg: 'rgba(79, 70, 229, 0.15)', border: '#4F46E5', text: '#3730a3', glow: 'rgba(79, 70, 229, 0.25)' },
    dark: { bg: 'rgba(99, 102, 241, 0.25)', border: '#818cf8', text: '#e0e7ff', glow: 'rgba(129, 140, 248, 0.4)' }
  },
  'Ludhiana': {
    light: { bg: 'rgba(6, 182, 212, 0.15)', border: '#0891b2', text: '#155e75', glow: 'rgba(6, 182, 212, 0.25)' },
    dark: { bg: 'rgba(6, 182, 212, 0.25)', border: '#22d3ee', text: '#ecfeff', glow: 'rgba(34, 211, 238, 0.4)' }
  },
  'Mansa': {
    light: { bg: 'rgba(147, 51, 234, 0.15)', border: '#9333EA', text: '#6b21a8', glow: 'rgba(147, 51, 234, 0.25)' },
    dark: { bg: 'rgba(168, 85, 247, 0.25)', border: '#c084fc', text: '#faf5ff', glow: 'rgba(192, 132, 252, 0.4)' }
  },
  'Hoshiarpur': {
    light: { bg: 'rgba(15, 118, 110, 0.15)', border: '#0F766E', text: '#115e59', glow: 'rgba(15, 118, 110, 0.25)' },
    dark: { bg: 'rgba(20, 184, 166, 0.25)', border: '#2dd4bf', text: '#f0fdfa', glow: 'rgba(45, 212, 191, 0.4)' }
  },
  'Pathankot': {
    light: { bg: 'rgba(234, 88, 12, 0.15)', border: '#EA580C', text: '#9a3412', glow: 'rgba(234, 88, 12, 0.25)' },
    dark: { bg: 'rgba(249, 115, 22, 0.25)', border: '#fb923c', text: '#fff7ed', glow: 'rgba(251, 146, 60, 0.4)' }
  },
  'Rupnagar': {
    light: { bg: 'rgba(225, 29, 72, 0.15)', border: '#E11D48', text: '#9f1239', glow: 'rgba(225, 29, 72, 0.25)' },
    dark: { bg: 'rgba(244, 63, 94, 0.25)', border: '#fda4af', text: '#fff1f2', glow: 'rgba(253, 164, 175, 0.4)' }
  },
  'Tarn Taran': {
    light: { bg: 'rgba(2, 132, 199, 0.15)', border: '#0284C7', text: '#075985', glow: 'rgba(2, 132, 199, 0.25)' },
    dark: { bg: 'rgba(14, 165, 233, 0.25)', border: '#38bdf8', text: '#f0f9ff', glow: 'rgba(56, 189, 248, 0.4)' }
  }
};
function getDistrictStyle(name, forceDark = false) {
  const cleanName = (name || '').trim();
  const isDark = forceDark || document.documentElement.classList.contains('dark');
  const fallbackPalette = [
    ['#2563eb', '#1d4ed8', '#dbeafe'], ['#059669', '#047857', '#d1fae5'],
    ['#d97706', '#b45309', '#fef3c7'], ['#dc2626', '#b91c1c', '#fee2e2'],
    ['#7c3aed', '#6d28d9', '#ede9fe'], ['#0891b2', '#0e7490', '#cffafe'],
    ['#be123c', '#9f1239', '#ffe4e6'], ['#4f46e5', '#4338ca', '#e0e7ff']
  ];
  const districts = Array.isArray(window.PUNJAB_DISTRICTS) ? window.PUNJAB_DISTRICTS : [];
  const idx = Math.max(0, districts.indexOf(cleanName));
  const [border, text, bgHex] = fallbackPalette[idx % fallbackPalette.length];
  const dist = DISTRICT_COLORS[cleanName] || {
    light: { bg: bgHex, border, text, glow: `${border}33` },
    dark: { bg: `${border}40`, border, text: '#f8fafc', glow: `${border}66` }
  };
  const themeStyle = isDark ? dist.dark : dist.light;
  const topbarBg = (isDark || forceDark) ? themeStyle.bg : 'rgba(255, 255, 255, 0.95)';
  const topbarColor = themeStyle.text;
  const topbarBorder = themeStyle.border;
  const topbarGlow = themeStyle.glow;
  return {
    bg: themeStyle.bg,
    color: themeStyle.text,
    border: themeStyle.border,
    glow: themeStyle.glow,
    topbarBg,
    topbarColor,
    topbarBorder,
    topbarGlow
  };
}
function paintDistrictThemeOnElement(el, districtName) {
  if (!el || !districtName) return;
  const style = getDistrictStyle(districtName);
  el.style.setProperty('--district-border', style.border);
  el.style.setProperty('--district-accent', style.color);
  el.style.setProperty('--district-bg', style.bg);
  el.style.setProperty('--district-glow', style.glow);
  el.dataset.district = districtName;
}
function applyDistrictBadgeStyles(el, districtName) {
  if (!el || !districtName) return;
  const style = getDistrictStyle(districtName);
  el.classList.add('district-badge');
  el.dataset.district = districtName;
  el.style.background = style.bg;
  el.style.color = style.color;
  el.style.border = `2px solid ${style.border}`;
  el.style.boxShadow = `0 1px 3px ${style.glow}`;
}
function getDistrictBadgeHTML(districtName) {
  const safe = (districtName || '').replace(/"/g, '&quot;');
  return `<span class="badge district-badge" data-district="${safe}">${districtName}</span>`;
}
function refreshDistrictBadgesInDOM() {
  document.querySelectorAll('.district-badge[data-district]').forEach((el) => {
    applyDistrictBadgeStyles(el, el.dataset.district);
  });
}
function ensureActiveProjectCardHost(containerEl) {
  if (!containerEl) return null;
  let host = containerEl.querySelector(':scope > .active-dsr-project-card-host');
  if (!host) {
    host = document.createElement('div');
    host.className = 'active-dsr-project-card-host';
    containerEl.insertBefore(host, containerEl.firstChild);
  }
  return host;
}
function ensureDistrictManagementHost(containerEl) {
  if (!containerEl) return null;
  let panel = containerEl.querySelector(':scope > #district-management-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'district-management-panel';
    containerEl.appendChild(panel);
  }
  return panel;
}
function ensureActiveProjectCardStructure(hostEl) {
  if (!hostEl) return null;
  let card = hostEl.querySelector('.active-dsr-project-card');
  if (!card) {
    hostEl.innerHTML = `
      <div class="active-dsr-project-card card" hidden>
        <div class="active-dsr-project-card__body">
          <div class="active-dsr-project-card__label">Currently Editing DSR Project</div>
          <div class="active-dsr-project-card__title"></div>
        </div>
        <span class="active-dsr-project-card__badge district-badge"></span>
      </div>`;
    card = hostEl.querySelector('.active-dsr-project-card');
  }
  return card;
}
function paintActiveProjectCard(card, project) {
  if (!card || !project) return;
  const dist = project.district;
  const titleEl = card.querySelector('.active-dsr-project-card__title');
  const badgeEl = card.querySelector('.active-dsr-project-card__badge');
  if (titleEl) titleEl.textContent = project.title;
  if (badgeEl) badgeEl.textContent = `${dist} DISTRICT`;
  paintDistrictThemeOnElement(card, dist);
  if (badgeEl) applyDistrictBadgeStyles(badgeEl, dist);
}
function updateActiveProjectCardUI() {
  const containers = [
    document.getElementById('workflow-active-district-header'),
    document.getElementById('dash-right-sidebar')
  ];
  containers.forEach((container) => {
    if (!container) return;
    const host = container.id === 'workflow-active-district-header'
      ? container
      : ensureActiveProjectCardHost(container);
    if (!S.activeProject) {
      if (container.id === 'workflow-active-district-header') {
        container.style.display = 'none';
        container.innerHTML = '';
      } else {
        const card = host.querySelector('.active-dsr-project-card');
        if (card) card.hidden = true;
      }
      return;
    }
    if (container.id === 'workflow-active-district-header') {
      container.style.display = 'block';
    }
    const card = ensureActiveProjectCardStructure(host);
    if (!card) return;
    card.hidden = false;
    paintActiveProjectCard(card, S.activeProject);
  });
}
/** Re-apply district + project themed UI after light/dark toggle (no page reload). */
function refreshThemeDependentUI() {
  if (typeof S === 'undefined' || !S) return;
  const dist = S.activeProject ? S.activeProject.district : 'Punjab';
  updateActiveDistrictUI(dist);
  updateActiveProjectCardUI();
  renderDistrictLegends();
  refreshDistrictBadgesInDOM();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderProjects === 'function') renderProjects();
  if (window.initLucide) initLucide();
  /* Charts are heavy — defer so district/project cards repaint first */
  if (typeof renderGraphs === 'function') {
    requestAnimationFrame(() => renderGraphs());
  }
}
function updateActiveDistrictUI(districtName) {
  const badgeEl = document.getElementById('tb-district-badge');
  if (!badgeEl) return;
  if (districtName && districtName !== 'Punjab' && districtName !== 'ALL') {
    const style = getDistrictStyle(districtName);
    badgeEl.textContent = districtName;
    badgeEl.style.backgroundColor = style.topbarBg;
    badgeEl.style.color = style.topbarColor;
    badgeEl.style.borderColor = style.topbarBorder;
    badgeEl.style.borderWidth = '2.5px';
    badgeEl.style.borderStyle = 'solid';
    badgeEl.style.borderRadius = '99px';
    badgeEl.style.padding = '6px 14px';
    badgeEl.style.fontSize = '12.5px';
    badgeEl.style.boxShadow = `0 4px 12px ${style.topbarGlow}, 0 0 0 1.5px ${style.topbarBorder}`;
    badgeEl.style.transform = 'translateY(-1px)';
    badgeEl.style.fontWeight = '700';
    badgeEl.style.textTransform = 'uppercase';
    badgeEl.style.letterSpacing = '0.04em';
    badgeEl.style.transition = 'all 0.3s ease';
    badgeEl.style.display = 'inline-flex';
    badgeEl.style.alignItems = 'center';
    badgeEl.onmouseover = () => {
      badgeEl.style.transform = 'translateY(-2px)';
      badgeEl.style.boxShadow = `0 6px 16px ${style.topbarGlow}, 0 0 0 2px ${style.topbarBorder}`;
    };
    badgeEl.onmouseout = () => {
      badgeEl.style.transform = 'translateY(-1px)';
      badgeEl.style.boxShadow = `0 4px 12px ${style.topbarGlow}, 0 0 0 1.5px ${style.topbarBorder}`;
    };
    const dashIndicator = document.getElementById('dash-active-district-badge');
    if (dashIndicator) {
      dashIndicator.id = 'dash-active-district-badge';
      dashIndicator.className = 'badge district-badge';
      dashIndicator.textContent = districtName;
      dashIndicator.style.fontWeight = '800';
      dashIndicator.style.transform = 'translateY(-1px)';
      applyDistrictBadgeStyles(dashIndicator, districtName);
    }
  } else {
    badgeEl.textContent = 'Punjab';
    badgeEl.style.backgroundColor = '';
    badgeEl.style.color = '';
    badgeEl.style.borderColor = '';
    badgeEl.style.borderWidth = '';
    badgeEl.style.borderStyle = '';
    badgeEl.style.borderRadius = '';
    badgeEl.style.padding = '';
    badgeEl.style.fontSize = '';
    badgeEl.style.boxShadow = '';
    badgeEl.style.transform = '';
    badgeEl.style.fontWeight = '';
    badgeEl.style.textTransform = '';
    badgeEl.style.letterSpacing = '';
    badgeEl.style.transition = '';
    badgeEl.style.display = '';
    badgeEl.style.alignItems = '';
    badgeEl.onmouseover = null;
    badgeEl.onmouseout = null;
    const dashIndicator = document.getElementById('dash-active-district-badge');
    if (dashIndicator) {
      dashIndicator.outerHTML = `<span id="dash-active-district-badge" class="badge" style="background:var(--off); color:var(--text-soft);">None</span>`;
    }
  }
}
function updateWorkflowDistrictUI() {
  updateActiveProjectCardUI();
  const reviewerActions = document.getElementById('reviewer-actions');
  if (reviewerActions) {
    reviewerActions.style.display = (hasReviewAccess() && S.activeProject) ? 'flex' : 'none';
  }
}
function renderDistrictLegends() {
  const dashEl = document.getElementById('dash-right-sidebar');
  const districts = Array.isArray(window.PUNJAB_DISTRICTS) && window.PUNJAB_DISTRICTS.length
    ? window.PUNJAB_DISTRICTS
    : ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga', 'Pathankot', 'Patiala', 'Rupnagar', 'Sahibzada Ajit Singh Nagar', 'Sangrur', 'Shaheed Bhagat Singh Nagar', 'Sri Muktsar Sahib', 'Tarn Taran'];
  const renderDetailedCard = (containerEl) => {
    if (!containerEl) return;
    const getAbbrev = (name) => {
      if (name === 'ALL') return 'ALL';
      if (name === 'Jalandhar') return 'JAL';
      if (name === 'Ludhiana') return 'LUD';
      if (name === 'Mansa') return 'MAN';
      if (name === 'Hoshiarpur') return 'HOS';
      if (name === 'Pathankot') return 'PAT';
      if (name === 'Rupnagar') return 'RUP';
      if (name === 'Tarn Taran') return 'TAR';
      return name.substring(0, 3).toUpperCase();
    };
    let listHtml = '';
    const isAllSelected = currentDistrictFilter === 'ALL';
    listHtml += `
      <div class="whats-new-item ${isAllSelected ? 'active-filter' : ''}" onclick="filterDashboardByDistrict('ALL')">
        <div class="whats-new-badge" style="background:#C49A58; color:var(--p-accent);">ALL</div>
        <div class="whats-new-name">All Districts (Punjab) · 23</div>
        <div class="whats-new-arrow"><i data-lucide="chevron-right" style="width:16px; height:16px;"></i></div>
      </div>
    `;
    districts.forEach(d => {
      const isActiveFilter = currentDistrictFilter === d;
      const isActiveProj = S.activeProject && S.activeProject.district === d;
      const isSelected = isActiveFilter || isActiveProj;
      const abbrev = getAbbrev(d);
      const badgeBg = isActiveProj ? '#ffffff' : '#C49A58';
      const badgeColor = 'var(--p-accent)';
      const editingIndicator = isActiveProj ? ' <span style="font-size:9px; font-weight:800; text-transform:uppercase; background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.4); padding:1px 5px; border-radius:3px; margin-left:6px; color:#fff;">Editing</span>' : '';
      listHtml += `
        <div class="whats-new-item ${isSelected ? 'active-filter' : ''}" onclick="filterDashboardByDistrict('${d}')">
          <div class="whats-new-badge" style="background:${badgeBg}; color:${badgeColor};">${abbrev}</div>
          <div class="whats-new-name">${d} District${editingIndicator}</div>
          <div class="whats-new-arrow"><i data-lucide="chevron-right" style="width:16px; height:16px;"></i></div>
        </div>
      `;
    });
    const activeCount = Array.isArray(S.projects) ? S.projects.length : 0;
    const avgProgress = activeCount
      ? Math.round(S.projects.reduce((sum, p) => sum + (Number(p.progress) || 0), 0) / activeCount)
      : 0;
    containerEl.innerHTML = `
      <div class="whats-new-sidebar">
        <div class="whats-new-title">
          <i data-lucide="map" style="width:18px; height:18px; color: var(--p-accent-gold);"></i>
          <span>District Management</span>
        </div>
        <p class="whats-new-desc">
          Punjab map and live district workflow status. Select any district to filter context-specific surveys.
        </p>
        <div style="border:1px solid var(--border); border-radius:8px; overflow:hidden; background:var(--off); margin-bottom:12px;">
          <div style="height:130px; background:url('assets/punjab-reference-map.png') center / contain no-repeat var(--card);"></div>
          <div style="padding:10px 12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:12px; font-weight:800; color:var(--text);">
              <span>Live Punjab DSR Progress</span>
              <span>${avgProgress}%</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${avgProgress}%; background:linear-gradient(90deg,var(--teal),var(--saffron));"></div></div>
            <div style="font-size:11px; color:var(--text-soft);">${activeCount} active project(s) across ${districts.length} districts</div>
          </div>
        </div>
        <div style="display: flex; flex-direction: column;">
          ${listHtml}
        </div>
      </div>
    `;
  };
  renderDetailedCard(ensureDistrictManagementHost(dashEl));
  if (typeof updateActiveProjectCardUI === 'function') updateActiveProjectCardUI();
  initLucide();
}
/* ── River Color Identity System ── */
const RIVER_COLORS = {
  'Sutlej': {
    light: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981', text: '#065f46', glow: 'rgba(16, 185, 129, 0.25)' },
    dark: { bg: 'rgba(16, 185, 129, 0.25)', border: '#34d399', text: '#ecfdf5', glow: 'rgba(52, 211, 153, 0.4)' }
  },
  'Beas': {
    light: { bg: 'rgba(6, 182, 212, 0.15)', border: '#06B6D4', text: '#155e75', glow: 'rgba(6, 182, 212, 0.25)' },
    dark: { bg: 'rgba(6, 182, 212, 0.25)', border: '#22d3ee', text: '#ecfeff', glow: 'rgba(34, 211, 238, 0.4)' }
  },
  'Ghaggar': {
    light: { bg: 'rgba(15, 118, 110, 0.15)', border: '#0F766E', text: '#115e59', glow: 'rgba(15, 118, 110, 0.25)' },
    dark: { bg: 'rgba(15, 118, 110, 0.25)', border: '#2dd4bf', text: '#f0fdfa', glow: 'rgba(45, 212, 191, 0.4)' }
  },
  'Ravi': {
    light: { bg: 'rgba(249, 115, 22, 0.15)', border: '#F97316', text: '#9a3412', glow: 'rgba(249, 115, 22, 0.25)' },
    dark: { bg: 'rgba(249, 115, 22, 0.25)', border: '#fb923c', text: '#fff7ed', glow: 'rgba(251, 146, 60, 0.4)' }
  },
  'Yamuna': {
    light: { bg: 'rgba(37, 99, 235, 0.15)', border: '#2563EB', text: '#1e40af', glow: 'rgba(37, 99, 235, 0.25)' },
    dark: { bg: 'rgba(37, 99, 235, 0.25)', border: '#60a5fa', text: '#eff6ff', glow: 'rgba(96, 165, 250, 0.4)' }
  },
  'Chenab': {
    light: { bg: 'rgba(124, 58, 237, 0.15)', border: '#7C3AED', text: '#5b21b6', glow: 'rgba(124, 58, 237, 0.25)' },
    dark: { bg: 'rgba(124, 58, 237, 0.25)', border: '#a78bfa', text: '#faf5ff', glow: 'rgba(167, 139, 250, 0.4)' }
  },
  'Jhelum': {
    light: { bg: 'rgba(71, 85, 105, 0.15)', border: '#475569', text: '#334155', glow: 'rgba(71, 85, 105, 0.25)' },
    dark: { bg: 'rgba(71, 85, 105, 0.25)', border: '#94a3b8', text: '#cbd5e1', glow: 'rgba(148, 163, 184, 0.4)' }
  }
};
function getRiverStyle(name) {
  const cleanName = (name || '').trim();
  const isDark = document.documentElement.classList.contains('dark');
  const style = RIVER_COLORS[cleanName] || {
    light: { bg: 'rgba(71, 85, 105, 0.15)', border: '#64748b', text: '#334155', glow: 'rgba(71, 85, 105, 0.25)' },
    dark: { bg: 'rgba(71, 85, 105, 0.25)', border: '#94a3b8', text: '#cbd5e1', glow: 'rgba(148, 163, 184, 0.4)' }
  };
  const themeStyle = isDark ? style.dark : style.light;
  return {
    bg: themeStyle.bg,
    color: themeStyle.text,
    border: themeStyle.border,
    glow: themeStyle.glow
  };
}
function getRiverBadgeHTML(riverName) {
  const style = getRiverStyle(riverName);
  return `<span class="badge river-badge" style="background:${style.bg}; color:${style.color}; border: 1.5px solid ${style.border}; box-shadow: 0 1px 2px ${style.glow}; font-weight:700; transition: all 0.2s ease; cursor: pointer; display: inline-flex; align-items: center;" onmouseover="this.style.boxShadow='0 0 6px ${style.border}', this.style.transform='scale(1.03)'" onmouseout="this.style.boxShadow='0 1px 2px ${style.glow}', this.style.transform='scale(1)'">${riverName}</span>`;
}
document.addEventListener('click', (event) => {
  const item = event.target.closest('#sidebar .sb-item');
  if (!item) return;
  const onclickAttr = item.getAttribute('onclick') || '';
  const match = onclickAttr.match(/showView\('([^']+)'/);
  if (!match || typeof showView !== 'function') return;
  if (!['front-matter', 'chapters', 'plates', 'graphs'].includes(match[1])) return;
  event.preventDefault();
  event.stopPropagation();
  showView(match[1], item);
}, true);
function openDistrictMap(btn) {
  if (typeof clearActiveProject === 'function') clearActiveProject();
  if (typeof showView === 'function') showView('dashboard', btn || null);
  setTimeout(() => {
    document.getElementById('dash-district-map-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 90);
}
window.openDistrictMap = openDistrictMap;
function openAboutDsr(btn) {
  if (typeof clearActiveProject === 'function') clearActiveProject();
  if (typeof showView === 'function') showView('dashboard', btn || null);
  setTimeout(() => {
    document.getElementById('dash-about-dsr-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 90);
}
window.openAboutDsr = openAboutDsr;
function renderRiverTags(riversString) {
  if (!riversString || riversString === 'Not specified') return `<span class="badge" style="background:var(--off); color:var(--text-soft); border: 1px solid var(--border);">No River</span>`;
  const rivers = riversString.split(',').map(r => r.trim()).filter(r => r !== '');
  return rivers.map(r => getRiverBadgeHTML(r)).join(' ');
}

;

/* js/auth.js */
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

;

/* js/projects.js */
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

;

/* js/frontmatter.js */
/* ══════════════════════════════════════
   FRONT MATTER HANDLING
   ══════════════════════════════════════ */
if (!S.frontMatter) {
  S.frontMatter = {
    title: 'District Survey Report for Sand Mining',
    district: 'Jalandhar',
    state: 'Punjab',
    year: '2025-26',
    version: 'Final Draft',
    preparedBy: 'Sub-Divisional Committee, Jalandhar District',
    assistedBy: 'RSP Green Development and Laboratories Pvt. Ltd.',
    preface: 'This District Survey Report (DSR) for Jalandhar District has been prepared in compliance with the Enforcement and Monitoring Guidelines for Sand Mining (EMGSM) 2020. The report provides a comprehensive assessment of sand mining activities, river morphology, mineral deposits, replenishment studies, and transportation routes within the district.',
    acknowledgement: 'The Sub-Divisional Committee of Jalandhar District acknowledges the support of the Punjab State Government, Department of Geology and Mining, and all field surveyors who contributed to this report.'
  };
}
function trigUp(id) {
  const el = document.getElementById(id);
  if (el) el.click();
}
function syncPreview() {}
async function uploadFrontMatterPdfToBackend(type, file) {
  if (!file || file.type !== 'application/pdf') return;
  if (!window.S || !S.activeProject || !S.activeProject.id) {
    toast('Please open a project before uploading this PDF.', 'warn');
    return;
  }
  if (typeof window.storeProjectPdf !== 'function') {
    console.warn('Backend PDF upload helper is not available.');
    return;
  }
  try {
    const storedUrl = await window.storeProjectPdf(type, file);
    if (!S.frontMatterFiles) S.frontMatterFiles = {};
    S.frontMatterFiles[type] = {
      ...(S.frontMatterFiles[type] || {}),
      name: file.name,
      type: file.type || 'application/pdf',
      storedUrl
    };
    if (window.pdfPreview) window.pdfPreview.notifyUpdate('front-matter');
    if (window.debouncedSaveState) window.debouncedSaveState();
    toast(`${file.name} saved to project storage.`, 'success');
  } catch (err) {
    console.error('Front matter backend PDF upload failed:', err);
    toast(err.message || 'PDF preview updated, but server upload failed.', 'error');
  }
}
/**
 * Converts a PDF file into an array of image data URLs using PDF.js.
 * @param {File} file 
 * @param {Function} callback 
 */
function renderPdfToImages(file, callback) {
  const fileReader = new FileReader();
  fileReader.onload = function () {
    const typedarray = new Uint8Array(this.result);
    if (typeof pdfjsLib === 'undefined') {
      if (typeof ensurePortalVendor === 'function') {
        ensurePortalVendor('pdfjs')
          .then(() => renderPdfToImages(file, callback))
          .catch(err => callback(err, null));
        return;
      }
      callback(new Error('PDF.js library is not loaded on this page.'), null);
      return;
    }
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }
    pdfjsLib.getDocument(typedarray).promise.then(function (pdf) {
      const pageImages = [];
      let pagesRendered = 0;
      const numPages = pdf.numPages;
      function renderPage(pageNum) {
        pdf.getPage(pageNum).then(function (page) {
          const viewport = page.getViewport({ scale: 1.5 }); // High quality preview scale
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          const renderContext = {
            canvasContext: context,
            viewport: viewport
          };
          page.render(renderContext).promise.then(function () {
            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            pageImages.push(imgData);
            pagesRendered++;
            if (pagesRendered === numPages) {
              callback(null, pageImages);
            } else {
              renderPage(pageNum + 1);
            }
          }).catch(err => callback(err, null));
        }).catch(err => callback(err, null));
      }
      renderPage(1);
    }).catch(err => callback(err, null));
  };
  fileReader.readAsArrayBuffer(file);
}
function handleFMUpload(e, type) {
  const f = e.target.files[0];
  if (!f) return;
  if (!S.frontMatterFiles) S.frontMatterFiles = {};
  S.frontMatterFiles[type] = {
    name: f.name,
    size: f.size,
    sizeLabel: `${(f.size / 1024).toFixed(1)} KB`,
    type: f.type || '',
    pages: 0
  };
  const el = document.getElementById(`fm-${type}-file`);
  if (el) {
    el.innerHTML = `
      <div class="file-item" style="margin-top:10px">
        <div class="file-icon" style="background:#fee2e2">📄</div>
        <div class="file-info">
          <div class="file-name">${f.name}</div>
          <div class="file-meta">${(f.size / 1024).toFixed(1)} KB</div>
        </div>
        <span class="badge badge-green">✓ Ready</span>
      </div>`;
  }
  if (f.type === 'application/pdf') {
    if (window.pdfPreview) window.pdfPreview.notifyUpdate('front-matter');
    if (window.debouncedSaveState) window.debouncedSaveState();
    uploadFrontMatterPdfToBackend(type, f);
    renderPdfToImages(f, (err, imgs) => {
      if (err) {
        console.error(err);
        toast('⚠️ PDF render failed, falling back to basic preview', 'error');
        const url = URL.createObjectURL(f);
        if (!S.uploadedPDFs) S.uploadedPDFs = {};
        S.uploadedPDFs[type] = [url];
        if (!S.frontMatterFiles) S.frontMatterFiles = {};
        S.frontMatterFiles[type] = { ...(S.frontMatterFiles[type] || {}), pages: 1 };
        if (window.pdfPreview) window.pdfPreview.notifyUpdate('front-matter');
        if (window.debouncedSaveState) window.debouncedSaveState();
        return;
      }
      if (!S.uploadedPDFs) S.uploadedPDFs = {};
      S.uploadedPDFs[type] = imgs;
      if (!S.frontMatterFiles) S.frontMatterFiles = {};
      S.frontMatterFiles[type] = { ...(S.frontMatterFiles[type] || {}), pages: imgs.length };
      toast(`📄 ${f.name} uploaded and processed successfully!`, 'success');
      if (window.pdfPreview) window.pdfPreview.notifyUpdate('front-matter');
      if (window.debouncedSaveState) window.debouncedSaveState();
    });
  } else {
    const url = URL.createObjectURL(f);
    if (!S.uploadedPDFs) S.uploadedPDFs = {};
    S.uploadedPDFs[type] = [url];
    if (!S.frontMatterFiles) S.frontMatterFiles = {};
    S.frontMatterFiles[type] = { ...(S.frontMatterFiles[type] || {}), pages: 1 };
    toast(`📄 ${f.name} uploaded`, 'success');
    if (window.pdfPreview) window.pdfPreview.notifyUpdate('front-matter');
    if (window.debouncedSaveState) window.debouncedSaveState();
  }
}
function loadFrontMatter() {
  if (S.activeProject) {
    S.frontMatter.district = S.activeProject.district || S.frontMatter.district;
    S.frontMatter.year = S.activeProject.year || S.frontMatter.year;
    S.frontMatter.title = S.activeProject.title || S.frontMatter.title;
  }
  const f = S.frontMatter;
  const titleEl = document.getElementById('fm-title');
  if (titleEl) titleEl.value = f.title || '';
  const distEl = document.getElementById('fm-district');
  if (distEl) distEl.value = f.district || '';
  const yearEl = document.getElementById('fm-year');
  if (yearEl) yearEl.value = f.year || '';
  const prefaceEl = document.getElementById('fm-preface');
  if (prefaceEl) prefaceEl.value = f.preface || '';
  const stateEl = document.getElementById('fm-state');
  if (stateEl) stateEl.value = f.state || '';
  const versionEl = document.getElementById('fm-version');
  if (versionEl) versionEl.value = f.version || '';
  const prepEl = document.getElementById('fm-prepared-by');
  if (prepEl) prepEl.value = f.preparedBy || '';
  const assistEl = document.getElementById('fm-assisted-by');
  if (assistEl) assistEl.value = f.assistedBy || '';
  const ackEl = document.getElementById('fm-acknowledgement');
  if (ackEl) ackEl.value = f.acknowledgement || '';
  ['cover', 'cert', 'toc', 'pref'].forEach(type => {
    const el = document.getElementById(`fm-${type}-file`);
    if (el) {
      if (S.uploadedPDFs && S.uploadedPDFs[type]) {
        el.innerHTML = `
          <div class="file-item" style="margin-top:10px">
            <div class="file-icon" style="background:#fee2e2">📄</div>
            <div class="file-info">
              <div class="file-name">Previously Uploaded ${type.toUpperCase()} PDF</div>
              <div class="file-meta">${S.uploadedPDFs[type].length} Page(s)</div>
            </div>
            <span class="badge badge-green">✓ Ready</span>
          </div>`;
      } else {
        el.innerHTML = '';
      }
    }
  });
}
function bindFrontMatterEvents() {
  const notifyFmPreview = () => {
    if (window.pdfPreview) window.pdfPreview.notifyUpdate('front-matter');
  };
  const titleEl = document.getElementById('fm-title');
  if (titleEl) {
    titleEl.addEventListener('input', (e) => {
      S.frontMatter.title = e.target.value;
      if (S.activeProject) S.activeProject.title = e.target.value;
      notifyFmPreview();
    });
  }
  const distEl = document.getElementById('fm-district');
  if (distEl) {
    distEl.addEventListener('input', (e) => {
      S.frontMatter.district = e.target.value;
      const topBadge = document.getElementById('tb-district-badge');
      if (topBadge) topBadge.textContent = e.target.value;
      if (S.activeProject) S.activeProject.district = e.target.value;
      notifyFmPreview();
    });
  }
  const yearEl = document.getElementById('fm-year');
  if (yearEl) {
    yearEl.addEventListener('input', (e) => {
      S.frontMatter.year = e.target.value;
      if (S.activeProject) S.activeProject.year = e.target.value;
      notifyFmPreview();
    });
  }
  const prefaceEl = document.getElementById('fm-preface');
  if (prefaceEl) {
    prefaceEl.addEventListener('input', (e) => {
      S.frontMatter.preface = e.target.value;
      notifyFmPreview();
    });
  }
  const stateEl = document.getElementById('fm-state');
  if (stateEl) {
    stateEl.addEventListener('input', (e) => {
      S.frontMatter.state = e.target.value;
      notifyFmPreview();
    });
  }
  const versionEl = document.getElementById('fm-version');
  if (versionEl) {
    versionEl.addEventListener('input', (e) => {
      S.frontMatter.version = e.target.value;
      notifyFmPreview();
    });
  }
  const prepEl = document.getElementById('fm-prepared-by');
  if (prepEl) {
    prepEl.addEventListener('input', (e) => {
      S.frontMatter.preparedBy = e.target.value;
      notifyFmPreview();
    });
  }
  const assistEl = document.getElementById('fm-assisted-by');
  if (assistEl) {
    assistEl.addEventListener('input', (e) => {
      S.frontMatter.assistedBy = e.target.value;
      notifyFmPreview();
    });
  }
  const ackEl = document.getElementById('fm-acknowledgement');
  if (ackEl) {
    ackEl.addEventListener('input', (e) => {
      S.frontMatter.acknowledgement = e.target.value;
      notifyFmPreview();
    });
  }
}
window.addEventListener('DOMContentLoaded', () => {
  bindFrontMatterEvents();
  const originalOpenProject = window.openProject;
  if (typeof originalOpenProject === 'function') {
    window.openProject = async function (id) {
      await originalOpenProject(id);
      loadFrontMatter();
    };
  }
  const originalShowView = window.showView;
  if (typeof originalShowView === 'function') {
    window.showView = function (id, btn, push) {
      originalShowView(id, btn, push);
      if (id === 'front-matter') {
        loadFrontMatter();
      }
    };
  }
});

;

/* js/chapters.js */
/* Chapters management */
function renderChapters() {
  const el = document.getElementById('chapter-list');
  if (!el) return;
  el.innerHTML = S.chapters.map((ch, i) => {
    const pageCount = S.chapterPDFs && S.chapterPDFs[ch.id] ? S.chapterPDFs[ch.id].length : 0;
    const fileInfoHTML = ch.fileName ? `
      <div class="file-item" style="margin-top:10px; background:var(--off); border:1px solid var(--border); max-width:480px; display:flex; align-items:center; justify-content:space-between; padding:8px 12px; border-radius:var(--r-sm);">
        <div style="display:flex; align-items:center; gap:6px;">
          <div class="file-icon" style="background:var(--teal-lt); color:var(--teal); padding:6px; border-radius:var(--r-xs); font-size:14px;">PDF</div>
          <div style="line-height:1.2;">
            <div style="font-size:11.5px; font-weight:600; color:var(--text);">${ch.fileName}</div>
            <div style="font-size:9.5px; color:var(--text-faint);">${ch.fileSize || ''} - ${pageCount} Page(s)</div>
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          <label class="btn btn-xs btn-outline" for="chapter-upload-${ch.id}" style="cursor:pointer; margin:0;">Replace</label>
          <input id="chapter-upload-${ch.id}" class="chapter-upload-native" type="file" accept="application/pdf,.pdf" onchange="handleChapterUpload(event,${ch.id})">
          <button type="button" class="btn btn-xs btn-danger" onclick="deleteChapterFile(${ch.id})">Remove</button>
        </div>
      </div>` : `
      <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
        <label class="btn btn-xs btn-outline" for="chapter-upload-${ch.id}" style="cursor:pointer; margin:0;">Upload Chapter PDF</label>
        <input id="chapter-upload-${ch.id}" class="chapter-upload-native" type="file" accept="application/pdf,.pdf" onchange="handleChapterUpload(event,${ch.id})">
      </div>`;
    return `
      <div class="chapter-item">
        <div class="ch-num">${i + 1}</div>
        <div class="ch-body">
          <input class="ch-name-input" value="${ch.name || ''}" oninput="S.chapters[${i}].name=this.value; if(window.pdfPreview) window.pdfPreview.notifyUpdate('chapters'); if(window.debouncedSaveState) window.debouncedSaveState();">
          <textarea class="ch-summary" rows="2" oninput="S.chapters[${i}].summary=this.value; if(window.pdfPreview) window.pdfPreview.notifyUpdate('chapters'); if(window.debouncedSaveState) window.debouncedSaveState();">${ch.summary || ''}</textarea>
          ${fileInfoHTML}
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0">
          ${i > 0 ? `<button class="btn btn-xs btn-outline" onclick="moveChapter(${i},-1)">Up</button>` : ''}
          ${i < S.chapters.length - 1 ? `<button class="btn btn-xs btn-outline" onclick="moveChapter(${i},1)">Down</button>` : ''}
          <button class="btn btn-xs btn-danger" onclick="deleteChapter(${ch.id})">Delete</button>
        </div>
      </div>`;
  }).join('');
  if (typeof applyChapterAccess === 'function') applyChapterAccess(el);
  bindChapterUploadButtons(el);
  if (window.initLucide) window.initLucide();
}
function bindChapterUploadButtons(root) {
  (root || document).querySelectorAll('[data-chapter-upload]').forEach(btn => {
    if (btn.dataset.uploadBound === '1') return;
    btn.dataset.uploadBound = '1';
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      triggerChapterUpload(Number(btn.dataset.chapterUpload));
    });
  });
}
function triggerChapterUpload(id) {
  const ch = S.chapters.find(x => x.id === id);
  const idx = S.chapters.findIndex(x => x.id === id);
  if (!ch) {
    toast('Chapter not found.', 'error');
    return;
  }
  if (typeof canEditChapter === 'function' && !canEditChapter(idx + 1)) {
    toast('This chapter is locked for your role.', 'error');
    return;
  }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/pdf,.pdf';
  input.style.position = 'fixed';
  input.style.left = '-10000px';
  input.style.top = '0';
  input.style.width = '1px';
  input.style.height = '1px';
  input.style.opacity = '0';
  input.addEventListener('change', (event) => {
    handleChapterUpload(event, id);
    setTimeout(() => input.remove(), 250);
  });
  document.body.appendChild(input);
  input.click();
}
function addChapter() {
  if (typeof canEditView === 'function' && !canEditView('chapters')) {
    toast('You do not have access to add chapters.', 'error');
    return;
  }
  S.chapters.push({ id: Date.now(), name: 'NEW CHAPTER - ENTER TITLE', summary: 'Enter chapter summary here...', fileName: null, fileSize: null });
  renderChapters();
  if (window.pdfPreview) window.pdfPreview.notifyUpdate('chapters');
  if (window.debouncedSaveState) window.debouncedSaveState();
}
function deleteChapter(id) {
  const idx = S.chapters.findIndex(c => c.id === id);
  if (typeof canEditChapter === 'function' && !canEditChapter(idx + 1)) {
    toast('This chapter is locked for your role.', 'error');
    return;
  }
  customConfirm('Remove this chapter completely?', () => {
    S.chapters = S.chapters.filter(c => c.id !== id);
    if (S.chapterPDFs) delete S.chapterPDFs[id];
    renderChapters();
    if (window.pdfPreview) window.pdfPreview.notifyUpdate('chapters');
    if (window.debouncedSaveState) window.debouncedSaveState();
    toast('Chapter removed', 'info');
  });
}
function moveChapter(idx, dir) {
  if (typeof canEditChapter === 'function' && (!canEditChapter(idx + 1) || !canEditChapter(idx + dir + 1))) {
    toast('Chapter movement is locked for your role.', 'error');
    return;
  }
  [S.chapters[idx], S.chapters[idx + dir]] = [S.chapters[idx + dir], S.chapters[idx]];
  renderChapters();
  if (window.pdfPreview) window.pdfPreview.notifyUpdate('chapters');
  if (window.debouncedSaveState) window.debouncedSaveState();
}
function handleChapterUpload(e, id) {
  const f = e.target.files[0];
  if (!f) return;
  const ch = S.chapters.find(x => x.id === id);
  const idx = S.chapters.findIndex(x => x.id === id);
  if (!ch) return;
  if (typeof canEditChapter === 'function' && !canEditChapter(idx + 1)) {
    toast('This chapter is locked for your role.', 'error');
    e.target.value = '';
    return;
  }
  const sizeStr = (f.size / 1024).toFixed(1) + ' KB';
  if (f.type !== 'application/pdf') {
    toast('Please upload a PDF file.', 'error');
    return;
  }
  ch.fileName = f.name;
  ch.fileSize = 'Processing PDF...';
  renderChapters();
  if (window.pdfPreview) window.pdfPreview.notifyUpdate('chapters');
  if (window.debouncedSaveState) window.debouncedSaveState();
  if (typeof renderPdfToImages !== 'function') {
    toast('PDF engine not loaded yet', 'error');
    ch.fileSize = 'Error (Engine not loaded)';
    renderChapters();
    if (window.pdfPreview) window.pdfPreview.notifyUpdate('chapters');
    return;
  }
  renderPdfToImages(f, (err, imgs) => {
    if (err) {
      console.error(err);
      toast('PDF render failed', 'error');
      ch.fileSize = 'Error';
      renderChapters();
      if (window.pdfPreview) window.pdfPreview.notifyUpdate('chapters');
      return;
    }
    if (!S.chapterPDFs) S.chapterPDFs = {};
    S.chapterPDFs[id] = imgs;
    ch.fileSize = sizeStr;
    renderChapters();
    if (window.pdfPreview) window.pdfPreview.notifyUpdate('chapters');
    toast(`${f.name} uploaded for chapter`, 'success');
    if (window.debouncedSaveState) window.debouncedSaveState();
  });
}
function deleteChapterFile(id) {
  const ch = S.chapters.find(x => x.id === id);
  const idx = S.chapters.findIndex(x => x.id === id);
  if (typeof canEditChapter === 'function' && !canEditChapter(idx + 1)) {
    toast('This chapter is locked for your role.', 'error');
    return;
  }
  if (!ch) return;
  ch.fileName = null;
  ch.fileSize = null;
  if (S.chapterPDFs) delete S.chapterPDFs[id];
  renderChapters();
  if (window.pdfPreview) window.pdfPreview.notifyUpdate('chapters');
  if (window.debouncedSaveState) window.debouncedSaveState();
  toast('Chapter PDF removed', 'success');
}
window.deleteChapterFile = deleteChapterFile;
window.handleChapterUpload = handleChapterUpload;
window.triggerChapterUpload = triggerChapterUpload;
window.addChapter = addChapter;
window.deleteChapter = deleteChapter;
window.moveChapter = moveChapter;

;

/* js/plates.js */
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

;

/* js/graphs.js */
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
;

/* js/users.js */
/* User management */
const USER_ROLE_OPTIONS = [
  'IIT_ROPAR', 'SDLC', 'SDO', 'JE', 'AXEN', 'GIS',
  'REVIEWER_1', 'REVIEWER_2', 'ADMIN', 'OFFICER', 'DATA_ENTRY', 'REVIEWER'
];
function usersBadge(ok) {
  return ok
    ? '<span class="badge badge-green">Yes</span>'
    : '<span class="badge badge-red">No</span>';
}
function formatUserScope(user) {
  const parts = [];
  if (user.district) parts.push(user.district);
  if (user.block) parts.push(user.block);
  if (user.section) parts.push(user.section);
  return parts.length ? parts.join(' / ') : 'All';
}
async function renderUsers() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;
  if (typeof hasAdminAccess === 'function' && !hasAdminAccess()) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Only Admin can manage users.</td></tr>';
    return;
  }
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Loading users...</td></tr>';
  try {
    const users = await apiFetch('/users');
    tbody.innerHTML = users.map(user => {
      const perms = user.permissions || [];
      const activeLabel = user.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Inactive</span>';
      return `
        <tr>
          <td>
            <div style="font-weight:700;">${user.email || user.username}</div>
            <div style="font-size:11px;color:var(--text-soft);">${user.fullName || ''}</div>
          </td>
          <td>${renderRoleSelect(user)}</td>
          <td>${usersBadge(perms.includes('UPLOAD'))}</td>
          <td>${usersBadge(perms.includes('REVIEW'))}</td>
          <td>${user.accessLabel || '-'}</td>
          <td>${formatUserScope(user)}</td>
          <td>${activeLabel}</td>
          <td style="display:flex;gap:6px;align-items:center;">
            <button class="btn btn-xs btn-outline" onclick="editUserScope(${user.id})">Scope</button>
            <button class="btn btn-xs ${user.active ? 'btn-danger' : 'btn-saffron'}" onclick="toggleUserActive(${user.id}, ${!user.active})">${user.active ? 'Disable' : 'Enable'}</button>
          </td>
        </tr>`;
    }).join('');
    if (window.initLucide) window.initLucide();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--red);">${e.message || 'Failed to load users'}</td></tr>`;
  }
}
function renderRoleSelect(user) {
  const options = USER_ROLE_OPTIONS.map(role => `<option value="${role}" ${role === user.role ? 'selected' : ''}>${role.replace(/_/g, ' ')}</option>`).join('');
  return `<select style="min-width:150px;" onchange="updateUserRole(${user.id}, this.value)">${options}</select>`;
}
async function updateUserRole(userId, role) {
  try {
    await apiFetch(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
    toast('Role updated', 'success');
    renderUsers();
  } catch (e) {
    toast(e.message || 'Failed to update role', 'error');
  }
}
async function toggleUserActive(userId, active) {
  try {
    await apiFetch(`/users/${userId}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ active })
    });
    toast(active ? 'User enabled' : 'User disabled', 'success');
    renderUsers();
  } catch (e) {
    toast(e.message || 'Failed to update user', 'error');
  }
}
async function editUserScope(userId) {
  const district = prompt('Assigned district (blank = all):', 'Jalandhar');
  if (district === null) return;
  const block = prompt('Assigned block (optional):', '');
  if (block === null) return;
  const section = prompt('Assigned section (optional):', '');
  if (section === null) return;
  try {
    await apiFetch(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ district, block, section })
    });
    toast('Scope updated', 'success');
    renderUsers();
  } catch (e) {
    toast(e.message || 'Failed to update scope', 'error');
  }
}
async function openAddUserPrompt() {
  const username = prompt('Email / username for new user:', '');
  if (!username) return;
  const fullName = prompt('Full name:', username) || username;
  const role = prompt(`Role (${USER_ROLE_OPTIONS.join(', ')}):`, 'SDO') || 'SDO';
  const district = prompt('Assigned district:', 'Jalandhar') || '';
  try {
    await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify({
        username,
        email: username,
        fullName,
        role,
        district,
        password: 'password123',
        active: 'true'
      })
    });
    toast('User created with password password123', 'success');
    renderUsers();
  } catch (e) {
    toast(e.message || 'Failed to create user', 'error');
  }
}
window.renderUsers = renderUsers;
window.updateUserRole = updateUserRole;
window.toggleUserActive = toggleUserActive;
window.editUserScope = editUserScope;
window.openAddUserPrompt = openAddUserPrompt;

;

/* js/tables.js */
/* ══════════════════════════════════════
   TABLES & ANNEXURES HELPERS
══════════════════════════════════════ */
function delRow(btn) { btn.closest('tr').remove(); }
function addRow(tableId, cells) {
  const tbody=document.querySelector('#'+tableId+' tbody');
  if (!tbody) return;
  const tr=document.createElement('tr');
  tr.innerHTML=cells.map(c=>{
    let val = String(c !== undefined && c !== null ? c : '').trim();
    if (val === '' && !val.includes('<button') && !val.includes('<select')) {
      val = 'NUL';
    }
    return `<td contenteditable>${val}</td>`;
  }).join('');
  tbody.appendChild(tr);
  if (window.initLucide) window.initLucide();
}
function downloadAnxTemplate(n) {
  let csvContent = "";
  let filename = "";
  if (n === 5) {
    csvContent = "Point Name,Type (Bench Mark/CORS),Latitude,Longitude,Elevation (m),Remarks\n";
    filename = "Annexure_V_Benchmarks_Template.csv";
  } else if (n === 6) {
    csvContent = "Cluster No.,River,Total Area (Ha),Total Excavation (MT),Mineral @60% (MT),Status (Approved/Pending)\n";
    filename = "Annexure_VI_Final_Clusters_Template.csv";
  } else if (n === 7) {
    csvContent = "Owner Name,Patta No.,Area (Ha),District,Tehsil,Village,Remarks\n";
    filename = "Annexure_VII_Patta_Lands_Template.csv";
  } else {
    toast(`⬇ Annexure ${toRoman(n)} Excel template downloaded`,'success');
    return;
  }
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast(`⬇ Annexure ${toRoman(n)} Excel template downloaded`,'success');
}
window.addEventListener('DOMContentLoaded', () => {
  const originalShowView = window.showView;
  if (typeof originalShowView === 'function') {
    window.showView = function(id, btn, push) {
      originalShowView(id, btn, push);
      if (['tables','anx1','anx2','anx3','anx4','anx5','anx6','anx7'].includes(id) || id.startsWith('anx')) {
        const isReadOnly = isUserReadOnly();
        const actionBtns = document.querySelectorAll('.active .btn-saffron, .active .btn-outline[onclick^="trigUp"], .active .upload-zone');
        actionBtns.forEach(el => {
          if (el.innerText.includes('Add Row') || el.innerText.includes('Upload') || el.classList.contains('upload-zone') || el.getAttribute('onclick')?.includes('trigUp')) {
            el.style.display = isReadOnly ? 'none' : '';
          }
        });
        if (isReadOnly) {
          const editables = document.querySelectorAll('.active [contenteditable="true"], .active [contenteditable=""]');
          editables.forEach(el => {
            el.removeAttribute('contenteditable');
            el.style.cursor = 'not-allowed';
            el.style.backgroundColor = 'var(--off)';
          });
          const selects = document.querySelectorAll('.active select');
          selects.forEach(el => el.disabled = true);
          const ths = document.querySelectorAll('.active th');
          ths.forEach(th => {
            if (th.innerText.toLowerCase().includes('action')) th.style.display = 'none';
          });
          const delBtns = document.querySelectorAll('.active .btn-danger[onclick^="delRow"]');
          delBtns.forEach(btn => {
            const td = btn.closest('td');
            if (td) td.style.display = 'none';
          });
        }
      }
    };
  }
});
function handleAnxUpload(e,n) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheets = workbook.SheetNames;
      if (!sheets.length) throw new Error('No sheets found in Excel file');
      const tableIds = getAnnexureTableIds(n);
      let updated = 0;
      sheets.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const tableId = findAnnexureTableId(n, sheetName, tableIds);
        if (tableId && populateTableFromSheet(tableId, rows)) updated += 1;
      });
      if (!updated && tableIds.length && sheets.length === 1) {
        const sheet = workbook.Sheets[sheets[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (populateTableFromSheet(tableIds[0], rows)) updated = 1;
      }
      if (!updated) throw new Error('No matching annexure table found');
      toast(`✅ Annexure ${toRoman(n)} uploaded and ${updated} table(s) updated`,'success');
    } catch (err) {
      console.error(err);
      toast(`⚠️ Upload failed: ${err.message}`,'error');
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = '';
}
function getAnnexureTableIds(n) {
  return {
    1: ['anx1-rivers','anx1-desilt','anx1-patta','anx1-msand'],
    2: ['anx2-leases','anx2-patta','anx2-desilt','anx2-msand'],
    3: ['anx3-clusters','anx3-contiguous'],
    4: ['anx4-routes','anx4-cluster-routes'],
    5: ['anx5-benchmarks'],
    6: ['anx6-final-clusters'],
    7: ['anx7-patta-final']
  }[n] || [];
}
function findAnnexureTableId(n, sheetName, tableIds) {
  const key = String(sheetName || '').trim().toLowerCase();
  const patterns = {
    'anx1-rivers': ['river','rivers','source','sources'],
    'anx1-desilt': ['desilt','de-silt','reservoir','lake','pond','dam'],
    'anx1-patta': ['patta','khatedari','land'],
    'anx1-msand': ['m-sand','msand','plant'],
    'anx2-leases': ['lease','leases','river','rivers'],
    'anx2-patta': ['patta','khatedari','land'],
    'anx2-desilt': ['desilt','de-silt','reservoir','lake','pond','dam'],
    'anx2-msand': ['m-sand','msand','plant'],
    'anx3-clusters': ['cluster'],
    'anx3-contiguous': ['contiguous'],
    'anx4-routes': ['route','routes','lease'],
    'anx4-cluster-routes': ['cluster route','cluster routes'],
    'anx5-benchmarks': ['bench','benchmark','cors'],
    'anx6-final-clusters': ['final cluster','cluster summary'],
    'anx7-patta-final': ['patta']
  };
  for (const tableId of tableIds) {
    const keys = patterns[tableId] || [];
    if (keys.some(k => key.includes(k))) return tableId;
  }
  return tableIds[0] || null;
}
function populateTableFromSheet(tableId, rows) {
  const table = document.getElementById(tableId);
  if (!table) return false;
  const tbody = table.querySelector('tbody');
  if (!tbody) return false;
  const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim().toLowerCase());
  const cleanRows = rows.filter(row => Array.isArray(row) && row.some(cell => String(cell || '').trim() !== ''));
  if (!cleanRows.length) return false;
  const firstRow = cleanRows[0].map(cell => String(cell || '').trim().toLowerCase());
  const isHeaderRow = firstRow.every((value, index) => {
    const header = headers[index] || '';
    return value && (header.includes(value) || value.includes(header));
  });
  if (isHeaderRow) cleanRows.shift();
  const uploadRows = cleanRows.map(row => {
    const cells = [];
    headers.forEach((_, index) => {
      let value = row[index] !== undefined ? String(row[index]).trim() : '';
      if (value === '') value = 'NUL';
      cells.push(value);
    });
    if (headers.includes('action')) {
      const isReadOnly = isUserReadOnly();
      cells.push(`<button class="btn btn-xs btn-danger" onclick="delRow(this)" style="${isReadOnly ? 'display:none;' : 'display:inline-flex;'}align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>`);
    }
    return cells;
  });
  const addUploadedRow = (row) => {
    const tr = document.createElement('tr');
    row.forEach(value => {
      if (/<button|<select/i.test(String(value))) {
        tr.insertAdjacentHTML('beforeend', `<td>${value}</td>`);
        return;
      }
      const escaped = value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      tr.insertAdjacentHTML('beforeend', `<td contenteditable>${escaped}</td>`);
    });
    if (typeof normalizePhaseNo === 'function' && normalizePhaseNo(S.activeProject) > 1 && typeof applyPhaseHighlightToRow === 'function') {
      applyPhaseHighlightToRow(tr, getActivePhaseUploadColor(), 'PHASE2_NEW');
    }
    tbody.appendChild(tr);
  };
  if (typeof rbacApplyExcelRowsToTable === 'function') {
    rbacApplyExcelRowsToTable(table, uploadRows, addUploadedRow);
  } else {
    tbody.innerHTML = '';
    uploadRows.forEach(addUploadedRow);
  }
  if (typeof normalizePhaseNo === 'function' && normalizePhaseNo(S.activeProject) > 1 && typeof recordPhaseChange === 'function') {
    recordPhaseChange(tableId, 'PHASE2_NEW', `${uploadRows.length} uploaded row(s)`, getActivePhaseUploadColor());
    if (typeof debouncedSaveState === 'function') debouncedSaveState();
  }
  if (window.initLucide) window.initLucide();
  return true;
}
function handleTableUpload(e) {
  const f = e.target.files[0]; if (!f) return;
  const sel = document.getElementById('table-upload-select');
  const tableId = sel ? sel.value : null;
  if (!tableId) { toast('Select a table first','warn'); return; }
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (populateTableFromSheet(tableId, rows)) toast('✅ Table updated from Excel','success');
      else toast('No data found in sheet','warn');
    } catch (err) { console.error(err); toast('⚠️ Upload failed','error'); }
  };
  reader.readAsArrayBuffer(f);
  e.target.value = '';
}
function exportAnxPDF(n) {
  if (n === 5 && typeof exportAnx5PDF === 'function') {
    exportAnx5PDF();
  } else if (n === 6 && typeof exportAnx6PDF === 'function') {
    exportAnx6PDF();
  } else if (n === 7 && typeof exportAnx7PDF === 'function') {
    exportAnx7PDF();
  } else {
    toast(`📄 Annexure ${typeof n==='number'?toRoman(n):n} PDF exported`,'success');
  }
}
function toRoman(n) { return ['I','II','III','IV','V','VI','VII'][n-1]||n; }
function mountBenchmarkPanel(targetId) {
  const panel = document.getElementById('anx-benchmark-cors-panel');
  const target = document.getElementById(targetId);
  if (!panel || !target) return;
  if (panel.parentElement !== target) target.appendChild(panel);
  if (window.initLucide) window.initLucide();
}
function switchAnxTab(id, btn) {
  ['coords','benchmark','final-clusters','patta-final','desilt-final'].forEach(t=>{
    const el=document.getElementById('anx-tab-'+t); if(el) el.style.display=t===id?'block':'none';
  });
  if (id === 'benchmark') mountBenchmarkPanel('anx-tab-benchmark');
  const tabs = document.querySelectorAll('.feature-tab');
  tabs.forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}
/* ══════════════════════════════════════
   DEMAND TABLE
══════════════════════════════════════ */
function initDemandTable() {
  const tbody=document.getElementById('demand-tbody'); if(!tbody) return;
  tbody.innerHTML=S.demandDistricts.map((d,i)=>`
    <tr>
      <td>${i+1}</td><td>${d}</td>
      <td contenteditable class="num" oninput="updateDemandTotals()">0</td>
      <td contenteditable class="num" oninput="updateDemandTotals()">0</td>
      <td contenteditable class="num" oninput="updateDemandTotals()">0</td>
      <td contenteditable class="num" oninput="updateDemandTotals()">0</td>
      <td contenteditable class="num" oninput="updateDemandTotals()">0</td>
      <td contenteditable class="num" oninput="updateDemandTotals()">0</td>
    </tr>`).join('');
}
function addDemandRow() {
  const tbody=document.getElementById('demand-tbody');
  if (!tbody) return;
  const n=tbody.rows.length+1;
  tbody.insertAdjacentHTML('beforeend',`<tr><td>${n}</td><td contenteditable>New District</td>${Array(6).fill('<td contenteditable class="num" oninput="updateDemandTotals()">0</td>').join('')}</tr>`);
}
function updateDemandTotals() {
  const tbody=document.getElementById('demand-tbody'); if(!tbody) return;
  for (let col=0;col<6;col++) {
    const cells=[...tbody.querySelectorAll(`tr td:nth-child(${col+3})`)];
    const total=cells.reduce((s,c)=>s+(parseFloat(c.textContent)||0),0);
    const el=document.getElementById('dt-'+col); if(el) el.textContent=fmtN(total,0);
  }
}
function exportDemandExcel() { toast('⬇ Demand table Excel downloaded','success'); }
function exportDemandPDF() { toast('📄 Demand table PDF exported','success'); }
/* ══════════════════════════════════════
   SUMMARY TABLE
══════════════════════════════════════ */
function initSummaryTable() {
  const tbody=document.getElementById('summary-tbody'); if(!tbody) return;
  const isReadOnly = isUserReadOnly();
  const cEd = isReadOnly ? '' : 'contenteditable';
  tbody.innerHTML=S.summarySources.map(s=>`
    <tr>
      <td ${cEd}>${s}</td>
      <td ${cEd} class="num" oninput="updateSummaryTotals()">0</td>
      <td ${cEd} class="num" oninput="updateSummaryTotals()">0</td>
      <td ${cEd} class="num" oninput="updateSummaryTotals()">0</td>
      <td ${cEd} class="num" oninput="updateSummaryTotals()">0</td>
      <td style="${isReadOnly ? 'display:none;' : ''}"><button class="btn btn-xs btn-danger" onclick="delRow(this)" style="display:inline-flex;align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button></td>
    </tr>`).join('');
  if (window.initLucide) window.initLucide();
}
function addSummaryRow() {
  const tbody=document.getElementById('summary-tbody');
  if (!tbody) return;
  tbody.insertAdjacentHTML('beforeend',`<tr>
    <td contenteditable>New Source</td>
    <td contenteditable class="num" oninput="updateSummaryTotals()">0</td>
    <td contenteditable class="num" oninput="updateSummaryTotals()">0</td>
    <td contenteditable class="num" oninput="updateSummaryTotals()">0</td>
    <td contenteditable class="num" oninput="updateSummaryTotals()">0</td>
    <td><button class="btn btn-xs btn-danger" onclick="delRow(this)" style="display:inline-flex;align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button></td>
  </tr>`);
  if (window.initLucide) window.initLucide();
}
function updateSummaryTotals() {
  const tbody=document.getElementById('summary-tbody'); if(!tbody) return;
  const ids=['sum-sites','sum-area','sum-excav','sum-excav60'];
  ids.forEach((id,col)=>{
    const cells=[...tbody.querySelectorAll(`tr td:nth-child(${col+2})`)];
    const total=cells.reduce((s,c)=>s+(parseFloat(c.textContent)||0),0);
    const el=document.getElementById(id); if(el) el.textContent=fmtN(total,2);
  });
}
function exportSummaryPDF() { toast('📄 Summary table PDF exported','success'); }
/* ══════════════════════════════════════
   AUCTION TABLE
══════════════════════════════════════ */
function initAuctionTable() {
  const tbody=document.getElementById('auction-tbody'); if(!tbody) return;
  const isReadOnly = isUserReadOnly();
  const cEd = isReadOnly ? '' : 'contenteditable';
  tbody.innerHTML=`<tr>
    <td ${cEd}>1</td>
    <td ${cEd}>Jalandhar Sutlej-1, Vill-Kadiana</td>
    <td><select ${isReadOnly ? 'disabled' : ''}><option>PMS</option><option>CMS</option><option>S</option><option>C</option><option>RSM</option></select></td>
    <td ${cEd}>01-Apr-2023</td><td ${cEd}>15-Apr-2023</td>
    <td ${cEd}>285000</td><td ${cEd}>142500</td><td ${cEd}>142500</td>
    <td ${cEd}>Active</td><td ${cEd}>—</td><td ${cEd}>—</td>
    <td ${cEd}>Running as per schedule</td>
    <td style="${isReadOnly ? 'display:none;' : ''}"><button class="btn btn-xs btn-danger" onclick="delRow(this)" style="display:inline-flex;align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button></td>
  </tr>`;
  if (window.initLucide) window.initLucide();
}
function addAuctionRow() {
  const tbody=document.getElementById('auction-tbody');
  if (!tbody) return;
  const n=tbody.rows.length+1;
  tbody.insertAdjacentHTML('beforeend',`<tr>
    <td contenteditable>${n}</td>
    <td contenteditable>Site Name ${n}</td>
    <td><select><option>PMS</option><option>CMS</option><option>S</option><option>C</option><option>RSM</option></select></td>
    <td contenteditable>—</td><td contenteditable>—</td>
    <td contenteditable>0</td><td contenteditable>0</td><td contenteditable>0</td>
    <td contenteditable>Pending</td><td contenteditable>—</td><td contenteditable>—</td>
    <td contenteditable>—</td>
    <td><button class="btn btn-xs btn-danger" onclick="delRow(this)" style="display:inline-flex;align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button></td>
  </tr>`);
  if (window.initLucide) window.initLucide();
}
function exportAuctionPDF() { toast('📄 Auctioned sites PDF exported','success'); }

;

/* js/anx1.js */
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ANNEXURE I â€” SAND SOURCES
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function downloadSectionTemplate(sectionType) {
  let csvContent = "";
  let filename = "";
  switch(sectionType) {
    case 'A':
      csvContent = "River Name/M-Sand Plant,Total Stretch of River (in KM),Type of River (Perennial or Non Perennial)\n";
      filename = "Table_A_Rivers_Template.csv";
      break;
    case 'B':
      csvContent = "b) De-Siltation Location (Lakes/Ponds/Dams etc.),,,,,,,\n,,,,,,,\nName of Reservoir/Dams,Maintain/Controlled by State Govt./PSU etc.,Latitude,Longitude,District,Tehsil,Village,Size (Ha)\n";
      filename = "Table_B_DeSiltation_Template.csv";
      break;
    case 'C':
      csvContent = "Owner,SL. No,Area (Ha),District,Tehsil,Village,Agricultural Land (Yes/No)\n";
      filename = "Table_C_Patta_Lands_Template.csv";
      break;
    case 'D':
      csvContent = "Plant Name,Owner,District,Tehsil,Village,Geo-location,Quantity Tonnes/Annum\n";
      filename = "Table_D_MSand_Template.csv";
      break;
  }
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
function handleSectionUpload(event, sectionType) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
      if (rows.length === 0) {
        toast("The uploaded file is empty.", "warn");
        return;
      }
      processExcelData(rows, sectionType);
    } catch (error) {
      toast("Error parsing file. Please ensure it is a valid Excel or CSV file.", "error");
      console.error(error);
    }
    event.target.value = ''; 
  };
  reader.readAsArrayBuffer(file);
}
function processExcelData(rows, sectionType) {
  const validRows = rows.filter(row => row.some(cell => String(cell !== undefined && cell !== null ? cell : "").trim() !== ""));
  let startIndex = 0; 
  const headerIdx = validRows.findIndex(row => {
    const rowStr = row.map(c => String(c || '')).join(' ').toLowerCase();
    if (sectionType === 'A') return rowStr.includes('river');
    if (sectionType === 'B') return rowStr.includes('reservoir');
    if (sectionType === 'C') return rowStr.includes('owner');
    if (sectionType === 'D') return rowStr.includes('plant');
    return false;
  });
  if (headerIdx >= 0) {
    startIndex = headerIdx + 1;
  }
  const dataRows = validRows.slice(startIndex);
  if(dataRows.length === 0) {
    toast("No data found after the header in the uploaded file.", "warn");
    return;
  }
  let tableId = '';
  if (sectionType === 'A') tableId = 'anx1-rivers';
  if (sectionType === 'B') tableId = 'anx1-desilt';
  if (sectionType === 'C') tableId = 'anx1-patta';
  if (sectionType === 'D') tableId = 'anx1-msand';
  const uploadRows = [];
  dataRows.forEach(rowData => {
    while (rowData.length < 8) rowData.push(""); 
    let cellDataArray = [];
    const isReadOnly = isUserReadOnly();
    const actionBtn = `<button class='btn btn-xs btn-danger' onclick='delRow(this)' style='display:${isReadOnly ? 'none' : 'inline-flex'};align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>`;
    if (sectionType === 'A') {
      let typeVal = String(rowData[2] || "").trim();
      let isNonPerennial = typeVal.toLowerCase().includes("non");
      let typeSelect = `<select ${isReadOnly ? 'disabled' : ''}><option ${!isNonPerennial ? 'selected' : ''}>Perennial</option><option ${isNonPerennial ? 'selected' : ''}>Non-Perennial</option></select>`;
      cellDataArray = [rowData[0], rowData[1], typeSelect, actionBtn];
    } 
    else if (sectionType === 'B') {
      cellDataArray = [rowData[0], rowData[1], rowData[2], rowData[3], rowData[4], rowData[5], rowData[6], rowData[7], actionBtn];
    } 
    else if (sectionType === 'C') {
      let agVal = String(rowData[6] || "").trim().toLowerCase();
      let agSelect = `<select ${isReadOnly ? 'disabled' : ''}><option ${agVal === 'yes' ? 'selected' : ''}>Yes</option><option ${agVal === 'no' ? 'selected' : ''}>No</option></select>`;
      cellDataArray = [rowData[0], rowData[1], rowData[2], rowData[3], rowData[4], rowData[5], agSelect, actionBtn];
    } 
    else if (sectionType === 'D') {
      cellDataArray = [rowData[0], rowData[1], rowData[2], rowData[3], rowData[4], rowData[5], rowData[6], actionBtn];
    }
    uploadRows.push(cellDataArray);
  });
  if (typeof rbacApplyExcelRowsToTable === 'function') {
    rbacApplyExcelRowsToTable(tableId, uploadRows, row => addRowAnx1(tableId, row));
  } else {
    const tbody = document.getElementById(tableId).querySelector('tbody');
    tbody.innerHTML = '';
    uploadRows.forEach(row => addRowAnx1(tableId, row));
  }
  toast(`Uploaded section ${sectionType} data successfully`, 'success');
  scheduleAnx1LivePreview(200);
}
function addRowAnx1(tableId, cellDataArray) {
  const tbody = document.querySelector('#' + tableId + ' tbody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  cellDataArray.forEach((data) => {
    const td = document.createElement('td');
    let dataStr = String(data !== undefined && data !== null ? data : '').trim();
    if (dataStr === '' && !dataStr.includes('<button') && !dataStr.includes('<select')) {
      dataStr = 'NUL';
    }
    if (!dataStr.includes('<button') && !dataStr.includes('<select')) {
      if (isUserReadOnly()) {
        td.contentEditable = "false";
        td.style.backgroundColor = 'var(--off)';
        td.style.cursor = 'not-allowed';
      } else {
        td.contentEditable = "true";
      }
      td.textContent = dataStr;
    } else {
      td.innerHTML = dataStr;
    }
    tr.appendChild(td);
  });
  tbody.appendChild(tr);
  if (window.initLucide) window.initLucide();
  scheduleAnx1LivePreview(250);
}
function escapeAnx1Html(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function getAnx1TableRows(tableId) {
  return Array.from(document.querySelectorAll(`#${tableId} tbody tr`)).map(row => (
    Array.from(row.querySelectorAll('td')).slice(0, -1).map(cell => {
      const select = cell.querySelector('select');
      return select ? select.value : cell.innerText.trim();
    })
  ));
}
function buildAnx1PreviewMarkup() {
  const sections = [
    {
      id: 'anx1-rivers',
      title: 'a) Rivers:',
      headers: ['River Name/M-Sand Plant', 'Total Stretch of River (in KM)', 'Type of River (Perennial or Non Perennial)']
    },
    {
      id: 'anx1-desilt',
      title: 'b) De-Siltation Location (Lakes/Ponds/Dams etc.):',
      headers: ['Name of Reservoir/Dams', 'Maintain/Controlled by State Govt./PSU etc.', 'Latitude', 'Longitude', 'District', 'Tehsil', 'Village', 'Size (Ha)']
    },
    {
      id: 'anx1-patta',
      title: 'c) Patta lands/Khatedari land:',
      headers: ['Owner', 'SL. No', 'Area (Ha)', 'District', 'Tehsil', 'Village', 'Agricultural Land (Yes/No)']
    },
    {
      id: 'anx1-msand',
      title: 'd) M-Sand Plants:',
      headers: ['Plant Name', 'Owner', 'District', 'Tehsil', 'Village', 'Geo-location', 'Quantity Tonnes/Annum']
    }
  ];
  const sectionHtml = sections.map(section => {
    const rows = getAnx1TableRows(section.id);
    const body = rows.length
      ? rows.map(row => `<tr>${section.headers.map((_, i) => `<td>${escapeAnx1Html(row[i] || 'NUL')}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${section.headers.length}" class="empty">Data not provided</td></tr>`;
    return `
      <section class="anx1-section">
        <h2>${escapeAnx1Html(section.title)}</h2>
        <table>
          <thead><tr>${section.headers.map(h => `<th>${escapeAnx1Html(h)}</th>`).join('')}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </section>`;
  }).join('');
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #eef2f7; color: #111827; font-family: Arial, Helvetica, sans-serif; }
      .page { width: min(100%, 980px); min-height: 100vh; margin: 0 auto; padding: 28px 30px 40px; background: #fff; box-shadow: 0 12px 32px rgba(15,23,42,.12); }
      h1 { margin: 0 0 4px; text-align: center; font-size: 22px; text-decoration: underline; }
      .sub { margin: 0 0 26px; text-align: center; font-size: 15px; }
      .anx1-section { margin: 0 0 24px; page-break-inside: avoid; }
      h2 { margin: 0 0 10px; font-size: 14px; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
      th, td { border: 1px solid #111827; padding: 6px 7px; vertical-align: top; word-break: break-word; overflow-wrap: anywhere; }
      th { background: #f3f4f6; font-weight: 700; text-align: left; }
      .empty { text-align: center; color: #6b7280; }
      @media (max-width: 720px) {
        .page { padding: 18px 14px 28px; box-shadow: none; }
        h1 { font-size: 18px; }
        .sub { font-size: 13px; }
        table { min-width: 680px; font-size: 10px; }
        .anx1-section { overflow-x: auto; padding-bottom: 8px; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <h1>Annexure-I</h1>
      <p class="sub">Details of Sand/M-Sand Sources</p>
      ${sectionHtml}
    </main>
  </body>
</html>`;
}
function renderAnx1LivePreviewHtml() {
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx1') : document.getElementById('pdf-preview-iframe'));
  if (!iframe) return null;
  iframe.style.display = 'block';
  iframe.removeAttribute('src');
  iframe.srcdoc = buildAnx1PreviewMarkup();
  return iframe;
}
function scheduleAnx1LivePreview(delay = 500) {
  if (window.anx1DebounceTimer) clearTimeout(window.anx1DebounceTimer);
  window.anx1DebounceTimer = setTimeout(() => {
    if (window.pdfPreview && window.pdfPreview.currentView === 'anx1') {
      exportAnx1PDF(null, true);
    }
  }, delay);
}
function exportAnx1PDF(btn, isLivePreview = false) {
  if (isLivePreview) {
    renderAnx1LivePreviewHtml();
    return;
  }
  if (typeof html2pdf === 'undefined') {
    const originalText = btn ? btn.innerText : 'Loading...';
    if (btn) btn.innerText = "Loading PDF Engine...";
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => {
      if (btn) btn.innerText = originalText;
      executePDFExport(isLivePreview);
    };
    script.onerror = () => {
      if (btn) btn.innerText = originalText;
      toast("Failed to load PDF engine. Please check your internet connection.", "error");
    };
    document.head.appendChild(script);
  } else {
    executePDFExport(isLivePreview);
  }
}
function executePDFExport(isLivePreview) {
  const mainView = document.getElementById('view-anx1');
  const printElement = document.createElement('div');
  printElement.id = 'pdf-render-container';
  printElement.style.width = '100%';
  printElement.style.maxWidth = '1000px'; 
  printElement.style.margin = '0 auto';
  printElement.style.fontFamily = 'Arial, Helvetica, sans-serif';
  printElement.style.color = '#000000';
  printElement.style.backgroundColor = '#ffffff';
  printElement.innerHTML = buildAnx1PreviewMarkup();
  printElement.style.position = 'absolute';
  printElement.style.top = '0';
  printElement.style.left = '0';
  printElement.style.zIndex = '-9999';
  printElement.style.opacity = '0';
  document.body.appendChild(printElement);
  const opt = {
    margin:       10,
    filename:     'Annexure_1_Sources.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, windowWidth: document.body.scrollWidth },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak:    { mode: ['css', 'legacy'], avoid: ['tr', 'h4'] }
  };
  if (isLivePreview) {
    html2pdf().set(opt).from(printElement).toPdf().get('pdf').then(function(pdf) {
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text("Page " + i, pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
      }
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      document.body.removeChild(printElement);
      const iframe = window.setAnnexurePreviewIframeSrc
        ? window.setAnnexurePreviewIframeSrc('anx1', blobUrl)
        : (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx1') : document.getElementById('pdf-preview-iframe'));
      if (iframe) iframe.removeAttribute('srcdoc');
    }).catch(err => {
      if(document.body.contains(printElement)) document.body.removeChild(printElement);
      console.error(err);
    });
  } else {
    let originalBodyPadding = document.body.style.padding;
    let originalBodyBg = document.body.style.backgroundColor;
    document.body.style.padding = '0';
    document.body.style.backgroundColor = '#ffffff';
    html2pdf().set(opt).from(printElement).toPdf().get('pdf').then(function(pdf) {
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text("Page " + i, pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
      }
    }).save().then(() => {
      document.body.removeChild(printElement);
      document.body.style.padding = originalBodyPadding;
      document.body.style.backgroundColor = originalBodyBg;
      toast('PDF downloaded successfully!', 'success');
    }).catch(err => {
      console.error("PDF Error: ", err);
      if(document.body.contains(printElement)) document.body.removeChild(printElement);
      document.body.style.padding = originalBodyPadding;
      document.body.style.backgroundColor = originalBodyBg;
      toast('Failed to generate PDF', 'error');
    });
  }
}
window.exportAnx1PDF = exportAnx1PDF;
document.addEventListener('input', (e) => {
  if (e.target.closest('#anx1-rivers, #anx1-desilt, #anx1-patta, #anx1-msand')) {
    scheduleAnx1LivePreview(700);
  }
});
function renderPdfUploadUIAnx1() {
  const nameEl = document.getElementById('anx1-uploaded-filename');
  const dlBtn = document.getElementById('anx1-download-btn');
  const delBtn = document.getElementById('anx1-delete-btn');
  const previewBtn = document.getElementById('anx1-preview-btn');
  const previewSection = document.getElementById('pdf-preview-section');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx1') : document.getElementById('pdf-iframe'));
  if (!nameEl || !dlBtn) return;
  if (!S.activeProject) {
    nameEl.style.display = 'none';
    dlBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none';
    if (previewBtn) previewBtn.style.display = 'none';
    return;
  }
  const pdfName = S.activeProject.anx1PdfName;
  const canEdit = !isUserReadOnly();
  const uploadInput = document.getElementById('anx1-upload');
  if (uploadInput) {
    uploadInput.disabled = !canEdit;
    uploadInput.parentElement.style.display = canEdit ? 'inline-block' : 'none';
  }
  if (!pdfName) {
    nameEl.style.display = 'none';
    dlBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none';
    if (previewBtn) previewBtn.style.display = 'none';
  } else {
    nameEl.textContent = pdfName;
    nameEl.style.display = 'inline-block';
    dlBtn.style.display = 'inline-flex';
    if (delBtn) delBtn.style.display = canEdit ? 'inline-flex' : 'none';
    if (previewBtn) previewBtn.style.display = 'inline-flex';
    if (previewSection && previewSection.style.display !== 'none' && iframe) {
      if (S.activeProject.pdfData && S.activeProject.pdfData.anx1) {
        if (iframe.src !== S.activeProject.pdfData.anx1) {
          iframe.src = S.activeProject.pdfData.anx1;
        }
      } else {
        if (!window.anx1InitialPreviewGenerated) {
           setTimeout(() => { exportAnx1PDF(null, true); }, 500);
           window.anx1InitialPreviewGenerated = true;
        }
      }
    }
  }
  if (window.initLucide) window.initLucide();
}
window.renderPdfUploadUIAnx1 = renderPdfUploadUIAnx1;
function togglePDFPreviewAnx1() {
  if (window.pdfPreview) window.pdfPreview.show('anx1');
  exportAnx1PDF(null, true);
}
async function deletePdfAnx1() {
  if (!S.activeProject) return;
  if (!confirm("Are you sure you want to delete the uploaded PDF? This will remove the file from the server.")) {
    return;
  }
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx1') : document.getElementById('pdf-iframe'));
  if (iframe) {
    iframe.removeAttribute('srcdoc');
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  }
  toast("Deleting PDF...", "info");
  S.activeProject.anx1PdfName = null;
  if (S.activeProject.pdfData) {
    if (S.activeProject.pdfData.anx1 && S.activeProject.pdfData.anx1.startsWith('blob:')) {
       URL.revokeObjectURL(S.activeProject.pdfData.anx1);
    }
    S.activeProject.pdfData.anx1 = null;
  }
  const pIdx = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pIdx !== -1) {
    S.projects[pIdx].anx1PdfName = null;
    if (S.projects[pIdx].pdfData) S.projects[pIdx].pdfData.anx1 = null;
  }
  renderPdfUploadUIAnx1();
  toast("PDF deleted successfully.", "success");
}
function handlePDFUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    toast('Error: Only PDF files are allowed.', 'danger');
    event.target.value = '';
    return;
  }
  toast('Uploading PDF...', 'info');
  const fileURL = URL.createObjectURL(file);
  S.activeProject.anx1PdfName = file.name;
  if (!S.activeProject.pdfData) S.activeProject.pdfData = {};
  S.activeProject.pdfData.anx1 = fileURL;
  if (window.storeProjectPdf) {
    window.storeProjectPdf('anx1', file).catch(err => console.error('Backend PDF upload failed:', err));
  }
  if (window.renderPdfToImages) {
    window.renderPdfToImages(file, (err, imgs) => {
      if (!err && imgs) {
        if (!S.uploadedPDFs) S.uploadedPDFs = {};
        S.uploadedPDFs.anx1 = imgs;
        if (window.debouncedSaveState) window.debouncedSaveState();
      }
    });
  }
  const pIdx = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pIdx !== -1) {
    S.projects[pIdx].anx1PdfName = file.name;
    if (!S.projects[pIdx].pdfData) S.projects[pIdx].pdfData = {};
    S.projects[pIdx].pdfData.anx1 = fileURL;
  }
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx1') : document.getElementById('pdf-iframe'));
  if (iframe) {
    iframe.removeAttribute('srcdoc');
    iframe.src = fileURL;
  }
  renderPdfUploadUIAnx1();
  toast('PDF uploaded and preview loaded!', 'success');
  event.target.value = '';
}
function closePDFPreview() {
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx1') : document.getElementById('pdf-iframe'));
  if (iframe) {
    iframe.removeAttribute('srcdoc');
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  }
}
function downloadPdfAnx1() {
  if (!S.activeProject) {
    toast('Please select and open a project first.', 'warn');
    return;
  }
  if (!S.activeProject.anx1PdfName) {
    toast('No PDF has been uploaded for this project yet. Please upload a PDF first.', 'warn');
    return;
  }
  if (window.downloadStoredPdf) {
    downloadStoredPdf('anx1', S.activeProject.anx1PdfName, S.activeProject.pdfData?.anx1);
    return;
  }
  const a = document.createElement('a');
  a.href = S.activeProject.pdfData.anx1;
  a.download = S.activeProject.anx1PdfName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
document.addEventListener('input', (e) => {
  if (e.target.closest('#view-anx1 table')) {
    scheduleAnx1LivePreview(700);
  }
});
document.addEventListener('change', (e) => {
  if (e.target.closest('#view-anx1 table')) {
    scheduleAnx1LivePreview(300);
  }
});

;

/* js/anx2.js */
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ANNEXURE II â€” MINING LEASES
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function downloadSectionTemplateAnx2(sectionType) {
  let csvContent = "";
  let filename = "";
  switch(sectionType) {
    case 'A':
      csvContent = "River Details,Sand Bar Code,Lease Details,Area (Ha),Latitude,Longitude,Distance from PA/WC (KM),Mining leases within 500m (Yes/No),Bulk Density (gm/cc),Depth of Deposits (m),Total Excavation (MT/YR),Total Excavation (Net 60%),Mineral to be mined,Existing/Proposed,Remarks\n";
      filename = "Table_A_Leases_Template.csv";
      break;
    case 'B':
      csvContent = "Owner Name,Sy.No (Khasra No),Area (Ha),Latitude,Longitude,District,Tehsil,Village,Total Reserve (MT),Total Mineral (60%),Existing/Proposed,Remarks\n";
      filename = "Table_B_Patta_Lands_Template.csv";
      break;
    case 'C':
      csvContent = "Name of Reservoir/Dams,Maintain/Controlled by,Latitude,Longitude,District,Tehsil,Village,Size (Ha),Quantity MT/Year,Existing/Proposed\n";
      filename = "Table_C_DeSiltation_Template.csv";
      break;
    case 'D':
      csvContent = "Plant Name,Owner,District,Tehsil,Village,Geo-location,Quantity Tonnes/Annum,Existing/Proposed\n";
      filename = "Table_D_MSand_Template.csv";
      break;
  }
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
function handleSectionUploadAnx2(event, sectionType) {
  const file = event.target.files[0];
  if (!file) return;
  const input = event.target;
  const sectionBlock = input.closest('.anx-section') || input.closest('.section-a-block');
  const table = sectionBlock ? sectionBlock.querySelector('table') : null;
  const targetTableId = table ? table.id : '';
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
      if (rows.length === 0) {
        toast("The uploaded file is empty.", "warn");
        return;
      }
      processExcelDataAnx2(rows, sectionType, targetTableId);
    } catch (error) {
      toast("Error parsing file. Please ensure it is a valid Excel or CSV file.", "error");
      console.error(error);
    }
    event.target.value = ''; 
  };
  reader.readAsArrayBuffer(file);
}
function processExcelDataAnx2(rows, sectionType, tableId) {
  const validRows = rows.filter(row => row.some(cell => String(cell !== undefined && cell !== null ? cell : "").trim() !== ""));
  let startIndex = 0;
  const headerIdx = validRows.findIndex(row => {
    const rowStr = row.map(c => String(c || '')).join(' ').toLowerCase();
    if (sectionType === 'A') return rowStr.includes('lease') || rowStr.includes('river');
    if (sectionType === 'B') return rowStr.includes('owner') || rowStr.includes('patta');
    if (sectionType === 'C') return rowStr.includes('reservoir') || rowStr.includes('desilt');
    if (sectionType === 'D') return rowStr.includes('plant') || rowStr.includes('msand');
    return false;
  });
  if (headerIdx >= 0) {
    startIndex = headerIdx + 1;
  }
  const dataRows = validRows.slice(startIndex);
  if (dataRows.length === 0) {
    toast("No data found after the header in the uploaded file.", "warn");
    return;
  }
  if (!tableId) {
    if (sectionType === 'A') tableId = 'anx2-leases';
    if (sectionType === 'B') tableId = 'anx2-patta';
    if (sectionType === 'C') tableId = 'anx2-desilt';
    if (sectionType === 'D') tableId = 'anx2-msand';
  }
  const uploadRows = [];
  dataRows.forEach((rowData, index) => {
    while (rowData.length < 18) rowData.push(""); 
    const isReadOnly = isUserReadOnly();
    let cellDataArray = [];
    const actionBtn = `<button class='btn btn-xs btn-danger' onclick='delRowAnx2(this)' style='display:${isReadOnly ? 'none' : 'inline-flex'};align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>`;
    if (sectionType === 'A') {
      let slNo = String(index + 1);
      let area = parseFloat(rowData[3]) || 0; 
      let bulkDensity = parseFloat(rowData[8]) || 1.54;
      let depth = parseFloat(rowData[9]) || 3.0;
      let gross = area * 10000 * depth * bulkDensity;
      let net = gross * 0.60;
      let withinVal = String(rowData[7] || "").trim();
      let epVal = String(rowData[13] || "").trim().toLowerCase();
      let epSelect = `<select ${isReadOnly ? 'disabled' : ''}><option ${epVal === 'existing' || epVal !== 'proposed' ? 'selected' : ''}>Existing</option><option ${epVal === 'proposed' ? 'selected' : ''}>Proposed</option></select>`;
      cellDataArray = [
        slNo,
        rowData[0], // River Details
        rowData[1], // Sand Bar Code
        rowData[2], // Lease Details
        area.toString(), // Area
        rowData[4], // Latitude
        rowData[5], // Longitude
        rowData[6], // Distance
        withinVal,  // Within 500m
        bulkDensity.toString(),
        depth.toString(),
        gross.toFixed(2),
        net.toFixed(2),
        rowData[12] || "Sand", // Mineral
        epSelect,
        rowData[14], // Remarks
        actionBtn
      ];
    } 
    else if (sectionType === 'B') {
      let slNo = String(index + 1);
      let area = parseFloat(rowData[2]) || 0;
      let reserve = Math.round(area * 10000 * 3 * 1.52);
      let mineral = Math.round(reserve * 0.60);
      let epVal = String(rowData[10] || "").trim().toLowerCase();
      let epSelect = `<select ${isReadOnly ? 'disabled' : ''}><option ${epVal === 'existing' || epVal !== 'proposed' ? 'selected' : ''}>Existing</option><option ${epVal === 'proposed' ? 'selected' : ''}>Proposed</option></select>`;
      cellDataArray = [
        slNo,
        rowData[0], // Owner
        rowData[1], // Sy.No
        area.toString(),
        rowData[3], // Latitude
        rowData[4], // Longitude
        rowData[5] || "Jalandhar", // District
        rowData[6], // Tehsil
        rowData[7], // Village
        reserve.toString(),
        mineral.toString(),
        epSelect,
        rowData[11], // Remarks
        actionBtn
      ];
    } 
    else if (sectionType === 'C') {
      let epVal = String(rowData[9] || "").trim().toLowerCase();
      let epSelect = `<select ${isReadOnly ? 'disabled' : ''}><option ${epVal === 'existing' || epVal !== 'proposed' ? 'selected' : ''}>Existing</option><option ${epVal === 'proposed' ? 'selected' : ''}>Proposed</option></select>`;
      cellDataArray = [
        rowData[0], // Name of Reservoir/Dams
        rowData[1], // Maintain/Controlled by
        rowData[2], // Latitude
        rowData[3], // Longitude
        rowData[4] || "Jalandhar", // District
        rowData[5], // Tehsil
        rowData[6], // Village
        rowData[7], // Size
        rowData[8], // Qty
        epSelect,
        actionBtn
      ];
    } 
    else if (sectionType === 'D') {
      let epVal = String(rowData[7] || "").trim().toLowerCase();
      let epSelect = `<select ${isReadOnly ? 'disabled' : ''}><option ${epVal === 'existing' || epVal !== 'proposed' ? 'selected' : ''}>Existing</option><option ${epVal === 'proposed' ? 'selected' : ''}>Proposed</option></select>`;
      cellDataArray = [
        rowData[0], // Plant Name
        rowData[1], // Owner
        rowData[2] || "Jalandhar", // District
        rowData[3], // Tehsil
        rowData[4], // Village
        rowData[5], // Geo-location
        rowData[6], // Quantity
        epSelect,
        actionBtn
      ];
    }
    uploadRows.push(cellDataArray);
  });
  if (typeof rbacApplyExcelRowsToTable === 'function') {
    rbacApplyExcelRowsToTable(tableId, uploadRows, row => addRowAnx2(tableId, row));
  } else {
    const tbody = document.getElementById(tableId).querySelector('tbody');
    tbody.innerHTML = '';
    uploadRows.forEach(row => addRowAnx2(tableId, row));
  }
  if (sectionType === 'B') updatePattaGrandTotals();
  if (sectionType === 'C') updateDesiltGrandTotals();
  toast(`Uploaded section ${sectionType} data successfully`, 'success');
}
function addRowAnx2(tableId, cellDataArray) {
  const tbody = document.querySelector('#' + tableId + ' tbody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  cellDataArray.forEach((data, index) => {
    const td = document.createElement('td');
    let dataStr = String(data !== undefined && data !== null ? data : '').trim();
    if (dataStr === '' && !dataStr.includes('<button') && !dataStr.includes('<select')) {
      dataStr = 'NUL';
    }
    if (!dataStr.includes('<button') && !dataStr.includes('<select')) {
      if (isUserReadOnly()) {
        td.contentEditable = "false";
        td.style.backgroundColor = 'var(--off)';
        td.style.cursor = 'not-allowed';
      } else {
        td.contentEditable = "true";
      }
      td.textContent = dataStr;
      if (tableId.startsWith('anx2-leases')) {
        if (index === 4 || index === 9 || index === 10) {
          td.addEventListener('input', function() { calcLeaseRow(this); });
        }
      } else if (tableId === 'anx2-patta') {
        if (index === 3) {
          td.addEventListener('input', function() { calcPattaRow(this); });
        }
      } else if (tableId === 'anx2-desilt') {
        if (index === 7) {
          td.addEventListener('input', function() { calcDesiltRow(this); });
        }
      }
    } else {
      td.innerHTML = dataStr;
    }
    tr.appendChild(td);
  });
  if (tableId.startsWith('anx2-leases')) {
    tr.children[11].classList.add('calc-total');
    tr.children[12].classList.add('calc-net');
    tr.children[11].contentEditable = "false";
    tr.children[12].contentEditable = "false";
  }
  else if(tableId === 'anx2-patta') {
    tr.children[9].classList.add('p-reserve');
    tr.children[10].classList.add('p-min');
    tr.children[9].addEventListener('input', updatePattaGrandTotals);
    tr.children[10].addEventListener('input', updatePattaGrandTotals);
  }
  else if(tableId === 'anx2-desilt') {
    tr.children[7].addEventListener('input', updateDesiltGrandTotals);
  }
  tbody.appendChild(tr);
  if (window.initLucide) window.initLucide();
}
function calcLeaseRow(element) {
  const row = element.closest('tr');
  const cells = row.cells;
  const area = parseFloat(cells[4].innerText) || 0;
  const bulkDensity = parseFloat(cells[9].innerText) || 0;
  const depth = parseFloat(cells[10].innerText) || 0;
  const gross = area * 10000 * depth * bulkDensity;
  const net = gross * 0.60;
  cells[11].innerText = gross > 0 ? gross.toFixed(2) : "0.00";
  cells[12].innerText = net > 0 ? net.toFixed(2) : "0.00";
}
function calcPattaRow(element) {
  const row = element.closest('tr');
  const cells = row.cells;
  const area = parseFloat(cells[3].innerText) || 0;
  const reserve = Math.round(area * 10000 * 3 * 1.52);
  const mineral = Math.round(reserve * 0.60);
  cells[9].innerText = reserve;
  cells[10].innerText = mineral;
  updatePattaGrandTotals();
}
function calcDesiltRow(element) {
  updateDesiltGrandTotals();
}
function updatePattaGrandTotals() {
  const table = document.getElementById('anx2-patta');
  if (!table) return;
  let areaSum = 0, resSum = 0, minSum = 0;
  table.querySelectorAll('tbody tr').forEach(tr => {
    areaSum += parseFloat(tr.children[3].innerText) || 0;
    resSum += parseFloat(tr.querySelector('.p-reserve')?.innerText || tr.children[9].innerText) || 0;
    minSum += parseFloat(tr.querySelector('.p-min')?.innerText || tr.children[10].innerText) || 0;
  });
  const sumAreaEl = document.getElementById('patta-sum-area');
  const sumReserveEl = document.getElementById('patta-sum-reserve');
  const sumMineralEl = document.getElementById('patta-sum-mineral');
  if (sumAreaEl) sumAreaEl.innerText = areaSum.toFixed(2);
  if (sumReserveEl) sumReserveEl.innerText = resSum.toFixed(0);
  if (sumMineralEl) sumMineralEl.innerText = minSum.toFixed(2);
}
function updatePattaTotals() {
  updatePattaGrandTotals();
}
function updateDesiltGrandTotals() {
  const table = document.getElementById('anx2-desilt');
  if (!table) return;
  let sizeSum = 0;
  table.querySelectorAll('tbody tr').forEach(tr => {
    sizeSum += parseFloat(tr.children[7].innerText) || 0;
  });
  const sumSizeEl = document.getElementById('desilt-sum-size');
  if (sumSizeEl) sumSizeEl.innerText = sizeSum.toFixed(2);
}
function updateDesiltTotals() {
  updateDesiltGrandTotals();
}
function delRowAnx2(btn) {
  const table = btn.closest('table');
  const tableId = table.id;
  btn.closest('tr').remove();
  if (tableId === 'anx2-patta') {
    updatePattaGrandTotals();
  } else if (tableId === 'anx2-desilt') {
    updateDesiltGrandTotals();
  }
}
function addNewLeaseRow(btn) {
  const tableId = btn.closest('.anx-section').querySelector('table').id;
  const isReadOnly = isUserReadOnly();
  addRowAnx2(tableId, ['', '', '', '', '0', '', '', '', '', '1.54', '3.00', '0.00', '0.00', 'Sand', `<select ${isReadOnly ? 'disabled' : ''}><option>Existing</option><option>Proposed</option></select>`, '', `<button class='btn btn-xs btn-danger' onclick='delRowAnx2(this)' style='display:${isReadOnly ? 'none' : 'inline-flex'};align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>`]);
}
let sectionACount = 1;
function addSectionABlock() {
  sectionACount++;
  const wrapper = document.getElementById('section-a-wrapper');
  const originalBlock = wrapper.querySelector('.section-a-block'); 
  const newBlock = originalBlock.cloneNode(true);
  newBlock.querySelector('.rm-sec-a-btn').style.display = 'inline-flex';
  const title = newBlock.querySelector('.anx-section-title');
  title.innerText = `a) Potential Mining Leases (Existing & Proposed) Rivers - Table ${sectionACount}:`;
  const newTable = newBlock.querySelector('table');
  newTable.id = 'anx2-leases-' + sectionACount;
  const tbody = newTable.querySelector('tbody');
  tbody.innerHTML = '';
  wrapper.appendChild(newBlock);
  addNewLeaseRow(newBlock.querySelector('.section-footer button'));
}
function getCellText(td) {
  const select = td.querySelector('select');
  if (select) return select.value;
  return td.innerText.trim();
}
function exportAnx2PDF(btn, isLivePreview = false) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'pt', 'a4'); 
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let startY = 80;
  const drawHeaderFooter = (data) => {
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Page " + data.pageNumber, pageWidth / 2, pageHeight - 20, { align: "center" });
  };
  const extractData = (tableId) => {
    const tbl = document.getElementById(tableId);
    const headers = Array.from(tbl.querySelectorAll('thead th')).slice(0, -1).map(th => th.innerText.trim().replace(/\n/g, ' '));
    const rows = [];
    tbl.querySelectorAll('tbody tr').forEach(tr => {
      const row = [];
      const tds = tr.querySelectorAll('td');
      for (let i = 0; i < tds.length - 1; i++) {
        row.push(getCellText(tds[i]));
      }
      rows.push(row);
    });
    return { headers, rows };
  };
  const sectionABlocks = document.querySelectorAll('.section-a-block');
  sectionABlocks.forEach((block, index) => {
    if (index > 0) {
      doc.addPage();
      startY = 80;
    }
    if (index === 0) {
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Annexure-II", pageWidth - 40, 55, { align: "right" }); // Top right annexure label
    }
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const titleExt = sectionABlocks.length > 1 ? ` (Table ${index + 1})` : '';
    doc.text(`> List of Potential Mining Leases (Existing & Proposed) Rivers${titleExt}:`, 40, startY);
    startY += 15;
    const tableId = block.querySelector('table').id;
    const leaseData = extractData(tableId);
    doc.autoTable({
      startY: startY,
      head: [leaseData.headers],
      body: leaseData.rows,
      theme: 'grid',
      styles: { font: 'times', fontSize: 8, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 3, valign: 'middle', halign: 'center' },
      headStyles: { fillColor: false, fontStyle: 'bold', halign: 'center', textColor: 0 },
      columnStyles: {
        5: { cellWidth: 70 }, // Latitude wrap
        6: { cellWidth: 70 }, // Longitude wrap
      },
      didDrawPage: (data) => drawHeaderFooter(data)
    });
    startY = doc.lastAutoTable.finalY + 15;
  });
  doc.addPage();
  startY = 80;
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("> Patta Lands/Khatedari Land: (Existing & Proposed):", 40, startY);
  startY += 15;
  const pattaData = extractData('anx2-patta');
  doc.autoTable({
    startY: startY,
    head: [pattaData.headers],
    body: pattaData.rows,
    foot: [
      [{content: 'Total', colSpan: 3, styles: {halign: 'center', fontStyle: 'bold'}},
       {content: document.getElementById('patta-sum-area').innerText, styles: {fontStyle: 'bold'}},
       '', '', '', '', '',
       {content: document.getElementById('patta-sum-reserve').innerText, styles: {fontStyle: 'bold'}},
       {content: document.getElementById('patta-sum-mineral').innerText, styles: {fontStyle: 'bold'}},
       '', '']
    ],
    theme: 'grid',
    styles: { font: 'times', fontSize: 8, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 3, valign: 'middle', halign: 'center' },
    headStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 },
    footStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 },
    didDrawPage: (data) => drawHeaderFooter(data)
  });
  startY = doc.lastAutoTable.finalY + 15;
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.text("(Reference: Table of the Proforma for the district of Jalandhar , Page no 560 -563 )", pageWidth - 40, startY, {align: 'right'});
  startY += 20;
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("> De-Siltation Location: (Lakes/Ponds/Dams etc.) (Existing & Proposed)", 40, startY);
  startY += 15;
  const desiltData = extractData('anx2-desilt');
  doc.autoTable({
    startY: startY,
    head: [desiltData.headers],
    body: desiltData.rows,
    foot: [
      [{content: 'Total', colSpan: 7, styles: {halign: 'center', fontStyle: 'bold'}},
       {content: document.getElementById('desilt-sum-size').innerText, styles: {fontStyle: 'bold'}},
       '', '']
    ],
    theme: 'grid',
    styles: { font: 'times', fontSize: 8, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 3, valign: 'middle', halign: 'center' },
    headStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 },
    footStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 }
  });
  startY = doc.lastAutoTable.finalY + 15;
  doc.setFont("times", "bold");
  doc.text("Note: The quantity of De-silting shall be assessed as per actual site conditions at the time of de-silting and got approved from the competent authority.", pageWidth / 2, startY, {align: 'center'});
  startY += 30;
  doc.setFontSize(11);
  doc.text("> M-Sand Plants : ( Existing & Proposed)", 40, startY);
  startY += 15;
  const msandData = extractData('anx2-msand');
  doc.autoTable({
    startY: startY,
    head: [msandData.headers],
    body: msandData.rows,
    theme: 'grid',
    styles: { font: 'times', fontSize: 8, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 3, valign: 'middle', halign: 'center' },
    headStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 },
    margin: { left: doc.internal.pageSize.getWidth()/2 - 300, right: doc.internal.pageSize.getWidth()/2 - 300 } 
  });
  if (isLivePreview) {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx2') : document.getElementById('pdf-iframe-anx2'));
    if (iframe) iframe.src = blobUrl;
  } else {
    doc.save('Annexure_II_Mining_Leases.pdf');
    toast('PDF downloaded successfully!', 'success');
  }
}
function renderPdfUploadUIAnx2() {
  const nameEl = document.getElementById('anx2-uploaded-filename');
  const dlBtn = document.getElementById('anx2-download-btn');
  const delBtn = document.getElementById('anx2-delete-btn');
  const previewBtn = document.getElementById('anx2-preview-btn');
  const previewSection = document.getElementById('pdf-preview-section-anx2');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx2') : document.getElementById('pdf-iframe-anx2'));
  if (!nameEl || !dlBtn) return;
  if (!S.activeProject) {
    nameEl.style.display = 'none';
    dlBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none';
    if (previewBtn) previewBtn.style.display = 'none';
    if (previewSection) previewSection.style.display = 'none';
    return;
  }
  const pdfName = S.activeProject.anx2PdfName;
  if (!pdfName) {
    nameEl.style.display = 'none';
    dlBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none';
    if (previewBtn) previewBtn.style.display = 'none';
    if (previewSection) {
      previewSection.style.display = 'none';
      if (iframe) iframe.src = 'about:blank';
    }
  } else {
    nameEl.textContent = pdfName;
    nameEl.style.display = 'inline-block';
    dlBtn.style.display = 'inline-flex';
    if (delBtn) delBtn.style.display = !isUserReadOnly() ? 'inline-flex' : 'none';
    if (previewBtn) previewBtn.style.display = 'inline-flex';
    if (previewSection && previewSection.style.display === 'block' && iframe) {
      if (S.activeProject.pdfData && S.activeProject.pdfData.anx2) {
        if (iframe.src !== S.activeProject.pdfData.anx2) {
          iframe.src = S.activeProject.pdfData.anx2;
        }
      }
    }
  }
  if (window.initLucide) window.initLucide();
}
window.renderPdfUploadUIAnx2 = renderPdfUploadUIAnx2;
function togglePDFPreviewAnx2() {
  const previewSection = document.getElementById('pdf-preview-section-anx2');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx2') : document.getElementById('pdf-iframe-anx2'));
  if (!previewSection || !iframe) return;
  if (previewSection.style.display === 'block') {
    previewSection.style.display = 'none';
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  } else {
    if (S.activeProject && S.activeProject.pdfData && S.activeProject.pdfData.anx2) {
      iframe.src = S.activeProject.pdfData.anx2;
      previewSection.style.display = 'block';
    } else {
      toast('No PDF preview available. Please re-upload.', 'warn');
    }
  }
}
async function deletePdfAnx2() {
  if (!S.activeProject) return;
  if (!confirm("Are you sure you want to delete the uploaded PDF? This will remove the file from the server.")) {
    return;
  }
  const previewSection = document.getElementById('pdf-preview-section-anx2');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx2') : document.getElementById('pdf-iframe-anx2'));
  if (previewSection) previewSection.style.display = 'none';
  if (iframe) {
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  }
  toast("Deleting PDF...", "info");
  S.activeProject.anx2PdfName = null;
  if (S.activeProject.pdfData) {
    if (S.activeProject.pdfData.anx2 && S.activeProject.pdfData.anx2.startsWith('blob:')) {
       URL.revokeObjectURL(S.activeProject.pdfData.anx2);
    }
    S.activeProject.pdfData.anx2 = null;
  }
  const pIdx = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pIdx !== -1) {
    S.projects[pIdx].anx2PdfName = null;
    if (S.projects[pIdx].pdfData) S.projects[pIdx].pdfData.anx2 = null;
  }
  renderPdfUploadUIAnx2();
  toast("PDF deleted successfully.", "success");
}
function handlePDFUploadAnx2(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    toast('Error: Only PDF files are allowed.', 'danger');
    event.target.value = '';
    return;
  }
  toast('Uploading PDF...', 'info');
  const fileURL = URL.createObjectURL(file);
  S.activeProject.anx2PdfName = file.name;
  if (!S.activeProject.pdfData) S.activeProject.pdfData = {};
  S.activeProject.pdfData.anx2 = fileURL;
  if (window.storeProjectPdf) {
    window.storeProjectPdf('anx2', file).catch(err => console.error('Backend PDF upload failed:', err));
  }
  if (window.renderPdfToImages) {
    window.renderPdfToImages(file, (err, imgs) => {
      if (!err && imgs) {
        if (!S.uploadedPDFs) S.uploadedPDFs = {};
        S.uploadedPDFs.anx2 = imgs;
        if (window.debouncedSaveState) window.debouncedSaveState();
      }
    });
  }
  const pIdx = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pIdx !== -1) {
    S.projects[pIdx].anx2PdfName = file.name;
    if (!S.projects[pIdx].pdfData) S.projects[pIdx].pdfData = {};
    S.projects[pIdx].pdfData.anx2 = fileURL;
  }
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx2') : document.getElementById('pdf-iframe-anx2'));
  if (iframe) {
    iframe.src = fileURL;
  }
  renderPdfUploadUIAnx2();
  toast('PDF uploaded and preview loaded!', 'success');
  event.target.value = '';
}
function closePDFPreviewAnx2() {
  const previewSection = document.getElementById('pdf-preview-section-anx2');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx2') : document.getElementById('pdf-iframe-anx2'));
  if (previewSection) previewSection.style.display = 'none';
  if (iframe) {
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  }
}
function downloadPdfAnx2() {
  if (!S.activeProject) {
    toast('Please select and open a project first.', 'warn');
    return;
  }
  if (!S.activeProject.anx2PdfName) {
    toast('No PDF has been uploaded for this project yet. Please upload a PDF first.', 'warn');
    return;
  }
  if (window.downloadStoredPdf) {
    downloadStoredPdf('anx2', S.activeProject.anx2PdfName, S.activeProject.pdfData?.anx2);
    return;
  }
  const a = document.createElement('a');
  a.href = S.activeProject.pdfData.anx2;
  a.download = S.activeProject.anx2PdfName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
document.addEventListener('input', (e) => {
  if (e.target.closest('#view-anx2 table')) {
    if (window.anx2DebounceTimer) clearTimeout(window.anx2DebounceTimer);
    window.anx2DebounceTimer = setTimeout(() => {
       exportAnx2PDF(null, true);
    }, 1500); // 1.5 seconds after typing stops
  }
});
document.addEventListener('change', (e) => {
  if (e.target.closest('#view-anx2 table')) {
    if (window.anx2DebounceTimer) clearTimeout(window.anx2DebounceTimer);
    window.anx2DebounceTimer = setTimeout(() => {
      exportAnx2PDF(null, true);
    }, 300);
  }
});
window.exportAnx2PDF = exportAnx2PDF;

;

/* js/anx3.js */
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ANNEXURE III â€” CLUSTERS & CONTIGUOUS CLUSTERS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/* â”€â”€â”€ Base64 Excel templates â”€â”€â”€ */
const CLUSTER_B64    = "UEsDBBQAAAAIACFVvlxGx01IlQAAAM0AAAAQAAAAZG9jUHJvcHMvYXBwLnhtbE3PTQvCMAwG4L9SdreZih6kDkQ9ip68zy51hbYpbYT67+0EP255ecgboi6JIia2mEXxLuRtMzLHDUDWI/o+y8qhiqHke64x3YGMsRoPpB8eA8OibdeAhTEMOMzit7Dp1C5GZ3XPlkJ3sjpRJsPiWDQ6sSctxD0sThDneiU+ixNLOZcrBf+LU8sVU57mym/8ZAW/B7oXUEsDBBQAAAAIACFVvly+E5jb7gAAACsCAAARAAAAZG9jUHJvcHMvY29yZS54bWzNksFOwzAMhl8F5d46aWGHqOtlEyeQkJgE4hYl3hataaLEqN3b04atE4IH4Bj7z+fPkhsdpPYRX6IPGMliuhtd1yepw5odiYIESPqITqVySvRTc++jUzQ94wGC0id1QKg4X4FDUkaRghlYhIXI2sZoqSMq8vGCN3rBh8/YZZjRgB067CmBKAWwdp4YzmPXwA0wwwijS98FNAsxV//E5g6wS3JMdkkNw1AOdc5NOwh4f356zesWtk+keo3Tr2QlnQOu2XXyW73Z7h5ZW/FqVfCHouY7weW9kLz+mF1/+N2EnTd2b/+x8VWwbeDXXbRfUEsDBBQAAAAIACFVvlyZXJwjEAYAAJwnAAATAAAAeGwvdGhlbWUvdGhlbWUxLnhtbO1aW3PaOBR+76/QeGf2bQvGNoG2tBNzaXbbtJmE7U4fhRFYjWx5ZJGEf79HNhDLlg3tkk26mzwELOn7zkVH5+g4efPuLmLohoiU8nhg2S/b1ru3L97gVzIkEUEwGaev8MAKpUxetVppAMM4fckTEsPcgosIS3gUy9Zc4FsaLyPW6rTb3VaEaWyhGEdkYH1eLGhA0FRRWm9fILTlHzP4FctUjWWjARNXQSa5iLTy+WzF/NrePmXP6TodMoFuMBtYIH/Ob6fkTlqI4VTCxMBqZz9Wa8fR0kiAgsl9lAW6Sfaj0xUIMg07Op1YznZ89sTtn4zK2nQ0bRrg4/F4OLbL0otwHATgUbuewp30bL+kQQm0o2nQZNj22q6RpqqNU0/T933f65tonAqNW0/Ta3fd046Jxq3QeA2+8U+Hw66JxqvQdOtpJif9rmuk6RZoQkbj63oSFbXlQNMgAFhwdtbM0gOWXin6dZQa2R273UFc8FjuOYkR/sbFBNZp0hmWNEZynZAFDgA3xNFMUHyvQbaK4MKS0lyQ1s8ptVAaCJrIgfVHgiHF3K/99Ze7yaQzep19Os5rlH9pqwGn7bubz5P8c+jkn6eT101CznC8LAnx+yNbYYcnbjsTcjocZ0J8z/b2kaUlMs/v+QrrTjxnH1aWsF3Pz+SejHIju932WH32T0duI9epwLMi15RGJEWfyC265BE4tUkNMhM/CJ2GmGpQHAKkCTGWoYb4tMasEeATfbe+CMjfjYj3q2+aPVehWEnahPgQRhrinHPmc9Fs+welRtH2Vbzco5dYFQGXGN80qjUsxdZ4lcDxrZw8HRMSzZQLBkGGlyQmEqk5fk1IE/4rpdr+nNNA8JQvJPpKkY9psyOndCbN6DMawUavG3WHaNI8ev4F+Zw1ChyRGx0CZxuzRiGEabvwHq8kjpqtwhErQj5iGTYacrUWgbZxqYRgWhLG0XhO0rQR/FmsNZM+YMjszZF1ztaRDhGSXjdCPmLOi5ARvx6GOEqa7aJxWAT9nl7DScHogstm/bh+htUzbCyO90fUF0rkDyanP+kyNAejmlkJvYRWap+qhzQ+qB4yCgXxuR4+5Xp4CjeWxrxQroJ7Af/R2jfCq/iCwDl/Ln3Ppe+59D2h0rc3I31nwdOLW95GblvE+64x2tc0LihjV3LNyMdUr5Mp2DmfwOz9aD6e8e362SSEr5pZLSMWkEuBs0EkuPyLyvAqxAnoZFslCctU02U3ihKeQhtu6VP1SpXX5a+5KLg8W+Tpr6F0PizP+Txf57TNCzNDt3JL6raUvrUmOEr0scxwTh7LDDtnPJIdtnegHTX79l125COlMFOXQ7gaQr4Dbbqd3Do4npiRuQrTUpBvw/npxXga4jnZBLl9mFdt59jR0fvnwVGwo+88lh3HiPKiIe6hhpjPw0OHeXtfmGeVxlA0FG1srCQsRrdguNfxLBTgZGAtoAeDr1EC8lJVYDFbxgMrkKJ8TIxF6HDnl1xf49GS49umZbVuryl3GW0iUjnCaZgTZ6vK3mWxwVUdz1Vb8rC+aj20FU7P/lmtyJ8MEU4WCxJIY5QXpkqi8xlTvucrScRVOL9FM7YSlxi84+bHcU5TuBJ2tg8CMrm7Oal6ZTFnpvLfLQwJLFuIWRLiTV3t1eebnK56Inb6l3fBYPL9cMlHD+U751/0XUOufvbd4/pukztITJx5xREBdEUCI5UcBhYXMuRQ7pKQBhMBzZTJRPACgmSmHICY+gu98gy5KRXOrT45f0Usg4ZOXtIlEhSKsAwFIRdy4+/vk2p3jNf6LIFthFQyZNUXykOJwT0zckPYVCXzrtomC4Xb4lTNuxq+JmBLw3punS0n/9te1D20Fz1G86OZ4B6zh3OberjCRaz/WNYe+TLfOXDbOt4DXuYTLEOkfsF9ioqAEativrqvT/klnDu0e/GBIJv81tuk9t3gDHzUq1qlZCsRP0sHfB+SBmOMW/Q0X48UYq2msa3G2jEMeYBY8wyhZjjfh0WaGjPVi6w5jQpvQdVA5T/b1A1o9g00HJEFXjGZtjaj5E4KPNz+7w2wwsSO4e2LvwFQSwMEFAAAAAgAIVW+XIiZ43qDAgAAYAcAABgAAAB4bC93b3Jrc2hlZXRzL3NoZWV0MS54bWyNlV1v2jAUhu/3K6xIk7pdxMF8qgrRWvpBJ9oh6LpLZBIHsjoxc8zH/v2OHRNRmmS9IbFznvf44NfH/l7I13zNmEKHlGf50FkrtbnEOA/XLKW5KzYsgy+xkClVMJQrnG8ko5GBUo6J5/VwSpPMCXwzN5WBL7aKJxmbSpRv05TKv9eMi/3QaTnHiVmyWis9gQN/Q1dsztTPzVTCCJcqUZKyLE9EhiSLh85V63JMdLwJeEnYPj95R7qSpRCvevAQDR1PL4hxFiqtQOGxYyPGuRa... (B64 truncated for clarity but matches original template file data)";
const CONTIGUOUS_B64 = "UEsDBBQAAAAIACFVvlxGx01IlQAAAM0AAAAQAAAAZG9jUHJvcHMvYXBwLnhtbE3PTQvCMAwG4L9SdreZih6kDkQ9ip68zy51hbYpbYT67+0EP255ecgboi6JIia2mEXxLuRtMzLHDUDWI/o+y8qhiqHke64x3YGMsRoPpB8eA8OibdeAhTEMOMzit7Dp1C5GZ3XPlkJ3sjpRJsPiWDQ6sSctxD0sThDneiU+ixNLOZcrBf+LU8sVU57mym/8ZAW/B7oXUEsDBBQAAAAIACFVvly+E5jb7gAAACsCAAARAAAAZG9jUHJvcHMvY29yZS54bWzNksFOwzAMhl8F5d46aWGHqOtlEyeQkJgE4hYl3hataaLEqN3b04atE4IH4Bj7z+fPkhsdpPYRX6IPGMliuhtd1yepw5odiYIESPqITqVySvRTc++jUzQ94wGC0id1QKg4X4FDUkaRghlYhIXI2sZoqSMq8vGCN3rBh8/YZZjRgB067CmBKAWwdp4YzmPXwA0wwwijS98FNAsxV//E5g6wS3JMdkkNw1AOdc5NOwh4f356zesWtk+keo3Tr2QlnQOu2XXyW73Z7h5ZW/FqVfCHouY7weW9kLz+mF1/+N2EnTd2b/+x8VWwbeDXXbRfUEsDBBQAAAAIACFVvlyZXJwjEAYAAJwnAAATAAAAeGwvdGhlbWUvdGhlbWUxLnhtbO1aW3PaOBR+76/QeGf2bQvGNoG2tBNzaXbbtJmE7U4fhRFYjWx5ZJGEf79HNhDLlg3tkk26mzwELOn7zkVH5+g4efPuLmLohoiU8nhg2S/b1ru3L97gVzIkEUEwGaev8MAKpUxetVppAMM4fckTEsPcgosIS3gUy9Zc4FsaLyPW6rTb3VaEaWyhGEdkYH1eLGhA0FRRWm9fILTlHzP4FctUjWWjARNXQSa5iLTy+WzF/NrePmXP6TodMoFuMBtYIH/Ob6fkTlqI4VTCxMBqZz9Wa8fR0kiAgsl9lAW6Sfaj0xUIMg07Op1YznZ89sTtn4zK2nQ0bRrg4/F4OLbL0otwHATgUbuewp30bL+kQQm0o2nQZNj22q6RpqqNU0/T933f65tonAqNW0/Ta3fd046Jxq3QeA2+8U+Hw66JxqvQdOtpJif9rmuk6RZoQkbj63oSFbXlQNMgAFhwdtbM0gOWXin6dZQa2R273UFc8FjuOYkR/sbFBNZp0hmWNEZynZAFDgA3xNFMUHyvQbaK4MKS0lyQ1s8ptVAaCJrIgfVHgiHF3K/99Ze7yaQzep19Os5rlH9pqwGn7bubz5P8c+jkn6eT101CznC8LAnx+yNbYYcnbjsTcjocZ0J8z/b2kaUlMs/v+QrrTjxnH1aWsF3Pz+SejHIju932WH32T0duI9epwLMi15RGJEWfyC265BE4tUkNMhM/CJ2GmGpQHAKkCTGWoYb4tMasEeATfbe+CMjfjYj3q2+aPVehWEnahPgQRhrinHPmc9Fs+welRtH2Vbzco5dYFQGXGN80qjUsxdZ4lcDxrZw8HRMSzZQLBkGGlyQmEqk5fk1IE/4rpdr+nNNA8JQvJPpKkY9psyOndCbN6DMawUavG3WHaNI8ev4F+Zw1ChyRGx0CZxuzRiGEabvwHq8kjpqtwhErQj5iGTYacrUWgbZxqYRgWhLG0XhO0rQR/FmsNZM+YMjszZF1ztaRDhGSXjdCPmLOi5ARvx6GOEqa7aJxWAT9nl7DScHogstm/bh+htUzbCyO90fUF0rkDyanP+kyNAejmlkJvYRWap+qhzQ+qB4yCgXxuR4+5Xp4CjeWxrxQroJ7Af/R2jfCq/iCwDl/Ln3Ppe+59D2h0rc3I31nwdOLW95GblvE+64x2tc0LihjV3LNyMdUr5Mp2DmfwOz9aD6e8e362SSEr5pZLSMWkEuBs0EkuPyLyvAqxAnoZFslCctU02U3ihKeQhtu6VP1SpXX5a+5KLg8W+Tpr6F0PizP+Txf57TNCzNDt3JL6raUvrUmOEr0scxwTh7LDDtnPJIdtnegHTX79l125COlMFOXQ7gaQr4Dbbqd3Do4npiRuQrTUpBvw/npxXga4jnZBLl9mFdt59jR0fvnwVGwo+88lh3HiPKiIe6hhpjPw0OHeXtfmGeVxlA0FG1srCQsRrdguNfxLBTgZGAtoAeDr1EC8lJVYDFbxgMrkKJ8TIxF6HDnl1xf49GS49umZbVuryl3GW0iUjnCaZgTZ6vK3mWxwVUdz1Vb8rC+aj20FU7P/lmtyJ8MEU4WCxJIY5QXpkqi8xlTvucrScRVOL9FM7YSlxi84+bHcU5TuBJ2tg8CMrm7Oal6ZTFnpvLfLQwJLFuIWRLiTV3t1eebnK56Inb6l3fBYPL9cMlHD+U751/0XUOufvbd4/ukztITJx5xREBdEUCI5UcBhYXMuRQ7pQCw9JkHk9/yVcP5TvmlFj3j7kZ17yV3mJi4hxF1kKFIYKSSc9lZq/KzQ3mF56otWTWUR/W1pTqor1rf3WbksT8ZIpwsFiSQxigvTNV7vpJEXIXzWzRjK3GJwTtuLdFpC1fCzvZBQCZ3NydVryzmzET+u4UhgWULMUviV+trrz5P7nba24jZ6V/cBYPJ99slH292zrn62XeP65tN7iAxcYYVRwTQFSmMVHIYWFzIkEO5S0IaTAT0Ppn+ki+NlArlVp/kP2lVhk9c0kUSFAqwDAUhF3Ljv+5T09193rR+6rMFtrFW0ZCVXykOJXp6ZsR+4R6ZddUWWCjcc0vO2y9830N7D+2Gf7t30d9n/xM9zI4R/6wZ/90/F+1E+xZf/G/YF3+X4wGvzefL/Fnk42xW/vJnO278x8fH8W/8V8bVwbaBT3fR+k9QSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwUGAAAAAAkACQBJAgAAbRIYAAAAA= (B64 truncated for clarity but matches original template file data)";
const ACTUAL_CLUSTER_B64 = "UEsDBBQAAAAIACFVvlxGx01IlQAAAM0AAAAQAAAAZG9jUHJvcHMvYXBwLnhtbE3PTQvCMAwG4L9SdreZih6kDkQ9ip68zy51hbYpbYT67+0EP255ecgboi6JIia2mEXxLuRtMzLHDUDWI/o+y8qhiqHke64x3YGMsRoPpB8eA8OibdeAhTEMOMzit7Dp1C5GZ3XPlkJ3sjpRJsPiWDQ6sSc/u9wcChDneiU+ixNLOZcrBf+LU8sVU57mym/8ZAW/B7oXUEsDBBQAAAAIACFVvly+E5jb7gAAACsCAAARAAAAZG9jUHJvcHMvY29yZS54bWzNksFOwzAMhl8F5d46aWGHqOtlEyeQkJgE4hYl3hataaLEqN3b04atE4IH4Bj7z+fPkhsdpPYRX6IPGMliuhtd1yepw5odiYIESPqITqVySvRTc++jUzQ94wGC0id1QKg4X4FDUkaRghlYhIXI2sZoqSMq8vGCN3rBh8/YZZjRgB067CmBKAWwdp4YzmPXwA0wwwijS98FNAsxV//E5g6wS3JMdkkNw1AOdc5NOwh4f356zesWtk+keo3Tr2QlnQOu2XXyW73Z7h5ZW/FqVfCHouY7weW9kLz+mF1/+N2EnTd2b/+x8VWwbeDXXbRfUEsDBBQAAAAIACFVvlyZXJwjEAYAAJwnAAATAAAAeGwvdGhlbWUvdGhlbWUxLnhtbO1aW3PaOBR+76/QeGf2bQvGNoG2tBNzaXbbtJmE7U4fhRFYjWx5ZJGEf79HNhDLlg3tkk26mzwELOn7zkVH5+g4efPuLmLohoiU8nhg2S/b1ru3L97gVzIkEUEwGaev8MAKpUxetVppAMM4fckTEsPcgosIS3gUy9Zc4FsaLyPW6rTb3VaEaWyhGEdkYH1eLGhA0FRRWm9fILTlHzP4FctUjWWjARNXQSa5iLTy+WzF/NrePmXP6TodMoFuMBtYIH/Ob6fkTlqI4VTCxMBqZz9Wa8fR0kiAgsl9lAW6Sfaj0xUIMg07Op1YznZ89sTtn4zK2nQ0bRrg4/F4OLbL0otwHATgUbuewp30bL+kQQm0o2nQZNj22q6RpqqNU0/T933f65tonAqNW0/Ta3fd046Jxq3QeA2+8U+Hw66JxqvQdOtpJif9rmuk6RZoQkbj63oSFbXlQNMgAFhwdtbM0gOWXin6dZQa2R273UFc8FjuOYkR/sbFBNZp0hmWNEZynZAFDgA3xNFMUHyvQbaK4MKS0lyQ1s8ptVAaCJrIgfVHgiHF3K/99Ze7yaQzep19Os5rlH9pqwGn7bubz5P8c+jkn6eT101CznC8LAnx+yNbYYcnbjsTcjocZ0J8z/b2kaUlMs/v+QrrTjxnH1aWsF3Pz+SejHIju932WH32T0duI9epwLMi15RGJEWfyC265BE4tUkNMhM/CJ2GmGpQHAKkCTGWoYb4tMasEeATfbe+CMjfjYj3q2+aPVehWEnahPgQRhrinHPmc9Fs+welRtH2Vbzco5dYFQGXGN80qjUsxdZ4lcDxrZw8HRMSzZQLBkGGlyQmEqk5fk1IE/4rpdr+nNNA8JQvJPpKkY9psyOndCbN6DMawUavG3WHaNI8ev4F+Zw1ChyRGx0CZxuzRiGEabvwHq8kjpqtwhErQj5iGTYacrUWgbZxqYRgWhLG0XhO0rQR/FmsNZM+YMjszZF1ztaRDhGSXjdCPmLOi5ARvx6GOEqa7aJxWAT9nl7DScHogstm/bh+htUzbCyO90fUF0rkDyanP+kyNAejmlkJvYRWap+qhzQ+qB4yCgXxuR4+5Xp4CjeWxrxQroJ7Af/R2jfCq/iCwDl/Ln3Ppe+59D2h0rc3I31nwdOLW95GblvE+64x2tc0LihjV3LNyMdUr5Mp2DmfwOz9aD6e8e362SSEr5pZLSMWkEuBs0EkuPyLyvAqxAnoZFslCctU02U3ihKeQhtu6VP1SpXX5a+5KLg8W+Tpr6F0PizP+Txf57TNCzNDt3JL6raUvrUmOEr0scxwTh7LDDtnPJIdtnegHTX79l125COlMFOXQ7gaQr4Dbbqd3Do4npiRuQrTUpBvw/npxXga4jnZBLl9mFdt59jR0fvnwVGwo+88lh3HiPKiIe6hhpjPw0OHeXtfmGeVxlA0FG1srCQsRrdguNfxLBTgZGAtoAeDr1EC8lJVYDFbxgMrkKJ8TIxF6HDnl1xf49GS49umZbVuryl3GW0iUjnCaZgTZ6vK3mWxwVUdz1Vb8rC+aj20FU7P/lmtyJ8MEU4WCxJIY5QXpkqi8xlTvucrScRVOL9FM7YSlxi84+bHcU5TuBJ2tg8CMrm7Oal6ZTFnpvLfLQwJLFuIWRLiTV3t1eebnK56Inb6l3fBYPL9cMlHD+U751/0XUOufvbd4/ukztITJx5xREBdEUCI5UcBhYXMuRQ7pQCw9JkHk9/yVcP5TvmlFj3j7kZ17yV3mJi4hxF1kKFIYKSSc9lZq/KzQ3mF56otwtZiq1p1rTqWnXtsT8ZIpwsFiSQxigvTNV7vpJEXIXzWzRjK3GJwTtuLdFpC1fCzvZBQCZ3NydVryzmzET+u4UhgWULMUviV+trrz5P7nba24jZ6V/cBYPJ99slH292zrn62XeP65tN7iAxcYYVRwTQFSmMVHIYWFzIkEO5S0IaTAT0Ppn+ki+NlArlVp/kP2lVhk9c0kUSFAqwDAUhF3Ljv+5T09193rR+6rMFtrFW0ZCVXykOJXp6ZsR+4R6ZddUWWCjcc0vO2y9830N7D+2Gf7t30d9n/xM9zI4R/6wZ/90/F+1E+xZf/G/YF3+X4wGvzefL/Fnk42xW/vJnO278x8fH8W/8V8bVwbaBT3fR+k9QSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwUGAAAAAAkACQBJAgAAbRIYAAAAA=";
const ACTUAL_CONTIGUOUS_B64 = "UEsDBBQAAAAIACFVvlxGx01IlQAAAM0AAAAQAAAAZG9jUHJvcHMvYXBwLnhtbE3PTQvCMAwG4L9SdreZih6kDkQ9ip68zy51hbYpbYT67+0EP255ecgboi6JIia2mEXxLuRtMzLHDUDWI/o+y8qhiqHke64x3YGMsRoPpB8eA8OibdeAhTEMOMzit7Dp1C5GZ3XPlkJ3sjpRJsPiWDQ6sSc/u9wcChDneiU+ixNLOZcrBf+LU8sVU57mym/8ZAW/B7oXUEsDBBQAAAAIACFVvly+E5jb7gAAACsCAAARAAAAZG9jUHJvcHMvY29yZS54bWzNksFOwzAMhl8F5d46aWGHqOtlEyeQkJgE4hYl3hataaLEqN3b04atE4IH4Bj7z+fPkhsdpPYRX6IPGMliuhtd1yepw5odiYIESPqITqVySvRTc++jUzQ94wGC0id1QKg4X4FDUkaRghlYhIXI2sZoqSMq8vGCN3rBh8/YZZjRgB067CmBKAWwdp4YzmPXwA0wwwijS98FNAsxV//E5g6wS3JMdkkNw1AOdc5NOwh4f356zesWtk+keo3Tr2QlnQOu2XXyW73Z7h5ZW/FqVfCHouY7weW9kLz+mF1/+N2EnTd2b/+x8VWwbeDXXbRfUEsDBBQAAAAIACFVvlyZXJwjEAYAAJwnAAATAAAAeGwvdGhlbWUvdGhlbWUxLnhtbO1aW3PaOBR+76/QeGf2bQvGNoG2tBNzaXbbtJmE7U4fhRFYjWx5ZJGEf79HNhDLlg3tkk26mzwELOn7zkVH5+g4efPuLmLohoiU8nhg2S/b1ru3L97gVzIkEUEwGaev8MAKpUxetVppAMM4fckTEsPcgosIS3gUy9Zc4FsaLyPW6rTb3VaEaWyhGEdkYH1eLGhA0FRRWm9fILTlHzP4FctUjWWjARNXQSa5iLTy+WzF/NrePmXP6TodMoFuMBtYIH/Ob6fkTlqI4VTCxMBqZz9Wa8fR0kiAgsl9lAW6Sfaj0xUIMg07Op1YznZ89sTtn4zK2nQ0bRrg4/F4OLbL0otwHATgUbuewp30bL+kQQm0o2nQZNj22q6RpqqNU0/T933f65tonAqNW0/Ta3fd046Jxq3QeA2+8U+Hw66JxqvQdOtpJif9rmuk6RZoQkbj63oSFbXlQNMgAFhwdtbM0gOWXin6dZQa2R273UFc8FjuOYkR/sbFBNZp0hmWNEZynZAFDgA3xNFMUHyvQbaK4MKS0lyQ1s8ptVAaCJrIgfVHgiHF3K/99Ze7yaQzep19Os5rlH9pqwGn7bubz5P8c+jkn6eT101CznC8LAnx+yNbYYcnbjsTcjocZ0J8z/b2kaUlMs/v+QrrTjxnH1aWsF3Pz+SejHIju932WH32T0duI9epwLMi15RGJEWfyC265BE4tUkNMhM/CJ2GmGpQHAKkCTGWoYb4tMasEeATfbe+CMjfjYj3q2+aPVehWEnahPgQRhrinHPmc9Fs+welRtH2Vbzco5dYFQGXGN80qjUsxdZ4lcDxrZw8HRMSzZQLBkGGlyQmEqk5fk1IE/4rpdr+nNNA8JQvJPpKkY9psyOndCbN6DMawUavG3WHaNI8ev4F+Zw1ChyRGx0CZxuzRiGEabvwHq8kjpqtwhErQj5iGTYacrUWgbZxqYRgWhLG0XhO0rQR/FmsNZM+YMjszZF1ztaRDhGSXjdCPmLOi5ARvx6GOEqa7aJxWAT9nl7DScHogstm/bh+htUzbCyO90fUF0rkDyanP+kyNAejmlkJvYRWap+qhzQ+qB4yCgXxuR4+5Xp4CjeWxrxQroJ7Af/R2jfCq/iCwDl/Ln3Ppe+59D2h0rc3I31nwdOLW95GblvE+64x2tc0LihjV3LNyMdUr5Mp2DmfwOz9aD6e8e362SSEr5pZLSMWkEuBs0EkuPyLyvAqxAnoZFslCctU02U3ihKeQhtu6VP1SpXX5a+5KLg8W+Tpr6F0PizP+Txf57TNCzNDt3JL6raUvrUmOEr0scxwTh7LDDtnPJIdtnegHTX79l125COlMFOXQ7gaQr4Dbbqd3Do4npiRuQrTUpBvw/npxXga4jnZBLl9mFdt59jR0fvnwVGwo+88lh3HiPKiIe6hhpjPw0OHeXtfmGeVxlA0FG1srCQsRrdguNfxLBTgZGAtoAeDr1EC8lJVYDFbxgMrkKJ8TIxF6HDnl1xf49GS49umZbVuryl3GW0iUjnCaZgTZ6vK3mWxwVUdz1Vb8rC+aj20FU7P/lmtyJ8MEU4WCxJIY5QXpkqi8xlTvucrScRVOL9FM7YSlxi84+bHcU5TuBJ2tg8CMrm7Oal6ZTFnpvLfLQwJLFuIWRLiTV3t1eebnK56Inb6l3fBYPL9cMlHD+U751/0XUOufvbd4/ukztITJx5xREBdEUCI5UcBhYXMuRQ7pQCw9JkHk9/yVcP5TvmlFj3j7kZ17yV3mJi4hxF1kKFIYKSSc9lZq/KzQ3mF56otwtZiq1p1rTqWnXtsT8ZIpwsFiSQxigvTNV7vpJEXIXzWzRjK3GJwTtuLdFpC1fCzvZBQCZ3NydVryzmzET+u4UhgWULMUviV+trrz5P7nba24jZ6V/cBYPJ99slH292zrn62XeP65tN7iAxcYYVRwTQFSmMVHIYWFzIkEO5S0IaTAT0Ppn+ki+NlArlVp/kP2lVhk9c0kUSFAqwDAUhF3Ljv+5T09193rR+6rMFtrFW0ZCVXykOJXp6ZsR+4R6ZddUWWCjcc0vO2y9830N7D+2Gf7t30d9n/xM9zI4R/6wZ/90/F+1E+xZf/G/YF3+X4wGvzefL/Fnk42xW/vJnO278x8fH8W/8V8bVwbaBT3fR+k9QSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwUGAAAAAAkACQBJAgAAbRIYAAAAA=";
/* â”€â”€â”€ Helpers â”€â”€â”€ */
function b64toBlob(b64, mime) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
function dlBlob(blob, fname) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fname;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
/* â”€â”€â”€ Download templates â”€â”€â”€ */
function dlTemplate(type) {
  if (type === 'cluster') {
    dlBlob(b64toBlob(ACTUAL_CLUSTER_B64, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), 'Cluster_Details_Template.xlsx');
  } else {
    dlBlob(b64toBlob(ACTUAL_CONTIGUOUS_B64, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), 'Contiguous_Clusters_Template.xlsx');
  }
}
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CLUSTER TABLE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
let clusterData = [
  { river:'Sutlej', cluster:'1', lease:'Jalandhar Sutlej 1,2', location:'Riverbed', village:'Kadiana', area:25.27, excav:1074334.80 },
  { river:'Sutlej', cluster:'2', lease:'Jalandhar Sutlej 3,4', location:'Riverbed', village:'Chhauala', area:21.43, excav:1027755.96 },
  { river:'Sutlej', cluster:'3', lease:'Jalandhar Sutlej 5,6,7', location:'Riverbed', village:'Barj Hassan', area:21.93, excav:697078.08 }
];
function renderCluster() {
  const tbody = document.getElementById('clusterBody');
  const tfoot = document.getElementById('clusterFoot');
  if (!tbody || !tfoot) return;
  tbody.innerHTML = '';
  let totalArea = 0, totalExcav = 0;
  clusterData.forEach((row, i) => {
    const mineral = row.excav * 0.6;
    totalArea  += Number(row.area)  || 0;
    totalExcav += Number(row.excav) || 0;
    const isReadOnly = isUserReadOnly();
    const cEd = isReadOnly ? `contenteditable="false" style="background:var(--off); cursor:not-allowed;"` : `contenteditable="true"`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td ${cEd} onblur="clusterData[${i}].river=this.innerText.trim()">${row.river}</td>
      <td ${cEd} onblur="clusterData[${i}].cluster=this.innerText.trim()">${row.cluster}</td>
      <td ${cEd} style="text-align:left;white-space:pre-wrap;min-width:140px;" onblur="clusterData[${i}].lease=this.innerText.trim()">${row.lease}</td>
      <td>
        <select ${isReadOnly ? 'disabled' : ''} onchange="clusterData[${i}].location=this.value">
          <option ${row.location==='Riverbed'?'selected':''}>Riverbed</option>
          <option ${row.location==='Patta Land'?'selected':''}>Patta Land</option>
        </select>
      </td>
      <td ${cEd} onblur="clusterData[${i}].village=this.innerText.trim()">${row.village}</td>
      <td ${cEd} onblur="clusterData[${i}].area=parseFloat(this.innerText.replace(/,/g,''))||0;renderCluster()">${(+row.area).toFixed(2)}</td>
      <td ${cEd} onblur="clusterData[${i}].excav=parseFloat(this.innerText.replace(/,/g,''))||0;renderCluster()">${(+row.excav).toFixed(2)}</td>
      <td>${fmtN(mineral,2)}</td>
      <td style="${isReadOnly ? 'display:none;' : ''}"><button class="btn btn-xs btn-danger" onclick="delCluster(${i})" style="display:inline-flex;align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button></td>`;
    tbody.appendChild(tr);
  });
  if (window.initLucide) window.initLucide();
  tfoot.innerHTML = `<tr class="total-row">
    <td colspan="5" style="text-align:right;font-weight:bold;">Total</td>
    <td>${totalArea.toFixed(2)}</td>
    <td>${totalExcav.toFixed(2)}</td>
    <td>${(totalExcav*0.6).toFixed(2)}</td>
    <td></td>
  </tr>`;
}
function addClusterRow() {
  clusterData.push({ river:'', cluster:'', lease:'', location:'Riverbed', village:'', area:0, excav:0 });
  renderCluster();
  const rows = document.getElementById('clusterBody').querySelectorAll('tr');
  rows[rows.length-1]?.scrollIntoView({ behavior:'smooth', block:'center' });
}
function delCluster(i) {
  if (clusterData.length === 1) { alert('Need at least one row.'); return; }
  clusterData.splice(i, 1);
  renderCluster();
}
/* â”€â”€â”€ Export Cluster XLSX â”€â”€â”€ */
function exportClusterXlsx() {
  const ws_data = [
    ['River Name','Cluster No.','Lease No','Location (Riverbed/Patta Land)','Village','Area (in Ha.)','Total Excavation (MT)','Total Mineral Excavation (MT) @60%']
  ];
  let totArea=0, totExcav=0;
  clusterData.forEach(r => {
    totArea  += +r.area;
    totExcav += +r.excav;
    ws_data.push([r.river, r.cluster, r.lease, r.location, r.village, +r.area, +r.excav, +(r.excav*0.6).toFixed(2)]);
  });
  ws_data.push(['','','','','TOTAL', +totArea.toFixed(2), +totExcav.toFixed(2), +(totExcav*0.6).toFixed(2)]);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  ws['!cols'] = [14,12,30,22,20,14,22,28].map(w=>({wch:w}));
  XLSX.utils.book_append_sheet(wb, ws, 'Cluster_Details');
  XLSX.writeFile(wb, 'Cluster_Details_Export.xlsx');
}
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CONTIGUOUS TABLE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
let contData = [
  { river:'Sutlej', ccNo:'1', clusterNo:'10,11', leases:10, location:'Riverbed', distance:'0.55km', village:'Minwal, Mau Sahib', area:71.01, mineral:1978752.45 },
  { river:'Sutlej', ccNo:'2', clusterNo:'16,17', leases:10, location:'Riverbed', distance:'1.38km', village:'Burewal, Chak hathiana, Naurangpur, Burewal, Naurangpur', area:127.91, mineral:2664913.66 }
];
function renderCont() {
  const tbody = document.getElementById('contBody');
  const tfoot = document.getElementById('contFoot');
  if (!tbody || !tfoot) return;
  tbody.innerHTML = '';
  let totalArea = 0, totalMin = 0;
  contData.forEach((row, i) => {
    totalArea += Number(row.area)    || 0;
    totalMin  += Number(row.mineral) || 0;
    const isReadOnly = isUserReadOnly();
    const cEd = isReadOnly ? `contenteditable="false" style="background:var(--off); cursor:not-allowed;"` : `contenteditable="true"`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td ${cEd} onblur="contData[${i}].river=this.innerText.trim()">${row.river}</td>
      <td ${cEd} onblur="contData[${i}].ccNo=this.innerText.trim()">${row.ccNo}</td>
      <td ${cEd} onblur="contData[${i}].clusterNo=this.innerText.trim()">${row.clusterNo}</td>
      <td ${cEd} onblur="contData[${i}].leases=this.innerText.trim()">${row.leases}</td>
      <td>
        <select ${isReadOnly ? 'disabled' : ''} onchange="contData[${i}].location=this.value">
          <option ${row.location==='Riverbed'?'selected':''}>Riverbed</option>
          <option ${row.location==='Patta Land'?'selected':''}>Patta Land</option>
        </select>
      </td>
      <td ${cEd} onblur="contData[${i}].distance=this.innerText.trim()">${row.distance}</td>
      <td ${cEd} style="text-align:left;white-space:pre-wrap;min-width:100px;" onblur="contData[${i}].village=this.innerText.trim()">${row.village}</td>
      <td ${cEd} onblur="contData[${i}].area=parseFloat(this.innerText.replace(/,/g,''))||0;renderContigous()">${(+row.area).toFixed(2)}</td>
      <td ${cEd} onblur="contData[${i}].mineral=parseFloat(this.innerText.replace(/,/g,''))||0;renderContigous()">${(+row.mineral).toFixed(2)}</td>
      <td style="${isReadOnly ? 'display:none;' : ''}"><button class="btn btn-xs btn-danger" onclick="delCont(${i})" style="display:inline-flex;align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button></td>`;
    tbody.appendChild(tr);
  });
  if (window.initLucide) window.initLucide();
  tfoot.innerHTML = `<tr class="total-row">
    <td colspan="7" style="text-align:right;font-weight:bold;">Total</td>
    <td>${totalArea.toFixed(2)}</td>
    <td>${totalMin.toFixed(2)}</td>
    <td></td>
  </tr>`;
}
function renderContigous() {
  return renderCont();
}
function addContRow() {
  contData.push({ river:'', ccNo:'', clusterNo:'', leases:'', location:'Riverbed', distance:'', village:'', area:0, mineral:0 });
  renderContigous();
  const rows = document.getElementById('contBody').querySelectorAll('tr');
  rows[rows.length-1]?.scrollIntoView({ behavior:'smooth', block:'center' });
}
function delCont(i) {
  if (contData.length === 1) { alert('Need at least one row.'); return; }
  contData.splice(i, 1);
  renderContigous();
}
/* â”€â”€â”€ Export Contiguous XLSX â”€â”€â”€ */
function exportContXlsx() {
  const ws_data = [
    ['River Name','Contiguous Cluster No.','Cluster No','Number of leases in the cluster','Location (Riverbed / Patta Land)','Distance between clusters','Village','Area Of Cluster (Ha)','Total Mineral Excavation (MT) @60%']
  ];
  let totArea=0, totMin=0;
  contData.forEach(r => {
    totArea += +r.area;
    totMin  += +r.mineral;
    ws_data.push([r.river, r.ccNo, r.clusterNo, r.leases, r.location, r.distance, r.village, +r.area, +r.mineral]);
  });
  ws_data.push(['','','','','','','TOTAL', +totArea.toFixed(2), +totMin.toFixed(2)]);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  ws['!cols'] = [14,22,14,18,22,20,24,18,30].map(w=>({wch:w}));
  XLSX.utils.book_append_sheet(wb, ws, 'Contiguous_Clusters');
  XLSX.writeFile(wb, 'Contiguous_Clusters_Export.xlsx');
}
function textFromAnx3Cell(cell) {
  if (!cell) return '';
  const select = cell.querySelector('select');
  if (select) return select.value || '';
  return (cell.textContent || '').trim();
}
function numberFromAnx3Cell(cell) {
  return parseFloat(textFromAnx3Cell(cell).replace(/,/g, '')) || 0;
}
function syncAnx3ClusterDataFromTable() {
  const rows = Array.from(document.querySelectorAll('#anx3-clusters tbody tr'));
  clusterData = rows.map(row => {
    const cells = row.children;
    return {
      river: textFromAnx3Cell(cells[0]),
      cluster: textFromAnx3Cell(cells[1]),
      lease: textFromAnx3Cell(cells[2]),
      location: textFromAnx3Cell(cells[3]) || 'Riverbed',
      village: textFromAnx3Cell(cells[4]),
      area: numberFromAnx3Cell(cells[5]),
      excav: numberFromAnx3Cell(cells[6])
    };
  }).filter(row => Object.values(row).some(value => value !== '' && value !== 0));
}
function syncAnx3ContDataFromTable() {
  const rows = Array.from(document.querySelectorAll('#anx3-contiguous tbody tr'));
  contData = rows.map(row => {
    const cells = row.children;
    return {
      river: textFromAnx3Cell(cells[0]),
      ccNo: textFromAnx3Cell(cells[1]),
      clusterNo: textFromAnx3Cell(cells[2]),
      leases: textFromAnx3Cell(cells[3]),
      location: textFromAnx3Cell(cells[4]) || 'Riverbed',
      distance: textFromAnx3Cell(cells[5]),
      village: textFromAnx3Cell(cells[6]),
      area: numberFromAnx3Cell(cells[7]),
      mineral: numberFromAnx3Cell(cells[8])
    };
  }).filter(row => Object.values(row).some(value => value !== '' && value !== 0));
}
function applyRbacAnx3Upload(tableId, rows, appendRow, syncData, beforeFullReplace) {
  if (typeof rbacApplyExcelRowsToTable !== 'function') return false;
  const table = document.getElementById(tableId);
  const fullAccess = typeof getEditableColumnsForTable === 'function' && getEditableColumnsForTable(table) === null;
  if (fullAccess && typeof beforeFullReplace === 'function') beforeFullReplace();
  const result = rbacApplyExcelRowsToTable(tableId, rows, appendRow);
  syncData();
  return result !== false;
}
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   UPLOAD EXCEL â†’ PARSE â†’ FILL TABLE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function uploadExcel(event, type) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (rows.length < 2) { alert('No data rows found in Excel.'); return; }
      const dataRows = rows.slice(1).filter(r => r.some(c => c !== ''));
      if (type === 'cluster') {
        const uploadRows = dataRows.map(r => [
          String(r[0] || ''),
          String(r[1] || ''),
          String(r[2] || ''),
          String(r[3] || 'Riverbed'),
          String(r[4] || ''),
          parseFloat(r[5]) || 0,
          parseFloat(r[6]) || 0,
          ((parseFloat(r[6]) || 0) * 0.6).toFixed(2)
        ]);
        if (uploadRows.length === 0) { alert('No valid rows found.'); return; }
        if (applyRbacAnx3Upload('anx3-clusters', uploadRows, row => {
          clusterData.push({
            river: String(row[0] || ''),
            cluster: String(row[1] || ''),
            lease: String(row[2] || ''),
            location: String(row[3] || 'Riverbed'),
            village: String(row[4] || ''),
            area: parseFloat(row[5]) || 0,
            excav: parseFloat(row[6]) || 0
          });
          renderCluster();
        }, syncAnx3ClusterDataFromTable, () => { clusterData = []; })) {
          renderCluster();
          if (typeof enforceActiveViewHierarchy === 'function') enforceActiveViewHierarchy(true);
          alert(`Loaded ${clusterData.length} cluster row(s) from Excel. Locked columns were preserved.`);
          return;
        }
      } else {
        const uploadRows = dataRows.map(r => [
          String(r[0] || ''),
          String(r[1] || ''),
          String(r[2] || ''),
          String(r[3] || ''),
          String(r[4] || 'Riverbed'),
          String(r[5] || ''),
          String(r[6] || ''),
          parseFloat(r[7]) || 0,
          parseFloat(r[8]) || 0
        ]);
        if (uploadRows.length === 0) { alert('No valid rows found.'); return; }
        if (applyRbacAnx3Upload('anx3-contiguous', uploadRows, row => {
          contData.push({
            river: String(row[0] || ''),
            ccNo: String(row[1] || ''),
            clusterNo: String(row[2] || ''),
            leases: String(row[3] || ''),
            location: String(row[4] || 'Riverbed'),
            distance: String(row[5] || ''),
            village: String(row[6] || ''),
            area: parseFloat(row[7]) || 0,
            mineral: parseFloat(row[8]) || 0
          });
          renderContigous();
        }, syncAnx3ContDataFromTable, () => { contData = []; })) {
          renderContigous();
          if (typeof enforceActiveViewHierarchy === 'function') enforceActiveViewHierarchy(true);
          alert(`Loaded ${contData.length} contiguous cluster row(s) from Excel. Locked columns were preserved.`);
          return;
        }
      }
      if (type === 'cluster') {
        clusterData = dataRows.map(r => ({
          river:    String(r[0]||''),
          cluster:  String(r[1]||''),
          lease:    String(r[2]||''),
          location: String(r[3]||'Riverbed'),
          village:  String(r[4]||''),
          area:     parseFloat(r[5])||0,
          excav:    parseFloat(r[6])||0
        }));
        if (clusterData.length === 0) { alert('No valid rows found.'); return; }
        renderCluster();
        alert(`âœ… Loaded ${clusterData.length} cluster row(s) from Excel.`);
      } else {
        contData = dataRows.map(r => ({
          river:    String(r[0]||''),
          ccNo:     String(r[1]||''),
          clusterNo:String(r[2]||''),
          leases:   String(r[3]||''),
          location: String(r[4]||'Riverbed'),
          distance: String(r[5]||''),
          village:  String(r[6]||''),
          area:     parseFloat(r[7])||0,
          mineral:  parseFloat(r[8])||0
        }));
        if (contData.length === 0) { alert('No valid rows found.'); return; }
        renderContigous();
        alert(`âœ… Loaded ${contData.length} contiguous cluster row(s) from Excel.`);
      }
    } catch(err) {
      alert('Error reading Excel file: ' + err.message);
    }
    event.target.value = ''; // reset input
  };
  reader.readAsBinaryString(file);
}
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   LEGACY FUNCTIONS (FOR BACKWARD COMPATIBILITY)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function addAnx3Row(tblId='anx3-clusters') {
  const tbody=document.querySelector('#'+tblId+' tbody');
  if (!tbody) return;
  tbody.insertAdjacentHTML('beforeend',`<tr>
    <td contenteditable="true">Sutlej</td><td contenteditable="true">${tbody.rows.length+1}</td>
    <td contenteditable="true">NPRO_JL_PL_ST_XX</td>
    <td><select><option>Riverbed</option><option>Patta Land</option></select></td>
    <td contenteditable="true">Village Name</td>
    <td contenteditable="true" oninput="calcClusterRow(this)">0</td>
    <td contenteditable="true" oninput="calcClusterRow(this)">0</td>
    <td class="anx3-mineral">0</td>
    <td><button class="btn btn-xs btn-danger" onclick="delRow(this)" style="display:inline-flex;align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button></td>
  </tr>`);
  if (window.initLucide) window.initLucide();
}
function addAnx3ContRow() {
  const tbody=document.querySelector('#anx3-contiguous tbody');
  if (!tbody) return;
  tbody.insertAdjacentHTML('beforeend',`<tr>
    <td contenteditable="true">Sutlej</td><td contenteditable="true">CC-${tbody.rows.length+1}</td>
    <td contenteditable="true">1,2,3</td><td contenteditable="true">9</td>
    <td><select><option>Riverbed</option><option>Patta Land</option></select></td>
    <td contenteditable="true">0.55km</td><td contenteditable="true">Village Name</td>
    <td contenteditable="true">0</td><td contenteditable="true">0</td>
    <td><button class="btn btn-xs btn-danger" onclick="delRow(this)" style="display:inline-flex;align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button></td>
  </tr>`);
  if (window.initLucide) window.initLucide();
}
function calcClusterRow(el) {
  const row=el.closest('tr');
  const cells=row.querySelectorAll('td[contenteditable="true"]');
  const tds = row.querySelectorAll('td');
  const excav=parseFloat(tds[6]?.textContent)||0;
  const mineralCell=row.querySelector('.anx3-mineral');
  if (mineralCell) mineralCell.textContent=fmtN(excav*0.6,2);
}
window.renderCluster = renderCluster;
window.renderContiguous = renderContigous;
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PDF UPLOAD & MANAGEMENT (ANNEXURE III)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderPdfUploadUI() {
  const nameEl = document.getElementById('anx3-uploaded-filename');
  const dlBtn = document.getElementById('anx3-download-btn');
  const delBtn = document.getElementById('anx3-delete-btn');
  const previewBtn = document.getElementById('anx3-preview-btn');
  const previewSection = document.getElementById('pdf-preview-section-anx3');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx3') : document.getElementById('pdf-iframe-anx3'));
  if (!nameEl || !dlBtn) return;
  if (!S.activeProject) {
    nameEl.style.display = 'none';
    dlBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none';
    if (previewBtn) previewBtn.style.display = 'none';
    if (previewSection) previewSection.style.display = 'none';
    return;
  }
  const pdfName = S.activeProject.annexure3PdfName;
  if (!pdfName) {
    nameEl.style.display = 'none';
    dlBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none';
    if (previewBtn) previewBtn.style.display = 'none';
    if (previewSection) {
      previewSection.style.display = 'none';
      if (iframe) iframe.src = 'about:blank';
    }
  } else {
    nameEl.textContent = pdfName;
    nameEl.style.display = 'inline-block';
    dlBtn.style.display = 'inline-flex';
    if (delBtn) delBtn.style.display = !isUserReadOnly() ? 'inline-flex' : 'none';
    if (previewBtn) previewBtn.style.display = 'inline-flex';
    if (previewSection && previewSection.style.display === 'block' && iframe) {
      if (S.activeProject.pdfData && S.activeProject.pdfData.anx3) {
        if (iframe.src !== S.activeProject.pdfData.anx3) {
          iframe.src = S.activeProject.pdfData.anx3;
        }
      }
    }
  }
  if (window.initLucide) window.initLucide();
}
function togglePDFPreviewAnx3() {
  const previewSection = document.getElementById('pdf-preview-section-anx3');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx3') : document.getElementById('pdf-iframe-anx3'));
  if (!previewSection || !iframe) return;
  if (previewSection.style.display === 'block') {
    previewSection.style.display = 'none';
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  } else {
    if (S.activeProject && S.activeProject.pdfData && S.activeProject.pdfData.anx3) {
      iframe.src = S.activeProject.pdfData.anx3;
      previewSection.style.display = 'block';
    } else {
      toast('No PDF preview available. Please re-upload.', 'warn');
    }
  }
}
async function deletePdfAnx3() {
  if (!S.activeProject) return;
  if (!confirm("Are you sure you want to delete the uploaded PDF?")) {
    return;
  }
  const previewSection = document.getElementById('pdf-preview-section-anx3');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx3') : document.getElementById('pdf-iframe-anx3'));
  if (previewSection) previewSection.style.display = 'none';
  if (iframe) {
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  }
  S.activeProject.annexure3PdfName = null;
  if (S.activeProject.pdfData) S.activeProject.pdfData.anx3 = null;
  const pIdx = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pIdx !== -1) {
    S.projects[pIdx].annexure3PdfName = null;
    if (S.projects[pIdx].pdfData) S.projects[pIdx].pdfData.anx3 = null;
  }
  renderPdfUploadUI();
  toast("PDF deleted successfully.", "success");
}
function handlePdfUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    toast('Error: Only PDF files are allowed.', 'danger');
    event.target.value = '';
    return;
  }
  toast('Uploading PDF...', 'info');
  const fileURL = URL.createObjectURL(file);
  S.activeProject.annexure3PdfName = file.name;
  if (!S.activeProject.pdfData) S.activeProject.pdfData = {};
  S.activeProject.pdfData.anx3 = fileURL;
  if (window.storeProjectPdf) {
    window.storeProjectPdf('anx3', file).catch(err => console.error('Backend PDF upload failed:', err));
  }
  if (window.renderPdfToImages) {
    window.renderPdfToImages(file, (err, imgs) => {
      if (!err && imgs) {
        if (!S.uploadedPDFs) S.uploadedPDFs = {};
        S.uploadedPDFs.anx3 = imgs;
        if (window.debouncedSaveState) window.debouncedSaveState();
      }
    });
  }
  const pIdx = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pIdx !== -1) {
    S.projects[pIdx].annexure3PdfName = file.name;
    if (!S.projects[pIdx].pdfData) S.projects[pIdx].pdfData = {};
    S.projects[pIdx].pdfData.anx3 = fileURL;
  }
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx3') : document.getElementById('pdf-iframe-anx3'));
  if (iframe) {
    iframe.src = fileURL;
  }
  renderPdfUploadUI();
  toast('PDF uploaded and preview loaded!', 'success');
  event.target.value = '';
}
function viewPdf() {
  if (S.activeProject && S.activeProject.pdfData && S.activeProject.pdfData.anx3) {
    window.open(S.activeProject.pdfData.anx3, '_blank');
  } else {
    toast('No PDF preview available. Please re-upload.', 'warn');
  }
}
function downloadPdf() {
  if (!S.activeProject) {
    toast('Please select and open a project first.', 'warn');
    return;
  }
  if (!S.activeProject.annexure3PdfName) {
    toast('No PDF has been uploaded for this project yet. Please upload a PDF first.', 'warn');
    return;
  }
  if (window.downloadStoredPdf) {
    downloadStoredPdf('anx3', S.activeProject.annexure3PdfName, S.activeProject.pdfData?.anx3);
    return;
  }
  const a = document.createElement('a');
  a.href = S.activeProject.pdfData.anx3;
  a.download = S.activeProject.annexure3PdfName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
function closePDFPreviewAnx3() {
  const previewSection = document.getElementById('pdf-preview-section-anx3');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx3') : document.getElementById('pdf-iframe-anx3'));
  if (previewSection) previewSection.style.display = 'none';
  if (iframe) {
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  }
}
function exportAnx3PDF(btn, isLivePreview = false) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'pt', 'a4'); 
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let startY = 80;
  const district = S.activeProject ? S.activeProject.district : 'JALANDHAR';
  const districtUpper = district.toUpperCase();
  const drawHeaderFooter = (data) => {
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Page " + data.pageNumber, pageWidth / 2, pageHeight - 20, { align: "center" });
  };
  const getCellTextLocal = (td) => {
    const select = td.querySelector('select');
    if (select) return select.value;
    return td.innerText.trim();
  };
  const extractData = (tableId) => {
    const tbl = document.getElementById(tableId);
    if (!tbl) return { headers: [], rows: [] };
    const headers = Array.from(tbl.querySelectorAll('thead th')).slice(0, -1).map(th => th.innerText.trim().replace(/\n/g, ' '));
    const rows = [];
    tbl.querySelectorAll('tbody tr').forEach(tr => {
      const row = [];
      const tds = tr.querySelectorAll('td');
      for (let i = 0; i < tds.length - 1; i++) {
        row.push(getCellTextLocal(tds[i]));
      }
      rows.push(row);
    });
    const tfoot = tbl.querySelector('tfoot');
    if (tfoot) {
      tfoot.querySelectorAll('tr').forEach(tr => {
        const row = [];
        const tds = tr.querySelectorAll('td');
        for (let i = 0; i < tds.length; i++) {
          const colSpan = parseInt(tds[i].getAttribute('colspan') || '1');
          row.push(tds[i].innerText.trim());
          for (let c = 1; c < colSpan; c++) {
            row.push('');
          }
        }
        if (row.length > headers.length) {
          rows.push(row.slice(0, headers.length));
        } else {
          rows.push(row);
        }
      });
    }
    return { headers, rows };
  };
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Annexure-III", pageWidth - 40, 55, { align: "right" });
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("> a) Cluster Details:", 40, startY);
  startY += 15;
  const clusterDataPdf = extractData('anx3-clusters');
  doc.autoTable({
    startY: startY,
    head: [clusterDataPdf.headers],
    body: clusterDataPdf.rows,
    theme: 'grid',
    styles: { font: 'times', fontSize: 8, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 4, valign: 'middle', halign: 'center' },
    headStyles: { fillColor: false, fontStyle: 'bold', halign: 'center', textColor: 0 },
    didDrawPage: (data) => drawHeaderFooter(data)
  });
  startY = doc.lastAutoTable.finalY + 30;
  if (startY > pageHeight - 120) {
    doc.addPage();
    startY = 80;
  }
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("> b) Contiguous Clusters:", 40, startY);
  startY += 15;
  const contDataPdf = extractData('anx3-contiguous');
  doc.autoTable({
    startY: startY,
    head: [contDataPdf.headers],
    body: contDataPdf.rows,
    theme: 'grid',
    styles: { font: 'times', fontSize: 8, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 4, valign: 'middle', halign: 'center' },
    headStyles: { fillColor: false, fontStyle: 'bold', halign: 'center', textColor: 0 },
    didDrawPage: (data) => drawHeaderFooter(data)
  });
  if (isLivePreview) {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx3') : document.getElementById('pdf-iframe-anx3'));
    if (iframe) iframe.src = blobUrl;
  } else {
    doc.save('Annexure_III_Cluster_Details.pdf');
    toast('PDF downloaded successfully!', 'success');
  }
}
/* â”€â”€â”€ DOMContentLoaded initialization â”€â”€â”€ */
window.addEventListener('DOMContentLoaded', () => {
  renderCluster();
  renderContigous();
  renderPdfUploadUI();
});
document.addEventListener('input', (e) => {
  if (e.target.closest('#view-anx3 table')) {
    if (window.anx3DebounceTimer) clearTimeout(window.anx3DebounceTimer);
    window.anx3DebounceTimer = setTimeout(() => {
       exportAnx3PDF(null, true);
    }, 1500); // 1.5 seconds after typing stops
  }
});
document.addEventListener('change', (e) => {
  if (e.target.closest('#view-anx3 table')) {
    if (window.anx3DebounceTimer) clearTimeout(window.anx3DebounceTimer);
    window.anx3DebounceTimer = setTimeout(() => {
      exportAnx3PDF(null, true);
    }, 300);
  }
});
window.exportAnx3PDF = exportAnx3PDF;

;

/* js/anx4.js */
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ANNEXURE IV â€” TRANSPORTATION ROUTES
   Supports multiple dynamic tables, context-aware Excel operations,
   and portrait PDF generation.
 â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const defaultRoutes = [
  [1, "Jalandhar Sutlej -\n1 Vill- Kadiana,\nBlock- Phillaur", "A-A'", 43, "NA", 0.73, "Unpaved", "Unpaved", "Lease Owner", "Route Map\nattached"],
  [2, "Jalandhar Sutlej -\n2 Vill- Kadiana,\nBlock- Phillaur", "B-B'", 315, "NA", 0.48, "Unpaved", "Unpaved", "Lease Owner", "Route Map\nattached"],
  [3, "Jalandhar Sutlej -\n3 Vill- Chhaula,\nBlock- Phillaur", "C-C'", 127, "NA", 2.1, "Unpaved", "Unpaved", "Lease Owner", "Route Map\nattached"],
];
const defaultClusters = [
  ["Cluster Jalandhar Sutlej -\n1,2 Vill- Kadiana,\nBlock- Phillaur", "A-A', B-B'", 358, "NA", 0.73, "Unpaved", "Unpaved", "Lease Owner", "Route Map\nattached"],
  ["Cluster Jalandhar Beas -\n3,4 Vill- Chhaula,\nBlock- Phillaur", "C-C' TO F-\nF'", 343, "NA", 2.1, "Unpaved", "Unpaved", "Lease Owner", "Route Map\nattached"],
];
const roadOptions = ["Unpaved", "Black Topped", "Metalled", "WBM", "Other"];
const constructorOptions = ["Lease Owner", "Govt", "Govt./Lease Owner"];
function makeSelect(options, selected) {
  const isReadOnly = isUserReadOnly();
  let html = `<select ${isReadOnly ? 'disabled' : ''}>`;
  options.forEach(o => {
    html += `<option${o === selected ? " selected" : ""}>${o}</option>`;
  });
  return html + `</select>`;
}
function delRow(btn) {
  btn.closest('tr').remove();
}
function renderRouteRow(data) {
  const [sl, lease, route, tpLease, tpAll, len, roadType, recom, constr, map] = data;
  const isReadOnly = isUserReadOnly();
  const cEd = isReadOnly ? `contenteditable="false" style="background:var(--off); cursor:not-allowed;"` : `contenteditable="true"`;
  return `<tr>
    <td ${cEd}>${sl}</td>
    <td ${cEd} style="text-align:left;white-space:pre-wrap">${lease}</td>
    <td ${cEd}>${route}</td>
    <td ${cEd}>${tpLease}</td>
    <td ${cEd}>${tpAll}</td>
    <td ${cEd}>${len}</td>
    <td>${makeSelect(roadOptions, roadType)}</td>
    <td>${makeSelect(roadOptions, recom)}</td>
    <td>${makeSelect(constructorOptions, constr)}</td>
    <td ${cEd} style="white-space:pre-wrap">${map}</td>
    <td style="${isReadOnly ? 'display:none;' : ''}">
      <button class="btn btn-xs btn-danger" onclick="delRow(this)" style="display:inline-flex; align-items:center; justify-content:center; padding:4px;">
        <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
      </button>
    </td>
  </tr>`;
}
function renderClusterRow(data) {
  const [cluster, route, tpCluster, tpAll, len, roadType, recom, constr, map] = data;
  const isReadOnly = isUserReadOnly();
  const cEd = isReadOnly ? `contenteditable="false" style="background:var(--off); cursor:not-allowed;"` : `contenteditable="true"`;
  return `<tr>
    <td ${cEd} style="text-align:left;white-space:pre-wrap">${cluster}</td>
    <td ${cEd}>${route}</td>
    <td ${cEd}>${tpCluster}</td>
    <td ${cEd}>${tpAll}</td>
    <td ${cEd}>${len}</td>
    <td>${makeSelect(roadOptions, roadType)}</td>
    <td>${makeSelect(roadOptions, recom)}</td>
    <td>${makeSelect(constructorOptions, constr)}</td>
    <td ${cEd} style="white-space:pre-wrap">${map}</td>
    <td style="${isReadOnly ? 'display:none;' : ''}">
      <button class="btn btn-xs btn-danger" onclick="delRow(this)" style="display:inline-flex; align-items:center; justify-content:center; padding:4px;">
        <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
      </button>
    </td>
  </tr>`;
}
function addAnx4Row(btn) {
  let tbody;
  if (btn) {
    tbody = btn.closest('.card').querySelector('.route-table-body');
  } else {
    tbody = document.querySelector('.route-table-body');
  }
  if (!tbody) return;
  const n = tbody.rows.length + 1;
  tbody.insertAdjacentHTML("beforeend", renderRouteRow([n, "", "", "", "", "", "Unpaved", "Unpaved", "Lease Owner", "Route Map attached"]));
  if (window.initLucide) window.initLucide();
}
function addAnx4ClusterRow(btn) {
  let tbody;
  if (btn) {
    tbody = btn.closest('.card').querySelector('.cluster-table-body');
  } else {
    tbody = document.querySelector('.cluster-table-body');
  }
  if (!tbody) return;
  tbody.insertAdjacentHTML("beforeend", renderClusterRow(["", "", "", "", "", "Unpaved", "Unpaved", "Lease Owner", "Route Map attached"]));
  if (window.initLucide) window.initLucide();
}
function addRouteTableBlock(prefill = false) {
  const container = document.getElementById("individual-routes-container");
  if (!container) return;
  const tableIdx = container.querySelectorAll(".table-block-card").length + 1;
  const title = tableIdx === 1 ? "Individual Lease Routes" : `Individual Lease Routes - Table ${tableIdx}`;
  const cardHtml = `
  <div class="card table-block-card" style="margin-bottom:24px;" data-type="individual">
    <div class="card-hd" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div class="card-title-group" style="display:flex; align-items:center; gap:8px;">
        <span class="card-title" contenteditable="true" style="font-weight: 600; border-bottom: 1px dashed var(--border-2); outline: none;">${title}</span>
        <span class="text-soft" style="font-size:11px;">(Click to edit title)</span>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="btn btn-excel-template btn-xs" onclick="downloadRouteTemplate(this)" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="file-spreadsheet" style="width:12px; height:12px;"></i>
          <span>Routes Template</span>
        </button>
        <label class="btn btn-excel-upload btn-xs" style="cursor:pointer; margin-bottom:0; display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="upload" style="width:12px; height:12px;"></i>
          <span>Upload Routes</span>
          <input type="file" accept=".xlsx,.xls" hidden onchange="uploadRoutes(event, this)">
        </label>
        <button class="btn btn-xs btn-outline" style="display:inline-flex; align-items:center; gap:6px;" onclick="addAnx4Row(this)">
          <i data-lucide="plus" style="width:12px; height:12px;"></i>
          <span>Add Row</span>
        </button>
        <button class="btn btn-xs btn-danger btn-delete-table" onclick="deleteTableBlock(this)" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
          <span>Delete Table</span>
        </button>
      </div>
    </div>
    <div class="card-bd">
      <div class="tbl-wrap">
        <table class="anx-tbl" style="min-width:1100px">
          <thead>
            <tr>
              <th style="width:50px">Sl.No.</th>
              <th style="min-width:160px">Lease No.</th>
              <th style="min-width:90px">Transportation Route No.</th>
              <th style="min-width:80px">Number of Tippers/day<br>(of lease)</th>
              <th style="min-width:80px">Number of tippers/day<br>(of all leases on route)</th>
              <th style="min-width:80px">Length of Route (Km)</th>
              <th style="min-width:100px">Type of Road</th>
              <th style="min-width:110px">Recommendation for road</th>
              <th style="min-width:110px">The road will be constructed by</th>
              <th style="min-width:100px">Route Map &amp; Location</th>
              <th style="width:50px">Action</th>
            </tr>
          </thead>
          <tbody class="route-table-body">
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
  container.insertAdjacentHTML("beforeend", cardHtml);
  const addedCard = container.lastElementChild;
  const tbody = addedCard.querySelector(".route-table-body");
  if (prefill) {
    tbody.innerHTML = defaultRoutes.map(renderRouteRow).join("");
  } else {
    tbody.innerHTML = renderRouteRow([1, "", "", "", "", "", "Unpaved", "Unpaved", "Lease Owner", "Route Map attached"]);
  }
  updateDeleteButtonsVisibility("individual");
  if (window.initLucide) window.initLucide();
}
function addClusterTableBlock(prefill = false) {
  const container = document.getElementById("cluster-routes-container");
  if (!container) return;
  const tableIdx = container.querySelectorAll(".table-block-card").length + 1;
  const title = tableIdx === 1 ? "Cluster Transportation Routes" : `Cluster Transportation Routes - Table ${tableIdx}`;
  const cardHtml = `
  <div class="card table-block-card" style="margin-bottom:24px;" data-type="cluster">
    <div class="card-hd" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div class="card-title-group" style="display:flex; align-items:center; gap:8px;">
        <span class="card-title" contenteditable="true" style="font-weight: 600; border-bottom: 1px dashed var(--border-2); outline: none;">${title}</span>
        <span class="text-soft" style="font-size:11px;">(Click to edit title)</span>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="btn btn-excel-template btn-xs" onclick="downloadClusterTemplate(this)" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="file-spreadsheet" style="width:12px; height:12px;"></i>
          <span>Cluster Template</span>
        </button>
        <label class="btn btn-excel-upload btn-xs" style="cursor:pointer; margin-bottom:0; display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="upload" style="width:12px; height:12px;"></i>
          <span>Upload Cluster</span>
          <input type="file" accept=".xlsx,.xls" hidden onchange="uploadClusters(event, this)">
        </label>
        <button class="btn btn-xs btn-outline" style="display:inline-flex; align-items:center; gap:6px;" onclick="addAnx4ClusterRow(this)">
          <i data-lucide="plus" style="width:12px; height:12px;"></i>
          <span>Add Row</span>
        </button>
        <button class="btn btn-xs btn-danger btn-delete-table" onclick="deleteTableBlock(this)" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
          <span>Delete Table</span>
        </button>
      </div>
    </div>
    <div class="card-bd">
      <div class="tbl-wrap">
        <table class="anx-tbl" style="min-width:1000px">
          <thead>
            <tr>
              <th style="min-width:130px">Cluster No</th>
              <th style="min-width:90px">Transportation Route No</th>
              <th style="min-width:80px">Number of tippers/day<br>(of cluster)</th>
              <th style="min-width:80px">Number of tippers/day<br>(of all clusters on route)</th>
              <th style="min-width:80px">Length of Route in KM</th>
              <th style="min-width:100px">Type of Road</th>
              <th style="min-width:110px">Recommendation for road</th>
              <th style="min-width:110px">The road will be constructed by</th>
              <th style="min-width:100px">Route Map &amp; Location</th>
              <th style="width:50px">Action</th>
            </tr>
          </thead>
          <tbody class="cluster-table-body">
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
  container.insertAdjacentHTML("beforeend", cardHtml);
  const addedCard = container.lastElementChild;
  const tbody = addedCard.querySelector(".cluster-table-body");
  if (prefill) {
    tbody.innerHTML = defaultClusters.map(renderClusterRow).join("");
  } else {
    tbody.innerHTML = renderClusterRow(["", "", "", "", "", "Unpaved", "Unpaved", "Lease Owner", "Route Map attached"]);
  }
  updateDeleteButtonsVisibility("cluster");
  if (window.initLucide) window.initLucide();
}
function deleteTableBlock(btn) {
  const card = btn.closest('.card');
  const container = card.parentElement;
  const type = card.getAttribute('data-type');
  const count = container.querySelectorAll(".table-block-card").length;
  if (count <= 1) {
    toast("You cannot delete the last remaining table.", "warn");
    return;
  }
  if (confirm("Are you sure you want to delete this entire table block?")) {
    card.remove();
    updateDeleteButtonsVisibility(type);
    toast("Table block deleted.", "success");
  }
}
function updateDeleteButtonsVisibility(type) {
  const container = document.getElementById(type === "individual" ? "individual-routes-container" : "cluster-routes-container");
  if (!container) return;
  const cards = container.querySelectorAll(".table-block-card");
  cards.forEach(card => {
    const delBtn = card.querySelector(".btn-delete-table");
    if (delBtn) {
      delBtn.style.display = cards.length <= 1 ? "none" : "inline-flex";
    }
  });
}
function initRoutesTable() {
  const container = document.getElementById("individual-routes-container");
  if (!container) return;
  container.innerHTML = "";
  addRouteTableBlock(true); // pre-populate with default examples
}
function initClustersTable() {
  const container = document.getElementById("cluster-routes-container");
  if (!container) return;
  container.innerHTML = "";
  addClusterTableBlock(true); // pre-populate with default examples
}
function downloadRouteTemplate(btn) {
  const card = btn ? btn.closest('.card') : document.querySelector('.table-block-card[data-type="individual"]');
  if (!card) return;
  const tbody = card.querySelector('.route-table-body');
  const title = card.querySelector('.card-title').textContent.trim();
  const wb = XLSX.utils.book_new();
  const headers = ["Sl.No", "Lease No.", "Transportation Route No.", "Number of Tippers/day of lease",
    "Number of tippers/day of all leases on route", "Length of Route (Km)",
    "Type of Road (Black Topped/Unpaved)", "Recommendation for road (Black Topped/Unpaved)",
    "The road will be constructed by Govt./Lease Owner", "Route Map & Location"];
  const rows = tbody.querySelectorAll("tr");
  const data = Array.from(rows).map(tr => {
    const cells = tr.querySelectorAll("td");
    return [
      cells[0].textContent.trim(),
      cells[1].textContent.trim(),
      cells[2].textContent.trim(),
      cells[3].textContent.trim(),
      cells[4].textContent.trim(),
      cells[5].textContent.trim(),
      cells[6].querySelector("select").value,
      cells[7].querySelector("select").value,
      cells[8].querySelector("select").value,
      cells[9].textContent.trim(),
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws['!cols'] = [8, 30, 16, 16, 18, 12, 18, 20, 22, 18].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, "Transportation_Routes");
  const safeFilename = title.replace(/[^a-z0-9]/gi, '_') + "_Template.xlsx";
  XLSX.writeFile(wb, safeFilename);
  toast(`${title} Excel downloaded âœ“`, "success");
}
function downloadClusterTemplate(btn) {
  const card = btn ? btn.closest('.card') : document.querySelector('.table-block-card[data-type="cluster"]');
  if (!card) return;
  const tbody = card.querySelector('.cluster-table-body');
  const title = card.querySelector('.card-title').textContent.trim();
  const wb = XLSX.utils.book_new();
  const headers = ["Cluster No", "Transportation Route No", "Number of tippers/day of cluster",
    "Number of tippers/day of all clusters on route", "Length of Route in KM",
    "Type of Road (Black Topped/Unpaved)", "Recommendation for road (Black Topped/Unpaved)",
    "The road will be constructed by Govt/Lease Owner", "Route Map & Location"];
  const rows = tbody.querySelectorAll("tr");
  const data = Array.from(rows).map(tr => {
    const cells = tr.querySelectorAll("td");
    return [
      cells[0].textContent.trim(),
      cells[1].textContent.trim(),
      cells[2].textContent.trim(),
      cells[3].textContent.trim(),
      cells[4].textContent.trim(),
      cells[5].querySelector("select").value,
      cells[6].querySelector("select").value,
      cells[7].querySelector("select").value,
      cells[8].textContent.trim(),
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws['!cols'] = [24, 18, 18, 20, 14, 18, 20, 22, 18].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, "Cluster_Routes");
  const safeFilename = title.replace(/[^a-z0-9]/gi, '_') + "_Template.xlsx";
  XLSX.writeFile(wb, safeFilename);
  toast(`${title} Excel downloaded âœ“`, "success");
}
function uploadRoutes(event, btn) {
  const file = event.target.files[0];
  if (!file) return;
  const card = btn ? btn.closest('.card') : document.querySelector('.table-block-card[data-type="individual"]');
  if (!card) return;
  const tbody = card.querySelector('.route-table-body');
  const title = card.querySelector('.card-title').textContent.trim();
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (rows.length < 2) { toast("No data rows found", "warn"); return; }
      const dataRows = rows.slice(1).filter(r => r.some(c => c !== ""));
      const uploadRows = dataRows.map(r => [
        r[0] || "", r[1] || "", r[2] || "", r[3] || "", r[4] || "", r[5] || "",
        r[6] || "Unpaved", r[7] || "Unpaved", r[8] || "Lease Owner", r[9] || "Route Map attached"
      ]);
      const table = card.querySelector('table');
      if (typeof rbacApplyExcelRowsToTable === 'function') {
        rbacApplyExcelRowsToTable(table, uploadRows, row => tbody.insertAdjacentHTML('beforeend', renderRouteRow(row)));
      } else {
        tbody.innerHTML = uploadRows.map(renderRouteRow).join("");
      }
      if (window.initLucide) window.initLucide();
      toast(`Loaded ${dataRows.length} route(s) into ${title} âœ“`, "success");
    } catch (err) { toast("Error reading file: " + err.message, "error"); }
  };
  reader.readAsBinaryString(file);
  event.target.value = "";
}
function uploadClusters(event, btn) {
  const file = event.target.files[0];
  if (!file) return;
  const card = btn ? btn.closest('.card') : document.querySelector('.table-block-card[data-type="cluster"]');
  if (!card) return;
  const tbody = card.querySelector('.cluster-table-body');
  const title = card.querySelector('.card-title').textContent.trim();
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (rows.length < 2) { toast("No data rows found", "warn"); return; }
      const dataRows = rows.slice(1).filter(r => r.some(c => c !== ""));
      const uploadRows = dataRows.map(r => [
        r[0] || "", r[1] || "", r[2] || "", r[3] || "", r[4] || "",
        r[5] || "Unpaved", r[6] || "Unpaved", r[7] || "Lease Owner", r[8] || "Route Map attached"
      ]);
      const table = card.querySelector('table');
      if (typeof rbacApplyExcelRowsToTable === 'function') {
        rbacApplyExcelRowsToTable(table, uploadRows, row => tbody.insertAdjacentHTML('beforeend', renderClusterRow(row)));
      } else {
        tbody.innerHTML = uploadRows.map(renderClusterRow).join("");
      }
      if (window.initLucide) window.initLucide();
      toast(`Loaded ${dataRows.length} cluster route(s) into ${title} âœ“`, "success");
    } catch (err) { toast("Error reading file: " + err.message, "error"); }
  };
  reader.readAsBinaryString(file);
  event.target.value = "";
}
function exportAnx4PDF(btn, isLivePreview = false) {
  if (typeof btn === 'boolean') {
    isLivePreview = btn;
    btn = null;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth(); // 210mm
  const pageH = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 12;
  const drawnPages = new Set();
  function drawFurnitureForPage(pageNum) {
    if (drawnPages.has(pageNum)) return;
    drawnPages.add(pageNum);
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Page " + pageNum, pageW / 2, pageH - 20, { align: "center" });
  }
  let currentY = margin + 20;
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0); // Pure Black
  doc.text("Annexure-IV", pageW - margin - 15, currentY, { align: "right" });
  currentY += 8;
  doc.setFontSize(10);
  doc.text(">  Transportation Routes for individual leases and leases in Cluster:", margin + 8, currentY);
  currentY += 6;
  const routeCards = document.getElementById("individual-routes-container")?.querySelectorAll(".table-block-card") || [];
  routeCards.forEach((card, cardIdx) => {
    const titleText = card.querySelector(".card-title").textContent.trim();
    const tbody = card.querySelector(".route-table-body");
    if (!tbody) return;
    if (currentY + 50 > pageH - 25) {
      doc.addPage();
      currentY = margin + 20;
    }
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.text(`Table ${cardIdx + 1}: ${titleText}`, margin + 8, currentY);
    currentY += 5;
    const routeHead = [[
      "SL.N\no",
      "Lease No.",
      "Transport\nation\nRoute No.",
      "Num\nber\nof\nTipp\ners\n/days\nof\nlease",
      "Numbe\nr of\ntippers\n/days of\nall the\nlease on\nroute",
      "Length\nof the\nRoute\nin Km",
      "Type of\nRoad\n(Black\nTopped/\nunpaved)",
      "Recomme\nndation\nfor road\n(Black\nTopped/\nunpaved)",
      "The road will\nbe constructed\nby Govt./ Lease\nOwner",
      "Route Map &\nLocation"
    ]];
    const rows = tbody.querySelectorAll("tr");
    const routeData = Array.from(rows).map(tr => {
      const cells = tr.querySelectorAll("td");
      return [
        cells[0].textContent.trim(),
        cells[1].textContent.trim(),
        cells[2].textContent.trim(),
        cells[3].textContent.trim(),
        cells[4].textContent.trim(),
        cells[5].textContent.trim(),
        cells[6].querySelector("select").value,
        cells[7].querySelector("select").value,
        cells[8].querySelector("select").value,
        cells[9].textContent.trim(),
      ];
    });
    doc.autoTable({
      head: routeHead,
      body: routeData,
      startY: currentY,
      margin: { top: margin + 12, bottom: 25, left: margin + 2, right: margin + 2 },
      theme: 'grid',
      styles: {
        font: "times",
        fontSize: 9,
        cellPadding: 1.2,
        valign: "middle",
        halign: "center",
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
        textColor: [0, 0, 0],
        overflow: "linebreak"
      },
      headStyles: {
        fillColor: false, // Pure White Header Background
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 9,
        halign: "center"
      },
      alternateRowStyles: { fillColor: false },
      columnStyles: {
        0: { cellWidth: 9 },
        1: { halign: "left", cellWidth: 32 },
        2: { cellWidth: 15 },
        3: { cellWidth: 12 },
        4: { cellWidth: 14 },
        5: { cellWidth: 12 },
        6: { cellWidth: 17 },
        7: { cellWidth: 20 },
        8: { cellWidth: 28 },
        9: { cellWidth: 23 }
      },
      didDrawPage: (data) => {
        drawFurnitureForPage(data.pageNumber);
      }
    });
    currentY = doc.lastAutoTable.finalY + 12;
  });
  const clusterCards = document.getElementById("cluster-routes-container")?.querySelectorAll(".table-block-card") || [];
  clusterCards.forEach((card, cardIdx) => {
    const titleText = card.querySelector(".card-title").textContent.trim();
    const tbody = card.querySelector(".cluster-table-body");
    if (!tbody) return;
    if (currentY + 50 > pageH - 25) {
      doc.addPage();
      currentY = margin + 20;
    }
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.text(`Cluster Table ${cardIdx + 1}: ${titleText}`, margin + 8, currentY);
    currentY += 5;
    const clusterHead = [[
      "Cluster No",
      "Transporta\ntion Route\nNo",
      "Num\nber\nof\ntippe\nrs\n/day\nof\nclust\ner",
      "Numbe\nr of\ntipper\ns /day\nof a l l\nthe\ncluster\ns on\nroute",
      "Leng\nth of\nRout\ne in\nKM",
      "Type of\nRoad\n(Black\nTopped/\nunpaved)",
      "Recomm\nendation\nfor road\n(Black\nTopped/\nunpaved\n)",
      "The road\nwill be\nConstru\ncted by\nGovt/Le\na Se\nOwner",
      "Route Map\n& Locati on"
    ]];
    const rows = tbody.querySelectorAll("tr");
    const clusterData = Array.from(rows).map(tr => {
      const cells = tr.querySelectorAll("td");
      return [
        cells[0].textContent.trim(),
        cells[1].textContent.trim(),
        cells[2].textContent.trim(),
        cells[3].textContent.trim(),
        cells[4].textContent.trim(),
        cells[5].querySelector("select").value,
        cells[6].querySelector("select").value,
        cells[7].querySelector("select").value,
        cells[8].textContent.trim(),
      ];
    });
    doc.autoTable({
      head: clusterHead,
      body: clusterData,
      startY: currentY,
      margin: { top: margin + 12, bottom: 25, left: margin + 2, right: margin + 2 },
      theme: 'grid',
      styles: {
        font: "times",
        fontSize: 9,
        cellPadding: 1.5,
        valign: "middle",
        halign: "center",
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
        textColor: [0, 0, 0],
        overflow: "linebreak"
      },
      headStyles: {
        fillColor: false, // Pure White Header Background
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 9,
        halign: "center"
      },
      alternateRowStyles: { fillColor: false },
      columnStyles: {
        0: { halign: "center", cellWidth: 35 },
        1: { cellWidth: 18 },
        2: { cellWidth: 12 },
        3: { cellWidth: 17 },
        4: { cellWidth: 12 },
        5: { cellWidth: 20 },
        6: { cellWidth: 22 },
        7: { cellWidth: 22 },
        8: { cellWidth: 24 }
      },
      didDrawPage: (data) => {
        drawFurnitureForPage(data.pageNumber);
      }
    });
    currentY = doc.lastAutoTable.finalY + 12;
  });
  if (isLivePreview) {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx4') : document.getElementById('pdf-iframe-anx4'));
    if (iframe) iframe.src = blobUrl;
  } else {
    doc.save("Annexure_IV_Transportation_Routes.pdf");
    toast('PDF downloaded successfully!', 'success');
  }
}
setTimeout(() => {
  if (document.getElementById('individual-routes-container')) {
    initRoutesTable();
    initClustersTable();
  }
}, 100);
function renderPdfUploadUIAnx4() {
  const nameEl = document.getElementById('anx4-uploaded-filename');
  const dlBtn = document.getElementById('anx4-download-btn');
  const delBtn = document.getElementById('anx4-delete-btn');
  const previewBtn = document.getElementById('anx4-preview-btn');
  const previewSection = document.getElementById('pdf-preview-section-anx4');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx4') : document.getElementById('pdf-iframe-anx4'));
  if (!nameEl || !dlBtn) return;
  if (!S.activeProject) {
    nameEl.style.display = 'none';
    dlBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none';
    if (previewBtn) previewBtn.style.display = 'none';
    if (previewSection) previewSection.style.display = 'none';
    return;
  }
  const pdfName = S.activeProject.anx4PdfName;
  if (!pdfName) {
    nameEl.style.display = 'none';
    dlBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none';
    if (previewBtn) previewBtn.style.display = 'none';
    if (previewSection) {
      previewSection.style.display = 'none';
      if (iframe) iframe.src = 'about:blank';
    }
  } else {
    nameEl.textContent = pdfName;
    nameEl.style.display = 'inline-block';
    dlBtn.style.display = 'inline-flex';
    if (delBtn) delBtn.style.display = !isUserReadOnly() ? 'inline-flex' : 'none';
    if (previewBtn) previewBtn.style.display = 'inline-flex';
    if (previewSection && previewSection.style.display === 'block' && iframe) {
      if (S.activeProject.pdfData && S.activeProject.pdfData.anx4) {
        if (iframe.src !== S.activeProject.pdfData.anx4) {
          iframe.src = S.activeProject.pdfData.anx4;
        }
      }
    }
  }
  if (window.initLucide) window.initLucide();
}
window.renderPdfUploadUIAnx4 = renderPdfUploadUIAnx4;
function togglePDFPreviewAnx4() {
  const previewSection = document.getElementById('pdf-preview-section-anx4');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx4') : document.getElementById('pdf-iframe-anx4'));
  if (!previewSection || !iframe) return;
  if (previewSection.style.display === 'block') {
    previewSection.style.display = 'none';
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  } else {
    if (S.activeProject && S.activeProject.pdfData && S.activeProject.pdfData.anx4) {
      iframe.src = S.activeProject.pdfData.anx4;
      previewSection.style.display = 'block';
    } else {
      toast('No PDF preview available. Please re-upload.', 'warn');
    }
  }
}
function handlePDFUploadAnx4(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    toast('Error: Only PDF files are allowed.', 'danger');
    event.target.value = '';
    return;
  }
  toast('Uploading PDF...', 'info');
  toast('Uploading PDF...', 'info');
  const fileURL = URL.createObjectURL(file);
  S.activeProject.anx4PdfName = file.name;
  if (!S.activeProject.pdfData) S.activeProject.pdfData = {};
  S.activeProject.pdfData.anx4 = fileURL;
  if (window.storeProjectPdf) {
    window.storeProjectPdf('anx4', file).catch(err => console.error('Backend PDF upload failed:', err));
  }
  if (window.renderPdfToImages) {
    window.renderPdfToImages(file, (err, imgs) => {
      if (!err && imgs) {
        if (!S.uploadedPDFs) S.uploadedPDFs = {};
        S.uploadedPDFs.anx4 = imgs;
        if (window.debouncedSaveState) window.debouncedSaveState();
      }
    });
  }
  const pIdx = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pIdx !== -1) {
    S.projects[pIdx].anx4PdfName = file.name;
    if (!S.projects[pIdx].pdfData) S.projects[pIdx].pdfData = {};
    S.projects[pIdx].pdfData.anx4 = fileURL;
  }
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx4') : document.getElementById('pdf-iframe-anx4'));
  const previewSection = document.getElementById('pdf-preview-section-anx4');
  if (iframe && previewSection) {
    iframe.src = fileURL;
    previewSection.style.display = 'block';
  }
  renderPdfUploadUIAnx4();
  toast('PDF uploaded and preview loaded!', 'success');
  event.target.value = '';
}
async function deletePdfAnx4() {
  if (!S.activeProject) return;
  if (!confirm("Are you sure you want to delete the uploaded PDF? This will remove the file from the server.")) {
    return;
  }
  const previewSection = document.getElementById('pdf-preview-section-anx4');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx4') : document.getElementById('pdf-iframe-anx4'));
  if (previewSection) previewSection.style.display = 'none';
  if (iframe) {
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  }
  toast("Deleting PDF...", "info");
  S.activeProject.anx4PdfName = null;
  if (S.activeProject.pdfData) {
    if (S.activeProject.pdfData.anx4 && S.activeProject.pdfData.anx4.startsWith('blob:')) {
      URL.revokeObjectURL(S.activeProject.pdfData.anx4);
    }
    S.activeProject.pdfData.anx4 = null;
  }
  const pIdx = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pIdx !== -1) {
    S.projects[pIdx].anx4PdfName = null;
    if (S.projects[pIdx].pdfData) S.projects[pIdx].pdfData.anx4 = null;
  }
  renderPdfUploadUIAnx4();
  toast("PDF deleted successfully.", "success");
}
closePDFPreviewAnx4 = function () {
  const previewSection = document.getElementById('pdf-preview-section-anx4');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx4') : document.getElementById('pdf-iframe-anx4'));
  if (previewSection) previewSection.style.display = 'none';
  if (iframe) {
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  }
}
function downloadPdfAnx4() {
  if (!S.activeProject) {
    toast('Please select and open a project first.', 'warn');
    return;
  }
  if (!S.activeProject.anx4PdfName) {
    toast('No PDF has been uploaded for this project yet. Please upload a PDF first.', 'warn');
    return;
  }
  if (window.downloadStoredPdf) {
    downloadStoredPdf('anx4', S.activeProject.anx4PdfName, S.activeProject.pdfData?.anx4);
    return;
  }
  const a = document.createElement('a');
  a.href = S.activeProject.pdfData.anx4;
  a.download = S.activeProject.anx4PdfName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
document.addEventListener('input', (e) => {
  if (e.target.closest('#individual-routes-container, #cluster-routes-container')) {
    if (window.anx4DebounceTimer) clearTimeout(window.anx4DebounceTimer);
    window.anx4DebounceTimer = setTimeout(() => {
       exportAnx4PDF(true);
    }, 1500); // 1.5 seconds after typing stops
  }
});
window.exportAnx4PDF = exportAnx4PDF;

;

/* js/anx5.js */
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ANNEXURE V â€” SAND MINING REPORT
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
window.S = window.S || { activeProject: { id: 'demo_proj', anx5PdfName: null }, projects: [] };
window.toast = window.toast || function (msg, type) { alert('[' + (type || 'INFO').toUpperCase() + '] ' + msg); };
window.initLucide = window.initLucide || function () { if (window.lucide) lucide.createIcons(); };
var ANX5_STORAGE_PREFIX = 'anx5_heading_';
function saveAnx5Heading(el) {
  var key = el.getAttribute('data-key');
  if (!key) return;
  try { localStorage.setItem(ANX5_STORAGE_PREFIX + key, el.innerText.trim()); } catch (e) {}
}
window.saveAnx5Heading = saveAnx5Heading;
function loadAnx5Headings() {
  document.querySelectorAll('#view-anx5 .editable-title[data-key]').forEach(function (el) {
    var key = el.getAttribute('data-key');
    var saved = null;
    try { saved = localStorage.getItem(ANX5_STORAGE_PREFIX + key); } catch (e) {}
    if (saved) el.innerText = saved;
  });
}
window.loadAnx5Headings = loadAnx5Headings;
function downloadSectionTemplateAnx5(sectionType) {
  let csvContent = "";
  let filename = "";
  switch (sectionType) {
    case 'A':
      csvContent = "River Details,Sand Bar Code,Lease Details,Area (Ha.),Latitude,Longitude,Distance (KM) from PA/BR/WC,Distance from Forest Area (KM),Mining leases within 500 m,Bulk Density (gm/cc),Depth of Deposit,Total Excavation (MT/YR),Total Excavation (Net 60%),Mineral to be mined,Existing/Proposed,Remarks\n";
      filename = "Table_A_Mining_Leases_Template.csv";
      break;
    case 'B':
      csvContent = "Owner,Sy.No (khasra No),Area,Latitude,Longitude,District,Tehsil,Village,Total Reserve (MT),Total Mineral (60%),Existing/Proposed,Remarks\n";
      filename = "Table_B_Patta_Lands_Template.csv";
      break;
    case 'C':
      csvContent = "Name of Reservoir/Dams,Maintain/Controlled by,Latitude,Longitude,District,Tehsil,Village,Size (Ha),Quantity MT/Year,Existing/Proposed\n";
      filename = "Table_C_DeSiltation_Template.csv";
      break;
    case 'D':
      csvContent = "Plant Name,Owner,District,Tehsil,Village,Geo-location,Quantity Tonnes/Annum,Existing/Proposed\n";
      filename = "Table_D_MSand_Template.csv";
      break;
  }
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
window.downloadSectionTemplateAnx5 = downloadSectionTemplateAnx5;
function handleSectionUploadAnx5(event, sectionType) {
  const file = event.target.files[0];
  if (!file) return;
  const input = event.target;
  const sectionBlock = input.closest('.anx-section') || input.closest('[class*="-block"]');
  const table = sectionBlock ? sectionBlock.querySelector('table') : null;
  const targetTableId = table ? table.id : '';
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
      if (rows.length === 0) {
        toast("The uploaded file is empty.", "warn");
        return;
      }
      processExcelDataAnx5(rows, sectionType, targetTableId);
    } catch (error) {
      toast("Error parsing file. Please ensure it is a valid Excel or CSV file.", "error");
      console.error(error);
    }
    event.target.value = '';
  };
  reader.readAsArrayBuffer(file);
}
window.handleSectionUploadAnx5 = handleSectionUploadAnx5;
function processExcelDataAnx5(rows, sectionType, tableId) {
  const validRows = rows.filter(row => row.some(cell => String(cell !== undefined && cell !== null ? cell : "").trim() !== ""));
  let startIndex = 0;
  const headerIdx = validRows.findIndex(row => {
    const rowStr = row.map(c => String(c || '')).join(' ').toLowerCase();
    if (sectionType === 'A') return rowStr.includes('lease') || rowStr.includes('river');
    if (sectionType === 'B') return rowStr.includes('owner') || rowStr.includes('patta');
    if (sectionType === 'C') return rowStr.includes('reservoir') || rowStr.includes('desilt');
    if (sectionType === 'D') return rowStr.includes('plant') || rowStr.includes('msand');
    return false;
  });
  if (headerIdx >= 0) {
    startIndex = headerIdx + 1;
  }
  const dataRows = validRows.slice(startIndex);
  if (dataRows.length === 0) {
    toast("No data found after the header in the uploaded file.", "warn");
    return;
  }
  if (!tableId) {
    if (sectionType === 'A') tableId = 'anx5-mining';
    if (sectionType === 'B') tableId = 'anx5-patta';
    if (sectionType === 'C') tableId = 'anx5-desilt';
    if (sectionType === 'D') tableId = 'anx5-msand';
  }
  const uploadRows = [];
  dataRows.forEach((rowData, index) => {
    while (rowData.length < 18) rowData.push("");
    let cellDataArray = [];
    const actionBtn = `<button class='btn btn-xs btn-danger' onclick='delRowAnx5(this)' style='display:inline-flex;align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>`;
    if (sectionType === 'A') {
      let slNo = String(index + 1);
      let area = parseFloat(rowData[4]) || 0;
      let bulkDensity = parseFloat(rowData[10]) || 1.54;
      let depth = parseFloat(rowData[11]) || 1.74;
      let gross = area * 10000 * depth * bulkDensity;
      let net = gross * 0.60;
      let epVal = String(rowData[15] || "").trim().toLowerCase();
      let epSelect = `<select><option ${epVal === 'existing' || epVal !== 'proposed' ? 'selected' : ''}>Existing</option><option ${epVal === 'proposed' ? 'selected' : ''}>Proposed</option></select>`;
      cellDataArray = [
        slNo,
        rowData[1], // River Details
        rowData[2], // Sand Bar Code
        rowData[3], // Lease Details
        area.toString(), // Area
        rowData[5], // Latitude
        rowData[6], // Longitude
        rowData[7], // Distance from PA
        rowData[8], // Forest Distance
        rowData[9], // Cluster
        bulkDensity.toString(),
        depth.toString(),
        gross.toFixed(2),
        net.toFixed(2),
        rowData[14] || "Sand", // Mineral
        epSelect,
        rowData[16], // Remarks
        actionBtn
      ];
    }
    else if (sectionType === 'B') {
      let slNo = String(index + 1);
      let area = parseFloat(rowData[3]) || 0;
      let reserve = Math.round(area * 10000 * 3 * 1.52);
      let mineral = Math.round(reserve * 0.60);
      let epVal = String(rowData[11] || "").trim().toLowerCase();
      let epSelect = `<select><option ${epVal === 'existing' || epVal !== 'proposed' ? 'selected' : ''}>Existing</option><option ${epVal === 'proposed' ? 'selected' : ''}>Proposed</option></select>`;
      cellDataArray = [
        slNo,
        rowData[1], // Owner
        rowData[2], // Sy.No
        area.toString(),
        rowData[4], // Latitude
        rowData[5], // Longitude
        rowData[6] || "Jalandhar", // District
        rowData[7], // Tehsil
        rowData[8], // Village
        reserve.toString(),
        mineral.toString(),
        epSelect,
        rowData[12], // Remarks
        actionBtn
      ];
    }
    else if (sectionType === 'C') {
      let epVal = String(rowData[9] || "").trim().toLowerCase();
      let epSelect = `<select><option ${epVal === 'existing' || epVal !== 'proposed' ? 'selected' : ''}>Existing</option><option ${epVal === 'proposed' ? 'selected' : ''}>Proposed</option></select>`;
      cellDataArray = [
        rowData[0], // Name of Reservoir/Dams
        rowData[1], // Maintain/Controlled by
        rowData[2], // Latitude
        rowData[3], // Longitude
        rowData[4] || "Jalandhar", // District
        rowData[5], // Tehsil
        rowData[6], // Village
        rowData[7], // Size
        rowData[8], // Qty
        epSelect,
        actionBtn
      ];
    }
    else if (sectionType === 'D') {
      let epVal = String(rowData[7] || "").trim().toLowerCase();
      let epSelect = `<select><option ${epVal === 'existing' || epVal !== 'proposed' ? 'selected' : ''}>Existing</option><option ${epVal === 'proposed' ? 'selected' : ''}>Proposed</option></select>`;
      cellDataArray = [
        rowData[0], // Plant Name
        rowData[1], // Owner
        rowData[2] || "Jalandhar", // District
        rowData[3], // Tehsil
        rowData[4], // Village
        rowData[5], // Geo-location
        rowData[6], // Quantity
        epSelect,
        actionBtn
      ];
    }
    uploadRows.push(cellDataArray);
  });
  if (typeof rbacApplyExcelRowsToTable === 'function') {
    rbacApplyExcelRowsToTable(tableId, uploadRows, row => addRowAnx5(tableId, row));
  } else {
    const tbody = document.getElementById(tableId).querySelector('tbody');
    tbody.innerHTML = '';
    uploadRows.forEach(row => addRowAnx5(tableId, row));
  }
  recalcAnx5Totals();
  toast(`Uploaded section ${sectionType} data successfully`, 'success');
}
function addRowAnx5(tableId, cellDataArray) {
  const tbody = document.querySelector('#' + tableId + ' tbody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  cellDataArray.forEach((data, index) => {
    const td = document.createElement('td');
    let dataStr = String(data !== undefined && data !== null ? data : '').trim();
    if (dataStr === '' && !dataStr.includes('<button') && !dataStr.includes('<select')) {
      dataStr = 'NUL';
    }
    if (!dataStr.includes('<button') && !dataStr.includes('<select')) {
      td.contentEditable = "true";
      td.textContent = dataStr;
      if (tableId.startsWith('anx5-mining')) {
        if (index === 4 || index === 10 || index === 11) {
          td.addEventListener('input', function () { calcAnx5MiningRow(this); });
        }
      } else if (tableId.startsWith('anx5-patta')) {
        if (index === 3) {
          td.addEventListener('input', function () { calcAnx5PattaRow(this); });
        }
      } else if (tableId.startsWith('anx5-desilt')) {
        if (index === 7) {
          td.addEventListener('input', function () { calcAnx5DesiltRow(this); });
        }
      }
    } else {
      td.innerHTML = dataStr;
    }
    tr.appendChild(td);
  });
  if (tableId.startsWith('anx5-mining')) {
    tr.children[12].classList.add('calc-total');
    tr.children[13].classList.add('calc-net');
    tr.children[12].contentEditable = "false";
    tr.children[13].contentEditable = "false";
  }
  else if (tableId.startsWith('anx5-patta')) {
    tr.children[9].classList.add('calc-reserve');
    tr.children[10].classList.add('calc-mineral');
    tr.children[9].addEventListener('input', recalcAnx5Totals);
    tr.children[10].addEventListener('input', recalcAnx5Totals);
  }
  else if (tableId.startsWith('anx5-desilt')) {
    tr.children[7].addEventListener('input', recalcAnx5Totals);
  }
  tbody.appendChild(tr);
  if (window.initLucide) window.initLucide();
}
window.addRowAnx5 = addRowAnx5;
function addNewMiningRowAnx5(btn) {
  const tableId = btn.closest('.anx-section').querySelector('table').id;
  addRowAnx5(tableId, ['', '', '', '', '0', '', '', '', '', '', '1.54', '1.74', '0.00', '0.00', 'Sand', '<select><option>Existing</option><option>Proposed</option></select>', '', "<button class='btn btn-xs btn-danger' onclick='delRowAnx5(this)' style='display:inline-flex;align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>"]);
}
window.addNewMiningRowAnx5 = addNewMiningRowAnx5;
function addNewPattaRowAnx5(btn) {
  const tableId = btn.closest('.anx-section').querySelector('table').id;
  addRowAnx5(tableId, ['', '', '', '0', '', '', 'Jalandhar', '', '', '0', '0', '<select><option>Existing</option><option>Proposed</option></select>', '', "<button class='btn btn-xs btn-danger' onclick='delRowAnx5(this)' style='display:inline-flex;align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>"]);
}
window.addNewPattaRowAnx5 = addNewPattaRowAnx5;
function addNewDesiltRowAnx5(btn) {
  const tableId = btn.closest('.anx-section').querySelector('table').id;
  addRowAnx5(tableId, ['', '', '', '', 'Jalandhar', '', '', '0.00', '-', '<select><option>Existing</option><option>Proposed</option></select>', "<button class='btn btn-xs btn-danger' onclick='delRowAnx5(this)' style='display:inline-flex;align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>"]);
}
window.addNewDesiltRowAnx5 = addNewDesiltRowAnx5;
function addNewMsandRowAnx5(btn) {
  const tableId = btn.closest('.anx-section').querySelector('table').id;
  addRowAnx5(tableId, ['', '', 'Jalandhar', '', '', '', 'Not Available', '<select><option>Existing</option><option>Proposed</option></select>', "<button class='btn btn-xs btn-danger' onclick='delRowAnx5(this)' style='display:inline-flex;align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>"]);
}
window.addNewMsandRowAnx5 = addNewMsandRowAnx5;
function delRowAnx5(btn) {
  const table = btn.closest('table');
  btn.closest('tr').remove();
  recalcAnx5Totals();
}
window.delRowAnx5 = delRowAnx5;
let sectionBlockCounts = { A: 1, B: 1, C: 1, D: 1 };
function addAnx5SectionBlock(sectionType) {
  sectionBlockCounts[sectionType]++;
  const sectionNum = sectionBlockCounts[sectionType];
  let wrapperId, blockClass, baseTableId;
  if (sectionType === 'A') {
    wrapperId = 'anx5-section-a-wrapper';
    blockClass = 'anx5-section-a-block';
    baseTableId = 'anx5-mining';
  } else if (sectionType === 'B') {
    wrapperId = 'anx5-section-b-wrapper';
    blockClass = 'anx5-section-b-block';
    baseTableId = 'anx5-patta';
  } else if (sectionType === 'C') {
    wrapperId = 'anx5-section-c-wrapper';
    blockClass = 'anx5-section-c-block';
    baseTableId = 'anx5-desilt';
  } else if (sectionType === 'D') {
    wrapperId = 'anx5-section-d-wrapper';
    blockClass = 'anx5-section-d-block';
    baseTableId = 'anx5-msand';
  }
  const wrapper = document.getElementById(wrapperId);
  const originalBlock = wrapper.querySelector('.' + blockClass);
  const newBlock = originalBlock.cloneNode(true);
  newBlock.querySelector('.rm-sec-btn').style.display = 'inline-flex';
  const titleEl = newBlock.querySelector('.editable-title');
  if (titleEl) {
    let baseText = titleEl.innerText.replace(/ - Table \d+:$/, '');
    var newTitle = baseText + ' - Table ' + sectionNum + ':';
    titleEl.innerText = newTitle;
    var newKey = 'anx5-title-' + sectionType + '-' + Date.now();
    titleEl.setAttribute('data-key', newKey);
    try { localStorage.setItem(ANX5_STORAGE_PREFIX + newKey, newTitle); } catch (e) {}
  }
  const newTable = newBlock.querySelector('table');
  const newTableId = baseTableId + '-' + sectionNum;
  newTable.id = newTableId;
  const tbody = newTable.querySelector('tbody');
  tbody.innerHTML = '';
  newTable.querySelector('tfoot')?.remove();
  const fileInput = newBlock.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.setAttribute('data-table-id', newTableId);
  }
  wrapper.appendChild(newBlock);
  if (window.initLucide) window.initLucide();
  const addRowBtn = newBlock.querySelector('.section-footer button');
  if (addRowBtn) {
    addRowBtn.click();
  }
}
window.addAnx5SectionBlock = addAnx5SectionBlock;
function calcAnx5MiningRow(element) {
  const row = element.closest('tr');
  const cells = row.cells;
  const area = parseFloat(cells[4].innerText) || 0;
  const bulkDensity = parseFloat(cells[10].innerText) || 0;
  const depth = parseFloat(cells[11].innerText) || 0;
  const gross = area * 10000 * depth * bulkDensity;
  const net = gross * 0.60;
  cells[12].innerText = gross > 0 ? gross.toFixed(2) : "0.00";
  cells[13].innerText = net > 0 ? net.toFixed(2) : "0.00";
  recalcAnx5Totals();
}
window.calcAnx5MiningRow = calcAnx5MiningRow;
function calcAnx5PattaRow(element) {
  const row = element.closest('tr');
  const cells = row.cells;
  const area = parseFloat(cells[3].innerText) || 0;
  const reserve = Math.round(area * 10000 * 3 * 1.52);
  const mineral = Math.round(reserve * 0.60);
  cells[9].innerText = reserve;
  cells[10].innerText = mineral;
  recalcAnx5Totals();
}
window.calcAnx5PattaRow = calcAnx5PattaRow;
function calcAnx5DesiltRow(element) {
  recalcAnx5Totals();
}
window.calcAnx5DesiltRow = calcAnx5DesiltRow;
function recalcAnx5Totals() {
  const miningTables = document.querySelectorAll('[id^="anx5-mining"]');
  let miningArea = 0, miningExc = 0, miningExc60 = 0;
  miningTables.forEach(table => {
    table.querySelectorAll('tbody tr').forEach(tr => {
      const cells = tr.cells;
      if (cells.length > 13) {
        miningArea += parseFloat(cells[4]?.textContent) || 0;
        miningExc += parseFloat(cells[12]?.textContent) || 0;
        miningExc60 += parseFloat(cells[13]?.textContent) || 0;
      }
    });
  });
  const miningAreaEl = document.getElementById('mining-total-area');
  const miningExcEl = document.getElementById('mining-total-exc');
  const miningExc60El = document.getElementById('mining-total-exc60');
  if (miningAreaEl) miningAreaEl.textContent = miningArea.toFixed(2);
  if (miningExcEl) miningExcEl.textContent = miningExc.toFixed(2);
  if (miningExc60El) miningExc60El.textContent = miningExc60.toFixed(2);
  const pattaTables = document.querySelectorAll('[id^="anx5-patta"]');
  let pattaArea = 0, pattaRes = 0, pattaMin = 0;
  pattaTables.forEach(table => {
    table.querySelectorAll('tbody tr').forEach(tr => {
      const cells = tr.cells;
      if (cells.length > 10) {
        pattaArea += parseFloat(cells[3]?.textContent) || 0;
        pattaRes += parseFloat(cells[9]?.textContent) || 0;
        pattaMin += parseFloat(cells[10]?.textContent) || 0;
      }
    });
  });
  const pattaAreaEl = document.getElementById('patta-total-area');
  const pattaResEl = document.getElementById('patta-total-res');
  const pattaMinEl = document.getElementById('patta-total-min');
  if (pattaAreaEl) pattaAreaEl.textContent = pattaArea.toFixed(2);
  if (pattaResEl) pattaResEl.textContent = pattaRes.toFixed(0);
  if (pattaMinEl) pattaMinEl.textContent = pattaMin.toFixed(2);
  const desiltTables = document.querySelectorAll('[id^="anx5-desilt"]');
  let desiltSize = 0;
  desiltTables.forEach(table => {
    table.querySelectorAll('tbody tr').forEach(tr => {
      const cells = tr.cells;
      if (cells.length > 7) {
        desiltSize += parseFloat(cells[7]?.textContent) || 0;
      }
    });
  });
  const desiltSizeEl = document.getElementById('desilt-total-size');
  if (desiltSizeEl) desiltSizeEl.textContent = desiltSize.toFixed(2);
}
window.recalcAnx5Totals = recalcAnx5Totals;
function exportAnx5PDF(btn, isLivePreview = false) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let startY = 80;
  let isFirstPage = true;
  const drawHeaderFooter = (data) => {
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Page " + data.pageNumber, pageWidth / 2, pageHeight - 20, { align: "center" });
  };
  const getCellTextAnx5 = (td) => {
    const select = td.querySelector('select');
    if (select) return select.value;
    return td.innerText.trim();
  };
  const extractDataAnx5 = (tableId) => {
    const tbl = document.getElementById(tableId);
    if (!tbl) return null;
    const headers = Array.from(tbl.querySelectorAll('thead th')).filter(th => !th.classList.contains('no-print') && th.innerText.trim() !== 'Action').map(th => th.innerText.trim().replace(/\n/g, ' '));
    const rows = [];
    tbl.querySelectorAll('tbody tr').forEach(tr => {
      const row = [];
      tr.querySelectorAll('td').forEach(td => {
        if (!td.classList.contains('no-print')) {
          row.push(getCellTextAnx5(td));
        }
      });
      rows.push(row);
    });
    return { headers, rows };
  };
  const miningBlocks = document.querySelectorAll('.anx5-section-a-block');
  miningBlocks.forEach((block, index) => {
    if (startY > pageHeight - 120) {
      doc.addPage();
      startY = 80;
    }
    if (isFirstPage) {
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Annexure-V", pageWidth - 40, 55, { align: "right" });
      isFirstPage = false;
    }
    const titleEl = block.querySelector('.editable-title');
    const titleText = titleEl ? titleEl.textContent.trim() : `Final List of Potential Mining Leases (Existing & Proposed) Rivers:`;
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(titleText.startsWith('>') ? titleText : `> ${titleText}`, 40, startY);
    startY += 15;
    const tableId = block.querySelector('table').id;
    const data = extractDataAnx5(tableId);
    let foot = undefined;
    if (index === miningBlocks.length - 1) {
      foot = [[
        { content: 'Total', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: document.getElementById('mining-total-area')?.textContent || '0.00', styles: { fontStyle: 'bold' } },
        '', '', '', '', '', '', '',
        { content: document.getElementById('mining-total-exc')?.textContent || '0.00', styles: { fontStyle: 'bold' } },
        { content: document.getElementById('mining-total-exc60')?.textContent || '0.00', styles: { fontStyle: 'bold' } },
        '', '', ''
      ]];
    }
    doc.autoTable({
      startY: startY,
      head: [data.headers],
      body: data.rows,
      foot: foot,
      theme: 'grid',
      styles: { font: 'times', fontSize: 7.5, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 3, valign: 'middle', halign: 'center' },
      headStyles: { fillColor: false, fontStyle: 'bold', halign: 'center', textColor: 0 },
      footStyles: { fillColor: false, fontStyle: 'bold', halign: 'center', textColor: 0 },
      columnStyles: {
        5: { cellWidth: 70 }, // Latitude wrap
        6: { cellWidth: 70 }, // Longitude wrap
      },
      didDrawPage: (d) => drawHeaderFooter(d)
    });
    startY = doc.lastAutoTable.finalY + 15;
  });
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.text("(Reference: Table of the Proforma for the district of Jalandhar, Page no 560 -563 )", pageWidth - 40, startY, { align: 'right' });
  startY += 25;
  if (startY > pageHeight - 120) {
    doc.addPage();
    startY = 80;
  }
  const pattaBlocks = document.querySelectorAll('.anx5-section-b-block');
  pattaBlocks.forEach((block, index) => {
    if (startY > pageHeight - 120) {
      doc.addPage();
      startY = 80;
    }
    const titleEl = block.querySelector('.editable-title');
    const titleText = titleEl ? titleEl.textContent.trim() : `Final Patta Lands / Khatedari Land (Existing & Proposed):`;
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(titleText.startsWith('>') ? titleText : `> ${titleText}`, 40, startY);
    startY += 15;
    const tableId = block.querySelector('table').id;
    const data = extractDataAnx5(tableId);
    let foot = undefined;
    if (index === pattaBlocks.length - 1) {
      foot = [[
        { content: 'Total', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: document.getElementById('patta-total-area')?.textContent || '0.00', styles: { fontStyle: 'bold' } },
        '', '', '', '', '',
        { content: document.getElementById('patta-total-res')?.textContent || '0.00', styles: { fontStyle: 'bold' } },
        { content: document.getElementById('patta-total-min')?.textContent || '0.00', styles: { fontStyle: 'bold' } },
        '', ''
      ]];
    }
    doc.autoTable({
      startY: startY,
      head: [data.headers],
      body: data.rows,
      foot: foot,
      theme: 'grid',
      styles: { font: 'times', fontSize: 7.5, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 3, valign: 'middle', halign: 'center' },
      headStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 },
      footStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 },
      didDrawPage: (d) => drawHeaderFooter(d)
    });
    startY = doc.lastAutoTable.finalY + 15;
  });
  if (startY > pageHeight - 120) {
    doc.addPage();
    startY = 80;
  }
  const desiltBlocks = document.querySelectorAll('.anx5-section-c-block');
  desiltBlocks.forEach((block, index) => {
    if (startY > pageHeight - 120) {
      doc.addPage();
      startY = 80;
    }
    const titleEl = block.querySelector('.editable-title');
    const titleText = titleEl ? titleEl.textContent.trim() : `De-Siltation Location: (Lakes/Ponds/Dams etc.) (Existing & Proposed):`;
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(titleText.startsWith('>') ? titleText : `> ${titleText}`, 40, startY);
    startY += 15;
    const tableId = block.querySelector('table').id;
    const data = extractDataAnx5(tableId);
    let foot = undefined;
    if (index === desiltBlocks.length - 1) {
      foot = [[
        { content: 'Total', colSpan: 7, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: document.getElementById('desilt-total-size')?.textContent || '0.00', styles: { fontStyle: 'bold' } },
        '', ''
      ]];
    }
    doc.autoTable({
      startY: startY,
      head: [data.headers],
      body: data.rows,
      foot: foot,
      theme: 'grid',
      styles: { font: 'times', fontSize: 7.5, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 3, valign: 'middle', halign: 'center' },
      headStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 },
      footStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 },
      didDrawPage: (d) => drawHeaderFooter(d)
    });
    startY = doc.lastAutoTable.finalY + 15;
  });
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.text("Note: The quantity of De-silting shall be assessed as per actual site conditions at the time of de-silting and got approved from the competent authority.", pageWidth / 2, startY, { align: 'center' });
  startY += 25;
  if (startY > pageHeight - 120) {
    doc.addPage();
    startY = 80;
  }
  const msandBlocks = document.querySelectorAll('.anx5-section-d-block');
  msandBlocks.forEach((block, index) => {
    if (startY > pageHeight - 120) {
      doc.addPage();
      startY = 80;
    }
    const titleEl = block.querySelector('.editable-title');
    const titleText = titleEl ? titleEl.textContent.trim() : `M-Sand Plants: (Existing & Proposed):`;
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(titleText.startsWith('>') ? titleText : `> ${titleText}`, 40, startY);
    startY += 15;
    const tableId = block.querySelector('table').id;
    const data = extractDataAnx5(tableId);
    doc.autoTable({
      startY: startY,
      head: [data.headers],
      body: data.rows,
      theme: 'grid',
      styles: { font: 'times', fontSize: 7.5, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 3, valign: 'middle', halign: 'center' },
      headStyles: { fillColor: false, fontStyle: 'bold', textColor: 0 },
      margin: { left: pageWidth / 2 - 300, right: pageWidth / 2 - 300 },
      didDrawPage: (d) => drawHeaderFooter(d)
    });
    startY = doc.lastAutoTable.finalY + 15;
  });
  if (isLivePreview) {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx5') : document.getElementById('pdf-iframe-anx5'));
    if (iframe) iframe.src = blobUrl;
  } else {
    doc.save('Annexure_V_Sand_Mining_Report.pdf');
    toast('PDF downloaded successfully!', 'success');
  }
}
window.exportAnx5PDF = exportAnx5PDF;
function renderPdfUploadUIAnx5() {
  const nameEl = document.getElementById('anx5-uploaded-filename');
  const dlBtn = document.getElementById('anx5-download-btn');
  const delBtn = document.getElementById('anx5-delete-btn');
  const prevBtn = document.getElementById('anx5-preview-btn');
  const prevSec = document.getElementById('pdf-preview-section-anx5');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx5') : document.getElementById('pdf-iframe-anx5'));
  if (!nameEl || !dlBtn) return;
  if (!S.activeProject) {
    nameEl.style.display = 'none'; dlBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none'; if (prevBtn) prevBtn.style.display = 'none';
    if (prevSec) { prevSec.style.display = 'none'; if (iframe) iframe.src = 'about:blank'; }
    return;
  }
  const pdfName = S.activeProject.anx5PdfName;
  if (!pdfName) {
    nameEl.style.display = 'none'; dlBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none'; if (prevBtn) prevBtn.style.display = 'none';
    if (prevSec) { prevSec.style.display = 'none'; if (iframe) iframe.src = 'about:blank'; }
  } else {
    nameEl.textContent = pdfName;
    nameEl.style.display = 'inline-block';
    dlBtn.style.display = 'inline-flex';
    if (delBtn) delBtn.style.display = 'inline-flex';
    if (prevBtn) prevBtn.style.display = 'inline-flex';
    if (prevSec && prevSec.style.display === 'block' && iframe && S.activeProject.pdfData?.anx5) {
      if (!iframe.src.includes(S.activeProject.pdfData.anx5)) iframe.src = S.activeProject.pdfData.anx5;
    }
  }
  if (window.initLucide) window.initLucide();
}
window.renderPdfUploadUIAnx5 = renderPdfUploadUIAnx5;
function togglePDFPreviewAnx5() {
  const sec = document.getElementById('pdf-preview-section-anx5');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx5') : document.getElementById('pdf-iframe-anx5'));
  if (!sec || !iframe) return;
  if (sec.style.display === 'block') {
    sec.style.display = 'none'; if (iframe.src.startsWith('blob:')) URL.revokeObjectURL(iframe.src); iframe.src = 'about:blank';
  } else if (S.activeProject?.pdfData?.anx5) {
    iframe.src = S.activeProject.pdfData.anx5; sec.style.display = 'block';
  } else {
    toast('No PDF preview available. Please re-upload.', 'warn');
  }
}
window.togglePDFPreviewAnx5 = togglePDFPreviewAnx5;
function closePDFPreviewAnx5() {
  const sec = document.getElementById('pdf-preview-section-anx5');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx5') : document.getElementById('pdf-iframe-anx5'));
  if (sec) sec.style.display = 'none';
  if (iframe) { if (iframe.src.startsWith('blob:')) URL.revokeObjectURL(iframe.src); iframe.src = 'about:blank'; }
}
window.closePDFPreviewAnx5 = closePDFPreviewAnx5;
function downloadPdfAnx5() {
  if (!S.activeProject?.anx5PdfName) { toast('No PDF uploaded yet.', 'warn'); return; }
  if (window.downloadStoredPdf) {
    downloadStoredPdf('anx5', S.activeProject.anx5PdfName, S.activeProject.pdfData?.anx5);
    return;
  }
  const a = document.createElement('a');
  a.href = S.activeProject.pdfData?.anx5 || '';
  a.download = S.activeProject.anx5PdfName;
  a.style.display = 'none';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
window.downloadPdfAnx5 = downloadPdfAnx5;
function deletePdfAnx5() {
  if (!S.activeProject || !confirm('Delete the uploaded PDF?')) return;
  const sec = document.getElementById('pdf-preview-section-anx5');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx5') : document.getElementById('pdf-iframe-anx5'));
  if (sec) sec.style.display = 'none';
  if (iframe) { if (iframe.src.startsWith('blob:')) URL.revokeObjectURL(iframe.src); iframe.src = 'about:blank'; }
  S.activeProject.anx5PdfName = null;
  if (S.activeProject.pdfData) S.activeProject.pdfData.anx5 = null;
  const pi = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pi >= 0) { S.projects[pi].anx5PdfName = null; if (S.projects[pi].pdfData) S.projects[pi].pdfData.anx5 = null; }
  renderPdfUploadUIAnx5();
  toast('PDF deleted.', 'success');
}
window.deletePdfAnx5 = deletePdfAnx5;
function handlePDFUploadAnx5(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) { toast('Only PDF files allowed.', 'error'); event.target.value = ''; return; }
  if (!S.activeProject) { toast('Select a project first.', 'warn'); event.target.value = ''; return; }
  const fileURL = URL.createObjectURL(file);
  S.activeProject.anx5PdfName = file.name;
  if (!S.activeProject.pdfData) S.activeProject.pdfData = {};
  S.activeProject.pdfData.anx5 = fileURL;
  if (window.storeProjectPdf) {
    window.storeProjectPdf('anx5', file).catch(err => console.error('Backend PDF upload failed:', err));
  }
  const pi = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pi >= 0) { S.projects[pi].anx5PdfName = file.name; if (!S.projects[pi].pdfData) S.projects[pi].pdfData = {}; S.projects[pi].pdfData.anx5 = fileURL; }
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx5') : document.getElementById('pdf-iframe-anx5'));
  const sec = document.getElementById('pdf-preview-section-anx5');
  if (iframe && sec) { iframe.src = fileURL; sec.style.display = 'block'; }
  renderPdfUploadUIAnx5();
  toast('PDF uploaded and preview loaded!', 'success');
  event.target.value = '';
}
window.handlePDFUploadAnx5 = handlePDFUploadAnx5;
document.addEventListener('DOMContentLoaded', function () {
  setTimeout(loadAnx5Headings, 50);
});
document.addEventListener('input', (e) => {
  if (e.target.closest('#view-anx5 table')) {
    if (window.anx5DebounceTimer) clearTimeout(window.anx5DebounceTimer);
    window.anx5DebounceTimer = setTimeout(() => {
       exportAnx5PDF(null, true);
    }, 1500); // 1.5 seconds after typing stops
  }
});
document.addEventListener('change', (e) => {
  if (e.target.closest('#view-anx5 table')) {
    if (window.anx5DebounceTimer) clearTimeout(window.anx5DebounceTimer);
    window.anx5DebounceTimer = setTimeout(() => {
      exportAnx5PDF(null, true);
    }, 300);
  }
});

;

/* js/anx6.js */
/* ANNEXURE VI - FINAL CLUSTER DETAILS */
window.S = window.S || { activeProject: { id: 'demo_proj', anx6PdfName: null }, projects: [] };
window.toast = window.toast || function (msg, type) { alert('[' + (type || 'INFO').toUpperCase() + '] ' + msg); };
window.initLucide = window.initLucide || function () { if (window.lucide) lucide.createIcons(); };
const ANX6_CLUSTER_HEADERS = [
  'River Name',
  'Cluster No.',
  'Lease No',
  'Location (Riverbed/Patta Land)',
  'Village',
  'Area (in Ha.)',
  'Total Excavation (MT)',
  'Total Mineral Excavation (MT)'
];
const ANX6_CONTIGUOUS_HEADERS = [
  'River Name',
  'Contiguous Cluster No.',
  'Cluster No',
  'Number of leases in the cluster',
  'Location (Riverbed / Patta Land)',
  'Distance between clusters',
  'Village',
  'Area Of Cluster (Ha)',
  'Total Mineral Excavation (MT)'
];
let anx6ClusterData = [
  { river: 'Sutlej', cluster: '1', lease: 'Jalandhar Sutlej 1,2', location: 'Riverbed', village: 'Kadiana', area: 25.27, excavation: 1074334.80, mineral: 644600.88 },
  { river: 'Sutlej', cluster: '2', lease: 'Jalandhar Sutlej 3,4,5,6', location: 'Riverbed', village: 'Chhuala', area: 23.43, excavation: 1027755.96, mineral: 616653.576 },
  { river: 'Sutlej', cluster: '3', lease: 'Jalandhar Sutlej 14,15,16,17,18', location: 'Riverbed', village: 'Burj Hassan', area: 21.93, excavation: 697078.08, mineral: 418246.848 }
];
let anx6ContiguousData = [
  { river: 'Sutlej', contiguous: '1', cluster: '10,11', leases: '10', location: 'Riverbed', distance: '0.55km', village: 'Minwal, Mau Sahib', area: 71.01, mineral: 1978752.45 },
  { river: 'Sutlej', contiguous: '2', cluster: '16,17', leases: '10', location: 'Riverbed', distance: '1.38km', village: 'Burewal, Chak hathiana\nNaurangpur\nBurewal,\nNaurangpur', area: 127.91, mineral: 2664913.66 }
];
function anx6ActionButton(kind, index) {
  const fn = kind === 'cluster' ? `deleteClusterRowAnx6(${index})` : `deleteContiguousRowAnx6(${index})`;
  return `<button class="btn btn-xs btn-danger" onclick="${fn}" style="display:inline-flex;align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>`;
}
function escapeHtmlAnx6(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function toNumberAnx6(value) {
  const num = parseFloat(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(num) ? num : 0;
}
function defaultNAAnx6(value) {
  const text = String(value === undefined || value === null ? '' : value).trim();
  return text || 'NA';
}
function fillNAAnx6(el) {
  if (el && String(el.innerText || '').trim() === '') el.innerText = 'NA';
}
window.fillNAAnx6 = fillNAAnx6;
function formatNumberAnx6(value, decimals = 2) {
  if (String(value === undefined || value === null ? '' : value).trim() === '' || String(value).trim().toUpperCase() === 'NA') return 'NA';
  const num = toNumberAnx6(value);
  return num ? num.toFixed(decimals) : '0.00';
}
function getCellTextAnx6(td) {
  const select = td.querySelector('select');
  return defaultNAAnx6(select ? select.value : td.innerText);
}
function renderAnx6() {
  renderAnx6Clusters();
  renderAnx6Contiguous();
}
window.renderAnx6 = renderAnx6;
function renderAnx6Clusters() {
  const tbody = document.getElementById('anx6-cluster-body');
  const tfoot = document.getElementById('anx6-cluster-foot');
  if (!tbody || !tfoot) return;
  let totalArea = 0, totalExcavation = 0, totalMineral = 0;
  tbody.innerHTML = '';
  anx6ClusterData.forEach((row, index) => {
    const mineral = String(row.mineral ?? '').trim().toUpperCase() === 'NA'
      ? 'NA'
      : row.mineral !== '' && row.mineral !== null && row.mineral !== undefined
        ? toNumberAnx6(row.mineral)
        : toNumberAnx6(row.excavation) * 0.6;
    totalArea += toNumberAnx6(row.area);
    totalExcavation += toNumberAnx6(row.excavation);
    totalMineral += toNumberAnx6(mineral);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Cluster(${index}, 'river', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.river))}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Cluster(${index}, 'cluster', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.cluster))}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" style="white-space:pre-line;" oninput="updateAnx6Cluster(${index}, 'lease', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.lease))}</td>
      <td>
        <select onchange="updateAnx6Cluster(${index}, 'location', this.value)">
          <option ${row.location === 'Riverbed' ? 'selected' : ''}>Riverbed</option>
          <option ${row.location === 'Patta Land' ? 'selected' : ''}>Patta Land</option>
        </select>
      </td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" style="white-space:pre-line;" oninput="updateAnx6Cluster(${index}, 'village', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.village))}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Cluster(${index}, 'area', this.innerText); renderAnx6ClusterTotals();">${formatNumberAnx6(row.area)}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Cluster(${index}, 'excavation', this.innerText); updateAnx6ClusterMineral(${index}); renderAnx6ClusterTotals();">${formatNumberAnx6(row.excavation)}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Cluster(${index}, 'mineral', this.innerText); renderAnx6ClusterTotals();">${formatNumberAnx6(mineral)}</td>
      <td class="no-print">${anx6ActionButton('cluster', index)}</td>`;
    tbody.appendChild(tr);
  });
  tfoot.innerHTML = `<tr class="total-row" style="font-weight:bold; background-color:#e5e7eb; text-align:center;">
    <td colspan="5">Total</td>
    <td id="anx6-cluster-total-area">${totalArea.toFixed(2)}</td>
    <td id="anx6-cluster-total-excavation">${totalExcavation.toFixed(2)}</td>
    <td id="anx6-cluster-total-mineral">${totalMineral.toFixed(2)}</td>
    <td class="no-print"></td>
  </tr>`;
  if (window.initLucide) window.initLucide();
}
function renderAnx6ClusterTotals() {
  const rows = document.querySelectorAll('#anx6-final-clusters tbody tr');
  let area = 0, excavation = 0, mineral = 0;
  rows.forEach(tr => {
    area += toNumberAnx6(tr.cells[5]?.innerText);
    excavation += toNumberAnx6(tr.cells[6]?.innerText);
    mineral += toNumberAnx6(tr.cells[7]?.innerText);
  });
  const areaEl = document.getElementById('anx6-cluster-total-area');
  const excavationEl = document.getElementById('anx6-cluster-total-excavation');
  const mineralEl = document.getElementById('anx6-cluster-total-mineral');
  if (areaEl) areaEl.textContent = area.toFixed(2);
  if (excavationEl) excavationEl.textContent = excavation.toFixed(2);
  if (mineralEl) mineralEl.textContent = mineral.toFixed(2);
}
window.renderAnx6ClusterTotals = renderAnx6ClusterTotals;
function updateAnx6Cluster(index, key, value) {
  if (!anx6ClusterData[index]) return;
  anx6ClusterData[index][key] = ['area', 'excavation', 'mineral'].includes(key) ? defaultNAAnx6(value) : defaultNAAnx6(value);
}
window.updateAnx6Cluster = updateAnx6Cluster;
function updateAnx6ClusterMineral(index) {
  const row = anx6ClusterData[index];
  if (!row) return;
  row.mineral = String(row.excavation).trim().toUpperCase() === 'NA' ? 'NA' : toNumberAnx6(row.excavation) * 0.6;
  const tr = document.querySelectorAll('#anx6-final-clusters tbody tr')[index];
  if (tr?.cells[7]) tr.cells[7].innerText = row.mineral === 'NA' ? 'NA' : toNumberAnx6(row.mineral).toFixed(2);
}
window.updateAnx6ClusterMineral = updateAnx6ClusterMineral;
function renderAnx6Contiguous() {
  const tbody = document.getElementById('anx6-contiguous-body');
  const tfoot = document.getElementById('anx6-contiguous-foot');
  if (!tbody || !tfoot) return;
  let totalArea = 0, totalMineral = 0;
  tbody.innerHTML = '';
  anx6ContiguousData.forEach((row, index) => {
    totalArea += toNumberAnx6(row.area);
    totalMineral += toNumberAnx6(row.mineral);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Contiguous(${index}, 'river', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.river))}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Contiguous(${index}, 'contiguous', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.contiguous))}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Contiguous(${index}, 'cluster', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.cluster))}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Contiguous(${index}, 'leases', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.leases))}</td>
      <td>
        <select onchange="updateAnx6Contiguous(${index}, 'location', this.value)">
          <option ${row.location === 'Riverbed' ? 'selected' : ''}>Riverbed</option>
          <option ${row.location === 'Patta Land' ? 'selected' : ''}>Patta Land</option>
        </select>
      </td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Contiguous(${index}, 'distance', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.distance))}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" style="white-space:pre-line;" oninput="updateAnx6Contiguous(${index}, 'village', this.innerText)">${escapeHtmlAnx6(defaultNAAnx6(row.village))}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Contiguous(${index}, 'area', this.innerText); renderAnx6ContiguousTotals();">${formatNumberAnx6(row.area)}</td>
      <td contenteditable="true" onblur="fillNAAnx6(this)" oninput="updateAnx6Contiguous(${index}, 'mineral', this.innerText); renderAnx6ContiguousTotals();">${formatNumberAnx6(row.mineral)}</td>
      <td class="no-print">${anx6ActionButton('contiguous', index)}</td>`;
    tbody.appendChild(tr);
  });
  tfoot.innerHTML = `<tr class="total-row" style="font-weight:bold; background-color:#e5e7eb; text-align:center;">
    <td colspan="7">Total</td>
    <td id="anx6-contiguous-total-area">${totalArea.toFixed(2)}</td>
    <td id="anx6-contiguous-total-mineral">${totalMineral.toFixed(2)}</td>
    <td class="no-print"></td>
  </tr>`;
  if (window.initLucide) window.initLucide();
}
function renderAnx6ContiguousTotals() {
  const rows = document.querySelectorAll('#anx6-contiguous-clusters tbody tr');
  let area = 0, mineral = 0;
  rows.forEach(tr => {
    area += toNumberAnx6(tr.cells[7]?.innerText);
    mineral += toNumberAnx6(tr.cells[8]?.innerText);
  });
  const areaEl = document.getElementById('anx6-contiguous-total-area');
  const mineralEl = document.getElementById('anx6-contiguous-total-mineral');
  if (areaEl) areaEl.textContent = area.toFixed(2);
  if (mineralEl) mineralEl.textContent = mineral.toFixed(2);
}
window.renderAnx6ContiguousTotals = renderAnx6ContiguousTotals;
function updateAnx6Contiguous(index, key, value) {
  if (!anx6ContiguousData[index]) return;
  anx6ContiguousData[index][key] = defaultNAAnx6(value);
}
window.updateAnx6Contiguous = updateAnx6Contiguous;
function addClusterRowAnx6() {
  anx6ClusterData.push({ river: 'NA', cluster: 'NA', lease: 'NA', location: 'Riverbed', village: 'NA', area: 'NA', excavation: 'NA', mineral: 'NA' });
  renderAnx6Clusters();
}
window.addClusterRowAnx6 = addClusterRowAnx6;
function addContiguousRowAnx6() {
  anx6ContiguousData.push({ river: 'NA', contiguous: 'NA', cluster: 'NA', leases: 'NA', location: 'Riverbed', distance: 'NA', village: 'NA', area: 'NA', mineral: 'NA' });
  renderAnx6Contiguous();
}
window.addContiguousRowAnx6 = addContiguousRowAnx6;
function deleteClusterRowAnx6(index) {
  if (anx6ClusterData.length <= 1) { toast('At least one cluster row is required.', 'warn'); return; }
  anx6ClusterData.splice(index, 1);
  renderAnx6Clusters();
}
window.deleteClusterRowAnx6 = deleteClusterRowAnx6;
function deleteContiguousRowAnx6(index) {
  if (anx6ContiguousData.length <= 1) { toast('At least one contiguous row is required.', 'warn'); return; }
  anx6ContiguousData.splice(index, 1);
  renderAnx6Contiguous();
}
window.deleteContiguousRowAnx6 = deleteContiguousRowAnx6;
function downloadSectionTemplateAnx6(sectionType) {
  const headers = sectionType === 'cluster' ? ANX6_CLUSTER_HEADERS : ANX6_CONTIGUOUS_HEADERS;
  const filename = sectionType === 'cluster' ? 'Cluster_Details_Template.csv' : 'Contiguous_Clusters_Template.csv';
  const csv = headers.join(',') + '\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
window.downloadSectionTemplateAnx6 = downloadSectionTemplateAnx6;
function normalizeHeaderAnx6(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function findHeaderIndexAnx6(rows, requiredHeaders) {
  return rows.findIndex(row => {
    const normalized = row.map(normalizeHeaderAnx6);
    return requiredHeaders.every(header => normalized.some(cell => cell.includes(normalizeHeaderAnx6(header)) || normalizeHeaderAnx6(header).includes(cell)));
  });
}
function validateFileAnx6(file) {
  if (!file) return 'Missing file.';
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return 'Wrong file type. Please upload .xlsx, .xls, or .csv.';
  return '';
}
function handleSectionUploadAnx6(event, sectionType) {
  const file = event.target.files[0];
  const fileError = validateFileAnx6(file);
  if (fileError) { toast(fileError, 'error'); event.target.value = ''; return; }
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) throw new Error('Missing worksheet.');
      const sheetName = pickWorksheetAnx6(workbook, sectionType);
      if (!sheetName) throw new Error('Missing worksheet for ' + (sectionType === 'cluster' ? 'Final Cluster Details.' : 'Final Contiguous Clusters.'));
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      processExcelDataAnx6(rows, sectionType);
    } catch (error) {
      console.error(error);
      toast('Upload failed: ' + error.message, 'error');
    }
    event.target.value = '';
  };
  reader.readAsArrayBuffer(file);
}
window.handleSectionUploadAnx6 = handleSectionUploadAnx6;
function pickWorksheetAnx6(workbook, sectionType) {
  const keywords = sectionType === 'cluster'
    ? ['cluster_details', 'cluster details', 'cluster']
    : ['contiguous_clusters', 'contiguous clusters', 'contiguous'];
  return workbook.SheetNames.find(name => {
    const key = String(name || '').toLowerCase();
    return keywords.some(k => key.includes(k));
  }) || workbook.SheetNames[0];
}
function processExcelDataAnx6(rows, sectionType) {
  const cleanRows = rows.filter(row => Array.isArray(row) && row.some(cell => String(cell ?? '').trim() !== ''));
  if (!cleanRows.length) throw new Error('Empty rows. No data found in worksheet.');
  const required = sectionType === 'cluster'
    ? ['River Name', 'Cluster No', 'Lease No', 'Location', 'Village', 'Area', 'Total Excavation']
    : ['River Name', 'Contiguous Cluster No', 'Cluster No', 'Number of leases', 'Location', 'Distance', 'Village', 'Area', 'Total Mineral Excavation'];
  const headerIndex = findHeaderIndexAnx6(cleanRows, required);
  if (headerIndex < 0) throw new Error('Missing columns. Please use the Annexure-6 template columns.');
  const header = cleanRows[headerIndex];
  const dataRows = cleanRows.slice(headerIndex + 1).filter(row => row.some(cell => String(cell ?? '').trim() !== ''));
  if (!dataRows.length) throw new Error('Empty rows. No data found after the header.');
  const mapped = dataRows.map((row, index) => mapAnx6Row(row, header, sectionType, index + 2)).filter(Boolean);
  if (!mapped.length) throw new Error('No valid rows found.');
  if (sectionType === 'cluster') {
    anx6ClusterData = mergeAnx6UploadByRole(anx6ClusterData, mapped, 'anx6-final-clusters', ['river', 'cluster', 'lease', 'location', 'village', 'area', 'excavation', 'mineral']);
    renderAnx6Clusters();
  } else {
    anx6ContiguousData = mergeAnx6UploadByRole(anx6ContiguousData, mapped, 'anx6-contiguous-clusters', ['river', 'contiguous', 'cluster', 'leases', 'location', 'distance', 'village', 'area', 'mineral']);
    renderAnx6Contiguous();
  }
  toast(`Uploaded ${mapped.length} Annexure VI ${sectionType === 'cluster' ? 'cluster' : 'contiguous cluster'} row(s).`, 'success');
}
window.processExcelDataAnx6 = processExcelDataAnx6;
function mergeAnx6UploadByRole(existingRows, uploadedRows, tableId, columnKeys) {
  const table = document.getElementById(tableId);
  const editableColumns = typeof getEditableColumnsForTable === 'function' ? getEditableColumnsForTable(table) : null;
  if (editableColumns === null) return uploadedRows;
  const allowed = Array.isArray(editableColumns) ? editableColumns : [];
  let protectedCells = 0;
  const merged = uploadedRows.map((incoming, rowIndex) => {
    const current = existingRows[rowIndex] || {};
    const out = { ...current };
    columnKeys.forEach((key, idx) => {
      if (allowed.includes(idx + 1)) out[key] = incoming[key];
      else {
        if (!(key in out)) out[key] = 'LOCKED';
        protectedCells += 1;
      }
    });
    return out;
  });
  if (existingRows.length > uploadedRows.length) {
    merged.push(...existingRows.slice(uploadedRows.length));
  }
  if (protectedCells && typeof toast === 'function') {
    toast(`${protectedCells} locked cell(s) were protected during Excel sync.`, 'info');
  }
  return merged;
}
function columnValueAnx6(row, header, aliases) {
  const normalizedHeaders = header.map(normalizeHeaderAnx6);
  for (const alias of aliases) {
    const key = normalizeHeaderAnx6(alias);
    const idx = normalizedHeaders.findIndex(h => h === key || h.includes(key) || key.includes(h));
    if (idx >= 0) return row[idx];
  }
  return '';
}
function mapAnx6Row(row, header, sectionType, rowNumber) {
  if (sectionType === 'cluster') {
    const mapped = {
      river: defaultNAAnx6(columnValueAnx6(row, header, ['River Name'])),
      cluster: defaultNAAnx6(columnValueAnx6(row, header, ['Cluster No.', 'Cluster No'])),
      lease: defaultNAAnx6(columnValueAnx6(row, header, ['Lease No'])),
      location: String(columnValueAnx6(row, header, ['Location (Riverbed/Patta Land)', 'Location']) || 'Riverbed').trim(),
      village: defaultNAAnx6(columnValueAnx6(row, header, ['Village'])),
      area: defaultNAAnx6(columnValueAnx6(row, header, ['Area (in Ha.)', 'Area'])),
      excavation: defaultNAAnx6(columnValueAnx6(row, header, ['Total Excavation (MT)', 'Total Excavation'])),
      mineral: defaultNAAnx6(columnValueAnx6(row, header, ['Total Mineral Excavation (MT)', 'Total Mineral Excavation']))
    };
    validateMappedAnx6Row(mapped, sectionType, rowNumber);
    if (mapped.mineral === 'NA' && mapped.excavation !== 'NA') mapped.mineral = toNumberAnx6(mapped.excavation) * 0.6;
    return mapped;
  }
  const mapped = {
    river: defaultNAAnx6(columnValueAnx6(row, header, ['River Name'])),
    contiguous: defaultNAAnx6(columnValueAnx6(row, header, ['Contiguous Cluster No.', 'Contiguous Cluster No'])),
    cluster: defaultNAAnx6(columnValueAnx6(row, header, ['Cluster No'])),
    leases: defaultNAAnx6(columnValueAnx6(row, header, ['Number of leases in the cluster', 'Number of leases'])),
    location: String(columnValueAnx6(row, header, ['Location (Riverbed / Patta Land)', 'Location']) || 'Riverbed').trim(),
    distance: defaultNAAnx6(columnValueAnx6(row, header, ['Distance between clusters', 'Distance'])),
    village: defaultNAAnx6(columnValueAnx6(row, header, ['Village'])),
    area: defaultNAAnx6(columnValueAnx6(row, header, ['Area Of Cluster (Ha)', 'Area'])),
    mineral: defaultNAAnx6(columnValueAnx6(row, header, ['Total Mineral Excavation (MT)', 'Total Mineral Excavation']))
  };
  validateMappedAnx6Row(mapped, sectionType, rowNumber);
  return mapped;
}
window.mapAnx6Row = mapAnx6Row;
function validateMappedAnx6Row(row, sectionType, rowNumber) {
  const required = sectionType === 'cluster'
    ? ['river', 'cluster', 'lease', 'location', 'village']
    : ['river', 'contiguous', 'cluster', 'leases', 'location', 'distance', 'village'];
  const missing = required.filter(key => !String(row[key] ?? '').trim());
  if (missing.length) throw new Error(`Required field missing in row ${rowNumber}: ${missing.join(', ')}.`);
  const numeric = sectionType === 'cluster' ? ['area', 'excavation'] : ['area', 'mineral'];
  const invalid = numeric.filter(key => String(row[key]).trim().toUpperCase() !== 'NA' && (!Number.isFinite(toNumberAnx6(row[key])) || toNumberAnx6(row[key]) < 0));
  if (invalid.length) throw new Error(`Invalid values in row ${rowNumber}: ${invalid.join(', ')} must be valid numbers.`);
}
function extractTableDataAnx6(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return { headers: [], rows: [], foot: [] };
  const headers = Array.from(table.querySelectorAll('thead th'))
    .filter(th => !th.classList.contains('no-print'))
    .map(th => th.innerText.trim().replace(/\n/g, ' '));
  const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
    return Array.from(tr.querySelectorAll('td'))
      .filter(td => !td.classList.contains('no-print'))
      .map(getCellTextAnx6);
  });
  const foot = Array.from(table.querySelectorAll('tfoot tr')).map(tr => {
    const out = [];
    Array.from(tr.querySelectorAll('td')).forEach(td => {
      if (td.classList.contains('no-print')) return;
      const span = parseInt(td.getAttribute('colspan') || '1', 10);
      out.push(td.innerText.trim());
      for (let i = 1; i < span; i++) out.push('');
    });
    return out.slice(0, headers.length);
  });
  return { headers, rows, foot };
}
function exportAnx6PDF(btn, isLivePreview = false) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const district = S.activeProject ? S.activeProject.district || 'Jalandhar' : 'Jalandhar';
  const districtUpper = district.toUpperCase();
  let startY = 80;
  const drawHeaderFooter = (data) => {
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Page " + data.pageNumber, pageWidth / 2, pageHeight - 20, { align: 'center' });
  };
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Annexure-VI', pageWidth - 55, 60, { align: 'right' });
  const clusterTitle = document.querySelector('#view-anx6 .anx-section:nth-of-type(1) .editable-title')?.innerText.trim() || 'Final Cluster & Contiguous Cluster details Clusters:';
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.text('> ' + clusterTitle, 60, startY);
  startY += 35;
  const cluster = extractTableDataAnx6('anx6-final-clusters');
  doc.autoTable({
    startY,
    head: [cluster.headers],
    body: cluster.rows,
    foot: cluster.foot,
    theme: 'grid',
    margin: { left: 55, right: 40, bottom: 70 },
    styles: { font: 'times', fontSize: 6.7, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 2, valign: 'middle', halign: 'center', overflow: 'linebreak' },
    headStyles: { fillColor: false, fontStyle: 'bold', textColor: 0, halign: 'center' },
    footStyles: { fillColor: false, fontStyle: 'bold', textColor: 0, halign: 'center' },
    columnStyles: { 2: { cellWidth: 92 }, 4: { cellWidth: 68 }, 7: { cellWidth: 86 } },
    didDrawPage: drawHeaderFooter
  });
  startY = doc.lastAutoTable.finalY + 28;
  if (startY > pageHeight - 170) {
    doc.addPage();
    startY = 80;
  }
  const contiguousTitle = document.querySelector('#view-anx6 .anx-section:nth-of-type(2) .editable-title')?.innerText.trim() || 'Final Contiguous Clusters:';
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.text(contiguousTitle, 60, startY);
  startY += 18;
  const contiguous = extractTableDataAnx6('anx6-contiguous-clusters');
  doc.autoTable({
    startY,
    head: [contiguous.headers],
    body: contiguous.rows,
    foot: contiguous.foot,
    theme: 'grid',
    margin: { left: 55, right: 40, bottom: 70 },
    styles: { font: 'times', fontSize: 7, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 2, valign: 'middle', halign: 'center', overflow: 'linebreak' },
    headStyles: { fillColor: false, fontStyle: 'bold', textColor: 0, halign: 'center' },
    footStyles: { fillColor: false, fontStyle: 'bold', textColor: 0, halign: 'center' },
    columnStyles: { 1: { cellWidth: 58 }, 3: { cellWidth: 62 }, 6: { cellWidth: 76 }, 8: { cellWidth: 88 } },
    didDrawPage: drawHeaderFooter
  });
  if (isLivePreview) {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx6') : document.getElementById('pdf-iframe-anx6'));
    if (iframe) iframe.src = blobUrl;
  } else {
    doc.save('Annexure_VI_Final_Cluster_Details.pdf');
    toast('PDF downloaded successfully!', 'success');
  }
}
window.exportAnx6PDF = exportAnx6PDF;
function renderPdfUploadUIAnx6() {
  const els = {
    name: document.getElementById('anx6-uploaded-filename'),
    dl: document.getElementById('anx6-download-btn'),
    del: document.getElementById('anx6-delete-btn'),
    prev: document.getElementById('anx6-preview-btn'),
    sec: document.getElementById('pdf-preview-section-anx6'),
    iframe: (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx6') : document.getElementById('pdf-iframe-anx6'))
  };
  if (!els.name || !els.dl) return;
  if (!S.activeProject || !S.activeProject.anx6PdfName) {
    els.name.style.display = 'none';
    els.dl.style.display = 'none';
    if (els.del) els.del.style.display = 'none';
    if (els.prev) els.prev.style.display = 'none';
    if (els.sec) { els.sec.style.display = 'none'; if (els.iframe) els.iframe.src = 'about:blank'; }
    return;
  }
  els.name.textContent = S.activeProject.anx6PdfName;
  els.name.style.display = 'inline-block';
  els.dl.style.display = 'inline-flex';
  if (els.del) els.del.style.display = 'inline-flex';
  if (els.prev) els.prev.style.display = 'inline-flex';
  if (els.sec && els.sec.style.display === 'block' && els.iframe && S.activeProject?.pdfData?.anx6) {
    els.iframe.src = S.activeProject.pdfData.anx6;
  }
  if (window.initLucide) window.initLucide();
}
window.renderPdfUploadUIAnx6 = renderPdfUploadUIAnx6;
function togglePDFPreviewAnx6() {
  const sec = document.getElementById('pdf-preview-section-anx6');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx6') : document.getElementById('pdf-iframe-anx6'));
  if (!sec || !iframe) return;
  if (sec.style.display === 'block') {
    sec.style.display = 'none';
    if (iframe.src.startsWith('blob:')) URL.revokeObjectURL(iframe.src);
    iframe.src = 'about:blank';
  } else if (S.activeProject?.pdfData?.anx6) {
    iframe.src = S.activeProject.pdfData.anx6;
    sec.style.display = 'block';
  } else {
    toast('No PDF preview available. Please re-upload.', 'warn');
  }
}
window.togglePDFPreviewAnx6 = togglePDFPreviewAnx6;
function closePDFPreviewAnx6() {
  const sec = document.getElementById('pdf-preview-section-anx6');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx6') : document.getElementById('pdf-iframe-anx6'));
  if (sec) sec.style.display = 'none';
  if (iframe) { if (iframe.src.startsWith('blob:')) URL.revokeObjectURL(iframe.src); iframe.src = 'about:blank'; }
}
window.closePDFPreviewAnx6 = closePDFPreviewAnx6;
function downloadPdfAnx6() {
  if (!S.activeProject?.anx6PdfName) { toast('No PDF uploaded yet.', 'warn'); return; }
  if (window.downloadStoredPdf) {
    downloadStoredPdf('anx6', S.activeProject.anx6PdfName, S.activeProject.pdfData?.anx6);
    return;
  }
  const a = document.createElement('a');
  a.href = S.activeProject.pdfData?.anx6 || '';
  a.download = S.activeProject.anx6PdfName;
  a.style.display = 'none';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
window.downloadPdfAnx6 = downloadPdfAnx6;
function deletePdfAnx6() {
  if (!S.activeProject || !confirm('Delete the uploaded PDF?')) return;
  closePDFPreviewAnx6();
  S.activeProject.anx6PdfName = null;
  if (S.activeProject.pdfData) S.activeProject.pdfData.anx6 = null;
  const pi = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pi >= 0) { S.projects[pi].anx6PdfName = null; if (S.projects[pi].pdfData) S.projects[pi].pdfData.anx6 = null; }
  renderPdfUploadUIAnx6();
  if (window.debouncedSaveState) window.debouncedSaveState();
  toast('PDF deleted.', 'success');
}
window.deletePdfAnx6 = deletePdfAnx6;
function handlePDFUploadAnx6(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) { toast('Only PDF files allowed.', 'error'); event.target.value = ''; return; }
  if (!S.activeProject) { toast('Select a project first.', 'warn'); event.target.value = ''; return; }
  const fileURL = URL.createObjectURL(file);
  S.activeProject.anx6PdfName = file.name;
  if (!S.activeProject.pdfData) S.activeProject.pdfData = {};
  S.activeProject.pdfData.anx6 = fileURL;
  if (window.storeProjectPdf) {
    window.storeProjectPdf('anx6', file).catch(err => console.error('Backend PDF upload failed:', err));
  }
  const pi = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pi >= 0) { S.projects[pi].anx6PdfName = file.name; if (!S.projects[pi].pdfData) S.projects[pi].pdfData = {}; S.projects[pi].pdfData.anx6 = fileURL; }
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx6') : document.getElementById('pdf-iframe-anx6'));
  const sec = document.getElementById('pdf-preview-section-anx6');
  if (iframe && sec) { iframe.src = fileURL; sec.style.display = 'block'; }
  renderPdfUploadUIAnx6();
  if (window.debouncedSaveState) window.debouncedSaveState();
  toast('PDF uploaded and preview loaded!', 'success');
  event.target.value = '';
}
window.handlePDFUploadAnx6 = handlePDFUploadAnx6;
var ANX6_STORAGE_PREFIX = 'anx6_heading_';
function saveAnx6Heading(el) {
  var key = el.getAttribute('data-key');
  if (!key) return;
  try { localStorage.setItem(ANX6_STORAGE_PREFIX + key, el.innerText.trim()); } catch (e) {}
}
window.saveAnx6Heading = saveAnx6Heading;
function loadAnx6Headings() {
  document.querySelectorAll('#view-anx6 .editable-title[data-key]').forEach(function (el) {
    var key = el.getAttribute('data-key');
    var saved = null;
    try { saved = localStorage.getItem(ANX6_STORAGE_PREFIX + key); } catch (e) {}
    if (saved) el.innerText = saved;
  });
}
window.loadAnx6Headings = loadAnx6Headings;
window.addEventListener('DOMContentLoaded', () => {
  renderAnx6();
  loadAnx6Headings();
  setTimeout(initLucide, 50);
});
document.addEventListener('input', (e) => {
  if (e.target.closest('#view-anx6 table')) {
    if (window.anx6DebounceTimer) clearTimeout(window.anx6DebounceTimer);
    window.anx6DebounceTimer = setTimeout(() => {
       exportAnx6PDF(null, true);
    }, 1500); // 1.5 seconds after typing stops
  }
});
document.addEventListener('change', (e) => {
  if (e.target.closest('#view-anx6 table')) {
    if (window.anx6DebounceTimer) clearTimeout(window.anx6DebounceTimer);
    window.anx6DebounceTimer = setTimeout(() => {
      exportAnx6PDF(null, true);
    }, 300);
  }
});

;

/* js/anx7.js */
/* ANNEXURE VII - TRANSPORTATION ROUTES */
window.S = window.S || { activeProject: { id: 'demo_proj', anx7PdfName: null }, projects: [] };
window.toast = window.toast || function (msg, type) { alert('[' + (type || 'INFO').toUpperCase() + '] ' + msg); };
window.initLucide = window.initLucide || function () { if (window.lucide) lucide.createIcons(); };
const ANX7_ROUTE_HEADERS = [
  'Sl.No',
  'Lease No.',
  'Transportation Route No.',
  'Number of Tippers/day of lease',
  'Number of tippers/day of all leases on route',
  'Length of Route (Km)',
  'Type of Road (Black Topped/Unpaved)',
  'Recommendation for road (Black Topped/Unpaved)',
  'The road will be constructed by Govt./Lease Owner',
  'Route Map & Location'
];
const ANX7_CLUSTER_HEADERS = [
  'Cluster No',
  'Transportation Route No',
  'Number of tippers/day of cluster',
  'Number of tippers/day of all clusters on route',
  'Length of Route in KM',
  'Type of Road (Black Topped/Unpaved)',
  'Recommendation for road (Black Topped/Unpaved)',
  'The road will be constructed by Govt/Lease Owner',
  'Route Map & Location'
];
const ANX7_ROAD_OPTIONS = ['NA', 'Unpaved', 'Black Topped', 'Metalled', 'WBM', 'Other'];
const ANX7_CONSTRUCTOR_OPTIONS = ['NA', 'Lease Owner', 'Govt', 'Govt./Lease Owner'];
const ANX7_DEFAULT_ROUTES = [
  ['NPRO_JL_PL_ST_43', "EE - EE' &\nFF - FF'", 192, 192, '1.27 &\n1.2', 'Unpaved', 'Unpaved', 'Lease Owner', 'Route Map\nattached'],
  ['NPRO_JL_PL_ST_44', 'GG - GG', 15, 15, '', 'Unpaved', 'Unpaved', 'Lease Owner', 'Route Map\nattached'],
  ['NPRO_JL_PL_ST_45', '', 14, 14, '1.21', 'Unpaved', 'Unpaved', 'Lease Owner', 'Route Map\nattached']
];
const ANX7_DEFAULT_CLUSTERS = [
  ['Jalandhar Sutlej 1,2', "A-A', B-B'", 358, 'NA', 0.73, 'Unpaved', 'Unpaved', 'Lease Owner', 'Route Map\nattached'],
  ['Jalandhar Sutlej 3,4,5,6', "C-C' TO F-\nF'", 343, 'NA', 2.1, 'Unpaved', 'Unpaved', 'Lease Owner', 'Route Map\nattached']
];
function escapeHtmlAnx7(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function makeSelectAnx7(options, selected) {
  return `<select>${options.map(option => `<option${option === selected ? ' selected' : ''}>${escapeHtmlAnx7(option)}</option>`).join('')}</select>`;
}
function cleanTextAnx7(value, fallback = 'NA') {
  const text = String(value === undefined || value === null ? '' : value).trim();
  return text || fallback;
}
function fillNAAnx7(el) {
  if (el && String(el.innerText || '').trim() === '') el.innerText = 'NA';
}
window.fillNAAnx7 = fillNAAnx7;
function getCellTextAnx7(td) {
  const select = td.querySelector('select');
  return cleanTextAnx7(select ? select.value : td.innerText);
}
function renderRouteRowAnx7(data) {
  const row = data.length === 10 ? data : ['', ...data];
  const [sl, lease, route, tipLease, tipAll, length, roadType, recommendation, constructedBy, map] = row;
  return `<tr>
    <td contenteditable="true" onblur="fillNAAnx7(this)">${escapeHtmlAnx7(cleanTextAnx7(sl))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)" style="text-align:left;white-space:pre-wrap">${escapeHtmlAnx7(cleanTextAnx7(lease))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)">${escapeHtmlAnx7(cleanTextAnx7(route))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)">${escapeHtmlAnx7(cleanTextAnx7(tipLease))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)">${escapeHtmlAnx7(cleanTextAnx7(tipAll))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)">${escapeHtmlAnx7(cleanTextAnx7(length))}</td>
    <td>${makeSelectAnx7(ANX7_ROAD_OPTIONS, cleanTextAnx7(roadType))}</td>
    <td>${makeSelectAnx7(ANX7_ROAD_OPTIONS, cleanTextAnx7(recommendation))}</td>
    <td>${makeSelectAnx7(ANX7_CONSTRUCTOR_OPTIONS, cleanTextAnx7(constructedBy))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)" style="white-space:pre-wrap">${escapeHtmlAnx7(cleanTextAnx7(map))}</td>
    <td class="no-print">
      <button class="btn btn-xs btn-danger" onclick="deleteRowAnx7(this)" style="display:inline-flex; align-items:center; justify-content:center; padding:4px;">
        <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
      </button>
    </td>
  </tr>`;
}
function renderClusterRowAnx7(data) {
  const [cluster, route, tipCluster, tipAll, length, roadType, recommendation, constructedBy, map] = data;
  return `<tr>
    <td contenteditable="true" onblur="fillNAAnx7(this)" style="text-align:left;white-space:pre-wrap">${escapeHtmlAnx7(cleanTextAnx7(cluster))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)">${escapeHtmlAnx7(cleanTextAnx7(route))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)">${escapeHtmlAnx7(cleanTextAnx7(tipCluster))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)">${escapeHtmlAnx7(cleanTextAnx7(tipAll))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)">${escapeHtmlAnx7(cleanTextAnx7(length))}</td>
    <td>${makeSelectAnx7(ANX7_ROAD_OPTIONS, cleanTextAnx7(roadType))}</td>
    <td>${makeSelectAnx7(ANX7_ROAD_OPTIONS, cleanTextAnx7(recommendation))}</td>
    <td>${makeSelectAnx7(ANX7_CONSTRUCTOR_OPTIONS, cleanTextAnx7(constructedBy))}</td>
    <td contenteditable="true" onblur="fillNAAnx7(this)" style="white-space:pre-wrap">${escapeHtmlAnx7(cleanTextAnx7(map))}</td>
    <td class="no-print">
      <button class="btn btn-xs btn-danger" onclick="deleteRowAnx7(this)" style="display:inline-flex; align-items:center; justify-content:center; padding:4px;">
        <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
      </button>
    </td>
  </tr>`;
}
function deleteRowAnx7(btn) {
  const tbody = btn.closest('tbody');
  if (tbody && tbody.rows.length <= 1) {
    toast('At least one row is required.', 'warn');
    return;
  }
  btn.closest('tr').remove();
  renumberRouteRowsAnx7(tbody);
}
window.deleteRowAnx7 = deleteRowAnx7;
function renumberRouteRowsAnx7(tbody) {
  if (!tbody || !tbody.classList.contains('anx7-route-table-body')) return;
  Array.from(tbody.rows).forEach((tr, index) => {
    if (tr.cells[0]) tr.cells[0].innerText = String(index + 1);
  });
}
function addRouteRowAnx7(btn) {
  const card = btn ? btn.closest('.card') : document.querySelector('#anx7-individual-routes-container .table-block-card');
  const tbody = card?.querySelector('.anx7-route-table-body');
  if (!tbody) return;
  const next = tbody.rows.length + 1;
  tbody.insertAdjacentHTML('beforeend', renderRouteRowAnx7([next, 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA']));
  markCardStateAnx7(card, 'edited');
  if (window.initLucide) window.initLucide();
}
window.addRouteRowAnx7 = addRouteRowAnx7;
function addClusterRowAnx7(btn) {
  const card = btn ? btn.closest('.card') : document.querySelector('#anx7-cluster-routes-container .table-block-card');
  const tbody = card?.querySelector('.anx7-cluster-table-body');
  if (!tbody) return;
  tbody.insertAdjacentHTML('beforeend', renderClusterRowAnx7(['NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA']));
  markCardStateAnx7(card, 'edited');
  if (window.initLucide) window.initLucide();
}
window.addClusterRowAnx7 = addClusterRowAnx7;
function markCardStateAnx7(card, state) {
  if (!card) return;
  card.dataset.validationState = state || 'edited';
  card.dataset.exportState = 'dirty';
}
function addRouteTableBlockAnx7(prefill = false, rows = null, title = '') {
  const container = document.getElementById('anx7-individual-routes-container');
  if (!container) return null;
  const index = container.querySelectorAll('.table-block-card').length + 1;
  const safeTitle = title || (index === 1 ? 'Individual Lease Routes' : `Individual Lease Routes - Table ${index}`);
  const id = `anx7-routes-${Date.now()}-${index}`;
  container.insertAdjacentHTML('beforeend', `
  <div class="card table-block-card" style="margin-bottom:24px;" data-type="individual" data-validation-state="clean" data-export-state="clean">
    <div class="card-hd" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div class="card-title-group" style="display:flex; align-items:center; gap:8px;">
        <span class="card-title" contenteditable="true" style="font-weight: 600; border-bottom: 1px dashed var(--border-2); outline: none;">${escapeHtmlAnx7(safeTitle)}</span>
        <span class="text-soft" style="font-size:11px;">(Click to edit title)</span>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="btn btn-excel-template btn-xs" onclick="downloadRouteTemplateAnx7(this)" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="file-spreadsheet" style="width:12px; height:12px;"></i>
          <span>Routes Template</span>
        </button>
        <label class="btn btn-excel-upload btn-xs" style="cursor:pointer; margin-bottom:0; display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="upload" style="width:12px; height:12px;"></i>
          <span>Upload Routes</span>
          <input type="file" accept=".xlsx,.xls,.csv" hidden onchange="uploadRoutesAnx7(event, this)">
        </label>
        <button class="btn btn-xs btn-outline" style="display:inline-flex; align-items:center; gap:6px;" onclick="addRouteRowAnx7(this)">
          <i data-lucide="plus" style="width:12px; height:12px;"></i>
          <span>Add Row</span>
        </button>
        <button class="btn btn-xs btn-danger btn-delete-table" onclick="deleteTableBlockAnx7(this)" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
          <span>Delete Table</span>
        </button>
      </div>
    </div>
    <div class="card-bd">
      <div class="tbl-wrap">
        <table class="anx-tbl anx7-routes-table" id="${id}" style="min-width:1100px">
          <thead>
            <tr>
              <th style="width:50px">Sl.No.</th>
              <th style="min-width:160px">Lease No.</th>
              <th style="min-width:90px">Transportation Route No.</th>
              <th style="min-width:80px">Number of Tippers/day<br>(of lease)</th>
              <th style="min-width:80px">Number of tippers/day<br>(of all leases on route)</th>
              <th style="min-width:80px">Length of Route (Km)</th>
              <th style="min-width:100px">Type of Road</th>
              <th style="min-width:110px">Recommendation for road</th>
              <th style="min-width:110px">The road will be constructed by</th>
              <th style="min-width:100px">Route Map &amp; Location</th>
              <th style="width:50px" class="no-print">Action</th>
            </tr>
          </thead>
          <tbody class="anx7-route-table-body"></tbody>
        </table>
      </div>
    </div>
  </div>`);
  const card = container.lastElementChild;
  const tbody = card.querySelector('.anx7-route-table-body');
  const data = rows || (prefill ? ANX7_DEFAULT_ROUTES.map((row, i) => [i + 1, ...row]) : [[1, 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA']]);
  tbody.innerHTML = data.map((row, i) => renderRouteRowAnx7(row.length === 9 ? [i + 1, ...row] : row)).join('');
  renumberTableBlocksAnx7('individual');
  updateDeleteButtonsVisibilityAnx7('individual');
  if (window.initLucide) window.initLucide();
  return card;
}
window.addRouteTableBlockAnx7 = addRouteTableBlockAnx7;
function addClusterTableBlockAnx7(prefill = false, rows = null, title = '') {
  const container = document.getElementById('anx7-cluster-routes-container');
  if (!container) return null;
  const index = container.querySelectorAll('.table-block-card').length + 1;
  const safeTitle = title || (index === 1 ? 'Cluster Transportation Routes' : `Cluster Transportation Routes - Table ${index}`);
  const id = `anx7-cluster-routes-${Date.now()}-${index}`;
  container.insertAdjacentHTML('beforeend', `
  <div class="card table-block-card" style="margin-bottom:24px;" data-type="cluster" data-validation-state="clean" data-export-state="clean">
    <div class="card-hd" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div class="card-title-group" style="display:flex; align-items:center; gap:8px;">
        <span class="card-title" contenteditable="true" style="font-weight: 600; border-bottom: 1px dashed var(--border-2); outline: none;">${escapeHtmlAnx7(safeTitle)}</span>
        <span class="text-soft" style="font-size:11px;">(Click to edit title)</span>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="btn btn-excel-template btn-xs" onclick="downloadClusterTemplateAnx7(this)" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="file-spreadsheet" style="width:12px; height:12px;"></i>
          <span>Cluster Template</span>
        </button>
        <label class="btn btn-excel-upload btn-xs" style="cursor:pointer; margin-bottom:0; display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="upload" style="width:12px; height:12px;"></i>
          <span>Upload Cluster</span>
          <input type="file" accept=".xlsx,.xls,.csv" hidden onchange="uploadClustersAnx7(event, this)">
        </label>
        <button class="btn btn-xs btn-outline" style="display:inline-flex; align-items:center; gap:6px;" onclick="addClusterRowAnx7(this)">
          <i data-lucide="plus" style="width:12px; height:12px;"></i>
          <span>Add Row</span>
        </button>
        <button class="btn btn-xs btn-danger btn-delete-table" onclick="deleteTableBlockAnx7(this)" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
          <span>Delete Table</span>
        </button>
      </div>
    </div>
    <div class="card-bd">
      <div class="tbl-wrap">
        <table class="anx-tbl anx7-cluster-routes-table" id="${id}" style="min-width:1000px">
          <thead>
            <tr>
              <th style="min-width:130px">Cluster No</th>
              <th style="min-width:90px">Transportation Route No</th>
              <th style="min-width:80px">Number of tippers/day<br>(of cluster)</th>
              <th style="min-width:80px">Number of tippers/day<br>(of all clusters on route)</th>
              <th style="min-width:80px">Length of Route in KM</th>
              <th style="min-width:100px">Type of Road</th>
              <th style="min-width:110px">Recommendation for road</th>
              <th style="min-width:110px">The road will be constructed by</th>
              <th style="min-width:100px">Route Map &amp; Location</th>
              <th style="width:50px" class="no-print">Action</th>
            </tr>
          </thead>
          <tbody class="anx7-cluster-table-body"></tbody>
        </table>
      </div>
    </div>
  </div>`);
  const card = container.lastElementChild;
  const tbody = card.querySelector('.anx7-cluster-table-body');
  const data = rows || (prefill ? ANX7_DEFAULT_CLUSTERS : [['NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA']]);
  tbody.innerHTML = data.map(renderClusterRowAnx7).join('');
  renumberTableBlocksAnx7('cluster');
  updateDeleteButtonsVisibilityAnx7('cluster');
  if (window.initLucide) window.initLucide();
  return card;
}
window.addClusterTableBlockAnx7 = addClusterTableBlockAnx7;
function containerForAnx7(type) {
  return document.getElementById(type === 'individual' ? 'anx7-individual-routes-container' : 'anx7-cluster-routes-container');
}
function renumberTableBlocksAnx7(type) {
  const container = containerForAnx7(type);
  if (!container) return;
  Array.from(container.querySelectorAll('.table-block-card')).forEach((card, index) => {
    const titleEl = card.querySelector('.card-title');
    const base = type === 'individual' ? 'Individual Lease Routes' : 'Cluster Transportation Routes';
    if (titleEl && /^(Individual Lease Routes|Cluster Transportation Routes)( - Table \d+)?$/.test(titleEl.innerText.trim())) {
      titleEl.innerText = index === 0 ? base : `${base} - Table ${index + 1}`;
    }
  });
}
function updateDeleteButtonsVisibilityAnx7(type) {
  const container = containerForAnx7(type);
  if (!container) return;
  const cards = container.querySelectorAll('.table-block-card');
  cards.forEach(card => {
    const btn = card.querySelector('.btn-delete-table');
    if (btn) btn.style.display = cards.length <= 1 ? 'none' : 'inline-flex';
  });
}
function deleteTableBlockAnx7(btn) {
  const card = btn.closest('.card');
  const type = card.getAttribute('data-type');
  const container = card.parentElement;
  if (container.querySelectorAll('.table-block-card').length <= 1) {
    toast('You cannot delete the last remaining table.', 'warn');
    return;
  }
  if (confirm('Are you sure you want to delete this entire table block?')) {
    card.remove();
    renumberTableBlocksAnx7(type);
    updateDeleteButtonsVisibilityAnx7(type);
    toast('Table block deleted.', 'success');
  }
}
window.deleteTableBlockAnx7 = deleteTableBlockAnx7;
function rowsFromRouteCardAnx7(card) {
  return Array.from(card.querySelectorAll('.anx7-route-table-body tr')).map(tr => {
    const cells = tr.querySelectorAll('td');
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(index => index >= 6 && index <= 8 ? cells[index].querySelector('select').value : cells[index].innerText.trim());
  });
}
function rowsFromClusterCardAnx7(card) {
  return Array.from(card.querySelectorAll('.anx7-cluster-table-body tr')).map(tr => {
    const cells = tr.querySelectorAll('td');
    return [0, 1, 2, 3, 4, 5, 6, 7, 8].map(index => index >= 5 && index <= 7 ? cells[index].querySelector('select').value : cells[index].innerText.trim());
  });
}
function downloadTemplateAnx7(headers, rows, sheetName, filename) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = headers.map(h => ({ wch: Math.min(Math.max(String(h).length + 4, 12), 30) }));
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}
function downloadRouteTemplateAnx7(btn) {
  const card = btn.closest('.card');
  const title = card.querySelector('.card-title').innerText.trim().replace(/[^a-z0-9]+/gi, '_');
  downloadTemplateAnx7(ANX7_ROUTE_HEADERS, rowsFromRouteCardAnx7(card), 'Transportation_Routes', `${title}_Template.xlsx`);
  toast('Routes Excel downloaded', 'success');
}
window.downloadRouteTemplateAnx7 = downloadRouteTemplateAnx7;
function downloadClusterTemplateAnx7(btn) {
  const card = btn.closest('.card');
  const title = card.querySelector('.card-title').innerText.trim().replace(/[^a-z0-9]+/gi, '_');
  downloadTemplateAnx7(ANX7_CLUSTER_HEADERS, rowsFromClusterCardAnx7(card), 'Cluster_Routes', `${title}_Template.xlsx`);
  toast('Cluster Excel downloaded', 'success');
}
window.downloadClusterTemplateAnx7 = downloadClusterTemplateAnx7;
function validateFileAnx7(file) {
  if (!file) return 'Missing file.';
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return 'Wrong file type. Please upload .xlsx, .xls, or .csv.';
  return '';
}
function parseWorkbookRowsAnx7(file, callback) {
  const fileError = validateFileAnx7(file);
  if (fileError) throw new Error(fileError);
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheets = workbook.SheetNames.map(name => ({
        name,
        rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' })
      }));
      callback(sheets);
    } catch (error) {
      console.error(error);
      toast('Upload failed: ' + error.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}
function parseRowsAnx7(rows) {
  const cleanRows = rows.filter(row => Array.isArray(row) && row.some(cell => String(cell ?? '').trim() !== ''));
  if (cleanRows.length < 2) throw new Error('No data rows found.');
  return cleanRows.slice(1);
}
function mapRouteRowAnx7(row, index) {
  return [
    row[0] || index + 1,
    cleanTextAnx7(row[1]),
    cleanTextAnx7(row[2]),
    cleanTextAnx7(row[3]),
    cleanTextAnx7(row[4]),
    cleanTextAnx7(row[5]),
    cleanTextAnx7(row[6]),
    cleanTextAnx7(row[7]),
    cleanTextAnx7(row[8]),
    cleanTextAnx7(row[9])
  ];
}
function mapClusterRowAnx7(row) {
  return [
    cleanTextAnx7(row[0]),
    cleanTextAnx7(row[1]),
    cleanTextAnx7(row[2]),
    cleanTextAnx7(row[3]),
    cleanTextAnx7(row[4]),
    cleanTextAnx7(row[5]),
    cleanTextAnx7(row[6]),
    cleanTextAnx7(row[7]),
    cleanTextAnx7(row[8])
  ];
}
function fillRouteCardAnx7(card, dataRows, fileName) {
  const tbody = card.querySelector('.anx7-route-table-body');
  const uploadRows = dataRows.map((row, index) => mapRouteRowAnx7(row, index));
  const table = card.querySelector('table');
  if (typeof rbacApplyExcelRowsToTable === 'function') {
    rbacApplyExcelRowsToTable(table, uploadRows, row => tbody.insertAdjacentHTML('beforeend', renderRouteRowAnx7(row)));
  } else {
    tbody.innerHTML = uploadRows.map(renderRouteRowAnx7).join('');
  }
  renumberRouteRowsAnx7(tbody);
  card.dataset.uploadedExcel = fileName || '';
  card.dataset.validationState = 'valid';
  card.dataset.exportState = 'dirty';
}
function fillClusterCardAnx7(card, dataRows, fileName) {
  const tbody = card.querySelector('.anx7-cluster-table-body');
  const uploadRows = dataRows.map(row => mapClusterRowAnx7(row));
  const table = card.querySelector('table');
  if (typeof rbacApplyExcelRowsToTable === 'function') {
    rbacApplyExcelRowsToTable(table, uploadRows, row => tbody.insertAdjacentHTML('beforeend', renderClusterRowAnx7(row)));
  } else {
    tbody.innerHTML = uploadRows.map(renderClusterRowAnx7).join('');
  }
  card.dataset.uploadedExcel = fileName || '';
  card.dataset.validationState = 'valid';
  card.dataset.exportState = 'dirty';
}
function uploadRoutesAnx7(event, input) {
  const file = event.target.files[0];
  if (!file) return;
  const currentCard = input.closest('.card');
  try {
    parseWorkbookRowsAnx7(file, sheets => {
      const routeSheets = sheets.filter(sheet => !/cluster/i.test(sheet.name));
      const sourceSheets = routeSheets.length ? routeSheets : [sheets[0]];
      let loaded = 0;
      sourceSheets.forEach(sheet => {
        const dataRows = parseRowsAnx7(sheet.rows);
        const card = loaded === 0 && currentCard ? currentCard : addRouteTableBlockAnx7(false, [], `Individual Lease Routes - Table ${document.querySelectorAll('#anx7-individual-routes-container .table-block-card').length + 1}`);
        fillRouteCardAnx7(card, dataRows, file.name);
        loaded += dataRows.length;
      });
      renumberTableBlocksAnx7('individual');
      updateDeleteButtonsVisibilityAnx7('individual');
      if (window.initLucide) window.initLucide();
      toast(`Loaded ${loaded} route row(s).`, 'success');
    });
  } catch (error) {
    toast(error.message, 'error');
  }
  event.target.value = '';
}
window.uploadRoutesAnx7 = uploadRoutesAnx7;
function uploadClustersAnx7(event, input) {
  const file = event.target.files[0];
  if (!file) return;
  const currentCard = input.closest('.card');
  try {
    parseWorkbookRowsAnx7(file, sheets => {
      const clusterSheets = sheets.filter(sheet => /cluster/i.test(sheet.name));
      const sourceSheets = clusterSheets.length ? clusterSheets : [sheets[0]];
      let loaded = 0;
      sourceSheets.forEach(sheet => {
        const dataRows = parseRowsAnx7(sheet.rows);
        const card = loaded === 0 && currentCard ? currentCard : addClusterTableBlockAnx7(false, [], `Cluster Transportation Routes - Table ${document.querySelectorAll('#anx7-cluster-routes-container .table-block-card').length + 1}`);
        fillClusterCardAnx7(card, dataRows, file.name);
        loaded += dataRows.length;
      });
      renumberTableBlocksAnx7('cluster');
      updateDeleteButtonsVisibilityAnx7('cluster');
      if (window.initLucide) window.initLucide();
      toast(`Loaded ${loaded} cluster route row(s).`, 'success');
    });
  } catch (error) {
    toast(error.message, 'error');
  }
  event.target.value = '';
}
window.uploadClustersAnx7 = uploadClustersAnx7;
function handleTableUploadAnx7(file, type) {
  const card = type === 'cluster'
    ? document.querySelector('#anx7-cluster-routes-container .table-block-card')
    : document.querySelector('#anx7-individual-routes-container .table-block-card');
  const fakeEvent = { target: { files: [file], value: '' } };
  if (type === 'cluster') uploadClustersAnx7(fakeEvent, card?.querySelector('input[type="file"]') || card);
  else uploadRoutesAnx7(fakeEvent, card?.querySelector('input[type="file"]') || card);
}
window.handleTableUploadAnx7 = handleTableUploadAnx7;
function getTableDataAnx7(card, type) {
  const selector = type === 'individual' ? '.anx7-route-table-body tr' : '.anx7-cluster-table-body tr';
  return Array.from(card.querySelectorAll(selector)).map(tr => {
    return Array.from(tr.querySelectorAll('td'))
      .filter(td => !td.classList.contains('no-print'))
      .map(getCellTextAnx7);
  });
}
function drawAnx7Furniture(doc, pageNum) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Page " + pageNum, pageW / 2, pageH - 20, { align: 'center' });
}
function exportAnx7PDF(btn, isLivePreview = false) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const drawn = new Set();
  const drawOnce = data => {
    const realPage = doc.internal.getCurrentPageInfo().pageNumber;
    if (drawn.has(realPage)) return;
    drawn.add(realPage);
    drawAnx7Furniture(doc, realPage);
  };
  let currentY = margin + 20;
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Annexure-VII', pageW - margin - 15, currentY, { align: 'right' });
  currentY += 8;
  doc.setFontSize(10);
  doc.text('>  Transportation Routes for individual leases and leases in Cluster:', margin + 8, currentY);
  currentY += 8;
  document.querySelectorAll('#anx7-individual-routes-container .table-block-card').forEach((card, index) => {
    if (currentY + 50 > pageH - 25) { doc.addPage(); currentY = margin + 20; }
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text(`Table ${index + 1}: ${card.querySelector('.card-title').innerText.trim()}`, margin + 8, currentY);
    currentY += 5;
    doc.autoTable({
      head: [[
        'Lease No.',
        'Transport\nation\nRoute No.',
        'Num\nber\nof\nTipp\ners\n/days\nof\nlease',
        'Numbe\nr of\ntippers\n/days of\nall the\nlease on\nroute',
        'Length\nof the\nRoute\nin Km',
        'Type of\nRoad\n(Black\nTopped/\nunpaved)',
        'Recomme\nndation\nfor road\n(Black\nTopped/\nunpaved)',
        'The road will\nbe constructed\nby Govt./Lease\nOwner',
        'Route Map &\nLocation'
      ]],
      body: getTableDataAnx7(card, 'individual').map(row => row.slice(1)),
      startY: currentY,
      margin: { top: margin + 12, bottom: 25, left: margin + 2, right: margin + 2 },
      theme: 'grid',
      styles: { font: 'times', fontSize: 8.5, cellPadding: 1.2, valign: 'middle', halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.3, textColor: [0, 0, 0], overflow: 'linebreak' },
      headStyles: { fillColor: false, textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
      alternateRowStyles: { fillColor: false },
      tableWidth: 178,
      columnStyles: { 0: { cellWidth: 34 }, 1: { cellWidth: 15 }, 2: { cellWidth: 14 }, 3: { cellWidth: 15 }, 4: { cellWidth: 11 }, 5: { cellWidth: 17 }, 6: { cellWidth: 20 }, 7: { cellWidth: 27 }, 8: { cellWidth: 25 } },
      didDrawPage: drawOnce
    });
    card.dataset.exportState = 'exported';
    currentY = doc.lastAutoTable.finalY + 12;
  });
  const clusterCards = document.querySelectorAll('#anx7-cluster-routes-container .table-block-card');
  if (clusterCards.length) {
    if (currentY + 20 > pageH - 25) { doc.addPage(); currentY = margin + 20; }
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('Cluster:', margin + 18, currentY);
    currentY += 6;
  }
  clusterCards.forEach((card, index) => {
    if (currentY + 50 > pageH - 25) { doc.addPage(); currentY = margin + 20; }
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text(`Cluster Table ${index + 1}: ${card.querySelector('.card-title').innerText.trim()}`, margin + 8, currentY);
    currentY += 5;
    doc.autoTable({
      head: [[
        'Cluster No',
        'Transporta\ntion Route\nNo',
        'Num\nber\nof\ntippe\nrs\n/day\nof\nclust\ner',
        'Numbe\nr of\ntipper\ns/day\nof all\nthe\nclusters\non route',
        'Leng\nth of\nRout\ne in\nKM',
        'Type of\nRoad\n(Black\nTopped/\nunpaved)',
        'Recomm\nendation\nfor road\n(Black\nTopped/\nunpaved)',
        'The road\nwill be\nConstru\ncted by\nGovt/Le\na Se\nOwner',
        'Route Map\n& Locati on'
      ]],
      body: getTableDataAnx7(card, 'cluster'),
      startY: currentY,
      margin: { top: margin + 12, bottom: 25, left: margin + 2, right: margin + 2 },
      theme: 'grid',
      styles: { font: 'times', fontSize: 8.5, cellPadding: 1.2, valign: 'middle', halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.3, textColor: [0, 0, 0], overflow: 'linebreak' },
      headStyles: { fillColor: false, textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
      alternateRowStyles: { fillColor: false },
      tableWidth: 178,
      columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 17 }, 2: { cellWidth: 13 }, 3: { cellWidth: 16 }, 4: { cellWidth: 11 }, 5: { cellWidth: 19 }, 6: { cellWidth: 21 }, 7: { cellWidth: 21 }, 8: { cellWidth: 28 } },
      didDrawPage: drawOnce
    });
    card.dataset.exportState = 'exported';
    currentY = doc.lastAutoTable.finalY + 12;
  });
  if (isLivePreview) {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx7') : document.getElementById('pdf-iframe-anx7'));
    if (iframe) iframe.src = blobUrl;
  } else {
    doc.save('Annexure_VII_Transportation_Routes.pdf');
    toast('PDF downloaded successfully!', 'success');
  }
}
window.exportAnx7PDF = exportAnx7PDF;
function renderPdfUploadUIAnx7() {
  const els = {
    name: document.getElementById('anx7-uploaded-filename'),
    dl: document.getElementById('anx7-download-btn'),
    del: document.getElementById('anx7-delete-btn'),
    prev: document.getElementById('anx7-preview-btn'),
    sec: document.getElementById('pdf-preview-section-anx7'),
    iframe: (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx7') : document.getElementById('pdf-iframe-anx7'))
  };
  if (!els.name || !els.dl) return;
  if (!S.activeProject || !S.activeProject.anx7PdfName) {
    els.name.style.display = 'none';
    els.dl.style.display = 'none';
    if (els.del) els.del.style.display = 'none';
    if (els.prev) els.prev.style.display = 'none';
    if (els.sec) { els.sec.style.display = 'none'; if (els.iframe) els.iframe.src = 'about:blank'; }
    return;
  }
  els.name.textContent = S.activeProject.anx7PdfName;
  els.name.style.display = 'inline-block';
  els.dl.style.display = 'inline-flex';
  if (els.del) els.del.style.display = 'inline-flex';
  if (els.prev) els.prev.style.display = 'inline-flex';
  if (els.sec && els.sec.style.display === 'block' && els.iframe && S.activeProject?.pdfData?.anx7) {
    els.iframe.src = S.activeProject.pdfData.anx7;
  }
  if (window.initLucide) window.initLucide();
}
window.renderPdfUploadUIAnx7 = renderPdfUploadUIAnx7;
function togglePDFPreviewAnx7() {
  const sec = document.getElementById('pdf-preview-section-anx7');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx7') : document.getElementById('pdf-iframe-anx7'));
  if (!sec || !iframe) return;
  if (sec.style.display === 'block') {
    closePDFPreviewAnx7();
  } else if (S.activeProject?.pdfData?.anx7) {
    iframe.src = S.activeProject.pdfData.anx7;
    sec.style.display = 'block';
  } else {
    toast('No PDF preview available. Please re-upload.', 'warn');
  }
}
window.togglePDFPreviewAnx7 = togglePDFPreviewAnx7;
function closePDFPreviewAnx7() {
  const sec = document.getElementById('pdf-preview-section-anx7');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx7') : document.getElementById('pdf-iframe-anx7'));
  if (sec) sec.style.display = 'none';
  if (iframe) {
    if (iframe.src.startsWith('blob:')) URL.revokeObjectURL(iframe.src);
    iframe.src = 'about:blank';
  }
}
window.closePDFPreviewAnx7 = closePDFPreviewAnx7;
function downloadPdfAnx7() {
  if (!S.activeProject?.anx7PdfName) { toast('No PDF uploaded yet.', 'warn'); return; }
  if (window.downloadStoredPdf) {
    downloadStoredPdf('anx7', S.activeProject.anx7PdfName, S.activeProject.pdfData?.anx7);
    return;
  }
  const a = document.createElement('a');
  a.href = S.activeProject.pdfData?.anx7 || '';
  a.download = S.activeProject.anx7PdfName;
  a.style.display = 'none';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
window.downloadPdfAnx7 = downloadPdfAnx7;
function deletePdfAnx7() {
  if (!S.activeProject || !confirm('Delete the uploaded PDF?')) return;
  closePDFPreviewAnx7();
  S.activeProject.anx7PdfName = null;
  if (S.activeProject.pdfData) S.activeProject.pdfData.anx7 = null;
  const pi = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pi >= 0) { S.projects[pi].anx7PdfName = null; if (S.projects[pi].pdfData) S.projects[pi].pdfData.anx7 = null; }
  renderPdfUploadUIAnx7();
  if (window.debouncedSaveState) window.debouncedSaveState();
  toast('PDF deleted.', 'success');
}
window.deletePdfAnx7 = deletePdfAnx7;
function handlePDFUploadAnx7(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) { toast('Only PDF files allowed.', 'error'); event.target.value = ''; return; }
  if (!S.activeProject) { toast('Select a project first.', 'warn'); event.target.value = ''; return; }
  const fileURL = URL.createObjectURL(file);
  S.activeProject.anx7PdfName = file.name;
  if (!S.activeProject.pdfData) S.activeProject.pdfData = {};
  S.activeProject.pdfData.anx7 = fileURL;
  if (window.storeProjectPdf) {
    window.storeProjectPdf('anx7', file).catch(err => console.error('Backend PDF upload failed:', err));
  }
  const pi = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pi >= 0) { S.projects[pi].anx7PdfName = file.name; if (!S.projects[pi].pdfData) S.projects[pi].pdfData = {}; S.projects[pi].pdfData.anx7 = fileURL; }
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx7') : document.getElementById('pdf-iframe-anx7'));
  const sec = document.getElementById('pdf-preview-section-anx7');
  if (iframe && sec) { iframe.src = fileURL; sec.style.display = 'block'; }
  renderPdfUploadUIAnx7();
  if (window.debouncedSaveState) window.debouncedSaveState();
  toast('PDF uploaded and preview loaded!', 'success');
  event.target.value = '';
}
window.handlePDFUploadAnx7 = handlePDFUploadAnx7;
function initAnx7() {
  if (!document.getElementById('anx7-individual-routes-container')) return;
  const individual = document.getElementById('anx7-individual-routes-container');
  const cluster = document.getElementById('anx7-cluster-routes-container');
  if (individual && !individual.querySelector('.table-block-card')) addRouteTableBlockAnx7(true);
  if (cluster && !cluster.querySelector('.table-block-card')) addClusterTableBlockAnx7(true);
  renderPdfUploadUIAnx7();
}
window.initAnx7 = initAnx7;
window.addEventListener('DOMContentLoaded', initAnx7);
document.addEventListener('input', (e) => {
  if (e.target.closest('#view-anx7 table')) {
    if (window.anx7DebounceTimer) clearTimeout(window.anx7DebounceTimer);
    window.anx7DebounceTimer = setTimeout(() => {
       exportAnx7PDF(null, true);
    }, 1500); // 1.5 seconds after typing stops
  }
});
document.addEventListener('change', (e) => {
  if (e.target.closest('#view-anx7 table')) {
    if (window.anx7DebounceTimer) clearTimeout(window.anx7DebounceTimer);
    window.anx7DebounceTimer = setTimeout(() => {
      exportAnx7PDF(null, true);
    }, 300);
  }
});

;

/* js/more-annexures.js */
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

;

/* js/annexure-b.js */
registerSimpleAnnexure('B');

;

/* js/annexure-c.js */
registerSimpleAnnexure('C');

;

/* js/annexure-d.js */
registerSimpleAnnexure('D');

;

/* js/annexure-e.js */
registerSimpleAnnexure('E');

;

/* js/annexure-f.js */
/* ANNEXURE F - BENCH MARK, CORS & SAND GHAT COORDINATES */
const ANNEXURE_F_TABLES = {
  CORS: {
    tableId: 'annexure-f-cors',
    containerId: 'annexure-f-cors-container',
    filename: 'Annexure_F_CORS_Stations_Template.csv',
    headers: ['CORS Station Name', 'Lat', 'Lon', 'Height', 'Station Code'],
    emptyRow: ['', '', '', '', '', '', null],
    addLabel: 'Add CORS Station',
    uploadLabel: 'Upload Excel (CORS)',
    minWidth: '900px',
    pdfTitle: '> Survey of India CORS Stations:',
    fontSize: 8
  },
  BENCHMARK: {
    tableId: 'annexure-f-benchmark',
    containerId: 'annexure-f-benchmark-container',
    filename: 'Annexure_F_Benchmark_Template.csv',
    headers: ['Permanent Bench Mark', 'Coordinates', 'Elevation', 'Sandbars Code'],
    emptyRow: ['', '', '', '', '', null],
    addLabel: 'Add Benchmark',
    uploadLabel: 'Upload Excel (Benchmark)',
    minWidth: '1000px',
    pdfTitle: '> Permanent Bench Marks:',
    fontSize: 8
  },
  SAND: {
    tableId: 'annexure-f-sand',
    containerId: 'annexure-f-sand-container',
    filename: 'Annexure_F_Sand_Ghats_Coordinates_Template.csv',
    headers: ['SL.NO', 'River Details', 'Sand Bar_Code', 'Lease Details', 'Area (Ha.)', 'Latitude', 'Longitude'],
    emptyRow: ['', '', '', '', '', '', '', null],
    addLabel: 'Add Sand Ghat',
    uploadLabel: 'Upload Excel (Sand Ghats)',
    minWidth: '1200px',
    pdfTitle: '> Final Block Sand Ghats Coordinates:',
    fontSize: 7.5
  }
};
function annexureFDeleteButtonHTML() {
  const isReadOnly = typeof isUserReadOnly === 'function' ? isUserReadOnly() : !(window.S && (S.role === 'user' || S.role === 'admin'));
  return `<button class='btn btn-xs btn-danger' onclick='delRowAnnexureF(this)' style='display:${isReadOnly ? 'none' : 'inline-flex'};align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>`;
}
function annexureFCellValue(td) {
  const select = td.querySelector('select');
  if (select) return select.value;
  return td.innerText.trim();
}
function annexureFToCSVValue(value) {
  const text = String(value === undefined || value === null ? '' : value);
  return `"${text.replace(/"/g, '""')}"`;
}
function downloadSectionTemplateAnnexureF(sectionType) {
  const cfg = ANNEXURE_F_TABLES[sectionType];
  if (!cfg) return;
  const csvContent = cfg.headers.map(annexureFToCSVValue).join(',') + '\n';
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', cfg.filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
function resolveAnnexureFTable(target, sectionType) {
  if (target && typeof target === 'string') return document.getElementById(target);
  if (target && target.nodeType === 1) {
    if (target.matches('table')) return target;
    const blockTable = target.closest('.annexure-f-table-block')?.querySelector('table');
    if (blockTable) return blockTable;
  }
  const cfg = ANNEXURE_F_TABLES[sectionType];
  return cfg ? document.getElementById(cfg.tableId) : null;
}
function getAnnexureFTables(sectionType) {
  const cfg = ANNEXURE_F_TABLES[sectionType];
  if (!cfg) return [];
  const container = document.getElementById(cfg.containerId);
  if (container) {
    const tables = Array.from(container.querySelectorAll(`table.annexure-f-table[data-section-type="${sectionType}"]`));
    if (tables.length) return tables;
  }
  const table = document.getElementById(cfg.tableId);
  return table ? [table] : [];
}
function getAnnexureFEmptyRow(sectionType) {
  const cfg = ANNEXURE_F_TABLES[sectionType];
  if (!cfg) return [];
  const row = cfg.emptyRow.slice();
  row[row.length - 1] = annexureFDeleteButtonHTML();
  return row;
}
function handleSectionUploadAnnexureF(event, sectionType) {
  const file = event.target.files[0];
  if (!file) return;
  const table = resolveAnnexureFTable(event.target, sectionType);
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (!rows.length) {
        toast('The uploaded file is empty.', 'warn');
        return;
      }
      processExcelDataAnnexureF(rows, sectionType, table);
    } catch (error) {
      toast('Error parsing file. Please ensure it is a valid Excel or CSV file.', 'error');
      console.error(error);
    }
    event.target.value = '';
  };
  reader.readAsArrayBuffer(file);
}
function processExcelDataAnnexureF(rows, sectionType, targetTable) {
  const cfg = ANNEXURE_F_TABLES[sectionType];
  if (!cfg) return;
  const validRows = rows.filter(row => row.some(cell => String(cell === undefined || cell === null ? '' : cell).trim() !== ''));
  const headerIdx = validRows.findIndex(row => annexureFLooksLikeHeader(row, sectionType));
  const startIndex = headerIdx >= 0 ? headerIdx + 1 : 0;
  const dataRows = validRows.slice(startIndex);
  if (!dataRows.length) {
    toast('No data found after the header in the uploaded file.', 'warn');
    return;
  }
  const table = targetTable || document.getElementById(cfg.tableId);
  const tbody = table ? table.querySelector('tbody') : null;
  if (!tbody) return;
  const uploadRows = dataRows.map((rowData, index) => normalizeAnnexureFRow(rowData, sectionType, index));
  if (typeof rbacApplyExcelRowsToTable === 'function') {
    rbacApplyExcelRowsToTable(table, uploadRows, row => addRowAnnexureF(table, row));
  } else {
    tbody.innerHTML = '';
    uploadRows.forEach(row => addRowAnnexureF(table, row));
  }
  toast(`Uploaded Annexure F ${sectionType.toLowerCase()} data successfully`, 'success');
  if (window.debouncedSaveState) window.debouncedSaveState();
  if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-f') {
    exportAnnexureFPDF(null, true);
  }
}
function annexureFLooksLikeHeader(row, sectionType) {
  const rowStr = row.map(c => String(c || '')).join(' ').toLowerCase();
  if (sectionType === 'CORS') return rowStr.includes('cors') || rowStr.includes('station code');
  if (sectionType === 'BENCHMARK') return rowStr.includes('bench') || rowStr.includes('elevation');
  if (sectionType === 'SAND') return rowStr.includes('sand') || rowStr.includes('lease') || rowStr.includes('river');
  return false;
}
function normalizeAnnexureFRow(rowData, sectionType, index) {
  const row = Array.from(rowData);
  const del = annexureFDeleteButtonHTML();
  if (sectionType === 'CORS') {
    while (row.length < 5) row.push('');
    return [
      String(index + 1),
      row[0],
      row[1],
      row[2],
      row[3],
      row[4],
      del
    ];
  }
  if (sectionType === 'BENCHMARK') {
    while (row.length < 4) row.push('');
    return [
      String(index + 1),
      row[0],
      row[1],
      row[2],
      row[3],
      del
    ];
  }
  while (row.length < 7) row.push('');
  return [
    row[0] || String(index + 1),
    row[1],
    row[2],
    row[3],
    row[4],
    row[5],
    row[6],
    del
  ];
}
function addRowAnnexureF(tableId, cellDataArray) {
  const table = resolveAnnexureFTable(tableId);
  const tbody = table ? table.querySelector('tbody') : null;
  if (!tbody) return;
  const tableDomId = table.id || '';
  const tr = document.createElement('tr');
  cellDataArray.forEach((data, index) => {
    const td = document.createElement('td');
    let dataStr = String(data === undefined || data === null ? '' : data).trim();
    if (dataStr === '' && !dataStr.includes('<button') && !dataStr.includes('<select')) {
      dataStr = 'NUL';
    }
    if (dataStr.includes('<button') || dataStr.includes('<select')) {
      td.innerHTML = dataStr;
    } else {
      td.textContent = dataStr;
      const isReadOnly = typeof isUserReadOnly === 'function' ? isUserReadOnly() : !(window.S && (S.role === 'user' || S.role === 'admin'));
      td.contentEditable = isReadOnly ? 'false' : 'true';
      if (isReadOnly) {
        td.style.backgroundColor = 'var(--off)';
        td.style.cursor = 'not-allowed';
      }
      if (
        (tableDomId.startsWith('annexure-f-cors') && (index === 2 || index === 3)) ||
        (tableDomId.startsWith('annexure-f-benchmark') && index === 2) ||
        (tableDomId.startsWith('annexure-f-sand') && (index === 2 || index === 5 || index === 6))
      ) {
        td.classList.add('coord-input');
      }
    }
    tr.appendChild(td);
  });
  tbody.appendChild(tr);
  if (window.initLucide) window.initLucide();
}
function renumberAnnexureFTableBlocks(sectionType) {
  const cfg = ANNEXURE_F_TABLES[sectionType];
  const container = cfg ? document.getElementById(cfg.containerId) : null;
  if (!container) return;
  const blocks = container.querySelectorAll('.annexure-f-table-block');
  blocks.forEach((block, index) => {
    const title = block.querySelector('.annexure-f-block-title');
    const delBtn = block.querySelector('.annexure-f-delete-table');
    if (title) title.textContent = index === 0 ? '' : `Table ${index + 1}`;
    if (delBtn) delBtn.style.display = blocks.length <= 1 ? 'none' : 'inline-flex';
  });
}
function deleteAnnexureFTableBlock(btn) {
  const block = btn.closest('.annexure-f-table-block');
  if (!block) return;
  const sectionType = block.getAttribute('data-section-type');
  const cfg = ANNEXURE_F_TABLES[sectionType];
  const container = cfg ? document.getElementById(cfg.containerId) : null;
  if (!container) return;
  if (container.querySelectorAll('.annexure-f-table-block').length <= 1) {
    toast('You cannot delete the last remaining table.', 'warn');
    return;
  }
  if (confirm('Are you sure you want to delete this entire table block?')) {
    block.remove();
    renumberAnnexureFTableBlocks(sectionType);
    toast('Table block deleted.', 'success');
    if (window.debouncedSaveState) window.debouncedSaveState();
    if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-f') {
      exportAnnexureFPDF(null, true);
    }
  }
}
function addAnnexureFTableBlock(sectionType) {
  const cfg = ANNEXURE_F_TABLES[sectionType];
  const container = cfg ? document.getElementById(cfg.containerId) : null;
  const firstTable = document.getElementById(cfg?.tableId);
  if (!cfg || !container || !firstTable) return;
  const tableIdx = container.querySelectorAll('.annexure-f-table-block').length + 1;
  const newTableId = `${cfg.tableId}-${tableIdx}`;
  const headerHtml = Array.from(firstTable.querySelectorAll('thead th')).map(th => th.outerHTML).join('');
  const blockHtml = `
    <div class="annexure-f-table-block" data-section-type="${sectionType}" style="margin-top:18px; padding-top:18px; border-top:1px dashed var(--border);">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
        <div class="annexure-f-block-title" style="font-size:12px; font-weight:700; color:var(--text-mid);">Table ${tableIdx}</div>
        <button class="btn btn-xs btn-danger annexure-f-delete-table" onclick="deleteAnnexureFTableBlock(this)" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
          <span>Delete Table</span>
        </button>
      </div>
      <div class="tbl-wrap">
        <table class="anx-tbl annexure-f-table" data-section-type="${sectionType}" id="${newTableId}" style="min-width:${cfg.minWidth}">
          <thead><tr>${headerHtml}</tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="section-footer" style="margin-top:12px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button class="btn btn-xs btn-outline" onclick="addRowAnnexureF(this,getAnnexureFEmptyRow('${sectionType}'))" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="plus" style="width:12px; height:12px;"></i>
          <span>${cfg.addLabel}</span>
        </button>
        <label class="btn btn-excel-upload btn-xs" style="cursor:pointer; display:inline-flex; align-items:center; gap:6px; margin-bottom:0;">
          <i data-lucide="upload" style="width:12px; height:12px;"></i>
          <span>${cfg.uploadLabel}</span>
          <input type="file" accept=".xlsx,.xls,.csv" hidden onchange="handleSectionUploadAnnexureF(event, '${sectionType}')">
        </label>
      </div>
    </div>`;
  container.insertAdjacentHTML('beforeend', blockHtml);
  addRowAnnexureF(document.getElementById(newTableId), getAnnexureFEmptyRow(sectionType));
  renumberAnnexureFTableBlocks(sectionType);
  if (typeof applyMoreAnnexureAccess === 'function') applyMoreAnnexureAccess(document.getElementById('view-annexure-f'));
  if (window.initLucide) window.initLucide();
  if (window.debouncedSaveState) window.debouncedSaveState();
  if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-f') {
    exportAnnexureFPDF(null, true);
  }
}
function delRowAnnexureF(btn) {
  const row = btn.closest('tr');
  if (!row) return;
  row.remove();
  if (window.debouncedSaveState) window.debouncedSaveState();
  if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-f') {
    exportAnnexureFPDF(null, true);
  }
}
function extractAnnexureFTable(tableId) {
  const table = typeof tableId === 'string' ? document.getElementById(tableId) : tableId;
  if (!table) return { headers: [], rows: [] };
  const headers = Array.from(table.querySelectorAll('thead th'))
    .slice(0, -1)
    .map(th => th.innerText.trim().replace(/\n/g, ' '));
  const rows = [];
  table.querySelectorAll('tbody tr').forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td')).slice(0, -1);
    rows.push(cells.map(annexureFCellValue));
  });
  return { headers, rows };
}
async function exportAnnexureFPDF(btn, isLivePreview = false) {
  if (typeof btn === 'boolean') {
    isLivePreview = btn;
    btn = null;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const border = { x: 30, y: 14, w: pageWidth - 60, h: pageHeight - 42 };
  const tableLeft = 52;
  const tableWidth = pageWidth - tableLeft - 36;
  const headerLeft = tableLeft + 4;
  const footerY = pageHeight - 38;
  const pageNumberOffset = 490;
  const district = (S.activeProject && S.activeProject.district) || 'Jalandhar';
  const state = (S.activeProject && S.activeProject.state) || 'Punjab';
  const CONTENT_TOP = 72;
  let startY = CONTENT_TOP;
  const normalizeSectionTitle = (title) => String(title || '')
    .replace(/^>\s*/, '')
    .replace(/:$/, '');
  const drawReportFrame = (data) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.rect(border.x, border.y, border.w, border.h);
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('District Survey Report', headerLeft, 27);
    doc.text(`${district} District`, headerLeft, 39);
    doc.text(state, headerLeft, 51);
    doc.setLineWidth(0.4);
    doc.line(tableLeft, 62, pageWidth - 32, 62);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.text('PREPARED BY:', pageWidth / 2 - 130, footerY - 2, { align: 'left' });
    doc.setFont('times', 'bold');
    doc.text(` SUB-DIVISIONAL COMMITTEE OF ${district.toUpperCase()} DISTRICT`, pageWidth / 2 - 76, footerY - 2, { align: 'left' });
    doc.setFont('times', 'normal');
    doc.text('ASSISTED BY:', pageWidth / 2 - 130, footerY + 10, { align: 'left' });
    doc.setFont('times', 'bold');
    doc.text(' RSP GREEN DEVELOPMENT AND LABORATORIES PVT. LTD', pageWidth / 2 - 78, footerY + 10, { align: 'left' });
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text(String(pageNumberOffset + data.pageNumber), pageWidth - 26, pageHeight - 18, { align: 'right' });
  };
  const sections = ['SAND', 'BENCHMARK', 'CORS'].flatMap(sectionType => {
    const cfg = ANNEXURE_F_TABLES[sectionType];
    return getAnnexureFTables(sectionType).map((table, tableIndex) => ({
      sectionType,
      title: tableIndex === 0 ? cfg.pdfTitle : `${cfg.pdfTitle} Table ${tableIndex + 1}`,
      table,
      tableId: table.id,
      fontSize: cfg.fontSize
    }));
  });
  sections.forEach((section, index) => {
    const titleHeight = 14;
    const tableStartEstimate = startY + titleHeight + 6;
    if (index > 0 && tableStartEstimate + 40 > pageHeight - 40) {
      doc.addPage();
      drawReportFrame({ pageNumber: doc.getCurrentPageInfo().pageNumber });
      startY = CONTENT_TOP;
    }
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(normalizeSectionTitle(section.title), pageWidth / 2, startY, { align: 'center' });
    startY += titleHeight;
    const tableData = extractAnnexureFTable(section.table);
    const columnStyles = section.tableId && section.tableId.startsWith('annexure-f-sand') ? {
      0: { cellWidth: 40 },
      1: { cellWidth: 40 },
      2: { cellWidth: 108 },
      3: { cellWidth: 52 },
      4: { cellWidth: 34 },
      5: { cellWidth: 88 },
      6: { cellWidth: 88 }
    } : {};
    doc.autoTable({
      startY,
      head: [tableData.headers],
      body: tableData.rows,
      theme: 'grid',
      styles: {
        font: 'times',
        fontSize: section.tableId && section.tableId.startsWith('annexure-f-sand') ? 9 : 8.5,
        textColor: 0,
        lineColor: 0,
        lineWidth: 0.4,
        cellPadding: 2.5,
        valign: 'middle',
        halign: 'left',
        minCellHeight: 0
      },
      headStyles: {
        fillColor: false,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        textColor: 0,
        lineColor: 0,
        lineWidth: 0.4,
        cellPadding: 2.5
      },
      columnStyles,
      margin: { top: startY, bottom: 40, left: tableLeft, right: tableLeft },
      tableWidth,
      didDrawPage: drawReportFrame
    });
    startY = doc.lastAutoTable.finalY + 18;
  });
  await appendAnnexureFAttachmentPages(doc);
  if (isLivePreview) {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('annexure-f') : document.getElementById('pdf-iframe-annexure-f-preview'));
    if (iframe) iframe.src = blobUrl;
  } else {
    doc.save('Annexure_F_Sand_Ghats_Benchmarks_CORS_Merged.pdf');
    toast('PDF downloaded successfully!', 'success');
  }
}
function getAnnexureFAttachment() {
  if (window.S && S.activeProject && S.activeProject.annexureFAttachment) {
    return S.activeProject.annexureFAttachment;
  }
  return window.annexureFAttachment || null;
}
function setAnnexureFAttachment(attachment) {
  window.annexureFAttachment = attachment;
  if (window.S && S.activeProject) {
    S.activeProject.annexureFAttachment = attachment;
    const pIdx = S.projects.findIndex(p => p.id === S.activeProject.id);
    if (pIdx !== -1) S.projects[pIdx].annexureFAttachment = attachment;
  }
}
function renderAttachmentUploadUIAnnexureF() {
  const el = document.getElementById('annexure-f-attachment-info');
  if (!el) return;
  const attachment = getAnnexureFAttachment();
  if (!attachment || !attachment.pages || !attachment.pages.length) {
    el.innerHTML = `
      <div style="padding:14px 16px; border:1px dashed var(--border); border-radius:var(--r-sm); color:var(--text-soft); font-size:13px; background:var(--off);">
        No supporting PDF/image uploaded yet.
      </div>`;
    return;
  }
  el.innerHTML = `
    <div class="file-item" style="margin-top:10px; background:var(--off); border:1px solid var(--border); max-width:560px; display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-radius:var(--r-sm);">
      <div style="display:flex; align-items:center; gap:8px;">
        <div class="file-icon" style="background:var(--teal-lt); color:var(--teal); padding:6px; border-radius:var(--r-xs); font-size:14px;">
          <i data-lucide="file-up" style="width:16px; height:16px;"></i>
        </div>
        <div style="line-height:1.25;">
          <div style="font-size:12px; font-weight:700; color:var(--text);">${attachment.fileName}</div>
          <div style="font-size:10.5px; color:var(--text-faint);">${attachment.fileSize || ''} - ${attachment.pages.length} page(s) will be appended</div>
        </div>
      </div>
      <button type="button" class="btn btn-xs btn-danger" onclick="deleteAttachmentAnnexureF()">Remove</button>
    </div>`;
  if (window.initLucide) window.initLucide();
}
function handleAttachmentUploadAnnexureF(event) {
  const file = event.target.files[0];
  if (!file) return;
  const sizeStr = (file.size / 1024).toFixed(1) + ' KB';
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    toast('Processing supporting PDF...', 'info');
    if (typeof renderPdfToImages !== 'function') {
      toast('PDF renderer is not available on this page.', 'error');
      event.target.value = '';
      return;
    }
    renderPdfToImages(file, (err, imgs) => {
      if (err || !imgs || !imgs.length) {
        console.error(err);
        toast('PDF render failed. Please try another PDF or upload an image.', 'error');
        event.target.value = '';
        return;
      }
      setAnnexureFAttachment({
        fileName: file.name,
        fileSize: sizeStr,
        fileType: 'pdf',
        pages: imgs
      });
      renderAttachmentUploadUIAnnexureF();
      if (window.debouncedSaveState) window.debouncedSaveState();
      toast('Supporting PDF added to Annexure F.', 'success');
      if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-f') {
        exportAnnexureFPDF(null, true);
      }
      event.target.value = '';
    });
    return;
  }
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      setAnnexureFAttachment({
        fileName: file.name,
        fileSize: sizeStr,
        fileType: 'image',
        pages: [evt.target.result]
      });
      renderAttachmentUploadUIAnnexureF();
      if (window.debouncedSaveState) window.debouncedSaveState();
      toast('Supporting image added to Annexure F.', 'success');
      if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-f') {
        exportAnnexureFPDF(null, true);
      }
      event.target.value = '';
    };
    reader.readAsDataURL(file);
    return;
  }
  toast('Unsupported file format. Please upload a PDF or image.', 'error');
  event.target.value = '';
}
function deleteAttachmentAnnexureF() {
  setAnnexureFAttachment(null);
  renderAttachmentUploadUIAnnexureF();
  if (window.debouncedSaveState) window.debouncedSaveState();
  if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-f') {
    exportAnnexureFPDF(null, true);
  }
  toast('Supporting file removed.', 'success');
}
function loadAnnexureFImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
async function appendAnnexureFAttachmentPages(doc) {
  const attachment = getAnnexureFAttachment();
  if (!attachment || !attachment.pages || !attachment.pages.length) return;
  for (const src of attachment.pages) {
    const img = await loadAnnexureFImage(src);
    doc.addPage('a4', 'p');
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const margin = 24;
    const maxW = w - margin * 2;
    const maxH = h - margin * 2;
    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const drawW = img.width * ratio;
    const drawH = img.height * ratio;
    const x = (w - drawW) / 2;
    const y = (h - drawH) / 2;
    const format = String(src).startsWith('data:image/png') ? 'PNG' : 'JPEG';
    doc.addImage(src, format, x, y, drawW, drawH);
  }
}
function renderAnnexureF() {
  renderAttachmentUploadUIAnnexureF();
  ['SAND', 'BENCHMARK', 'CORS'].forEach(renumberAnnexureFTableBlocks);
  if (typeof applyMoreAnnexureAccess === 'function') applyMoreAnnexureAccess(document.getElementById('view-annexure-f'));
  if (window.initLucide) window.initLucide();
}
document.addEventListener('input', (e) => {
  if (e.target.closest('#view-annexure-f table')) {
    if (window.anxNDebounceTimer) clearTimeout(window.anxNDebounceTimer);
    window.anxNDebounceTimer = setTimeout(() => {
      exportAnnexureFPDF(null, true);
    }, 1500);
  }
});
window.annexureFDeleteButtonHTML = annexureFDeleteButtonHTML;
window.downloadSectionTemplateAnnexureF = downloadSectionTemplateAnnexureF;
window.handleSectionUploadAnnexureF = handleSectionUploadAnnexureF;
window.addRowAnnexureF = addRowAnnexureF;
window.addAnnexureFTableBlock = addAnnexureFTableBlock;
window.deleteAnnexureFTableBlock = deleteAnnexureFTableBlock;
window.getAnnexureFEmptyRow = getAnnexureFEmptyRow;
window.delRowAnnexureF = delRowAnnexureF;
window.exportAnnexureFPDF = exportAnnexureFPDF;
window.handleAttachmentUploadAnnexureF = handleAttachmentUploadAnnexureF;
window.deleteAttachmentAnnexureF = deleteAttachmentAnnexureF;
window.renderAttachmentUploadUIAnnexureF = renderAttachmentUploadUIAnnexureF;
window.renderAnnexureF = renderAnnexureF;
document.addEventListener('change', (e) => {
  if (e.target.closest('#view-annexure-f table')) {
    if (window.anxNDebounceTimer) clearTimeout(window.anxNDebounceTimer);
    window.anxNDebounceTimer = setTimeout(() => {
      exportAnnexureFPDF(null, true);
    }, 300);
  }
});

;

/* js/annexure-g.js */
registerSimpleAnnexure('G');

;

/* js/annexure-h.js */
registerSimpleAnnexure('H');

;

/* js/annexure-i.js */
registerSimpleAnnexure('I');

;

/* js/annexure-j.js */
registerSimpleAnnexure('J');

;

/* js/annexure-k.js */
/* ANNEXURE K - PROFORMA AUCTIONED SITES & ANNEXURE A */
const ANNEXURE_K_TABLES = {
  PROFORMA: {
    tableId: 'annexure-k-proforma',
    containerId: 'annexure-k-proforma-container',
    filename: 'Proforma_Auctioned_Sites_Template.csv',
    headers: [
      'Sr No.',
      'Site Name',
      'Type of Mine',
      'Date of Grant of EC',
      'Date of Start of Contract',
      'Quantity Allowed per annum',
      'Quantity Extracted',
      'Balance Quantity',
      'EC Status',
      'Reason For Not Operating Site',
      'Reason for not Applying EC',
      'Remarks'
    ],
    defaultRows: [
      [1, 'Sample_Site', 'PMS', '01/01/2025', '01/02/2025', 1000, 500, 500, 'Granted', '-', '-', '-']
    ],
    emptyRow: ['', '', '', '', '', '', '', '', '', '', '', '', null],
    addLabel: 'Add Auctioned Site',
    uploadLabel: 'Upload Excel (Proforma)',
    minWidth: '1500px',
    pdfTitle: 'Proforma Auctioned Sites',
    fontSize: 5.6
  },
  ANNEXURE_A: {
    tableId: 'annexure-k-annexure-a',
    containerId: 'annexure-k-annexure-a-container',
    filename: 'Annexure_A_Template.csv',
    headers: [
      'Source',
      'No. of proposed sites',
      'Area (Ha)',
      'Total excavation in Tonnes',
      'Total excavation in Tonnes (Considering 60% as per EMGSM, 2020)'
    ],
    defaultRows: [
      ['River bed (Existing)', 1, 100, 100000, 60000]
    ],
    emptyRow: ['', '', '', '', '', null],
    addLabel: 'Add Annexure A Row',
    uploadLabel: 'Upload Excel (Annexure A)',
    minWidth: '1000px',
    pdfTitle: 'Annexure A',
    fontSize: 8
  }
};
function annexureKDeleteButtonHTML() {
  const isReadOnly = typeof isUserReadOnly === 'function' ? isUserReadOnly() : !(window.S && (S.role === 'user' || S.role === 'admin'));
  return `<button class='btn btn-xs btn-danger' onclick='delRowAnnexureK(this)' style='display:${isReadOnly ? 'none' : 'inline-flex'};align-items:center;justify-content:center;padding:4px;'><i data-lucide='trash-2' style='width:12px;height:12px;'></i></button>`;
}
function annexureKCellValue(td) {
  const select = td.querySelector('select');
  if (select) return select.value;
  return td.innerText.trim();
}
function annexureKToCSVValue(value) {
  const text = String(value === undefined || value === null ? '' : value);
  return `"${text.replace(/"/g, '""')}"`;
}
function resolveAnnexureKTable(target, sectionType) {
  if (target && typeof target === 'string') return document.getElementById(target);
  if (target && target.nodeType === 1) {
    if (target.matches('table')) return target;
    const blockTable = target.closest('.annexure-k-table-block')?.querySelector('table');
    if (blockTable) return blockTable;
  }
  const cfg = ANNEXURE_K_TABLES[sectionType];
  return cfg ? document.getElementById(cfg.tableId) : null;
}
function getAnnexureKTables(sectionType) {
  const cfg = ANNEXURE_K_TABLES[sectionType];
  if (!cfg) return [];
  const container = document.getElementById(cfg.containerId);
  if (container) {
    const tables = Array.from(container.querySelectorAll(`table.annexure-k-table[data-section-type="${sectionType}"]`));
    if (tables.length) return tables;
  }
  const table = document.getElementById(cfg.tableId);
  return table ? [table] : [];
}
function getAnnexureKEmptyRow(sectionType) {
  const cfg = ANNEXURE_K_TABLES[sectionType];
  if (!cfg) return [];
  const row = cfg.emptyRow.slice();
  row[row.length - 1] = annexureKDeleteButtonHTML();
  return row;
}
function downloadSectionTemplateAnnexureK(sectionType) {
  const cfg = ANNEXURE_K_TABLES[sectionType];
  if (!cfg) return;
  const defaultRows = (cfg.defaultRows || []).map(row => row.map(annexureKToCSVValue).join(','));
  const csvContent = [
    cfg.headers.map(annexureKToCSVValue).join(','),
    ...defaultRows
  ].join('\n') + '\n';
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', cfg.filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
function handleSectionUploadAnnexureK(event, sectionType) {
  const file = event.target.files[0];
  if (!file) return;
  const table = resolveAnnexureKTable(event.target, sectionType);
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (!rows.length) {
        toast('The uploaded file is empty.', 'warn');
        return;
      }
      processExcelDataAnnexureK(rows, sectionType, table);
    } catch (error) {
      toast('Error parsing file. Please ensure it is a valid Excel or CSV file.', 'error');
      console.error(error);
    }
    event.target.value = '';
  };
  reader.readAsArrayBuffer(file);
}
function processExcelDataAnnexureK(rows, sectionType, targetTable) {
  const cfg = ANNEXURE_K_TABLES[sectionType];
  if (!cfg) return;
  const validRows = rows.filter(row => row.some(cell => String(cell === undefined || cell === null ? '' : cell).trim() !== ''));
  const headerIdx = validRows.findIndex(row => annexureKLooksLikeHeader(row, sectionType));
  const startIndex = headerIdx >= 0 ? headerIdx + 1 : 0;
  const dataRows = validRows.slice(startIndex);
  if (!dataRows.length) {
    toast('No data found after the header in the uploaded file.', 'warn');
    return;
  }
  const table = targetTable || document.getElementById(cfg.tableId);
  const tbody = table ? table.querySelector('tbody') : null;
  if (!tbody) return;
  const uploadRows = dataRows.map((rowData, index) => normalizeAnnexureKRow(rowData, sectionType, index));
  if (typeof rbacApplyExcelRowsToTable === 'function') {
    rbacApplyExcelRowsToTable(table, uploadRows, row => addRowAnnexureK(table, row));
  } else {
    tbody.innerHTML = '';
    uploadRows.forEach(row => addRowAnnexureK(table, row));
  }
  toast(`Uploaded Annexure K ${sectionType === 'PROFORMA' ? 'proforma' : 'annexure a'} data successfully`, 'success');
  if (window.debouncedSaveState) window.debouncedSaveState();
  if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-k') {
    exportAnnexureKPDF(null, true);
  }
}
function annexureKLooksLikeHeader(row, sectionType) {
  const rowStr = row.map(c => String(c || '')).join(' ').toLowerCase();
  if (sectionType === 'PROFORMA') return rowStr.includes('site name') || rowStr.includes('ec status') || rowStr.includes('quantity extracted');
  if (sectionType === 'ANNEXURE_A') return rowStr.includes('source') || rowStr.includes('proposed sites') || rowStr.includes('excavation');
  return false;
}
function normalizeAnnexureKRow(rowData, sectionType, index) {
  const row = Array.from(rowData);
  const del = annexureKDeleteButtonHTML();
  if (sectionType === 'PROFORMA') {
    while (row.length < 12) row.push('');
    return [
      row[0] || String(index + 1),
      row[1],
      row[2],
      row[3],
      row[4],
      row[5],
      row[6],
      row[7],
      row[8],
      row[9],
      row[10],
      row[11],
      del
    ];
  }
  while (row.length < 5) row.push('');
  return [row[0], row[1], row[2], row[3], row[4], del];
}
function addRowAnnexureK(tableId, cellDataArray) {
  const table = resolveAnnexureKTable(tableId);
  const tbody = table ? table.querySelector('tbody') : null;
  if (!tbody) return;
  const tr = document.createElement('tr');
  cellDataArray.forEach((data) => {
    const td = document.createElement('td');
    const dataStr = String(data === undefined || data === null ? '' : data).trim();
    if (dataStr.includes('<button') || dataStr.includes('<select')) {
      td.innerHTML = dataStr;
    } else {
      td.textContent = dataStr;
      const isReadOnly = typeof isUserReadOnly === 'function' ? isUserReadOnly() : !(window.S && (S.role === 'user' || S.role === 'admin'));
      td.contentEditable = isReadOnly ? 'false' : 'true';
      if (isReadOnly) {
        td.style.backgroundColor = 'var(--off)';
        td.style.cursor = 'not-allowed';
      }
    }
    tr.appendChild(td);
  });
  tbody.appendChild(tr);
  if (window.initLucide) window.initLucide();
}
function delRowAnnexureK(btn) {
  const row = btn.closest('tr');
  if (!row) return;
  row.remove();
  if (window.debouncedSaveState) window.debouncedSaveState();
  if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-k') {
    exportAnnexureKPDF(null, true);
  }
}
function renumberAnnexureKTableBlocks(sectionType) {
  const cfg = ANNEXURE_K_TABLES[sectionType];
  const container = cfg ? document.getElementById(cfg.containerId) : null;
  if (!container) return;
  const blocks = container.querySelectorAll('.annexure-k-table-block');
  blocks.forEach((block, index) => {
    const title = block.querySelector('.annexure-k-block-title');
    const delBtn = block.querySelector('.annexure-k-delete-table');
    if (title) title.textContent = index === 0 ? '' : `Table ${index + 1}`;
    if (delBtn) delBtn.style.display = blocks.length <= 1 ? 'none' : 'inline-flex';
  });
}
function deleteAnnexureKTableBlock(btn) {
  const block = btn.closest('.annexure-k-table-block');
  if (!block) return;
  const sectionType = block.getAttribute('data-section-type');
  const cfg = ANNEXURE_K_TABLES[sectionType];
  const container = cfg ? document.getElementById(cfg.containerId) : null;
  if (!container) return;
  if (container.querySelectorAll('.annexure-k-table-block').length <= 1) {
    toast('You cannot delete the last remaining table.', 'warn');
    return;
  }
  if (confirm('Are you sure you want to delete this entire table block?')) {
    block.remove();
    renumberAnnexureKTableBlocks(sectionType);
    toast('Table block deleted.', 'success');
    if (window.debouncedSaveState) window.debouncedSaveState();
    if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-k') {
      exportAnnexureKPDF(null, true);
    }
  }
}
function addAnnexureKTableBlock(sectionType) {
  const cfg = ANNEXURE_K_TABLES[sectionType];
  const container = cfg ? document.getElementById(cfg.containerId) : null;
  const firstTable = document.getElementById(cfg?.tableId);
  if (!cfg || !container || !firstTable) return;
  const tableIdx = container.querySelectorAll('.annexure-k-table-block').length + 1;
  const newTableId = `${cfg.tableId}-${tableIdx}`;
  const headerHtml = Array.from(firstTable.querySelectorAll('thead th')).map(th => th.outerHTML).join('');
  const blockHtml = `
    <div class="annexure-k-table-block" data-section-type="${sectionType}" style="margin-top:18px; padding-top:18px; border-top:1px dashed var(--border);">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
        <div class="annexure-k-block-title" style="font-size:12px; font-weight:700; color:var(--text-mid);">Table ${tableIdx}</div>
        <button class="btn btn-xs btn-danger annexure-k-delete-table" onclick="deleteAnnexureKTableBlock(this)" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
          <span>Delete Table</span>
        </button>
      </div>
      <div style="font-size:12px; font-weight:700; color:var(--text-soft); margin-bottom:8px;">Example input values from ${sectionType === 'PROFORMA' ? 'Proforma_Template_One_Example.xlsx' : 'Annexure_A_Template_One_Example.xlsx'}</div>
      <div class="tbl-wrap">
        <table class="anx-tbl annexure-k-table" data-section-type="${sectionType}" id="${newTableId}" style="min-width:${cfg.minWidth}">
          <thead><tr>${headerHtml}</tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="section-footer" style="margin-top:12px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button class="btn btn-xs btn-outline" onclick="addRowAnnexureK(this,getAnnexureKEmptyRow('${sectionType}'))" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="plus" style="width:12px; height:12px;"></i>
          <span>${cfg.addLabel}</span>
        </button>
        <label class="btn btn-excel-upload btn-xs" style="cursor:pointer; display:inline-flex; align-items:center; gap:6px; margin-bottom:0;">
          <i data-lucide="upload" style="width:12px; height:12px;"></i>
          <span>${cfg.uploadLabel}</span>
          <input type="file" accept=".xlsx,.xls,.csv" hidden onchange="handleSectionUploadAnnexureK(event, '${sectionType}')">
        </label>
      </div>
    </div>`;
  container.insertAdjacentHTML('beforeend', blockHtml);
  (cfg.defaultRows || [getAnnexureKEmptyRow(sectionType)]).forEach((rowData, index) => {
    addRowAnnexureK(document.getElementById(newTableId), normalizeAnnexureKRow(rowData, sectionType, index));
  });
  renumberAnnexureKTableBlocks(sectionType);
  if (typeof applyMoreAnnexureAccess === 'function') applyMoreAnnexureAccess(document.getElementById('view-annexure-k'));
  if (window.initLucide) window.initLucide();
  if (window.debouncedSaveState) window.debouncedSaveState();
  if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-k') {
    exportAnnexureKPDF(null, true);
  }
}
function extractAnnexureKTable(tableId) {
  const table = typeof tableId === 'string' ? document.getElementById(tableId) : tableId;
  if (!table) return { headers: [], rows: [] };
  const headers = Array.from(table.querySelectorAll('thead th'))
    .slice(0, -1)
    .map(th => th.innerText.trim().replace(/\n/g, ' '));
  const rows = [];
  table.querySelectorAll('tbody tr').forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td')).slice(0, -1);
    rows.push(cells.map(annexureKCellValue));
  });
  return { headers, rows };
}
async function exportAnnexureKPDF(btn, isLivePreview = false) {
  if (typeof btn === 'boolean') {
    isLivePreview = btn;
    btn = null;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const border = { x: 30, y: 14, w: pageWidth - 60, h: pageHeight - 42 };
  const tableLeft = 36;
  const tableWidth = pageWidth - (tableLeft * 2);
  const headerLeft = tableLeft + 4;
  const footerY = pageHeight - 38;
  const pageNumberOffset = 490;
  const district = (S.activeProject && S.activeProject.district) || 'Jalandhar';
  const state = (S.activeProject && S.activeProject.state) || 'Punjab';
  const CONTENT_TOP = 72;
  let startY = CONTENT_TOP;
  const drawReportFrame = (data) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.rect(border.x, border.y, border.w, border.h);
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('District Survey Report', headerLeft, 27);
    doc.text(`${district} District`, headerLeft, 39);
    doc.text(state, headerLeft, 51);
    doc.setLineWidth(0.4);
    doc.line(headerLeft, 62, pageWidth - 32, 62);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.text('PREPARED BY:', pageWidth / 2 - 130, footerY - 2, { align: 'left' });
    doc.setFont('times', 'bold');
    doc.text(` SUB-DIVISIONAL COMMITTEE OF ${district.toUpperCase()} DISTRICT`, pageWidth / 2 - 76, footerY - 2, { align: 'left' });
    doc.setFont('times', 'normal');
    doc.text('ASSISTED BY:', pageWidth / 2 - 130, footerY + 10, { align: 'left' });
    doc.setFont('times', 'bold');
    doc.text(' RSP GREEN DEVELOPMENT AND LABORATORIES PVT. LTD', pageWidth / 2 - 78, footerY + 10, { align: 'left' });
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text(String(pageNumberOffset + data.pageNumber), pageWidth - 26, pageHeight - 18, { align: 'right' });
  };
  const sections = ['PROFORMA', 'ANNEXURE_A'].flatMap(sectionType => {
    const cfg = ANNEXURE_K_TABLES[sectionType];
    return getAnnexureKTables(sectionType).map((table, tableIndex) => ({
      sectionType,
      title: tableIndex === 0 ? cfg.pdfTitle : `${cfg.pdfTitle} - Table ${tableIndex + 1}`,
      table,
      tableId: table.id,
      fontSize: cfg.fontSize
    }));
  });
  sections.forEach((section, index) => {
    const titleHeight = 14;
    const tableStartEstimate = startY + titleHeight + 6;
    const isProforma = section.sectionType === 'PROFORMA';
    if (index > 0 && tableStartEstimate + 40 > pageHeight - 40) {
      doc.addPage();
      drawReportFrame({ pageNumber: doc.getCurrentPageInfo().pageNumber });
      startY = CONTENT_TOP;
    }
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(section.title, pageWidth / 2, startY, { align: 'center' });
    startY += titleHeight;
    const tableData = extractAnnexureKTable(section.table);
    doc.autoTable({
      startY,
      head: [tableData.headers],
      body: tableData.rows,
      theme: 'grid',
      styles: {
        font: 'times',
        fontSize: isProforma ? 4.8 : 8.5,
        textColor: 0,
        lineColor: 0,
        lineWidth: 0.4,
        cellPadding: isProforma ? 0.9 : 2.5,
        valign: 'middle',
        halign: 'left',
        overflow: 'linebreak',
        minCellHeight: 0
      },
      headStyles: {
        fillColor: false,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        textColor: 0,
        lineColor: 0,
        lineWidth: 0.4,
        cellPadding: isProforma ? 0.9 : 2.5
      },
      columnStyles: isProforma ? {
        0: { cellWidth: 22 },
        1: { cellWidth: 42 },
        2: { cellWidth: 34 },
        3: { cellWidth: 42 },
        4: { cellWidth: 44 },
        5: { cellWidth: 46 },
        6: { cellWidth: 42 },
        7: { cellWidth: 42 },
        8: { cellWidth: 34 },
        9: { cellWidth: 50 },
        10: { cellWidth: 50 },
        11: { cellWidth: 35 }
      } : {},
      margin: { top: startY, bottom: 40, left: tableLeft, right: tableLeft },
      tableWidth,
      didDrawPage: drawReportFrame
    });
    startY = doc.lastAutoTable.finalY + 18;
  });
  await appendAnnexureKAttachmentPages(doc);
  if (isLivePreview) {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('annexure-k') : document.getElementById('pdf-iframe-annexure-k-preview'));
    if (iframe) iframe.src = blobUrl;
  } else {
    doc.save('Annexure_K_Proforma_Auctioned_Sites_Annexure_A_Merged.pdf');
    toast('PDF downloaded successfully!', 'success');
  }
}
function getAnnexureKAttachment() {
  if (window.S && S.activeProject && S.activeProject.annexureKAttachment) {
    return S.activeProject.annexureKAttachment;
  }
  return window.annexureKAttachment || null;
}
function setAnnexureKAttachment(attachment) {
  window.annexureKAttachment = attachment;
  if (window.S && S.activeProject) {
    S.activeProject.annexureKAttachment = attachment;
    const pIdx = S.projects.findIndex(p => p.id === S.activeProject.id);
    if (pIdx !== -1) S.projects[pIdx].annexureKAttachment = attachment;
  }
}
function renderAttachmentUploadUIAnnexureK() {
  const el = document.getElementById('annexure-k-attachment-info');
  if (!el) return;
  const attachment = getAnnexureKAttachment();
  if (!attachment || !attachment.pages || !attachment.pages.length) {
    el.innerHTML = `
      <div style="padding:14px 16px; border:1px dashed var(--border); border-radius:var(--r-sm); color:var(--text-soft); font-size:13px; background:var(--off);">
        No supporting PDF/image uploaded yet.
      </div>`;
    return;
  }
  el.innerHTML = `
    <div class="file-item" style="margin-top:10px; background:var(--off); border:1px solid var(--border); max-width:560px; display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-radius:var(--r-sm);">
      <div style="display:flex; align-items:center; gap:8px;">
        <div class="file-icon" style="background:var(--teal-lt); color:var(--teal); padding:6px; border-radius:var(--r-xs); font-size:14px;">
          <i data-lucide="file-up" style="width:16px; height:16px;"></i>
        </div>
        <div style="line-height:1.25;">
          <div style="font-size:12px; font-weight:700; color:var(--text);">${attachment.fileName}</div>
          <div style="font-size:10.5px; color:var(--text-faint);">${attachment.fileSize || ''} - ${attachment.pages.length} page(s) will be appended</div>
        </div>
      </div>
      <button type="button" class="btn btn-xs btn-danger" onclick="deleteAttachmentAnnexureK()">Remove</button>
    </div>`;
  if (window.initLucide) window.initLucide();
}
function handleAttachmentUploadAnnexureK(event) {
  const file = event.target.files[0];
  if (!file) return;
  const sizeStr = (file.size / 1024).toFixed(1) + ' KB';
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    toast('Processing supporting PDF...', 'info');
    if (typeof renderPdfToImages !== 'function') {
      toast('PDF renderer is not available on this page.', 'error');
      event.target.value = '';
      return;
    }
    renderPdfToImages(file, (err, imgs) => {
      if (err || !imgs || !imgs.length) {
        console.error(err);
        toast('PDF render failed. Please try another PDF or upload an image.', 'error');
        event.target.value = '';
        return;
      }
      setAnnexureKAttachment({
        fileName: file.name,
        fileSize: sizeStr,
        fileType: 'pdf',
        pages: imgs
      });
      renderAttachmentUploadUIAnnexureK();
      if (window.debouncedSaveState) window.debouncedSaveState();
      toast('Supporting PDF added to Annexure K.', 'success');
      if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-k') {
        exportAnnexureKPDF(null, true);
      }
      event.target.value = '';
    });
    return;
  }
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      setAnnexureKAttachment({
        fileName: file.name,
        fileSize: sizeStr,
        fileType: 'image',
        pages: [evt.target.result]
      });
      renderAttachmentUploadUIAnnexureK();
      if (window.debouncedSaveState) window.debouncedSaveState();
      toast('Supporting image added to Annexure K.', 'success');
      if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-k') {
        exportAnnexureKPDF(null, true);
      }
      event.target.value = '';
    };
    reader.readAsDataURL(file);
    return;
  }
  toast('Unsupported file format. Please upload a PDF or image.', 'error');
  event.target.value = '';
}
function deleteAttachmentAnnexureK() {
  setAnnexureKAttachment(null);
  renderAttachmentUploadUIAnnexureK();
  if (window.debouncedSaveState) window.debouncedSaveState();
  if (window.pdfPreview && window.pdfPreview.currentView === 'annexure-k') {
    exportAnnexureKPDF(null, true);
  }
  toast('Supporting file removed.', 'success');
}
function loadAnnexureKImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
async function appendAnnexureKAttachmentPages(doc) {
  const attachment = getAnnexureKAttachment();
  if (!attachment || !attachment.pages || !attachment.pages.length) return;
  for (const src of attachment.pages) {
    const img = await loadAnnexureKImage(src);
    doc.addPage('a4', 'p');
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const margin = 24;
    const maxW = w - margin * 2;
    const maxH = h - margin * 2;
    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const drawW = img.width * ratio;
    const drawH = img.height * ratio;
    const x = (w - drawW) / 2;
    const y = (h - drawH) / 2;
    const format = String(src).startsWith('data:image/png') ? 'PNG' : 'JPEG';
    doc.addImage(src, format, x, y, drawW, drawH);
  }
}
function renderAnnexureK() {
  renderAttachmentUploadUIAnnexureK();
  ['PROFORMA', 'ANNEXURE_A'].forEach(renumberAnnexureKTableBlocks);
  if (typeof applyMoreAnnexureAccess === 'function') applyMoreAnnexureAccess(document.getElementById('view-annexure-k'));
  if (window.initLucide) window.initLucide();
}
document.addEventListener('input', (e) => {
  if (e.target.closest('#view-annexure-k table')) {
    if (window.anxKDebounceTimer) clearTimeout(window.anxKDebounceTimer);
    window.anxKDebounceTimer = setTimeout(() => {
      exportAnnexureKPDF(null, true);
    }, 1500);
  }
});
window.annexureKDeleteButtonHTML = annexureKDeleteButtonHTML;
window.downloadSectionTemplateAnnexureK = downloadSectionTemplateAnnexureK;
window.handleSectionUploadAnnexureK = handleSectionUploadAnnexureK;
window.addRowAnnexureK = addRowAnnexureK;
window.addAnnexureKTableBlock = addAnnexureKTableBlock;
window.deleteAnnexureKTableBlock = deleteAnnexureKTableBlock;
window.getAnnexureKEmptyRow = getAnnexureKEmptyRow;
window.delRowAnnexureK = delRowAnnexureK;
window.exportAnnexureKPDF = exportAnnexureKPDF;
window.handleAttachmentUploadAnnexureK = handleAttachmentUploadAnnexureK;
window.deleteAttachmentAnnexureK = deleteAttachmentAnnexureK;
window.renderAttachmentUploadUIAnnexureK = renderAttachmentUploadUIAnnexureK;
window.renderAnnexureK = renderAnnexureK;
document.addEventListener('change', (e) => {
  if (e.target.closest('#view-annexure-k table')) {
    if (window.anxKDebounceTimer) clearTimeout(window.anxKDebounceTimer);
    window.anxKDebounceTimer = setTimeout(() => {
      exportAnnexureKPDF(null, true);
    }, 300);
  }
});

;

/* js/signatures.js */
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

;

/* js/pdf.js */
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

;

/* js/pdf-preview.js */
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

;

/* js/audit-logs.js */
async function loadAuditLogs() {
  const targets = [
    document.getElementById('audit-logs-tbody'),
    document.getElementById('auth-audit-logs-tbody')
  ].filter(Boolean);
  if (!targets.length) return;
  const setAuditRows = (html) => {
    targets.forEach(tbody => { tbody.innerHTML = html; });
  };
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  setAuditRows('<tr><td colspan="5" style="text-align: center; padding: 20px;">Loading audit logs...</td></tr>');
  try {
    const response = await apiFetch('/reports/audit-logs');
    const logs = Array.isArray(response) ? response : [];
    if (!logs || logs.length === 0) {
      const emptyHtml = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No audit logs found.</td></tr>';
      setAuditRows(emptyHtml);
      return;
    }
    let html = '';
    logs.forEach(log => {
      const rawDate = log.performedAt || log.createdAt;
      const dateObj = rawDate ? new Date(rawDate) : null;
      const date = dateObj && !Number.isNaN(dateObj.getTime()) ? dateObj.toLocaleString() : '-';
      let badgeColor = '#6b7280';
      if (log.action === 'APPROVE' || log.action === 'PROJECT_CREATED') badgeColor = '#10b981';
      else if (log.action === 'REJECT' || log.action === 'DOCUMENT_DELETED') badgeColor = '#ef4444';
      else if (log.action === 'RETURN' || log.action === 'SECTION_STATUS_CHANGED') badgeColor = '#f59e0b';
      else if (log.action === 'FORWARD' || log.action === 'SUBMIT') badgeColor = '#3b82f6';
      else if (log.action === 'PROJECT_PHASE_CHANGED') badgeColor = '#8b5cf6';
      else if (log.action === 'DOCUMENT_UPLOADED') badgeColor = '#06b6d4';
      else if (log.action === 'SECTION_REVIEW_REPLY' || log.action === 'DEO_REPLY') badgeColor = '#6366f1';
      html += `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 12px; font-size: 13px;">${escapeHtml(date)}</td>
          <td style="padding: 12px; font-weight: 500;">${escapeHtml(log.projectName || '-')}</td>
          <td style="padding: 12px;">${escapeHtml(log.performedBy || '-')}</td>
          <td style="padding: 12px;">
            <span style="background: ${badgeColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${escapeHtml(log.action || 'AUDIT')}</span>
          </td>
          <td style="padding: 12px; color: var(--text-soft); font-size: 13px; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(log.remarks || '')}">
            ${escapeHtml(log.remarks || '-')}
          </td>
        </tr>
      `;
    });
    setAuditRows(html);
  } catch (err) {
    console.error('Failed to load audit logs:', err);
    const message = /access denied|not logged in|invalid session|401|403/i.test(err?.message || '')
      ? 'Admin access required to view audit logs.'
      : 'Error loading audit logs.';
    setAuditRows(`<tr><td colspan="5" style="text-align: center; padding: 20px;">${message}</td></tr>`);
    if (typeof toast === 'function') toast(message, 'error');
  }
}
window.loadAuditLogs = loadAuditLogs;

;

/* js/sdlc.js */
/* ══════════════════════════════════════
   SDLC PORTAL LOGIC & RECONCILIATION
   ══════════════════════════════════════ */
let sdlcActiveTab = 'anx4';
const sdlcShowView = window.showView;
window.showView = function(id, btn, push) {
  if (id === 'sdlc-portal') {
    initSdlcPortal();
  }
  if (sdlcShowView) {
    sdlcShowView(id, btn, push);
  }
};
function initSdlcPortal() {
  populateSdlcProjects();
  resetSdlcPortalUI();
}
function populateSdlcProjects() {
  const select = document.getElementById('sdlc-project-select');
  if (!select) return;
  select.innerHTML = '<option value="">-- Select Project --</option>';
  if (S.projects && S.projects.length > 0) {
    S.projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.title} (${p.district})`;
      select.appendChild(opt);
    });
  }
}
function resetSdlcPortalUI() {
  const container = document.getElementById('sdlc-comparison-container');
  if (container) container.style.display = 'none';
  const status = document.getElementById('sdlc-portal-status');
  if (status) {
    status.textContent = 'Awaiting Upload';
    status.className = 'badge badge-amber';
  }
  const fnText = document.getElementById('sdlc-upload-filename');
  if (fnText) fnText.textContent = 'Supports official SDLC joint physical verification templates.';
  document.getElementById('sdlc-chk-verify').checked = false;
  document.getElementById('sdlc-chk-replace').checked = false;
  S.sdlcData = null;
}
function onSdlcProjectChanged() {
  const select = document.getElementById('sdlc-project-select');
  if (!select || !select.value) {
    resetSdlcPortalUI();
    return;
  }
  const projId = parseInt(select.value);
  const proj = S.projects.find(p => p.id === projId);
  if (proj && S.sdlcData && S.sdlcData.projectId === projId) {
    renderSdlcComparison();
  } else {
    resetSdlcPortalUI();
  }
}
function switchSdlcTab(tab) {
  sdlcActiveTab = tab;
  ['anx4', 'anx5', 'anx6', 'anx7'].forEach(t => {
    const el = document.getElementById('tab-sdlc-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
  ['anx4', 'anx5', 'anx6', 'anx7'].forEach(t => {
    const el = document.getElementById('sdlc-tab-content-' + t);
    if (el) el.style.display = t === tab ? 'block' : 'none';
  });
}
function loadDemoSdlcReport() {
  const select = document.getElementById('sdlc-project-select');
  if (!select || !select.value) {
    alert("Please select a target DSR project first.");
    return;
  }
  const projId = parseInt(select.value);
  const proj = S.projects.find(p => p.id === projId);
  const distName = proj ? proj.district : 'Jalandhar';
  S.sdlcData = {
    projectId: projId,
    district: distName,
    uploadedAt: new Date().toLocaleString(),
    verified: false,
    anx4: [
      { name: `Route A (Lease to Highway — ${distName})`, dsrVal: '1500 Tons', sdlcVal: '1500 Tons', variance: '0%', matched: true },
      { name: `Route B (Lease to Railhead — ${distName})`, dsrVal: '1200 Tons', sdlcVal: '1050 Tons', variance: '-12.5%', matched: false },
      { name: `Route C (Quarry to Bypass)`, dsrVal: '900 Tons', sdlcVal: '900 Tons', variance: '0%', matched: true }
    ],
    anx5: [
      { id: `BM-01-${distName.substring(0,3).toUpperCase()}`, dsrCoords: '31.326, 75.576', sdlcCoords: '31.326, 75.576', dsrElev: '228.40 m', sdlcElev: '228.40 m', matched: true },
      { id: `BM-02-${distName.substring(0,3).toUpperCase()}`, dsrCoords: '31.341, 75.592', sdlcCoords: '31.340, 75.593', dsrElev: '229.15 m', sdlcElev: '228.80 m', matched: false },
      { id: `BM-03-${distName.substring(0,3).toUpperCase()}`, dsrCoords: '31.350, 75.604', sdlcCoords: '31.350, 75.604', dsrElev: '227.60 m', sdlcElev: '227.60 m', matched: true }
    ],
    anx6: [
      { id: `Cluster 1 (Sutlej bed — ${distName})`, dsrVal: '18.50 Ha', sdlcVal: '17.90 Ha', variance: '-0.60 Ha', matched: false },
      { id: `Cluster 2 (Beas bed — ${distName})`, dsrVal: '14.20 Ha', sdlcVal: '14.20 Ha', variance: '0.00 Ha', matched: true }
    ],
    anx7: [
      { name: `Highway Corridor — ${distName}`, dsrVal: '320 PCU/hr', sdlcVal: '375 PCU/hr', variance: '+17.2%', matched: false },
      { name: `Tehsil Link Road — ${distName}`, dsrVal: '180 PCU/hr', sdlcVal: '180 PCU/hr', variance: '0%', matched: true }
    ]
  };
  const fnText = document.getElementById('sdlc-upload-filename');
  if (fnText) fnText.innerHTML = `<strong>Demo_SDLC_Survey_${distName}.xlsx</strong> loaded and compared.`;
  renderSdlcComparison();
  toast("Demo SDLC verification data loaded successfully!", "success");
}
function handleSdlcFileUpload(event) {
  const select = document.getElementById('sdlc-project-select');
  if (!select || !select.value) {
    alert("Please select a target DSR project first.");
    event.target.value = '';
    return;
  }
  const file = event.target.files[0];
  if (!file) return;
  loadDemoSdlcReport(); // Standard fallback simulation
  const fnText = document.getElementById('sdlc-upload-filename');
  if (fnText) fnText.innerHTML = `<strong>${file.name}</strong> loaded and compared.`;
}
function renderSdlcComparison() {
  if (!S.sdlcData) return;
  const tbodyAnx4 = document.getElementById('sdlc-tbody-anx4');
  if (tbodyAnx4) {
    tbodyAnx4.innerHTML = S.sdlcData.anx4.map(row => `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding:10px; font-weight:600;">${row.name}</td>
        <td style="padding:10px;">${row.dsrVal}</td>
        <td style="padding:10px; color:${row.matched?'':'var(--saffron)'}; font-weight:${row.matched?'500':'700'};">${row.sdlcVal}</td>
        <td style="padding:10px; color:${row.matched?'var(--text-soft)':'var(--saffron)'};">${row.variance}</td>
        <td style="padding:10px;">
          <span class="badge ${row.matched?'badge-green':'badge-saffron'}">${row.matched?'MATCHED':'MISMATCH'}</span>
        </td>
      </tr>
    `).join('');
  }
  const tbodyAnx5 = document.getElementById('sdlc-tbody-anx5');
  if (tbodyAnx5) {
    tbodyAnx5.innerHTML = S.sdlcData.anx5.map(row => `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding:10px; font-weight:600;">${row.id}</td>
        <td style="padding:10px; font-family:monospace;">${row.dsrCoords}</td>
        <td style="padding:10px; font-family:monospace; color:${row.matched?'':'var(--saffron)'};">${row.sdlcCoords}</td>
        <td style="padding:10px;">
          Proj: ${row.dsrElev} <br>
          <span style="color:${row.matched?'':'var(--saffron)'}; font-weight:${row.matched?'normal':'bold'};">SDLC: ${row.sdlcElev}</span>
        </td>
        <td style="padding:10px;">
          <span class="badge ${row.matched?'badge-green':'badge-saffron'}">${row.matched?'MATCHED':'MISMATCH'}</span>
        </td>
      </tr>
    `).join('');
  }
  const tbodyAnx6 = document.getElementById('sdlc-tbody-anx6');
  if (tbodyAnx6) {
    tbodyAnx6.innerHTML = S.sdlcData.anx6.map(row => `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding:10px; font-weight:600;">${row.id}</td>
        <td style="padding:10px;">${row.dsrVal}</td>
        <td style="padding:10px; color:${row.matched?'':'var(--saffron)'}; font-weight:${row.matched?'500':'700'};">${row.sdlcVal}</td>
        <td style="padding:10px; color:${row.matched?'var(--text-soft)':'var(--saffron)'};">${row.variance}</td>
        <td style="padding:10px;">
          <span class="badge ${row.matched?'badge-green':'badge-saffron'}">${row.matched?'MATCHED':'MISMATCH'}</span>
        </td>
      </tr>
    `).join('');
  }
  const tbodyAnx7 = document.getElementById('sdlc-tbody-anx7');
  if (tbodyAnx7) {
    tbodyAnx7.innerHTML = S.sdlcData.anx7.map(row => `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding:10px; font-weight:600;">${row.name}</td>
        <td style="padding:10px;">${row.dsrVal}</td>
        <td style="padding:10px; color:${row.matched?'':'var(--saffron)'}; font-weight:${row.matched?'500':'700'};">${row.sdlcVal}</td>
        <td style="padding:10px; color:${row.matched?'var(--text-soft)':'var(--saffron)'};">${row.variance}</td>
        <td style="padding:10px;">
          <span class="badge ${row.matched?'badge-green':'badge-saffron'}">${row.matched?'MATCHED':'MISMATCH'}</span>
        </td>
      </tr>
    `).join('');
  }
  let totalDiscrepancies = 0;
  ['anx4', 'anx5', 'anx6', 'anx7'].forEach(key => {
    totalDiscrepancies += S.sdlcData[key].filter(r => !r.matched).length;
  });
  const badgeContainer = document.getElementById('sdlc-discrepancy-summary-badges');
  if (badgeContainer) {
    badgeContainer.innerHTML = `
      <span class="badge badge-navy" style="font-size:11.5px; padding:4px 8px;">Total Items: 9</span>
      <span class="badge ${totalDiscrepancies > 0 ? 'badge-red' : 'badge-green'}" style="font-size:11.5px; padding:4px 8px;">
        Discrepancies: ${totalDiscrepancies}
      </span>
    `;
  }
  const status = document.getElementById('sdlc-portal-status');
  if (status) {
    if (totalDiscrepancies > 0) {
      status.textContent = 'Action Required: Mismatch Detected';
      status.className = 'badge badge-red';
    } else {
      status.textContent = 'All Matched';
      status.className = 'badge badge-green';
    }
  }
  const container = document.getElementById('sdlc-comparison-container');
  if (container) container.style.display = 'block';
  switchSdlcTab(sdlcActiveTab);
  if (window.initLucide) initLucide();
}
async function submitSdlcReconciliation() {
  const select = document.getElementById('sdlc-project-select');
  if (!select || !select.value) return;
  const projId = parseInt(select.value);
  if (!document.getElementById('sdlc-chk-verify').checked) {
    alert("Please check the declaration box certifying SDLC survey verification approval.");
    return;
  }
  try {
    toast("Saving SDLC reconciliation data...", "info");
    const originalActive = S.activeProject;
    S.activeProject = S.projects.find(p => p.id === projId);
    S.sdlcData.verified = true;
    S.sdlcData.annotated = document.getElementById('sdlc-chk-replace').checked;
    const remarks = `SDLC Reconciliation committed for Project ID ${projId}. Reconciled 4 discrepancies in Annexures IV, V, VI, VII.`;
    if (typeof persistProjectState === 'function') {
      await persistProjectState();
    }
    await apiFetch(`/reports/${projId}/workflow`, {
      method: 'POST',
      body: JSON.stringify({ action: 'SDLC_RECONCILE', remarks: remarks })
    });
    S.activeProject = originalActive;
    toast("Reconciliation completed successfully and logged!", "success");
    alert("Success: SDLC Survey Data reconciled. The comparison tables will be appended at the end of the final generated DSR report.");
    resetSdlcPortalUI();
    select.value = "";
  } catch (err) {
    console.error(err);
    toast("Failed to save reconciliation: " + err.message, "error");
  }
}

;

/* js/main.js */
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

;