const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  checkStock,
} = require('../controllers/productController');

async function productRoutes(fastify) {
  fastify.get('/', { handler: getAllProducts });

  fastify.get('/:id', { handler: getProductById });

  fastify.post('/', {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'price'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number', minimum: 0 },
          stock: { type: 'integer', minimum: 0 },
          category: { type: 'string' },
        },
      },
    },
    handler: createProduct,
  });

  fastify.put('/:id', {
    onRequest: [fastify.authenticate],
    handler: updateProduct,
  });

  fastify.delete('/:id', {
    onRequest: [fastify.authenticate],
    handler: deleteProduct,
  });

  // Internal endpoint for order-service stock check
  fastify.post('/:id/check-stock', { handler: checkStock });
}

module.exports = productRoutes;
