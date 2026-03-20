const { v4: uuidv4 } = require('uuid');
const { getRedis } = require('../plugins/redis');

const PRODUCT_KEY = (id) => `product:${id}`;
const PRODUCTS_INDEX = 'products:index';

const getAllProducts = async (request, reply) => {
  const redis = getRedis();
  const ids = await redis.sMembers(PRODUCTS_INDEX);
  if (!ids.length) return reply.send([]);

  const products = await Promise.all(
    ids.map(async (id) => {
      const raw = await redis.get(PRODUCT_KEY(id));
      return raw ? JSON.parse(raw) : null;
    })
  );

  return reply.send(products.filter(Boolean));
};

const getProductById = async (request, reply) => {
  const redis = getRedis();
  const raw = await redis.get(PRODUCT_KEY(request.params.id));
  if (!raw) return reply.code(404).send({ error: 'Product not found' });
  return reply.send(JSON.parse(raw));
};

const createProduct = async (request, reply) => {
  const { name, description, price, stock, category } = request.body;
  const redis = getRedis();

  const product = {
    id: uuidv4(),
    name,
    description: description || '',
    price: parseFloat(price),
    stock: parseInt(stock) || 0,
    category: category || 'general',
    createdBy: request.user.id,
    createdAt: new Date().toISOString(),
  };

  await redis.set(PRODUCT_KEY(product.id), JSON.stringify(product));
  await redis.sAdd(PRODUCTS_INDEX, product.id);

  return reply.code(201).send(product);
};

const updateProduct = async (request, reply) => {
  const redis = getRedis();
  const raw = await redis.get(PRODUCT_KEY(request.params.id));
  if (!raw) return reply.code(404).send({ error: 'Product not found' });

  const existing = JSON.parse(raw);
  const updated = { ...existing, ...request.body, id: existing.id, updatedAt: new Date().toISOString() };
  await redis.set(PRODUCT_KEY(existing.id), JSON.stringify(updated));
  return reply.send(updated);
};

const deleteProduct = async (request, reply) => {
  const redis = getRedis();
  const raw = await redis.get(PRODUCT_KEY(request.params.id));
  if (!raw) return reply.code(404).send({ error: 'Product not found' });

  await redis.del(PRODUCT_KEY(request.params.id));
  await redis.sRem(PRODUCTS_INDEX, request.params.id);
  return reply.send({ message: 'Product deleted' });
};

// Used by Order Service internally
const checkStock = async (request, reply) => {
  const redis = getRedis();
  const raw = await redis.get(PRODUCT_KEY(request.params.id));
  if (!raw) return reply.code(404).send({ error: 'Product not found' });

  const product = JSON.parse(raw);
  const { quantity } = request.body;
  if (product.stock < quantity) {
    return reply.code(400).send({ available: false, stock: product.stock });
  }
  return reply.send({ available: true, stock: product.stock, product });
};

module.exports = { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct, checkStock };
