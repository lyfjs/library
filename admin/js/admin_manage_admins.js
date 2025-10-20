// Admin Management Functions
let allAdmins = [];
let isSuperadmin = false;

// Check if current admin is superadmin and show/hide admins section
async function checkSuperadminStatus() {
    try {
        const response = await fetch(`${appConfig.apiEndpoint}/api/admin/me`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            isSuperadmin = data.superadmin || false;
            
            const adminsNavItem = document.getElementById('adminsNavItem');
            if (adminsNavItem) {
                adminsNavItem.style.display = isSuperadmin ? 'block' : 'none';
            }
        }
    } catch (error) {
        console.error('Error checking superadmin status:', error);
    }
}

// Load all admins
async function loadAdmins() {
    if (!isSuperadmin) return;
    
    try {
        const response = await fetch(`${appConfig.apiEndpoint}/api/admin/admins`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch admins');
        }
        
        const admins = await response.json();
        allAdmins = admins || [];
        
        displayAdmins();
    } catch (error) {
        console.error('Error loading admins:', error);
        showMessage('Failed to load admins. Please try again.', 'error');
    }
}

// Display admins in the table
function displayAdmins() {
    const adminsTableBody = document.getElementById('adminsTableBody');
    const loadingIndicator = document.getElementById('adminsLoadingIndicator');
    const noAdminsMessage = document.getElementById('noAdminsMessage');
    
    if (!adminsTableBody) return;
    
    // Hide loading indicator
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    if (allAdmins.length === 0) {
        adminsTableBody.innerHTML = '';
        if (noAdminsMessage) {
            noAdminsMessage.style.display = 'block';
        }
        return;
    }
    
    if (noAdminsMessage) {
        noAdminsMessage.style.display = 'none';
    }
    
    adminsTableBody.innerHTML = allAdmins.map(admin => `
        <tr>
            <td>${admin.id}</td>
            <td>${escapeHtml(admin.username)}</td>
            <td>
                <span class="badge ${admin.is_superadmin ? 'badge-superadmin' : 'badge-admin'}">
                    ${admin.is_superadmin ? 'Superadmin' : 'Admin'}
                </span>
            </td>
            <td>${escapeHtml(admin.phone_number || '-')}</td>
            <td>${admin.created_at ? formatDate(admin.created_at) : '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editAdmin(${admin.id}, '${escapeHtml(admin.username)}', ${admin.is_superadmin})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    ${admin.id !== getCurrentAdminId() ? 
                        `<button class="action-btn delete-btn" onclick="deleteAdmin(${admin.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>` : 
                        '<span class="text-muted">Current user</span>'
                    }
                </div>
            </td>
        </tr>
    `).join('');
}

// Add new admin
async function addAdmin() {
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    const phoneNumber = (document.getElementById('adminPhoneNumber')?.value || '').trim();
    const isSuperadmin = document.getElementById('adminIsSuperadmin').checked;
    
    if (!username || !password) {
        showMessage('Please fill in all required fields.', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${appConfig.apiEndpoint}/api/admin/admins`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                username: username,
                password: password,
                is_superadmin: isSuperadmin,
                phone_number: phoneNumber || null
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Admin created successfully!', 'success');
            // Clear form
            document.getElementById('adminUsername').value = '';
            document.getElementById('adminPassword').value = '';
            document.getElementById('adminIsSuperadmin').checked = false;
            if (document.getElementById('adminPhoneNumber')) document.getElementById('adminPhoneNumber').value = '';
            // Reload admins
            await loadAdmins();
        } else {
            showMessage(data.error || 'Failed to create admin', 'error');
        }
    } catch (error) {
        console.error('Error creating admin:', error);
        showMessage('Failed to create admin. Please try again.', 'error');
    }
}

// Edit admin (show modal)
function editAdmin(adminId, username, isSuperadmin) {
    // Set the admin ID for the form
    document.getElementById('editAdminId').value = adminId;
    document.getElementById('editAdminUsername').value = username;
    document.getElementById('editAdminIsSuperadmin').checked = isSuperadmin;
    
    // Clear password fields
    document.getElementById('editAdminPassword').value = '';
    document.getElementById('editAdminConfirmPassword').value = '';
    
    // Show the edit modal
    const editModal = document.getElementById('editAdminModal');
    if (editModal) {
        editModal.style.display = 'flex';
    }
}

