const express = require('express');
const router = express.Router();
const parserCitilink = require('../services/parserCitilink');
const parserDns = require('../services/parserDns');
const parserRegard = require('../services/parserRegard');

router.post('/', async (req, res) => {
  const { urls } = req.body;
  if (!Array.isArray(urls)) {
    return res.status(400).json({ error: 'Ожидается массив URL' });
  }

  const offers = [];
  for (let item of urls) {
    const { marketplace, url } = item;
    try {
      let data;
      if (marketplace === 'Ситилинк') data = await parserCitilink(url);
      else if (marketplace === 'DNS') data = await parserDns(url);
      else if (marketplace === 'Регард') data = await parserRegard(url);
      else continue;

      if (data) {
        offers.push({ marketplace, ...data, url });
      }
    } catch (err) {
      console.error(`Ошибка парсинга ${marketplace}:`, err.message);
    }
  }
  res.json({ offers });
});

module.exports = router;
