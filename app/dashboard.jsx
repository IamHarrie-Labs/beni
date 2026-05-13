/* global React */
const { useState: useStateD, useEffect: useEffectD, useRef: useRefD } = React;

// ── API endpoints — auto-detect dev vs Vercel production ──────────────────────
const IS_LOCAL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const CHAT_API       = IS_LOCAL ? "http://localhost:3001/api/chat"       : "/api/chat";
const BLOCKFROST_API = IS_LOCAL ? "http://localhost:3001/api/blockfrost" : "/api/blockfrost";

// ── Utility helpers ───────────────────────────────────────────────────────────
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

// ── Supported CIP-30 wallet providers ─────────────────────────────────────────
const WALLET_PROVIDERS = [
  { key: "eternl",       label: "Eternl" },
  { key: "nami",         label: "Nami" },
  { key: "lace",         label: "Lace" },
  { key: "flint",        label: "Flint" },
  { key: "vespr",        label: "Vespr" },
  { key: "gerowallet",   label: "Gero" },
  { key: "typhoncip30",  label: "Typhon" },
];

// ── CIP-30 wallet hook ────────────────────────────────────────────────────────
function useWallet() {
  const [state, setState] = useStateD({
    connected:  false,
    connecting: false,
    address:    null,   // full bech32
    addrShort:  null,   // truncated for display
    balanceAda: null,   // number (ADA, not lovelace)
    txCount:    null,   // total tx count from Blockfrost
    txs:        [],     // array of recent tx objects from Blockfrost
    walletName: null,   // e.g. "eternl"
    walletIcon: null,   // base64 icon from window.cardano[key].icon
    error:      null,
  });

  async function connect(walletKey) {
    setState(s => ({ ...s, connecting: true, error: null }));
    try {
      const walletApi = await window.cardano[walletKey].enable();
      const hexAddr   = await walletApi.getChangeAddress();

      // Fetch address info and tx list in parallel from our Blockfrost proxy
      const [addrRes, txRes] = await Promise.all([
        fetch(`${BLOCKFROST_API}?action=address&addr=${hexAddr}`),
        fetch(`${BLOCKFROST_API}?action=txs&addr=${hexAddr}`),
      ]);

      const addrData = await addrRes.json();
      if (addrData.error) throw new Error(addrData.error);

      const txData      = await txRes.json();
      const bech32Addr  = addrData.address || addrData.bech32;
      const lovelace    = parseInt(
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

// ── Wallet connect button + picker dropdown ───────────────────────────────────
function WalletConnect({ wallet }) {
  const [open, setOpen] = useStateD(false);
  const available = WALLET_PROVIDERS.filter(w => Boolean(window.cardano?.[w.key]));

  if (wallet.connected) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "6px 14px",
        border: "1.5px solid var(--ok)", background: "var(--paper)",
      }}>
        {wallet.walletIcon && (
          <img src={wallet.walletIcon} alt={wallet.walletName} width={18} height={18} style={{ borderRadius: 3 }}/>
        )}
        <div>
          <div className="mono" style={{ fontSize: 10, color: "var(--ok)", letterSpacing: "0.1em" }}>
            {wallet.walletName?.toUpperCase()} · CONNECTED
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink)" }}>{wallet.addrShort}</div>
        </div>
        <button
          onClick={wallet.disconnect}
          title="Disconnect"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 18, lineHeight: 1, padding: "0 0 0 4px" }}
        >×</button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        className="ink-btn"
        onClick={() => setOpen(o => !o)}
        disabled={wallet.connecting}
        style={{
          height: 38, fontSize: 14, padding: "0 16px",
          background: "var(--ink)", boxShadow: "2px 2px 0 var(--ink)",
          opacity: wallet.connecting ? 0.7 : 1,
        }}
      >
        <Icon.wallet size={14} color="var(--paper)"/>
        {wallet.connecting ? "Connecting…" : "Connect Wallet"}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0,
          border: "1.5px solid var(--ink)", background: "var(--paper)",
          minWidth: 220, boxShadow: "5px 5px 0 var(--ink)", zIndex: 200,
        }}>
          <div style={{ padding: "10px 16px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)" }}>
            <div className="smallcaps" style={{ color: "var(--ink-3)", fontSize: 10 }}>Select wallet</div>
          </div>

          {available.length === 0 ? (
            <div style={{ padding: "20px 16px", textAlign: "center" }}>
              <div className="hand" style={{ fontSize: 20, color: "var(--ink-3)", marginBottom: 10 }}>no wallet found</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-4)", lineHeight: 1.55 }}>
                Install{" "}
                <a href="https://eternl.io" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Eternl</a>
                {" "}or{" "}
                <a href="https://namiwallet.io" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Nami</a>
                {" "}to connect to Cardano Preview testnet.
              </div>
            </div>
          ) : (
            available.map((w, i) => (
              <button
                key={w.key}
                onClick={() => { wallet.connect(w.key); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "12px 16px",
                  background: "transparent", border: "none",
                  borderBottom: i < available.length - 1 ? "1px solid var(--paper-3)" : "none",
                  cursor: "pointer", color: "var(--ink)",
                  fontFamily: "var(--serif)", fontSize: 15, textAlign: "left",
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
            <div style={{
              padding: "10px 16px", borderTop: "1.5px solid var(--ink)",
              fontFamily: "var(--mono)", fontSize: 11, color: "var(--danger)",
            }}>
              ⚠ {wallet.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────
function Dashboard() {
  const [frozen, setFrozen] = useStateD(false);
  const wallet = useWallet();

  return (
    <div className="fade-in" data-screen-label="02 Dashboard" style={{
      display: "grid", gridTemplateColumns: "260px minmax(0, 1fr) 360px",
      minWidth: 1280, minHeight: "calc(100vh - 70px)",
      borderTop: "1.5px solid var(--ink)",
      background: "var(--paper)",
    }}>
      <Sidebar wallet={wallet}/>
      <Main frozen={frozen} setFrozen={setFrozen} wallet={wallet}/>
      <AssistantPanel wallet={wallet}/>
    </div>
  );
}

/* ═══════════════════════════════ SIDEBAR ════════════════════════════════════ */
function Sidebar({ wallet }) {
  return (
    <aside style={{
      borderRight: "1.5px solid var(--ink)",
      padding: "24px 20px",
      background: "var(--paper-2)",
      display: "flex", flexDirection: "column", gap: 28,
    }}>
      {/* Workspace identity */}
      <div>
        <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 10 }}>Workspace</div>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
          border: "1.5px solid var(--ink)", background: "var(--paper)",
        }}>
          <div style={{
            width: 28, height: 28, background: "var(--ink)", color: "var(--paper)",
            display: "grid", placeItems: "center", fontFamily: "var(--display)", fontSize: 14,
          }}>B</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="display" style={{ fontSize: 16 }}>Your Workspace</div>
            {wallet.connected ? (
              <div className="mono" style={{ fontSize: 10, color: "var(--ok)", letterSpacing: "0.08em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {wallet.addrShort}
              </div>
            ) : (
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em" }}>PREVIEW TESTNET</div>
            )}
          </div>
        </div>
      </div>

      <NavGroup title="Overview">
        <NavItem icon={<Icon.flow size={16}/>} label="Command center" active/>
        <NavItem icon={<Icon.eye size={16}/>} label="Live monitor"/>
        <NavItem icon={<Icon.list size={16}/>} label="Transactions"/>
        <NavItem icon={<Icon.bell size={16}/>} label="Approvals"/>
      </NavGroup>

      <NavGroup title="Agents">
        <div style={{
          padding: "18px 10px", textAlign: "center",
          border: "1.5px dashed var(--ink-4)", marginBottom: 6,
        }}>
          <div className="hand" style={{ fontSize: 20, color: "var(--ink-3)", marginBottom: 8 }}>no agents yet</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-4)", lineHeight: 1.45 }}>
            Deploy a wallet with the SDK to see your agents here.
          </div>
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
          background: "transparent", border: "1.5px dashed var(--ink-3)",
          color: "var(--ink-2)", fontFamily: "var(--serif)", fontSize: 14, cursor: "pointer",
        }}>
          <Icon.plus size={14}/> New agent
        </button>
      </NavGroup>

      <NavGroup title="Configure">
        <NavItem icon={<Icon.shield size={16}/>} label="Rules & policies"/>
        <NavItem icon={<Icon.lock size={16}/>} label="Whitelist"/>
        <NavItem icon={<Icon.user size={16}/>} label="Team"/>
        <NavItem icon={<Icon.code size={16}/>} label="Webhooks"/>
      </NavGroup>

      {/* System status */}
      <div style={{ marginTop: "auto" }}>
        <div style={{ padding: 14, border: "1.5px solid var(--ink)", background: "var(--paper)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ok)", border: "1.5px solid var(--ink)" }}/>
            <span className="mono" style={{ fontSize: 10, letterSpacing: "0.14em" }}>SYSTEM HEALTHY</span>
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", lineHeight: 1.7, letterSpacing: "0.06em" }}>
            VALIDATOR v0.4.1 · AIKEN<br/>
            CARDANO PREVIEW TESTNET
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavGroup({ title, children }) {
  return (
    <div>
      <div className="smallcaps" style={{ color: "var(--ink-3)", marginBottom: 10, padding: "0 4px" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{children}</div>
    </div>
  );
}

function NavItem({ icon, label, active, badge }) {
  return (
    <button style={{
      width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
      background: active ? "var(--paper)" : "transparent",
      border: "1.5px solid " + (active ? "var(--ink)" : "transparent"),
      cursor: "pointer", color: "var(--ink)", textAlign: "left",
      fontFamily: "var(--serif)", fontSize: 15, position: "relative",
    }}>
      <span style={{ display: "inline-flex", color: active ? "var(--accent)" : "var(--ink-2)" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          minWidth: 22, height: 20, padding: "0 6px",
          background: "var(--ink)", color: "var(--paper)",
          fontSize: 11, fontFamily: "var(--mono)",
          display: "grid", placeItems: "center", border: "1.5px solid var(--ink)",
        }}>{badge}</span>
      )}
    </button>
  );
}

/* ═══════════════════════════════ MAIN PANEL ═════════════════════════════════ */
function Main({ frozen, setFrozen, wallet }) {
  return (
    <main style={{ padding: "28px 32px", overflowY: "auto", maxHeight: "calc(100vh - 70px)" }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 28, paddingBottom: 20, borderBottom: "1.5px solid var(--ink)",
      }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 6 }}>The dashboard</div>
          <h1 className="display" style={{ fontSize: 48, margin: 0, lineHeight: 1, letterSpacing: "-0.02em" }}>
            Command Center.
          </h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Wallet connect */}
          <WalletConnect wallet={wallet}/>
          <button
            className="ink-btn ghost"
            style={{ height: 38, fontSize: 14, padding: "0 14px", boxShadow: "2px 2px 0 var(--ink)" }}
          ><Icon.search size={14}/> Search</button>
          <button
            className="ink-btn ghost"
            style={{ height: 38, fontSize: 14, padding: "0 14px", boxShadow: "2px 2px 0 var(--ink)" }}
          ><Icon.code size={14}/> API</button>
          <button
            onClick={() => setFrozen(!frozen)}
            className="ink-btn"
            style={{
              height: 38, fontSize: 14, padding: "0 14px",
              background: frozen ? "var(--danger)" : "var(--ink)",
              borderColor: frozen ? "var(--danger)" : "var(--ink)",
              boxShadow: "2px 2px 0 var(--ink)",
            }}
          >
            <Icon.freeze size={14} color="var(--paper)"/>
            {frozen ? "Frozen — Resume" : "Emergency freeze"}
          </button>
        </div>
      </div>

      {/* Balance hero */}
      <BalanceHero frozen={frozen} wallet={wallet}/>

      {/* KPI row */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        borderTop: "1.5px solid var(--ink)", borderBottom: "1.5px solid var(--ink)",
        marginTop: 20, marginBottom: 28,
      }}>
        <KPI
          label="Spend today"
          big="—"
          sub={wallet.connected ? "Requires on-chain rules deploy" : "No wallet connected"}
          extra={<MiniBar pct={0}/>}
        />
        <KPI
          label="Transactions"
          big={wallet.txCount != null ? wallet.txCount.toLocaleString() : "—"}
          sub={wallet.connected ? "total on address" : "Deploy an agent to begin"}
          border
        />
        <KPI
          label="Validator latency"
          big="28ms"
          sub="p95: 41ms · on-chain healthy"
        />
      </div>

      {/* Activity + Approvals */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24, marginBottom: 28 }}>
        <ActivityCard wallet={wallet}/>
        <ApprovalsCard/>
      </div>

      {/* Rules + Whitelist */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, marginBottom: 28 }}>
        <RulesCard/>
        <WhitelistCard/>
      </div>

      {/* Transactions table */}
      <TransactionsTable wallet={wallet}/>
    </main>
  );
}

