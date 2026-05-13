/* global React */
const { useState: useStateS } = React;

/* =================================================================== */
/*  SECURITY PAGE                                                       */
/* =================================================================== */
function SecurityPage() {
  return (
    <div className="fade-in" data-screen-label="03 Security">
      <section style={{ padding: "80px 0 60px", position: "relative", overflow: "hidden", borderBottom: "1.5px solid var(--ink)" }}>
        <div className="wide">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 40 }}>
            <span className="smallcaps" style={{ color: "var(--accent)" }}>Chapter — How it's safe</span>
            <span className="smallcaps" style={{ color: "var(--ink-3)" }}>The architecture, plainly</span>
          </div>
          <h1 className="display" style={{ fontSize: "clamp(80px, 13vw, 200px)", lineHeight: 0.88, margin: 0, letterSpacing: "-0.025em" }}>
            The rails are<br/>
            <span style={{ position: "relative", display: "inline-block" }}>
              physical
              <span style={{ position: "absolute", left: 0, right: 0, bottom: "-0.12em" }}>
                <ScribbleUnder thick={6} color="var(--accent)"/>
              </span>
            </span>,<br/>
            <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>not advisory.</span>
          </h1>
          <p style={{ fontSize: 22, lineHeight: 1.5, color: "var(--ink-2)", maxWidth: 700, marginTop: 36 }}>
            Beni's policies compile to a Cardano validator. A transaction that breaks the
            rules <em>never settles</em> — no warning, no signed message, no log to ignore.
            Just rejection.
          </p>
        </div>
      </section>

      <SecurityLayers/>
      <ContractAnatomy/>
      <SecurityStats/>
    </div>
  );
}

