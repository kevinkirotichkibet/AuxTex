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
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [deletingMaterialId, setDeletingMaterialId] = useState<string | null>(null);
  const [mListError, setMListError] = useState('');

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

  async function handleSaveMaterial(e: React.FormEvent) {
    e.preventDefault();
    setMSaving(true);
    setMError('');
    try {
      const payload = {
        name: mForm.name,
        type: mForm.type,
        color: mForm.color,
        pricePerMeter: Number(mForm.pricePerMeter),
        stock: mForm.stock ? Number(mForm.stock) : undefined,
        images: mPhoto ? [mPhoto] : [],
      };
      if (editingMaterialId) {
        await api.updateMaterial(editingMaterialId, payload);
      } else {
        await api.createMaterial(payload);
      }
      cancelEditMaterial();
      loadCatalog();
    } catch (e: any) {
      setMError(e.message);
    } finally {
      setMSaving(false);
    }
  }

  function startEditMaterial(m: Material) {
    setMForm({
      name: m.name,
      type: m.type,
      color: m.color,
      pricePerMeter: String(m.pricePerMeter),
      stock: m.stock != null ? String(m.stock) : '',
    });
    setMCustomType(!MATERIAL_TYPES.includes(m.type));
    setMPhoto(m.images?.[0] ?? null);
    setMPhotoError('');
    setMError('');
    setEditingMaterialId(m._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditMaterial() {
    setMForm(materialForm);
    setMCustomType(false);
    setMPhoto(null);
    setMPhotoError('');
    setEditingMaterialId(null);
  }

  async function handleDeleteMaterial(m: Material) {
    if (!confirm(`Delete "${m.name}"? This can't be undone.`)) return;
    setDeletingMaterialId(m._id);
    setMListError('');
    try {
      await api.deleteMaterial(m._id);
      if (editingMaterialId === m._id) cancelEditMaterial();
      loadCatalog();
    } catch (e: any) {
      setMListError(e.message);
    } finally {
      setDeletingMaterialId(null);
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
        <h1>Admin: manage the catalog</h1>
        <Link href="/admin/orders">View orders</Link>
      </div>

      <h2>{editingMaterialId ? 'Edit material' : 'Add a material'}</h2>
      <form onSubmit={handleSaveMaterial}>
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
            Fabric photo (optional, but recommended for prints. A real photo beats a guessed pattern)
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
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="submit" disabled={mSaving}>
            {mSaving ? 'Saving…' : editingMaterialId ? 'Update material' : 'Add material'}
          </button>
          {editingMaterialId && (
            <button type="button" onClick={cancelEditMaterial} disabled={mSaving}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {mListError && <p className="error" style={{ marginTop: '1rem' }}>{mListError}</p>}
      <div className="swatch-grid" style={{ marginTop: '1.5rem' }}>
        {materials.map((m) => (
          <div key={m._id} className="swatch" style={{ cursor: 'default' }}>
            <div className="swatch-color" style={swatchStyle(m)} />
            <small>{m.name}</small>
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => startEditMaterial(m)}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMaterial(m)}
                disabled={deletingMaterialId === m._id}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem', background: 'var(--error)' }}
              >
                {deletingMaterialId === m._id ? '…' : 'Delete'}
              </button>
            </div>
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
