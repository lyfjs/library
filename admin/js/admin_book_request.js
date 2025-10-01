// Book Request Management Functions
let allRequests = [];
let filteredRequests = [];

// Load all book requests
async function loadRequests() {
    try {
        const response = await fetch(`${API_SERVER}/api/admin/requests`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch requests');
        }
        
        const requests = await response.json();
        allRequests = requests || [];
        filteredRequests = [...allRequests];
        
        displayRequests();
    } catch (error) {
        console.error('Error loading requests:', error);
        showMessage('Failed to load requests. Please try again.', 'error');
    }
}

// Display requests in the table
function displayRequests() {
    const requestsContent = document.getElementById('requestsContent');
    if (!requestsContent) return;
    
    requestsContent.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Book Requests</h1>
            <p class="page-subtitle">Manage student book borrow requests</p>
        </div>
        <div class="form-card">
            <div class="search-controls">
                <div class="search-row">
                    <div class="search-group">
                        <input type="text" id="requestSearchInput" placeholder="Search by student name, book title..." class="search-input">
                    </div>
                    <div class="filter-group">
                        <select id="filterRequestStatus" class="filter-select">
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="toReturn">To Return</option>
                            <option value="returned">Returned</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <button id="checkDueBooksBtn" class="btn btn-secondary">
                            <i class="fas fa-clock"></i> Check Due Books
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="requests-table-container">
                <table class="books-table" id="requestsTable">
                    <thead>
                        <tr>
                            <th>Cover</th>
                            <th>Book Title</th>
                            <th>Student</th>
                            <th>Grade/Section</th>
                            <th>Status</th>
                            <th>Borrow Date</th>
                            <th>Due Date</th>
                            <th>Returned Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="requestsTableBody">
                        ${displayRequestRows()}
                    </tbody>
                </table>
                ${filteredRequests.length === 0 ? '<div class="no-data-message">No requests found</div>' : ''}
            </div>
        </div>
    `;
    
    // Add event listeners
    const searchInput = document.getElementById('requestSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterRequests);
    }
    
    const statusFilter = document.getElementById('filterRequestStatus');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterRequests);
    }
    
    const checkDueBtn = document.getElementById('checkDueBooksBtn');
    if (checkDueBtn) {
        checkDueBtn.addEventListener('click', checkDueBooks);
    }
}

// Generate request table rows
function displayRequestRows() {
    return filteredRequests.map(request => `
        <tr>
            <td>
                ${request.book_cover ? 
                    `<img src="${API_SERVER}/api/databasecontent/cover/${request.book_cover}" alt="Book cover" class="book-cover-thumb">` : 
                    '<div class="no-cover">No Cover</div>'
                }
            </td>
            <td>${escapeHtml(request.book_title)}</td>
            <td>
                <div class="student-info">
                    <div class="student-name">${escapeHtml(request.user_name)}</div>
                    <div class="student-email">${escapeHtml(request.user_email)}</div>
                </div>
            </td>
            <td>${escapeHtml(request.grade_level)} - ${escapeHtml(request.section)}</td>
            <td>
                <span class="status-badge status-${request.book_status}">
                    ${getStatusText(request.book_status)}
                </span>
            </td>
            <td>${request.borrow_date ? formatDate(request.borrow_date) : '-'}</td>
            <td>${request.expected_return_date ? formatDate(request.expected_return_date) : '-'}</td>
            <td>${request.return_date ? formatDate(request.return_date) : '-'}</td>
            <td>
                ${getActionButtons(request)}
            </td>
        </tr>
    `).join('');
}

// Get status text display
function getStatusText(status) {
    const statusMap = {
        'pending': 'Pending',
        'approved': 'Approved',
        'rejected': 'Rejected',
        'toReturn': 'To Return',
        'returned': 'Returned'
    };
    return statusMap[status] || status;
}

// Get action buttons based on request status
function getActionButtons(request) {
    switch (request.book_status) {
        case 'pending':
            return `
                <button class="action-btn approve-btn" onclick="approveRequest(${request.id})">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="action-btn reject-btn" onclick="rejectRequest(${request.id})">
                    <i class="fas fa-times"></i> Reject
                </button>
            `;
        case 'approved':
        case 'toReturn':
            return `
                <button class="action-btn return-btn" onclick="returnBook(${request.id})">
                    <i class="fas fa-undo"></i> Mark Returned
                </button>
            `;
        default:
            return '<span class="text-muted">No actions</span>';
    }
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Filter requests based on search and status
function filterRequests() {
    const searchInput = document.getElementById('requestSearchInput');
    const statusFilter = document.getElementById('filterRequestStatus');
    
    if (!searchInput || !statusFilter) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const status = statusFilter.value;
    
    filteredRequests = allRequests.filter(request => {
        const matchesSearch = !searchTerm || 
            request.user_name.toLowerCase().includes(searchTerm) ||
            request.book_title.toLowerCase().includes(searchTerm) ||
            request.user_email.toLowerCase().includes(searchTerm);
            
        const matchesStatus = !status || request.book_status === status;
        
        return matchesSearch && matchesStatus;
    });
    
    // Update table body
    const tbody = document.getElementById('requestsTableBody');
    if (tbody) {
        tbody.innerHTML = displayRequestRows();
    }
    
    // Update no data message
    const noDataMsg = document.querySelector('.no-data-message');
    if (noDataMsg) {
        noDataMsg.style.display = filteredRequests.length === 0 ? 'block' : 'none';
    }
}

// Approve a book request
async function approveRequest(requestId) {
    const selectedDate = await showReturnDateDialog();
    if (!selectedDate) {
        return;
    }
    
    try {
        const response = await fetch(`${API_SERVER}/api/admin/requests/${requestId}/approve`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ returnDate: selectedDate })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to approve request');
        }
        
        showMessage('Request approved successfully', 'success');
        await loadRequests();
    } catch (error) {
        console.error('Error approving request:', error);
        showMessage(error.message || 'Failed to approve request', 'error');
    }
}

// Popup calendar for selecting return date
function showReturnDateDialog() {
    return new Promise(resolve => {
        let modal = document.getElementById('returnDateModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'returnDateModal';
            modal.style.position = 'fixed';
            modal.style.inset = '0';
            modal.style.background = 'rgba(0,0,0,0.5)';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.zIndex = '9999';

            const box = document.createElement('div');
            box.style.background = '#fff';
            box.style.borderRadius = '10px';
            box.style.padding = '20px';
            box.style.width = 'min(420px, 90vw)';
            box.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';

            box.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                    <h3 style="margin:0;font-size:18px;">Set Return Date</h3>
                    <button id="rdCloseBtn" aria-label="Close" style="border:none;background:transparent;font-size:20px;cursor:pointer">×</button>
                </div>
                <p style="margin:0 0 12px 0;color:#555;font-size:14px;">Choose the date when the book should be returned.</p>
                <div style="display:flex;gap:10px;align-items:center;margin: 8px 0 20px 0;">
                    <input id="rdInput" type="date" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:6px;">
                </div>
                <div style="display:flex;justify-content:flex-end;gap:10px;">
                    <button id="rdCancel" class="btn btn-secondary" style="padding:8px 14px;border:1px solid #ccc;border-radius:6px;background:#f3f3f3;cursor:pointer;">Cancel</button>
                    <button id="rdConfirm" class="btn btn-primary" style="padding:8px 14px;border:none;border-radius:6px;background:#2c3e50;color:#fff;cursor:pointer;">Confirm</button>
                </div>
            `;

            modal.appendChild(box);
            document.body.appendChild(modal);
        } else {
            modal.style.display = 'flex';
        }

        const input = modal.querySelector('#rdInput');
        const confirmBtn = modal.querySelector('#rdConfirm');
        const cancelBtn = modal.querySelector('#rdCancel');
        const closeBtn = modal.querySelector('#rdCloseBtn');

        // Set min date to today
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        input.min = todayStr;
        input.value = todayStr;

        function cleanup(value) {
            modal.style.display = 'none';
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
            closeBtn.removeEventListener('click', onCancel);
            modal.removeEventListener('click', onBackdrop);
            resolve(value);
        }

        function onConfirm() {
            if (!input.value) {
                input.focus();
                return;
            }
            cleanup(input.value);
        }

        function onCancel() { cleanup(null); }
        function onBackdrop(e) { if (e.target === modal) cleanup(null); }

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
        closeBtn.addEventListener('click', onCancel);
        modal.addEventListener('click', onBackdrop);

        input.focus();
    });
}

