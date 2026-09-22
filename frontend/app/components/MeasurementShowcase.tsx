'use client';

import { useEffect, useState } from 'react';

export type MeasurementKey = 'chest' | 'waist' | 'hips';

export type ShowcaseFigure = {
  key: string;
  label: string;
  image: string | null;
  // Position of each measurement line, as a percentage of the image's
  // height — estimated by eye from the actual photo, not measured
  // precisely. Omitted entirely (rather than guessed) for a photo where
  // that wouldn't mean much, like a multi-person preview image.
  points?: Partial<Record<MeasurementKey, number>>;
  placeholder?: string;
};

type MeasurementMeta = { label: string; desc: string };

type Props = {
  figures: ShowcaseFigure[];
  measurementMeta: Record<MeasurementKey, MeasurementMeta>;
  autoAdvance?: boolean;
  defaultCaption?: string;
};

const AUTO_ADVANCE_MS = 5000;

export default function MeasurementShowcase({
  figures,
  measurementMeta,
  autoAdvance = true,
  defaultCaption = 'Hover or tap a label to see how that measurement is taken.',
}: Props) {
  const [index, setIndex] = useState(0);
  const [activeKey, setActiveKey] = useState<MeasurementKey | null>(null);

  const figure = figures[index];

  // Auto-advance the carousel, but stop nudging the person once they've
  // deliberately picked a figure via the toggle — re-arm after a pause
  // rather than fighting their choice indefinitely.
  useEffect(() => {
    if (!autoAdvance || figures.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % figures.length);
      setActiveKey(null);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [autoAdvance, figures.length]);

  function goTo(i: number) {
    setIndex(i);
    setActiveKey(null);
  }

  const points = figure.points
    ? (Object.keys(figure.points) as MeasurementKey[]).filter((k) => figure.points![k] != null)
    : [];

  return (
    <div className="measurement-showcase">
      {figures.length > 1 && (
        <div className="showcase-toggle">
          {figures.map((f, i) => (
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
      )}

      <div className="showcase-figure">
        {figure.image ? (
          <img src={figure.image} alt={`${figure.label} measurement reference`} />
        ) : (
          <div className="showcase-placeholder">
            <span>{figure.label}</span>
          </div>
        )}

        {points.length > 0 && (
          <div className="showcase-lines">
            {points.map((key) => (
              <div
                key={key}
                className={`showcase-line ${activeKey === key ? 'active' : ''}`}
                style={{ top: `${figure.points![key]}%` }}
              />
            ))}
          </div>
        )}

        {points.map((key) => (
          <button
            key={key}
            type="button"
            className={`showcase-pill ${activeKey === key ? 'active' : ''}`}
            style={{ top: `${figure.points![key]}%` }}
            onMouseEnter={() => setActiveKey(key)}
            onClick={() => setActiveKey(key)}
          >
            {measurementMeta[key].label.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="showcase-caption">
        {figure.placeholder ? (
          figure.placeholder
        ) : activeKey ? (
          <>
            <strong>{measurementMeta[activeKey].label}</strong>. {measurementMeta[activeKey].desc}
          </>
        ) : (
          defaultCaption
        )}
      </div>
    </div>
  );
}
