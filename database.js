const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'logitech.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // заказы
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracking_number TEXT UNIQUE,
      username TEXT,
      status TEXT,
      full_name TEXT,
      email TEXT,
      from_location TEXT,
      to_location TEXT,
      current_location TEXT,
      estimated_date TEXT
    )
  `);

  // пользователи (ТОЛЬКО ОБЫЧНЫЕ ПОЛЬЗОВАТЕЛИ)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      full_name TEXT,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // АДМИНИСТРАТОРЫ (ОТДЕЛЬНАЯ ТАБЛИЦА)
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      full_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // сброс пароля (для обычных пользователей)
  db.run(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      reset_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      used INTEGER DEFAULT 0
    )
  `);

  // сброс пароля для админов
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      reset_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      used INTEGER DEFAULT 0
    )
  `);

  // Очистка
  db.run(`DELETE FROM orders`);
  db.run(`DELETE FROM users`);
  db.run(`DELETE FROM admins`);
  db.run(`DELETE FROM password_resets`);
  db.run(`DELETE FROM admin_password_resets`);

  // ===== ЗАКАЗЫ =====
  const orders = [
    {
      tracking_number: 'LOG123456',
      username: 'ivan_petrov',
      status: 'in_transit',
      full_name: 'Иван Петров',
      email: '1vaaN_Petr@logitech.ru',
      from_location: 'Москва, Россия',
      to_location: 'Берлин, Германия',
      current_location: 'Варшава, Польша',
      estimated_date: '2026-04-28'
    },
    {
      tracking_number: 'LOG789012',
      username: 'elena_smirnova',
      status: 'delivered',
      full_name: 'Елена Смирнова',
      email: '3lenAaSmirn0va@logitech.ru',
      from_location: 'Санкт-Петербург, Россия',
      to_location: 'Париж, Франция',
      current_location: 'Париж, Франция',
      estimated_date: '2026-04-23'
    },
    {
      tracking_number: 'LOG345678',
      username: 'alex_kozlov',
      status: 'pending',
      full_name: 'Алексей Козлов',
      email: 'KozLOVEaleX@logitech.ru',
      from_location: 'Новосибирск, Россия',
      to_location: 'Пекин, Китай',
      current_location: 'Новосибирск, Россия',
      estimated_date: '2026-05-05'
    },
    {
      tracking_number: 'LOG901234',
      username: 'maria_volkova',
      status: 'in_transit',
      full_name: 'Мария Волкова',
      email: 'LadyMaryV0lk0va@logitech.ru',
      from_location: 'Екатеринбург, Россия',
      to_location: 'Дубай, ОАЭ',
      current_location: 'Москва, Россия',
      estimated_date: '2026-04-30'
    },
    {
      tracking_number: 'LOG567890',
      username: 'dmitry_sokolov',
      status: 'delivered',
      full_name: 'Дмитрий Соколов',
      email: 'S0koloffDmitry@logitech.ru',
      from_location: 'Казань, Россия',
      to_location: 'Стамбул, Турция',
      current_location: 'Стамбул, Турция',
      estimated_date: '2026-04-21'
    }
  ];

  const insertOrderStmt = db.prepare(`
    INSERT INTO orders (tracking_number, username, status, full_name, email, from_location, to_location, current_location, estimated_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  orders.forEach(order => {
    insertOrderStmt.run(
      order.tracking_number,
      order.username,
      order.status,
      order.full_name,
      order.email,
      order.from_location,
      order.to_location,
      order.current_location,
      order.estimated_date
    );
  });

  insertOrderStmt.finalize();

  // ===== ОБЫЧНЫЕ ПОЛЬЗОВАТЕЛИ (БЕЗ АДМИНА) =====
  const users = [
    { email: '1vaaN_Petr@logitech.ru', full_name: 'Иван Петров', password: 'am(aP7WzGzV[5^' },
    { email: '3lenAaSmirn0va@logitech.ru', full_name: 'Елена Смирнова', password: 't^p=eH=,Cam1kQP' },
    { email: 'KozLOVEaleX@logitech.ru', full_name: 'Алексей Козлов', password: '7?0Cj0Ch1,YW*b' },
    { email: 'LadyMaryV0lk0va@logitech.ru', full_name: 'Мария Волкова', password: 'qwerty123' },
    { email: 'S0koloffDmitry@logitech.ru', full_name: 'Дмитрий Соколов', password: '9)9eDrK$eXmy}*$' }
  ];

  const insertUserStmt = db.prepare(`
    INSERT INTO users (email, password, full_name) VALUES (?, ?, ?)
  `);

  users.forEach(user => {
    const hashedPassword = bcrypt.hashSync(user.password, 10);
    insertUserStmt.run(user.email, hashedPassword, user.full_name);
  });

  insertUserStmt.finalize();

  // ===== АДМИНИСТРАТОР (ОТДЕЛЬНАЯ ТАБЛИЦА) =====
  const admins = [
    { email: 'Alyssia567Administration@logitech.ru', full_name: 'Администратор', password: 'HMWD%k7=1AY#yonDS~ajbCb;t${?lE' }
  ];

  const insertAdminStmt = db.prepare(`
    INSERT INTO admins (email, password, full_name) VALUES (?, ?, ?)
  `);

  admins.forEach(admin => {
    const hashedPassword = bcrypt.hashSync(admin.password, 10);
    insertAdminStmt.run(admin.email, hashedPassword, admin.full_name);
  });

  insertAdminStmt.finalize();
  
  console.log('✅ Database initialized: Users and Admins in separate tables');
});

module.exports = db;
