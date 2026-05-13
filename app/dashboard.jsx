/* global React */
const { useState: useStateD, useEffect: useEffectD, useMemo: useMemoD } = React;

function Dashboard() {
  const [activeAgent, setActiveAgent] = useStateD("atlas-trader-v2");
  const [frozen, setFrozen] = useStateD(false);

  return (
    <div className="fade-in" data-screen-label="02 Dashboard" style={{
      display: "grid", gridTemplateColumns: "260px minmax(0, 1fr) 360px",
      minWidth: 1280, minHeight: "calc(100vh - 70px)",
      borderTop: "1.5px solid var(--ink)",
      background: "var(--paper)",
    }}>
      <Sidebar activeAgent={activeAgent} setActiveAgent={setActiveAgent}/>
      <Main frozen={frozen} setFrozen={setFrozen}/>
      <AssistantPanel/>
    </div>
  );
}

/* ================= SIDEBAR ================= */
function Sidebar({ activeAgent, setActiveAgent }) {
  const agents = [
    { id: "atlas-trader-v2", name: "atlas-trader-v2", status: "ok", spend: 73 },
    { id: "vault-rebalancer", name: "vault-rebalancer", status: "ok", spend: 21 },
    { id: "yield-router", name: "yield-router", status: "warn", spend: 91 },
    { id: "research-bot", name: "research-bot", status: "ok", spend: 4 },
    { id: "payments-batch", name: "payments-batch", status: "paused", spend: 0 },
  ];

  return (
    <aside style={{
      borderRight: "1.5px solid var(--ink)",
      padding: "24px 20px",
      background: "var(--paper-2)",
      display: "flex", flexDirection: "column", gap: 28,
    }}>
      <div>
        <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 10 }}>Workspace</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1.5px solid var(--ink)", background: "var(--paper)" }}>
          <div style={{ width: 28, height: 28, background: "var(--ink)", color: "var(--paper)", display: "grid", placeItems: "center", fontFamily: "var(--display)", fontSize: 14 }}>T</div>
          <div style={{ flex: 1 }}>
            <div className="display" style={{ fontSize: 16 }}>Tessera Capital</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em" }}>TREASURY · MAIN</div>
          </div>
        </div>
      </div>

      <NavGroup title="Overview">
        <NavItem icon={<Icon.flow size={16}/>} label="Command center" active/>
        <NavItem icon={<Icon.eye size={16}/>} label="Live monitor" badge="14"/>
        <NavItem icon={<Icon.list size={16}/>} label="Transactions"/>
        <NavItem icon={<Icon.bell size={16}/>} label="Approvals" badge="3" pulse/>
      </NavGroup>

      <NavGroup title="Agents">
        {agents.map(a => (
          <button key={a.id} onClick={() => setActiveAgent(a.id)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
            background: activeAgent === a.id ? "var(--paper)" : "transparent",
            border: "1.5px solid " + (activeAgent === a.id ? "var(--ink)" : "transparent"),
            cursor: "pointer", color: "var(--ink)", textAlign: "left",
          }}>
            <span style={{
              width: 10, height: 10, borderRadius: "50%",
              background: a.status === "ok" ? "var(--ok)" : a.status === "warn" ? "var(--warn)" : "var(--ink-4)",
              border: "1.5px solid var(--ink)",
            }}/>
            <span className="mono" style={{ fontSize: 12, flex: 1, color: a.status === "paused" ? "var(--ink-4)" : "var(--ink)" }}>{a.name}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{a.spend}%</span>
          </button>
        ))}
        <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "transparent", border: "1.5px dashed var(--ink-3)", color: "var(--ink-2)", fontFamily: "var(--serif)", fontSize: 14, cursor: "pointer", marginTop: 6 }}>
          <Icon.plus size={14}/> New agent
        </button>
      </NavGroup>

      <NavGroup title="Configure">
        <NavItem icon={<Icon.shield size={16}/>} label="Rules & policies"/>
        <NavItem icon={<Icon.lock size={16}/>} label="Whitelist"/>
        <NavItem icon={<Icon.user size={16}/>} label="Team"/>
        <NavItem icon={<Icon.code size={16}/>} label="Webhooks"/>
      </NavGroup>

      <div style={{ marginTop: "auto" }}>
        <div style={{ padding: 14, border: "1.5px solid var(--ink)", background: "var(--paper)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ok)", border: "1.5px solid var(--ink)" }}/>
            <span className="mono" style={{ fontSize: 10, letterSpacing: "0.14em" }}>SYSTEM HEALTHY</span>
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", lineHeight: 1.7, letterSpacing: "0.06em" }}>
            EPOCH 524 · BLOCK 11,402,318<br/>
            VALIDATOR v0.4.1 · 28MS
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

