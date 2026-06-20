/* global React */
// WalletConnect is exported to window by components.jsx (loaded first).
const { useState: useStateL, useEffect: useEffectL } = React;

/* =================================================================== */
/*  HERO                                                                */
/* =================================================================== */
function Hero({ setPage }) {
  return (
    <section style={{ paddingTop: 104, paddingBottom: 40, position: "relative", overflow: "hidden" }}>
      <div className="wide" style={{ position: "relative" }}>
        {/* Top label row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
          <div className="smallcaps" style={{ color: "var(--accent)" }}>
            Beni · Issue 04 · May 2026
          </div>
          <div className="smallcaps" style={{ color: "var(--ink-3)" }}>
            A safety layer for autonomous AI wallets
          </div>
        </div>

        {/* Headline — reduced from clamp(80px,14vw,220px) */}
        <div style={{ position: "relative", marginBottom: 24 }}>
          <h1 className="display" style={{
            fontSize: "clamp(48px, 9vw, 120px)",
            lineHeight: 0.88,
            letterSpacing: "-0.025em",
            margin: 0,
          }}>
            Your AI agent<br/>
            <span style={{ position: "relative", display: "inline-block", color: "var(--accent)" }}>
              can't
              <span style={{ position: "absolute", left: 0, right: 0, bottom: "-0.18em" }}>
                <ScribbleUnder width="100%" thick={5} color="var(--accent)"/>
              </span>
            </span><br/>
            overspend.
          </h1>

          {/* Floating doodles */}
          <div style={{ position: "absolute", top: 40, right: -10, transform: "rotate(8deg)" }}>
            <Star size={30} color="var(--accent)"/>
          </div>
          <div className="rg-hide-mobile" style={{ position: "absolute", top: 150, right: 80, transform: "rotate(-6deg)", display: "flex", alignItems: "center", gap: 8 }}>
            <span className="hand" style={{ fontSize: 24, color: "var(--ink-2)" }}>← the whole product, in five words</span>
          </div>
          <div style={{ position: "absolute", bottom: -16, left: -16, transform: "rotate(-12deg)" }}>
            <Asterisk size={40} color="var(--accent)"/>
          </div>
        </div>

        {/* Sub + CTAs row */}
        <div className="rg-2" style={{ "--rg-cols": "1.4fr 1fr", "--rg-gap": "60px", "--rg-align": "end", marginTop: 56 }}>
          <p style={{ fontFamily: "var(--serif)", fontSize: 20, lineHeight: 1.45, margin: 0, maxWidth: 600, color: "var(--ink-2)" }}>
            Beni gives AI agents real wallets with spending limits
            <em style={{ color: "var(--ink)", fontStyle: "italic" }}> enforced by the Cardano ledger</em>,
            not by trusting the app to behave.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "end", flexWrap: "wrap" }}>
            <button className="ink-btn" onClick={() => setPage("dashboard")}>
              Open Beni <Icon.arrow size={18} color="var(--paper)"/>
            </button>
            <button className="ink-btn ghost" onClick={() => setPage("docs")}>
              Read the docs
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Marquee removed — no real partnerships to list yet */

