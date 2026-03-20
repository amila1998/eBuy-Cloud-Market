const { v4: uuidv4 } = require('uuid');
const { getRedis } = require('../plugins/redis');
const { publishEvent } = require('../plugins/kafka');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';
const ORDER_KEY = (id) => `order:${id}`;
const USER_ORDERS_KEY = (userId) => `orders:user:${userId}`;

const getOrders = async (request, reply) => {
  const redis = getRedis();
  const ids = await redis.sMembers(USER_ORDERS_KEY(request.user.id));
  if (!ids.length) return reply.send([]);

  const orders = await Promise.all(
    ids.map(async (id) => {
      const raw = await redis.get(ORDER_KEY(id));
      return raw ? JSON.parse(raw) : null;
    })
  );
  return reply.send(orders.filter(Boolean));
};

const getOrderById = async (request, reply) => {
  const redis = getRedis();
  const raw = await redis.get(ORDER_KEY(request.params.id));
  if (!raw) return reply.code(404).send({ error: 'Order not found' });

  const order = JSON.parse(raw);
  if (order.userId !== request.user.id) {
    return reply.code(403).send({ error: 'Forbidden' });
  }
  return reply.send(order);
};

const createOrder = async (request, reply) => {
  const { productId, quantity } = request.body;

  // Call product service to check stock
  let productData;
  try {
    const res = await fetch(`${PRODUCT_SERVICE_URL}/api/products/${productId}/check-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    const data = await res.json();
    if (!res.ok || !data.available) {
      return reply.code(400).send({ error: 'Insufficient stock', details: data });
    }
    productData = data.product;
  } catch (err) {
    return reply.code(502).send({ error: 'Product service unavailable' });
  }

  const redis = getRedis();
  const order = {
    id: uuidv4(),
    userId: request.user.id,
    productId,
    quantity,
    totalAmount: productData.price * quantity,
    status: 'pending',
    product: { name: productData.name, price: productData.price },
    createdAt: new Date().toISOString(),
  };

  await redis.set(ORDER_KEY(order.id), JSON.stringify(order));
  await redis.sAdd(USER_ORDERS_KEY(order.userId), order.id);

  // Publish order.created event for Payment Service
  await publishEvent('order.created', {
    orderId: order.id,
    userId: order.userId,
    productId,
    quantity,
    totalAmount: order.totalAmount,
  });

  return reply.code(201).send(order);
};

module.exports = { getOrders, getOrderById, createOrder };