// Reject a book request
async function rejectRequest(requestId) {
    if (!confirm('Are you sure you want to reject this request?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_SERVER}/api/admin/requests/${requestId}/reject`, {
            method: 'PUT',
            credentials: 'include'
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to reject request');
        }
        
        showMessage('Request rejected successfully', 'success');
        await loadRequests();
    } catch (error) {
        console.error('Error rejecting request:', error);
        showMessage(error.message || 'Failed to reject request', 'error');
    }
}

// Mark book as returned
async function returnBook(requestId) {
    if (!confirm('Are you sure you want to mark this book as returned?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_SERVER}/api/admin/requests/${requestId}/return`, {
            method: 'PUT',
            credentials: 'include'
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to process return');
        }
        
        showMessage('Book marked as returned successfully', 'success');
        await loadRequests();
    } catch (error) {
        console.error('Error processing return:', error);
        showMessage(error.message || 'Failed to process return', 'error');
    }
}

// Check for books that are due for return
async function checkDueBooks() {
    try {
        const response = await fetch(`${API_SERVER}/api/admin/requests/check-due`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to check due books');
        }
        
        const data = await response.json();
        showMessage(data.message, 'success');
        await loadRequests();
    } catch (error) {
        console.error('Error checking due books:', error);
        showMessage(error.message || 'Failed to check due books', 'error');
    }
}

// Make functions globally available
window.loadRequests = loadRequests;
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;
window.returnBook = returnBook;