// My Library + Dedicated page support
(function() {
    const API_BASE_URL = appConfig && appConfig.apiEndpoint ? appConfig.apiEndpoint : '';

    document.addEventListener('DOMContentLoaded', () => {
        // Dedicated page support
        const dedicatedList = document.getElementById('myRequestsList');
        if (dedicatedList) {
            setupHamburgerMenu();
            checkAuthStatus();
            loadMyRequestsPage();
            return;
        }
        // Legacy inline (kept if page still contains these nodes)
        const myLibraryLink = document.getElementById('myLibraryLink');
        if (myLibraryLink) {
            myLibraryLink.addEventListener('click', (e) => {
                const section = document.getElementById('myLibrarySection');
                if (section) {
                    e.preventDefault();
                    const isVisible = section.style.display !== 'none';
                    section.style.display = isVisible ? 'none' : 'block';
                    if (!isVisible) {
                        loadMyRequestsInline();
                        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });
        }
    });

    // Navbar helpers for dedicated page
    function setupHamburgerMenu() {
        const menuToggle = document.getElementById('menuToggle');
        const navMenu = document.getElementById('navMenu');
        if (!menuToggle || !navMenu) return;
        menuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('show');
            menuToggle.classList.toggle('active');
        });
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => link.addEventListener('click', function(){
            navMenu.classList.remove('show');
            menuToggle.classList.remove('active');
        }));
        window.addEventListener('resize', function(){
            if (window.innerWidth > 768) {
                navMenu.classList.remove('show');
                menuToggle.classList.remove('active');
            }
        });
    }

    function checkAuthStatus() {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const authLink = document.getElementById('authLink');
        if (!authLink) return;
        if (isLoggedIn && user.id) {
            authLink.innerHTML = `<a href="#" onclick="logout()">Logout</a>`;
        } else {
            authLink.innerHTML = `<a href="login.html">Login</a>`;
        }
    }

    async function logout() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/logout`, { method: 'POST', credentials: 'include' });
            if (response.ok) {
                localStorage.removeItem('user');
                localStorage.removeItem('isLoggedIn');
                window.location.href = 'index.html';
            }
        } catch (e) {
            localStorage.removeItem('user');
            localStorage.removeItem('isLoggedIn');
            window.location.href = 'index.html';
        }
    }
    window.logout = logout;

    // Inline section loader (legacy)
    async function loadMyRequestsInline() {
        const container = document.getElementById('myLibraryContainer');
        if (!container) return;
        container.innerHTML = '<div>Loading...</div>';
        try {
            const res = await fetch(`${API_BASE_URL}/api/my/requests`, { credentials: 'include' });
            if (!res.ok) {
                const data = await safeJson(res);
                throw new Error((data && data.error) || 'Failed to load requests');
            }
            const items = await res.json();
            container.innerHTML = renderRequestsTable(items || []);
            wireCancelButtonsInline();
        } catch (err) {
            container.innerHTML = `<div style="color:#c00;">${escapeHtml(err.message || 'Error loading')}</div>`;
        }
    }

    function renderRequestsTable(items) {
        if (!items.length) {
            return '<div class="no-data-message">No requests yet.</div>';
        }
        const rows = items.map(req => `
            <tr>
                <td>${escapeHtml(req.book_title || '')}</td>
                <td>${escapeHtml(getStatusText(req.book_status))}</td>
                <td>${req.borrow_date ? formatDate(req.borrow_date) : '-'}</td>
                <td>${req.expected_return_date ? formatDate(req.expected_return_date) : '-'}</td>
                <td>${req.return_date ? formatDate(req.return_date) : '-'}</td>
                <td>
                    ${req.book_status === 'pending' ? `<button class="btn btn-secondary" data-cancel="${req.id}">Cancel</button>` : ''}
                </td>
            </tr>
        `).join('');
        return `
            <div class="requests-table-container">
                <table class="books-table" id="myRequestsTable">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Borrowed</th>
                            <th>Due Date</th>
                            <th>Returned Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    function wireCancelButtonsInline() {
        document.querySelectorAll('button[data-cancel]')
            .forEach(btn => btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-cancel');
                if (!id) return;
                if (!confirm('Cancel this pending request?')) return;
                try {
                    const res = await fetch(`${API_BASE_URL}/api/my/requests/${id}`, { method: 'DELETE', credentials: 'include' });
                    const data = await safeJson(res);
                    if (!res.ok) throw new Error((data && data.error) || 'Failed to cancel');
                    await loadMyRequestsInline();
                } catch (err) {
                    alert(err.message || 'Failed to cancel');
                }
            }));
    }

    // Dedicated page loader (cards)
    async function loadMyRequestsPage(){
        const listEl = document.getElementById('myRequestsList');
        if (!listEl) return;
        listEl.innerHTML = '<p>Loading...</p>';
        try {
            const res = await fetch(`${API_BASE_URL}/api/my/requests`, { credentials: 'include' });
            if (!res.ok) {
                const data = await safeJson(res);
                throw new Error((data && data.error) || 'Failed to load');
            }
            const items = await res.json();
            if (!items.length) {
                listEl.innerHTML = '<div class="no-data-message">No requests yet.</div>';
                return;
            }
            listEl.innerHTML = items.map(req => requestCard(req)).join('');
            wireCancelButtonsPage();
        } catch (e) {
            listEl.innerHTML = `<p style="color:#c00;">${escapeHtml(e.message)}</p>`;
        }
    }

    function requestCard(req){
        const coverSrc = req.book_cover ? `${API_BASE_URL}/api/databasecontent/cover/${req.book_cover}` : '';
        return `
        <div class="request-card" data-id="${req.id}">
            ${coverSrc ? `<img class="request-cover" src="${coverSrc}" alt="cover">` : `<div class="request-cover"></div>`}
            <div class="request-meta">
                <div class="request-title">${escapeHtml(req.book_title || '')}</div>
                <div class="request-badges">
                    <span class="badge">Status: ${escapeHtml(getStatusText(req.book_status))}</span>
                    <span class="badge">Borrowed: ${req.borrow_date ? formatDate(req.borrow_date) : '-'}</span>
                    <span class="badge">Due: ${req.expected_return_date ? formatDate(req.expected_return_date) : '-'}</span>
                    <span class="badge">Returned: ${req.return_date ? formatDate(req.return_date) : '-'}</span>
                </div>
            </div>
            <div class="actions">
                ${req.book_status === 'pending' ? `<button class="btn btn-secondary" data-cancel="${req.id}">Cancel</button>` : ''}
            </div>
        </div>`;
    }

    function wireCancelButtonsPage(){
        document.querySelectorAll('button[data-cancel]')
            .forEach(btn => btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-cancel');
                if (!id) return;
                if (!confirm('Cancel this pending request?')) return;
                try {
                    const res = await fetch(`${API_BASE_URL}/api/my/requests/${id}`, { method: 'DELETE', credentials: 'include' });
                    const data = await safeJson(res);
                    if (!res.ok) throw new Error((data && data.error) || 'Failed to cancel');
                    await loadMyRequestsPage();
                } catch (e) {
                    alert(e.message || 'Failed to cancel');
                }
            }));
    }

    function getStatusText(status) {
        const map = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', toReturn: 'To Return', returned: 'Returned', cancelled: 'Cancelled' };
        return map[status] || status || '';
    }

    function formatDate(iso) { try { return new Date(iso).toLocaleDateString(); } catch { return iso; } }
    async function safeJson(res) { try { return await res.json(); } catch { return null; } }
    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
})();
