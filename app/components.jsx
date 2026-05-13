/* global React */
const { useState, useEffect, useRef, useMemo } = React;

/* ============ GLOBAL SVG DEFS — wobble filter, patterns ============ */
function GlobalDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        {/* Subtle hand-drawn jitter */}
        <filter id="wobble" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="2" seed="3" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2"/>
        </filter>
        {/* Heavier jitter for big elements */}
        <filter id="wobble-strong" x="-3%" y="-3%" width="106%" height="106%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="7"/>
          <feDisplacementMap in="SourceGraphic" scale="3.5"/>
        </filter>
        {/* Crosshatch pattern for shading */}
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="0.8"/>
        </pattern>
        <pattern id="dots" patternUnits="userSpaceOnUse" width="14" height="14">
          <circle cx="2" cy="2" r="1.1" fill="currentColor"/>
        </pattern>
      </defs>
    </svg>
  );
}

/* ============ HAND-DRAWN PRIMITIVES ============ */
/* Slightly-wobbly rectangle. Use as standalone or absolute-positioned border. */
function Sketchbox({ w = "100%", h = "100%", fill = "none", stroke = "var(--ink)", sw = 1.6, dashed = false, style = {}, children, rounded = 6, double = false }) {
  return (
    <div style={{ position: "relative", width: w, height: h, ...style }}>
      <svg
        viewBox="0 0 200 100" preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <g filter="url(#wobble)">
          <rect x="2" y="2" width="196" height="96" rx={rounded} ry={rounded}
            fill={fill} stroke={stroke} strokeWidth={sw}
            strokeDasharray={dashed ? "5 4" : undefined}
            vectorEffect="non-scaling-stroke"
          />
          {double && (
            <rect x="6" y="6" width="188" height="88" rx={rounded - 2} ry={rounded - 2}
              fill="none" stroke={stroke} strokeWidth={sw * 0.6} vectorEffect="non-scaling-stroke"
              opacity="0.5"
            />
          )}
        </g>
      </svg>
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

/* Hand-drawn underline squiggle */
function ScribbleUnder({ width = 220, color = "var(--accent)", thick = 3 }) {
  return (
    <svg viewBox="0 0 220 14" width={width} height={14} style={{ display: "block", overflow: "visible" }}>
      <g filter="url(#wobble)">
        <path d="M4 8 C 40 2, 80 12, 120 6 S 200 10, 216 5" stroke={color} strokeWidth={thick} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
      </g>
    </svg>
  );
}

/* A loose hand-drawn arrow */
function HandArrow({ dir = "right", w = 80, h = 40, color = "var(--ink)", curl = 0 }) {
  // dir: "right" | "down" | "up-right" | "down-right" | "left"
  const paths = {
    right: "M4 20 C 20 18, 50 26, 70 20",
    "down-right": "M4 6 C 24 8, 48 28, 72 36",
    "up-right": "M4 34 C 24 32, 48 12, 72 6",
    down: "M40 4 C 36 18, 44 28, 40 36",
    left: "M76 20 C 60 22, 30 14, 4 20",
  };
  const heads = {
    right: "M70 20 l-10 -6 M70 20 l-10 6",
    "down-right": "M72 36 l-2 -10 M72 36 l-10 -2",
    "up-right": "M72 6 l-10 -2 M72 6 l-2 10",
    down: "M40 36 l-6 -8 M40 36 l6 -8",
    left: "M4 20 l10 -6 M4 20 l10 6",
  };
  return (
    <svg viewBox="0 0 80 40" width={w} height={h} style={{ overflow: "visible" }}>
      <g filter="url(#wobble)" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={paths[dir]} />
        <path d={heads[dir]} />
      </g>
    </svg>
  );
}

/* A simple star doodle */
function Star({ size = 22, color = "var(--ink)" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <g filter="url(#wobble)" stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 L14 10 L21 11 L15.5 15.5 L17 22 L12 18 L7 22 L8.5 15.5 L3 11 L10 10 Z"/>
      </g>
    </svg>
  );
}

/* Asterisk */
function Asterisk({ size = 20, color = "var(--ink)" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <g filter="url(#wobble)" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round">
        <line x1="12" y1="3" x2="12" y2="21"/>
        <line x1="4" y1="7" x2="20" y2="17"/>
        <line x1="4" y1="17" x2="20" y2="7"/>
      </g>
    </svg>
  );
}

/* Small ink dot */
function Dot({ size = 6, color = "var(--ink)" }) {
  return <span style={{ display: "inline-block", width: size, height: size, borderRadius: "50%", background: color }}/>;
}

/* Tick / checkmark */
function Check({ size = 18, color = "var(--ink)" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <g filter="url(#wobble)" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 13 L10 19 L21 6"/>
      </g>
    </svg>
  );
}

/* Cross */
function Cross({ size = 18, color = "var(--ink)" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <g filter="url(#wobble)" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="5" y1="5" x2="19" y2="19"/>
        <line x1="19" y1="5" x2="5" y2="19"/>
      </g>
    </svg>
  );
}

/* ============ BENI LOGO (new) — hand-drawn shield+B ============ */
function BeniMark({ size = 36, color = "var(--ink)", strokeW = 1.8 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <g filter="url(#wobble)" stroke={color} strokeWidth={strokeW} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* shield */}
        <path d="M32 4 L56 12 V32 C56 46, 46 56, 32 60 C18 56, 8 46, 8 32 V12 Z"/>
        {/* inner B */}
        <path d="M24 18 V46 H36 C40 46, 42 43, 42 39.5 C42 36, 39 33, 36 33 C39 33, 41 30, 41 27 C41 23.5, 39 18, 35 18 Z"/>
        <line x1="24" y1="32" x2="36" y2="32"/>
        {/* eye dot (pupil of the watcher) */}
        <circle cx="48" cy="22" r="2" fill={color}/>
      </g>
    </svg>
  );
}

function Wordmark({ size = 32, color = "var(--ink)" }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12, color }}>
      <BeniMark size={size + 6} color={color}/>
      <span className="display" style={{ fontSize: size, color, lineHeight: 1, letterSpacing: "-0.02em" }}>Beni</span>
    </div>
  );
}

