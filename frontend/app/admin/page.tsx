'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Material, Product } from '@/lib/api';
import { useLoggedIn } from '@/lib/useAuth';
import { swatchBackground } from '@/lib/patterns';

const MATERIAL_TYPES = ['wool', 'cotton', 'linen', 'silk', 'african-print'];
const CATEGORIES = ['suit', 'blazer', 'shirt', 'trousers', 'dress', 'skirt'];

const materialForm = { name: '', type: 'wool', color: '#1a2744', pricePerMeter: '', stock: '' };
const productForm = { name: '', category: 'suit', basePrice: '', description: '' };

export default function AdminPage() {
  const loggedIn = useLoggedIn();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [mForm, setMForm] = useState(materialForm);
  const [mSaving, setMSaving] = useState(false);
  const [mError, setMError] = useState('');

  const [pForm, setPForm] = useState(productForm);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [pSaving, setPSaving] = useState(false);
  const [pError, setPError] = useState('');

  useEffect(() => {
    if (!loggedIn) {
      setChecking(false);
      setAuthorized(false);
      return;
    }
    setChecking(true);
    api
      .me()
      .then((me) => {
        setAuthorized(me.roles?.includes('admin') ?? false);
      })
      .catch(() => setAuthorized(false))
      .finally(() => setChecking(false));
  }, [loggedIn]);

  function loadCatalog() {
    api.getMaterials().then(setMaterials).catch(() => {});
    api.getProducts().then(setProducts).catch(() => {});
  }

  useEffect(() => {
    if (authorized) loadCatalog();
  }, [authorized]);

  async function handleAddMaterial(e: React.FormEvent) {
    e.preventDefault();
    setMSaving(true);
    setMError('');
    try {
      await api.createMaterial({
        name: mForm.name,
        type: mForm.type,
        color: mForm.color,
        pricePerMeter: Number(mForm.pricePerMeter),
        stock: mForm.stock ? Number(mForm.stock) : undefined,
      });
      setMForm(materialForm);
      loadCatalog();
    } catch (e: any) {
      setMError(e.message);
    } finally {
      setMSaving(false);
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setPSaving(true);
    setPError('');
    try {
      await api.createProduct({
        name: pForm.name,
        category: pForm.category,
        basePrice: Number(pForm.basePrice),
        description: pForm.description,
        compatibleMaterials: selectedMaterialIds,
      });
      setPForm(productForm);
      setSelectedMaterialIds([]);
      loadCatalog();
    } catch (e: any) {
      setPError(e.message);
    } finally {
      setPSaving(false);
    }
  }

  function toggleMaterial(id: string) {
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  if (checking) return <p>Checking access…</p>;

  if (!loggedIn) {
    return (
      <p>
        <a href="/login">Log in</a> with an admin account to manage the catalog.
      </p>
    );
  }

  if (!authorized) {
    return <p className="error">Your account doesn't have admin access.</p>;
  }

  return (
    <div>
      <div className="section-heading">
        <h1>Admin — manage the catalog</h1>
        <Link href="/admin/orders">View orders</Link>
      </div>

      <h2>Add a material</h2>
      <form onSubmit={handleAddMaterial}>
        <input
          placeholder="Name (e.g. 'Kitenge - Sunburst Ankara')"
          value={mForm.name}
          onChange={(e) => setMForm({ ...mForm, name: e.target.value })}
          required
        />
        <select value={mForm.type} onChange={(e) => setMForm({ ...mForm, type: e.target.value })}>
          {MATERIAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <input
            type="color"
            value={mForm.color}
            onChange={(e) => setMForm({ ...mForm, color: e.target.value })}
            style={{ padding: 0, width: 48, height: 38 }}
          />
          <span style={{ color: 'var(--ink-muted)', fontSize: '0.9rem' }}>Base colour</span>
        </label>
        <input
          placeholder="Price per meter (KSh)"
          type="number"
          value={mForm.pricePerMeter}
          onChange={(e) => setMForm({ ...mForm, pricePerMeter: e.target.value })}
          required
        />
        <input
          placeholder="Stock (optional)"
          type="number"
          value={mForm.stock}
          onChange={(e) => setMForm({ ...mForm, stock: e.target.value })}
        />
        {mError && <p className="error">{mError}</p>}
        <button type="submit" disabled={mSaving}>
          {mSaving ? 'Saving…' : 'Add material'}
        </button>
      </form>

      <div className="swatch-grid" style={{ marginTop: '1.5rem' }}>
        {materials.map((m) => (
          <div key={m._id} className="swatch">
            <div className="swatch-color" style={{ background: swatchBackground(m) }} />
            <small>{m.name}</small>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: '3rem' }}>Add a product</h2>
      <form onSubmit={handleAddProduct}>
        <input
          placeholder="Name (e.g. 'Kitenge Pencil Skirt')"
          value={pForm.name}
          onChange={(e) => setPForm({ ...pForm, name: e.target.value })}
          required
        />
        <select
          value={pForm.category}
          onChange={(e) => setPForm({ ...pForm, category: e.target.value })}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          placeholder="Base price (KSh)"
          type="number"
          value={pForm.basePrice}
          onChange={(e) => setPForm({ ...pForm, basePrice: e.target.value })}
          required
        />
        <input
          placeholder="Description"
          value={pForm.description}
          onChange={(e) => setPForm({ ...pForm, description: e.target.value })}
        />

        <p style={{ margin: '0.5rem 0 0' }}>Compatible materials:</p>
        <div className="swatch-grid">
          {materials.map((m) => (
            <div
              key={m._id}
              className={`swatch ${selectedMaterialIds.includes(m._id) ? 'selected' : ''}`}
              onClick={() => toggleMaterial(m._id)}
            >
              <div className="swatch-color" style={{ background: swatchBackground(m) }} />
              <small>{m.name}</small>
            </div>
          ))}
          {materials.length === 0 && <p>Add a material above first.</p>}
        </div>

        {pError && <p className="error">{pError}</p>}
        <button type="submit" disabled={pSaving}>
          {pSaving ? 'Saving…' : 'Add product'}
        </button>
      </form>

      <h2 style={{ marginTop: '3rem' }}>Current catalog</h2>
      <div className="product-grid">
        {products.map((p) => (
          <div key={p._id} className="card">
            <h3>{p.name}</h3>
            <p>{p.category}</p>
            <p className="price">KSh {p.basePrice.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
