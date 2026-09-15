const express = require('express');
const app = express();
// Render автоматически передаст свой порт через process.env.PORT
const PORT = process.env.PORT || 3000;

// Настройка CORS (чтобы твой фронтенд на Vercel не блокировался)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); 
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Главная страница бэкенда (проверка, что он жив)
app.get('/', (req, res) => {
  res.send('Бэкенд успешно запущен на Render!');
});

// Фейковый API-эндпоинт для теста
app.get('/api/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Привет от фейкового бэкенда!',
    data: [1, 2, 3]
  });
});

app.listen(PORT, () => {
  console.log(`Fake server is running on port ${PORT}`);
});
