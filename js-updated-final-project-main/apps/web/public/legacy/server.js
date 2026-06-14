const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 8081;

// Start build.js in watch mode for local development. Disable it for public tunnel demos.
let watcher = null;
if (process.env.DSR_NO_WATCH !== '1') {
  console.log('Starting compilation watcher...');
  watcher = spawn('node', ['build.js', '--watch'], { stdio: 'inherit' });

  watcher.on('error', (err) => {
    console.error('Failed to start build watcher:', err);
  });
} else {
  console.log('Compilation watcher disabled for stable tunnel serving.');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const PROJECTS_FILE = path.join(__dirname, 'projects.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const workflowHistory = {};

function cacheHeaderFor(ext) {
  if (ext === '.html' || ext === '.js' || ext === '.css') return 'no-cache';
  if (['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'].includes(ext)) {
    return 'public, max-age=31536000, immutable';
  }
  return 'public, max-age=3600';
}

function normalizeProject(project = {}) {
  const id = project.id || Date.now();
  const title = project.title || project.projectName || `District Survey Report - ${project.district || 'Punjab'}`;
  return {
    ...project,
    id,
    title,
    projectName: project.projectName || title,
    district: project.district || 'Punjab',
    year: project.year || '2025-26',
    mineral: project.mineral || 'Sand',
    rivers: project.rivers || 'Not specified',
    progress: Number.isFinite(Number(project.progress)) ? Number(project.progress) : 0,
    status: project.status || 'In Progress',
    createdAt: project.createdAt || new Date().toISOString(),
    signatures: Number.isFinite(Number(project.signatures)) ? Number(project.signatures) : 0
  };
}

function getStatusForFrontend(status) {
  if (!status) return 'In Progress';
  const upper = String(status).toUpperCase();
  if (upper === 'ACTIVE' || upper === 'IN_PROGRESS') return 'In Progress';
  if (upper === 'COMPLETED') return 'Completed';
  return status;
}

function readProjects() {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
      if (Array.isArray(parsed)) return parsed.map(normalizeProject);
    }
  } catch (err) {
    console.error('Error reading projects.json:', err);
  }
  return [];
}

function writeProjects(projects) {
  try {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects.map(normalizeProject), null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing projects.json:', err);
    return false;
  }
}

function normalizeRole(role) {
  const value = String(role || 'OFFICER').toUpperCase().replace(/^ROLE_/, '');
  if (value === 'DATA_ENTRY') return 'OFFICER';
  return value;
}

function permissionsForRole(role) {
  const value = normalizeRole(role);
  if (value === 'ADMIN') return ['UPLOAD', 'REVIEW', 'ADMIN'];
  if (['IIT_ROPAR', 'GIS', 'REVIEWER', 'REVIEWER_1', 'REVIEWER_2', 'SDLC'].includes(value)) return ['REVIEW'];
  if (['SDO', 'JE', 'AXEN', 'OFFICER'].includes(value)) return ['UPLOAD'];
  return [];
}

function normalizeUser(user = {}) {
  const email = user.email || user.username || 'user@demo.com';
  const role = normalizeRole(user.role);
  return {
    id: user.id || Date.now(),
    username: user.username || email,
    email,
    fullName: user.fullName || String(email).split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    role,
    district: user.district || '',
    block: user.block || user.blockName || '',
    blockName: user.blockName || user.block || '',
    section: user.section || user.sectionName || '',
    sectionName: user.sectionName || user.section || '',
    accessLabel: user.accessLabel || role.replace(/_/g, ' '),
    permissions: Array.isArray(user.permissions) ? user.permissions : permissionsForRole(role),
    active: user.active === undefined ? true : Boolean(user.active),
    createdAt: user.createdAt || new Date().toISOString()
  };
}

