require('dotenv').config();
const Fastify = require('fastify');
const fastifyJwt = require('@fastify/jwt');
const fastifyCors = require('@fastify/cors');
const authRoutes = require('./routes/auth');
const { connectRedis } = require('./plugins/redis');


const app = Fastify({ logger: true });

app.register(fastifyCors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});

app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'fallback_secret',
});

// Decorate authenticate hook
app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

app.register(authRoutes, { prefix: '/api/user' });

app.get('/health', async () => ({ status: 'ok', service: 'auth-service' }));

const start = async () => {
  try {
    await connectRedis();
    await app.listen({ port: parseInt(process.env.PORT) || 3001, host: '0.0.0.0' });
    app.log.info('Auth service running');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
