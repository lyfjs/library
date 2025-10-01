/**
 * Advanced Search Engine JavaScript
 * Integrates with the Python searchEngine.py backend
 */


class AdvancedSearchEngine {
    constructor() {
        this.apiEndpoint = appConfig.apiEndpoint;
        this.searchModal = null;
        this.searchInput = null;
        this.searchResults = null;
        this.isSearching = false;
        this.mobileFiltersExpanded = false;
    }

    /**
     * Simple mobile detection
     */
    isMobile() {
        return window.innerWidth <= 768;
    }

    /**
     * Initialize the search engine
     */
    init() {
        this.searchModal = document.getElementById('searchModal');
        this.searchInput = document.getElementById('searchInput');
        this.searchResults = document.getElementById('searchResults');
        
        if (!this.searchModal || !this.searchInput || !this.searchResults) {
            console.error('Search modal elements not found');
            return;
        }

        this.setupEventListeners();
        this.setupSearchForm();
        this.setupMobileFilters();
        this.setupMobileSearchUI();
        this.hideSearchButton();
        this.checkBackendHealth();
    }

    /**
     * Check if backend is healthy
     */
    async checkBackendHealth() {
        try {
            const response = await fetch(`${this.apiEndpoint}/api/health`, {
                method: 'GET',
                credentials: 'include',
                timeout: 5000
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Backend health:', data);
                if (!data.search_engine_available) {
                    console.warn('Search engine not available, using fallback');
                }
            } else {
                console.warn('Backend health check failed');
            }
        } catch (error) {
            console.error('Backend health check error:', error);
        }
    }

    /**
     * Setup event listeners for the search modal
     */
    setupEventListeners() {
        // Search form submission
        const searchForm = this.searchModal.querySelector('.search-form');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performSearch();
            });
        }

        // Search button click
        const searchSubmit = document.getElementById('searchSubmit');
        if (searchSubmit) {
            searchSubmit.addEventListener('click', () => {
                this.performSearch();
            });
        }

        // Enter key in search input
        if (this.searchInput) {
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch();
                }
            });

            // Real-time search suggestions (debounced)
            this.searchInput.addEventListener('input', this.debounce((e) => {
                this.showSearchSuggestions(e.target.value);
            }, 300));
        }

        // Close modal events
        this.setupModalCloseEvents();
    }

    /**
     * Setup modal close event listeners
     */
    setupModalCloseEvents() {
        // Close button
        const closeBtn = document.getElementById('closeSearchModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // Click outside modal
        if (this.searchModal) {
            this.searchModal.addEventListener('click', (e) => {
                if (e.target === this.searchModal) {
                    this.closeModal();
                }
            });
        }

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.searchModal.style.display === 'block') {
                this.closeModal();
            }
        });
    }

    /**
     * Setup search form with enhanced functionality
     */
    setupSearchForm() {
        // Add loading states to buttons
        const searchSubmit = document.getElementById('searchSubmit');
        if (searchSubmit) {
            searchSubmit.addEventListener('click', () => {
                this.setSearchButtonLoading(true);
            });
        }

        // Setup filter change events (align with books.js)
        const filterIds = ['filterBookType', 'filterStrand', 'filterGenre', 'filterlevel'];
        filterIds.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => {
                    this.updateSearchPreview();
                });
            }
        });

        // We no longer wire other checkbox options here to match books.js
    }

    /**
     * Perform the advanced search
     */
    async performSearch() {
        if (this.isSearching) return;

        const query = this.searchInput.value.trim();
        if (!query) {
            this.showError('Please enter a search term');
            return;
        }

        this.isSearching = true;
        this.setSearchButtonLoading(true);
        this.showLoadingState();

        try {
            const searchParams = this.buildSearchParams();
            console.log('Search params:', searchParams.toString());
            
            const response = await this.fetchSearchResults(searchParams);
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            const data = await response.json();
            console.log('Search response:', data);
            this.displaySearchResults(data);
            
        } catch (error) {
            console.error('Search error:', error);
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                this.showError('Cannot connect to server. Please check if the backend is running.');
            } else if (error.message.includes('timeout')) {
                this.showError('Request timed out. Please try again.');
            } else {
                this.showError('Network error. Please try again.');
            }
        } finally {
            this.isSearching = false;
            this.setSearchButtonLoading(false);
        }
    }

    /**
     * Build search parameters from form
     */
    buildSearchParams() {
        const params = new URLSearchParams();
        
        // Main search query
        const query = this.searchInput.value.trim();
        if (query) params.append('q', query);

        // Align filters with books.js
        const bookType = document.getElementById('filterBookType')?.value;
        if (bookType) params.append('bookType', bookType);

        const strand = document.getElementById('filterStrand')?.value;
        if (strand) params.append('strand', strand);

        const genre = document.getElementById('filterGenre')?.value;
        if (genre) params.append('genre', genre);

        const level = document.getElementById('filterlevel')?.value;
        if (level) params.append('level', level);

        return params;
    }

    /**
     * Fetch search results from the API
     */
    async fetchSearchResults(params) {
        const url = `${this.apiEndpoint}/api/search?${params.toString()}`;
        console.log('Searching URL:', url);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                timeout: 10000 // 10 second timeout
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    /**
     * Display search results
     */
    displaySearchResults(data) {
        if (!data.success || !data.books || data.books.length === 0) {
            this.showNoResults(data.message || data.explanation || 'No books found');
            return;
        }

        const resultsHTML = this.generateResultsHTML(data.books, data.total);
        this.searchResults.innerHTML = resultsHTML;
        this.searchResults.style.display = 'block';

        // Add click handlers for result items
        this.setupResultClickHandlers();
    }

    /**
     * Generate HTML for search results
     */
    generateResultsHTML(books, total) {
        const resultsHeader = `
            <div class="search-results-header" style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e1e5e9;">
                <h3 style="margin: 0; color: #333; font-size: 18px;">Search Results</h3>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Found ${total} book(s)</p>
            </div>
        `;

        const booksHTML = books.map(book => this.generateBookCardHTML(book)).join('');
        
        return resultsHeader + booksHTML;
    }

    /**
     * Generate HTML for individual book card
     */
    generateBookCardHTML(book) {
        const availability = book.quantity > 0 ? 
            `<span style="color: #51cf66; font-weight: 500;">Available (${book.quantity})</span>` : 
            `<span style="color: #ff6b6b; font-weight: 500;">Not Available</span>`;

        const metaInfo = [];
        if (book.bookType) metaInfo.push(book.bookType);
        if (book.level) metaInfo.push(`Grade ${book.level}`);
        if (book.strand) metaInfo.push(book.strand);
        if (book.genre) metaInfo.push(book.genre);

        const mobile = this.isMobile();

        if (mobile) {
            // Mobile-first: stacked, full-width cover and maximized space
            return `
                <div class="search-result-item" style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-bottom: 12px; background: #fff; display: flex; flex-direction: column; gap: 12px; width: 100%;">
                    <div class="book-cover" style="width: 100%; height: 180px; border-radius: 8px; background: linear-gradient(135deg,rgb(159,159,159) 0%, rgb(135,135,135) 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: 700;">
                        ${book.title ? book.title.charAt(0).toUpperCase() : 'B'}
                    </div>
                    <div class="book-info" style="display: flex; flex-direction: column; gap: 6px;">
                        <div class="request-title" style="font-weight: 600; font-size: 18px; color: #111827;">${book.title || 'Untitled'}</div>
                        <div style="color: #6b7280; font-size: 13px;">by ${book.author || 'Unknown Author'}</div>
                        ${metaInfo.length > 0 ? `<div class="request-badges" style="display:flex;gap:6px;flex-wrap:wrap;">${metaInfo.map(mi => `<span class=\"badge\" style=\"display:inline-block;font-size:12px;border-radius:3px;padding:2px 8px;border:1px solid #e5e7eb;background:#f9fafb;width:max-content;\">${mi}</span>`).join('')}</div>` : ''}
                        <div style="color:#374151; font-size: 13px; line-height: 1.5;">
                            ${book.description ? this.truncateText(book.description, 120) : 'No description available'}
                        </div>
                        <div style="display:flex; justify-content: space-between; align-items:center; margin-top: 4px;">
                            <span style="color:#9ca3af; font-size: 12px;">ID: ${book.id}</span>
                            ${availability}
                        </div>
                    </div>
                </div>
            `;
        }

        // Desktop/tablet: side-by-side cover and details
        const coverW = 80;
        const coverH = 100;
        return `
            <div class="search-result-item" style="position: relative; border: 1px solid #e1e5e9; border-radius: 12px; padding: 14px; margin-bottom: 12px; background: #f8f9fa; transition: all 0.3s ease; cursor: pointer;" data-book-id="${book.id}">
                <div style="display: flex; gap: 16px; align-items: flex-start;">
                    <div class="book-cover" style="width: ${coverW}px; height: ${coverH}px; background: linear-gradient(135deg,rgb(159, 159, 159) 0%,rgb(135, 135, 135) 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; flex-shrink: 0; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                        ${book.title ? book.title.charAt(0).toUpperCase() : 'B'}
                    </div>
                    <div class="book-info" style="flex: 1;">
                        <h4 style="margin: 0 0 6px 0; color: #333; font-size: 18px; font-weight: 600;">${book.title || 'Untitled'}</h4>
                        <p style="margin: 0 0 6px 0; color: #666; font-size: 15px;">by ${book.author || 'Unknown Author'}</p>
                        ${metaInfo.length > 0 ? `<p style=\"margin: 0 0 6px 0; color: #888; font-size: 13px;\">${metaInfo.join(' • ')}</p>` : ''}
                        <p style="margin: 0 0 6px 0; color: #555; font-size: 14px; line-height: 1.4;">${book.description ? this.truncateText(book.description, 150) : 'No description available'}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                            <span style="color: #888; font-size: 12px;">ID: ${book.id}</span>
                            ${availability}
                        </div>
                    </div>
                </div>
                <div style="position: absolute; top: 10px; right: 10px; opacity: 0; transition: opacity 0.3s ease;">
                    <i class="fas fa-eye" style="color: #667eea; font-size: 16px;"></i>
                </div>
            </div>
        `;
    }

    /**
     * Setup click handlers for result items
     */
    setupResultClickHandlers() {
        const resultItems = this.searchResults.querySelectorAll('.search-result-item');
        resultItems.forEach(item => {
            item.addEventListener('click', () => {
                const bookId = item.dataset.bookId;
                this.viewBookDetails(bookId);
            });

            // Add hover effects
            item.addEventListener('mouseenter', () => {
                item.style.transform = 'translateY(-2px)';
                item.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
                item.style.borderColor = '#667eea';
                
                // Show view icon
                const viewIcon = item.querySelector('.fa-eye');
                if (viewIcon) {
                    viewIcon.parentElement.style.opacity = '1';
                }
            });

            item.addEventListener('mouseleave', () => {
                item.style.transform = 'translateY(0)';
                item.style.boxShadow = 'none';
                item.style.borderColor = '#e1e5e9';
                
                // Hide view icon
                const viewIcon = item.querySelector('.fa-eye');
                if (viewIcon) {
                    viewIcon.parentElement.style.opacity = '0';
                }
            });
        });
    }

    /**
     * View book details by redirecting to books.html
     */
    viewBookDetails(bookId) {
        console.log('Redirecting to books page for book ID:', bookId);
        window.location.href = `books.html?book=${bookId}`;
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const mobile = this.isMobile();
        const pad = mobile ? 24 : 40;
        const spinner = mobile ? 32 : 40;
        const border = mobile ? 3 : 4;
        const text = mobile ? 14 : 16;
        this.searchResults.innerHTML = `
            <div style="text-align: center; padding: ${pad}px; color: #666;">
                <div style="display: inline-block; width: ${spinner}px; height: ${spinner}px; border: ${border}px solid #f3f3f3; border-top: ${border}px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 12px; font-size: ${text}px;">Searching with AI-powered engine...</p>
            </div>
        `;
        this.searchResults.style.display = 'block';
    }

    /**
     * Show error message
     */
    showError(message) {
        const mobile = this.isMobile();
        const pad = mobile ? 24 : 40;
        const icon = mobile ? 36 : 48;
        const text = mobile ? 14 : 16;
        this.searchResults.innerHTML = `
            <div style="text-align: center; padding: ${pad}px; color: #ff6b6b;">
                <div style="font-size: ${icon}px; margin-bottom: 12px;">⚠️</div>
                <p style="font-size: ${text}px; margin: 0;">${message}</p>
            </div>
        `;
        this.searchResults.style.display = 'block';
    }

    /**
     * Show no results message
     */
    showNoResults(message) {
        const mobile = this.isMobile();
        const pad = mobile ? 24 : 40;
        const icon = mobile ? 36 : 48;
        const text = mobile ? 14 : 16;
        const sub = mobile ? 12 : 14;
        this.searchResults.innerHTML = `
            <div style="text-align: center; padding: ${pad}px; color: #666;">
                <div style="font-size: ${icon}px; margin-bottom: 12px;">📚</div>
                <p style="font-size: ${text}px; margin: 0;">${message}</p>
                <p style="font-size: ${sub}px; margin: 8px 0 0 0; color: #888;">Try different keywords or check your spelling</p>
            </div>
        `;
        this.searchResults.style.display = 'block';
    }

    /**
     * Set search button loading state
     */
    setSearchButtonLoading(loading) {
        const searchSubmit = document.getElementById('searchSubmit');
        if (searchSubmit) {
            if (loading) {
                searchSubmit.innerHTML = 'Searching...';
                searchSubmit.disabled = true;
                searchSubmit.style.opacity = '0.7';
            } else {
                searchSubmit.innerHTML = 'Search';
                searchSubmit.disabled = false;
                searchSubmit.style.opacity = '1';
            }
        }
    }

    /**
     * Update search preview (for real-time feedback)
     */
    updateSearchPreview() {
        // This could show a preview of what will be searched
        // For now, we'll just update the search button state
    }

    /**
     * Show search suggestions (placeholder for future enhancement)
     */
    showSearchSuggestions(query) {
        // This could show autocomplete suggestions
        // For now, it's a placeholder for future enhancement
    }

    /**
     * Close the search modal
     */
    closeModal() {
        if (this.searchModal) {
            this.searchModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    /**
     * Utility function to truncate text
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Debounce utility function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Setup a Filters dropdown on mobile that hides/shows filter controls
     */
    setupMobileFilters() {
        if (!this.isMobile()) return;

        // Identify likely filter elements by id (restore original functionality)
        const filterIds = ['categoryFilter', 'authorFilter', 'yearFilter', 'exactMatch', 'includeDescription', 'availableOnly'];
        const filterElements = filterIds
            .map(id => document.getElementById(id))
            .filter(el => !!el);
        if (filterElements.length === 0) return;

        // Try to find a common container (search form or search controls area)
        const searchForm = this.searchModal.querySelector('.search-form') || this.searchModal;

        // Create toggle button container
        let toggleBar = this.searchModal.querySelector('#mobileFiltersToggleBar');
        if (!toggleBar) {
            toggleBar = document.createElement('div');
            toggleBar.id = 'mobileFiltersToggleBar';
            toggleBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin:10px 0;gap:8px;';

            const title = document.createElement('div');
            title.textContent = 'Filters';
            title.style.cssText = 'font-weight:600;color:#333;font-size:14px;';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.id = 'mobileFiltersToggleBtn';
            btn.textContent = 'Show';
            btn.style.cssText = 'padding:8px 12px;border:1px solid #e1e5e9;border-radius:8px;background:#fff;color:#333;font-size:13px;';

            btn.addEventListener('click', () => {
                this.mobileFiltersExpanded = !this.mobileFiltersExpanded;
                btn.textContent = this.mobileFiltersExpanded ? 'Hide' : 'Show';
                // Toggle visibility of each filter's nearest visible container
                filterElements.forEach(el => {
                    const container = el.closest('.search-group') || el.closest('div') || el;
                    if (container) container.style.display = this.mobileFiltersExpanded ? '' : 'none';
                });
            });

            toggleBar.appendChild(title);
            toggleBar.appendChild(btn);

            // Insert toggle bar at the top of the form/modal content
            searchForm.parentNode.insertBefore(toggleBar, searchForm);
        }

        // Collapse filters by default on mobile
        filterElements.forEach(el => {
            const container = el.closest('.search-group') || el.closest('div') || el;
            if (container) container.style.display = 'none';
        });
        this.mobileFiltersExpanded = false;
    }

    /**
     * Make the main search input smaller on mobile (icon button removed)
     */
    setupMobileSearchUI() {
        if (!this.isMobile()) return;
        try {
            const searchForm = this.searchModal.querySelector('.search-form') || this.searchModal;
            const searchInput = this.searchInput;
            
            if (searchInput) {
                searchInput.style.height = '36px';
                searchInput.style.fontSize = '14px';
                searchInput.style.padding = '6px 10px';
                searchInput.placeholder = 'Search';
            }
            
            // Tighten spacing
            if (searchForm) {
                const row = searchForm.querySelector('.search-row') || searchForm;
                row.style.gap = '8px';
            }
        } catch (e) {
            console.warn('Mobile search UI setup failed:', e);
        }
    }

    /**
     * Hide the explicit search button if present
     */
    hideSearchButton() {
        const btn = document.getElementById('searchSubmit');
        if (btn) {
            btn.style.display = 'none';
        }
    }
}

// Initialize the search engine when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const searchEngine = new AdvancedSearchEngine();
    searchEngine.init();
    
    // Make it globally available for the existing index.js
    window.advancedSearchEngine = searchEngine;
});

// Add CSS animation for loading spinner
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    /* Maximize modal and content width */
    #searchModal { width: 100vw; height: 100vh; box-sizing: border-box; }
    #searchModal .search-modal-content, 
    #searchModal .modal-content { width: 100%; max-width: 1100px; margin: 0 auto; }
    #searchResults { width: 100%; max-width: 1100px; margin: 0 auto; }

    /* Reduce padding on cards globally */
    .search-result-item { padding: 14px; }

    /* Mobile */
    @media (max-width: 768px) {
        #searchModal { padding: 8px !important; }
        #searchModal .search-results-header h3 { font-size: 16px !important; }
        #searchModal .search-results-header p { font-size: 12px !important; }
        .search-result-item { padding: 12px !important; margin-bottom: 12px !important; border-radius: 10px !important; background: #fff !important; border-color: #e5e7eb !important; }
        #searchModal .search-form input[type="text"],
        #searchModal .search-form input[type="search"] { height: 36px !important; font-size: 14px !important; padding: 6px 10px !important; }
        #searchSubmit { display: none !important; }
    }

    /* Desktop/tablet */
    @media (min-width: 769px) {
        #searchModal { padding: 16px; }
        .search-result-item > div { display: flex; }
    }
`;
document.head.appendChild(style);