/* ── Balance hero ──────────────────────────────────────────────────────────── */
function BalanceHero({ frozen, wallet }) {
  const balanceDisplay = wallet.connected && wallet.balanceAda != null
    ? `₳ ${fmtAda(wallet.balanceAda)}`
    : "₳ —";

  const statusLabel = frozen ? "FROZEN" : wallet.connected ? "LIVE" : "NO WALLET";
  const statusColor = frozen ? "var(--danger)" : wallet.connected ? "var(--ok)" : "var(--ink-4)";
  const subText = frozen
    ? "all spends halted — emergency freeze active"
    : wallet.connected
      ? `${wallet.addrShort} · Preview testnet`
      : "deploy a wallet to see your balance";

  return (
    <div style={{
      position: "relative", padding: "24px 0",
      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 40, alignItems: "end",
    }}>
      <div>
        <div className="smallcaps" style={{ color: "var(--ink-3)", marginBottom: 12 }}>Agent wallet balance</div>
        <div className="display" style={{
          fontSize: 96, lineHeight: 0.9, letterSpacing: "-0.03em",
          color: wallet.connected ? "var(--ink)" : "var(--ink-4)",
        }}>
          {balanceDisplay}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
          <span className="hand" style={{ fontSize: 22, color: wallet.connected ? "var(--ink-2)" : "var(--ink-3)" }}>
            {subText}
          </span>
        </div>
      </div>

      <div style={{
        position: "relative", padding: "16px 24px",
        border: "1.5px solid var(--ink)", background: "var(--paper-2)",
      }}>
        <div className="smallcaps" style={{ color: "var(--ink-3)" }}>24h spend curve</div>
        <SpendCurve wallet={wallet}/>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "end", gap: 12 }}>
        <span className="stamp-filled" style={{ background: statusColor }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--paper)" }}/>
          {statusLabel}
        </span>
        <div className="hand" style={{ fontSize: 22, color: "var(--ink-3)", transform: "rotate(-2deg)" }}>
          {wallet.connected ? `${wallet.txCount} tx total` : "nothing to guard yet"}
        </div>
      </div>
    </div>
  );
}

