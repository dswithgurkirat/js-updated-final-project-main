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