function defaultUsers() {
  return [
    { id: 1, username: 'admin@demo.com', email: 'admin@demo.com', fullName: 'Demo Admin', role: 'ADMIN', active: true },
    { id: 2, username: 'iit@demo.com', email: 'iit@demo.com', fullName: 'IIT Ropar Reviewer', role: 'IIT_ROPAR', active: true },
    { id: 3, username: 'sdlc@demo.com', email: 'sdlc@demo.com', fullName: 'SDLC Committee', role: 'SDLC', district: 'Jalandhar', active: true },
    { id: 4, username: 'sdo@demo.com', email: 'sdo@demo.com', fullName: 'SDO Demo User', role: 'SDO', district: 'Jalandhar', active: true },
    { id: 5, username: 'gis@demo.com', email: 'gis@demo.com', fullName: 'GIS Demo User', role: 'GIS', active: true }
  ].map(normalizeUser);
}

function readUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      if (Array.isArray(parsed)) return parsed.map(normalizeUser);
    }
  } catch (err) {
    console.error('Error reading users.json:', err);
  }
  return defaultUsers();
}

function writeUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users.map(normalizeUser), null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing users.json:', err);
    return false;
  }
}

function getProjectDisplayName(project) {
  if (!project) return 'Unknown Project';
  return project.projectName || project.title || `District Survey Report - ${project.district || 'Punjab'}`;
}

function appendWorkflowAudit(projectId, entry) {
  const key = String(projectId);
  workflowHistory[key] = [entry, ...(workflowHistory[key] || [])];
}

function buildAuditLogs() {
  const projects = readProjects();
  const projectsById = new Map(projects.map(project => [String(project.id), project]));

  const workflowLogs = Object.entries(workflowHistory).flatMap(([projectId, entries]) => {
    const project = projectsById.get(String(projectId));
    return (Array.isArray(entries) ? entries : []).map(entry => ({
      projectId: entry.projectId || projectId,
      projectName: entry.projectName || getProjectDisplayName(project),
      performedBy: entry.performedBy || 'system',
      action: entry.action || 'AUDIT',
      remarks: entry.remarks || '',
      performedAt: entry.performedAt || entry.createdAt || new Date().toISOString()
    }));
  });

  const projectLogs = projects.map(project => ({
    projectId: project.id,
    projectName: getProjectDisplayName(project),
    performedBy: project.createdBy || 'local-demo-user',
    action: 'PROJECT_CREATED',
    remarks: `${project.district || 'Punjab'} DSR project created for ${project.year || '2025-26'}`,
    performedAt: project.createdAt || new Date().toISOString()
  }));

  return [...workflowLogs, ...projectLogs].sort((a, b) => {
    const aTime = new Date(a.performedAt).getTime() || 0;
    const bTime = new Date(b.performedAt).getTime() || 0;
    return bTime - aTime;
  });
}

function isAdminRequest(req) {
  const auth = req.headers.authorization || '';
  return auth === 'Bearer local-demo-token-admin';
}

function denyFinalPdfAccess(res) {
  res.writeHead(403, { 'Content-Type': 'text/plain' });
  res.end('Access Denied - Only Administrators can download or email the Final DSR PDF.');
}

function deleteProjectUploads(projectId) {
  if (!fs.existsSync(UPLOADS_DIR)) return;
  try {
    fs.readdirSync(UPLOADS_DIR)
      .filter(file => file === `${projectId}.pdf` || file.startsWith(`${projectId}_`))
      .forEach(file => {
        try {
          fs.unlinkSync(path.join(UPLOADS_DIR, file));
        } catch (err) {
          console.warn(`Could not delete upload ${file}:`, err.message);
        }
      });
  } catch (err) {
    console.warn('Could not clean uploads for deleted project:', err.message);
  }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => { resolve(body); });
    req.on('error', (err) => { reject(err); });
  });
}

