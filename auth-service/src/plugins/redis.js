const { createClient } = require('redis');

let client;

const connectRedis = async () => {
  client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
    socket: {
      keepAlive: 5000,
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
  });

  client.on('reconnecting', () => console.warn('Redis reconnecting...'));
  client.on('error', (err) => console.error('Redis client error', err));
  await client.connect();
  await client.ping();
  console.log('Connected to Redis');
};



const getRedis = () => {
  if (!client) throw new Error('Redis not connected');
  return client;
};

module.exports = { connectRedis, getRedis };
