jest.mock('../src/plugins/redis', () => ({ getRedis: jest.fn() }));
const paymentController = require('../src/controllers/paymentController');
const { getRedis } = require('../src/plugins/redis');

describe('Payment Controller', () => {
  let mockRedis;
  let mockReply;

  beforeEach(() => {
    mockRedis = { keys: jest.fn(), get: jest.fn() };
    getRedis.mockReturnValue(mockRedis);
    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  it('getPaymentByOrder returns 404 when no payments', async () => {
    mockRedis.keys.mockResolvedValue([]);
    await paymentController.getPaymentByOrder({ params: { orderId: 'o1' } }, mockReply);
    expect(mockReply.code).toHaveBeenCalledWith(404);
  });

  it('getMyPayments returns filtered payments for user', async () => {
    mockRedis.keys.mockResolvedValue(['payment:p1', 'payment:p2']);
    mockRedis.get
      .mockResolvedValueOnce(JSON.stringify({ id: 'p1', userId: 'u1', orderId: 'o1' }))
      .mockResolvedValueOnce(JSON.stringify({ id: 'p2', userId: 'u2', orderId: 'o2' }));
    await paymentController.getMyPayments({ user: { id: 'u1' } }, mockReply);
    expect(mockReply.send).toHaveBeenCalledWith([{ id: 'p1', userId: 'u1', orderId: 'o1' }]);
  });
});
