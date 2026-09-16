export default function BodySilhouette() {
  return (
    <svg
      viewBox="0 0 420 460"
      width="100%"
      height="auto"
      role="img"
      aria-label="Illustration of measurement points on a body outline"
    >
      {/* Dashed connector lines, drawn first so the labels sit on top */}
      <line x1="72" y1="148" x2="185" y2="148" stroke="#2f6fed" strokeWidth="1.5" strokeDasharray="4 4" />
      <line x1="72" y1="235" x2="185" y2="235" stroke="#2f6fed" strokeWidth="1.5" strokeDasharray="4 4" />
      <line x1="72" y1="285" x2="188" y2="285" stroke="#2f6fed" strokeWidth="1.5" strokeDasharray="4 4" />

      {/* Body silhouette — simple geometric shapes, not a rendering of any
          existing figure or photo */}
      <g fill="#d7e1f7">
        <circle cx="210" cy="55" r="27" />
        <rect x="200" y="79" width="20" height="14" />
        <path d="M178,100 Q210,88 242,100 L233,225 Q210,233 187,225 Z" />
        <path d="M180,104 C158,128 146,168 145,215 L162,218 C165,175 178,138 198,112 Z" />
        <path d="M240,104 C262,128 274,168 275,215 L258,218 C255,175 242,138 222,112 Z" />
        <path d="M187,225 Q210,233 233,225 L240,270 Q210,280 180,270 Z" />
        <path d="M180,270 Q195,274 206,272 L202,420 L180,420 L177,272 Z" />
        <path d="M240,270 Q225,274 214,272 L218,420 L240,420 L243,272 Z" />
        <ellipse cx="188" cy="428" rx="16" ry="8" />
        <ellipse cx="232" cy="428" rx="16" ry="8" />
      </g>

      {/* Callout labels */}
      <g fontFamily="Inter, sans-serif" fontSize="13" fontWeight={700} fill="#12151c">
        <rect x="8" y="132" width="62" height="32" rx="16" fill="#ffffff" stroke="#e4e8f0" />
        <text x="39" y="152" textAnchor="middle">CHEST</text>

        <rect x="8" y="219" width="62" height="32" rx="16" fill="#ffffff" stroke="#e4e8f0" />
        <text x="39" y="239" textAnchor="middle">WAIST</text>

        <rect x="12" y="269" width="54" height="32" rx="16" fill="#ffffff" stroke="#e4e8f0" />
        <text x="39" y="289" textAnchor="middle">HIPS</text>
      </g>
    </svg>
  );
}
