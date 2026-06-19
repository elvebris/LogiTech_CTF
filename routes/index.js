const express = require('express');
const path = require('path');
const db = require('../database');
const router = express.Router();

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

router.get('/tracking', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'tracking.html'));
});

router.get('/tracking/:username', (req, res) => {
  const username = req.params.username;
  
  db.get(
    'SELECT tracking_number, username, status, full_name, email, from_location, to_location, current_location, estimated_date FROM orders WHERE username = ?',
    [username],
    (err, order) => {
      if (err || !order) {
        return res.status(404).sendFile(path.join(__dirname, '../public', '404.html'));
      }
      
      const statusMap = {
        'in_transit': { text: 'В пути', class: 'status-in-transit', icon: 'fa-truck' },
        'delivered': { text: 'Доставлен', class: 'status-delivered', icon: 'fa-check-circle' },
        'pending': { text: 'Ожидает отправки', class: 'status-pending', icon: 'fa-clock' }
      };
      
      const statusInfo = statusMap[order.status] || statusMap['pending'];
      
      const displayNumber = order.tracking_number + '-' + Math.floor(Math.random() * 1000);
      
      const html = `
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Заказ ${order.tracking_number} - LogiTech</title>
            <link rel="stylesheet" href="/css/style.css">
            <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        </head>
        <body>
            <header class="header">
                <nav class="navbar">
                    <div class="container">
                        <div class="nav-content">
                            <div class="logo">
                                <i class="fas fa-shipping-fast"></i>
                                <span>LogiTech</span>
                            </div>
                            <ul class="nav-menu">
                                <li><a href="/">Главная</a></li>
                                <li><a href="/#services">Услуги</a></li>
                                <li><a href="/tracking">Отследить заказ</a></li>
                                <li><a href="/login" class="login-link">
                                    <i class="fas fa-user"></i>
                                    Личный кабинет
                                </a></li>
                            </ul>
                            <button class="mobile-menu-btn">
                                <i class="fas fa-bars"></i>
                            </button>
                        </div>
                    </div>
                </nav>
            </header>

            <section class="page-hero">
                <div class="container">
                    <div class="page-hero-content">
                        <h1>Информация о <span class="gradient-text">заказе</span></h1>
                        <p>Детальная информация о доставке</p>
                    </div>
                </div>
            </section>

            <section class="tracking-section">
                <div class="container">
                    <div class="tracking-card">
                        <div class="tracking-result" style="display: block;">
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
                            
                            <div class="client-info-section">
                                <h3><i class="fas fa-user"></i> Информация о клиенте</h3>
                                <div class="client-info-grid">
                                    <div class="info-card">
                                        <i class="fas fa-user-circle"></i>
                                        <div>
                                            <label>Имя пользователя</label>
                                            <p>${order.username}</p>
                                        </div>
                                    </div>
                                    <div class="info-card">
                                        <i class="fas fa-signature"></i>
                                        <div>
                                            <label>Полное имя</label>
                                            <p>${order.full_name}</p>
                                        </div>
                                    </div>
                                    <div class="info-card">
                                        <i class="fas fa-envelope"></i>
                                        <div>
                                            <label>Email</label>
                                            <p>${order.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="tracking-info-grid">
                                <div class="info-card">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <div>
                                        <label>Откуда</label>
                                        <p>${order.from_location}</p>
                                    </div>
                                </div>
                                <div class="info-card">
                                    <i class="fas fa-arrow-right"></i>
                                    <div>
                                        <label>Куда</label>
                                        <p>${order.to_location}</p>
                                    </div>
                                </div>
                                <div class="info-card">
                                    <i class="fas fa-location-dot"></i>
                                    <div>
                                        <label>Текущее местоположение</label>
                                        <p>${order.current_location}</p>
                                    </div>
                                </div>
                                <div class="info-card">
                                    <i class="fas fa-calendar"></i>
                                    <div>
                                        <label>Ожидаемая дата</label>
                                        <p>${order.estimated_date}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="route-info">
                                <h3><i class="fas fa-route"></i> Маршрут доставки</h3>
                                <div class="route-stats">
                                    <div class="route-stat">
                                        <span class="route-label">Дистанция:</span>
                                        <span class="route-value">${Math.floor(Math.random() * 2000 + 500)} км</span>
                                    </div>
                                    <div class="route-stat">
                                        <span class="route-label">Время в пути:</span>
                                        <span class="route-value">${Math.floor(Math.random() * 14 + 2)} дней</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <script src="/js/main.js"></script>
        </body>
        </html>
      `;
      
      res.send(html);
    }
  );
});


