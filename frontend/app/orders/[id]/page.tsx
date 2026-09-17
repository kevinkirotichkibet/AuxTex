'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Order, Material, MeasurementProfile, formatKes } from '@/lib/api';
import { useLoggedIn } from '@/lib/useAuth';
import { swatchBackground } from '@/lib/patterns';
import { statusLabel, statusColor } from '@/lib/orderStatus';

const EDITABLE_STATUSES = ['pending'];
const CANCELLABLE_STATUSES = ['pending', 'in_production'];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const loggedIn = useLoggedIn();

  const [order, setOrder] = useState<Order | null>(null);
  const [profiles, setProfiles] = useState<MeasurementProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState('');

  function load() {
    if (!id) return;
    setLoading(true);
    api
      .getOrder(id)
      .then((o) => {
        setOrder(o);
        setSelectedMaterial(o.materialId);
        setSelectedProfileId(o.measurementProfileId._id);
      })
      .catch((e) => setFetchError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!loggedIn) {
      setLoading(false);
      return;
    }
    load();
    api.getMeasurementProfiles().then(setProfiles).catch(() => {});
  }, [id, loggedIn]);

  if (!loggedIn) {
    return (
      <p>
        <a href="/login">Log in</a> to see this order.
      </p>
    );
  }
  if (loading) return <p>Loading…</p>;
  if (fetchError) return <p className="error">{fetchError}</p>;
  if (!order) return <p>Order not found.</p>;

  const canEdit = EDITABLE_STATUSES.includes(order.status);
  const canCancel = CANCELLABLE_STATUSES.includes(order.status);

  async function handleSaveEdit() {
    if (!order || !selectedMaterial) return;
    setBusy(true);
    setActionError('');
    try {
      await api.updateOrder(order._id, {
        materialId: selectedMaterial._id,
        measurementProfileId: selectedProfileId,
      });
      setEditing(false);
      load();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!order) return;
    if (!confirm('Cancel this order? This can\'t be undone.')) return;
    setBusy(true);
    setActionError('');
    try {
      await api.cancelOrder(order._id);
      load();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link href="/" className="hero-secondary-link" style={{ display: 'inline-block', marginBottom: '1rem' }}>
        ← Continue exploring the collection
      </Link>

      <h1>{order.productId.name}</h1>
      <span className="status-badge" style={{ color: statusColor(order.status) }}>
        {statusLabel(order.status)}
      </span>

      <div className="price-box" style={{ marginTop: '1rem' }}>
        {formatKes(order.price)}
      </div>

      {!editing ? (
        <>
          <h3>Material</h3>
          <div className="swatch-grid">
            <div className="swatch selected">
              <div className="swatch-color" style={{ background: swatchBackground(order.materialId) }} />
              <small>{order.materialId.name}</small>
            </div>
          </div>

          <h3>Measurements used</h3>
          <p>{order.measurementProfileId.label}</p>

          {actionError && <p className="error">{actionError}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {canEdit && <button onClick={() => setEditing(true)}>Edit order</button>}
            {canCancel && (
              <button onClick={handleCancel} disabled={busy}>
                {busy ? 'Cancelling…' : 'Cancel order'}
              </button>
            )}
            <Link href="/">
              <button>Continue shopping</button>
            </Link>
          </div>
          {!canEdit && !canCancel && (
            <p>This order is {statusLabel(order.status).toLowerCase()} and can no longer be changed.</p>
          )}
        </>
      ) : (
        <>
          <h3>Choose your material</h3>
          <div className="swatch-grid">
            {order.productId.compatibleMaterials.map((m) => (
              <div
                key={m._id}
                className={`swatch ${selectedMaterial?._id === m._id ? 'selected' : ''}`}
                onClick={() => setSelectedMaterial(m)}
              >
                <div className="swatch-color" style={{ background: swatchBackground(m) }} />
                <small>{m.name}</small>
              </div>
            ))}
          </div>

          <h3>Select your measurements</h3>
          <select value={selectedProfileId} onChange={(e) => setSelectedProfileId(e.target.value)}>
            {profiles.map((p) => (
              <option key={p._id} value={p._id}>
                {p.label}
              </option>
            ))}
          </select>

          {actionError && <p className="error">{actionError}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button onClick={handleSaveEdit} disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
            <button onClick={() => setEditing(false)} disabled={busy}>
              Cancel editing
            </button>
          </div>
        </>
      )}
    </div>
  );
}