/* ============ ICON SET (hand-drawn) ============ */
const SK = (props, paths) => (
  <svg viewBox="0 0 24 24" width={props.size || 20} height={props.size || 20} {...props}>
    <g filter="url(#wobble)" stroke={props.color || "var(--ink)"} strokeWidth={props.sw || 1.8} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {paths}
    </g>
  </svg>
);

const Icon = {
  shield: (p = {}) => SK(p, <><path d="M12 3 L20 6 V13 C20 18, 16 21, 12 22 C8 21, 4 18, 4 13 V6 Z"/></>),
  lock: (p = {}) => SK(p, <><rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11 V8 C8 5, 10 3, 12 3 C14 3, 16 5, 16 8 V11"/></>),
  bolt: (p = {}) => SK(p, <><path d="M13 2 L5 13 H11 L10 22 L19 11 H13 L13 2 Z"/></>),
  spark: (p = {}) => SK(p, <><path d="M12 3 V8 M12 16 V21 M3 12 H8 M16 12 H21 M5.5 5.5 L8.5 8.5 M15.5 15.5 L18.5 18.5 M18.5 5.5 L15.5 8.5 M8.5 15.5 L5.5 18.5"/></>),
  eye: (p = {}) => SK(p, <><path d="M2 12 C 5 6, 8 5, 12 5 C 16 5, 19 6, 22 12 C 19 18, 16 19, 12 19 C 8 19, 5 18, 2 12 Z"/><circle cx="12" cy="12" r="3"/></>),
  freeze: (p = {}) => SK(p, <><path d="M12 2 V22 M2 12 H22 M5 5 L19 19 M19 5 L5 19"/></>),
  flow: (p = {}) => SK(p, <><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 7 L11 17 M17 7 L13 17"/></>),
  chat: (p = {}) => SK(p, <><path d="M4 5 H20 V16 H10 L5 21 V16 H4 Z"/></>),
  user: (p = {}) => SK(p, <><circle cx="12" cy="8" r="3.5"/><path d="M4 21 C 5 16, 8 14, 12 14 C 16 14, 19 16, 20 21"/></>),
  list: (p = {}) => SK(p, <><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></>),
  bell: (p = {}) => SK(p, <><path d="M5 17 H19 L17.5 15 V11 A 5.5 5.5 0 0 0 6.5 11 V15 Z"/><path d="M10 20 A 2 2 0 0 0 14 20"/></>),
  send: (p = {}) => SK(p, <><path d="M3 11 L21 3 L14 21 L11 13 Z"/></>),
  code: (p = {}) => SK(p, <><polyline points="7 6 2 12 7 18"/><polyline points="17 6 22 12 17 18"/><line x1="14" y1="4" x2="10" y2="20"/></>),
  github: (p = {}) => SK(p, <><path d="M12 2 C 6.5 2, 2 6.5, 2 12 C 2 16.5, 5 20.2, 9 21.5 C 9.5 21.5, 9.5 21, 9.5 20.5 V18.5 C 7 19, 6.5 17.5, 6.5 17.5 C 6 16.5, 5 16, 5 16 C 4 15, 6 15, 6 15 C 7 15, 7.5 16.5, 7.5 16.5 C 9 18, 11 17, 12 16.5 C 12 16, 12.5 15, 13 14.5 C 11 14, 8.5 13, 8.5 9 C 8.5 7.5, 9 6.5, 10 5.5 C 9.8 5, 9.5 4, 10 3 C 10 3, 11 3, 12 4 C 13 3.5, 15 3.5, 16 4 C 17 3, 18 3, 18 3 C 18.5 4, 18.2 5, 18 5.5 C 19 6.5, 19.5 7.5, 19.5 9 C 19.5 13, 17 14, 15 14.5 C 15.5 15, 16 16, 16 17 V20.5 C 16 21, 16 21.5, 16.5 21.5 C 20 20.2, 22 16.5, 22 12 C 22 6.5, 17.5 2, 12 2 Z"/></>),
  plus: (p = {}) => SK(p, <><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/></>),
  arrow: (p = {}) => SK(p, <><line x1="4" y1="12" x2="20" y2="12"/><polyline points="14 6 20 12 14 18"/></>),
  search: (p = {}) => SK(p, <><circle cx="10" cy="10" r="6"/><line x1="15" y1="15" x2="20" y2="20"/></>),
  wallet: (p = {}) => SK(p, <><rect x="3" y="6" width="18" height="13" rx="1"/><path d="M3 10 H21"/><circle cx="17" cy="14" r="1.4"/></>),
  ada: (p = {}) => SK(p, <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="6" r="1.3"/><circle cx="12" cy="18" r="1.3"/><circle cx="6" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/><circle cx="7.5" cy="7.5" r="1"/><circle cx="16.5" cy="16.5" r="1"/><circle cx="16.5" cy="7.5" r="1"/><circle cx="7.5" cy="16.5" r="1"/></>),
  ai: (p = {}) => SK(p, <><rect x="6" y="7" width="12" height="10" rx="1"/><circle cx="10" cy="12" r="1.2" fill="currentColor"/><circle cx="14" cy="12" r="1.2" fill="currentColor"/><line x1="12" y1="3" x2="12" y2="7"/><circle cx="12" cy="3" r="1"/><line x1="6" y1="11" x2="3" y2="11"/><line x1="18" y1="11" x2="21" y2="11"/><line x1="6" y1="14" x2="3" y2="14"/><line x1="18" y1="14" x2="21" y2="14"/></>),
};

/* ============ TOP NAV ============ */
function TopNav({ page, setPage }) {
  const items = [
    { id: "landing", label: "Beni" },
    { id: "dashboard", label: "The dashboard" },
    { id: "security", label: "How it's safe" },
    { id: "docs", label: "For developers" },
    { id: "brand", label: "Brand book" },
  ];
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--paper)", borderBottom: "1.5px solid var(--ink)" }}>
      <div className="wide" style={{ display: "flex", alignItems: "center", height: 70, gap: 20 }}>
        <button onClick={() => setPage("landing")} style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--ink)" }}>
          <Wordmark size={22}/>
        </button>
        <div style={{ width: 1.5, height: 28, background: "var(--ink)" }}/>
        <nav style={{ display: "flex", gap: 22 }}>
          {items.slice(1).map(it => (
            <button key={it.id} onClick={() => setPage(it.id)}
              style={{
                background: "transparent", border: 0, padding: "8px 2px", cursor: "pointer",
                color: "var(--ink)", fontFamily: "var(--serif)", fontSize: 16,
                position: "relative",
              }}>
              {it.label}
              {page === it.id && (
                <span style={{ position: "absolute", left: 0, right: 0, bottom: -2 }}>
                  <ScribbleUnder width={undefined} thick={2.5} color="var(--accent)"/>
                </span>
              )}
            </button>
          ))}
        </nav>
        <div style={{ flex: 1 }}/>
        <span className="stamp">
          <Dot size={6} color="var(--ok)"/> Cardano · live
        </span>
        <button className="ink-btn ghost" style={{ height: 38, fontSize: 14, padding: "0 16px", boxShadow: "2px 2px 0 var(--ink)" }} onClick={() => setPage("docs")}>
          Read the docs
        </button>
        <button className="ink-btn" style={{ height: 38, fontSize: 14, padding: "0 16px", boxShadow: "2px 2px 0 var(--ink)" }} onClick={() => setPage("dashboard")}>
          Open Beni →
        </button>
      </div>
    </header>
  );
}

