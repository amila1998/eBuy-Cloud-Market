'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { productApi, orderApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(null);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: '', stock: '', category: '' });

  useEffect(() => {
    productApi
      .getAll()
      .then((res) => setProducts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleOrder = async (productId) => {
    if (!user) return (window.location.href = '/login');
    setOrdering(productId);
    setMessage('');
    try {
      await orderApi.create({ productId, quantity: 1 });
      setMessage('Order placed! Payment processing via Kafka...');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Order failed');
    } finally {
      setOrdering(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await productApi.create({
        ...form,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
      });
      setProducts([...products, res.data]);
      setShowForm(false);
      setForm({ name: '', description: '', price: '', stock: '', category: '' });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create product');
    }
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Products</h1>
          {user && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ Add Product'}
            </button>
          )}
        </div>

        {message && <p className={message.includes('failed') || message.includes('Failed') ? 'error' : 'success'}>{message}</p>}

        {showForm && (
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h3>New Product</h3>
            <form onSubmit={handleCreate}>
              {['name', 'description', 'price', 'stock', 'category'].map((field) => (
                <div className="form-group" key={field}>
                  <label style={{ textTransform: 'capitalize' }}>{field}</label>
                  <input
                    type={field === 'price' || field === 'stock' ? 'number' : 'text'}
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    required={field !== 'description' && field !== 'category'}
                  />
                </div>
              ))}
              <button className="btn btn-success" type="submit">
                Create Product
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <p>Loading products...</p>
        ) : products.length === 0 ? (
          <p style={{ color: '#666' }}>No products yet. Add one above!</p>
        ) : (
          <div className="grid">
            {products.map((p) => (
              <div key={p.id} className="card">
                <h3>{p.name}</h3>
                <p style={{ color: '#666', margin: '0.5rem 0' }}>{p.description}</p>
                <p style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e94560' }}>
                  ${parseFloat(p.price).toFixed(2)}
                </p>
                <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem' }}>
                  Stock: {p.stock} | {p.category}
                </p>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => handleOrder(p.id)}
                  disabled={ordering === p.id || p.stock === 0}
                >
                  {p.stock === 0 ? 'Out of Stock' : ordering === p.id ? 'Ordering...' : 'Buy Now'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
