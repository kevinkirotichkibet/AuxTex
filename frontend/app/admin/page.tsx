'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Material, Product } from '@/lib/api';
import { useLoggedIn } from '@/lib/useAuth';
import { swatchStyle } from '@/lib/patterns';
import { fileToCompressedDataUrl } from '@/lib/imageUpload';

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
  const [mCustomType, setMCustomType] = useState(false);
  const [mPhoto, setMPhoto] = useState<string | null>(null);
  const [mPhotoError, setMPhotoError] = useState('');
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

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMPhotoError('');
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setMPhoto(dataUrl);
    } catch (err: any) {
      setMPhotoError(err.message || 'Could not process that photo.');
    }
  }

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
        images: mPhoto ? [mPhoto] : undefined,
      });
      setMForm(materialForm);
      setMCustomType(false);
      setMPhoto(null);
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
        {mCustomType ? (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              placeholder="Type your own (e.g. 'kitenge', 'kente', 'denim')"
              value={mForm.type}
              onChange={(e) => setMForm({ ...mForm, type: e.target.value })}
              required
              autoFocus
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={() => {
                setMCustomType(false);
                setMForm({ ...mForm, type: MATERIAL_TYPES[0] });
              }}
            >
              Use preset instead
            </button>
          </div>
        ) : (
          <select
            value={mForm.type}
            onChange={(e) => {
              if (e.target.value === '__custom__') {
                setMCustomType(true);
                setMForm({ ...mForm, type: '' });
              } else {
                setMForm({ ...mForm, type: e.target.value });
              }
            }}
          >
            {MATERIAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value="__custom__">+ Add a new type…</option>
          </select>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <input
            type="color"
            value={mForm.color}
            onChange={(e) => setMForm({ ...mForm, color: e.target.value })}
            style={{ padding: 0, width: 48, height: 38 }}
          />
          <span style={{ color: 'var(--ink-muted)', fontSize: '0.9rem' }}>
            Base colour (used if no photo is uploaded)
          </span>
        </label>
        <div>
          <label style={{ fontSize: '0.9rem', color: 'var(--ink-muted)', display: 'block', marginBottom: '0.3rem' }}>
            Fabric photo (optional, but recommended for prints — a real photo beats a guessed pattern)
          </label>
          <input type="file" accept="image/*" onChange={handlePhotoSelect} />
          {mPhotoError && <p className="error">{mPhotoError}</p>}
          {mPhoto && (
            <div
              style={{
                marginTop: '0.5rem',
                width: 90,
                height: 90,
                borderRadius: 10,
                border: '1px solid var(--line)',
                backgroundImage: `url(${mPhoto})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          )}
        </div>
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
            <div className="swatch-color" style={swatchStyle(m)} />
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
              <div className="swatch-color" style={swatchStyle(m)} />
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
