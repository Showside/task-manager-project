const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const router = express.Router();

// Регистрация
router.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Пароль минимум 4 символа' });
  }
  if (!email.includes('@')) {
    return res.status(400).json({ error: 'Некорректный email' });
  }

  try {
    // Проверка существования пользователя
    const existing = await db.query('SELECT username FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3)',
      [username, hashedPassword, email]
    );
    res.json({ message: 'Регистрация успешна' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Логин (проверка пароля)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Введите логин и пароль' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    // Отправляем username обратно (фронт сохранит в localStorage)
    res.json({ username: user.username, message: 'Успешный вход' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;