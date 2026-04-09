const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const CACHE_FILE = path.join(__dirname, '../cache/components.json');

router.get('/', async (req, res) => {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8');
    res.json(JSON.parse(data));
  } catch (err) {
    console.error('Ошибка чтения каталога:', err);
    res.status(500).json({
      error: 'Каталог временно недоступен',
      components: []
    });
  }
});

module.exports = router;