function NavItem({ icon, label, active, badge, pulse }) {
  return (
    <button style={{
      width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
      background: active ? "var(--paper)" : "transparent",
      border: "1.5px solid " + (active ? "var(--ink)" : "transparent"),
      cursor: "pointer",
      color: "var(--ink)",
      textAlign: "left",
      fontFamily: "var(--serif)", fontSize: 15,
      position: "relative",
    }}>
      <span style={{ display: "inline-flex", color: active ? "var(--accent)" : "var(--ink-2)" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          minWidth: 22, height: 20, padding: "0 6px",
          background: pulse ? "var(--accent)" : "var(--ink)",
          color: "var(--paper)",
          fontSize: 11, fontFamily: "var(--mono)", display: "grid", placeItems: "center",
          border: "1.5px solid var(--ink)",
        }}>{badge}</span>
      )}
    </button>
  );
}

/* ================= MAIN ================= */
function Main({ frozen, setFrozen }) {
  return (
    <main style={{ padding: "28px 32px", overflowY: "auto", maxHeight: "calc(100vh - 70px)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, paddingBottom: 20, borderBottom: "1.5px solid var(--ink)" }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 6 }}>The dashboard — atlas-trader-v2</div>
          <h1 className="display" style={{ fontSize: 48, margin: 0, lineHeight: 1, letterSpacing: "-0.02em" }}>Command Center.</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="ink-btn ghost" style={{ height: 38, fontSize: 14, padding: "0 14px", boxShadow: "2px 2px 0 var(--ink)" }}><Icon.search size={14}/> Search</button>
          <button className="ink-btn ghost" style={{ height: 38, fontSize: 14, padding: "0 14px", boxShadow: "2px 2px 0 var(--ink)" }}><Icon.code size={14}/> API</button>
          <button onClick={() => setFrozen(!frozen)} className="ink-btn" style={{
            height: 38, fontSize: 14, padding: "0 14px",
            background: frozen ? "var(--danger)" : "var(--ink)",
            borderColor: frozen ? "var(--danger)" : "var(--ink)",
            boxShadow: "2px 2px 0 var(--ink)",
          }}>
            <Icon.freeze size={14} color="var(--paper)"/>
            {frozen ? "Frozen — Resume" : "Emergency freeze"}
          </button>
        </div>
      </div>

      {/* Balance row */}
      <BalanceHero frozen={frozen}/>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, borderTop: "1.5px solid var(--ink)", borderBottom: "1.5px solid var(--ink)", marginTop: 20, marginBottom: 28 }}>
        <KPI label="Spend today" big="₳ 1,830" sub="73% of daily cap" extra={<MiniBar pct={73}/>}/>
        <KPI label="Blocks last hour" big="14" sub="2 rejected, 3 awaiting approval" border/>
        <KPI label="Median latency" big="28ms" sub="p95: 41ms · validator healthy"/>
      </div>

      {/* Activity + Approvals */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24, marginBottom: 28 }}>
        <ActivityCard/>
        <ApprovalsCard/>
      </div>

      {/* Rules + Whitelist + Allocation */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 24, marginBottom: 28 }}>
        <RulesCard/>
        <WhitelistCard/>
        <AllocationCard/>
      </div>

      {/* Transactions table */}
      <TransactionsTable/>
    </main>
  );
}

