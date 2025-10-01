// Audit Log Functions (Superadmin Only)
let allAuditLogs = [];
let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', () => {
    setupAuditLogFilters();
});

function setupAuditLogFilters() {
    const searchInput = document.getElementById('auditSearchInput');
    const actionFilter = document.getElementById('auditActionFilter');

    if (searchInput) {
        searchInput.addEventListener('input', filterAuditLogs);
    }

    if (actionFilter) {
        actionFilter.addEventListener('change', filterAuditLogs);
    }
}

async function loadAuditLog() {
    const auditLogTableBody = document.getElementById('auditLogTableBody');
    const auditLoadingIndicator = document.getElementById('auditLoadingIndicator');
    const noAuditLogsMessage = document.getElementById('noAuditLogsMessage');

    if (!auditLogTableBody || !auditLoadingIndicator || !noAuditLogsMessage) return;

    auditLoadingIndicator.style.display = 'flex';
    auditLogTableBody.innerHTML = '';
    noAuditLogsMessage.style.display = 'none';

    try {
        const response = await fetch(`${API_SERVER}/api/admin/audit-log?page=${currentPage}&limit=50`, {
            credentials: 'include'
        });

        if (response.status === 403) {
            auditLogTableBody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align: center;">You do not have permission to view this section.</td></tr>`;
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to fetch audit log');
        }

        const data = await response.json();
        allAuditLogs = data.logs || [];
        totalPages = data.total_pages || 1;
        
        displayAuditLogs();

    } catch (error) {
        console.error('Error loading audit log:', error);
        auditLogTableBody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align: center;">${escapeHtml(error.message || 'Failed to load audit log.')}</td></tr>`;
    } finally {
        auditLoadingIndicator.style.display = 'none';
    }
}

function displayAuditLogs() {
    const auditLogTableBody = document.getElementById('auditLogTableBody');
    const noAuditLogsMessage = document.getElementById('noAuditLogsMessage');

    if (!auditLogTableBody || !noAuditLogsMessage) return;

    if (allAuditLogs.length === 0) {
        auditLogTableBody.innerHTML = '';
        noAuditLogsMessage.style.display = 'block';
        return;
    }

    noAuditLogsMessage.style.display = 'none';

    auditLogTableBody.innerHTML = allAuditLogs.map(log => `
        <tr>
            <td>${formatDateTime(log.created_at)}</td>
            <td>
                <span class="badge badge-admin">${escapeHtml(log.admin_username)}</span>
            </td>
            <td>
                <span class="action-badge action-${log.action.toLowerCase().replace('_', '-')}">
                    ${formatAction(log.action)}
                </span>
            </td>
            <td>
                ${log.target_type ? `<span class="target-badge">${escapeHtml(log.target_type)}</span>` : '-'}
                ${log.target_id ? `#${log.target_id}` : ''}
            </td>
            <td class="details-cell">${escapeHtml(log.details || '-')}</td>
            <td class="ip-cell">${escapeHtml(log.ip_address || '-')}</td>
        </tr>
    `).join('');
}

function filterAuditLogs() {
    const searchInput = document.getElementById('auditSearchInput');
    const actionFilter = document.getElementById('auditActionFilter');
    
    if (!searchInput || !actionFilter) return;

    const searchTerm = searchInput.value.toLowerCase();
    const actionFilterValue = actionFilter.value;

    const filteredLogs = allAuditLogs.filter(log => {
        const matchesSearch = !searchTerm || 
            log.admin_username.toLowerCase().includes(searchTerm) ||
            log.action.toLowerCase().includes(searchTerm) ||
            (log.details && log.details.toLowerCase().includes(searchTerm));
        
        const matchesAction = !actionFilterValue || log.action === actionFilterValue;
        
        return matchesSearch && matchesAction;
    });

    // Temporarily replace allAuditLogs with filtered results for display
    const originalLogs = allAuditLogs;
    allAuditLogs = filteredLogs;
    displayAuditLogs();
    allAuditLogs = originalLogs; // Restore original data
}

function formatAction(action) {
    const actionMap = {
        'ADD_BOOK': 'Add Book',
        'UPDATE_BOOK': 'Update Book',
        'DELETE_BOOK': 'Delete Book',
        'APPROVE_REQUEST': 'Approve Request',
        'REJECT_REQUEST': 'Reject Request',
        'RETURN_BOOK': 'Return Book',
        'CREATE_ADMIN': 'Create Admin',
        'UPDATE_ADMIN': 'Update Admin',
        'DELETE_ADMIN': 'Delete Admin',
        'CHANGE_PASSWORD': 'Change Password'
    };
    return actionMap[action] || action;
}

function formatDateTime(iso) {
    try {
        const date = new Date(iso);
        return date.toLocaleString();
    } catch {
        return iso;
    }
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Expose functions to global scope
window.loadAuditLog = loadAuditLog;
