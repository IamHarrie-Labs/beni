/* global React */
const { useState: useStateD, useEffect: useEffectD } = React;

// Auto-detect environment: use local server in dev, Vercel function in prod
const CHAT_API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://localhost:3001/api/chat"
  : "/api/chat";

function Dashboard() {
  const [frozen, setFrozen] = useStateD(false);

  return (
    <div className="fade-in" data-screen-label="02 Dashboard" style={{
      display: "grid", gridTemplateColumns: "260px minmax(0, 1fr) 360px",
      minWidth: 1280, minHeight: "calc(100vh - 70px)",
      borderTop: "1.5px solid var(--ink)",
      background: "var(--paper)",
    }}>
      <Sidebar/>
      <Main frozen={frozen} setFrozen={setFrozen}/>
      <AssistantPanel/>
    </div>
  );
}

/* ================= SIDEBAR ================= */
function Sidebar() {
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
          <div style={{ width: 28, height: 28, background: "var(--ink)", color: "var(--paper)", display: "grid", placeItems: "center", fontFamily: "var(--display)", fontSize: 14 }}>B</div>
          <div style={{ flex: 1 }}>
            <div className="display" style={{ fontSize: 16 }}>Your Workspace</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em" }}>PREVIEW TESTNET</div>
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
        <div style={{ padding: "18px 10px", textAlign: "center", border: "1.5px dashed var(--ink-4)", marginBottom: 6 }}>
          <div className="hand" style={{ fontSize: 20, color: "var(--ink-3)", marginBottom: 8 }}>no agents yet</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-4)", lineHeight: 1.45 }}>
            Deploy a wallet with the SDK to see your agents here.
          </div>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "transparent", border: "1.5px dashed var(--ink-3)", color: "var(--ink-2)", fontFamily: "var(--serif)", fontSize: 14, cursor: "pointer" }}>
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

function NavItem({ icon, label, active, badge, pulse }) {
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
          background: pulse ? "var(--accent)" : "var(--ink)",
          color: "var(--paper)", fontSize: 11, fontFamily: "var(--mono)",
          display: "grid", placeItems: "center", border: "1.5px solid var(--ink)",
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
          <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 6 }}>The dashboard</div>
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

      {/* Balance */}
      <BalanceHero frozen={frozen}/>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, borderTop: "1.5px solid var(--ink)", borderBottom: "1.5px solid var(--ink)", marginTop: 20, marginBottom: 28 }}>
        <KPI label="Spend today" big="—" sub="No wallet connected" extra={<MiniBar pct={0}/>}/>
        <KPI label="Transactions" big="—" sub="Deploy an agent to begin" border/>
        <KPI label="Validator latency" big="28ms" sub="p95: 41ms · on-chain healthy"/>
      </div>

      {/* Activity + Approvals */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24, marginBottom: 28 }}>
        <ActivityCard/>
        <ApprovalsCard/>
      </div>

      {/* Rules + Whitelist */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, marginBottom: 28 }}>
        <RulesCard/>
        <WhitelistCard/>
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
        <div className="smallcaps" style={{ color: "var(--ink-3)", marginBottom: 12 }}>Agent wallet balance</div>
        <div className="display" style={{ fontSize: 96, lineHeight: 0.9, letterSpacing: "-0.03em", color: "var(--ink-4)" }}>
          ₳ —
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
          <span className="hand" style={{ fontSize: 22, color: "var(--ink-3)" }}>
            deploy a wallet to see your balance
          </span>
        </div>
      </div>

      <div style={{ position: "relative", padding: "16px 24px", border: "1.5px solid var(--ink)", background: "var(--paper-2)" }}>
        <div className="smallcaps" style={{ color: "var(--ink-3)" }}>24h spend curve</div>
        <EmptyCurve/>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "end", gap: 12 }}>
        <span className="stamp-filled" style={{ background: frozen ? "var(--danger)" : "var(--ink-4)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--paper)" }}/>
          {frozen ? "FROZEN" : "NO WALLET"}
        </span>
        <div className="hand" style={{ fontSize: 22, color: "var(--ink-3)", transform: "rotate(-2deg)" }}>
          nothing to guard yet
        </div>
      </div>
    </div>
  );
}

function EmptyCurve() {
  const w = 320, h = 60;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block", marginTop: 6 }}>
      <line x1="0" y1={h * 0.8} x2={w} y2={h * 0.8} stroke="var(--ink-4)" strokeWidth="1" strokeDasharray="4 4"/>
      <line x1="0" y1={h * 0.5} x2={w} y2={h * 0.5} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="3 5" opacity="0.3"/>
      <text x={w / 2} y={h * 0.45} textAnchor="middle" fontSize="9" fontFamily="var(--mono)" fill="var(--ink-4)">NO DATA</text>
    </svg>
  );
}

function KPI({ label, big, sub, extra, border }) {
  return (
    <div style={{ padding: "20px 24px", borderLeft: border ? "1.5px solid var(--ink)" : "none", borderRight: border ? "1.5px solid var(--ink)" : "none", display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="smallcaps" style={{ color: "var(--ink-3)" }}>{label}</div>
      <div className="display" style={{ fontSize: 48, lineHeight: 1, letterSpacing: "-0.02em", color: big === "—" ? "var(--ink-4)" : "var(--ink)" }}>{big}</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink-2)" }}>{sub}</div>
      {extra}
    </div>
  );
}

function MiniBar({ pct }) {
  return (
    <div style={{ height: 8, background: "var(--paper-3)", border: "1.5px solid var(--ink)", marginTop: 4, position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: "var(--ink-4)" }}/>
    </div>
  );
}

/* ================= ACTIVITY ================= */
function ActivityCard() {
  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)" }}>Live activity</div>
          <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>Every decision, in order.</div>
        </div>
        <span className="stamp">
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ink-4)" }}/>
          WAITING
        </span>
      </div>
      <div style={{ padding: "48px 24px", textAlign: "center" }}>
        <div className="hand" style={{ fontSize: 32, color: "var(--ink-3)", marginBottom: 10 }}>no transactions yet</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-4)", maxWidth: 320, margin: "0 auto", lineHeight: 1.55 }}>
          Once you deploy an agent wallet and run your first spend, every on-chain decision will appear here in real time.
        </div>
      </div>
    </div>
  );
}

