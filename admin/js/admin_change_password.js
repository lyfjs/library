// Change Password Functions
document.addEventListener('DOMContentLoaded', () => {
    setupChangePasswordForm();
});

function setupChangePasswordForm() {
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePasswordSubmit);
    }
}

async function handleChangePasswordSubmit(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Clear previous messages
    hidePasswordMessages();

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        showPasswordMessage('All fields are required.', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showPasswordMessage('New passwords do not match.', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showPasswordMessage('New password must be at least 6 characters long.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_SERVER}/api/admin/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            }),
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            showPasswordMessage(data.message || 'Password changed successfully!', 'success');
            changePasswordForm.reset();
        } else {
            showPasswordMessage(data.error || 'Failed to change password.', 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showPasswordMessage('Network error. Failed to change password.', 'error');
    }
}

function showPasswordMessage(message, type) {
    const messageArea = document.getElementById('passwordMessageArea');
    const successMessage = document.getElementById('passwordSuccessMessage');
    const errorMessage = document.getElementById('passwordErrorMessage');

    if (!messageArea || !successMessage || !errorMessage) return;

    // Hide both messages first
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';

    if (type === 'success') {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
    } else {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    messageArea.style.display = 'block';

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            hidePasswordMessages();
        }, 5000);
    }
}

function hidePasswordMessages() {
    const messageArea = document.getElementById('passwordMessageArea');
    const successMessage = document.getElementById('passwordSuccessMessage');
    const errorMessage = document.getElementById('passwordErrorMessage');

    if (messageArea) messageArea.style.display = 'none';
    if (successMessage) successMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
}

// Expose functions to global scope
window.setupChangePasswordForm = setupChangePasswordForm;