function SecurityLayers() {
  const layers = [
    { n: "L4", t: "The operator", d: "Human-in-the-loop approvals, freeze, role-based access.", who: "you" },
    { n: "L3", t: "The policy engine", d: "Rule composition, simulation, audit log, history.", who: "beni cloud" },
    { n: "L2", t: "The validator", d: "On-chain enforcement of every rule, written in Aiken.", who: "cardano" },
    { n: "L1", t: "Cardano", d: "Settlement. Atomic, public, irreversible.", who: "cardano" },
  ];

  return (
    <section style={{ padding: "120px 0", borderBottom: "1.5px solid var(--ink)" }}>
      <div className="wide">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 80, alignItems: "center" }}>
          <div>
            <span className="smallcaps" style={{ color: "var(--accent)" }}>I. Defense in depth</span>
            <h2 className="display" style={{ fontSize: 80, lineHeight: 0.92, margin: "16px 0 24px", letterSpacing: "-0.02em" }}>
              Four layers<br/>between an agent<br/>and your money.
            </h2>
            <p style={{ fontSize: 19, lineHeight: 1.55, color: "var(--ink-2)", maxWidth: 480 }}>
              Each layer is independent. A bug in the dashboard cannot reach the validator.
              A compromised validator cannot reach the L1. Cardano's deterministic
              execution turns rule violations into outright rejection.
            </p>
            <div style={{ marginTop: 28 }}>
              <span className="hand" style={{ fontSize: 30, color: "var(--accent)" }}>each layer fails closed, never open.</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
            {layers.map((l, i) => (
              <div key={l.n} style={{
                display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 20, alignItems: "center",
                padding: "20px 24px",
                border: "1.5px solid var(--ink)",
                background: i === 2 ? "var(--ink)" : "var(--paper)",
                color: i === 2 ? "var(--paper)" : "var(--ink)",
                marginLeft: i * 16,
                boxShadow: "4px 4px 0 var(--ink)",
              }}>
                <div className="display" style={{ fontSize: 36, lineHeight: 1, color: i === 2 ? "var(--accent-3)" : "var(--accent)" }}>{l.n}</div>
                <div>
                  <div className="display" style={{ fontSize: 22, lineHeight: 1.1 }}>{l.t}</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 14, marginTop: 4, opacity: 0.85 }}>{l.d}</div>
                </div>
                <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.7 }}>{l.who}</div>
              </div>
            ))}
            <div style={{ position: "absolute", left: -40, top: 30, transform: "rotate(-90deg) translateY(40px)", transformOrigin: "left top" }}>
              <span className="hand" style={{ fontSize: 22, color: "var(--ink-3)", whiteSpace: "nowrap" }}>↑ closer to the user · closer to the chain ↓</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContractAnatomy() {
  return (
    <section style={{ padding: "120px 0", background: "var(--paper-2)", borderBottom: "1.5px solid var(--ink)" }}>
      <div className="wide">
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <span className="smallcaps" style={{ color: "var(--accent)" }}>II. The validator, opened up</span>
          <h2 className="display" style={{ fontSize: 80, lineHeight: 0.92, margin: "12px 0 0", letterSpacing: "-0.02em" }}>
            What happens in <span style={{ color: "var(--accent)" }}>28ms</span>.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>
          {/* Aiken code */}
          <div className="paper-card askew-2" style={{ padding: 0, boxShadow: "6px 6px 0 var(--ink)" }}>
            <div style={{ padding: "12px 18px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-3)", display: "flex", alignItems: "center", gap: 12 }}>
              <span className="mono" style={{ fontSize: 11, letterSpacing: "0.1em" }}>VALIDATORS/BENI_GUARD.AK</span>
              <span style={{ flex: 1 }}/>
              <span className="stamp">AIKEN</span>
            </div>
            <pre style={{ margin: 0, padding: 24, fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.7, color: "var(--ink)" }}>
<code>{`validator beni_guard(params) {
  spend(d: Datum, r: Redeemer, ctx) -> Bool {
    let total = sum_value(ctx.tx.outputs)

    // 1. Per-transaction cap
    expect total <= d.per_tx_cap

    // 2. Rolling daily cap
    expect d.day_spent + total <= d.daily_cap

    // 3. Whitelist OR approval token
    expect in_whitelist(ctx, d.whitelist)
        || has_approval_token(ctx, params.thread)

    // 4. Freeze guard
    expect !d.frozen

    True
  }
}`}</code>
            </pre>
          </div>

          {/* Pipeline */}
          <div style={{ background: "var(--paper)", border: "1.5px solid var(--ink)", padding: "28px 32px", boxShadow: "6px 6px 0 var(--ink)" }}>
            <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 6 }}>The pipeline</div>
            <div className="display" style={{ fontSize: 28, marginBottom: 24, lineHeight: 1.1 }}>Step by step.</div>
            {[
              { s: "Inputs gathered", d: "agent UTxO + datum + thread token", t: "0ms" },
              { s: "Cap checks", d: "per_tx_cap, daily_cap", t: "4ms" },
              { s: "Whitelist scan", d: "12 addresses · bloom filter", t: "9ms" },
              { s: "Approval token check", d: "ed25519 signature verify", t: "16ms" },
              { s: "Freeze guard", d: "datum.frozen ≟ False", t: "22ms" },
              { s: "Accepted, or rejected", d: "atomic, on chain", t: "28ms" },
            ].map((step, i, arr) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 14, alignItems: "center", paddingBottom: i < arr.length - 1 ? 14 : 0, marginBottom: i < arr.length - 1 ? 14 : 0, borderBottom: i < arr.length - 1 ? "1.5px solid var(--paper-3)" : 0 }}>
                <div style={{
                  width: 28, height: 28,
                  border: "1.5px solid var(--ink)",
                  background: i === 5 ? "var(--accent)" : "var(--paper-2)",
                  color: i === 5 ? "var(--paper)" : "var(--ink)",
                  display: "grid", placeItems: "center",
                  fontFamily: "var(--mono)", fontSize: 12,
                }}>{i + 1}</div>
                <div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 16 }}>{step.s}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{step.d}</div>
                </div>
                <span className="mono" style={{ fontSize: 12, color: i === 5 ? "var(--accent)" : "var(--ink-3)" }}>{step.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SecurityStats() {
  return (
    <section style={{ padding: "100px 0" }}>
      <div className="wide">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: "1.5px solid var(--ink)", borderLeft: "1.5px solid var(--ink)" }}>
          {[
            { v: "28ms", l: "Median validator latency" },
            { v: "100%", l: "Enforcement on chain" },
            { v: "0", l: "Off-chain trust deps" },
            { v: "Q1 ’26", l: "Audited by Tweag Labs" },
          ].map(s => (
            <div key={s.l} style={{ padding: "40px 32px", borderRight: "1.5px solid var(--ink)", borderBottom: "1.5px solid var(--ink)", textAlign: "center" }}>
              <div className="display" style={{ fontSize: 64, lineHeight: 1, letterSpacing: "-0.025em" }}>{s.v}</div>
              <div className="smallcaps" style={{ color: "var(--ink-3)", marginTop: 14 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =================================================================== */
/*  DOCS PAGE                                                           */
/* =================================================================== */
function DocsPage() {
  const [active, setActive] = useStateS("quickstart");

  const sections = {
    quickstart: { title: "Quickstart", body: <QuickstartBody/> },
    install: { title: "Installation", body: <InstallBody/> },
    rules: { title: "Defining rules", body: <RulesBody/> },
    approval: { title: "Approval flow", body: <ApprovalBody/> },
    contracts: { title: "Aiken contracts", body: <ContractsBody/> },
  };

  return (
    <div className="fade-in" data-screen-label="04 Docs" style={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr) 240px", minWidth: 1200, minHeight: "calc(100vh - 70px)", borderTop: "1.5px solid var(--ink)" }}>
      <aside style={{ borderRight: "1.5px solid var(--ink)", padding: 28, background: "var(--paper-2)" }}>
        <div className="display" style={{ fontSize: 32, letterSpacing: "-0.02em", marginBottom: 24 }}>The docs.</div>

        <div style={{ position: "relative", marginBottom: 28 }}>
          <input placeholder="Search…" style={{ width: "100%", height: 40, padding: "0 14px 0 38px", background: "var(--paper)", border: "1.5px solid var(--ink)", color: "var(--ink)", font: "15px var(--serif)", outline: 0 }}/>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><Icon.search size={16}/></span>
          <span className="mono" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, padding: "2px 6px", border: "1.5px solid var(--ink)" }}>⌘K</span>
        </div>

        <DocGroup title="Getting started">
          {[
            ["quickstart", "Quickstart"],
            ["install", "Installation"],
            ["rules", "Defining rules"],
            ["approval", "Approval flow"],
          ].map(([k, l]) => (
            <DocLink key={k} active={active === k} onClick={() => setActive(k)}>{l}</DocLink>
          ))}
        </DocGroup>

        <DocGroup title="On-chain">
          <DocLink active={active === "contracts"} onClick={() => setActive("contracts")}>Aiken contracts</DocLink>
          <DocLink>Validator parameters</DocLink>
          <DocLink>Thread tokens</DocLink>
          <DocLink>Datum schema</DocLink>
        </DocGroup>

        <DocGroup title="SDK reference">
          <DocLink>Beni.wrap()</DocLink>
          <DocLink>rule.perTxCap()</DocLink>
          <DocLink>rule.dailyCap()</DocLink>
          <DocLink>rule.whitelist()</DocLink>
          <DocLink>rule.requireApproval()</DocLink>
        </DocGroup>
      </aside>

      <main style={{ padding: "56px 72px", maxWidth: 860 }}>
        <div className="smallcaps" style={{ color: "var(--ink-3)", marginBottom: 12 }}>DOCS / GETTING STARTED / {sections[active].title.toUpperCase()}</div>
        <h1 className="display" style={{ fontSize: 72, lineHeight: 0.95, margin: "0 0 32px", letterSpacing: "-0.025em" }}>{sections[active].title}.</h1>
        {sections[active].body}
      </main>

      <aside style={{ borderLeft: "1.5px solid var(--ink)", padding: 28, background: "var(--paper-2)" }}>
        <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 16 }}>On this page</div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {["Install the SDK", "Wrap your wallet", "Add rules", "Send a transaction", "Read the response"].map((l, i) => (
            <li key={i} style={{ fontFamily: "var(--serif)", fontSize: 14, color: i === 0 ? "var(--ink)" : "var(--ink-2)", paddingLeft: 12, borderLeft: i === 0 ? "3px solid var(--accent)" : "1.5px solid var(--paper-3)" }}>{l}</li>
          ))}
        </ul>

        <div style={{ height: 1.5, background: "var(--ink)", margin: "28px 0" }}/>

        <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 16 }}>Reference</div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontFamily: "var(--serif)", fontSize: 14 }}>
          <li style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon.github size={14}/> Source on GitHub</li>
          <li>Aiken playground</li>
          <li>Edit this page</li>
        </ul>

        <div className="hand" style={{ marginTop: 32, fontSize: 22, color: "var(--ink-2)" }}>got stuck?<br/>hello@beni.run</div>
      </aside>
    </div>
  );
}