function deleteFileWithRetries(filePath, retries = 5, delay = 100) {
  return new Promise((resolve) => {
    function attempt(n) {
      if (!fs.existsSync(filePath)) {
        resolve(true);
        return;
      }
      try {
        fs.unlinkSync(filePath);
        console.log(`Successfully deleted file: ${filePath}`);
        resolve(true);
      } catch (err) {
        if (n > 0) {
          console.warn(`File ${filePath} locked, retrying deletion in ${delay}ms... (attempts left: ${n})`);
          setTimeout(() => attempt(n - 1), delay);
        } else {
          console.error(`Failed to delete file ${filePath} after multiple attempts:`, err);
          resolve(false);
        }
      }
    }
    attempt(retries);
  });
}

const server = http.createServer((req, res) => {
  const urlObj = req.url.split('?');
  const pathname = decodeURIComponent(urlObj[0]);
  const queryParams = new URLSearchParams(urlObj[1] || '');

  // 1. Handle API routes
  if (pathname.startsWith('/api/')) {
    if (pathname === '/api/dashboard/stats' && req.method === 'GET') {
      const projects = readProjects();
      const completed = projects.filter(p => getStatusForFrontend(p.status) === 'Completed' || p.progress === 100).length;
      const generatedPdfs = projects.filter(p => !!p.finalPdfName).length;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        totalProjects: projects.length,
        completedReports: completed,
        pendingReports: Math.max(projects.length - completed, 0),
        generatedPdfs
      }));
      return;
    }

    if (pathname === '/api/reports' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
      return;
    }

    if (pathname === '/api/reports/audit-logs' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(buildAuditLogs()));
      return;
    }

    const reportHistoryMatch = pathname.match(/^\/api\/reports\/([^/]+)\/history$/);
    if (reportHistoryMatch && req.method === 'GET') {
      const reportId = reportHistoryMatch[1];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(workflowHistory[reportId] || []));
      return;
    }

    const reportWorkflowMatch = pathname.match(/^\/api\/reports\/([^/]+)\/workflow$/);
    if (reportWorkflowMatch && req.method === 'POST') {
      readRequestBody(req).then(body => {
        try {
          const reportId = reportWorkflowMatch[1];
          const payload = JSON.parse(body || '{}');
          const entry = {
            projectId: Number(reportId) || reportId,
            projectName: getProjectDisplayName(readProjects().find(p => String(p.id) === String(reportId))),
            action: payload.action || 'SUBMIT',
            remarks: payload.remarks || '',
            performedBy: 'local-demo-user',
            performedAt: new Date().toISOString()
          };
          appendWorkflowAudit(reportId, entry);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(entry));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      readRequestBody(req).then(body => {
        try {
          const { username, password } = JSON.parse(body || '{}');
          if (!username || !password) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Username and password are required' }));
            return;
          }

          const email = String(username || '').toLowerCase();
          const existingUser = readUsers().find(user =>
            String(user.email).toLowerCase() === email || String(user.username).toLowerCase() === email
          );
          if (existingUser && !existingUser.active) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'User account is disabled' }));
            return;
          }

          let role = existingUser ? `ROLE_${normalizeRole(existingUser.role)}` : 'ROLE_OFFICER';
          if (!existingUser) {
            if (email.includes('admin')) role = 'ROLE_ADMIN';
            else if (email.includes('iit')) role = 'ROLE_IIT_ROPAR';
            else if (email.includes('sdo')) role = 'ROLE_SDO';
            else if (email.includes('sdlc')) role = 'ROLE_SDLC';
            else if (email.includes('gis')) role = 'ROLE_GIS';
            else if (email.includes('je')) role = 'ROLE_JE';
            else if (email.includes('axen')) role = 'ROLE_AXEN';
            else if (email.includes('reviewer')) role = 'ROLE_REVIEWER';
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            token: role === 'ROLE_ADMIN' ? 'local-demo-token-admin' : 'local-demo-token-user',
            username: existingUser?.username || username,
            email: existingUser?.email || username,
            fullName: existingUser?.fullName || username.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            role,
            permissions: existingUser?.permissions || permissionsForRole(role),
            scope: { district: existingUser?.district || '', block: existingUser?.block || '', section: existingUser?.section || '' },
            accessLabel: existingUser?.accessLabel || role.replace('ROLE_', '').replace(/_/g, ' ')
          }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    if (pathname === '/api/auth/register' && req.method === 'POST') {
      readRequestBody(req).then(body => {
        try {
          const { username, email, fullName } = JSON.parse(body || '{}');
          const users = readUsers();
          const login = username || email;
          const existing = users.find(user =>
            String(user.email).toLowerCase() === String(email || login).toLowerCase() ||
            String(user.username).toLowerCase() === String(login).toLowerCase()
          );
          if (!existing) {
            users.unshift(normalizeUser({
              id: Date.now(),
              username: login,
              email: email || login,
              fullName: fullName || login,
              role: 'OFFICER',
              active: true
            }));
            writeUsers(users);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            username: username || email,
            fullName: fullName || username || email
          }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }

    if (pathname === '/api/users' && req.method === 'GET') {
      if (!isAdminRequest(req)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Only Admin can manage users' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(readUsers()));
      return;
    }

    if (pathname === '/api/users' && req.method === 'POST') {
      if (!isAdminRequest(req)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Only Admin can manage users' }));
        return;
      }
      readRequestBody(req).then(body => {
        try {
          const payload = JSON.parse(body || '{}');
          const login = payload.username || payload.email;
          if (!login) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Username/email is required' }));
            return;
          }
          const users = readUsers();
          if (users.some(user => String(user.username).toLowerCase() === String(login).toLowerCase() || String(user.email).toLowerCase() === String(payload.email || login).toLowerCase())) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'User already exists' }));
            return;
          }
          const created = normalizeUser({
            ...payload,
            id: Date.now(),
            username: login,
            email: payload.email || login,
            active: payload.active === undefined ? true : String(payload.active) !== 'false'
          });
          users.unshift(created);
          writeUsers(users);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(created));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }

    const userActiveMatch = pathname.match(/^\/api\/users\/([^/]+)\/active$/);
    if (userActiveMatch && req.method === 'PATCH') {
      if (!isAdminRequest(req)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Only Admin can manage users' }));
        return;
      }
      readRequestBody(req).then(body => {
        try {
          const payload = JSON.parse(body || '{}');
          const userId = userActiveMatch[1];
          const users = readUsers();
          const index = users.findIndex(user => String(user.id) === String(userId));
          if (index === -1) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'User not found' }));
            return;
          }
          users[index].active = Boolean(payload.active);
          writeUsers(users);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(normalizeUser(users[index])));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }

    const userMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
    if (userMatch && (req.method === 'PUT' || req.method === 'DELETE')) {
      if (!isAdminRequest(req)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Only Admin can manage users' }));
        return;
      }
      const userId = userMatch[1];
      if (req.method === 'DELETE') {
        const users = readUsers();
        const remaining = users.filter(user => String(user.id) !== String(userId));
        if (remaining.length === users.length) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'User not found' }));
          return;
        }
        writeUsers(remaining);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      }
      readRequestBody(req).then(body => {
        try {
          const payload = JSON.parse(body || '{}');
          const users = readUsers();
          const index = users.findIndex(user => String(user.id) === String(userId));
          if (index === -1) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'User not found' }));
            return;
          }
          users[index] = normalizeUser({ ...users[index], ...payload, id: users[index].id });
          writeUsers(users);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(users[index]));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }

    if (pathname === '/api/projects') {
      if (req.method === 'GET') {
        const projects = readProjects();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(projects));
        return;
      } else if (req.method === 'POST') {
        readRequestBody(req).then(body => {
          try {
            const payload = JSON.parse(body || '{}');
            if (Array.isArray(payload)) {
              writeProjects(payload);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
              return;
            }

            const projects = readProjects();
            const createdProject = normalizeProject({
              id: Date.now(),
              title: payload.title || payload.projectName,
              projectName: payload.projectName || payload.title,
              district: payload.district,
              year: payload.year,
              mineral: payload.mineral,
              rivers: payload.rivers,
              progress: 0,
              status: getStatusForFrontend(payload.status),
              createdAt: new Date().toISOString(),
              signatures: 0,
              projectState: payload.projectState || null
            });
            projects.unshift(createdProject);
            writeProjects(projects);
            appendWorkflowAudit(createdProject.id, {
              projectId: createdProject.id,
              projectName: getProjectDisplayName(createdProject),
              action: 'PROJECT_CREATED',
              remarks: `${createdProject.district || 'Punjab'} DSR project created for ${createdProject.year || '2025-26'}`,
              performedBy: 'local-demo-user',
              performedAt: createdProject.createdAt
            });
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(createdProject));
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
          }
        }).catch(err => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        });
        return;
      }
    }

    const projectPhaseMatch = pathname.match(/^\/api\/projects\/([^/]+)\/phases$/);
    if (projectPhaseMatch && req.method === 'POST') {
      if (!isAdminRequest(req)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Only Administrators can initiate the next phase.' }));
        return;
      }
      readRequestBody(req).then(body => {
        try {
          const sourceId = projectPhaseMatch[1];
          const payload = JSON.parse(body || '{}');
          const projects = readProjects();
          const sourceIndex = projects.findIndex(p => String(p.id) === String(sourceId));
          if (sourceIndex === -1) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Source DSR phase not found' }));
            return;
          }

          const source = projects[sourceIndex];
          const nextPhaseNo = Math.max(2, Number(payload.phaseNo || (Number(source.phaseNo) || 1) + 1));
          const baseTitle = String(source.title || source.projectName || `District Survey Report - ${source.district || 'Punjab'}`).replace(/\s+-\s+Phase\s+\d+$/i, '');
          const title = String(payload.title || `${baseTitle} - Phase ${nextPhaseNo}`).trim();
          const importedAt = new Date().toISOString();
          let sourceState = {};
          try {
            sourceState = source.projectState ? (typeof source.projectState === 'string' ? JSON.parse(source.projectState) : source.projectState) : {};
          } catch (err) {
            sourceState = {};
          }

          projects[sourceIndex] = normalizeProject({
            ...source,
            phaseLocked: true,
            projectState: JSON.stringify({
              ...sourceState,
              phaseMetadata: {
                ...(sourceState.phaseMetadata || {}),
                phaseNo: Number(source.phaseNo) || 1,
                locked: true,
                lockedAt: importedAt,
                lockedReason: `Phase ${nextPhaseNo} initiated`
              }
            })
          });

          const createdProject = normalizeProject({
            ...source,
            id: Date.now(),
            title,
            projectName: title,
            progress: 0,
            status: 'In Progress',
            signatures: 0,
            phaseNo: nextPhaseNo,
            parentPhaseId: source.id,
            phaseLocked: false,
            phaseOrigin: `Imported from project ${source.id} / Phase ${source.phaseNo || 1}`,
            createdAt: importedAt,
            finalPdfName: null,
            finalPdfGeneratedAt: null,
            projectState: JSON.stringify({
              ...sourceState,
              phaseMetadata: {
                phaseNo: nextPhaseNo,
                parentPhaseId: source.id,
                parentPhaseTitle: source.title || source.projectName,
                parentPhaseNo: Number(source.phaseNo) || 1,
                importedAt,
                locked: false,
                defaultUploadColor: payload.uploadColor || '#34C759',
                origin: 'PHASE_IMPORTED'
              },
              phaseChangeLog: [
                {
                  type: 'PHASE_CREATED',
                  section: 'Project',
                  label: `Imported data from Phase ${source.phaseNo || 1}`,
                  color: '#94A3B8',
                  at: importedAt,
                  by: 'local-demo-user'
                }
              ]
            })
          });
          projects.unshift(createdProject);
          writeProjects(projects);
          appendWorkflowAudit(createdProject.id, {
            projectId: createdProject.id,
            projectName: getProjectDisplayName(createdProject),
            action: 'PROJECT_PHASE_INITIATED',
            remarks: `Phase ${nextPhaseNo} created from Phase ${source.phaseNo || 1} (${source.district || 'Punjab'})`,
            performedBy: 'local-demo-user',
            performedAt: importedAt
          });
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(createdProject));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }

    const projectStateMatch = pathname.match(/^\/api\/projects\/([^/]+)\/state$/);
    if (projectStateMatch && req.method === 'PUT') {
      readRequestBody(req).then(body => {
        try {
          const projectId = projectStateMatch[1];
          const payload = JSON.parse(body || '{}');
          const projects = readProjects();
          const projectIndex = projects.findIndex(p => String(p.id) === String(projectId));
          if (projectIndex === -1) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Project not found' }));
            return;
          }

          projects[projectIndex].projectState = payload.state || null;
          writeProjects(projects);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
      }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      });
      return;
    }

    const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
    if (projectMatch) {
      const projectId = projectMatch[1];
      if (req.method === 'GET') {
        const project = readProjects().find(p => String(p.id) === String(projectId));
        if (!project) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Project not found' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(project));
        return;
      }

      if (req.method === 'DELETE') {
        const projects = readProjects();
        const remaining = projects.filter(p => String(p.id) !== String(projectId));
        if (remaining.length === projects.length) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Project not found' }));
          return;
        }
        writeProjects(remaining);
        deleteProjectUploads(projectId);
        const deletedProject = projects.find(p => String(p.id) === String(projectId));
        appendWorkflowAudit(projectId, {
          projectId,
          projectName: getProjectDisplayName(deletedProject),
          action: 'PROJECT_DELETED',
          remarks: 'Project deleted from local workspace',
          performedBy: 'local-demo-user',
          performedAt: new Date().toISOString()
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      }
    }

    if (pathname === '/api/files/upload' && req.method === 'POST') {
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      const contentType = req.headers['content-type'] || 'application/octet-stream';
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        try {
          const raw = Buffer.concat(chunks);
          const savedName = `${Date.now()}_upload.bin`;
          const destPath = path.join(UPLOADS_DIR, savedName);
          fs.writeFileSync(destPath, raw);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            id: Date.now(),
            fileName: savedName,
            originalName: savedName,
            contentType,
            sizeBytes: raw.length,
            url: `/uploads/${savedName}`
          }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      req.on('error', err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      });
      return;
    }

    if (pathname === '/api/upload-pdf' && req.method === 'POST') {
      readRequestBody(req).then(async body => {
        try {
          const { projectId, fileName, pdf, annexureId = 'anx3' } = JSON.parse(body);
          if (annexureId === 'final' && !isAdminRequest(req)) {
            denyFinalPdfAccess(res);
            return;
          }
          if (!projectId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Missing projectId' }));
            return;
          }

          if (fileName === null || pdf === null) {
            // Delete PDF file if exists
            const destPath = path.join(UPLOADS_DIR, `${projectId}_${annexureId}.pdf`);
            await deleteFileWithRetries(destPath);
            
            if (annexureId === 'anx3') {
              const legacyPath = path.join(UPLOADS_DIR, `${projectId}.pdf`);
              await deleteFileWithRetries(legacyPath);
            }
            // Update projects.json to clear PDF metadata
            const projects = readProjects();
            const pIdx = projects.findIndex(p => p.id == projectId);
            if (pIdx !== -1) {
              const fieldName = annexureId === 'anx3' ? 'annexure3PdfName' : `${annexureId}PdfName`;
              delete projects[pIdx][fieldName];
              if (annexureId === 'anx3') {
                delete projects[pIdx]['anx3PdfName'];
              }
              writeProjects(projects);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (!fileName || !pdf) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Missing required fields' }));
            return;
          }

          // Ensure uploads directory exists
          if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
          }

          const fileBuffer = Buffer.from(pdf, 'base64');
          const destPath = path.join(UPLOADS_DIR, `${projectId}_${annexureId}.pdf`);
          fs.writeFileSync(destPath, fileBuffer);

          // Update projects.json
          const projects = readProjects();
          const pIdx = projects.findIndex(p => p.id == projectId);
          if (pIdx !== -1) {
            const fieldName = annexureId === 'anx3' ? 'annexure3PdfName' : `${annexureId}PdfName`;
            projects[pIdx][fieldName] = fileName;
            if (annexureId === 'final') {
              projects[pIdx].finalPdfGeneratedAt = new Date().toISOString();
            }
            writeProjects(projects);
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      });
      return;
    }

    if (pathname === '/api/download-pdf' && req.method === 'GET') {
      const projectId = queryParams.get('projectId');
      const annexureId = queryParams.get('annexureId') || 'anx3';
      const inline = queryParams.get('inline') === 'true';

      if (annexureId === 'final' && !isAdminRequest(req)) {
        denyFinalPdfAccess(res);
        return;
      }

      if (!projectId) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing projectId');
        return;
      }

      let filePath = path.join(UPLOADS_DIR, `${projectId}_${annexureId}.pdf`);

      // Fallback for old anx3 uploads that were saved as projectId.pdf
      if (annexureId === 'anx3' && !fs.existsSync(filePath)) {
        const oldFilePath = path.join(UPLOADS_DIR, `${projectId}.pdf`);
        if (fs.existsSync(oldFilePath)) {
          filePath = oldFilePath;
        }
      }

      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('PDF not found');
        return;
      }

      // Try to find the original filename from projects
      const projects = readProjects();
      const proj = projects.find(p => p.id == projectId);
      const fieldName = annexureId === 'anx3' ? 'annexure3PdfName' : `${annexureId}PdfName`;
      const originalName = proj ? (proj[fieldName] || proj['anx3PdfName'] || `${annexureId}.pdf`) : `${projectId}.pdf`;

      const headers = {
        'Content-Type': 'application/pdf'
      };

      if (inline) {
        headers['Content-Disposition'] = `inline; filename="${encodeURIComponent(originalName)}"`;
      } else {
        headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(originalName)}"`;
      }

      res.writeHead(200, headers);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      return;
    }

    if (pathname === '/api/email-final-pdf' && req.method === 'POST') {
      if (!isAdminRequest(req)) {
        denyFinalPdfAccess(res);
        return;
      }
      readRequestBody(req).then(body => {
        try {
          const { projectId, email } = JSON.parse(body || '{}');
          if (!projectId || !email) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Missing projectId or email' }));
            return;
          }
          const filePath = path.join(UPLOADS_DIR, `${projectId}_final.pdf`);
          if (!fs.existsSync(filePath)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Final PDF not found' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: `Final DSR PDF queued for ${email}` }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
      }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
    return;
  }

  // 2. Handle static files
  let filePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const fullPath = path.join(__dirname, filePath);

  // Basic security check to prevent directory traversal
  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheHeaderFor(ext)
    });
    
    const stream = fs.createReadStream(fullPath);
    stream.on('error', (streamErr) => {
      console.error(`Error reading file ${fullPath}:`, streamErr);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    });
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('\n==================================================');
  console.log(`🚀 Smart DSR Portal is running at:`);
  console.log(`   👉 http://localhost:${PORT}`);
  console.log('==================================================\n');
});

// Ensure compiler child process is killed when the server shuts down
process.on('SIGINT', () => {
  if (watcher) watcher.kill();
  process.exit();
});
process.on('SIGTERM', () => {
  if (watcher) watcher.kill();
  process.exit();
});
