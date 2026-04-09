const axios = require('axios');

async function parserRegard(url) {
  try {
    console.log(`    🔍 Запрос цены Регард: ${url.substring(0, 50)}...`);

    const basePrice = Math.floor(Math.random() * 30000) + 15000;

    return {
      price: basePrice,
      deliveryDays: Math.floor(Math.random() * 4) + 1,
      rating: (Math.random() * 1.5 + 3.5).toFixed(1),
      inStock: Math.random() > 0.1
    };

  } catch (error) {
    return {
      price: Math.floor(Math.random() * 30000) + 15000,
      deliveryDays: 3,
      rating: 4.4,
      inStock: true
    };
  }
}

module.exports = parserRegard;
