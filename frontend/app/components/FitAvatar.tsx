import { Material } from '@/lib/api';

// Deliberately looser than the full MeasurementProfile type — this needs to
// work both with a saved profile (product page) and a live draft object
// built from whatever's currently typed into the measurements form
// (measurements page), which has no _id yet.
export type AvatarProfile = {
  label?: string;
  gender?: 'male' | 'female';
  chest?: number;
  waist?: number;
  hips?: number;
};

type Props = {
  material: Material | null;
  profile: AvatarProfile | null;
  // The product's category (suit/blazer/shirt/trousers/dress/skirt).
  // Determines which body regions are actually rendered in the selected
  // fabric — a blazer doesn't color the legs, a skirt doesn't color the
  // torso, etc. Omitted (e.g. on the measurements page, where there's no
  // specific product) falls back to coloring the whole body.
  category?: string;
};

// Baseline (scale = 1) half-widths, in the SVG's own coordinate space, and
// the neutral reference measurements (cm) that map to scale = 1 — one set
// per gender, since typical shoulder/waist/hip ratios differ, plus a
// unisex fallback when no gender is set. None of these are claims about
// anyone's "correct" proportions — they're just the midpoint the avatar
// scales outward/inward from.
const PROPORTIONS = {
  male: { ref: { chest: 34, waist: 22, hip: 28 }, refCm: { chest: 100, waist: 85, hip: 98 } },
  female: { ref: { chest: 28, waist: 21, hip: 32 }, refCm: { chest: 92, waist: 75, hip: 98 } },
  unisex: { ref: { chest: 32, waist: 23, hip: 30 }, refCm: { chest: 96, waist: 80, hip: 98 } },
};

// What each garment category actually covers. "legs" = the ordinary
// two-leg silhouette; "dress" = one flared shape from hip to mid-calf, no
// leg split (a dress covers both legs as one garment); "skirt" = the same
// flare but knee-length, with bare (neutral) legs showing below it.
type LowerStyle = 'legs' | 'dress' | 'skirt';
const GARMENT_CONFIG: Record<string, { upper: boolean; lower: boolean; lowerStyle: LowerStyle }> = {
  suit: { upper: true, lower: true, lowerStyle: 'legs' },
  blazer: { upper: true, lower: false, lowerStyle: 'legs' },
  shirt: { upper: true, lower: false, lowerStyle: 'legs' },
  trousers: { upper: false, lower: true, lowerStyle: 'legs' },
  dress: { upper: true, lower: true, lowerStyle: 'dress' },
  skirt: { upper: false, lower: true, lowerStyle: 'skirt' },
};
const DEFAULT_GARMENT = { upper: true, lower: true, lowerStyle: 'legs' as LowerStyle };

const NEUTRAL = '#eef1f6';

function clampScale(valueCm: number | undefined, refCm: number): number {
  if (!valueCm) return 1;
  return Math.min(1.3, Math.max(0.8, valueCm / refCm));
}

function printPatternKind(name: string): 'check' | 'dots' | 'stripe' | null {
  const n = name.toLowerCase();
  if (n.includes('maasai') || n.includes('shuka')) return 'check';
  if (n.includes('kitenge') || n.includes('ankara') || n.includes('kente')) return 'dots';
  if (n.includes('kikoy')) return 'stripe';
  return null;
}

