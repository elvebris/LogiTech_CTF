const express = require('express');
const path = require('path');
const session = require('express-session');
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const chatRouter = require('./routes/chat');
const db = require('./database');
const chatDb = require('./database_chat');

const app = express();
const PORT = process.env.PORT || 80;

//сессии
app.use(session({
  secret: 'logitech-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', authRouter);
app.use('/', chatRouter);
app.use('/', indexRouter);

app.use((req, res) => {
    res.status(404).send('<h1>404 - Страница не найдена</h1><a href="/">Вернуться</a>');
});
//БД
db.get('SELECT 1', (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('database connected');
  }
});

app.listen(PORT, () => {

});
