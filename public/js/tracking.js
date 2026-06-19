const trackBtn = document.getElementById('trackBtn');
const trackingInput = document.getElementById('trackingNumber');
const trackingResult = document.getElementById('trackingResult');

const statusMap = {
    'in_transit': { text: 'В пути', class: 'status-in-transit', icon: 'fa-truck' },
    'delivered': { text: 'Доставлен', class: 'status-delivered', icon: 'fa-check-circle' },
    'pending': { text: 'Ожидает отправки', class: 'status-pending', icon: 'fa-clock' }
};

function displayMultipleResults(orders) {
    let listHtml = `
        <div class="result-header">
            <div class="tracking-number">
                <i class="fas fa-database"></i>
                <span>Результаты поиска: <strong>${orders.length} заказов</strong></span>
            </div>
        </div>
        <div class="results-list">
    `;
    
    orders.forEach((order, index) => {
        const statusInfo = statusMap[order.status] || statusMap['pending'];
        
        // ген. трек номера
        const displayNumber = order.tracking_number + '-' + Math.floor(Math.random() * 9000 + 1000);
        
        listHtml += `
            <div class="list-item">
                <div class="list-item-number">${index + 1}</div>
                <div class="list-item-content">
                    <div class="list-item-row">
                        <span class="list-label">
                            <i class="fas fa-barcode"></i> Трекинг номер:
                        </span>
                        <span class="list-value tracking-code">${displayNumber}</span>
                    </div>
                    <div class="list-item-row">
                        <span class="list-label">
                            <i class="fas fa-user"></i> Имя пользователя:
                        </span>
                        <span class="list-value">${order.username}</span>
                    </div>
                    <div class="list-item-row">
                        <span class="list-label">
                            <i class="fas fa-truck"></i> Статус заказа:
                        </span>
                        <span class="list-value">
                            <span class="status-badge ${statusInfo.class}" style="padding: 4px 12px; font-size: 12px;">
                                <i class="fas ${statusInfo.icon}"></i>
                                ${statusInfo.text}
                            </span>
                        </span>
                    </div>
                </div>
            </div>
        `;
    });
    
    listHtml += `</div>`;
    trackingResult.innerHTML = listHtml;
    trackingResult.style.display = 'block';
    trackingResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function displayTrackingResult(data) {
    const statusInfo = statusMap[data.status] || statusMap['pending'];
    
    const displayNumber = data.number + '-' + Math.floor(Math.random() * 9000 + 1000);
    
    const eventsHtml = (data.events || []).map(event => `
        <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <div class="timeline-date">${event.date}</div>
                <div class="timeline-status">${event.status}</div>
                <div class="timeline-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${event.location}
                </div>
            </div>
        </div>
    `).join('');
    
    trackingResult.innerHTML = `
        <div class="result-header">
            <div class="tracking-number">
                <i class="fas fa-barcode"></i>
                <span>Номер заказа: <strong>${displayNumber}</strong></span>
            </div>
            <div class="status-badge ${statusInfo.class}">
                <i class="fas ${statusInfo.icon}"></i>
                ${statusInfo.text}
            </div>
        </div>
        
        <div class="tracking-info-grid">
            <div class="info-card">
                <i class="fas fa-map-marker-alt"></i>
                <div>
                    <label>Откуда</label>
                    <p>${data.from}</p>
                </div>
            </div>
            <div class="info-card">
                <i class="fas fa-arrow-right"></i>
                <div>
                    <label>Куда</label>
                    <p>${data.to}</p>
                </div>
            </div>
            <div class="info-card">
                <i class="fas fa-location-dot"></i>
                <div>
                    <label>Текущее местоположение</label>
                    <p>${data.currentLocation}</p>
                </div>
            </div>
            <div class="info-card">
                <i class="fas fa-calendar"></i>
                <div>
                    <label>Ожидаемая дата</label>
                    <p>${data.estimatedDelivery}</p>
                </div>
            </div>
        </div>
        
        <div class="timeline-section">
            <h3><i class="fas fa-history"></i> История перемещений</h3>
            <div class="timeline">
                ${eventsHtml}
            </div>
        </div>
        
        <div class="route-info">
            <h3><i class="fas fa-route"></i> Информация о маршруте</h3>
            <div class="route-stats">
                <div class="route-stat">
                    <span class="route-label">Статус доставки:</span>
                    <span class="route-value">${data.status === 'delivered' ? '✅ Завершен' : '🔄 В процессе'}</span>
                </div>
                ${data.status === 'delivered' ? `
                <div class="route-stat">
                    <span class="route-label">Пункт завершения:</span>
                    <span class="route-value">${data.to}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    trackingResult.style.display = 'block';
    trackingResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function trackOrder() {
    const trackingNumber = trackingInput.value.trim();
    
    if (!trackingNumber) {
        showNotification('Пожалуйста, введите номер заказа', 'error');
        return;
    }
    
    trackBtn.disabled = true;
    trackBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Поиск...';
    
    try {
        const response = await fetch('/api/track', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ trackingNumber })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (result.multiple) {
                displayMultipleResults(result.data);
                showNotification(result.message, 'success');
            } else {
                displayTrackingResult(result.data);
                showNotification('Заказ найден!', 'success');
            }
        } else {
            showNotification(result.message, 'error');
            trackingResult.style.display = 'none';
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Ошибка при поиске заказа', 'error');
    } finally {
        trackBtn.disabled = false;
        trackBtn.innerHTML = '<i class="fas fa-search"></i> Отследить';
    }
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

trackBtn.addEventListener('click', trackOrder);
trackingInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') trackOrder();
});

document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        trackingInput.value = btn.dataset.number;
        trackOrder();
    });
});