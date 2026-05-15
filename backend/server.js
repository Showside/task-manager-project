require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const projectsRoutes = require('./routes/projects');
const tasksRoutes = require('./routes/tasks');
const membersRoutes = require('./routes/members');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Раздача статики из папки /app/static (куда смонтирован фронтенд)
app.use(express.static(path.join(__dirname, 'static')));

// API маршруты
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/members', membersRoutes);

// Все остальные маршруты отдаём index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});