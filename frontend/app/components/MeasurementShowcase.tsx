'use client';

import { useEffect, useState } from 'react';

type MeasurementKey = 'chest' | 'waist' | 'hips';

type Figure = {
  key: string;
  label: string;
  image: string | null;
  // Position of each measurement line, as a percentage of the image's
  // height — estimated by eye from the actual photo, not measured
  // precisely. Omitted entirely (rather than guessed) for a photo where
  // that wouldn't mean much, like the two-child preview image.
  points?: Record<MeasurementKey, number>;
  placeholder?: string;
};

const MEASUREMENT_META: Record<MeasurementKey, { label: string; desc: string }> = {
  chest: { label: 'Chest', desc: 'Measured around the fullest part of the chest, under the arms.' },
  waist: { label: 'Waist', desc: 'Measured around the natural waistline, where the body bends side to side.' },
  hips: { label: 'Hips', desc: 'Measured around the fullest part of the hips and seat.' },
};

const FIGURES: Figure[] = [
  {
    key: 'female',
    label: 'Female',
    image: '/images/figure-female.png',
    points: { chest: 33, waist: 46, hips: 55 },
  },
  {
    key: 'male',
    label: 'Male',
    image: null,
    placeholder: "Male reference photo coming soon — the diagram works the same way once it's added.",
  },
  {
    key: 'kids',
    label: 'Kids',
    image: '/images/figure-kids.png',
    placeholder: "Kids' sizing isn't in the catalog yet — this is a preview of what's coming.",
  },
];

const AUTO_ADVANCE_MS = 5000;

export default function MeasurementShowcase() {
  const [index, setIndex] = useState(0);
  const [activeKey, setActiveKey] = useState<MeasurementKey | null>(null);

  const figure = FIGURES[index];

  // Auto-advance the carousel, but stop nudging the person once they've
  // deliberately picked a figure via the toggle or arrows — re-arm after a
  // pause rather than fighting their choice indefinitely.
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % FIGURES.length);
      setActiveKey(null);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, []);

  function goTo(i: number) {
    setIndex(i);
    setActiveKey(null);
  }

  return (
    <div className="measurement-showcase">
      <div className="showcase-toggle">
        {FIGURES.map((f, i) => (
          <button
            key={f.key}
            className={i === index ? 'on' : ''}
            onClick={() => goTo(i)}
            type="button"
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="showcase-figure">
        {figure.image ? (
          <img src={figure.image} alt={`${figure.label} measurement reference`} />
        ) : (
          <div className="showcase-placeholder">
            <span>{figure.label}</span>
          </div>
        )}

        {figure.points && (
          <div className="showcase-lines">
            {(Object.keys(figure.points) as MeasurementKey[]).map((key) => (
              <div
                key={key}
                className={`showcase-line ${activeKey === key ? 'active' : ''}`}
                style={{ top: `${figure.points![key]}%` }}
              />
            ))}
          </div>
        )}

        {figure.points &&
          (Object.keys(figure.points) as MeasurementKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`showcase-pill ${activeKey === key ? 'active' : ''}`}
              style={{ top: `${figure.points![key]}%` }}
              onMouseEnter={() => setActiveKey(key)}
              onClick={() => setActiveKey(key)}
            >
              {MEASUREMENT_META[key].label.toUpperCase()}
            </button>
          ))}
      </div>

      <div className="showcase-caption">
        {figure.placeholder ? (
          figure.placeholder
        ) : activeKey ? (
          <>
            <strong>{MEASUREMENT_META[activeKey].label}</strong> — {MEASUREMENT_META[activeKey].desc}
          </>
        ) : (
          'Hover or tap a label to see how that measurement is taken.'
        )}
      </div>
    </div>
  );
}
