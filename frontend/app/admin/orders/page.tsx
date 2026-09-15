'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Order, formatKes } from '@/lib/api';
import { useLoggedIn } from '@/lib/useAuth';
import { statusLabel, statusColor } from '@/lib/orderStatus';

const STATUSES = ['pending', 'in_production', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrdersPage() {
  const loggedIn = useLoggedIn();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  useEffect(() => {
    if (!loggedIn) {
      setChecking(false);
      setAuthorized(false);
      return;
    }
    api
      .me()
      .then((me) => setAuthorized(me.roles?.includes('admin') ?? false))
      .catch(() => setAuthorized(false))
      .finally(() => setChecking(false));
  }, [loggedIn]);

  function load() {
    api
      .adminGetAllOrders()
      .then(setOrders)
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    if (authorized) load();
  }, [authorized]);

  async function handleStatusChange(orderId: string, status: string) {
    setUpdatingId(orderId);
    setError('');
    try {
      await api.adminUpdateOrderStatus(orderId, status);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdatingId('');
    }
  }

  if (checking) return <p>Checking access…</p>;
  if (!loggedIn) {
    return (
      <p>
        <a href="/login">Log in</a> with an admin account to view orders.
      </p>
    );
  }
  if (!authorized) {
    return <p className="error">Your account doesn't have admin access.</p>;
  }

  return (
    <div>
      <div className="section-heading">
        <h1>Admin — orders</h1>
        <Link href="/admin">Manage catalog</Link>
      </div>

      {error && <p className="error">{error}</p>}
      {orders.length === 0 && !error && <p>No orders placed yet.</p>}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
          background: 'var(--line)',
          border: '1px solid var(--line)',
        }}
      >
        {orders.map((o) => (
          <div
            key={o._id}
            className="card"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr',
              gap: '1rem',
              alignItems: 'center',
            }}
          >
            <div>
              <strong>{o.productId?.name}</strong>
              <div style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>{o.materialId?.name}</div>
            </div>
            <div>
              <div>{o.userId?.name ?? 'Unknown'}</div>
              <div style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>{o.userId?.email}</div>
            </div>
            <div>{o.measurementProfileId?.label}</div>
            <div className="price">{formatKes(o.price)}</div>
            <select
              value={o.status}
              disabled={updatingId === o._id}
              onChange={(e) => handleStatusChange(o._id, e.target.value)}
              style={{ color: statusColor(o.status) }}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
