const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// Получить все задачи проекта
router.get('/project/:projectId', async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  try {
    const result = await db.query(
      'SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at ASC',
      [projectId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения задач' });
  }
});

// Создать задачу
router.post('/', async (req, res) => {
  const { title, description, priority, deadline, assignedTo, projectId, status } = req.body;
  const createdBy = req.user;

  if (!title || !projectId) {
    return res.status(400).json({ error: 'Название и проект обязательны' });
  }

  try {
    const result = await db.query(
      `INSERT INTO tasks (title, description, priority, deadline, assigned_to, project_id, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description || '', priority || 'medium', deadline || null, assignedTo || null, projectId, createdBy, status || 'todo']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка создания задачи' });
  }
});

// Обновить задачу
router.put('/:id', async (req, res) => {
  const taskId = parseInt(req.params.id);
  const { title, description, status, priority, deadline, assignedTo } = req.body;

  try {
    const result = await db.query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        deadline = $5,
        assigned_to = $6,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [title, description, status, priority, deadline, assignedTo, taskId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Задача не найдена' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка обновления задачи' });
  }
});

// Удалить задачу
router.delete('/:id', async (req, res) => {
  const taskId = parseInt(req.params.id);
  try {
    await db.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    res.json({ message: 'Задача удалена' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления' });
  }
});

// Получить одну задачу
router.get('/:id', async (req, res) => {
  const taskId = parseInt(req.params.id);
  try {
    const result = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

module.exports = router;