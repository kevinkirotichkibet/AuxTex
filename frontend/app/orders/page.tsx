'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Order, formatKes } from '@/lib/api';
import { useLoggedIn } from '@/lib/useAuth';
import { statusLabel, statusColor } from '@/lib/orderStatus';

export default function OrdersListPage() {
  const loggedIn = useLoggedIn();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loggedIn) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getOrders()
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [loggedIn]);

  if (!loggedIn) {
    return (
      <p>
        <a href="/login">Log in</a> to see your orders.
      </p>
    );
  }

  return (
    <div>
      <h1>My Orders</h1>

      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && orders.length === 0 && !error && (
        <p>
          No orders yet. <Link href="/">Browse the collection</Link>.
        </p>
      )}

      <div className="product-grid">
        {orders.map((o) => (
          <Link key={o._id} href={`/orders/${o._id}`} className="card">
            <h3>{o.productId?.name ?? 'Order'}</h3>
            <p>{o.materialId?.name}</p>
            <p className="price">{formatKes(o.price)}</p>
            <span className="status-badge" style={{ color: statusColor(o.status) }}>
              {statusLabel(o.status)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
