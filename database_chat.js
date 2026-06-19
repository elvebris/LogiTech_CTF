const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const chatDbPath = path.join(__dirname, 'chat.db');
const chatDb = new sqlite3.Database(chatDbPath);

chatDb.serialize(() => {
  chatDb.run(`DROP TABLE IF EXISTS messages`);
  chatDb.run(`DROP TABLE IF EXISTS chat_rooms`);
  
  //дб комнат
  chatDb.run(`
    CREATE TABLE chat_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      user_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  //дб сообщений
  chatDb.run(`
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      sender TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id)
    )
  `);
  
  //комнаты пользователей
  const users = [
    { email: '1vaaN_Petr@logitech.ru', name: 'Иван Петров' },
    { email: '3lenAaSmirn0va@logitech.ru', name: 'Елена Смирнова' },
    { email: 'KozLOVEaleX@logitech.ru', name: 'Алексей Козлов' },
    { email: 'LadyMaryV0lk0va@logitech.ru', name: 'Мария Волкова' },
    { email: 'S0koloffDmitry@logitech.ru', name: 'Дмитрий Соколов' }
  ];
  
  users.forEach(user => {
    chatDb.run(
      `INSERT INTO chat_rooms (user_email, user_name) VALUES (?, ?)`,
      [user.email, user.name],
      function(err) {
        if (err) {
          console.error('Error creating room:', err);
        } else {
          console.log(`Created room for ${user.email} with ID ${this.lastID}`);
        }
      }
    );
  });
  
  setTimeout(() => {
    for (let roomId = 1; roomId <= 5; roomId++) {
      //чат
      chatDb.run(
        `INSERT INTO messages (room_id, sender, sender_role, message, timestamp) 
         VALUES (?, 'Пользователь', 'user', 'Здравствуйте! Мой заказ LOG123456 задерживается', datetime('now', '-2 days'))`,
        [roomId]
      );
      
      chatDb.run(
        `INSERT INTO messages (room_id, sender, sender_role, message, timestamp) 
         VALUES (?, 'Поддержка LogiTech', 'admin', 'Здравствуйте! Проверяем информацию по вашему заказу. Ожидайте ответ в течение часа.', datetime('now', '-1 day'))`,
        [roomId]
      );
      
      chatDb.run(
        `INSERT INTO messages (room_id, sender, sender_role, message, timestamp) 
         VALUES (?, 'Пользователь', 'user', 'Спасибо, буду ждать информацию о статусе доставки', datetime('now', '-12 hours'))`,
        [roomId]
      );
      
      chatDb.run(
        `INSERT INTO messages (room_id, sender, sender_role, message, timestamp) 
         VALUES (?, 'Поддержка LogiTech', 'admin', 'Ваш груз уже в пути, ориентировочная дата доставки - 28 апреля', datetime('now', '-6 hours'))`,
        [roomId]
      );
      
      chatDb.run(
        `INSERT INTO messages (room_id, sender, sender_role, message, timestamp) 
         VALUES (?, 'Пользователь', 'user', 'Спасибо за информацию!', datetime('now', '-1 hours'))`,
        [roomId]
      );
    }
    
  }, 100);
});

module.exports = chatDb;