function BalanceHero({ frozen }) {
  return (
    <div style={{ position: "relative", padding: "24px 0", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 40, alignItems: "end" }}>
      <div>
        <div className="smallcaps" style={{ color: "var(--ink-3)", marginBottom: 12 }}>Wallet balance · addr1q9w...4xkt</div>
        <div className="display" style={{ fontSize: 96, lineHeight: 0.9, letterSpacing: "-0.03em" }}>
          ₳ 24,851<span style={{ color: "var(--ink-4)", fontSize: 56 }}>.27</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
          <span style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--ink-2)" }}>≈ $11,439.21 USD</span>
          <span className="hand" style={{ fontSize: 24, color: "var(--ok)" }}>↑ 142 ADA today</span>
        </div>
      </div>

      <div style={{ position: "relative", padding: "16px 24px", border: "1.5px solid var(--ink)", background: "var(--paper-2)" }}>
        <div className="smallcaps" style={{ color: "var(--ink-3)" }}>24h spend curve</div>
        <SpendCurve/>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "end", gap: 12 }}>
        <span className={`stamp-filled`} style={{ background: frozen ? "var(--danger)" : "var(--ok)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--paper)" }}/>
          {frozen ? "FROZEN" : "ACTIVE"}
        </span>
        <div className="hand" style={{ fontSize: 28, color: "var(--accent)", transform: "rotate(-2deg)" }}>
          all systems green ✓
        </div>
      </div>
    </div>
  );
}

function SpendCurve() {
  const points = [12, 15, 14, 18, 16, 20, 24, 28, 22, 30, 36, 42, 48, 44, 52, 58, 56, 62, 70, 68, 73, 71, 73, 73];
  const w = 320, h = 60;
  const xs = (i) => (i / (points.length - 1)) * w;
  const ys = (v) => h - (v / 100) * h;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(p).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block", marginTop: 6 }}>
      <g filter="url(#wobble)">
        <line x1="0" y1={ys(80)} x2={w} y2={ys(80)} stroke="var(--warn)" strokeWidth="1" strokeDasharray="4 4"/>
        <path d={path} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx={xs(points.length - 1)} cy={ys(73)} r="4" fill="var(--accent)" stroke="var(--ink)" strokeWidth="1.5"/>
      </g>
      <text x="2" y={ys(80) - 3} fontSize="9" fontFamily="var(--mono)" fill="var(--warn)">CAP</text>
    </svg>
  );
}

