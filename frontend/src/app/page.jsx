'use client';

import Link from 'next/link';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <h1>Welcome to eBuy Cloud Market</h1>
        <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '2rem' }}>
          A secure microservices-based e-commerce platform
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/products">
            <button className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.8rem 2rem' }}>
              Browse Products
            </button>
          </Link>
          {!user && (
            <Link href="/register">
              <button className="btn btn-secondary" style={{ fontSize: '1rem', padding: '0.8rem 2rem' }}>
                Get Started
              </button>
            </Link>
          )}
          {user && (
            <Link href="/orders">
              <button className="btn btn-secondary" style={{ fontSize: '1rem', padding: '0.8rem 2rem' }}>
                My Orders
              </button>
            </Link>
          )}
        </div>
        <div className="grid" style={{ marginTop: '4rem', textAlign: 'left' }}>
          {[
            { icon: '🔐', title: 'Secure Auth', desc: 'JWT-based authentication with bcrypt password hashing' },
            { icon: '📦', title: 'Product Catalog', desc: 'Browse and manage products with real-time stock tracking' },
            { icon: '🛍️', title: 'Order Management', desc: 'Place orders with automatic stock validation' },
            { icon: '💳', title: 'Payment Processing', desc: 'Event-driven payments via Kafka messaging' },
          ].map((f) => (
            <div key={f.title} className="card">
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p style={{ color: '#666', marginTop: '0.5rem' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
