import { Material, MeasurementProfile } from '@/lib/api';

type Props = {
  material: Material | null;
  profile: MeasurementProfile | null;
};

// Baseline (scale = 1) half-widths, in the SVG's own coordinate space —
// taken directly from the fixed illustration on the homepage, so this
// renders identically when no profile is selected yet.
const REF = { chest: 32, waist: 23, hip: 30 };
// Neutral reference measurements (cm) that map to scale = 1. These are just
// a midpoint to scale relative to, not a claim about anyone's "average"
// body — the point is the avatar visibly widens or narrows relative to
// this, not that the baseline itself means anything on its own.
const REF_CM = { chest: 96, waist: 80, hip: 98 };

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

export default function FitAvatar({ material, profile }: Props) {
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
  const legLeftPath = `M${hipL},270 L${innerL},270 L${innerL - 4},420 L${hipL + 4},420 Z`;
  const legRightPath = `M${hipR},270 L${innerR},270 L${innerR + 4},420 L${hipR - 4},420 Z`;
  const footLcx = (hipL + innerL) / 2;
  const footRcx = (hipR + innerR) / 2;

  const patternKind = material ? printPatternKind(material.name) : null;
  const hasPhoto = !!material?.images?.[0];
  const fillColor = material?.color ?? '#d7e1f7';
  const patternId = 'avatar-fabric-pattern';
  const usePattern = hasPhoto || patternKind;
  const fill = usePattern ? `url(#${patternId})` : fillColor;

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

        <g fill={fill} stroke="#c7cfdc" strokeWidth="0.5">
          <circle cx="210" cy="55" r="27" fill="#e8ecf5" stroke="none" />
          <rect x="200" y="79" width="20" height="14" fill="#e8ecf5" stroke="none" />
          <path d={torsoPath} />
          <path
            d={`M${180 + armShiftL},104 C${158 + armShiftL},128 ${146 + armShiftL},168 ${145 + armShiftL},215 L${162 + armShiftL},218 C${165 + armShiftL},175 ${178 + armShiftL},138 ${198 + armShiftL},112 Z`}
          />
          <path
            d={`M${240 + armShiftR},104 C${262 + armShiftR},128 ${274 + armShiftR},168 ${275 + armShiftR},215 L${258 + armShiftR},218 C${255 + armShiftR},175 ${242 + armShiftR},138 ${222 + armShiftR},112 Z`}
          />
          <path d={hipPath} />
          <path d={legLeftPath} />
          <path d={legRightPath} />
          <ellipse cx={footLcx} cy="428" rx="10" ry="8" />
          <ellipse cx={footRcx} cy="428" rx="10" ry="8" />
        </g>
      </svg>
      <p className="avatar-caption">
        {material
          ? `Rough preview in ${material.name}${profile ? `, scaled to ${profile.label}` : ''} — a visual guide, not an exact fit.`
          : 'Pick a material to preview it here.'}
      </p>
    </div>
  );
}
