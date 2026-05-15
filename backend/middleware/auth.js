const authMiddleware = async (req, res, next) => {
  const username = req.headers['x-user'];
  if (!username) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  // Можно проверить, существует ли пользователь в БД (опционально)
  req.user = username;
  next();
};

module.exports = authMiddleware;