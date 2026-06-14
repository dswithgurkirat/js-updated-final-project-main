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
