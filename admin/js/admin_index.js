let API_SERVER = 'https://lyfjs-backend-deployment.onrender.com'

document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, checking authentication...');
    checkAuthStatus();
    setupMenuToggle();
    setupNavigation();
    setupEventListeners();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await logout();
        });
    }
});

// Global variables
let allBooks = [];
let filteredBooks = [];

// Setup menu toggle functionality
function setupMenuToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (menuToggle && sidebar && mainContent) {
        menuToggle.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                // Mobile behavior - slide in/out
                sidebar.classList.toggle('show');
                menuToggle.classList.toggle('active');
            } else {
                // Desktop behavior - collapse/expand
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('expanded');
                menuToggle.classList.toggle('active');
                
                // Save state to localStorage only for desktop
                const isCollapsed = sidebar.classList.contains('collapsed');
                localStorage.setItem('adminSidebarCollapsed', isCollapsed);
            }
        });
        
        // Restore state from localStorage (desktop only)
        const isCollapsed = localStorage.getItem('adminSidebarCollapsed') === 'true';
        if (isCollapsed && window.innerWidth > 768) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
            menuToggle.classList.add('active');
        }
        
        // Handle responsive behavior
        function handleResize() {
            if (window.innerWidth <= 768) {
                // Mobile: reset to default state
                sidebar.classList.remove('collapsed', 'expanded');
                mainContent.classList.remove('expanded');
                sidebar.classList.remove('show');
                menuToggle.classList.remove('active');
            } else {
                // Desktop: restore collapse state
                sidebar.classList.remove('show');
                const isCollapsed = localStorage.getItem('adminSidebarCollapsed') === 'true';
                if (isCollapsed) {
                    sidebar.classList.add('collapsed');
                    mainContent.classList.add('expanded');
                    menuToggle.classList.add('active');
                } else {
                    sidebar.classList.remove('collapsed');
                    mainContent.classList.remove('expanded');
                    menuToggle.classList.remove('active');
                }
            }
        }
        
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial check
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('show');
                    menuToggle.classList.remove('active');
                }
            }
        });
    }
}

// Setup navigation
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-content]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            link.classList.add('active');
            
            // Get the content type
            const contentType = link.getAttribute('data-content');
            
            // Show the appropriate content
            showContent(contentType);
        });
    });
}

// Show content based on navigation
function showContent(contentType) {
    // Hide all content sections
    const allSections = document.querySelectorAll('.content-section, .dashboard-content');
    allSections.forEach(section => {
        section.style.display = 'none';
        section.classList.remove('visible');
    });
    
    // Show the selected content
    switch (contentType) {
        case 'add-books':
            const addBooksContent = document.getElementById('addBooksContent');
            if (addBooksContent) {
                addBooksContent.style.display = 'block';
                addBooksContent.classList.add('visible');
                initializeAddBooksForm();
            }
            break;
        case 'book-list':
            const bookListContent = document.getElementById('bookListContent');
            if (bookListContent) {
                bookListContent.style.display = 'block';
                bookListContent.classList.add('visible');
                loadBooks();
            }
            break;
        case 'users':
            const usersContent = document.getElementById('usersContent');
            if (usersContent) {
                usersContent.style.display = 'block';
                usersContent.classList.add('visible');
            }
            break;
        case 'requests':
            const requestsContent = document.getElementById('requestsContent');
            if (requestsContent) {
                requestsContent.style.display = 'block';
                requestsContent.classList.add('visible');
            }
            break;
        case 'history':
            const historyContent = document.getElementById('historyContent');
            if (historyContent) {
                historyContent.style.display = 'block';
                historyContent.classList.add('visible');
            }
            break;
        default:
            // Show dashboard
            const dashboardContent = document.getElementById('dashboardContent');
            if (dashboardContent) {
                dashboardContent.style.display = 'block';
                dashboardContent.classList.add('visible');
            }
            break;
    }
}

