const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../database');
const multer = require('multer');
const fs = require('fs');
const router = express.Router();

//генерация кода
function generateResetCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

//multer
const uploadDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

//файл не проверяется
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const originalName = file.originalname;
        cb(null, `${timestamp}_${originalName}`)
    }
});
//отсутствие ограничения на размер
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 100 } 
});

router.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'forgot-password.html'));
});

router.get('/reset-password', (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.redirect('/forgot-password');
  }
  res.sendFile(path.join(__dirname, '../public', 'reset-password.html'));
});

//запрос на сброс пароля
router.post('/api/forgot-password', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.json({ success: false, message: 'Email обязателен' });
  }
  
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err || !user) {
      return res.json({ success: false, message: 'Пользователь с таким email не найден' });
    }
    
    const resetCode = generateResetCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    
    db.run(`DELETE FROM password_resets WHERE email = ?`, [email], (err) => {
      db.run(
        `INSERT INTO password_resets (email, reset_code, expires_at, used) VALUES (?, ?, ?, 0)`,
        [email, resetCode, expiresAt.toISOString()],
        function(err) {
          if (err) {
            console.error('Error inserting reset code:', err);
            return res.json({ success: false, message: 'Ошибка сервера' });
          }
          res.json({ 
            success: true, 
            message: `Код восстановления отправлен на почту ${email}`
          });
        }
      );
    });
  });
});

//проверка кода и сброс
router.post('/api/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;
  
  console.log(`\n[RESET ATTEMPT] Email: ${email}, Code: ${code}`);
  
  if (!email || !code || !newPassword) {
    return res.json({ success: false, message: 'Все поля обязательны' });
  }

  db.get(
    `SELECT * FROM password_resets 
     WHERE email = ? AND reset_code = ? AND expires_at > datetime('now')
     ORDER BY id DESC LIMIT 1`,
    [email, code],
    (err, resetRecord) => {
      if (err) {
        console.error('Database error:', err);
        return res.json({ success: false, message: 'Ошибка базы данных' });
      }
      
      if (!resetRecord) {
        db.get(`SELECT * FROM password_resets WHERE email = ? ORDER BY id DESC LIMIT 1`, [email], (err, lastCode) => {
        });
        
        return res.json({ success: false, message: 'Неверный или просроченный код' });
      }
      
      
      //хеширвоание нового пароля
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      
      db.run(`UPDATE users SET password = ? WHERE email = ?`, [hashedPassword, email], (err) => {
        if (err) {
          console.error('Error updating password:', err);
          return res.json({ success: false, message: 'Ошибка обновления пароля' });
        }
        
        console.log(`[SUCCESS] Пароль для ${email} успешно изменен с кодом ${code}`);
        console.log(`[VULNERABILITY] Код ${code} остается активным! Его можно использовать снова!\n`);
        
        res.json({ success: true, message: 'Пароль успешно изменен' });
      });
    }
  );
});

router.get('/api/get-reset-code/:email', (req, res) => {
  const { email } = req.params;
  
  db.get(
    `SELECT reset_code, expires_at FROM password_resets WHERE email = ? AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1`,
    [email],
    (err, record) => {
      if (err || !record) {
        return res.json({ success: false, message: 'Нет активного кода' });
      }
      res.json({ success: true, reset_code: record.reset_code, expires_at: record.expires_at });
    }
  );
});

router.get('/admin/files', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).send('Доступ запрещен');
    }
    res.sendFile(path.join(__dirname, '../public', 'admin-files.html'));
});


router.get('/api/admin/files', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка чтения директории' });
        }
        
        const fileInfos = files.map(file => {
            const filePath = path.join(uploadDir, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                size: stats.size,
                modified: stats.mtime,
                path: filePath
            };
        });
        
        res.json({ files: fileInfos });
    });
});

router.post('/api/admin/upload', upload.single('file'), (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    if (!req.file) {
        return res.json({ success: false, message: 'Файл не загружен' });
    }
    
    const uploadedFile = req.file;
    const filePath = uploadedFile.path;
    
    console.log(`\n[FILE UPLOAD] Admin ${req.session.user.email} загрузил файл:`);
    console.log(`  - Имя: ${uploadedFile.originalname}`);
    console.log(`  - Путь: ${filePath}`);
    console.log(`  - Размер: ${uploadedFile.size} bytes`);
    
    if (uploadedFile.originalname.endsWith('.js')) {
    
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            
            const vm = require('vm');
            const sandbox = {
                require: require,
                console: console,
                setTimeout: setTimeout,
                setInterval: setInterval,
                Buffer: Buffer,
                process: process,
                module: { exports: {} },
                exports: {}
            };
            
            console.log(`[!] Выполнение кода в изолированном контексте...`);
            
            try {
                const script = new vm.Script(fileContent);
                script.runInNewContext(sandbox);
                console.log(`[!] Код выполнен успешно!`);
            } catch (execErr) {
                console.log(`[!] Ошибка выполнения: ${execErr.message}`);
            }
            
            res.json({ 
                success: true, 
                message: `Файл ${uploadedFile.originalname} загружен и выполнен!`,
                executed: true
            });
        } catch(err) {
            console.log(`[!] Общая ошибка: ${err.message}`);
            res.json({ 
                success: true, 
                message: `Файл ${uploadedFile.originalname} загружен, но не выполнен: ${err.message}`,
                executed: false
            });
        }
    } else {
        res.json({ 
            success: true, 
            message: `Файл ${uploadedFile.originalname} успешно загружен`,
            file: uploadedFile
        });
    }
});

router.delete('/api/admin/files/:filename', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    
    //path traversal
    if (filename.includes('..')) {
        console.log(`[!] Попытка path traversal: ${filename}`);
    }
    
    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка удаления' });
        }
        res.json({ success: true });
    });
});

router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/account');
  }
  res.sendFile(path.join(__dirname, '../public', 'login.html'));
});

router.post('/api/login', (req, res) => {
  const { email, password, remember } = req.body;
  
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.json({ success: false, message: 'Неверный email или пароль' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      return res.json({ success: false, message: 'Неверный email или пароль' });
    }
    
    req.session.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    };
    
    if (remember) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    }
    
    res.json({ success: true, role: user.role });
  });
});

router.get('/account', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, '../public', 'account.html'));
});

router.get('/api/account', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  
  const { id, email, full_name, role } = req.session.user;
  
  db.all('SELECT * FROM orders WHERE email = ?', [email], (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка базы данных' });
    }
    
    res.json({
      user: { id, email, full_name, role },
      orders: orders || []
    });
  });
});

router.get('/api/users', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }
  
  db.all('SELECT id, email, full_name, role, created_at FROM users', (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка базы данных' });
    }
    res.json({ users });
  });
});

router.get('/api/admin/orders', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }
  
  db.all('SELECT * FROM orders', (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка базы данных' });
    }
    res.json({ orders });
  });
});

router.put('/api/admin/orders/:id', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }
  
  const { id } = req.params;
  const { status, current_location } = req.body;
  
  db.run(
    'UPDATE orders SET status = ?, current_location = ? WHERE id = ?',
    [status, current_location || 'В пути', id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка обновления' });
      }
      res.json({ success: true, message: 'Статус обновлен' });
    }
  );
});

router.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

module.exports = router;
