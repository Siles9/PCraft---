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

// Запускаем краулер при старте
(async function() {
  console.log('\n🚀 PCraft - сборка каталога из Ситилинк, DNS, Регард\n');
  console.log('📡 Начинаем сбор товаров...\n');

  await runCatalogCrawler();

  console.log('\n✅ Первичный сбор каталога завершён!');
  console.log('🔄 Автообновление настроено каждый час\n');
})();

// Автоматическое обновление каталога каждый час
cron.schedule('0 * * * *', async function() {
  console.log('\n🔄 Плановое обновление каталога...');
  await runCatalogCrawler();
});

// Также можно обновлять каждые 30 минут для более частого обновления
cron.schedule('30 * * * *', async function() {
  console.log('\n🔄 Промежуточное обновление цен...');
  await updatePrices();
});

app.listen(PORT, function() {
  console.log('🖥️  Сервер запущен на http://localhost:' + PORT);
  console.log('📦 Каталог доступен по /api/components');
  console.log('💰 Цены доступны по /api/prices\n');
});

// Функция обновления только цен
async function updatePrices() {
  const { updateAllPrices } = require('./crawler/catalogCrawler');
  await updateAllPrices();
}
