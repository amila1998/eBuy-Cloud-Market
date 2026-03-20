const productController = require('../src/controllers/productController');

jest.mock('../src/plugins/redis', () => ({ getRedis: jest.fn() }));
const { getRedis } = require('../src/plugins/redis');

describe('Product Controller', () => {
  let mockRedis;
  let mockReply;

  beforeEach(() => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      sMembers: jest.fn(),
      sAdd: jest.fn(),
      sRem: jest.fn(),
    };
    getRedis.mockReturnValue(mockRedis);
    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  it('getAllProducts returns empty array when no products', async () => {
    mockRedis.sMembers.mockResolvedValue([]);
    await productController.getAllProducts({}, mockReply);
    expect(mockReply.send).toHaveBeenCalledWith([]);
  });

  it('getProductById returns 404 when not found', async () => {
    mockRedis.get.mockResolvedValue(null);
    await productController.getProductById({ params: { id: 'fake' } }, mockReply);
    expect(mockReply.code).toHaveBeenCalledWith(404);
  });

  it('createProduct creates and returns product', async () => {
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.sAdd.mockResolvedValue(1);
    const req = {
      body: { name: 'Widget', price: 9.99, stock: 100, category: 'tools' },
      user: { id: 'user-1' },
    };
    await productController.createProduct(req, mockReply);
    expect(mockReply.code).toHaveBeenCalledWith(201);
  });
});
