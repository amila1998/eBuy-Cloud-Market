import axios from 'axios';

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3001';
const PRODUCT_URL = process.env.NEXT_PUBLIC_PRODUCT_URL || 'http://localhost:3002';
const ORDER_URL = process.env.NEXT_PUBLIC_ORDER_URL || 'http://localhost:3003';
const PAYMENT_URL = process.env.NEXT_PUBLIC_PAYMENT_URL || 'http://localhost:3004';

const getAuthHeader = () => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const authApi = {
  register: (data) => axios.post(`${AUTH_URL}/api/user/register`, data),
  login: (data) => axios.post(`${AUTH_URL}/api/user/login`, data),
  me: () => axios.get(`${AUTH_URL}/api/user/me`, { headers: getAuthHeader() }),
};

export const productApi = {
  getAll: () => axios.get(`${PRODUCT_URL}/api/products`),
  getById: (id) => axios.get(`${PRODUCT_URL}/api/products/${id}`),
  create: (data) => axios.post(`${PRODUCT_URL}/api/products`, data, { headers: getAuthHeader() }),
  update: (id, data) => axios.put(`${PRODUCT_URL}/api/products/${id}`, data, { headers: getAuthHeader() }),
  delete: (id) => axios.delete(`${PRODUCT_URL}/api/products/${id}`, { headers: getAuthHeader() }),
};

export const orderApi = {
  getAll: () => axios.get(`${ORDER_URL}/api/orders`, { headers: getAuthHeader() }),
  getById: (id) => axios.get(`${ORDER_URL}/api/orders/${id}`, { headers: getAuthHeader() }),
  create: (data) => axios.post(`${ORDER_URL}/api/orders`, data, { headers: getAuthHeader() }),
};

export const paymentApi = {
  getMyPayments: () => axios.get(`${PAYMENT_URL}/api/payments/my`, { headers: getAuthHeader() }),
  getByOrder: (orderId) =>
    axios.get(`${PAYMENT_URL}/api/payments/order/${orderId}`, { headers: getAuthHeader() }),
};
