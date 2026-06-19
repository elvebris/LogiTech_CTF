const loginForm = document.getElementById('loginForm');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

if (togglePassword) {
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.querySelector('i').classList.toggle('fa-eye');
        togglePassword.querySelector('i').classList.toggle('fa-eye-slash');
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;
        
        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, remember })
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (remember) {
                    localStorage.setItem('authToken', result.token);
                    localStorage.setItem('user', JSON.stringify(result.user));
                } else {
                    sessionStorage.setItem('authToken', result.token);
                    sessionStorage.setItem('user', JSON.stringify(result.user));
                }
                
                showNotification('Успешный вход! Перенаправление...', 'success');
                
                setTimeout(() => {
                    window.location.href = '/account';
                }, 1500);
            } else {
                showNotification(result.message, 'error');
                shakeForm();
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Ошибка при входе в систему', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

function shakeForm() {
    const form = document.querySelector('.login-card');
    form.classList.add('shake');
    setTimeout(() => {
        form.classList.remove('shake');
    }, 500);
}

function showNotification(message, type) {
    let notification = document.querySelector('.notification-toast');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification-toast';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = `notification-toast ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
if (token && window.location.pathname === '/login') {
    window.location.href = '/account';
}