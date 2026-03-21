const { createClient } = require('redis');

let client;

const connectRedis = async () => {
  const redisUrl = process.env.REDIS_URL;
  console.log("🚀 ~ connectRedis ~ redisUrl:", redisUrl)

  if (!redisUrl) {
    throw new Error('REDIS_URL is not set');
  }

  client = createClient({
    url: redisUrl,
  });

  client.on('error', (err) => {
    console.error('Redis client error', err);
  });

  await client.connect();
  console.log('Connected to Redis');
};

const getRedis = () => {
  if (!client) throw new Error('Redis not connected');
  return client;
};

module.exports = { connectRedis, getRedis };