const express = require('express');
const path = require('path');
const cron = require('node-cron');
const { runCatalogCrawler } = require('./crawler/catalogCrawler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/components', require('./routes/components'));
app.use('/api/prices', require('./routes/prices'));

(async () => {
  console.log('🚀 Запуск первичного сбора каталога...\n');
  await runCatalogCrawler();
  console.log('✅ Каталог собран и сохранён в cache/components.json');
})();

cron.schedule('0 * * * *', async () => {
  console.log('🔄 Плановый сбор каталога...');
  await runCatalogCrawler();
});

app.listen(PORT, () => {
  console.log(`🖥️  Сервер PCraft запущен на http://localhost:${PORT}`);
});
