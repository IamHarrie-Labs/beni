/* global React */
const { useState, useEffect, useRef, useMemo } = React;

// ── Shared API constants ──────────────────────────────────────────────────────
const IS_LOCAL       = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const CHAT_API       = IS_LOCAL ? "http://localhost:3001/api/chat"       : "/api/chat";
const BLOCKFROST_API = IS_LOCAL ? "http://localhost:3001/api/blockfrost" : "/api/blockfrost";

// ── Shared utilities ──────────────────────────────────────────────────────────
function fmtAda(ada) {
  if (ada == null) return "—";
  return ada.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function shortenAddr(addr) {
  if (!addr) return "—";
  return addr.slice(0, 12) + "…" + addr.slice(-6);
}
function timeAgo(unixTs) {
  const diff = Math.floor(Date.now() / 1000 - unixTs);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(unixTs * 1000).toLocaleDateString();
}

// ── Supported CIP-30 wallets ──────────────────────────────────────────────────
const WALLET_PROVIDERS = [
  { key: "eternl",      label: "Eternl"  },
  { key: "nami",        label: "Nami"    },
  { key: "lace",        label: "Lace"    },
  { key: "flint",       label: "Flint"   },
  { key: "vespr",       label: "Vespr"   },
  { key: "gerowallet",  label: "Gero"    },
  { key: "typhoncip30", label: "Typhon"  },
];

// ── App-wide wallet hook (CIP-30) ─────────────────────────────────────────────
function useWallet() {
  const [state, setState] = useState({
    connected:  false,
    connecting: false,
    address:    null,
    addrShort:  null,
    balanceAda: null,
    txCount:    null,
    txs:        [],
    walletName: null,
    walletIcon: null,
    error:      null,
  });

  async function connect(walletKey, afterConnect) {
    setState(s => ({ ...s, connecting: true, error: null }));
    try {
      const api     = await window.cardano[walletKey].enable();
      const hexAddr = await api.getChangeAddress();

      const [addrRes, txRes] = await Promise.all([
        fetch(`${BLOCKFROST_API}?action=address&addr=${hexAddr}`),
        fetch(`${BLOCKFROST_API}?action=txs&addr=${hexAddr}`),
      ]);

      const addrData = await addrRes.json();
      if (addrData.error) throw new Error(addrData.error);
      const txData   = await txRes.json();

      const bech32Addr = addrData.address || addrData.bech32;
      const lovelace   = parseInt(
        (addrData.amount || []).find(a => a.unit === "lovelace")?.quantity || "0"
      );

      setState({
        connected:  true,
        connecting: false,
        address:    bech32Addr,
        addrShort:  bech32Addr ? shortenAddr(bech32Addr) : "—",
        balanceAda: lovelace / 1_000_000,
        txCount:    addrData.tx_count || 0,
        txs:        Array.isArray(txData) ? txData.slice(0, 10) : [],
        walletName: walletKey,
        walletIcon: window.cardano[walletKey]?.icon || null,
        error:      null,
      });

      if (typeof afterConnect === "function") afterConnect();
    } catch (err) {
      setState(s => ({ ...s, connecting: false, error: err.message }));
    }
  }

  function disconnect() {
    setState({
      connected: false, connecting: false, address: null, addrShort: null,
      balanceAda: null, txCount: null, txs: [], walletName: null, walletIcon: null, error: null,
    });
  }

  return { ...state, connect, disconnect };
}

// ── Wallet connect dropdown (used in nav + landing page) ──────────────────────
function WalletConnect({ wallet, afterConnect, label = "Connect Wallet", ghost = false }) {
  const [open, setOpen] = useState(false);
  const available = WALLET_PROVIDERS.filter(w => Boolean(window.cardano?.[w.key]));

  if (wallet.connected) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
        border: "1.5px solid var(--ok)", background: "var(--paper)",
        cursor: "default",
      }}>
        {wallet.walletIcon && (
          <img src={wallet.walletIcon} alt={wallet.walletName} width={16} height={16} style={{ borderRadius: 3 }}/>
        )}
        <div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ok)", letterSpacing: "0.12em" }}>
            {wallet.walletName?.toUpperCase()} · CONNECTED
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink)" }}>{wallet.addrShort}</div>
        </div>
        <button
          onClick={wallet.disconnect}
          title="Disconnect"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 16, lineHeight: 1, padding: "0 0 0 4px", marginLeft: 4 }}
        >×</button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        className={ghost ? "ink-btn ghost" : "ink-btn"}
        onClick={() => setOpen(o => !o)}
        disabled={wallet.connecting}
        style={{
          height: 38, fontSize: 14, padding: "0 16px",
          boxShadow: "2px 2px 0 var(--ink)",
          opacity: wallet.connecting ? 0.7 : 1,
        }}
      >
        <Icon.wallet size={14} color={ghost ? "var(--ink)" : "var(--paper)"}/>
        {wallet.connecting ? "Connecting…" : label}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0,
          border: "1.5px solid var(--ink)", background: "var(--paper)",
          minWidth: 230, boxShadow: "5px 5px 0 var(--ink)", zIndex: 400,
        }}>
          <div style={{ padding: "10px 16px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)" }}>
            <div className="smallcaps" style={{ color: "var(--ink-3)", fontSize: 10 }}>Select your wallet</div>
          </div>
          {available.length === 0 ? (
            <div style={{ padding: "20px 16px", textAlign: "center" }}>
              <div className="hand" style={{ fontSize: 20, color: "var(--ink-3)", marginBottom: 8 }}>no wallet found</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-4)", lineHeight: 1.55 }}>
                Install{" "}
                <a href="https://eternl.io" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Eternl</a>
                {" "}or{" "}
                <a href="https://namiwallet.io" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Nami</a>
                {" "}to connect to Preview testnet.
              </div>
            </div>
          ) : (
            available.map((w, i) => (
              <button
                key={w.key}
                onClick={() => { wallet.connect(w.key, afterConnect); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "12px 16px", background: "transparent", border: "none",
                  borderBottom: i < available.length - 1 ? "1px solid var(--paper-3)" : "none",
                  cursor: "pointer", color: "var(--ink)", fontFamily: "var(--serif)", fontSize: 15, textAlign: "left",
                }}
              >
                {window.cardano[w.key]?.icon && (
                  <img src={window.cardano[w.key].icon} alt={w.label} width={22} height={22} style={{ borderRadius: 4 }}/>
                )}
                {w.label}
                <span style={{ marginLeft: "auto", color: "var(--ink-4)", fontSize: 12 }}>→</span>
              </button>
            ))
          )}
          {wallet.error && (
            <div style={{ padding: "10px 16px", borderTop: "1.5px solid var(--ink)", fontFamily: "var(--mono)", fontSize: 11, color: "var(--danger)" }}>
              ⚠ {wallet.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============ GLOBAL SVG DEFS — wobble filter, patterns ============ */
function GlobalDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter id="wobble" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="2" seed="3" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2"/>
        </filter>
        <filter id="wobble-strong" x="-3%" y="-3%" width="106%" height="106%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="7"/>
          <feDisplacementMap in="SourceGraphic" scale="3.5"/>
        </filter>
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
function Sketchbox({ w = "100%", h = "100%", fill = "none", stroke = "var(--ink)", sw = 1.6, dashed = false, style = {}, children, rounded = 6, double = false }) {
  return (
    <div style={{ position: "relative", width: w, height: h, ...style }}>
      <svg viewBox="0 0 200 100" preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <g filter="url(#wobble)">
          <rect x="2" y="2" width="196" height="96" rx={rounded} ry={rounded}
            fill={fill} stroke={stroke} strokeWidth={sw}
            strokeDasharray={dashed ? "5 4" : undefined} vectorEffect="non-scaling-stroke"/>
          {double && (
            <rect x="6" y="6" width="188" height="88" rx={rounded - 2} ry={rounded - 2}
              fill="none" stroke={stroke} strokeWidth={sw * 0.6} vectorEffect="non-scaling-stroke" opacity="0.5"/>
          )}
        </g>
      </svg>
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

function ScribbleUnder({ width = 220, color = "var(--accent)", thick = 3 }) {
  return (
    <svg viewBox="0 0 220 14" width={width} height={14} style={{ display: "block", overflow: "visible" }}>
      <g filter="url(#wobble)">
        <path d="M4 8 C 40 2, 80 12, 120 6 S 200 10, 216 5" stroke={color} strokeWidth={thick} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
      </g>
    </svg>
  );
}

function HandArrow({ dir = "right", w = 80, h = 40, color = "var(--ink)" }) {
  const paths = {
    right:      "M4 20 C 20 18, 50 26, 70 20",
    "down-right":"M4 6 C 24 8, 48 28, 72 36",
    "up-right": "M4 34 C 24 32, 48 12, 72 6",
    down:       "M40 4 C 36 18, 44 28, 40 36",
    left:       "M76 20 C 60 22, 30 14, 4 20",
  };
  const heads = {
    right:      "M70 20 l-10 -6 M70 20 l-10 6",
    "down-right":"M72 36 l-2 -10 M72 36 l-10 -2",
    "up-right": "M72 6 l-10 -2 M72 6 l-2 10",
    down:       "M40 36 l-6 -8 M40 36 l6 -8",
    left:       "M4 20 l10 -6 M4 20 l10 6",
  };
  return (
    <svg viewBox="0 0 80 40" width={w} height={h} style={{ overflow: "visible" }}>
      <g filter="url(#wobble)" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={paths[dir]}/>
        <path d={heads[dir]}/>
      </g>
    </svg>
  );
}

function Star({ size = 22, color = "var(--ink)" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <g filter="url(#wobble)" stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 L14 10 L21 11 L15.5 15.5 L17 22 L12 18 L7 22 L8.5 15.5 L3 11 L10 10 Z"/>
      </g>
    </svg>
  );
}

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

function Dot({ size = 6, color = "var(--ink)" }) {
  return <span style={{ display: "inline-block", width: size, height: size, borderRadius: "50%", background: color }}/>;
}

function Check({ size = 18, color = "var(--ink)" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <g filter="url(#wobble)" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 13 L10 19 L21 6"/>
      </g>
    </svg>
  );
}

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

/* ============ BENI LOGO ============ */
// The Beni mark — the letter "B" in DM Serif Display.
// Used for icon-only contexts (small buttons, app icon, favicon, hero tiles).
function BeniMark({ size = 36, color = "var(--ink)" }) {
  return (
    <span className="display" style={{
      fontSize: size,
      color,
      lineHeight: 1,
      letterSpacing: "-0.02em",
      display: "inline-block",
      userSelect: "none",
    }}>B</span>
  );
}

// The full wordmark — "Beni" in DM Serif Display + terracotta dot at the baseline.
// Matches the reference exactly: typographic text + 39×39 circle at the base of the i.
// Used in TopNav, Footer, and any full-logo context.
function Wordmark({ size = 32, color = "var(--ink)" }) {
  const dotSize = Math.max(5, Math.round(size * 0.18));
  const gap     = Math.max(3, Math.round(dotSize * 0.55));
  const lift    = Math.round(size * 0.08); // align dot with text baseline, not the font-box floor
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "flex-end",
      gap,
      lineHeight: 1,
      userSelect: "none",
    }}>
      <span className="display" style={{
        fontSize: size,
        color,
        lineHeight: 1,
        letterSpacing: "-0.02em",
      }}>Beni</span>
      <span style={{
        width: dotSize,
        height: dotSize,
        borderRadius: "50%",
        background: "var(--accent)",
        flexShrink: 0,
        marginBottom: lift,
      }}/>
    </div>
  );
}

/* ============ ICON SET ============ */
const SK = (props, paths) => (
  <svg viewBox="0 0 24 24" width={props.size || 20} height={props.size || 20} {...props}>
    <g filter="url(#wobble)" stroke={props.color || "var(--ink)"} strokeWidth={props.sw || 1.8} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {paths}
    </g>
  </svg>
);

const Icon = {
  shield: (p = {}) => SK(p, <><path d="M12 3 L20 6 V13 C20 18, 16 21, 12 22 C8 21, 4 18, 4 13 V6 Z"/></>),
  lock:   (p = {}) => SK(p, <><rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11 V8 C8 5, 10 3, 12 3 C14 3, 16 5, 16 8 V11"/></>),
  bolt:   (p = {}) => SK(p, <><path d="M13 2 L5 13 H11 L10 22 L19 11 H13 L13 2 Z"/></>),
  spark:  (p = {}) => SK(p, <><path d="M12 3 V8 M12 16 V21 M3 12 H8 M16 12 H21 M5.5 5.5 L8.5 8.5 M15.5 15.5 L18.5 18.5 M18.5 5.5 L15.5 8.5 M8.5 15.5 L5.5 18.5"/></>),
  eye:    (p = {}) => SK(p, <><path d="M2 12 C 5 6, 8 5, 12 5 C 16 5, 19 6, 22 12 C 19 18, 16 19, 12 19 C 8 19, 5 18, 2 12 Z"/><circle cx="12" cy="12" r="3"/></>),
  freeze: (p = {}) => SK(p, <><path d="M12 2 V22 M2 12 H22 M5 5 L19 19 M19 5 L5 19"/></>),
  flow:   (p = {}) => SK(p, <><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 7 L11 17 M17 7 L13 17"/></>),
  chat:   (p = {}) => SK(p, <><path d="M4 5 H20 V16 H10 L5 21 V16 H4 Z"/></>),
  user:   (p = {}) => SK(p, <><circle cx="12" cy="8" r="3.5"/><path d="M4 21 C 5 16, 8 14, 12 14 C 16 14, 19 16, 20 21"/></>),
  list:   (p = {}) => SK(p, <><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></>),
  bell:   (p = {}) => SK(p, <><path d="M5 17 H19 L17.5 15 V11 A 5.5 5.5 0 0 0 6.5 11 V15 Z"/><path d="M10 20 A 2 2 0 0 0 14 20"/></>),
  send:   (p = {}) => SK(p, <><path d="M3 11 L21 3 L14 21 L11 13 Z"/></>),
  code:   (p = {}) => SK(p, <><polyline points="7 6 2 12 7 18"/><polyline points="17 6 22 12 17 18"/><line x1="14" y1="4" x2="10" y2="20"/></>),
  github: (p = {}) => SK(p, <><path d="M12 2 C 6.5 2, 2 6.5, 2 12 C 2 16.5, 5 20.2, 9 21.5 C 9.5 21.5, 9.5 21, 9.5 20.5 V18.5 C 7 19, 6.5 17.5, 6.5 17.5 C 6 16.5, 5 16, 5 16 C 4 15, 6 15, 6 15 C 7 15, 7.5 16.5, 7.5 16.5 C 9 18, 11 17, 12 16.5 C 12 16, 12.5 15, 13 14.5 C 11 14, 8.5 13, 8.5 9 C 8.5 7.5, 9 6.5, 10 5.5 C 9.8 5, 9.5 4, 10 3 C 10 3, 11 3, 12 4 C 13 3.5, 15 3.5, 16 4 C 17 3, 18 3, 18 3 C 18.5 4, 18.2 5, 18 5.5 C 19 6.5, 19.5 7.5, 19.5 9 C 19.5 13, 17 14, 15 14.5 C 15.5 15, 16 16, 16 17 V20.5 C 16 21, 16 21.5, 16.5 21.5 C 20 20.2, 22 16.5, 22 12 C 22 6.5, 17.5 2, 12 2 Z"/></>),
  plus:   (p = {}) => SK(p, <><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/></>),
  arrow:  (p = {}) => SK(p, <><line x1="4" y1="12" x2="20" y2="12"/><polyline points="14 6 20 12 14 18"/></>),
  search: (p = {}) => SK(p, <><circle cx="10" cy="10" r="6"/><line x1="15" y1="15" x2="20" y2="20"/></>),
  wallet: (p = {}) => SK(p, <><rect x="3" y="6" width="18" height="13" rx="1"/><path d="M3 10 H21"/><circle cx="17" cy="14" r="1.4"/></>),
  ada:    (p = {}) => SK(p, <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="6" r="1.3"/><circle cx="12" cy="18" r="1.3"/><circle cx="6" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/><circle cx="7.5" cy="7.5" r="1"/><circle cx="16.5" cy="16.5" r="1"/><circle cx="16.5" cy="7.5" r="1"/><circle cx="7.5" cy="16.5" r="1"/></>),
  ai:     (p = {}) => SK(p, <><rect x="6" y="7" width="12" height="10" rx="1"/><circle cx="10" cy="12" r="1.2" fill="currentColor"/><circle cx="14" cy="12" r="1.2" fill="currentColor"/><line x1="12" y1="3" x2="12" y2="7"/><circle cx="12" cy="3" r="1"/><line x1="6" y1="11" x2="3" y2="11"/><line x1="18" y1="11" x2="21" y2="11"/><line x1="6" y1="14" x2="3" y2="14"/><line x1="18" y1="14" x2="21" y2="14"/></>),
};

/* ============ TOP NAV ============ */
function TopNav({ page, setPage, wallet }) {
  // "The dashboard" and "Brand book" removed from nav — access via Open Beni only
  const navItems = [
    { id: "security", label: "How it's safe" },
    { id: "docs",     label: "For developers" },
  ];

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "var(--paper)", borderBottom: "1.5px solid var(--ink)",
    }}>
      <div className="wide" style={{ display: "flex", alignItems: "center", height: 70, gap: 16 }}>

        {/* LEFT: Logo + Cardano live badge */}
        <button
          onClick={() => setPage("landing")}
          style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--ink)", flexShrink: 0 }}
        >
          <Wordmark size={22}/>
        </button>
        <span className="stamp nav-hide-mobile" style={{ fontSize: 10, flexShrink: 0 }}>
          <Dot size={6} color="var(--ok)"/> Cardano · Preview
        </span>

        <div className="nav-hide-mobile" style={{ width: 1.5, height: 28, background: "var(--ink)", flexShrink: 0 }}/>

        {/* CENTER: Nav links — border-bottom highlights exactly one item width */}
        <nav className="nav-hide-mobile" style={{ display: "flex", gap: 18 }}>
          {navItems.map(it => (
            <button
              key={it.id}
              onClick={() => setPage(it.id)}
              style={{
                background: "transparent", border: 0, padding: "8px 2px", cursor: "pointer",
                color: "var(--ink)", fontFamily: "var(--serif)", fontSize: 15,
                borderBottom: page === it.id
                  ? "2.5px solid var(--accent)"
                  : "2.5px solid transparent",
              }}
            >
              {it.label}
            </button>
          ))}
        </nav>

        <div style={{ flex: 1 }}/>

        {/* RIGHT: "Open Beni" only — wallet connection is gated inside App */}
        <button
          className="ink-btn"
          style={{ height: 38, fontSize: 14, padding: "0 16px", boxShadow: "2px 2px 0 var(--ink)", flexShrink: 0 }}
          onClick={() => setPage("dashboard")}
        >
          {wallet.connected ? "Dashboard →" : "Open Beni →"}
        </button>
      </div>
    </header>
  );
}