/* ============ FOOTER ============ */
function Footer({ setPage }) {
  return (
    <footer style={{ marginTop: 120, borderTop: "1.5px solid var(--ink)", background: "var(--paper-2)", paddingTop: 80, paddingBottom: 40, position: "relative", overflow: "hidden" }}>
      <div className="wide">
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(4, 1fr)", gap: 56, marginBottom: 64 }}>
          <div>
            <Wordmark size={28}/>
            <p style={{ fontSize: 17, lineHeight: 1.5, marginTop: 18, maxWidth: 320, color: "var(--ink-2)" }}>
              Programmable safety for the agents that will be moving your money.
              Built on Cardano. <span className="hand" style={{ fontSize: 22 }}>Hand-soldered with love.</span>
            </p>
          </div>
          {[
            { t: "Product", l: ["Overview", "The dashboard", "Pricing", "Changelog"] },
            { t: "Developers", l: ["Read the docs", "SDK", "API", "Aiken contracts"] },
            { t: "Security", l: ["Architecture", "Audits", "Bug bounty", "Disclosure"] },
            { t: "Company", l: ["About", "Field notes", "Careers", "Say hi"] },
          ].map(col => (
            <div key={col.t}>
              <div className="smallcaps" style={{ marginBottom: 18, color: "var(--accent)" }}>{col.t}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {col.l.map(l => <li key={l} style={{ fontSize: 16 }}>{l}</li>)}
              </ul>
            </div>
          ))}
        </div>

        {/* Giant footer wordmark */}
        <div style={{ borderTop: "1.5px solid var(--ink)", paddingTop: 32, display: "flex", justifyContent: "space-between", alignItems: "end" }}>
          <div className="display" style={{ fontSize: "clamp(80px, 16vw, 240px)", lineHeight: 0.85, letterSpacing: "-0.03em" }}>
            Beni<span style={{ color: "var(--accent)" }}>.</span>
          </div>
          <div style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.14em", lineHeight: 1.8 }}>
            <div>© 2026 Beni Labs</div>
            <div>Printed on Cardano</div>
            <div>Edition 0.4.1</div>
          </div>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, {
  GlobalDefs, Sketchbox, ScribbleUnder, HandArrow, Star, Asterisk, Dot, Check, Cross,
  BeniMark, Wordmark, Icon, TopNav, Footer
});
