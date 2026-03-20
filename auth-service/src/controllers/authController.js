const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getRedis } = require('../plugins/redis');

const SALT_ROUNDS = 12;
const USER_KEY = (email) => `user:${email}`;

const register = async (request, reply) => {
  const { email, password, name } = request.body;

  if (!email || !password || !name) {
    return reply.code(400).send({ error: 'email, password and name are required' });
  }

  const redis = getRedis();
  const existing = await redis.get(USER_KEY(email));
  if (existing) {
    return reply.code(409).send({ error: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = {
    id: uuidv4(),
    email,
    name,
    password: hashedPassword,
    createdAt: new Date().toISOString(),
  };

  await redis.set(USER_KEY(email), JSON.stringify(user));

  const token = await reply.jwtSign(
    { id: user.id, email: user.email, name: user.name },
    { expiresIn: '7d' }
  );

  return reply.code(201).send({ token, user: { id: user.id, email: user.email, name: user.name } });
};

const login = async (request, reply) => {
  const { email, password } = request.body;

  if (!email || !password) {
    return reply.code(400).send({ error: 'email and password are required' });
  }

  const redis = getRedis();
  const raw = await redis.get(USER_KEY(email));
  if (!raw) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }

  const user = JSON.parse(raw);
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }

  const token = await reply.jwtSign(
    { id: user.id, email: user.email, name: user.name },
    { expiresIn: '7d' }
  );

  return reply.send({ token, user: { id: user.id, email: user.email, name: user.name } });
};

const me = async (request, reply) => {
  return reply.send({ user: request.user });
};

module.exports = { register, login, me };
