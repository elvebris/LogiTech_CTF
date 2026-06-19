const express = require('express');
const path = require('path');
const chatDb = require('../database_chat');
const multer = require('multer');
const fs = require('fs');
const router = express.Router();

const uploadDir = path.join(__dirname, '../public/uploads/chat');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const originalName = file.originalname;
    const timestamp = Date.now();
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function(req, file, cb) {
    cb(null, true);
  }
});

router.get('/chat', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, '../public', 'chat.html'));
});

router.get('/api/chat/rooms', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  const userRole = req.session.user.role;
  const userEmail = req.session.user.email;

  let sql = '';
  if (userRole === 'admin') {
    sql = 'SELECT * FROM chat_rooms ORDER BY last_message_at DESC';
  } else {
    sql = `SELECT * FROM chat_rooms WHERE user_email = '${userEmail}' ORDER BY last_message_at DESC`;
  }

  chatDb.all(sql, (err, rooms) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ rooms: rooms || [] });
  });
});

router.get('/api/chat/messages/:roomId', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  const roomId = req.params.roomId;
  const fromDate = req.query.from;
  const toDate = req.query.to;
  
  let sql = '';
  
  if (fromDate && toDate) {
    sql = `SELECT * FROM messages WHERE room_id = ${roomId} AND date(timestamp) BETWEEN '${fromDate}' AND '${toDate}' ORDER BY timestamp ASC`;
  } else if (fromDate) {
    sql = `SELECT * FROM messages WHERE room_id = ${roomId} AND date(timestamp) >= '${fromDate}' ORDER BY timestamp ASC`;
  } else if (toDate) {
    sql = `SELECT * FROM messages WHERE room_id = ${roomId} AND date(timestamp) <= '${toDate}' ORDER BY timestamp ASC`;
  } else {
    sql = `SELECT * FROM messages WHERE room_id = ${roomId} ORDER BY timestamp ASC`;
  }
  
  chatDb.all(sql, (err, messages) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json({ 
      messages: messages || [],
      currentUserRole: req.session.user.role
    });
  });
});

router.post('/api/chat/upload/:roomId', upload.single('file'), (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  const roomId = req.params.roomId;
  const uploadedFile = req.file;
  
  if (!uploadedFile) {
    return res.json({ success: false, error: 'Файл не загружен' });
  }
  
  const fileUrl = `/uploads/chat/${uploadedFile.filename}`;
  const fileName = uploadedFile.originalname;
  
  const senderName = req.session.user.role === 'admin' ? 'Техподдержка LogiTech' : req.session.user.full_name;
  const senderRole = req.session.user.role;
  
  const fileMessage = `📎 Файл: <a href="${fileUrl}" target="_blank">${fileName}</a> (${(uploadedFile.size / 1024).toFixed(2)} KB)`;
  
  chatDb.run(
    `INSERT INTO messages (room_id, sender, sender_role, message) VALUES (?, ?, ?, ?)`,
    [roomId, senderName, senderRole, fileMessage],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      chatDb.run(`UPDATE chat_rooms SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?`, [roomId]);
      
      res.json({ 
        success: true, 
        file: {
          name: fileName,
          url: fileUrl,
          size: uploadedFile.size
        },
        messageId: this.lastID
      });
    }
  );
});

router.get('/api/chat/files', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.json({ files: [] });
    }
    
    const fileList = files.map(file => {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        url: `/uploads/chat/${file}`,
        size: stats.size,
        modified: stats.mtime
      };
    });
    
    res.json({ files: fileList });
  });
});

router.post('/api/chat/send', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  const { roomId, message } = req.body;
  const senderName = req.session.user.role === 'admin' ? 'Техподдержка LogiTech' : req.session.user.full_name;
  const senderRole = req.session.user.role;

  if (!message || message.trim() === '') {
    return res.json({ success: false, error: 'Сообщение не может быть пустым' });
  }

  chatDb.run(
    `INSERT INTO messages (room_id, sender, sender_role, message) VALUES (?, ?, ?, ?)`,
    [roomId, senderName, senderRole, message],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      chatDb.run(`UPDATE chat_rooms SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?`, [roomId]);
      res.json({ success: true, messageId: this.lastID });
    }
  );
});

router.post('/api/chat/room', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }

  const { userEmail, userName } = req.body;
  
  chatDb.get(`SELECT id FROM chat_rooms WHERE user_email = ?`, [userEmail], (err, existing) => {
    if (existing) {
      return res.json({ success: false, error: 'Чат для этого пользователя уже существует' });
    }
    
    chatDb.run(
      `INSERT INTO chat_rooms (user_email, user_name) VALUES (?, ?)`,
      [userEmail, userName],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, roomId: this.lastID });
      }
    );
  });
});

module.exports = router;