const { createClient } = require('redis');

let client;

const connectRedis = async () => {
  client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
  });

  client.on('error', (err) => console.error('Redis client error', err));
  await client.connect();
  console.log('Connected to Redis');
};



const getRedis = () => {
  if (!client) throw new Error('Redis not connected');
  return client;
};

module.exports = { connectRedis, getRedis };
