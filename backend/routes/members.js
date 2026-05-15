const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// Добавить участника в проект
router.post('/:projectId', async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const { username } = req.body;
  const currentUser = req.user;

  try {
    // Проверка, что currentUser - владелец
    const project = await db.query('SELECT owner FROM projects WHERE id = $1', [projectId]);
    if (project.rows.length === 0) return res.status(404).json({ error: 'Проект не найден' });
    if (project.rows[0].owner !== currentUser) {
      return res.status(403).json({ error: 'Только владелец может добавлять участников' });
    }

    // Проверка существования пользователя
    const userExists = await db.query('SELECT username FROM users WHERE username = $1', [username]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Добавляем
    await db.query(
      'INSERT INTO project_members (project_id, username) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [projectId, username]
    );
    res.json({ message: 'Участник добавлен' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// Удалить участника
router.delete('/:projectId/:username', async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const { username } = req.params;
  const currentUser = req.user;

  try {
    const project = await db.query('SELECT owner FROM projects WHERE id = $1', [projectId]);
    if (project.rows.length === 0) return res.status(404).json({ error: 'Проект не найден' });
    if (project.rows[0].owner !== currentUser) {
      return res.status(403).json({ error: 'Нет прав' });
    }
    if (username === project.rows[0].owner) {
      return res.status(400).json({ error: 'Нельзя удалить владельца' });
    }
    await db.query('DELETE FROM project_members WHERE project_id = $1 AND username = $2', [projectId, username]);
    res.json({ message: 'Участник удалён' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

module.exports = router;