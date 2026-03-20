'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { paymentApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function PaymentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      paymentApi
        .getMyPayments()
        .then((res) => setPayments(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) return <><Navbar /><div className="container"><p>Loading...</p></div></>;

  return (
    <>
      <Navbar />
      <div className="container">
        <h1>My Payments</h1>
        {payments.length === 0 ? (
          <p style={{ color: '#666' }}>No payments yet.</p>
        ) : (
          <div>
            {payments.map((p) => (
              <div key={p.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontWeight: 600 }}>Payment ID: {p.id}</p>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Order: {p.orderId}</p>
                    <p style={{ marginTop: '0.5rem', fontSize: '1.1rem' }}>
                      Amount: <strong>${parseFloat(p.amount).toFixed(2)}</strong>
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.3rem' }}>
                      {new Date(p.processedAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`badge badge-${p.status === 'success' ? 'success' : 'danger'}`}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
