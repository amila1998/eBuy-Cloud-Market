const { getPaymentByOrder, getMyPayments } = require('../controllers/paymentController');

async function paymentRoutes(fastify) {
  fastify.get('/my', {
    onRequest: [fastify.authenticate],
    handler: getMyPayments,
  });

  fastify.get('/order/:orderId', {
    onRequest: [fastify.authenticate],
    handler: getPaymentByOrder,
  });
}

module.exports = paymentRoutes;
