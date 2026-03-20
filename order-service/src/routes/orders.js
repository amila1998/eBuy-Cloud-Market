const { getOrders, getOrderById, createOrder } = require('../controllers/orderController');

async function orderRoutes(fastify) {
  fastify.get('/', {
    onRequest: [fastify.authenticate],
    handler: getOrders,
  });

  fastify.get('/:id', {
    onRequest: [fastify.authenticate],
    handler: getOrderById,
  });

  fastify.post('/', {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['productId', 'quantity'],
        properties: {
          productId: { type: 'string' },
          quantity: { type: 'integer', minimum: 1 },
        },
      },
    },
    handler: createOrder,
  });
}

module.exports = orderRoutes;
