'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, Product, Material, MeasurementProfile, isLoggedIn } from '@/lib/api';

// Mirrors the backend's rough fabric usage table so the price preview
// matches what the server will actually charge.
const FABRIC_USAGE_METERS: Record<string, number> = {
  suit: 3.5,
  blazer: 2.2,
  trousers: 1.5,
  shirt: 1.8,
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [profiles, setProfiles] = useState<MeasurementProfile[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getProduct(id)
      .then((p) => {
        setProduct(p);
        if (p.compatibleMaterials.length) setSelectedMaterial(p.compatibleMaterials[0]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    if (isLoggedIn()) {
      api.getMeasurementProfiles().then(setProfiles).catch(() => {});
    }
  }, [id]);

  if (loading) return <p>Loading…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!product) return <p>Product not found.</p>;

  const usage = FABRIC_USAGE_METERS[product.category] ?? 2;
  const price = selectedMaterial
    ? product.basePrice + selectedMaterial.pricePerMeter * usage
    : product.basePrice;

  async function handleOrder() {
    if (!product) return;
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (!selectedMaterial || !selectedProfileId) {
      setError('Pick a material and a measurement profile first.');
      return;
    }
    setPlacing(true);
    setError('');
    try {
      await api.createOrder({
        productId: product._id,
        materialId: selectedMaterial._id,
        measurementProfileId: selectedProfileId,
      });
      router.push('/measurements'); // placeholder redirect until an /orders page exists
    } catch (e: any) {
      setError(e.message);
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
            <div className="swatch-color" style={{ background: m.color }} />
            <small>{m.name}</small>
          </div>
        ))}
      </div>

      <h3>Select your measurements</h3>
      {isLoggedIn() ? (
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
          <p>
            No saved profiles yet. <a href="/measurements">Add one</a>.
          </p>
        )
      ) : (
        <p>
          <a href="/login">Log in</a> to select or save your measurements.
        </p>
      )}

      <div className="price-box">Estimated price: ${price.toFixed(2)}</div>
      {error && <p className="error">{error}</p>}

      <button onClick={handleOrder} disabled={placing}>
        {placing ? 'Placing order…' : 'Place order'}
      </button>
    </div>
  );
}