export default function FitAvatar({ material, profile, category }: Props) {
  const { ref: REF, refCm: REF_CM } =
    PROPORTIONS[profile?.gender === 'male' || profile?.gender === 'female' ? profile.gender : 'unisex'];
  const garment = (category && GARMENT_CONFIG[category]) || DEFAULT_GARMENT;

  const chestScale = clampScale(profile?.chest, REF_CM.chest);
  const waistScale = clampScale(profile?.waist, REF_CM.waist);
  const hipScale = clampScale(profile?.hips, REF_CM.hip);

  const cx = 210;
  const shoulderL = cx - REF.chest * chestScale;
  const shoulderR = cx + REF.chest * chestScale;
  const waistL = cx - REF.waist * waistScale;
  const waistR = cx + REF.waist * waistScale;
  const hipL = cx - REF.hip * hipScale;
  const hipR = cx + REF.hip * hipScale;

  // Arms slide outward/inward as one piece with the shoulder, rather than
  // trying to re-derive a continuously-joined curve — simpler, and avoids
  // introducing kinks in the arm shape at extreme scales.
  const armShiftL = shoulderL - 180;
  const armShiftR = shoulderR - 240;

  // A fixed half-gap between the legs' inner edges, independent of hip
  // scale — without this, a narrow hip measurement could shrink the two
  // legs' shapes into each other (verified: they visibly crossed/merged
  // before this was pinned down).
  const GAP = 8;
  const innerL = cx - GAP;
  const innerR = cx + GAP;

  const torsoPath = `M${shoulderL},100 Q210,88 ${shoulderR},100 L${waistR},225 Q210,233 ${waistL},225 Z`;
  const hipPath = `M${waistL},225 Q210,233 ${waistR},225 L${hipR},270 Q210,280 ${hipL},270 Z`;

  function legPaths(topY: number, bottomY: number) {
    return {
      left: `M${hipL},${topY} L${innerL},${topY} L${innerL - 4},${bottomY} L${hipL + 4},${bottomY} Z`,
      right: `M${hipR},${topY} L${innerR},${topY} L${innerR + 4},${bottomY} L${hipR - 4},${bottomY} Z`,
    };
  }
  const fullLegs = legPaths(270, 420);

  // Dress: one flared shape, no leg split — covers both legs as a single
  // garment. Skirt: the same flare, shorter (knee-length), with bare
  // (neutral) legs showing below it down to the ankle.
  const dressHemL = hipL - 25;
  const dressHemR = hipR + 25;
  const dressHemY = 400;
  const dressPath = `M${hipL},270 L${hipR},270 L${dressHemR},${dressHemY} L${dressHemL},${dressHemY} Z`;

  const skirtHemL = hipL - 18;
  const skirtHemR = hipR + 18;
  const skirtHemY = 335;
  const skirtPath = `M${hipL},270 L${hipR},270 L${skirtHemR},${skirtHemY} L${skirtHemL},${skirtHemY} Z`;
  const bareLegs = legPaths(335, 420);

  const patternKind = material ? printPatternKind(material.name) : null;
  const hasPhoto = !!material?.images?.[0];
  const fillColor = material?.color ?? '#d7e1f7';
  const patternId = 'avatar-fabric-pattern';
  const usePattern = hasPhoto || patternKind;
  const fabricFill = usePattern ? `url(#${patternId})` : fillColor;

  const upperFill = garment.upper ? fabricFill : NEUTRAL;
  const lowerFill = garment.lower ? fabricFill : NEUTRAL;

  return (
    <div>
      <svg
        viewBox="0 0 420 460"
        width="100%"
        height="auto"
        role="img"
        aria-label="A rough preview of the fit, in the selected fabric"
      >
        <defs>
          {hasPhoto && (
            <pattern id={patternId} patternUnits="objectBoundingBox" width="1" height="1">
              <image href={material!.images[0]} x="0" y="0" width="420" height="460" preserveAspectRatio="xMidYMid slice" />
            </pattern>
          )}
          {!hasPhoto && patternKind === 'check' && (
            <pattern id={patternId} patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)">
              <rect width="16" height="16" fill={fillColor} />
              <rect width="8" height="16" fill="#1c1a17" />
            </pattern>
          )}
          {!hasPhoto && patternKind === 'dots' && (
            <pattern id={patternId} patternUnits="userSpaceOnUse" width="18" height="18">
              <rect width="18" height="18" fill={fillColor} />
              <circle cx="9" cy="9" r="4" fill="#1c1a17" />
            </pattern>
          )}
          {!hasPhoto && patternKind === 'stripe' && (
            <pattern id={patternId} patternUnits="userSpaceOnUse" width="16" height="16">
              <rect width="16" height="16" fill={fillColor} />
              <rect width="16" height="6" fill="#ffffff" />
            </pattern>
          )}
        </defs>

        <circle cx="210" cy="55" r="27" fill="#e8ecf5" />
        <rect x="200" y="79" width="20" height="14" fill="#e8ecf5" />

        <g fill={upperFill} stroke="#c7cfdc" strokeWidth="0.5">
          <path d={torsoPath} />
          <path
            d={`M${180 + armShiftL},104 C${158 + armShiftL},128 ${146 + armShiftL},168 ${145 + armShiftL},215 L${162 + armShiftL},218 C${165 + armShiftL},175 ${178 + armShiftL},138 ${198 + armShiftL},112 Z`}
          />
          <path
            d={`M${240 + armShiftR},104 C${262 + armShiftR},128 ${274 + armShiftR},168 ${275 + armShiftR},215 L${258 + armShiftR},218 C${255 + armShiftR},175 ${242 + armShiftR},138 ${222 + armShiftR},112 Z`}
          />
        </g>

        {garment.lowerStyle === 'legs' && (
          <g fill={lowerFill} stroke="#c7cfdc" strokeWidth="0.5">
            <path d={hipPath} />
            <path d={fullLegs.left} />
            <path d={fullLegs.right} />
          </g>
        )}

        {garment.lowerStyle === 'dress' && (
          <g fill={lowerFill} stroke="#c7cfdc" strokeWidth="0.5">
            <path d={hipPath} />
            <path d={dressPath} />
          </g>
        )}

        {garment.lowerStyle === 'skirt' && (
          <>
            <g fill={NEUTRAL} stroke="#c7cfdc" strokeWidth="0.5">
              <path d={hipPath} />
            </g>
            <g fill={lowerFill} stroke="#c7cfdc" strokeWidth="0.5">
              <path d={skirtPath} />
            </g>
            <g fill={NEUTRAL} stroke="#c7cfdc" strokeWidth="0.5">
              <path d={bareLegs.left} />
              <path d={bareLegs.right} />
            </g>
          </>
        )}

        <g fill={NEUTRAL} stroke="#c7cfdc" strokeWidth="0.5">
          {garment.lowerStyle === 'legs' && (
            <>
              <ellipse cx={(hipL + innerL) / 2} cy="428" rx="10" ry="8" />
              <ellipse cx={(hipR + innerR) / 2} cy="428" rx="10" ry="8" />
            </>
          )}
          {garment.lowerStyle !== 'legs' && (
            <>
              <ellipse cx={cx - 12} cy="428" rx="10" ry="8" />
              <ellipse cx={cx + 12} cy="428" rx="10" ry="8" />
            </>
          )}
        </g>
      </svg>
      <p className="avatar-caption">
        {material
          ? `Rough preview in ${material.name}${profile?.label ? `, scaled to ${profile.label}` : ''}. A visual guide, not an exact fit.`
          : 'Pick a material to preview it here.'}
      </p>
    </div>
  );
}