function SpendCurve({ wallet }) {
  const w = 320, h = 60;
  // If we have txs, plot their block times as activity spikes
  if (!wallet.connected || wallet.txs.length === 0) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block", marginTop: 6 }}>
        <line x1="0" y1={h * 0.8} x2={w} y2={h * 0.8} stroke="var(--ink-4)" strokeWidth="1" strokeDasharray="4 4"/>
        <line x1="0" y1={h * 0.5} x2={w} y2={h * 0.5} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="3 5" opacity="0.3"/>
        <text x={w/2} y={h * 0.45} textAnchor="middle" fontSize="9" fontFamily="var(--mono)" fill="var(--ink-4)">NO DATA</text>
      </svg>
    );
  }

  // Plot last 10 txs as a simple activity bar chart
  const txs = wallet.txs.slice().reverse();
  const barW = Math.floor(w / txs.length) - 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block", marginTop: 6 }}>
      <line x1="0" y1={h * 0.9} x2={w} y2={h * 0.9} stroke="var(--ink-4)" strokeWidth="1"/>
      {txs.map((tx, i) => {
        const x = i * (w / txs.length);
        const barH = 8 + Math.random() * 20; // visual only — actual amounts need deeper API call
        return (
          <rect
            key={tx.tx_hash}
            x={x + 1}
            y={h * 0.9 - barH}
            width={barW}
            height={barH}
            fill="var(--ink)"
            opacity="0.6"
          />
        );
      })}
      <text x="4" y="10" fontSize="8" fontFamily="var(--mono)" fill="var(--accent)">
        {txs.length} TXS
      </text>
    </svg>
  );
}

