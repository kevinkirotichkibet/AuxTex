'use client';

import { useRef, useState } from 'react';
import { estimateFromImage, PoseEstimate } from '@/lib/poseEstimate';

type Props = {
  onEstimate: (estimate: PoseEstimate) => void;
  gender?: '' | 'male' | 'female';
};

export default function PhotoEstimator({ onEstimate, gender: genderProp }: Props) {
  const [open, setOpen] = useState(false);
  const [heightCm, setHeightCm] = useState('');
  const [localGender, setLocalGender] = useState<'' | 'male' | 'female'>('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PoseEstimate | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // If the surrounding form already has a gender selected (measurements
  // page), use that and don't ask again; otherwise let the person set it
  // here — it only affects the chest/waist/hip approximation slightly, so
  // it's not required.
  const gender = genderProp !== undefined ? genderProp : localGender;

  async function handleEstimate() {
    if (!file || !heightCm) {
      setError('Add a photo and your height first.');
      return;
    }
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const estimate = await estimateFromImage(file, Number(heightCm), gender || undefined);
      setResult(estimate);
      drawOverlay(estimate);
    } catch (e: any) {
      setError(e.message || 'Could not process that photo.');
    } finally {
      setBusy(false);
    }
  }

  function drawOverlay(estimate: PoseEstimate & { canvas: HTMLCanvasElement }) {
    const displayCanvas = canvasRef.current;
    if (!displayCanvas) return;
    const source = estimate.canvas;
    const maxWidth = 360;
    const scale = maxWidth / source.width;
    displayCanvas.width = maxWidth;
    displayCanvas.height = source.height * scale;
    const ctx = displayCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(source, 0, 0, displayCanvas.width, displayCanvas.height);
    ctx.fillStyle = '#2f6fed';
    for (const kp of estimate.keypoints) {
      if (kp.score < 0.2) continue;
      ctx.beginPath();
      ctx.arc(kp.x * scale, kp.y * scale, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  function handleUseEstimate() {
    if (result) onEstimate(result);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}>
        Estimate from a photo
      </button>
    );
  }

  return (
    <div style={{ border: '1px solid var(--line)', padding: '1.25rem', marginBottom: '1.5rem' }}>
      <h3 style={{ marginTop: 0 }}>Estimate from a photo</h3>
      <p style={{ fontSize: '0.9rem' }}>
        Your photo is processed entirely in your browser and never uploaded anywhere. Use a
        straight-on, full-body photo against a plain background, arms slightly away from your
        sides. This gives a <strong>rough starting point</strong>. Chest and waist especially
        can't be read accurately from a single photo, so review every number before saving.
      </p>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <input
        placeholder="Your actual height (cm)"
        type="number"
        value={heightCm}
        onChange={(e) => setHeightCm(e.target.value)}
        style={{ marginTop: '0.6rem' }}
      />
      {genderProp === undefined && (
        <select
          value={localGender}
          onChange={(e) => setLocalGender(e.target.value as '' | 'male' | 'female')}
          style={{ marginTop: '0.6rem' }}
        >
          <option value="">Gender (optional, refines the estimate slightly)</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
      )}

      {error && <p className="error">{error}</p>}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.8rem' }}>
        <button type="button" onClick={handleEstimate} disabled={busy}>
          {busy ? 'Analyzing…' : 'Analyze photo'}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={busy}>
          Close
        </button>
      </div>

      {result && (
        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <canvas ref={canvasRef} style={{ border: '1px solid var(--line)' }} />
          <div>
            <p style={{ margin: '0 0 0.5rem' }}>
              <strong>Rough estimates (cm)</strong>
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--ink-muted)' }}>
              <li>Chest: {result.chest}</li>
              <li>Waist: {result.waist}</li>
              <li>Hips: {result.hips}</li>
              <li>Shoulder width: {result.shoulderWidth}</li>
              <li>Sleeve length: {result.sleeveLength}</li>
              <li>Inseam: {result.inseam}</li>
            </ul>
            <button type="button" onClick={handleUseEstimate} style={{ marginTop: '0.8rem' }}>
              Use these estimates
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