router.post('/api/track', (req, res) => {
  let { trackingNumber } = req.body;
  
  const query = `SELECT tracking_number, username, status, full_name, email, from_location, to_location, current_location, estimated_date FROM orders WHERE tracking_number = '${trackingNumber}'`;
  
  console.log('[DEBUG] SQL Query:', query);
  console.log('[DEBUG] trackingNumber:', trackingNumber);
  
  db.all(query, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.json({ 
        success: false, 
        message: 'Заказ не найден. Проверьте правильность номера.'
      });
    }
    
    if (rows && rows.length > 0) {
      if (rows.length > 1) {
        const allOrders = rows.map(row => ({
          tracking_number: row.tracking_number,
          username: row.username,
          status: row.status,
          from: row.from_location,
          to: row.to_location,
          currentLocation: row.current_location,
          estimatedDelivery: row.estimated_date
        }));
        return res.json({ 
          success: true, 
          multiple: true,
          data: allOrders,
          message: `Найдено ${rows.length} заказов`
        });
      }
      
      const order = rows[0];
      
      let events = [];
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 5);
      
      if (order.status === 'delivered') {
        events = [
          { date: startDate.toISOString().split('T')[0] + ' 09:00', status: 'Отправлен', location: order.from_location },
          { date: new Date(startDate.setDate(startDate.getDate() + 2)).toISOString().split('T')[0] + ' 14:30', status: 'В пути', location: 'Сортировочный центр' },
          { date: new Date(startDate.setDate(startDate.getDate() + 1)).toISOString().split('T')[0] + ' 11:20', status: 'Прибыл в пункт назначения', location: order.to_location },
          { date: new Date(startDate.setDate(startDate.getDate() + 1)).toISOString().split('T')[0] + ' 16:45', status: 'Доставлен получателю', location: order.to_location }
        ];
      } else if (order.status === 'in_transit') {
        events = [
          { date: startDate.toISOString().split('T')[0] + ' 10:00', status: 'Отправлен', location: order.from_location },
          { date: new Date(startDate.setDate(startDate.getDate() + 1)).toISOString().split('T')[0] + ' 08:30', status: 'Прибыл в транзитный пункт', location: order.current_location },
          { date: new Date(startDate.setDate(startDate.getDate() + 1)).toISOString().split('T')[0] + ' 13:15', status: 'Покинул транзитный пункт', location: order.current_location }
        ];
      } else {
        events = [
          { date: startDate.toISOString().split('T')[0] + ' 11:00', status: 'Оформление документов', location: order.from_location },
          { date: new Date(startDate.setDate(startDate.getDate() + 1)).toISOString().split('T')[0] + ' 09:00', status: 'Ожидание отправки', location: order.from_location }
        ];
      }
      
      res.json({ 
        success: true, 
        data: {
          number: order.tracking_number,
          username: order.username,
          status: order.status,
          from: order.from_location,
          to: order.to_location,
          currentLocation: order.current_location,
          estimatedDelivery: order.estimated_date,
          events: events
        }
      });
    } else {
      res.json({ success: false, message: 'Заказ с таким номером не найден' });
    }
  });
});

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'login.html'));
});

router.post('/api/login', (req, res) => {
  const { email, password, remember } = req.body;
  
  if (email === 'client@logitech.ru' && password === '123456') {
    res.json({ 
      success: true, 
      token: 'fake-jwt-token-12345',
      user: { name: 'Иван Петров', email: email }
    });
  } else {
    res.json({ success: false, message: 'Неверный email или пароль' });
  }
});

module.exports = router;