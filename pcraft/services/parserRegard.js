const axios = require('axios');

async function parserRegard(url) {
  try {
    return {
      price: Math.floor(Math.random() * 30000) + 15000,
      deliveryDays: 3,
      rating: 4.4,
      inStock: true
    };
  } catch (err) {
    return {
      price: Math.floor(Math.random() * 30000) + 15000,
      deliveryDays: 3,
      rating: 4.4,
      inStock: true
    };
  }
}

module.exports = parserRegard;