function KPI({ label, big, sub, extra, border }) {
  return (
    <div style={{ padding: "20px 24px", borderLeft: border ? "1.5px solid var(--ink)" : "none", borderRight: border ? "1.5px solid var(--ink)" : "none", display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="smallcaps" style={{ color: "var(--ink-3)" }}>{label}</div>
      <div className="display" style={{ fontSize: 48, lineHeight: 1, letterSpacing: "-0.02em" }}>{big}</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink-2)" }}>{sub}</div>
      {extra}
    </div>
  );
}

function MiniBar({ pct }) {
  return (
    <div style={{ height: 8, background: "var(--paper-3)", border: "1.5px solid var(--ink)", marginTop: 4, position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: "var(--ink)" }}/>
    </div>
  );
}

/* ================= ACTIVITY ================= */
function ActivityCard() {
  const rows = [
    { t: "14:02:11", agent: "atlas-trader-v2", action: "Sent", addr: "addr1...glow", amt: "₳ 48.00", status: "ok", tag: "WHITELIST" },
    { t: "14:01:58", agent: "atlas-trader-v2", action: "Sent", addr: "addr1...m7p2", amt: "₳ 312.40", status: "ok", tag: "WITHIN CAP" },
    { t: "14:01:24", agent: "yield-router", action: "Pending", addr: "addr1...u2vq", amt: "₳ 720.00", status: "warn", tag: "APPROVAL" },
    { t: "14:00:51", agent: "vault-rebalancer", action: "Sent", addr: "addr1...3kpz", amt: "₳ 24.18", status: "ok", tag: "WHITELIST" },
    { t: "14:00:08", agent: "yield-router", action: "Rejected", addr: "addr1...x9aa", amt: "₳ 2,400.00", status: "danger", tag: "EXCEEDS DAILY" },
    { t: "13:59:42", agent: "atlas-trader-v2", action: "Sent", addr: "addr1...n4rs", amt: "₳ 89.50", status: "ok", tag: "WITHIN CAP" },
    { t: "13:57:55", agent: "atlas-trader-v2", action: "Sent", addr: "addr1...glow", amt: "₳ 156.20", status: "ok", tag: "WHITELIST" },
  ];
  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)" }}>Live activity</div>
          <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>Every decision, in order.</div>
        </div>
        <span className="stamp ok">
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ok)" }}/>
          STREAMING
        </span>
      </div>
      <div>
        {rows.map((row, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "70px 1fr 1fr 100px 140px", gap: 14, alignItems: "center",
            padding: "12px 20px",
            borderBottom: i < rows.length - 1 ? "1.5px solid var(--paper-3)" : "none",
            background: i === 0 ? "var(--paper-2)" : "transparent",
          }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{row.t}</span>
            <span style={{ fontFamily: "var(--serif)", fontSize: 14 }}>
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>{row.agent}</span>
              {" · "}
              <span style={{ color: row.status === "danger" ? "var(--danger)" : row.status === "warn" ? "var(--warn)" : "var(--ink)" }}>{row.action}</span>
            </span>
            <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>→ {row.addr}</span>
            <span className="display" style={{ fontSize: 18, textAlign: "right", color: row.status === "danger" ? "var(--danger)" : "var(--ink)" }}>{row.amt}</span>
            <span className={`stamp ${row.status === "ok" ? "ok" : row.status === "warn" ? "warn" : "danger"}`} style={{ justifySelf: "end" }}>{row.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= APPROVALS ================= */
function ApprovalsCard() {
  const [pending, setPending] = useStateD([
    { id: 1, amt: "₳ 720.00", to: "addr1...u2vq", reason: "Exceeds per-tx cap (₳ 500)", agent: "yield-router", timer: 42 },
    { id: 2, amt: "₳ 1,200.00", to: "addr1...kx0s", reason: "Address not whitelisted", agent: "atlas-trader-v2", timer: 1820 },
    { id: 3, amt: "₳ 4,500.00", to: "addr1...vault", reason: "Multi-rule: cap + daily", agent: "vault-rebalancer", timer: 6120 },
  ]);
  function resolve(id) { setPending(pending.filter(p => p.id !== id)); }

  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)" }}>Approvals queue</div>
          <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>{pending.length} awaiting decision</div>
        </div>
        <span className="hand" style={{ fontSize: 22, color: "var(--warn)", transform: "rotate(-3deg)", display: "inline-block" }}>your move →</span>
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {pending.map(p => (
          <div key={p.id} style={{ padding: 14, border: "1.5px solid var(--ink)", background: "var(--paper-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-2)" }}>{p.agent}</span>
              <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{Math.floor(p.timer / 60)}:{String(p.timer % 60).padStart(2, "0")} LEFT</span>
            </div>
            <div className="display" style={{ fontSize: 28, letterSpacing: "-0.02em" }}>{p.amt}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>→ {p.to}</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 14, marginTop: 8 }}>{p.reason}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => resolve(p.id)} className="ink-btn ghost" style={{ flex: 1, height: 32, fontSize: 13, padding: "0 12px", boxShadow: "2px 2px 0 var(--ink)" }}>Reject</button>
              <button onClick={() => resolve(p.id)} className="ink-btn" style={{ flex: 1, height: 32, fontSize: 13, padding: "0 12px", boxShadow: "2px 2px 0 var(--ink)" }}>Approve</button>
            </div>
          </div>
        ))}
        {pending.length === 0 && (
          <div className="hand" style={{ fontSize: 28, textAlign: "center", padding: 24, color: "var(--ok)" }}>queue is clear! ✓</div>
        )}
      </div>
    </div>
  );
}