function DocGroup({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 10, padding: "0 6px" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}

function DocLink({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      textAlign: "left", padding: "8px 12px",
      border: 0,
      cursor: "pointer",
      background: active ? "var(--ink)" : "transparent",
      color: active ? "var(--paper)" : "var(--ink)",
      fontFamily: "var(--serif)", fontSize: 15,
    }}>{children}</button>
  );
}

function P({ children }) { return <p style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink-2)", lineHeight: 1.65, margin: "0 0 18px" }}>{children}</p>; }
function H2({ children }) { return <h2 className="display" style={{ fontSize: 36, margin: "40px 0 16px", letterSpacing: "-0.02em" }}>{children}</h2>; }

function QuickstartBody() {
  return (
    <>
      <P>Beni wraps any Cardano wallet provider with programmable spend rules. This guide installs the SDK and ships a guarded agent in under five minutes.</P>
      <Callout title="Prerequisites">Node 18+, a Cardano wallet provider (Lucid, Mesh, or raw CIP-30), and an agent that constructs transactions on your behalf.</Callout>
      <H2>1. Install the SDK</H2>
      <CodeSnippet lang="BASH">{`npm install @beni/sdk lucid-cardano`}</CodeSnippet>
      <H2>2. Wrap your wallet</H2>
      <CodeSnippet lang="TS">{`import { Beni, rule } from "@beni/sdk"
import { Lucid } from "lucid-cardano"

const wallet = await Lucid.new(provider, "Mainnet")

const guarded = await Beni.wrap(wallet, {
  agentId: "atlas-trader-v2",
  rules: [
    rule.perTxCap({ lovelace: 500_000_000n }),
    rule.dailyCap({ lovelace: 2_500_000_000n }),
  ],
})`}</CodeSnippet>
      <H2>3. Send a transaction</H2>
      <P>Use the guarded wallet exactly like the raw one. If the transaction violates a rule, the validator rejects it on-chain and the SDK throws a typed <code className="mono" style={{ color: "var(--accent)" }}>BeniRuleError</code>.</P>
      <CodeSnippet lang="TS">{`try {
  await guarded.send({ to, lovelace: 120_000_000n })
} catch (e) {
  if (e instanceof BeniRuleError) {
    console.log(e.rule, e.reason)
    // "daily_cap"  "exceeded by 1730 ADA"
  }
}`}</CodeSnippet>
      <Callout accent title="Next →">Continue to <em>Defining rules</em> for the full policy surface, or jump to <em>Approval flow</em> for human-in-the-loop gating.</Callout>
    </>
  );
}

