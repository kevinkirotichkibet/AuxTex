'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, Product, Material, MeasurementProfile, isLoggedIn, formatKes } from '@/lib/api';
import { swatchBackground } from '@/lib/patterns';

// Mirrors the backend's rough fabric usage table (backend/src/orders/orders.service.ts)
// so the price preview matches what the server will actually charge.
const FABRIC_USAGE_METERS: Record<string, number> = {
  suit: 3.5,
  blazer: 2.2,
  trousers: 1.5,
  shirt: 1.8,
  dress: 2.8,
  skirt: 1.2,
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [profiles, setProfiles] = useState<MeasurementProfile[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  // Kept separate on purpose: a failed page load should replace the whole
  // page, but a "pick a material first" validation error should only show
  // near the order button, not blank out the product you're looking at.
  const [fetchError, setFetchError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getProduct(id)
      .then((p) => {
        setProduct(p);
        if (p.compatibleMaterials.length) setSelectedMaterial(p.compatibleMaterials[0]);
      })
      .catch((e) => setFetchError(e.message))
      .finally(() => setLoading(false));

    const loggedInNow = isLoggedIn();
    setLoggedIn(loggedInNow);
    if (loggedInNow) {
      api
        .getMeasurementProfiles()
        .then((fetched) => {
          setProfiles(fetched);
          // Most people only have one profile — save them the extra click
          // rather than making them pick from a dropdown of one.
          if (fetched.length > 0) setSelectedProfileId(fetched[0]._id);
        })
        .catch(() =>
          setProfileError('Could not load your measurement profiles. Try logging in again.'),
        );
    }
  }, [id]);

  if (loading) return <p>Loading…</p>;
  if (fetchError) return <p className="error">{fetchError}</p>;
  if (!product) return <p>Product not found.</p>;

  const usage = FABRIC_USAGE_METERS[product.category] ?? 2;
  const price = selectedMaterial
    ? product.basePrice + selectedMaterial.pricePerMeter * usage
    : product.basePrice;

  async function handleOrder() {
    if (!product) return;
    if (!loggedIn) {
      router.push('/login');
      return;
    }
    if (!selectedMaterial || !selectedProfileId) {
      setOrderError('Pick a material and a measurement profile first.');
      return;
    }
    setPlacing(true);
    setOrderError('');
    try {
      await api.createOrder({
        productId: product._id,
        materialId: selectedMaterial._id,
        measurementProfileId: selectedProfileId,
      });
      router.push('/measurements'); // placeholder redirect until an /orders page exists
    } catch (e: any) {
      setOrderError(e.message);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div>
      <img
        src={product.images?.[0] || 'https://placehold.co/700x400'}
        alt={product.name}
        style={{ width: '100%', maxHeight: 400, objectFit: 'cover', border: '1px solid var(--line)' }}
      />
      <h1>{product.name}</h1>
      <p>{product.description}</p>

      <h3>Choose your material</h3>
      <div className="swatch-grid">
        {product.compatibleMaterials.map((m) => (
          <div
            key={m._id}
            className={`swatch ${selectedMaterial?._id === m._id ? 'selected' : ''}`}
            onClick={() => setSelectedMaterial(m)}
          >
            <div className="swatch-color" style={{ background: swatchBackground(m) }} />
            <small>{m.name}</small>
          </div>
        ))}
        {product.compatibleMaterials.length === 0 && (
          <p style={{ gridColumn: '1 / -1' }}>No materials linked to this product yet.</p>
        )}
      </div>

      <h3>Select your measurements</h3>
      {profileError && <p className="error">{profileError}</p>}
      {loggedIn ? (
        profiles.length > 0 ? (
          <select value={selectedProfileId} onChange={(e) => setSelectedProfileId(e.target.value)}>
            <option value="">Select a profile…</option>
            {profiles.map((p) => (
              <option key={p._id} value={p._id}>
                {p.label}
              </option>
            ))}
          </select>
        ) : (
          !profileError && (
            <p>
              No saved profiles yet. <a href="/measurements">Add one</a>.
            </p>
          )
        )
      ) : (
        <p>
          <a href="/login">Log in</a> to select or save your measurements.
        </p>
      )}

      <div className="price-box">Estimated price: {formatKes(price)}</div>
      {orderError && <p className="error">{orderError}</p>}

      <button onClick={handleOrder} disabled={placing}>
        {placing ? 'Placing order…' : 'Place order'}
      </button>
    </div>
  );
}
