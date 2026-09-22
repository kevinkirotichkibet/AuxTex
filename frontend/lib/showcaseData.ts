import { MeasurementKey, ShowcaseFigure } from '@/app/components/MeasurementShowcase';

// Homepage: shows actual product photos (African prints), since the point
// there is "here's what we make" — measurement points are illustrative
// (where chest/waist/hips generally sit), not an instructional guide.
export const HOMEPAGE_FIGURES: ShowcaseFigure[] = [
  {
    key: 'female',
    label: 'Female',
    image: '/images/figure-female.png',
    points: { chest: 26, waist: 39, hips: 48 },
  },
  {
    key: 'male',
    label: 'Male',
    image: '/images/figure-male.png',
    points: { chest: 27, waist: 42, hips: 54 },
  },
  {
    key: 'kids',
    label: 'Kids',
    image: '/images/figure-kids.png',
    placeholder: "Kids' sizing isn't in the catalog yet. This is a preview of what's coming.",
  }
];

export const HOMEPAGE_MEASUREMENT_META: Record<MeasurementKey, { label: string; desc: string }> = {
  chest: { label: 'Chest', desc: 'Measured around the fullest part of the chest, under the arms.' },
  waist: { label: 'Waist', desc: 'Measured around the natural waistline, where the body bends side to side.' },
  hips: { label: 'Hips', desc: 'Measured around the fullest part of the hips and seat.' },
};

// Measurements page: an actual "how do I measure myself" guide. Plain
// form-fitting reference photos work far better here than product photos —
// the point is showing exactly where the tape goes on your own body, and
// a loose dress or a suit jacket hides that.
export const MEASURE_GUIDE_FIGURES: ShowcaseFigure[] = [
  {
    key: 'female',
    label: 'Female',
    image: '/images/measure-guide-female.png',
    points: { chest: 26, waist: 37, hips: 48 },
  },
  {
    key: 'male',
    label: 'Male',
    image: '/images/measure-guide-male.png',
    points: { chest: 27, waist: 37, hips: 47 },
  },
];

export const MEASURE_GUIDE_META: Record<MeasurementKey, { label: string; desc: string }> = {
  chest: {
    label: 'Chest',
    desc: 'Wrap the tape around the fullest part of your chest, under your arms, keeping it level and snug but not tight.',
  },
  waist: {
    label: 'Waist',
    desc: 'Wrap the tape around your natural waistline, the narrowest point, roughly where your body bends side to side.',
  },
  hips: {
    label: 'Hips',
    desc: 'Wrap the tape around the fullest part of your hips and seat, keeping it level all the way around.',
  },
};
