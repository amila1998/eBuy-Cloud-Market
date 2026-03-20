const authController = require('../src/controllers/authController');

// Mock Redis
jest.mock('../src/plugins/redis', () => ({
  getRedis: jest.fn(),
}));

const { getRedis } = require('../src/plugins/redis');

describe('Auth Controller', () => {
  let mockRedis;
  let mockReply;

  beforeEach(() => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
    };
    getRedis.mockReturnValue(mockRedis);

    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      jwtSign: jest.fn().mockResolvedValue('mock-token'),
    };
  });

  describe('register', () => {
    it('should return 400 if fields are missing', async () => {
      const req = { body: { email: 'test@test.com' } };
      await authController.register(req, mockReply);
      expect(mockReply.code).toHaveBeenCalledWith(400);
    });

    it('should return 409 if user already exists', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ email: 'test@test.com' }));
      const req = { body: { email: 'test@test.com', password: 'pass123', name: 'Test' } };
      await authController.register(req, mockReply);
      expect(mockReply.code).toHaveBeenCalledWith(409);
    });

    it('should create user and return token', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      const req = { body: { email: 'new@test.com', password: 'pass123', name: 'New User' } };
      await authController.register(req, mockReply);
      expect(mockReply.code).toHaveBeenCalledWith(201);
    });
  });

  describe('login', () => {
    it('should return 400 if fields are missing', async () => {
      const req = { body: { email: 'test@test.com' } };
      await authController.login(req, mockReply);
      expect(mockReply.code).toHaveBeenCalledWith(400);
    });

    it('should return 401 if user not found', async () => {
      mockRedis.get.mockResolvedValue(null);
      const req = { body: { email: 'no@test.com', password: 'pass' } };
      await authController.login(req, mockReply);
      expect(mockReply.code).toHaveBeenCalledWith(401);
    });
  });
});