/* ================= RULES ================= */
function RulesCard() {
  const [rules, setRules] = useStateD([
    { name: "per_tx_cap", val: "₳ 500", desc: "Hard ceiling on any single transaction", on: true },
    { name: "daily_cap_v2", val: "₳ 2,500", desc: "Rolling 24h budget · 73% used", on: true },
    { name: "whitelist_routing", val: "12 addrs", desc: "Skip approval for trusted addresses", on: true },
    { name: "require_approval", val: "≥ ₳ 250", desc: "Pause for human sign-off", on: true },
    { name: "new_address_hold", val: "30m", desc: "Quarantine novel destinations", on: false },
  ]);
  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)" }}>Active rules</div>
          <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>Enforced on chain</div>
        </div>
        <button className="ink-btn ghost" style={{ height: 30, fontSize: 12, padding: "0 12px", boxShadow: "2px 2px 0 var(--ink)" }}><Icon.plus size={12}/> Add</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {rules.map((r, i) => (
          <div key={r.name} style={{
            display: "grid", gridTemplateColumns: "1fr auto auto", gap: 14, alignItems: "center",
            padding: "12px 18px",
            borderBottom: i < rules.length - 1 ? "1.5px solid var(--paper-3)" : "none",
            opacity: r.on ? 1 : 0.55,
          }}>
            <div>
              <div className="mono" style={{ fontSize: 12, color: "var(--accent)" }}>{r.name}</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>{r.desc}</div>
            </div>
            <span className="display" style={{ fontSize: 18 }}>{r.val}</span>
            <button onClick={() => setRules(rules.map(x => x.name === r.name ? { ...x, on: !x.on } : x))} style={{
              width: 40, height: 22, border: "1.5px solid var(--ink)", background: r.on ? "var(--ink)" : "var(--paper)", position: "relative", cursor: "pointer", padding: 0, borderRadius: 0,
            }}>
              <span style={{ position: "absolute", top: 1, left: r.on ? 20 : 1, width: 16, height: 16, background: r.on ? "var(--paper)" : "var(--ink)", transition: "left .15s" }}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= WHITELIST ================= */
function WhitelistCard() {
  const addrs = [
    { a: "addr1q9w...glow", l: "Genius Yield router" },
    { a: "addr1qx0...m7p2", l: "Internal vault" },
    { a: "addr1qkr...3kpz", l: "Treasury cold" },
    { a: "addr1qpd...n4rs", l: "DEX bridge" },
  ];
  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)" }}>Whitelist</div>
          <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>12 trusted addresses</div>
        </div>
        <button className="ink-btn ghost" style={{ height: 30, fontSize: 12, padding: "0 12px", boxShadow: "2px 2px 0 var(--ink)" }}><Icon.plus size={12}/></button>
      </div>
      <div>
        {addrs.map((a, i) => (
          <div key={a.a} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 18px",
            borderBottom: i < addrs.length - 1 ? "1.5px solid var(--paper-3)" : "none",
          }}>
            <Check size={18} color="var(--ok)"/>
            <div style={{ flex: 1 }}>
              <div className="mono" style={{ fontSize: 12, color: "var(--ink)" }}>{a.a}</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)" }}>{a.l}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= ALLOCATION ================= */
function AllocationCard() {
  const segs = [
    { l: "DEX swaps", v: 42, pat: "solid" },
    { l: "Whitelist payments", v: 28, pat: "hatch" },
    { l: "Vault rebalance", v: 18, pat: "dots" },
    { l: "Gas", v: 8, pat: "cross" },
    { l: "Other", v: 4, pat: "blank" },
  ];
  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)" }}>
        <div className="smallcaps" style={{ color: "var(--accent)" }}>Spend allocation · 7d</div>
        <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>By category</div>
      </div>
      <div style={{ padding: 20 }}>
        <PatternBar segs={segs}/>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          {segs.map(s => (
            <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--serif)", fontSize: 14 }}>
              <PatternSwatch pat={s.pat}/>
              <span style={{ flex: 1 }}>{s.l}</span>
              <span className="mono" style={{ color: "var(--ink-3)" }}>{s.v}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PatternBar({ segs }) {
  return (
    <div style={{ display: "flex", height: 28, border: "1.5px solid var(--ink)" }}>
      {segs.map((s, i) => (
        <div key={s.l} style={{ width: `${s.v}%`, borderRight: i < segs.length - 1 ? "1.5px solid var(--ink)" : "none", position: "relative", background: s.pat === "solid" ? "var(--ink)" : "var(--paper)", overflow: "hidden" }}>
          {s.pat === "hatch" && <svg width="100%" height="100%" style={{ display: "block" }}><rect width="100%" height="100%" fill="url(#hatch)" color="var(--ink)"/></svg>}
          {s.pat === "dots" && <svg width="100%" height="100%" style={{ display: "block" }}><rect width="100%" height="100%" fill="url(#dots)" color="var(--ink)"/></svg>}
          {s.pat === "cross" && (
            <svg width="100%" height="100%" style={{ display: "block" }}>
              <pattern id={`x-${i}`} patternUnits="userSpaceOnUse" width="6" height="6">
                <path d="M0 6 L6 0 M-1 1 L1 -1 M5 7 L7 5" stroke="var(--ink)" strokeWidth="0.8"/>
              </pattern>
              <rect width="100%" height="100%" fill={`url(#x-${i})`}/>
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

function PatternSwatch({ pat }) {
  return (
    <div style={{ width: 18, height: 18, border: "1.5px solid var(--ink)", background: pat === "solid" ? "var(--ink)" : "var(--paper)", position: "relative", overflow: "hidden" }}>
      {pat === "hatch" && <svg width="100%" height="100%"><rect width="100%" height="100%" fill="url(#hatch)" color="var(--ink)"/></svg>}
      {pat === "dots" && <svg width="100%" height="100%"><rect width="100%" height="100%" fill="url(#dots)" color="var(--ink)"/></svg>}
      {pat === "cross" && (
        <svg width="100%" height="100%">
          <path d="M0 18 L18 0" stroke="var(--ink)" strokeWidth="1"/>
          <path d="M0 0 L18 18" stroke="var(--ink)" strokeWidth="1"/>
        </svg>
      )}
    </div>
  );
}

/* ================= TRANSACTIONS TABLE ================= */
function TransactionsTable() {
  const rows = [
    { hash: "8f3a2c91…b71d", agent: "atlas-trader-v2", action: "swap", to: "addr1...glow", amt: "₳ 312.40", rule: "within_cap", status: "settled", block: "11,402,318" },
    { hash: "c4e1900e…2af0", agent: "yield-router", action: "send", to: "addr1...u2vq", amt: "₳ 720.00", rule: "approval_required", status: "pending", block: "—" },
    { hash: "1b88e612…d3f1", agent: "atlas-trader-v2", action: "send", to: "addr1...m7p2", amt: "₳ 156.20", rule: "whitelist", status: "settled", block: "11,402,315" },
    { hash: "fa20b7c4…ee23", agent: "yield-router", action: "send", to: "addr1...x9aa", amt: "₳ 2,400.00", rule: "exceeds_daily", status: "rejected", block: "—" },
    { hash: "3209af55…07cd", agent: "vault-rebalancer", action: "stake", to: "addr1...vault", amt: "₳ 1,200.00", rule: "approval_required", status: "approved", block: "11,402,311" },
    { hash: "92b1c0d8…9912", agent: "atlas-trader-v2", action: "send", to: "addr1...n4rs", amt: "₳ 89.50", rule: "within_cap", status: "settled", block: "11,402,308" },
  ];
  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
      <div style={{ padding: "20px 24px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)" }}>Transactions</div>
          <div className="display" style={{ fontSize: 26, lineHeight: 1.1, marginTop: 4 }}>Recent on-chain activity</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="stamp">ALL AGENTS</span>
          <span className="stamp">LAST 7D</span>
          <button className="ink-btn ghost" style={{ height: 30, fontSize: 12, padding: "0 12px", boxShadow: "2px 2px 0 var(--ink)" }}>Export CSV</button>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1.5px solid var(--ink)" }}>
              {["Tx hash", "Agent", "Type", "Counterparty", "Amount", "Rule", "Status", "Block"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "12px 20px", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 400 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1.5px solid var(--paper-3)" : "none" }}>
                <td style={{ padding: "14px 20px" }}><span className="mono" style={{ fontSize: 12, color: "var(--accent)" }}>{r.hash}</span></td>
                <td style={{ padding: "14px 20px" }}><span className="mono" style={{ fontSize: 12 }}>{r.agent}</span></td>
                <td style={{ padding: "14px 20px" }}><span className="mono" style={{ fontSize: 11, padding: "2px 8px", border: "1.5px solid var(--ink)" }}>{r.action}</span></td>
                <td style={{ padding: "14px 20px" }}><span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{r.to}</span></td>
                <td style={{ padding: "14px 20px" }}><span className="display" style={{ fontSize: 17, color: r.status === "rejected" ? "var(--danger)" : "var(--ink)" }}>{r.amt}</span></td>
                <td style={{ padding: "14px 20px" }}><span className="mono" style={{ fontSize: 11, color: "var(--accent-2)" }}>{r.rule}</span></td>
                <td style={{ padding: "14px 20px" }}>
                  <span className={`stamp ${r.status === "settled" || r.status === "approved" ? "ok" : r.status === "pending" ? "warn" : "danger"}`}>{r.status.toUpperCase()}</span>
                </td>
                <td style={{ padding: "14px 20px" }}><span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{r.block}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= ASSISTANT PANEL ================= */
function AssistantPanel() {
  const [messages, setMessages] = useStateD([
    { who: "beni", text: "Hi. Atlas-trader is running clean. Daily spend at 73%. Three transactions are pending approval — want me to walk through them?" },
    { who: "user", text: "What's the 2,400 ADA rejection about?" },
    { who: "beni", text: "Yield-router tried a 2,400 ADA swap to addr1...x9aa. It exceeded the daily cap (2,500 ADA, 1,830 used). I rejected at block 11,402,308." },
  ]);
  const [input, setInput] = useStateD("");

  function send() {
    if (!input.trim()) return;
    setMessages([...messages, { who: "user", text: input }, { who: "beni", text: "That address has never been seen before — I'd suggest adding it to the whitelist before re-running." }]);
    setInput("");
  }

  return (
    <aside style={{
      borderLeft: "1.5px solid var(--ink)",
      background: "var(--paper-2)",
      display: "flex", flexDirection: "column",
      maxHeight: "calc(100vh - 70px)",
    }}>
      <div style={{ padding: "20px 22px", borderBottom: "1.5px solid var(--ink)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, border: "1.5px solid var(--ink)", background: "var(--paper)", display: "grid", placeItems: "center" }}>
          <BeniMark size={22}/>
        </div>
        <div style={{ flex: 1 }}>
          <div className="display" style={{ fontSize: 18 }}>Beni</div>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em" }}>POLICY-AWARE · READS THE CHAIN</div>
        </div>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--ok)", border: "1.5px solid var(--ink)" }}/>
      </div>

      <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((m, i) => (
          m.who === "user" ? (
            <div key={i} style={{ alignSelf: "flex-end", maxWidth: "88%", padding: "10px 14px", background: "var(--ink)", color: "var(--paper)", border: "1.5px solid var(--ink)", fontFamily: "var(--serif)", fontSize: 14, lineHeight: 1.45 }}>{m.text}</div>
          ) : (
            <div key={i} style={{ alignSelf: "flex-start", maxWidth: "95%", padding: "12px 14px", background: "var(--paper)", border: "1.5px solid var(--ink)", fontFamily: "var(--serif)", fontSize: 14, lineHeight: 1.5 }}>{m.text}</div>
          )
        ))}

        <div style={{ marginTop: 10, padding: 14, border: "1.5px solid var(--accent)", background: "var(--paper)" }}>
          <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 10 }}>Suggested actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <SuggestedAction t="Raise daily cap to ₳ 3,000?"/>
            <SuggestedAction t="Whitelist addr1...u2vq"/>
            <SuggestedAction t="Snooze yield-router for 1h"/>
          </div>
        </div>
      </div>

      <div style={{ padding: 14, borderTop: "1.5px solid var(--ink)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px 0 12px", border: "1.5px solid var(--ink)", background: "var(--paper)" }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Ask Beni…"
            style={{ flex: 1, height: 36, background: "transparent", border: 0, outline: 0, color: "var(--ink)", font: "15px var(--serif)" }}
          />
          <button className="ink-btn" onClick={send} style={{ height: 28, padding: "0 10px", fontSize: 12, boxShadow: "2px 2px 0 var(--ink)" }}><Icon.send size={12} color="var(--paper)"/></button>
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 10, textAlign: "center", letterSpacing: "0.1em" }}>
          ⌘K TO FOCUS · GATED BY RBAC
        </div>
      </div>
    </aside>
  );
}

function SuggestedAction({ t }) {
  return (
    <button style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 10px", background: "var(--paper-2)", border: "1.5px solid var(--ink)",
      color: "var(--ink)", fontFamily: "var(--serif)", fontSize: 13, cursor: "pointer", textAlign: "left",
    }}>
      {t} <Icon.arrow size={14}/>
    </button>
  );
}

Object.assign(window, { Dashboard });
