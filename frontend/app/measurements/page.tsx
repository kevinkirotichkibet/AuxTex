'use client';

import { useEffect, useState } from 'react';
import { api, MeasurementProfile } from '@/lib/api';
import { useLoggedIn } from '@/lib/useAuth';
import PhotoEstimator from '@/app/components/PhotoEstimator';
import { PoseEstimate } from '@/lib/poseEstimate';
import FitAvatar from '@/app/components/FitAvatar';
import MeasurementShowcase from '@/app/components/MeasurementShowcase';
import { MEASURE_GUIDE_FIGURES, MEASURE_GUIDE_META } from '@/lib/showcaseData';

const emptyForm = {
  label: '',
  unit: 'cm',
  gender: '' as '' | 'male' | 'female',
  chest: '',
  waist: '',
  hips: '',
  shoulderWidth: '',
  sleeveLength: '',
  inseam: '',
  neck: '',
  height: '',
};

export default function MeasurementsPage() {
  const [profiles, setProfiles] = useState<MeasurementProfile[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showGuide, setShowGuide] = useState(true); // TEMP-TEST
  const loggedIn = useLoggedIn();

  function load() {
    api.getMeasurementProfiles().then(setProfiles).catch((e) => setError(e.message));
  }

  useEffect(() => {
    if (loggedIn) {
      load();
    } else {
      setProfiles([]);
    }
  }, [loggedIn]);

  if (!loggedIn) {
    return (
      <p>
        <a href="/login">Log in</a> to manage your measurement profiles. You can save one for
        yourself and one for each family member you're ordering for.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createMeasurementProfile({
        label: form.label,
        unit: form.unit,
        gender: form.gender || undefined,
        chest: Number(form.chest),
        waist: Number(form.waist),
        hips: Number(form.hips),
        shoulderWidth: form.shoulderWidth ? Number(form.shoulderWidth) : undefined,
        sleeveLength: form.sleeveLength ? Number(form.sleeveLength) : undefined,
        inseam: form.inseam ? Number(form.inseam) : undefined,
        neck: form.neck ? Number(form.neck) : undefined,
        height: form.height ? Number(form.height) : undefined,
      });
      setForm(emptyForm);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1>My Measurement Profiles</h1>

      <div className="product-grid">
        {profiles.map((p) => (
          <div key={p._id} className="card">
            <h3>{p.label}</h3>
            <p>
              {p.gender && `${p.gender === 'male' ? 'Male' : 'Female'} · `}
              Chest {p.chest}{p.unit} · Waist {p.waist}{p.unit} · Hips {p.hips}{p.unit}
            </p>
          </div>
        ))}
        {profiles.length === 0 && <p>No profiles saved yet.</p>}
      </div>

      <h2>Add a new profile</h2>
      <p>Save separate profiles for yourself, a partner, or anyone else you tailor for.</p>

      {!showGuide ? (
        <button type="button" onClick={() => setShowGuide(true)}>
          How to measure yourself
        </button>
      ) : (
        <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 style={{ marginTop: 0 }}>How to measure yourself</h3>
            <button type="button" onClick={() => setShowGuide(false)} style={{ fontSize: '0.85rem' }}>
              Close
            </button>
          </div>
          <div className="product-layout">
            <div>
              <p>
                A few basics that make a real difference to accuracy, whichever measurement
                you're taking:
              </p>
              <ul style={{ color: 'var(--ink-muted)', lineHeight: 1.8, paddingLeft: '1.2rem' }}>
                <li>Use a soft cloth tape measure, not a rigid metal one.</li>
                <li>Measure over light clothing or undergarments, not bulky layers.</li>
                <li>Keep the tape snug against your body, not pulled tight.</li>
                <li>Stand naturally, arms relaxed at your sides.</li>
                <li>Ask someone to help with points you can't see yourself, like your back.</li>
              </ul>
              <p>Pick Female or Male on the right to see exactly where each measurement sits.</p>
            </div>
            <MeasurementShowcase
              figures={MEASURE_GUIDE_FIGURES}
              measurementMeta={MEASURE_GUIDE_META}
              autoAdvance={false}
            />
          </div>
        </div>
      )}

      <PhotoEstimator
        gender={form.gender}
        onEstimate={(est: PoseEstimate) =>
          setForm({
            ...form,
            unit: 'cm',
            chest: String(est.chest),
            waist: String(est.waist),
            hips: String(est.hips),
            shoulderWidth: String(est.shoulderWidth),
            sleeveLength: String(est.sleeveLength),
            inseam: String(est.inseam),
            height: String(est.height),
          })
        }
      />

      <div className="product-layout">
        <form onSubmit={handleSubmit} className="form-wide">
          <input
            placeholder="Label (e.g. 'My measurements', 'Dad's suit')"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            required
          />
          <div className="form-grid-2">
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as '' | 'male' | 'female' })}
            >
              <option value="">Gender (fit preview shape)</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              <option value="cm">Centimeters</option>
              <option value="in">Inches</option>
            </select>
          </div>
          <div className="form-grid-2">
            <input
              placeholder="Chest"
              type="number"
              value={form.chest}
              onChange={(e) => setForm({ ...form, chest: e.target.value })}
              required
            />
            <input
              placeholder="Waist"
              type="number"
              value={form.waist}
              onChange={(e) => setForm({ ...form, waist: e.target.value })}
              required
            />
            <input
              placeholder="Hips"
              type="number"
              value={form.hips}
              onChange={(e) => setForm({ ...form, hips: e.target.value })}
              required
            />
            <input
              placeholder="Shoulder width (optional)"
              type="number"
              value={form.shoulderWidth}
              onChange={(e) => setForm({ ...form, shoulderWidth: e.target.value })}
            />
            <input
              placeholder="Sleeve length (optional)"
              type="number"
              value={form.sleeveLength}
              onChange={(e) => setForm({ ...form, sleeveLength: e.target.value })}
            />
            <input
              placeholder="Inseam (optional)"
              type="number"
              value={form.inseam}
              onChange={(e) => setForm({ ...form, inseam: e.target.value })}
            />
            <input
              placeholder="Neck (optional)"
              type="number"
              value={form.neck}
              onChange={(e) => setForm({ ...form, neck: e.target.value })}
            />
            <input
              placeholder="Height (optional)"
              type="number"
              value={form.height}
              onChange={(e) => setForm({ ...form, height: e.target.value })}
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </form>

        <div className="avatar-panel">
          <FitAvatar
            material={null}
            profile={{
              label: form.label || undefined,
              gender: form.gender || undefined,
              chest: form.chest ? Number(form.chest) : undefined,
              waist: form.waist ? Number(form.waist) : undefined,
              hips: form.hips ? Number(form.hips) : undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}