// Update admin
async function updateAdmin() {
    const adminId = document.getElementById('editAdminId').value;
    const username = document.getElementById('editAdminUsername').value.trim();
    const password = document.getElementById('editAdminPassword').value;
    const confirmPassword = document.getElementById('editAdminConfirmPassword').value;
    const isSuperadmin = document.getElementById('editAdminIsSuperadmin').checked;
    const phoneNumberInput = document.getElementById('editAdminPhoneNumber');
    const phone_number = phoneNumberInput ? phoneNumberInput.value.trim() : '';
    
    if (!username) {
        showMessage('Username is required.', 'error');
        return;
    }
    
    // If password is provided, validate it
    if (password) {
        if (password !== confirmPassword) {
            showMessage('Passwords do not match.', 'error');
            return;
        }
        if (password.length < 6) {
            showMessage('Password must be at least 6 characters long.', 'error');
            return;
        }
    }
    
    try {
    const updateData = {
            username: username,
            is_superadmin: isSuperadmin,
            phone_number: phone_number || null
        };
        
        // Only include password if provided
        if (password) {
            updateData.password = password;
        }
        
        const response = await fetch(`${appConfig.apiEndpoint}/api/admin/admins/${adminId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Admin updated successfully!', 'success');
            closeEditModal();
            await loadAdmins();
        } else {
            showMessage(data.error || 'Failed to update admin', 'error');
        }
    } catch (error) {
        console.error('Error updating admin:', error);
        showMessage('Failed to update admin. Please try again.', 'error');
    }
}

// Close edit modal
function closeEditModal() {
    const editModal = document.getElementById('editAdminModal');
    if (editModal) {
        editModal.style.display = 'none';
    }
}

// Delete admin
async function deleteAdmin(adminId) {
    if (!confirm('Are you sure you want to delete this admin? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${appConfig.apiEndpoint}/api/admin/admins/${adminId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Admin deleted successfully!', 'success');
            await loadAdmins();
        } else {
            showMessage(data.error || 'Failed to delete admin', 'error');
        }
    } catch (error) {
        console.error('Error deleting admin:', error);
        showMessage('Failed to delete admin. Please try again.', 'error');
    }
}

// Get current admin ID from session
function getCurrentAdminId() {
    // This would need to be set when the admin logs in
    // For now, we'll try to get it from a global variable or make another API call
    return window.currentAdminId || null;
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show message
function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.textContent = message;
    
    // Insert at the top of the form card
    const formCard = document.querySelector('.form-card');
    if (formCard) {
        formCard.insertBefore(messageDiv, formCard.firstChild);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Initialize admin management
document.addEventListener('DOMContentLoaded', async function() {
    await checkSuperadminStatus();
    
    // Ensure edit modal is hidden on page load
    const editModal = document.getElementById('editAdminModal');
    if (editModal) {
        editModal.style.display = 'none';
    }
    
    // Set up add admin form
    const addAdminForm = document.getElementById('addAdminForm');
    if (addAdminForm) {
        addAdminForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addAdmin();
        });
    }
    
    // Set up edit admin form
    const editAdminForm = document.getElementById('editAdminForm');
    if (editAdminForm) {
        editAdminForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateAdmin();
        });
    }
    
    // Set up modal close on outside click
    if (editModal) {
        editModal.addEventListener('click', function(e) {
            if (e.target === editModal) {
                closeEditModal();
            }
        });
    }
    
    // Set up escape key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const editModal = document.getElementById('editAdminModal');
            if (editModal && editModal.style.display === 'flex') {
                closeEditModal();
            }
        }
    });
    
    // Load admins if superadmin
    if (isSuperadmin) {
        await loadAdmins();
    }
});

// Make functions globally available
window.deleteAdmin = deleteAdmin;
window.editAdmin = editAdmin;
window.updateAdmin = updateAdmin;
window.closeEditModal = closeEditModal;