/* ================= APPROVALS ================= */
function ApprovalsCard() {
  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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

/* ================= RULES ================= */
function RulesCard() {
  const [rules, setRules] = useStateD([
    { name: "per_tx_cap", val: "Not set", desc: "Hard ceiling on any single transaction", on: false },
    { name: "daily_cap", val: "Not set", desc: "Rolling 24h budget window", on: false },
    { name: "whitelist_routing", val: "0 addrs", desc: "Skip approval for trusted addresses", on: false },
    { name: "require_approval", val: "Off", desc: "Pause for human sign-off above threshold", on: false },
  ]);
  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
            <button onClick={() => setRules(rules.map(x => x.name === r.name ? { ...x, on: !x.on } : x))} style={{
              width: 40, height: 22, border: "1.5px solid var(--ink)", background: r.on ? "var(--ink)" : "var(--paper)", position: "relative", cursor: "pointer", padding: 0, borderRadius: 0,
            }}>
              <span style={{ position: "absolute", top: 1, left: r.on ? 20 : 1, width: 16, height: 16, background: r.on ? "var(--paper)" : "var(--ink-4)", transition: "left .15s" }}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= WHITELIST ================= */
function WhitelistCard() {
  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)" }}>Whitelist</div>
          <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>0 trusted addresses</div>
        </div>
        <button className="ink-btn ghost" style={{ height: 30, fontSize: 12, padding: "0 12px", boxShadow: "2px 2px 0 var(--ink)" }}><Icon.plus size={12}/></button>
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

/* ================= TRANSACTIONS TABLE ================= */
function TransactionsTable() {
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
        </div>
      </div>
      <div style={{ padding: "48px 24px", textAlign: "center" }}>
        <div className="hand" style={{ fontSize: 32, color: "var(--ink-3)", marginBottom: 10 }}>no transactions yet</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-4)", maxWidth: 400, margin: "0 auto", lineHeight: 1.55 }}>
          Settled, rejected, and pending transactions will appear here once your agent starts spending.
        </div>
        <div style={{ marginTop: 20 }}>
          <span className="hand" style={{ fontSize: 22, color: "var(--accent)" }}>run the demo → </span>
          <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>npx tsx sdk/examples/demo.ts</span>
        </div>
      </div>
    </div>
  );
}

/* ================= ASSISTANT PANEL ================= */
function AssistantPanel() {
  const [messages, setMessages] = useStateD([
    { who: "beni", text: "Hi! I'm Beni — your on-chain wallet guardian. Deploy an agent wallet with the SDK to get started, or ask me anything about how Beni's guardrails work." },
  ]);
  const [input, setInput] = useStateD("");
  const [loading, setLoading] = useStateD(false);
  const bottomRef = React.useRef(null);

  React.useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
      <div style={{ padding: "20px 22px", borderBottom: "1.5px solid var(--ink)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, border: "1.5px solid var(--ink)", background: "var(--paper)", display: "grid", placeItems: "center" }}>
          <BeniMark size={22}/>
        </div>
        <div style={{ flex: 1 }}>
          <div className="display" style={{ fontSize: 18 }}>Beni</div>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em" }}>POLICY-AWARE · READS THE CHAIN</div>
        </div>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: loading ? "var(--warn)" : "var(--ok)", border: "1.5px solid var(--ink)" }}/>
      </div>

      <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((m, i) => (
          m.who === "user" ? (
            <div key={i} style={{ alignSelf: "flex-end", maxWidth: "88%", padding: "10px 14px", background: "var(--ink)", color: "var(--paper)", border: "1.5px solid var(--ink)", fontFamily: "var(--serif)", fontSize: 14, lineHeight: 1.45 }}>{m.text}</div>
          ) : (
            <div key={i} style={{ alignSelf: "flex-start", maxWidth: "95%", padding: "12px 14px", background: "var(--paper)", border: "1.5px solid var(--ink)", fontFamily: "var(--serif)", fontSize: 14, lineHeight: 1.5 }}>{m.text}</div>
          )
        ))}

        {loading && (
          <div style={{ alignSelf: "flex-start", padding: "12px 14px", background: "var(--paper)", border: "1.5px solid var(--ink)", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)", letterSpacing: "0.06em" }}>
            thinking…
          </div>
        )}

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

      <div style={{ padding: 14, borderTop: "1.5px solid var(--ink)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px 0 12px", border: "1.5px solid var(--ink)", background: "var(--paper)", opacity: loading ? 0.6 : 1 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Ask Beni…"
            disabled={loading}
            style={{ flex: 1, height: 36, background: "transparent", border: 0, outline: 0, color: "var(--ink)", font: "15px var(--serif)" }}
          />
          <button className="ink-btn" onClick={send} disabled={loading} style={{ height: 28, padding: "0 10px", fontSize: 12, boxShadow: "2px 2px 0 var(--ink)", opacity: loading ? 0.5 : 1 }}>
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
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 10px", background: "var(--paper-2)", border: "1.5px solid var(--ink)",
      color: "var(--ink)", fontFamily: "var(--serif)", fontSize: 13, cursor: "pointer", textAlign: "left",
    }}>
      {t} <Icon.arrow size={14}/>
    </button>
  );
}

Object.assign(window, { Dashboard });
