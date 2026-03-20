'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav>
      <Link href="/" style={{ fontSize: '1.3rem', fontWeight: 700 }}>
        🛒 eBuy
      </Link>
      <div>
        <Link href="/products">Products</Link>
        {user ? (
          <>
            <Link href="/orders">My Orders</Link>
            <Link href="/payments">Payments</Link>
            <span style={{ marginLeft: '1.5rem', opacity: 0.7 }}>Hi, {user.name}</span>
            <button
              onClick={logout}
              style={{
                marginLeft: '1rem',
                background: '#e94560',
                color: 'white',
                border: 'none',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