/* =================================================================== */
/*  PROBLEM                                                             */
/* =================================================================== */
function Problem() {
  return (
    <section style={{ padding: "140px 0 100px" }}>
      <div className="wide">
        <div className="rg-2" style={{ "--rg-cols": "1.1fr 1.4fr", "--rg-gap": "80px" }}>
          <div className="rg-sticky-off" style={{ position: "sticky", top: 100 }}>
            <span className="smallcaps" style={{ color: "var(--accent)" }}>Chapter One · The mess</span>
            {/* Reduced from 80px */}
            <h2 className="display" style={{ fontSize: "clamp(34px, 7vw, 52px)", lineHeight: 0.96, margin: "20px 0 28px", letterSpacing: "-0.02em" }}>
              AI agents<br/>
              can move money.<br/>
              <span style={{ color: "var(--ink-4)", fontStyle: "italic" }}>nothing</span><br/>
              can stop them.
            </h2>
            <p style={{ fontSize: 19, lineHeight: 1.5, maxWidth: 480, color: "var(--ink-2)" }}>
              Autonomous agents already trade, pay, and route funds, usually unsupervised.
              When the model hallucinates, or a prompt gets exploited, or a key leaks,
              there is no enforced ceiling between the agent and your treasury.
            </p>
            <div style={{ marginTop: 28 }}>
              <span className="hand" style={{ fontSize: 28, color: "var(--accent)" }}>and "trust me" is not a security model.</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <StatPanel n="5" lead="guardrails enforced directly on the Cardano ledger" tail="per-tx cap · daily limit · whitelist · freeze · thread token" rot={-0.4}/>
            <StatPanel n="0" lead="off-chain services required to enforce the rules" tail="the validator runs on Cardano, not on a server you have to trust" rot={0.6}/>
            <StatPanel n="1" lead="block to freeze a rogue agent wallet" tail="one signed transaction, one block finality" accent rot={-0.3}/>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatPanel({ n, lead, tail, accent, rot = 0 }) {
  return (
    <div style={{
      borderTop: "1.5px solid var(--ink)",
      padding: "36px 0",
      display: "grid", gridTemplateColumns: "auto 1fr", gap: 36,
      alignItems: "baseline",
    }}>
      {/* Reduced from 140px */}
      <div className="display" style={{
        fontSize: 90, lineHeight: 0.9, letterSpacing: "-0.03em",
        color: accent ? "var(--accent)" : "var(--ink)",
        transform: `rotate(${rot}deg)`,
      }}>{n}</div>
      <div>
        <div style={{ fontSize: 24, lineHeight: 1.25, color: "var(--ink)" }}>{lead}</div>
        <div className="smallcaps" style={{ marginTop: 12, color: "var(--ink-3)" }}>· {tail}</div>
      </div>
    </div>
  );
}

/* =================================================================== */
/*  HOW IT WORKS                                                        */
/* =================================================================== */
function HowItWorks() {
  return (
    <section style={{ padding: "100px 0", background: "var(--ink)", color: "var(--paper)", borderTop: "1.5px solid var(--ink)", borderBottom: "1.5px solid var(--ink)" }}>
      <div className="wide">
        <div className="rg-2" style={{ "--rg-cols": "1fr 1fr", "--rg-gap": "40px", "--rg-align": "end", marginBottom: 60 }}>
          <div>
            <span className="smallcaps" style={{ color: "var(--accent-3)" }}>Chapter Two · How</span>
            {/* Reduced from 96px */}
            <h2 className="display" style={{ fontSize: "clamp(34px, 7vw, 62px)", lineHeight: 0.94, margin: "16px 0 0", letterSpacing: "-0.025em", color: "var(--paper)" }}>
              Every transaction<br/>passes through Beni.
            </h2>
          </div>
          <p style={{ fontFamily: "var(--serif)", fontSize: 19, lineHeight: 1.5, maxWidth: 420, color: "var(--paper)" }}>
            Your agent signs as usual. <em>Our validator</em> looks at the
            transaction, checks it against your rules, and either lets it
            through or it doesn't.
          </p>
        </div>
        <div className="rg-4" style={{ gap: 1, background: "var(--paper)", border: "1.5px solid var(--paper)" }}>
          {[
            { n: "01", t: "Agent builds the transaction", d: "Beni's SDK wraps your agent's wallet provider. The agent's code does not change." },
            { n: "02", t: "Rules evaluate on-chain", d: "An Aiken validator checks caps, whitelists, daily limits, and the thread-token signature." },
            { n: "03", t: "Humans gate the edge cases", d: "Anything above your threshold pauses in the approvals queue for a signed owner approval." },
            { n: "04", t: "Settle, or revert", d: "Cardano either accepts the whole thing, or rejects it. No half-baked state to clean up." },
          ].map(s => (
            <div key={s.n} style={{ background: "var(--ink)", padding: "32px 28px", display: "flex", flexDirection: "column", gap: 16, minHeight: 280 }}>
              <div className="display" style={{ fontSize: 56, color: "var(--accent-3)", lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontFamily: "var(--display)", fontSize: 24, lineHeight: 1.1, marginTop: 8 }}>{s.t}</div>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--paper-3)", margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 32, display: "flex", justifyContent: "center", alignItems: "center", gap: 14 }}>
          <span className="hand" style={{ fontSize: 28, color: "var(--accent-3)" }}>and that's basically the whole thing.</span>
          <HandArrow dir="right" color="var(--accent-3)" w={80}/>
        </div>
      </div>
    </section>
  );
}

/* =================================================================== */
/*  THE RULES (features)                                                */
/* =================================================================== */
function Rules() {
  const items = [
    { n: "I.",   t: "A ceiling on every spend",         d: "Set the maximum size of any single transaction. The agent cannot exceed it.",                 doodle: "cap" },
    { n: "II.",  t: "A rolling daily budget",            d: "A time-windowed allowance tracked on-chain. No end-of-day cliff, no off-chain timer to trust.", doodle: "clock" },
    { n: "III.", t: "Trusted addresses bypass review",   d: "Pre-approve who the agent can pay freely. Everything else stops at the gate.",                 doodle: "list" },
    { n: "IV.",  t: "Human-in-the-loop approvals",       d: "Anything above your threshold pauses for your signature before it can settle.",               doodle: "hand" },
    { n: "V.",   t: "Emergency freeze",                  d: "One owner action halts every outbound transaction within a block.",                           doodle: "freeze" },
    { n: "VI.",  t: "Thread-token integrity",            d: "A non-fungible thread token anchors the wallet's state so a forged datum can't slip in.",      doodle: "shield" },
  ];
  return (
    <section style={{ padding: "140px 0 100px" }}>
      <div className="wide">
        <div className="rg-2" style={{ "--rg-cols": "1.4fr 1fr", "--rg-gap": "60px", "--rg-align": "end", marginBottom: 80 }}>
          {/* Reduced from 120px */}
          <h2 className="display" style={{ fontSize: "clamp(36px, 8vw, 74px)", lineHeight: 0.92, margin: 0, letterSpacing: "-0.025em" }}>
            Five guardrails,<br/>
            <span style={{ color: "var(--accent)" }}>one</span> thread token.
          </h2>
          <p style={{ fontSize: 19, lineHeight: 1.5, color: "var(--ink-2)" }}>
            A small kit of rules, all enforced by the Cardano ledger. Compose them
            into any policy, from a single trading bot to a shared treasury.
            A live dashboard and an AI assistant sit on top.
          </p>
        </div>
        <div className="rg-4" style={{ borderTop: "1.5px solid var(--ink)", borderLeft: "1.5px solid var(--ink)" }}>
          {items.map((x, i) => (
            <div key={i} style={{
              borderRight: "1.5px solid var(--ink)", borderBottom: "1.5px solid var(--ink)",
              padding: 28, minHeight: 240,
              display: "flex", flexDirection: "column", gap: 14,
              background: "var(--paper)", position: "relative",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div className="display" style={{ fontSize: 44, color: "var(--accent)", lineHeight: 1, letterSpacing: "-0.02em" }}>{x.n}</div>
                <RuleDoodle kind={x.doodle}/>
              </div>
              <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 6 }}>{x.t}</div>
              <p style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink-2)", margin: 0 }}>{x.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RuleDoodle({ kind }) {
  const map = {
    cap:    <Icon.shield size={34} sw={1.6}/>,
    clock:  <svg viewBox="0 0 24 24" width={34} height={34}><g filter="url(#wobble)" stroke="var(--ink)" strokeWidth="1.6" fill="none" strokeLinecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 8 V13 L16 16"/><line x1="9" y1="3" x2="15" y2="3"/></g></svg>,
    list:   <Icon.list size={34} sw={1.6}/>,
    hand:   <svg viewBox="0 0 24 24" width={34} height={34}><g filter="url(#wobble)" stroke="var(--ink)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11 V5 C 9 4, 10 3, 11 3 C 12 3, 13 4, 13 5 V11 V8 C 13 7, 14 6, 15 6 C 16 6, 17 7, 17 8 V13 C 17 17, 14 21, 10 21 C 6 21, 5 17, 5 14 V11 C 5 10, 6 9, 7 9 C 8 9, 9 10, 9 11 Z"/></g></svg>,
    freeze: <Icon.freeze size={34} sw={1.6}/>,
    eye:    <Icon.eye size={34} sw={1.6}/>,
    chat:   <Icon.chat size={34} sw={1.6}/>,
    shield: <Icon.shield size={34} sw={1.6}/>,
  };
  return <span style={{ color: "var(--ink-3)" }}>{map[kind]}</span>;
}

/* =================================================================== */
/*  SDK SECTION                                                         */
/* =================================================================== */
function SdkSection({ setPage }) {
  return (
    <section style={{ padding: "120px 0", background: "var(--paper-2)", borderTop: "1.5px solid var(--ink)", borderBottom: "1.5px solid var(--ink)" }}>
      <div className="wide">
        <div className="rg-2" style={{ "--rg-cols": "1fr 1.2fr", "--rg-gap": "80px", "--rg-align": "center" }}>
          <div>
            <span className="smallcaps" style={{ color: "var(--accent)" }}>Chapter Three · For builders</span>
            {/* Reduced from 88px */}
            <h2 className="display" style={{ fontSize: "clamp(34px, 7vw, 58px)", lineHeight: 0.94, margin: "16px 0 24px", letterSpacing: "-0.025em" }}>
              A few lines<br/>
              to deploy a<br/>
              guarded wallet.
            </h2>
            <p style={{ fontSize: 18, lineHeight: 1.5, color: "var(--ink-2)", maxWidth: 460, marginBottom: 28 }}>
              Set your rules, create the wallet on-chain, and let the agent spend
              through it. The Aiken validator does the enforcing, so there's no
              service in the middle to trust or pay.
            </p>
            <div style={{ display: "flex", gap: 12, marginBottom: 36, flexWrap: "wrap" }}>
              <button className="ink-btn" onClick={() => setPage("docs")}>Open the SDK docs <Icon.arrow size={16} color="var(--paper)"/></button>
              <button className="ink-btn ghost" onClick={() => window.open("https://github.com/IamHarrie-Labs/beni", "_blank")}><Icon.github size={16}/> Star on GitHub</button>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span className="hand" style={{ fontSize: 26, color: "var(--accent)" }}>built with</span>
              <span className="stamp">AIKEN</span>
              <span className="stamp">TYPESCRIPT</span>
              <span className="stamp">BLOCKFROST</span>
            </div>
          </div>
          <CodeCard/>
        </div>
      </div>
    </section>
  );
}

function CodeCard() {
  return (
    <div className="paper-card askew-1" style={{ padding: 0, boxShadow: "8px 8px 0 0 var(--ink)" }}>
      <div style={{ padding: "14px 22px", borderBottom: "1.5px solid var(--ink)", display: "flex", alignItems: "center", gap: 12, background: "var(--paper-3)" }}>
        <span className="mono" style={{ fontSize: 12, letterSpacing: "0.1em" }}>AGENT.TS</span>
        <span style={{ flex: 1 }}/>
        <span className="stamp">COPY</span>
      </div>
      <pre style={{
        margin: 0, padding: "28px 32px", overflow: "auto", background: "var(--paper)",
        fontFamily: "var(--mono)", fontSize: 14, lineHeight: 1.75, color: "var(--ink)",
      }}>
<code>{`// Deploy a guarded agent wallet on-chain.
`}<span style={{ color: "var(--accent-2)" }}>import</span>{` { makeLucid, createAgentWallet, agentSpend, freezeWallet } `}<span style={{ color: "var(--accent-2)" }}>from</span>{` `}<span style={{ color: "var(--accent)" }}>"beni-sdk"</span>{`

`}<span style={{ color: "var(--accent-2)" }}>const</span>{` lucid = `}<span style={{ color: "var(--accent-2)" }}>await</span>{` makeLucid({ network: `}<span style={{ color: "var(--accent)" }}>"Preview"</span>{`, blockfrostApiKey })
lucid.selectWalletFromPrivateKey(agentPrivateKey)

`}<span style={{ color: "var(--accent-2)" }}>const</span>{` wallet = `}<span style={{ color: "var(--accent-2)" }}>await</span>{` createAgentWallet(lucid, {
  perTxCapLovelace:  `}<span style={{ color: "var(--accent-2)" }}>2_000_000n</span>{`,   `}<span style={{ color: "var(--ink-3)" }}>// 2 ADA per-tx cap</span>{`
  dailyCapLovelace:  `}<span style={{ color: "var(--accent-2)" }}>10_000_000n</span>{`,  `}<span style={{ color: "var(--ink-3)" }}>// 10 ADA daily limit</span>{`
  allowedCredentialHashes: [],           `}<span style={{ color: "var(--ink-3)" }}>// whitelist</span>{`
  ownerPkh: ownerPubKeyHash,
  isFrozen: `}<span style={{ color: "var(--accent-2)" }}>false</span>{`,
})

`}<span style={{ color: "var(--accent-2)" }}>await</span>{` agentSpend(lucid, wallet, `}<span style={{ color: "var(--accent)" }}>"addr_test1..."</span>{`, `}<span style={{ color: "var(--accent-2)" }}>1_000_000n</span>{`)
`}<span style={{ color: "var(--accent-2)" }}>await</span>{` freezeWallet(lucid, wallet)   `}<span style={{ color: "var(--ink-3)" }}>// one call, one block</span></code>
      </pre>
    </div>
  );
}

/* Testimonial removed — no real users yet */

/* =================================================================== */
/*  FAQ                                                                 */
/* =================================================================== */
function FAQ({ setPage }) {
  const items = [
    { q: "Where do the rules actually run?", a: "Inside an Aiken validator on Cardano. Beni's off-chain services help you author and observe, but enforcement happens on-chain. No off-chain dependency can override a deployed cap." },
    { q: "Does Beni hold my funds?", a: "No. Beni never takes custody. Your wallet still signs every transaction; the validator simply refuses to settle anything that violates your rules." },
    { q: "What happens during an emergency freeze?", a: "A single signed action burns the agent's spend permission until you re-issue it. The freeze takes one block to finalize and cannot be bypassed off-chain." },
    { q: "Which agents and frameworks are supported?", a: "Anything that constructs Cardano transactions: LangChain, AutoGen, custom Python or TypeScript bots, internal trading services. Beni wraps the wallet, not the agent." },
    { q: "How is this different from a multisig?", a: "Multisigs gate signatures. Beni gates behavior. Per-tx caps, rolling budgets, whitelists, and approval thresholds are policies a multisig cannot express." },
    { q: "Is the contract audited?", a: "Not yet. Beni is a hackathon project built for Gimbalabs Piece of Pie 2026. A formal audit is planned before any mainnet deployment." },
  ];
  const [open, setOpen] = useStateL(0);
  return (
    <section style={{ padding: "120px 0", borderTop: "1.5px solid var(--ink)" }}>
      <div className="wide">
        <div className="rg-2" style={{ "--rg-cols": "1fr 1.6fr", "--rg-gap": "80px" }}>
          <div className="rg-sticky-off" style={{ position: "sticky", top: 100, alignSelf: "start" }}>
            <span className="smallcaps" style={{ color: "var(--accent)" }}>Chapter Four · Q&amp;A</span>
            {/* Reduced from 88px */}
            <h2 className="display" style={{ fontSize: "clamp(34px, 7vw, 58px)", lineHeight: 0.94, margin: "16px 0 28px" }}>
              Questions,<br/>answered.
            </h2>
            <p style={{ fontSize: 18, color: "var(--ink-2)", maxWidth: 360 }}>
              For everything else, the docs go deeper.
            </p>
            <button onClick={() => setPage("docs")} className="hand" style={{ fontSize: 26, color: "var(--accent)", background: "none", border: 0, padding: 0, marginTop: 18, cursor: "pointer", display: "inline-block" }}>Read the docs →</button>
          </div>
          <div style={{ borderTop: "1.5px solid var(--ink)" }}>
            {items.map((it, i) => (
              <div key={i} style={{ borderBottom: "1.5px solid var(--ink)" }}>
                <button onClick={() => setOpen(open === i ? -1 : i)} style={{
                  width: "100%", background: "transparent", border: 0, padding: "22px 0",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  color: "var(--ink)", fontFamily: "var(--display)", fontSize: 24, lineHeight: 1.1,
                  cursor: "pointer", textAlign: "left", letterSpacing: "-0.015em",
                }}>
                  <span style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                    <span style={{ color: "var(--ink-4)", fontSize: 18 }}>{String(i + 1).padStart(2, "0")}.</span>
                    {it.q}
                  </span>
                  <span style={{ marginLeft: 24, fontSize: 28, color: "var(--accent)", transform: open === i ? "rotate(45deg)" : "none", transition: "transform .2s" }}>+</span>
                </button>
                {open === i && (
                  <div style={{ paddingBottom: 24, paddingLeft: 48, fontSize: 18, lineHeight: 1.55, color: "var(--ink-2)" }}>{it.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* =================================================================== */
/*  FINAL CTA — giant mural                                             */
/* =================================================================== */
function FinalCTA({ setPage }) {
  return (
    <section style={{ padding: "60px 0 100px" }}>
      <div className="wide">
        <div style={{ background: "var(--ink)", color: "var(--paper)", padding: "clamp(40px, 8vw, 100px) clamp(24px, 5vw, 60px)", position: "relative", overflow: "hidden", boxShadow: "10px 10px 0 0 var(--accent)" }}>
          <div className="rg-hide-mobile" style={{ position: "absolute", top: 40, right: 60, transform: "rotate(8deg)" }}>
            <Star size={48} color="var(--accent-3)"/>
          </div>
          <div className="rg-hide-mobile" style={{ position: "absolute", bottom: 40, left: 60, transform: "rotate(-12deg)" }}>
            <Asterisk size={56} color="var(--accent)"/>
          </div>
          <div className="smallcaps" style={{ color: "var(--accent-3)", marginBottom: 24 }}>Last page</div>
          {/* Reduced from clamp(80px,12vw,180px) */}
          <h2 className="display" style={{ fontSize: "clamp(48px, 8vw, 110px)", lineHeight: 0.88, margin: 0, letterSpacing: "-0.03em", color: "var(--paper)" }}>
            Give your<br/>
            agents <span style={{ color: "var(--accent)" }}>a leash</span>.
          </h2>
          <p style={{ fontSize: 20, lineHeight: 1.5, maxWidth: 560, marginTop: 32, color: "var(--paper-3)" }}>
            A hackathon project, live on Cardano Preview testnet.
            Beni never takes custody. <span className="hand" style={{ fontSize: 28, color: "var(--accent-3)" }}>(your keys stay yours.)</span>
          </p>
          <div style={{ marginTop: 40, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button className="ink-btn accent" onClick={() => setPage("dashboard")}>
              Open Beni <Icon.arrow size={18} color="var(--paper)"/>
            </button>
            <button
              className="ink-btn"
              style={{ background: "transparent", color: "var(--paper)", borderColor: "var(--paper)", boxShadow: "3px 3px 0 var(--accent)" }}
              onClick={() => window.open("https://github.com/IamHarrie-Labs/beni", "_blank")}
            >
              View on GitHub
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =================================================================== */
/*  ROOT                                                                */
/* =================================================================== */
function Landing({ setPage }) {
  return (
    <div className="fade-in" data-screen-label="01 Landing">
      <Hero setPage={setPage}/>
      <Problem/>
      <HowItWorks/>
      <Rules/>
      <SdkSection setPage={setPage}/>
      <FAQ setPage={setPage}/>
      <FinalCTA setPage={setPage}/>
    </div>
  );
}

Object.assign(window, { Landing });
