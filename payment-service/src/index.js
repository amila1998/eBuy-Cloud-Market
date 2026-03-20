require('dotenv').config();
const Fastify = require('fastify');
const fastifyJwt = require('@fastify/jwt');
const fastifyCors = require('@fastify/cors');
const paymentRoutes = require('./routes/payments');
const { connectRedis } = require('./plugins/redis');
const { connectKafka, startConsumer } = require('./plugins/kafka');

const app = Fastify({ logger: true });

app.register(fastifyCors, { origin: true, methods: ['GET', 'POST'] });

app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'fallback_secret',
});

app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

app.register(paymentRoutes, { prefix: '/api/payments' });

app.get('/health', async () => ({ status: 'ok', service: 'payment-service' }));

const start = async () => {
  try {
    await connectRedis();
    await connectKafka();
    await startConsumer();
    await app.listen({ port: parseInt(process.env.PORT) || 3004, host: '0.0.0.0' });
    app.log.info('Payment service running');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