function InstallBody() {
  return (
    <>
      <P>Beni ships as a TypeScript SDK plus a set of audited Aiken contracts you deploy once per agent wallet.</P>
      <H2>Package install</H2>
      <CodeSnippet lang="BASH">{`npm install @beni/sdk\npnpm add @beni/sdk\nbun add @beni/sdk`}</CodeSnippet>
      <H2>Deploy the validator</H2>
      <P>One command compiles the Aiken contract and registers the thread token on Cardano:</P>
      <CodeSnippet lang="BASH">{`npx beni deploy --network mainnet \\\n  --agent atlas-trader-v2 \\\n  --owner addr1q9w...4xkt`}</CodeSnippet>
    </>
  );
}

function RulesBody() {
  return (
    <>
      <P>Rules are pure functions over a transaction's UTxO set. They compose: every rule must pass for the transaction to settle.</P>
      <CodeSnippet lang="TS">{`rule.perTxCap({ lovelace: 500_000_000n })\nrule.dailyCap({ lovelace: 2_500_000_000n })\nrule.whitelist(["addr1...m7p2"])\nrule.requireApproval({ above: 250_000_000n })\nrule.newAddressHold({ window: "30m" })`}</CodeSnippet>
    </>
  );
}

function ApprovalBody() {
  return <P>When a rule emits <code className="mono" style={{ color: "var(--accent)" }}>requireApproval</code>, the transaction is held in the policy contract until a signed approval token is provided. Approvals can be issued from the dashboard, the SDK, or a webhook integration.</P>;
}