/* ============ FOOTER ============ */
function Footer({ setPage }) {
  return (
    <footer style={{
      marginTop: 120, borderTop: "1.5px solid var(--ink)",
      background: "var(--paper-2)", paddingTop: 80, paddingBottom: 40,
      position: "relative", overflow: "hidden",
    }}>
      <div className="wide">
        <div className="footer-grid" style={{ marginBottom: 64 }}>
          <div>
            <Wordmark size={28}/>
            <p style={{ fontSize: 17, lineHeight: 1.5, marginTop: 18, maxWidth: 320, color: "var(--ink-2)" }}>
              Programmable guardrails for AI-driven treasury operations and institutional wallet integrations.
              Built on Cardano.
            </p>
          </div>
          {[
            { t: "Product",    items: [
              { label: "Overview",  action: () => setPage("landing") },
              { label: "Dashboard", action: () => setPage("dashboard") },
            ]},
            { t: "Developers", items: [
              { label: "Read the docs", action: () => setPage("docs") },
              { label: "GitHub",        action: () => window.open("https://github.com/IamHarrie-Labs/beni", "_blank") },
            ]},
            { t: "Security", items: [
              { label: "How it's safe", action: () => setPage("security") },
            ]},
          ].map(col => (
            <div key={col.t}>
              <div className="smallcaps" style={{ marginBottom: 18, color: "var(--accent)" }}>{col.t}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {col.items.map(item => (
                  <li key={item.label}>
                    <button
                      onClick={item.action}
                      style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--ink)", fontFamily: "var(--serif)", fontSize: 16, textAlign: "left" }}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1.5px solid var(--ink)", paddingTop: 32, display: "flex", justifyContent: "space-between", alignItems: "end" }}>
          <div style={{ display: "inline-flex", alignItems: "flex-end", gap: "0.05em", lineHeight: 0.85 }}>
            <span className="display" style={{ fontSize: "clamp(56px, 10vw, 140px)", letterSpacing: "-0.03em", lineHeight: 0.85 }}>Beni</span>
            <span style={{
              display: "inline-block",
              width: "clamp(7px, 1.3vw, 18px)",
              height: "clamp(7px, 1.3vw, 18px)",
              borderRadius: "50%",
              background: "var(--accent)",
              flexShrink: 0,
              marginBottom: "clamp(4px, 0.7vw, 10px)",
            }}/>
          </div>
          <div style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.14em", lineHeight: 1.8 }}>
            <div>© 2026 Beni Labs</div>
            <div>Built on Cardano</div>
            <div>v0.4 · Preview Testnet</div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Wallet connect modal — shown when a user tries to open Beni without a wallet ─
function WalletModal({ wallet, onClose }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(24,20,14,0.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--paper)",
          border: "1.5px solid var(--ink)",
          padding: "48px 48px 36px",
          maxWidth: 440, width: "90%",
          boxShadow: "8px 8px 0 var(--ink)",
        }}
      >
        <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 8 }}>Beni</div>
        <div className="display" style={{ fontSize: 34, lineHeight: 1.0, marginBottom: 14, letterSpacing: "-0.02em" }}>
          Connect your wallet<br/>to continue.
        </div>
        <p style={{ fontFamily: "var(--serif)", fontSize: 16, color: "var(--ink-2)", lineHeight: 1.55, marginBottom: 28 }}>
          Beni reads your address and on-chain history from Cardano Preview testnet.
          No funds are moved during connection.
        </p>

        {/* The WalletConnect component — afterConnect handled by App's useEffect */}
        <WalletConnect wallet={wallet}/>

        {wallet.error && (
          <div className="mono" style={{ fontSize: 12, color: "var(--danger)", marginTop: 14 }}>
            ⚠ {wallet.error}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            display: "block", marginTop: 18, width: "100%",
            background: "transparent", border: "1.5px solid var(--ink-4)", padding: "10px 0",
            color: "var(--ink-3)", fontFamily: "var(--serif)", fontSize: 14, cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  // Wallet (shared app-wide)
  useWallet, WalletConnect, WalletModal, fmtAda, shortenAddr, timeAgo,
  CHAT_API, BLOCKFROST_API, WALLET_PROVIDERS,
  // Primitives
  GlobalDefs, Sketchbox, ScribbleUnder, HandArrow, Star, Asterisk, Dot, Check, Cross,
  BeniMark, Wordmark, Icon,
  // Layout
  TopNav, Footer,
});
