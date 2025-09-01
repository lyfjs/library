// API Configuration
const API_BASE_URL = 'https://lyfjs-backend-deployment.onrender.com/api';

// Fetch and render books, then enable search/filter
(function() {
    const searchInput = document.getElementById('searchInput');
    const filterBookType = document.getElementById('filterBookType');
    const filterStrand = document.getElementById('filterStrand');
    const filterGenre = document.getElementById('filterGenre');
    const filterLevel = document.getElementById('filterlevel');
    const bookList = document.getElementById('bookList');

    let booksData = [];

    // Check authentication status on page load
    document.addEventListener('DOMContentLoaded', function() {
        checkAuthStatus();
        loadBooks();
        setupEventListeners();
    });

    function checkAuthStatus() {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        const authLink = document.getElementById('authLink');
        const welcomeSection = document.getElementById('welcomeSection');
        
        if (isLoggedIn && user.id) {
            // User is logged in
            authLink.innerHTML = `<a href="#" onclick="logout()">Logout</a>`;
            if (welcomeSection) {
                welcomeSection.style.display = 'block';
            }
        } else {
            // User is not logged in
            authLink.innerHTML = `<a href="login.html">Login</a>`;
            if (welcomeSection) {
                welcomeSection.style.display = 'none';
            }
        }
    }

    // Logout function
    async function logout() {
        try {
            const response = await fetch(`${API_BASE_URL}/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                // Clear local storage
                localStorage.removeItem('user');
                localStorage.removeItem('isLoggedIn');
                
                // Redirect to home page
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Still clear local storage and redirect
            localStorage.removeItem('user');
            localStorage.removeItem('isLoggedIn');
            window.location.href = 'index.html';
        }
    }

    // Load books from API
    async function loadBooks() {
        try {
            const response = await fetch(`${API_BASE_URL}/books`);
            if (response.ok) {
                booksData = await response.json();
                renderBooks(booksData);
            } else {
                console.error('Failed to load books');
                bookList.innerHTML = '<p>Failed to load books. Please try again later.</p>';
            }
        } catch (error) {
            console.error('Error loading books:', error);
            bookList.innerHTML = '<p>Error loading books. Please check your connection.</p>';
        }
    }

    function resolveCoverUrl(cover) {
        if (!cover) return '';
        if (cover.startsWith('databasecontent/')) return `${API_BASE_URL}/${cover}`;
        if (cover.startsWith('static/')) return cover;
        if (cover.startsWith('./') || cover.startsWith('../')) return cover;
        if (cover.includes('/')) return cover.replace(/^\/+/, '');
        
        return `${API_BASE_URL}/databasecontent/cover/${cover}`;
    }

    function renderBooks(items) {
        bookList.innerHTML = items.map(b => {
            let bookInfo = '';
            
            if (b.bookType === 'Novel') {
                // For novels, show genre only
                bookInfo = b.genre ? `${b.bookType} - ${b.genre}` : b.bookType;
            } else {
                // For modules and other types, show academic fields
                const academicInfo = [];
                if (b.strand) academicInfo.push(b.strand);
                if (b.level) academicInfo.push(`Grade ${b.level}`);
                if (b.qtr) academicInfo.push(b.qtr.replace('qtr', 'Quarter '));
                
                bookInfo = academicInfo.length > 0 ? 
                    `${b.bookType} - ${academicInfo.join(' - ')}` : 
                    b.bookType;
            }
            
            return `
                <div class="feature-card book-card" 
                     data-level="${b.bookType === 'Novel' ? '' : (b.level ?? '')}" 
                     data-genre="${b.bookType === 'Novel' ? (b.genre ?? '') : (b.strand ?? '')}" 
                     data-booktype="${b.bookType ?? ''}"
                     data-novel-genre="${b.bookType === 'Novel' ? (b.genre ?? '') : ''}"
                     data-module-strand="${b.bookType !== 'Novel' ? (b.strand ?? '') : ''}">
                    <div class="book-card-content">
                        ${resolveCoverUrl(b.cover) ? `<img class="book-image" src="${resolveCoverUrl(b.cover)}" alt="${b.title}">` : ''}
                        <div class="book-text">
                            <h3>${b.title}</h3>
                            <p>${bookInfo}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function filterBooks() {
        const searchTerm = (searchInput?.value || '').toLowerCase();
        const selectedBookType = filterBookType?.value || '';
        const selectedStrand = filterStrand?.value || '';
        const selectedGenre = filterGenre?.value || '';
        const selectedLevel = filterLevel?.value || '';

        const filtered = booksData.filter(b => {
            const title = (b.title || '').toLowerCase();
            const desc = (b.description || '').toLowerCase();
            const bookType = b.bookType || '';
            const level = String(b.level || '');
            
            const matchesSearch = title.includes(searchTerm) || desc.includes(searchTerm);
            const matchesBookType = selectedBookType === '' || bookType === selectedBookType;
            
            // Handle strand filter (for modules)
            let matchesStrand = true;
            if (selectedStrand !== '') {
                if (bookType === 'Novel') {
                    // For novels, strand filter doesn't apply
                    matchesStrand = true;
                } else {
                    // For modules, filter by strand
                    matchesStrand = b.strand === selectedStrand;
                }
            }
            
            // Handle genre filter (for novels)
            let matchesGenre = true;
            if (selectedGenre !== '') {
                if (bookType === 'Novel') {
                    // For novels, filter by genre
                    matchesGenre = b.genre === selectedGenre;
                } else {
                    // For modules, genre filter doesn't apply
                    matchesGenre = true;
                }
            }
            
            // Handle level filter
            const matchesLevel = selectedLevel === '' || level === selectedLevel;
            
            return matchesSearch && matchesBookType && matchesStrand && matchesGenre && matchesLevel;
        });
        
        renderBooks(filtered);
    }

    function setupEventListeners() {
        // Search input
        if (searchInput) {
            searchInput.addEventListener('input', filterBooks);
        }
        
        // Filter dropdowns
        if (filterBookType) {
            filterBookType.addEventListener('change', filterBooks);
        }
        if (filterStrand) {
            filterStrand.addEventListener('change', filterBooks);
        }
        if (filterGenre) {
            filterGenre.addEventListener('change', filterBooks);
        }
        if (filterLevel) {
            filterLevel.addEventListener('change', filterBooks);
        }
    }

    // Make logout function globally accessible
    window.logout = logout;
})();