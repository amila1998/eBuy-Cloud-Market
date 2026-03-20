const { getRedis } = require('../plugins/redis');

const getPaymentByOrder = async (request, reply) => {
  const redis = getRedis();
  // Scan for payment with matching orderId
  const keys = await redis.keys('payment:*');
  for (const key of keys) {
    const raw = await redis.get(key);
    if (raw) {
      const payment = JSON.parse(raw);
      if (payment.orderId === request.params.orderId) {
        return reply.send(payment);
      }
    }
  }
  return reply.code(404).send({ error: 'Payment not found' });
};

const getMyPayments = async (request, reply) => {
  const redis = getRedis();
  const keys = await redis.keys('payment:*');
  const payments = [];

  for (const key of keys) {
    const raw = await redis.get(key);
    if (raw) {
      const payment = JSON.parse(raw);
      if (payment.userId === request.user.id) {
        payments.push(payment);
      }
    }
  }

  return reply.send(payments);
};

module.exports = { getPaymentByOrder, getMyPayments };