// Setup event listeners for forms and interactions
function setupEventListeners() {
    // Add Books form
    const addBookForm = document.getElementById('addBookForm');
    if (addBookForm) {
        addBookForm.addEventListener('submit', handleAddBookSubmit);
    }

    // Book list search and filters
    const searchInput = document.getElementById('searchInput');
    const filterBookType = document.getElementById('filterBookType');
    const filterStrand = document.getElementById('filterStrand');
    const filterLevel = document.getElementById('filterLevel');
    
    if (searchInput) searchInput.addEventListener('input', filterBooks);
    if (filterBookType) filterBookType.addEventListener('change', filterBooks);
    if (filterStrand) filterStrand.addEventListener('change', filterBooks);
    if (filterLevel) filterLevel.addEventListener('change', filterBooks);

    // Edit modal
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', closeEditModal);
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('editModal');
        if (event.target === modal) {
            closeEditModal();
        }
    });

    // Edit form submission
    const editForm = document.getElementById('editBookForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditFormSubmission);
    }
}

// Initialize Add Books form
function initializeAddBooksForm() {
    const bookTypeSelect = document.querySelector('#bookType');
    if (bookTypeSelect) {
        toggleFields(bookTypeSelect);
    }
    
    // Setup cover preview
    setupCoverPreview();
}

// Setup cover preview functionality
function setupCoverPreview() {
    const coverInput = document.querySelector('#cover');
    const coverPreview = document.querySelector('#coverPreview');
    
    if (coverInput && coverPreview) {
        coverInput.addEventListener('change', function() {
            const file = coverInput.files && coverInput.files[0];
            if (!file) { 
                coverPreview.src = ''; 
                coverPreview.alt = 'No image selected'; 
                return; 
            }
            const reader = new FileReader();
            reader.onload = function(e) { 
                coverPreview.src = e.target.result; 
                coverPreview.alt = 'Cover preview'; 
            };
            reader.readAsDataURL(file); 
        });
    }
}

// Handle Add Book form submission
async function handleAddBookSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const bookType = form.querySelector('#bookType').value;
    let isValid = true;
    
    if (bookType === 'Novel') {
        const genre = form.querySelector('#genre').value;
        if (!genre) {
            showMessage('Please select a genre for the novel.', 'error');
            isValid = false;
        }
    } else {
        const level = form.querySelector('#level').value;
        const strand = form.querySelector('#strand').value;
        const qtr = form.querySelector('#qtr').value;
        
        if (!level || !strand || !qtr) {
            showMessage('Please fill in all required academic fields (Grade Level, Strand, and Quarter).', 'error');
            isValid = false;
        }
    }
    
    if (isValid) {
        await submitBook();
    }
}

