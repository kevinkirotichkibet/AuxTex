'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Product, formatKes } from '@/lib/api';

const SWATCH_COLORS = [
  '#21304a', '#a9793d', '#5c1f1f',
  '#e4dfd3', '#3d4c3d', '#7a6a4f',
  '#1c1a17', '#c99a5b', '#4a5568',
];

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'suit', label: 'Suits' },
  { value: 'blazer', label: 'Blazers' },
  { value: 'shirt', label: 'Shirts' },
  { value: 'trousers', label: 'Trousers' },
  { value: 'dress', label: 'Dresses' },
  { value: 'skirt', label: 'Skirts' },
];

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .getProducts(category || undefined)
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div>
      <section className="hero">
        <div>
          <h1>Clothes cut to your exact shape, not the nearest size.</h1>
          <p className="lede">
            Choose a garment, pick the fabric it's made from — from classic wool and linen to
            Maasai shuka and Kitenge prints — and enter your own measurements. Every order is
            built to fit one person: you.
          </p>
          <a href="#catalog" className="hero-cta">
            <button>Browse the collection</button>
          </a>
        </div>
        <div className="swatch-mosaic" aria-hidden="true">
          {SWATCH_COLORS.map((color) => (
            <span key={color} style={{ background: color }} />
          ))}
        </div>
      </section>

      <section className="process">
        <div className="process-step">
          <span className="step-number">01</span>
          <h3>Choose a garment</h3>
          <p>Suits, shirts, trousers, blazers, dresses, and skirts — each made to order.</p>
        </div>
        <div className="process-step">
          <span className="step-number">02</span>
          <h3>Pick your fabric</h3>
          <p>Wool, cotton, linen, silk, and African prints like Kitenge and Maasai shuka.</p>
        </div>
        <div className="process-step">
          <span className="step-number">03</span>
          <h3>Enter your measurements</h3>
          <p>Save a profile for yourself, or for anyone else you're ordering for.</p>
        </div>
      </section>

      <section id="catalog">
        <div className="section-heading">
          <h2>The collection</h2>
        </div>

        <div className="filter-tabs">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              className={`filter-tab ${category === c.value ? 'active' : ''}`}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading && <p>Loading products…</p>}
        {error && <p className="error">{error}</p>}

        <div className="product-grid">
          {products.map((p) => (
            <Link key={p._id} href={`/products/${p._id}`} className="card">
              <img src={p.images?.[0] || 'https://placehold.co/400x300'} alt={p.name} />
              <h3>{p.name}</h3>
              <p className="price">From {formatKes(p.basePrice)}</p>
            </Link>
          ))}
          {!loading && products.length === 0 && !error && (
            <p style={{ padding: '1.5rem' }}>No garments in this category yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