function KPI({ label, big, sub, extra, border }) {
  return (
    <div style={{
      padding: "20px 24px",
      borderLeft:  border ? "1.5px solid var(--ink)" : "none",
      borderRight: border ? "1.5px solid var(--ink)" : "none",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div className="smallcaps" style={{ color: "var(--ink-3)" }}>{label}</div>
      <div className="display" style={{
        fontSize: 48, lineHeight: 1, letterSpacing: "-0.02em",
        color: big === "—" ? "var(--ink-4)" : "var(--ink)",
      }}>{big}</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink-2)" }}>{sub}</div>
      {extra}
    </div>
  );
}

function MiniBar({ pct }) {
  return (
    <div style={{
      height: 8, background: "var(--paper-3)", border: "1.5px solid var(--ink)",
      marginTop: 4, position: "relative",
    }}>
      <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: "var(--ink-4)" }}/>
    </div>
  );
}

/* ── Activity card ─────────────────────────────────────────────────────────── */
function ActivityCard({ wallet }) {
  const hasTxs = wallet.connected && wallet.txs.length > 0;

  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
      <div style={{
        padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)" }}>Live activity</div>
          <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>Every decision, in order.</div>
        </div>
        <span className="stamp">
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: hasTxs ? "var(--ok)" : "var(--ink-4)" }}/>
          {hasTxs ? "LIVE" : "WAITING"}
        </span>
      </div>

      {hasTxs ? (
        <div>
          {wallet.txs.slice(0, 6).map((tx, i) => (
            <div key={tx.tx_hash} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
              borderBottom: i < 5 ? "1px solid var(--paper-3)" : "none",
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: "var(--ok)", border: "1.5px solid var(--ink)",
              }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mono" style={{
                  fontSize: 11, color: "var(--ink-2)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {tx.tx_hash}
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                  {timeAgo(tx.block_time)} · block #{tx.block_height?.toLocaleString()}
                </div>
              </div>
              <a
                href={`https://preview.cardanoscan.io/transaction/${tx.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 11, textDecoration: "none" }}
              >↗</a>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <div className="hand" style={{ fontSize: 32, color: "var(--ink-3)", marginBottom: 10 }}>
            {wallet.connected ? "no transactions found" : "no transactions yet"}
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-4)", maxWidth: 320, margin: "0 auto", lineHeight: 1.55 }}>
            {wallet.connected
              ? "This address has no on-chain history yet. Fund it from the Preview faucet and run the demo."
              : "Once you deploy an agent wallet and run your first spend, every on-chain decision will appear here in real time."}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Approvals card ────────────────────────────────────────────────────────── */
function ApprovalsCard() {
  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
      <div style={{
        padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)" }}>Approvals queue</div>
          <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>0 awaiting decision</div>
        </div>
      </div>
      <div style={{ padding: 24, textAlign: "center" }}>
        <div className="hand" style={{ fontSize: 32, color: "var(--ok)", marginBottom: 8 }}>queue is clear ✓</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink-3)", lineHeight: 1.5 }}>
          Spends above your per-tx cap will pause here for your approval before hitting the chain.
        </div>
      </div>
    </div>
  );
}

/* ── Rules card ────────────────────────────────────────────────────────────── */
function RulesCard() {
  const [rules, setRules] = useStateD([
    { name: "per_tx_cap",        val: "Not set", desc: "Hard ceiling on any single transaction", on: false },
    { name: "daily_cap",         val: "Not set", desc: "Rolling 24h budget window",              on: false },
    { name: "whitelist_routing", val: "0 addrs", desc: "Skip approval for trusted addresses",    on: false },
    { name: "require_approval",  val: "Off",     desc: "Pause for human sign-off above threshold", on: false },
  ]);
  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
      <div style={{
        padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)" }}>Guardrails</div>
          <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>Enforced on chain</div>
        </div>
        <span className="hand" style={{ fontSize: 18, color: "var(--ink-3)" }}>configure via SDK →</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {rules.map((r, i) => (
          <div key={r.name} style={{
            display: "grid", gridTemplateColumns: "1fr auto auto", gap: 14, alignItems: "center",
            padding: "12px 18px",
            borderBottom: i < rules.length - 1 ? "1.5px solid var(--paper-3)" : "none",
            opacity: r.on ? 1 : 0.45,
          }}>
            <div>
              <div className="mono" style={{ fontSize: 12, color: "var(--accent)" }}>{r.name}</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>{r.desc}</div>
            </div>
            <span className="display" style={{ fontSize: 16, color: "var(--ink-4)" }}>{r.val}</span>
            <button
              onClick={() => setRules(rules.map(x => x.name === r.name ? { ...x, on: !x.on } : x))}
              style={{
                width: 40, height: 22, border: "1.5px solid var(--ink)",
                background: r.on ? "var(--ink)" : "var(--paper)",
                position: "relative", cursor: "pointer", padding: 0, borderRadius: 0,
              }}
            >
              <span style={{
                position: "absolute", top: 1, left: r.on ? 20 : 1,
                width: 16, height: 16,
                background: r.on ? "var(--paper)" : "var(--ink-4)",
                transition: "left .15s",
              }}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Whitelist card ────────────────────────────────────────────────────────── */
function WhitelistCard() {
  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
      <div style={{
        padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)" }}>Whitelist</div>
          <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>0 trusted addresses</div>
        </div>
        <button
          className="ink-btn ghost"
          style={{ height: 30, fontSize: 12, padding: "0 12px", boxShadow: "2px 2px 0 var(--ink)" }}
        ><Icon.plus size={12}/></button>
      </div>
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <div className="hand" style={{ fontSize: 26, color: "var(--ink-3)", marginBottom: 8 }}>nothing whitelisted yet</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink-4)", lineHeight: 1.5 }}>
          Addresses on this list bypass the per-tx cap and skip the approval queue.
        </div>
      </div>
    </div>
  );
}

/* ── Transactions table ────────────────────────────────────────────────────── */
function TransactionsTable({ wallet }) {
  const hasTxs = wallet.connected && wallet.txs.length > 0;

  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
      <div style={{
        padding: "20px 24px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)" }}>Transactions</div>
          <div className="display" style={{ fontSize: 26, lineHeight: 1.1, marginTop: 4 }}>Recent on-chain activity</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="stamp">ALL AGENTS</span>
          <span className="stamp">LAST 10</span>
        </div>
      </div>

      {hasTxs ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)" }}>
              {["TX HASH", "TIME", "BLOCK", "EXPLORER"].map(h => (
                <th key={h} className="smallcaps" style={{
                  padding: "10px 20px", textAlign: "left",
                  fontSize: 10, color: "var(--ink-3)", fontWeight: "normal",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {wallet.txs.map((tx, i) => (
              <tr key={tx.tx_hash} style={{
                borderBottom: i < wallet.txs.length - 1 ? "1px solid var(--paper-3)" : "none",
              }}>
                <td style={{ padding: "12px 20px", fontFamily: "var(--mono)", fontSize: 12 }}>
                  {tx.tx_hash.slice(0, 12)}…{tx.tx_hash.slice(-6)}
                </td>
                <td style={{ padding: "12px 20px", fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-2)" }}>
                  {timeAgo(tx.block_time)}
                </td>
                <td style={{ padding: "12px 20px", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)" }}>
                  #{tx.block_height?.toLocaleString()}
                </td>
                <td style={{ padding: "12px 20px" }}>
                  <a
                    href={`https://preview.cardanoscan.io/transaction/${tx.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 11,
                      textDecoration: "none", borderBottom: "1px solid var(--accent)",
                    }}
                  >cardanoscan ↗</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <div className="hand" style={{ fontSize: 32, color: "var(--ink-3)", marginBottom: 10 }}>
            {wallet.connected ? "no transactions on this address" : "no transactions yet"}
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-4)", maxWidth: 400, margin: "0 auto", lineHeight: 1.55 }}>
            {wallet.connected
              ? "This wallet has no on-chain history. Fund it from the Preview faucet, then run the demo."
              : "Settled, rejected, and pending transactions will appear here once your agent starts spending."}
          </div>
          {!wallet.connected && (
            <div style={{ marginTop: 20 }}>
              <span className="hand" style={{ fontSize: 22, color: "var(--accent)" }}>run the demo → </span>
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>npx tsx sdk/examples/demo.ts</span>
            </div>
          )}
          {wallet.connected && (
            <div style={{ marginTop: 16 }}>
              <a
                href="https://docs.cardano.org/cardano-testnets/tools/faucet/"
                target="_blank"
                rel="noopener noreferrer"
                className="ink-btn ghost"
                style={{ display: "inline-flex", height: 36, padding: "0 20px", fontSize: 13, boxShadow: "2px 2px 0 var(--ink)", textDecoration: "none" }}
              >Get Preview testnet ADA →</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════ ASSISTANT PANEL ════════════════════════════ */
function AssistantPanel({ wallet }) {
  const [messages, setMessages] = useStateD([
    { who: "beni", text: "Hi! I'm Beni — your on-chain wallet guardian. Connect a wallet above to see your live balance, or ask me anything about how Beni's guardrails work." },
  ]);
  const [input, setInput] = useStateD("");
  const [loading, setLoading] = useStateD(false);
  const bottomRef = useRefD(null);

  useEffectD(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Update welcome message once wallet connects
  useEffectD(() => {
    if (wallet.connected && messages.length === 1) {
      setMessages([{
        who: "beni",
        text: `Wallet connected — ${wallet.addrShort}. Balance: ₳ ${fmtAda(wallet.balanceAda)} · ${wallet.txCount} transaction${wallet.txCount === 1 ? "" : "s"} on this address. To activate guardrails, deploy an agent wallet with the SDK.`,
      }]);
    }
  }, [wallet.connected]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const history = [...messages, { who: "user", text }];
    setMessages(history);
    setLoading(true);

    try {
      const res = await fetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(m => ({
            role: m.who === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, { who: "beni", text: data.text }]);
    } catch {
      setMessages(prev => [...prev, {
        who: "beni",
        text: "⚠ Chat server not reachable. Run: cd sdk && npm run chat",
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside style={{
      borderLeft: "1.5px solid var(--ink)",
      background: "var(--paper-2)",
      display: "flex", flexDirection: "column",
      maxHeight: "calc(100vh - 70px)",
    }}>
      {/* Panel header */}
      <div style={{
        padding: "20px 22px", borderBottom: "1.5px solid var(--ink)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, border: "1.5px solid var(--ink)", background: "var(--paper)",
          display: "grid", placeItems: "center",
        }}>
          <BeniMark size={22}/>
        </div>
        <div style={{ flex: 1 }}>
          <div className="display" style={{ fontSize: 18 }}>Beni</div>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em" }}>
            POLICY-AWARE · READS THE CHAIN
          </div>
        </div>
        <span style={{
          width: 10, height: 10, borderRadius: "50%",
          background: loading ? "var(--warn)" : "var(--ok)",
          border: "1.5px solid var(--ink)",
        }}/>
      </div>

      {/* Message list */}
      <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((m, i) => (
          m.who === "user" ? (
            <div key={i} style={{
              alignSelf: "flex-end", maxWidth: "88%",
              padding: "10px 14px", background: "var(--ink)", color: "var(--paper)",
              border: "1.5px solid var(--ink)", fontFamily: "var(--serif)", fontSize: 14, lineHeight: 1.45,
            }}>{m.text}</div>
          ) : (
            <div key={i} style={{
              alignSelf: "flex-start", maxWidth: "95%",
              padding: "12px 14px", background: "var(--paper)",
              border: "1.5px solid var(--ink)", fontFamily: "var(--serif)", fontSize: 14, lineHeight: 1.5,
            }}>{m.text}</div>
          )
        ))}

        {loading && (
          <div style={{
            alignSelf: "flex-start", padding: "12px 14px",
            background: "var(--paper)", border: "1.5px solid var(--ink)",
            fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)", letterSpacing: "0.06em",
          }}>
            thinking…
          </div>
        )}

        {/* Suggested questions */}
        <div style={{ marginTop: 10, padding: 14, border: "1.5px solid var(--accent)", background: "var(--paper)" }}>
          <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 10 }}>Try asking</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              "How does the thread token work?",
              "What happens when I freeze a wallet?",
              "How does the daily cap reset?",
            ].map(t => (
              <SuggestedAction key={t} t={t} onClick={() => setInput(t)}/>
            ))}
          </div>
        </div>

        <div ref={bottomRef}/>
      </div>

      {/* Input bar */}
      <div style={{ padding: 14, borderTop: "1.5px solid var(--ink)" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "0 6px 0 12px",
          border: "1.5px solid var(--ink)", background: "var(--paper)", opacity: loading ? 0.6 : 1,
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Ask Beni…"
            disabled={loading}
            style={{
              flex: 1, height: 36, background: "transparent", border: 0, outline: 0,
              color: "var(--ink)", font: "15px var(--serif)",
            }}
          />
          <button
            className="ink-btn"
            onClick={send}
            disabled={loading}
            style={{ height: 28, padding: "0 10px", fontSize: 12, boxShadow: "2px 2px 0 var(--ink)", opacity: loading ? 0.5 : 1 }}
          >
            <Icon.send size={12} color="var(--paper)"/>
          </button>
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 10, textAlign: "center", letterSpacing: "0.1em" }}>
          POWERED BY CLAUDE HAIKU · BENI v0.4.1
        </div>
      </div>
    </aside>
  );
}

function SuggestedAction({ t, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 10px", background: "var(--paper-2)", border: "1.5px solid var(--ink)",
        color: "var(--ink)", fontFamily: "var(--serif)", fontSize: 13, cursor: "pointer", textAlign: "left",
      }}
    >
      {t} <Icon.arrow size={14}/>
    </button>
  );
}

Object.assign(window, { Dashboard });
