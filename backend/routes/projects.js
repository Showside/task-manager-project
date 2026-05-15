const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Все маршруты требуют авторизации
router.use(authMiddleware);

// Получить проекты текущего пользователя (владелец или участник)
router.get('/', async (req, res) => {
  const username = req.user;
  try {
    const query = `
      SELECT DISTINCT p.* FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.owner = $1 OR pm.username = $1
      ORDER BY p.created_at DESC
    `;
    const result = await db.query(query, [username]);
    // Для каждого проекта подтянем список участников (как массив)
    const projects = await Promise.all(result.rows.map(async (project) => {
      const membersRes = await db.query(
        'SELECT username FROM project_members WHERE project_id = $1 UNION SELECT owner AS username FROM projects WHERE id = $1',
        [project.id]
      );
      const members = membersRes.rows.map(row => row.username);
      return { ...project, members };
    }));
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка получения проектов' });
  }
});

// Создать проект
router.post('/', async (req, res) => {
  const { name, description } = req.body;
  const owner = req.user;
  if (!name) return res.status(400).json({ error: 'Название проекта обязательно' });

  try {
    const result = await db.query(
      'INSERT INTO projects (name, description, owner) VALUES ($1, $2, $3) RETURNING *',
      [name, description || '', owner]
    );
    const project = result.rows[0];
    // Добавляем владельца в таблицу участников (опционально)
    await db.query(
      'INSERT INTO project_members (project_id, username) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [project.id, owner]
    );
    // Возвращаем проект с полем members
    res.json({ ...project, members: [owner] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка создания проекта' });
  }
});

// Получить один проект по ID
router.get('/:id', async (req, res) => {
  const projectId = parseInt(req.params.id);
  try {
    const projectRes = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (projectRes.rows.length === 0) return res.status(404).json({ error: 'Проект не найден' });
    const project = projectRes.rows[0];
    const membersRes = await db.query('SELECT username FROM project_members WHERE project_id = $1', [projectId]);
    const members = membersRes.rows.map(row => row.username);
    res.json({ ...project, members });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// Обновить проект
router.put('/:id', async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { name, description, members } = req.body; // members - массив строк
  const username = req.user;

  try {
    // Проверка прав: только владелец
    const ownerCheck = await db.query('SELECT owner FROM projects WHERE id = $1', [projectId]);
    if (ownerCheck.rows.length === 0) return res.status(404).json({ error: 'Проект не найден' });
    if (ownerCheck.rows[0].owner !== username) {
      return res.status(403).json({ error: 'Нет прав' });
    }

    // Обновляем основные поля
    if (name || description) {
      await db.query(
        'UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [name, description, projectId]
      );
    }

    // Обновляем список участников (если передан)
    if (members && Array.isArray(members)) {
      // Удаляем старых участников, кроме владельца
      await db.query('DELETE FROM project_members WHERE project_id = $1 AND username != (SELECT owner FROM projects WHERE id = $1)', [projectId]);
      for (const member of members) {
        if (member !== ownerCheck.rows[0].owner) {
          await db.query(
            'INSERT INTO project_members (project_id, username) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [projectId, member]
          );
        }
      }
    }

    const updatedProject = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    res.json(updatedProject.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка обновления' });
  }
});

// Удалить проект
router.delete('/:id', async (req, res) => {
  const projectId = parseInt(req.params.id);
  const username = req.user;
  try {
    const ownerCheck = await db.query('SELECT owner FROM projects WHERE id = $1', [projectId]);
    if (ownerCheck.rows.length === 0) return res.status(404).json({ error: 'Проект не найден' });
    if (ownerCheck.rows[0].owner !== username) {
      return res.status(403).json({ error: 'Нет прав' });
    }
    // Каскадное удаление: проекты -> задачи и участники удалятся автоматически (ON DELETE CASCADE)
    await db.query('DELETE FROM projects WHERE id = $1', [projectId]);
    res.json({ message: 'Проект удалён' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка удаления' });
  }
});

module.exports = router;