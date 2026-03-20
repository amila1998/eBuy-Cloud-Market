jest.mock('../src/plugins/redis', () => ({ getRedis: jest.fn() }));
jest.mock('../src/plugins/kafka', () => ({ publishEvent: jest.fn() }));

const orderController = require('../src/controllers/orderController');
const { getRedis } = require('../src/plugins/redis');

describe('Order Controller', () => {
  let mockRedis;
  let mockReply;

  beforeEach(() => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      sMembers: jest.fn(),
      sAdd: jest.fn(),
    };
    getRedis.mockReturnValue(mockRedis);
    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  it('getOrders returns empty array when no orders', async () => {
    mockRedis.sMembers.mockResolvedValue([]);
    await orderController.getOrders({ user: { id: 'u1' } }, mockReply);
    expect(mockReply.send).toHaveBeenCalledWith([]);
  });

  it('getOrderById returns 404 when not found', async () => {
    mockRedis.get.mockResolvedValue(null);
    await orderController.getOrderById({ params: { id: 'fake' }, user: { id: 'u1' } }, mockReply);
    expect(mockReply.code).toHaveBeenCalledWith(404);
  });

  it('getOrderById returns 403 when order belongs to different user', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ id: 'o1', userId: 'u2' }));
    await orderController.getOrderById({ params: { id: 'o1' }, user: { id: 'u1' } }, mockReply);
    expect(mockReply.code).toHaveBeenCalledWith(403);
  });
});