function ContractsBody() {
  return <P>All Beni validators are written in Aiken and audited by Tweag Labs. Source and reproducible builds live on GitHub.</P>;
}

function Callout({ accent, title, children }) {
  return (
    <div style={{ padding: 22, border: "1.5px solid var(--ink)", background: accent ? "var(--ink)" : "var(--paper-2)", color: accent ? "var(--paper)" : "var(--ink)", marginBottom: 24, position: "relative" }}>
      <div className="smallcaps" style={{ color: accent ? "var(--accent-3)" : "var(--accent)", marginBottom: 8 }}>{title}</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 16, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function CodeSnippet({ lang, children }) {
  return (
    <div style={{ marginBottom: 24, border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "4px 4px 0 var(--ink)" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-3)", display: "flex", alignItems: "center", gap: 10 }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: "0.14em" }}>{lang}</span>
        <span style={{ flex: 1 }}/>
        <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>COPY</span>
      </div>
      <pre style={{ margin: 0, padding: 20, fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.75, color: "var(--ink)", overflow: "auto" }}><code>{children}</code></pre>
    </div>
  );
}

/* =================================================================== */
/*  BRAND PAGE                                                          */
/* =================================================================== */
function BrandPage() {
  return (
    <div className="fade-in" data-screen-label="05 Brand">
      <section style={{ padding: "80px 0 60px", borderBottom: "1.5px solid var(--ink)" }}>
        <div className="wide">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 30 }}>
            <span className="smallcaps" style={{ color: "var(--accent)" }}>The brand book</span>
            <span className="smallcaps" style={{ color: "var(--ink-3)" }}>Issue 04 — May 2026</span>
          </div>
          <h1 className="display" style={{ fontSize: "clamp(80px, 14vw, 220px)", lineHeight: 0.86, margin: 0, letterSpacing: "-0.03em" }}>
            How Beni<br/>
            <span style={{ color: "var(--accent)", fontStyle: "italic" }}>looks</span> and<br/>
            <span style={{ color: "var(--accent)", fontStyle: "italic" }}>sounds</span>.
          </h1>
          <p style={{ fontSize: 22, lineHeight: 1.5, color: "var(--ink-2)", maxWidth: 680, marginTop: 32 }}>
            We make a financial product, but we are not a financial brand. Beni is
            paper, ink, and one careful pop of color. Hand-set type does the heavy lifting.
            Software should be <em>beautiful</em>.
          </p>
        </div>
      </section>

      {/* I. Logo */}
      <section style={{ padding: "100px 0", borderBottom: "1.5px solid var(--ink)" }}>
        <div className="wide">
          <SectionHead n="I." title="The mark" sub="An aperture shield with a B inside — AI vision contained by a hard boundary."/>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 0, borderTop: "1.5px solid var(--ink)", borderLeft: "1.5px solid var(--ink)" }}>
            <BrandCard label="01 / PRIMARY LOCKUP" big>
              <Wordmark size={48}/>
            </BrandCard>
            <BrandCard label="02 / ICON MARK">
              <BeniMark size={120}/>
            </BrandCard>
            <BrandCard label="03 / REVERSED" inverse>
              <Wordmark size={32} color="var(--paper)"/>
            </BrandCard>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0, borderLeft: "1.5px solid var(--ink)" }}>
            <BrandCard label="04 / APP ICON">
              <div style={{ width: 100, height: 100, background: "var(--ink)", display: "grid", placeItems: "center" }}>
                <BeniMark size={60} color="var(--paper)"/>
              </div>
            </BrandCard>
            <BrandCard label="05 / FAVICON">
              <div style={{ width: 64, height: 64, border: "1.5px solid var(--ink)", display: "grid", placeItems: "center" }}>
                <BeniMark size={40}/>
              </div>
            </BrandCard>
            <BrandCard label="06 / STACKED">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <BeniMark size={50}/>
                <span className="display" style={{ fontSize: 24, letterSpacing: "-0.02em" }}>Beni</span>
              </div>
            </BrandCard>
            <BrandCard label="07 / STAMP" inverse>
              <span className="stamp-filled" style={{ fontSize: 14, padding: "6px 14px", background: "var(--accent)", transform: "rotate(-3deg)" }}>BENI · 0.4.1</span>
            </BrandCard>
          </div>
        </div>
      </section>

      {/* II. Color */}
      <section style={{ padding: "100px 0", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)" }}>
        <div className="wide">
          <SectionHead n="II." title="The palette" sub="Paper, ink, and one careful color. The accents are rationed; the page does the work."/>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0, borderTop: "1.5px solid var(--ink)", borderLeft: "1.5px solid var(--ink)" }}>
            {[
              { n: "Paper", c: "var(--paper)", text: "var(--ink)", code: "0.955 0.022 82" },
              { n: "Paper 2", c: "var(--paper-2)", text: "var(--ink)", code: "0.935 0.030 82" },
              { n: "Paper 3", c: "var(--paper-3)", text: "var(--ink)", code: "0.905 0.034 80" },
              { n: "Ink", c: "var(--ink)", text: "var(--paper)", code: "0.18 0.012 60" },
              { n: "Terracotta", c: "var(--accent)", text: "var(--paper)", code: "0.60 0.170 32" },
              { n: "Dusty teal", c: "var(--accent-2)", text: "var(--paper)", code: "0.55 0.130 200" },
              { n: "Mustard", c: "var(--accent-3)", text: "var(--ink)", code: "0.70 0.130 90" },
            ].map(s => (
              <div key={s.n} style={{ borderRight: "1.5px solid var(--ink)", borderBottom: "1.5px solid var(--ink)" }}>
                <div style={{ background: s.c, height: 140, display: "flex", alignItems: "end", padding: 14, color: s.text }}>
                  <span className="display" style={{ fontSize: 22 }}>{s.n}</span>
                </div>
                <div style={{ padding: "10px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.04em", background: "var(--paper)" }}>
                  oklch({s.code})
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* III. Typography */}
      <section style={{ padding: "100px 0", borderBottom: "1.5px solid var(--ink)" }}>
        <div className="wide">
          <SectionHead n="III." title="The voice" sub="Three fonts. Each with a job."/>
          <div style={{ border: "1.5px solid var(--ink)", padding: "48px 56px", marginBottom: 24, boxShadow: "6px 6px 0 var(--ink)" }}>
            <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 18 }}>Display — DM Serif Display — for headlines</div>
            <div className="display" style={{ fontSize: "clamp(80px, 11vw, 180px)", lineHeight: 0.88, letterSpacing: "-0.025em" }}>Guardrails for AI money.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderLeft: "1.5px solid var(--ink)", borderTop: "1.5px solid var(--ink)" }}>
            <div style={{ padding: "28px 32px", borderRight: "1.5px solid var(--ink)", borderBottom: "1.5px solid var(--ink)" }}>
              <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 14 }}>Body — Newsreader</div>
              <p style={{ fontFamily: "var(--serif)", fontSize: 18, lineHeight: 1.55, margin: 0 }}>
                The validator rejects in 28ms. The operator approves what's left. Cardano settles. There is nothing more to it than that.
              </p>
            </div>
            <div style={{ padding: "28px 32px", borderRight: "1.5px solid var(--ink)", borderBottom: "1.5px solid var(--ink)" }}>
              <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 14 }}>Annotation — Caveat</div>
              <p className="hand" style={{ fontSize: 36, lineHeight: 1.2, margin: 0, color: "var(--ink-2)" }}>
                ← used sparingly,<br/>like a margin note
              </p>
            </div>
            <div style={{ padding: "28px 32px", borderRight: "1.5px solid var(--ink)", borderBottom: "1.5px solid var(--ink)" }}>
              <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 14 }}>Mono — JetBrains</div>
              <p className="mono" style={{ fontSize: 14, lineHeight: 1.8, margin: 0 }}>rule.perTxCap({"{"} lovelace: 500_000_000n {"}"})</p>
            </div>
          </div>
        </div>
      </section>

      {/* IV. Components */}
      <section style={{ padding: "100px 0", background: "var(--paper-2)" }}>
        <div className="wide">
          <SectionHead n="IV." title="The kit" sub="Small. Opinionated. Everything is built from these."/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", padding: 36, boxShadow: "6px 6px 0 var(--ink)" }}>
              <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 20 }}>Buttons</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <button className="ink-btn accent">Primary action <Icon.arrow size={16} color="var(--paper)"/></button>
                <button className="ink-btn">Confirm</button>
                <button className="ink-btn ghost">Cancel</button>
              </div>
            </div>
            <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", padding: 36, boxShadow: "6px 6px 0 var(--ink)" }}>
              <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 20 }}>Stamps</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <span className="stamp ok"><Dot size={6} color="var(--ok)"/>SETTLED</span>
                <span className="stamp warn">APPROVAL</span>
                <span className="stamp danger">REJECTED</span>
                <span className="stamp accent">BENI</span>
                <span className="stamp-filled">v0.4.1</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BrandCard({ label, big, inverse, children }) {
  return (
    <div style={{
      borderRight: "1.5px solid var(--ink)", borderBottom: "1.5px solid var(--ink)",
      background: inverse ? "var(--ink)" : "var(--paper)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        padding: big ? "60px 32px" : "48px 28px",
        flex: 1,
        display: "grid", placeItems: "center",
        minHeight: 200,
        color: inverse ? "var(--paper)" : "var(--ink)",
      }}>
        {children}
      </div>
      <div style={{
        padding: "10px 16px",
        borderTop: "1.5px solid " + (inverse ? "var(--paper)" : "var(--ink)"),
        fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em",
        color: inverse ? "var(--paper-3)" : "var(--ink-3)",
      }}>{label}</div>
    </div>
  );
}

function SectionHead({ n, title, sub }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 32, marginBottom: 48, alignItems: "end" }}>
      <div className="display" style={{ fontSize: 120, color: "var(--accent)", lineHeight: 0.9, letterSpacing: "-0.02em" }}>{n}</div>
      <div>
        <h2 className="display" style={{ fontSize: 64, lineHeight: 0.95, margin: 0, letterSpacing: "-0.02em" }}>{title}</h2>
        <p style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink-2)", marginTop: 12, maxWidth: 560 }}>{sub}</p>
      </div>
    </div>
  );
}

Object.assign(window, { SecurityPage, DocsPage, BrandPage });
