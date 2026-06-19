let currentUser = null;
let currentOrders = [];

// данные аккаунта
async function loadAccountData() {
    try {
        const response = await fetch('/api/account');
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        
        const data = await response.json();
        currentUser = data.user;
        currentOrders = data.orders;
        
        updateUserProfile();
        updateProfileTab();
        displayOrders();
        
        if (currentUser.role === 'admin') {
            showAdminPanel();
            loadAdminUsers();
            loadAdminOrders();
        }
        
        initNavigation();
        
    } catch (error) {
        console.error('Error loading account:', error);
    }
}

function updateUserProfile() {
    document.getElementById('userName').textContent = currentUser.full_name;
    document.getElementById('userEmail').textContent = currentUser.email;
    
    const roleBadge = document.getElementById('userRole');
    roleBadge.textContent = currentUser.role === 'admin' ? 'Администратор' : 'Клиент';
    roleBadge.className = `user-badge ${currentUser.role}`;
}

function updateProfileTab() {
    document.getElementById('profileFullName').textContent = currentUser.full_name;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileRole').textContent = currentUser.role === 'admin' ? 'Администратор' : 'Клиент';
    document.getElementById('profileDate').textContent = new Date().toLocaleDateString('ru-RU');
}

function displayOrders() {
    const ordersList = document.getElementById('ordersList');
    
    if (currentOrders.length === 0) {
        ordersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>У вас пока нет заказов</p>
            </div>
        `;
        return;
    }
    
    const statusMap = {
        'in_transit': { text: 'В пути', class: 'status-in-transit' },
        'delivered': { text: 'Доставлен', class: 'status-delivered' },
        'pending': { text: 'Ожидает отправки', class: 'status-pending' }
    };
    
    ordersList.innerHTML = currentOrders.map(order => {
        const statusInfo = statusMap[order.status] || statusMap['pending'];
        const displayNumber = order.tracking_number + '-' + Math.floor(Math.random() * 9000 + 1000);
        
        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <span class="order-number">
                        <i class="fas fa-barcode"></i> ${displayNumber}
                    </span>
                    <span class="status-badge-small ${statusInfo.class}">
                        ${statusInfo.text}
                    </span>
                </div>
                <div class="order-details">
                    <div class="order-detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${order.from_location} → ${order.to_location}</span>
                    </div>
                    <div class="order-detail">
                        <i class="fas fa-location-dot"></i>
                        <span>Текущее: ${order.current_location}</span>
                    </div>
                    <div class="order-detail">
                        <i class="fas fa-calendar"></i>
                        <span>Доставка: ${order.estimated_date}</span>
                    </div>
                </div>
                <div class="order-expand">
                    <div class="order-timeline">
                        <h4>История перемещений</h4>
                        <div class="timeline-mini">
                            <div class="timeline-item-mini">
                                <div class="timeline-dot-mini"></div>
                                <div>Отправлен из ${order.from_location}</div>
                            </div>
                            <div class="timeline-item-mini">
                                <div class="timeline-dot-mini"></div>
                                <div>Прибыл в ${order.current_location}</div>
                            </div>
                            ${order.status === 'delivered' ? `
                            <div class="timeline-item-mini">
                                <div class="timeline-dot-mini"></div>
                                <div>Доставлен в ${order.to_location}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // карточки
    document.querySelectorAll('.order-card').forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('expanded');
        });
    });
}

function initNavigation() {
    const navLinks = document.querySelectorAll('.account-nav .nav-link');
    const chatLink = document.querySelector('.account-nav a[href="/chat"]');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') && link.getAttribute('href') !== '#') {
            link.addEventListener('click', (e) => {
            });
        } else if (link.getAttribute('href') === '#') {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.dataset.tab;
                
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                document.getElementById(`${tab}Tab`).classList.add('active');
            });
        }
    });
    
    if (chatLink) {
        console.log('Chat link found:', chatLink.getAttribute('href'));
    }
}

async function showAdminPanel() {
    document.getElementById('adminPanel').style.display = 'block';
async function showAdminPanel() {
    document.getElementById('adminPanel').style.display = 'block';
    
    const adminTabs = document.querySelector('.admin-tabs');
    if (adminTabs && !document.querySelector('.admin-tab-btn[data-admin-tab="files"]')) {
        const filesTabBtn = document.createElement('button');
        filesTabBtn.className = 'admin-tab-btn';
        filesTabBtn.setAttribute('data-admin-tab', 'files');
        filesTabBtn.innerHTML = '<i class="fas fa-folder-open"></i> Файлы';
        filesTabBtn.onclick = () => {
            window.location.href = '/admin/files';
        };
        adminTabs.appendChild(filesTabBtn);
    }
}
}

async function loadAdminUsers() {
    try {
        const response = await fetch('/api/users');
        const data = await response.json();
        
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = data.users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.email}</td>
                <td>${user.full_name}</td>
                <td><span class="user-badge ${user.role}">${user.role === 'admin' ? 'Админ' : 'Пользователь'}</span></td>
                <td>${new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadAdminOrders() {
    try {
        const response = await fetch('/api/admin/orders');
        const data = await response.json();
        
        const ordersList = document.getElementById('adminOrdersList');
        ordersList.innerHTML = data.orders.map(order => `
            <tr data-order-id="${order.id}">
                <td>${order.id}</td>
                <td><strong>${order.tracking_number}</strong></td>
                <td>${order.full_name}</td>
                <td>
                    <select class="status-select" data-order-id="${order.id}">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Ожидает отправки</option>
                        <option value="in_transit" ${order.status === 'in_transit' ? 'selected' : ''}>В пути</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Доставлен</option>
                    </select>
                </td>
                <td>${order.from_location}</td>
                <td>${order.to_location}</td>
                <td>
                    <button class="update-status-btn" data-order-id="${order.id}">
                        <i class="fas fa-save"></i> Обновить
                    </button>
                </td>
            </tr>
        `).join('');
        
        document.querySelectorAll('.update-status-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const orderId = btn.dataset.orderId;
                const select = document.querySelector(`.status-select[data-order-id="${orderId}"]`);
                const newStatus = select.value;
                await updateOrderStatus(orderId, newStatus);
            });
        });
    } catch (error) {
        console.error('Error loading admin orders:', error);
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`/api/admin/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, current_location: 'Обновлено' })
        });
        
        if (response.ok) {
            showNotification('Статус заказа обновлен', 'success');
            loadAdminOrders();
            loadAccountData();
        }
    } catch (error) {
        console.error('Error updating order:', error);
        showNotification('Ошибка при обновлении', 'error');
    }
}

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
});

document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.adminTab;
        
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.admin-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.getElementById(`admin${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`).classList.add('active');
    });
});

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

loadAccountData();
