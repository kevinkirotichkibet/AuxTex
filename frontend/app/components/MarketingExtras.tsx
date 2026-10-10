// Purely additive homepage content — a trust/stats band, a "why us" row,
// and a closing call-to-action banner. None of this touches the existing
// hero, process steps, measurement showcase, or catalog grid; it's meant
// to slot in alongside them. Every claim here is something the app
// actually does (3D preview, made-to-order, the specific prints in the
// catalog) — nothing invented or borrowed from elsewhere.

function IconRuler() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="8" width="19" height="8" rx="1.5" />
      <path d="M6 8v3M9.5 8v2M13 8v3M16.5 8v2" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconSwatch() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

export function TrustAndWhyUs() {
  return (
    <>
      <section className="trust-stats">
        <div className="trust-stat">
          <span className="trust-stat-value">4</span>
          <span className="trust-stat-label">Heritage prints, from Kitenge to Kikoy</span>
        </div>
        <div className="trust-stat">
          <span className="trust-stat-value">100%</span>
          <span className="trust-stat-label">Cut to order. Nothing sits on a shelf.</span>
        </div>
        <div className="trust-stat">
          <span className="trust-stat-value">3D</span>
          <span className="trust-stat-label">Preview your actual fabric before you buy</span>
        </div>
        <div className="trust-stat">
          <span className="trust-stat-value">KE</span>
          <span className="trust-stat-label">Designed and tailored in Kenya</span>
        </div>
      </section>

      <section className="why-us">
        <div className="section-heading">
          <h2>Why AuxTex Fit</h2>
        </div>
        <div className="why-us-grid">
          <div className="why-us-card">
            <IconRuler />
            <h3>Exact fit</h3>
            <p>Cut to your own measurements, not a size chart.</p>
          </div>
          <div className="why-us-card">
            <IconEye />
            <h3>See it first</h3>
            <p>A true-to-fabric 3D preview before you commit to an order.</p>
          </div>
          <div className="why-us-card">
            <IconSwatch />
            <h3>Heritage fabrics</h3>
            <p>Authentic Kitenge, Maasai shuka, and kente-inspired prints.</p>
          </div>
        </div>
      </section>
    </>
  );
}

export function ClosingCta() {
  return (
    <section className="closing-cta">
      <div>
        <h2>Ready to get started?</h2>
        <p>Pick a garment, choose your fabric, and see it on a real 3D model before you order.</p>
      </div>
      {/* Same label as the hero's primary button, not a third variant of
          "learn more" — one button, one consistent meaning, used twice. */}
      <a href="#catalog">
        <button>Browse the collection</button>
      </a>
    </section>
  );
}