// Submit book to API
async function submitBook() {
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData();
        
        formData.append('title', document.getElementById('title').value);
        formData.append('description', document.getElementById('description').value);
        formData.append('quantity', document.getElementById('quantity').value);
        formData.append('publisher', document.getElementById('publisher').value);
        formData.append('bookType', document.getElementById('bookType').value);
        
        const bookType = document.getElementById('bookType').value;
        if (bookType === 'Novel') {
            formData.append('genre', document.getElementById('genre').value);
        } else {
            formData.append('level', document.getElementById('level').value);
            formData.append('strand', document.getElementById('strand').value);
            formData.append('qtr', document.getElementById('qtr').value);
        }
        
        const coverFile = document.getElementById('cover').files[0];
        if (coverFile) {
            formData.append('cover', coverFile);
        }
        
        const response = await fetch(`${API_SERVER}/api/admin/books`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(data.message || 'Book added successfully!', 'success');
            // Reset form
            document.getElementById('addBookForm').reset();
            const coverPreview = document.getElementById('coverPreview');
            if (coverPreview) {
                coverPreview.src = '';
                coverPreview.alt = 'No image selected';
            }
            // Reset field visibility
            toggleFields(document.getElementById('bookType'));
        } else {
            showMessage(data.error || 'Failed to add book. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error submitting book:', error);
        showMessage('Network error. Please check your connection.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Toggle fields based on book type
function toggleFields(select) {
    const form = select.closest('form');
    if (!form) return;
    
    const showNovel = select.value === 'Novel';
    const genreGroup = form.querySelector('#genreGroup');
    const levelGroup = form.querySelector('#levelGroup');
    const qtrGroup = form.querySelector('#qtrGroup');
    const strandGroup = form.querySelector('#strandGroup');
    
    const levelSelect = form.querySelector('#level');
    const qtrSelect = form.querySelector('#qtr');
    const strandSelect = form.querySelector('#strand');
    const genreSelect = form.querySelector('#genre');
    
    if (showNovel) {
        if (genreGroup) genreGroup.style.display = 'block';
        if (levelGroup) levelGroup.style.display = 'none';
        if (qtrGroup) qtrGroup.style.display = 'none';
        if (strandGroup) strandGroup.style.display = 'none';
        
        if (levelSelect) levelSelect.removeAttribute('required');
        if (qtrSelect) qtrSelect.removeAttribute('required');
        if (strandSelect) strandSelect.removeAttribute('required');
        if (genreSelect) genreSelect.setAttribute('required', 'required');
    } else {
        if (genreGroup) genreGroup.style.display = 'none';
        if (levelGroup) levelGroup.style.display = 'block';
        if (qtrGroup) qtrGroup.style.display = 'block';
        if (strandGroup) strandGroup.style.display = 'block';
        
        if (levelSelect) levelSelect.setAttribute('required', 'required');
        if (qtrSelect) qtrSelect.setAttribute('required', 'required');
        if (strandSelect) strandSelect.setAttribute('required', 'required');
        if (genreSelect) genreSelect.removeAttribute('required');
    }
}

// Load books from API
async function loadBooks() {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_SERVER}/api/admin/books`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch books');
        }
        
        const books = await response.json();
        allBooks = books || [];
        filteredBooks = [...allBooks];
        
        displayBooks();
        
    } catch (error) {
        console.error('Error loading books:', error);
        showError('Failed to load books. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Display books in the table
function displayBooks() {
    const tbody = document.getElementById('booksTableBody');
    const noBooksMessage = document.getElementById('noBooksMessage');
    
    if (!tbody || !noBooksMessage) return;
    
    if (filteredBooks.length === 0) {
        tbody.innerHTML = '';
        noBooksMessage.style.display = 'block';
        return;
    }
    
    noBooksMessage.style.display = 'none';
    
    tbody.innerHTML = filteredBooks.map(book => `
        <tr>
            <td>
                ${book.cover ? 
                    `<img src="${API_SERVER}/api/databasecontent/cover/${book.cover}" alt="Book cover" class="book-cover-thumb">` : 
                    '<div class="no-cover">No Cover</div>'
                }
            </td>
            <td>${escapeHtml(book.title)}</td>
            <td>${escapeHtml(book.bookType || 'N/A')}</td>
            <td>${escapeHtml(book.level || 'N/A')}</td>
            <td>${escapeHtml(book.strand || 'N/A')}</td>
            <td>${escapeHtml(book.qtr || 'N/A')}</td>
            <td>${escapeHtml(book.genre || 'N/A')}</td>
            <td>${book.quantity}</td>
            <td>${escapeHtml(book.publisher)}</td>
            <td>
                <button class="action-btn edit-btn" onclick="editBook(${book.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn delete-btn" onclick="deleteBook(${book.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// Filter books based on search and filter criteria
function filterBooks() {
    const searchInput = document.getElementById('searchInput');
    const filterBookType = document.getElementById('filterBookType');
    const filterStrand = document.getElementById('filterStrand');
    const filterLevel = document.getElementById('filterLevel');
    
    if (!searchInput || !filterBookType || !filterStrand || !filterLevel) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const bookType = filterBookType.value;
    const strand = filterStrand.value;
    const level = filterLevel.value;
    
    filteredBooks = allBooks.filter(book => {
        const matchesSearch = !searchTerm || 
            book.title.toLowerCase().includes(searchTerm) ||
            (book.description && book.description.toLowerCase().includes(searchTerm)) ||
            book.publisher.toLowerCase().includes(searchTerm);
            
        const matchesBookType = !bookType || book.bookType === bookType;
        const matchesStrand = !strand || book.strand === strand;
        const matchesLevel = !level || book.level == level;
        
        return matchesSearch && matchesBookType && matchesStrand && matchesLevel;
    });
    
    displayBooks();
}

// Edit book functionality
async function editBook(bookId) {
    try {
        const response = await fetch(`${API_SERVER}/api/admin/books/${bookId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch book details');
        }
        
        const book = await response.json();
        
        // Populate the edit form
        const editBookId = document.getElementById('editBookId');
        const editTitle = document.getElementById('editTitle');
        const editBookType = document.getElementById('editBookType');
        const editLevel = document.getElementById('editLevel');
        const editStrand = document.getElementById('editStrand');
        const editQtr = document.getElementById('editQtr');
        const editGenre = document.getElementById('editGenre');
        const editQuantity = document.getElementById('editQuantity');
        const editPublisher = document.getElementById('editPublisher');
        const editDescription = document.getElementById('editDescription');
        
        if (editBookId) editBookId.value = book.id;
        if (editTitle) editTitle.value = book.title;
        if (editBookType) editBookType.value = book.bookType || 'Module';
        if (editLevel) editBookType.value === 'Module' ? editLevel.value = book.level || '' : editLevel.value = '';
        if (editStrand) editBookType.value === 'Module' ? editStrand.value = book.strand || '' : editStrand.value = '';
        if (editQtr) editBookType.value === 'Module' ? editQtr.value = book.qtr || '' : editQtr.value = '';
        if (editGenre) editBookType.value === 'Novel' ? editGenre.value = book.genre || '' : editGenre.value = '';
        if (editQuantity) editQuantity.value = book.quantity;
        if (editPublisher) editPublisher.value = book.publisher;
        if (editDescription) editDescription.value = book.description || '';
        
        // Show current cover
        const currentCover = document.getElementById('editCurrentCover');
        if (currentCover) {
            if (book.cover) {
                currentCover.src = `${API_SERVER}/api/databasecontent/cover/${book.cover}`;
                currentCover.style.display = 'block';
            } else {
                currentCover.style.display = 'none';
            }
        }
        
        // Toggle fields based on book type
        toggleEditFields(editBookType);
        
        // Show the modal
        const modal = document.getElementById('editModal');
        if (modal) {
            modal.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading book for edit:', error);
        showMessage('Failed to load book details. Please try again.', 'error');
    }
}

// Toggle fields in edit form based on book type
function toggleEditFields(select) {
    const form = select.closest('form');
    if (!form) return;
    
    const showNovel = select.value === 'Novel';
    const genreGroup = form.querySelector('#editGenreGroup');
    const levelGroup = form.querySelector('#editLevelGroup');
    const qtrGroup = form.querySelector('#editQtrGroup');
    const strandGroup = form.querySelector('#editStrandGroup');
    
    if (showNovel) {
        if (genreGroup) genreGroup.style.display = 'block';
        if (levelGroup) levelGroup.style.display = 'none';
        if (qtrGroup) qtrGroup.style.display = 'none';
        if (strandGroup) strandGroup.style.display = 'none';
    } else {
        if (genreGroup) genreGroup.style.display = 'none';
        if (levelGroup) levelGroup.style.display = 'block';
        if (qtrGroup) qtrGroup.style.display = 'block';
        if (strandGroup) strandGroup.style.display = 'block';
    }
}

// Close the edit modal
function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Delete book functionality
async function deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_SERVER}/api/admin/books/${bookId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete book');
        }
        
        // Remove the book from the list
        allBooks = allBooks.filter(book => book.id !== bookId);
        filteredBooks = filteredBooks.filter(book => book.id !== bookId);
        displayBooks();
        
        showMessage('Book deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting book:', error);
        showMessage(error.message || 'Failed to delete book. Please try again.', 'error');
    }
}

// Handle edit form submission
async function handleEditFormSubmission(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const bookId = formData.get('book_id');
    
    try {
        const submitBtn = form.querySelector('.submit-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        submitBtn.disabled = true;
        
        // Handle cover upload if a new file is selected
        let coverFilename = null;
        const coverFile = formData.get('cover');
        if (coverFile && coverFile.size > 0) {
            const coverFormData = new FormData();
            coverFormData.append('cover', coverFile);
            
            const coverResponse = await fetch(`${API_SERVER}/api/admin/books/upload-cover`, {
                method: 'POST',
                body: coverFormData,
                credentials: 'include'
            });
            
            if (coverResponse.ok) {
                const coverData = await coverResponse.json();
                coverFilename = coverData.filename;
            } else {
                const coverError = await coverResponse.json();
                throw new Error(coverError.error || 'Failed to upload cover');
            }
        }
        
        // Convert FormData to JSON for the API
        const bookData = {
            title: formData.get('title'),
            description: formData.get('description') || '',
            quantity: formData.get('quantity'),
            publisher: formData.get('publisher') || '',
            bookType: formData.get('bookType'),
            level: formData.get('level') || '',
            strand: formData.get('strand') || '',
            qtr: formData.get('qtr') || '',
            genre: formData.get('genre') || ''
        };
        
        // Add cover filename if a new one was uploaded
        if (coverFilename) {
            bookData.cover = coverFilename;
        }
        
        const response = await fetch(`${API_SERVER}/api/admin/books/${bookId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookData),
            credentials: 'include'
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to update book');
        }
        
        // Reload the books list
        await loadBooks();
        closeEditModal();
        
        showMessage('Book updated successfully', 'success');
    } catch (error) {
        console.error('Error updating book:', error);
        showMessage(error.message || 'Failed to update book. Please try again.', 'error');
    } finally {
        const submitBtn = form.querySelector('.submit-btn');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Book';
            submitBtn.disabled = false;
        }
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show/hide loading indicator
function showLoading(show) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const booksTable = document.getElementById('booksTable');
    
    if (loadingIndicator) loadingIndicator.style.display = show ? 'flex' : 'none';
    if (booksTable) booksTable.style.display = show ? 'none' : 'table';
}

// Show error message
function showError(message) {
    const tbody = document.getElementById('booksTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; color: #dc2626; padding: 2rem;">
                    <i class="fas fa-exclamation-circle"></i> ${message}
                </td>
            </tr>
        `;
    }
}

// Show message function for success/error notifications
function showMessage(message, type) {
    // Create message element if it doesn't exist
    let messageElement = document.getElementById('messageNotification');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'messageNotification';
        messageElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            max-width: 300px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;
        document.body.appendChild(messageElement);
    }
    
    // Set message content and style
    messageElement.textContent = message;
    messageElement.style.background = type === 'success' ? '#059669' : '#dc2626';
    
    // Show message
    messageElement.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 3000);
}

// Check if admin is logged in
function checkAuthStatus() {
    const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    const admin = JSON.parse(localStorage.getItem('admin') || '{}');
    
    if (isLoggedIn && admin.id) {
        console.log('Admin authenticated:', admin);
        updateUI(admin);
    } else {
        console.log('Admin not authenticated, redirecting to login');
        redirectToLogin();
    }
}

async function logout() {
    try {
        console.log('Logging out...');
        const response = await fetch(`${API_SERVER}/api/admin/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        console.log('Logout response:', response.status);
    } catch (error) {
        console.warn('Logout request failed:', error);
    }
    
    // Clear local storage
    localStorage.removeItem('admin');
    localStorage.removeItem('adminLoggedIn');
    
    // Always redirect regardless of API response
    window.location.href = 'admin_login.html';
}

function updateUI(admin) {
    console.log('Updating UI with admin data:', admin);
    
    // Update welcome message
    const topRight = document.querySelector('.topbar-right');
    if (topRight && admin?.username) {
        topRight.textContent = `Welcome, ${admin.username}`;
    }
    
    // Show dashboard
    const dashboard = document.getElementById('dashboardContent');
    if (dashboard) {
        dashboard.classList.add('visible');
        console.log('Dashboard shown');
    }
}

function redirectToLogin() {
    console.log('Redirecting to login page');
    window.location.href = 'admin_login.html';
}

// Make functions globally available
window.editBook = editBook;
window.deleteBook = deleteBook;
window.closeEditModal = closeEditModal;
window.toggleEditFields = toggleEditFields;
window.toggleFields = toggleFields;