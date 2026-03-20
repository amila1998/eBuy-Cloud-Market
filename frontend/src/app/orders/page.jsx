'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { orderApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const statusBadge = (status) => {
  const map = { pending: 'warning', paid: 'success', payment_failed: 'danger' };
  return <span className={`badge badge-${map[status] || 'warning'}`}>{status}</span>;
};

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      orderApi
        .getAll()
        .then((res) => setOrders(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) return <><Navbar /><div className="container"><p>Loading...</p></div></>;

  return (
    <>
      <Navbar />
      <div className="container">
        <h1>My Orders</h1>
        {orders.length === 0 ? (
          <p style={{ color: '#666' }}>No orders yet. Browse products to place one!</p>
        ) : (
          <div>
            {orders.map((o) => (
              <div key={o.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3>{o.product?.name || 'Product'}</h3>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Order ID: {o.id}</p>
                    <p style={{ marginTop: '0.5rem' }}>
                      Qty: {o.quantity} | Total: <strong>${parseFloat(o.totalAmount).toFixed(2)}</strong>
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.3rem' }}>
                      {new Date(o.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>{statusBadge(o.status)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
