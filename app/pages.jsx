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
          <h1 className="display" style={{ fontSize: "clamp(48px, 9vw, 120px)", lineHeight: 0.9, margin: 0, letterSpacing: "-0.025em" }}>
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
            <h2 className="display" style={{ fontSize: 52, lineHeight: 0.95, margin: "16px 0 24px", letterSpacing: "-0.02em" }}>
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
          <h2 className="display" style={{ fontSize: 52, lineHeight: 0.95, margin: "12px 0 0", letterSpacing: "-0.02em" }}>
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
            { v: "Q1 '26", l: "Audited by Tweag Labs" },
          ].map(s => (
            <div key={s.l} style={{ padding: "40px 32px", borderRight: "1.5px solid var(--ink)", borderBottom: "1.5px solid var(--ink)", textAlign: "center" }}>
              <div className="display" style={{ fontSize: 44, lineHeight: 1, letterSpacing: "-0.025em" }}>{s.v}</div>
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

// All navigable doc sections — keeps nav + sections in sync.
const DOC_NAV = [
  { group: "Getting started", items: [
    { k: "quickstart",  l: "Quickstart" },
    { k: "install",     l: "Installation" },
    { k: "rules",       l: "Defining rules" },
    { k: "approval",    l: "Approval flow" },
  ]},
  { group: "On-chain", items: [
    { k: "contracts",        l: "Aiken contracts" },
    { k: "validator_params", l: "Validator parameters" },
    { k: "thread_tokens",    l: "Thread tokens" },
    { k: "datum_schema",     l: "Datum schema" },
  ]},
  { group: "SDK reference", items: [
    { k: "beni_wrap",             l: "Beni.wrap()" },
    { k: "rule_per_tx_cap",       l: "rule.perTxCap()" },
    { k: "rule_daily_cap",        l: "rule.dailyCap()" },
    { k: "rule_whitelist",        l: "rule.whitelist()" },
    { k: "rule_require_approval", l: "rule.requireApproval()" },
  ]},
];

// "On this page" headings per section
const ON_THIS_PAGE = {
  quickstart:           ["Install the SDK", "Wrap your wallet", "Add rules", "Send a transaction", "Read the response"],
  install:              ["Package install", "Deploy the validator", "Environment variables"],
  rules:                ["Per-tx cap", "Daily cap", "Whitelist", "Require approval", "Composing rules"],
  approval:             ["How it works", "Queue a spend", "Approve from dashboard", "Reject"],
  contracts:            ["Aiken source", "Validator parameters", "Thread token", "Build & audit"],
  validator_params:     ["What are parameters?", "owner_pkh", "thread_token_policy", "Compilation"],
  thread_tokens:        ["Purpose", "Minting", "Authentication", "Burning"],
  datum_schema:         ["WalletDatum fields", "CBOR encoding", "TypeScript equivalent"],
  beni_wrap:            ["Signature", "Options", "Rules array", "Return value"],
  rule_per_tx_cap:      ["Options", "Behavior", "Whitelist bypass", "Example"],
  rule_daily_cap:       ["Options", "Window reset", "Example"],
  rule_whitelist:       ["Address list", "Credential hash", "Example"],
  rule_require_approval:["Threshold", "Queue behavior", "Example"],
};

function DocsPage() {
  const [active, setActive] = useStateS("quickstart");
  const [search, setSearch] = useStateS("");

  const sections = {
    quickstart:           { title: "Quickstart",            body: <QuickstartBody setActive={setActive}/> },
    install:              { title: "Installation",          body: <InstallBody/> },
    rules:                { title: "Defining rules",        body: <RulesBody/> },
    approval:             { title: "Approval flow",         body: <ApprovalBody setActive={setActive}/> },
    contracts:            { title: "Aiken contracts",       body: <ContractsBody/> },
    validator_params:     { title: "Validator parameters",  body: <ValidatorParamsBody/> },
    thread_tokens:        { title: "Thread tokens",         body: <ThreadTokensBody/> },
    datum_schema:         { title: "Datum schema",          body: <DatumSchemaBody/> },
    beni_wrap:            { title: "Beni.wrap()",           body: <BeniWrapBody/> },
    rule_per_tx_cap:      { title: "rule.perTxCap()",       body: <RulePerTxCapBody/> },
    rule_daily_cap:       { title: "rule.dailyCap()",       body: <RuleDailyCapBody/> },
    rule_whitelist:       { title: "rule.whitelist()",      body: <RuleWhitelistBody/> },
    rule_require_approval:{ title: "rule.requireApproval()",body: <RuleRequireApprovalBody/> },
  };

  // Flatten all items for search
  const allItems = DOC_NAV.flatMap(g => g.items);
  const q = search.toLowerCase().trim();
  const searchResults = q ? allItems.filter(it => it.l.toLowerCase().includes(q)) : null;

  const activeSection = sections[active] ?? sections.quickstart;
  const onThisPage    = ON_THIS_PAGE[active] ?? ON_THIS_PAGE.quickstart;

  return (
    <div className="fade-in" data-screen-label="04 Docs" style={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr) 240px", minWidth: 1200, minHeight: "calc(100vh - 70px)", borderTop: "1.5px solid var(--ink)" }}>
      {/* ── Left sidebar ── */}
      <aside style={{ borderRight: "1.5px solid var(--ink)", padding: 28, background: "var(--paper-2)" }}>
        <div className="display" style={{ fontSize: 32, letterSpacing: "-0.02em", marginBottom: 24 }}>The docs.</div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 28 }}>
          <input
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", height: 40, padding: "0 14px 0 38px", background: "var(--paper)", border: "1.5px solid var(--ink)", color: "var(--ink)", font: "15px var(--serif)", outline: 0, boxSizing: "border-box" }}
          />
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><Icon.search size={16}/></span>
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 16, lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* Search results OR normal groups */}
        {searchResults ? (
          <div>
            <div className="smallcaps" style={{ color: "var(--ink-3)", marginBottom: 10, padding: "0 6px" }}>
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {searchResults.length === 0 ? (
                <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink-4)", padding: "8px 12px" }}>Nothing matched "{search}"</div>
              ) : searchResults.map(it => (
                <DocLink key={it.k} active={active === it.k} onClick={() => { setActive(it.k); setSearch(""); }}>{it.l}</DocLink>
              ))}
            </div>
          </div>
        ) : (
          DOC_NAV.map(group => (
            <DocGroup key={group.group} title={group.group}>
              {group.items.map(it => (
                <DocLink key={it.k} active={active === it.k} onClick={() => setActive(it.k)}>{it.l}</DocLink>
              ))}
            </DocGroup>
          ))
        )}
      </aside>

      {/* ── Main content ── */}
      <main style={{ padding: "56px 72px", maxWidth: 860, overflowY: "auto" }}>
        <div className="smallcaps" style={{ color: "var(--ink-3)", marginBottom: 12 }}>DOCS / {activeSection.title.toUpperCase()}</div>
        <h1 className="display" style={{ fontSize: 52, lineHeight: 0.96, margin: "0 0 32px", letterSpacing: "-0.025em" }}>{activeSection.title}.</h1>
        {activeSection.body}
      </main>

      {/* ── Right sidebar ── */}
      <aside style={{ borderLeft: "1.5px solid var(--ink)", padding: 28, background: "var(--paper-2)" }}>
        <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 16 }}>On this page</div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {onThisPage.map((l, i) => (
            <li key={i} style={{ fontFamily: "var(--serif)", fontSize: 14, color: i === 0 ? "var(--ink)" : "var(--ink-2)", paddingLeft: 12, borderLeft: i === 0 ? "3px solid var(--accent)" : "1.5px solid var(--paper-3)" }}>{l}</li>
          ))}
        </ul>

        <div style={{ height: 1.5, background: "var(--ink)", margin: "28px 0" }}/>

        <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 16 }}>Reference</div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontFamily: "var(--serif)", fontSize: 14 }}>
          <li>
            <button onClick={() => window.open("https://github.com/beni-run/beni", "_blank")}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "var(--ink)", fontFamily: "var(--serif)", fontSize: 14, padding: 0 }}>
              <Icon.github size={14}/> Source on GitHub
            </button>
          </li>
          <li>
            <button onClick={() => window.open("https://play.aiken-lang.org", "_blank")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)", fontFamily: "var(--serif)", fontSize: 14, padding: 0 }}>
              Aiken playground
            </button>
          </li>
          <li>
            <button onClick={() => window.open("mailto:hello@beni.run?subject=Docs%20feedback", "_blank")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)", fontFamily: "var(--serif)", fontSize: 14, padding: 0 }}>
              Edit this page
            </button>
          </li>
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
      cursor: onClick ? "pointer" : "default",
      background: active ? "var(--ink)" : "transparent",
      color: active ? "var(--paper)" : "var(--ink)",
      fontFamily: "var(--serif)", fontSize: 15,
      opacity: onClick ? 1 : 0.45,
    }}>{children}</button>
  );
}

/* ── Shared prose helpers ─────────────────────────────────────────── */
function P({ children }) { return <p style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink-2)", lineHeight: 1.65, margin: "0 0 18px" }}>{children}</p>; }
function H2({ children }) { return <h2 className="display" style={{ fontSize: 36, margin: "40px 0 16px", letterSpacing: "-0.02em" }}>{children}</h2>; }

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

/* ── Section body components ──────────────────────────────────────── */

function QuickstartBody({ setActive }) {
  return (
    <>
      <P>Beni wraps any Cardano wallet provider with programmable spend rules. This guide installs the SDK and ships a guarded agent in under five minutes.</P>
      <Callout title="Prerequisites">Node 18+, a Cardano wallet provider (Lucid Evolution, Mesh, or raw CIP-30), and an agent that constructs transactions on your behalf.</Callout>
      <H2>1. Install the SDK</H2>
      <CodeSnippet lang="BASH">{`npm install @lucid-evolution/lucid
# Copy sdk/ into your project and import from sdk/src/index.ts`}</CodeSnippet>
      <H2>2. Wrap your wallet</H2>
      <CodeSnippet lang="TYPESCRIPT">{`import { makeLucid } from "./sdk/src/lucid-setup.js";
import walletState from "./beni-wallet-state.json" assert { type: "json" };

const lucid = await makeLucid({
  network: "Preview",
  blockfrostApiKey: process.env.BLOCKFROST_PREVIEW_KEY,
});
lucid.selectWallet.fromPrivateKey(process.env.AGENT_PRIVATE_KEY);`}</CodeSnippet>
      <H2>3. Send a guarded transaction</H2>
      <P>Use <code className="mono" style={{ color: "var(--accent)" }}>agentSpend()</code> exactly like a raw wallet send. If the transaction violates a rule, the Aiken validator rejects it on-chain and the SDK throws a typed error.</P>
      <CodeSnippet lang="TYPESCRIPT">{`import { agentSpend } from "./sdk/src/index.js";

try {
  const { txHash } = await agentSpend(lucid, wallet, recipientAddress, 50_000_000n);
  console.log("Settled:", txHash);
} catch (e) {
  // GuardrailViolationError — e.rule = "per_tx_cap" | "daily_cap" | "frozen" | "whitelist"
  console.error(e.rule, e.message);
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
      <CodeSnippet lang="BASH">{`npm install @lucid-evolution/lucid
pnpm add @lucid-evolution/lucid
bun add @lucid-evolution/lucid`}</CodeSnippet>
      <H2>Environment variables</H2>
      <CodeSnippet lang="BASH">{`# .env
BLOCKFROST_PREVIEW_KEY=preview...
AGENT_PRIVATE_KEY=ed25519_sk1...
OWNER_PKH=4b0f3ae1...          # owner public key hash
ANTHROPIC_API_KEY=sk-ant-...   # for AI assistant`}</CodeSnippet>
      <H2>Deploy the validator</H2>
      <P>One command compiles the Aiken contract and registers the thread token on Cardano:</P>
      <CodeSnippet lang="BASH">{`npx tsx sdk/scripts/deploy-wallet.ts
# Writes beni-wallet-state.json with scriptAddress + threadTokenPolicyId`}</CodeSnippet>
      <Callout title="After deploy">Set <code className="mono">BENI_SCRIPT_ADDRESS</code>, <code className="mono">BENI_THREAD_TOKEN_POLICY</code>, and <code className="mono">AGENT_ADDRESS</code> as Vercel env vars, then redeploy.</Callout>
    </>
  );
}

function RulesBody() {
  return (
    <>
      <P>Rules are pure functions over a transaction's UTxO set. They compose — every rule must pass for the transaction to settle. Rules are encoded in the on-chain datum at deploy time.</P>
      <H2>Per-transaction cap</H2>
      <CodeSnippet lang="TYPESCRIPT">{`rule.perTxCap({ lovelace: 500_000_000n })   // ₳500 hard ceiling per tx`}</CodeSnippet>
      <H2>Rolling 24h cap</H2>
      <CodeSnippet lang="TYPESCRIPT">{`rule.dailyCap({ lovelace: 2_500_000_000n }) // ₳2,500 per 24h window`}</CodeSnippet>
      <H2>Whitelist</H2>
      <CodeSnippet lang="TYPESCRIPT">{`rule.whitelist([
  "addr_test1...m7p2",  // trusted DEX — bypasses per-tx cap
  "addr_test1...x44k",  // treasury multisig
])`}</CodeSnippet>
      <H2>Require human approval</H2>
      <CodeSnippet lang="TYPESCRIPT">{`rule.requireApproval({ above: 250_000_000n }) // pause if > ₳250`}</CodeSnippet>
      <H2>Composing rules</H2>
      <P>Pass the full rules array to <code className="mono">createAgentWallet()</code>. All rules are evaluated on every Spend redeemer. Order does not matter — all must pass.</P>
    </>
  );
}

function ApprovalBody({ setActive }) {
  return (
    <>
      <P>When a rule emits <code className="mono" style={{ color: "var(--accent)" }}>requireApproval</code>, the SDK queues the spend locally instead of broadcasting. The owner reviews and co-signs on-chain.</P>
      <H2>How it works</H2>
      <P>The approval queue is stored server-side (JSON file for local dev, Vercel KV in production). The dashboard polls for pending items and surfaces them under Approvals.</P>
      <H2>Queue a spend (agent side)</H2>
      <CodeSnippet lang="TYPESCRIPT">{`import { queueSpend } from "./sdk/src/index.js";

const pending = await queueSpend(
  wallet,
  "addr_test1...",
  1_000_000_000n, // ₳1,000 — above per-tx cap
  "Pay invoice #42 — Acme Corp cloud bill",
);
// → { id: "uuid", status: "pending", lovelace: 1_000_000_000n }`}</CodeSnippet>
      <H2>Approve (owner side)</H2>
      <CodeSnippet lang="TYPESCRIPT">{`import { getPendingSpends, approveSpend, rejectSpend } from "./sdk/src/index.js";

const queue = await getPendingSpends(wallet);

// Approve — submits OwnerAction tx on-chain, bypasses all caps
const txHash = await approveSpend(lucid, wallet, queue[0].id);

// Or reject — no on-chain tx, marks item as rejected in queue
await rejectSpend(wallet, queue[0].id);`}</CodeSnippet>
      <Callout accent title="On-chain enforcement">The OwnerAction redeemer requires the owner PKH signature. Without it, the transaction is rejected — the approval queue cannot be faked.</Callout>
    </>
  );
}

function ContractsBody() {
  return (
    <>
      <P>All Beni validators are written in Aiken (v1.1.x, PlutusV3 / Conway era) and audited by Tweag Labs. Source and reproducible build artifacts are on GitHub.</P>
      <H2>Redeemers</H2>
      <CodeSnippet lang="AIKEN">{`pub type Redeemer {
  Spend        // agent-initiated spend — checks all caps + whitelist
  OwnerAction  // owner co-sign — bypasses caps, can update datum
  FreezeWallet // sets is_frozen = true in continuing datum
}`}</CodeSnippet>
      <H2>Build from source</H2>
      <CodeSnippet lang="BASH">{`cd contracts
aiken build       # outputs plutus.json with compiled validator CBOR
aiken check       # run property tests
aiken docs        # generate HTML docs`}</CodeSnippet>
      <Callout title="PlutusV3 only">Beni targets the Conway ledger era. lucid-cardano (legacy) cannot evaluate PlutusV3 cost models. Use <code className="mono">@lucid-evolution/lucid</code> v0.4.31+.</Callout>
    </>
  );
}

function ValidatorParamsBody() {
  return (
    <>
      <P>The Aiken validator is parameterized at deploy time. Parameters are baked into the compiled script — changing them produces a different script address and requires redeployment.</P>
      <H2>Parameters</H2>
      <CodeSnippet lang="AIKEN">{`validator beni_guard(
  owner_pkh:           ByteArray,  // ed25519 pub key hash of the owner
  thread_token_policy: PolicyId,   // one-shot minting policy ID
) {
  spend(datum: WalletDatum, redeemer: Redeemer, ctx: ScriptContext) -> Bool { ... }
  mint(redeemer: Void, policy_id: PolicyId, ctx: ScriptContext) -> Bool { ... }
}`}</CodeSnippet>
      <H2>owner_pkh</H2>
      <P>The 28-byte payment credential hash of the owner's signing key. Extracted with <code className="mono">lucid.utils.getAddressDetails(ownerAddress).paymentCredential.hash</code>. Stored in <code className="mono">.env</code> as <code className="mono">OWNER_PKH</code>.</P>
      <H2>thread_token_policy</H2>
      <P>The policy ID of the one-shot NFT minted at wallet creation. Used to identify the authoritative state UTxO. Generated automatically by <code className="mono">deploy-wallet.ts</code>.</P>
      <H2>Compilation</H2>
      <CodeSnippet lang="BASH">{`aiken build
# outputs: plutus.json → validator[0].compiledCode (CBOR hex)
# The SDK reads this CBOR and applies parameters via applyCborEncoding()`}</CodeSnippet>
      <Callout title="Important">Never share your <code className="mono">AGENT_PRIVATE_KEY</code>. The <code className="mono">owner_pkh</code> is public — it's a hash of the public key embedded in the script.</Callout>
    </>
  );
}

function ThreadTokensBody() {
  return (
    <>
      <P>A <strong>thread token</strong> is a one-shot NFT minted when the agent wallet is first deployed. It uniquely identifies and authenticates the authoritative state UTxO — making it impossible to forge a fake datum.</P>
      <H2>Purpose</H2>
      <P>Without a thread token, an attacker could create a UTxO at the script address with a forged datum (e.g., raising the per-tx cap). The validator checks for the thread token in every Spend — if absent, the transaction is rejected.</P>
      <H2>Minting</H2>
      <CodeSnippet lang="TYPESCRIPT">{`// The token is minted once, at deploy time.
// The seed UTxO is consumed — guaranteeing uniqueness.
const { threadTokenPolicyCbor, threadTokenPolicyId } =
  await createAgentWallet(lucid, config);

// Returns: beni-wallet-state.json with both values`}</CodeSnippet>
      <H2>Authentication (on-chain)</H2>
      <CodeSnippet lang="AIKEN">{`// Inside beni_guard.spend:
let thread_present =
  ctx.tx.inputs
    |> list.any(fn(i) {
        value.quantity_of(i.output.value, thread_token_policy, "") > 0
      })
expect thread_present`}</CodeSnippet>
      <H2>Burning</H2>
      <P>The thread token is burned when the owner calls <code className="mono">ownerAction()</code> to close the wallet and reclaim funds. Once burned, the script address becomes inert.</P>
    </>
  );
}

function DatumSchemaBody() {
  return (
    <>
      <P>The <strong>WalletDatum</strong> is the on-chain state of the agent wallet, stored inline on the script UTxO and updated with every OwnerAction transaction.</P>
      <H2>Aiken definition</H2>
      <CodeSnippet lang="AIKEN">{`pub type WalletDatum {
  per_tx_cap:          Int,              // lovelace — max per single spend
  daily_cap:           Int,              // lovelace — rolling 24h limit
  allowed_addresses:   List<ByteArray>,  // payment credential hashes
  owner_pkh:           ByteArray,        // ed25519 key hash of owner
  last_window_start:   Int,              // POSIX ms — window start
  window_spent:        Int,              // lovelace spent in window
  is_frozen:           Bool,             // emergency kill switch
  thread_token_policy: ByteArray,        // policy ID of the thread token
}`}</CodeSnippet>
      <H2>TypeScript equivalent</H2>
      <CodeSnippet lang="TYPESCRIPT">{`interface GuardrailConfig {
  perTxCapLovelace:        bigint;
  dailyCapLovelace:        bigint;
  allowedCredentialHashes: string[];  // 28-byte hex strings
  ownerPkh:                string;
  lastWindowStart:         bigint;    // ms since epoch
  windowSpent:             bigint;    // lovelace
  isFrozen:                boolean;
  threadTokenPolicyId:     string;
}`}</CodeSnippet>
      <H2>CBOR encoding</H2>
      <P>Fields are encoded in exactly this order as a Plutus Data Constr(0) using indefinite-length CBOR. The SDK's <code className="mono">encodeDatum()</code> handles this automatically — do not reorder fields.</P>
      <Callout title="Tip">Use <code className="mono">GET /api/agent-state</code> to inspect the live decoded datum in JSON form. The <code className="mono">rawDatum</code> field returns the raw CBOR hex for verification.</Callout>
    </>
  );
}

function BeniWrapBody() {
  return (
    <>
      <P><code className="mono" style={{ color: "var(--accent)" }}>createAgentWallet(lucid, config)</code> deploys a new guarded wallet on-chain. <code className="mono" style={{ color: "var(--accent)" }}>agentSpend()</code> is the primary spend entry point — it validates, builds, and submits in one call.</P>
      <H2>createAgentWallet signature</H2>
      <CodeSnippet lang="TYPESCRIPT">{`async function createAgentWallet(
  lucid:       LucidEvolution,
  config:      CreateWalletConfig,
  initialAda?: bigint,            // default 5n (ADA to seed the script)
): Promise<BeniWallet>`}</CodeSnippet>
      <H2>CreateWalletConfig</H2>
      <CodeSnippet lang="TYPESCRIPT">{`interface CreateWalletConfig {
  ownerPkh:                string;   // 28-byte hex
  perTxCapLovelace:        bigint;
  dailyCapLovelace:        bigint;
  allowedCredentialHashes: string[];
  isFrozen?:               boolean;  // default false
}`}</CodeSnippet>
      <H2>agentSpend signature</H2>
      <CodeSnippet lang="TYPESCRIPT">{`async function agentSpend(
  lucid:     LucidEvolution,
  wallet:    BeniWallet,
  toAddress: string,
  lovelace:  bigint,
): Promise<SpendResult>

interface SpendResult {
  txHash:    string;
  newConfig: GuardrailConfig; // updated windowSpent etc.
}`}</CodeSnippet>
      <H2>Full example</H2>
      <CodeSnippet lang="TYPESCRIPT">{`import { makeLucid } from "./sdk/src/lucid-setup.js";
import { agentSpend } from "./sdk/src/index.js";
import walletState from "./beni-wallet-state.json" assert { type: "json" };

const lucid = await makeLucid({ network: "Preview", blockfrostApiKey: process.env.BLOCKFROST_PREVIEW_KEY });
lucid.selectWallet.fromPrivateKey(process.env.AGENT_PRIVATE_KEY);

const wallet = { ...walletState, config: { ...walletState, perTxCapLovelace: BigInt(walletState.perTxCapLovelace), dailyCapLovelace: BigInt(walletState.dailyCapLovelace) } };
const { txHash } = await agentSpend(lucid, wallet, "addr_test1...", 10_000_000n);`}</CodeSnippet>
    </>
  );
}

function RulePerTxCapBody() {
  return (
    <>
      <P><code className="mono" style={{ color: "var(--accent)" }}>per_tx_cap</code> is a hard ceiling on any single agent-initiated transaction. It is stored in the on-chain datum and enforced by the Aiken validator — it cannot be bypassed off-chain.</P>
      <H2>Datum field</H2>
      <CodeSnippet lang="AIKEN">{`// In WalletDatum
per_tx_cap: Int   // lovelace — max per single Spend transaction`}</CodeSnippet>
      <H2>Behavior</H2>
      <P>Before broadcasting, <code className="mono">agentSpend()</code> calls <code className="mono">validateSpend()</code> to pre-check the cap. If violated, it throws <code className="mono">GuardrailViolationError</code> with <code className="mono">rule: "per_tx_cap"</code> before hitting the chain. The on-chain validator performs the same check independently.</P>
      <H2>Example</H2>
      <CodeSnippet lang="TYPESCRIPT">{`// At deploy time — set the cap in the config:
perTxCapLovelace: 500_000_000n  // ₳500 hard ceiling per transaction`}</CodeSnippet>
      <H2>Whitelist bypass</H2>
      <P>If the recipient's payment credential hash is in <code className="mono">allowed_addresses</code>, the per-tx cap check is skipped entirely. Useful for trusted counterparties like DEX contracts.</P>
    </>
  );
}

function RuleDailyCapBody() {
  return (
    <>
      <P><code className="mono" style={{ color: "var(--accent)" }}>daily_cap</code> enforces a rolling 24-hour spending budget. The window state is stored in the on-chain datum — no off-chain timer is required.</P>
      <H2>Datum fields</H2>
      <CodeSnippet lang="AIKEN">{`daily_cap:         Int  // lovelace — max per 24h window
last_window_start: Int  // POSIX ms — start of current window
window_spent:      Int  // lovelace spent so far in window`}</CodeSnippet>
      <H2>Window reset</H2>
      <P>When <code className="mono">now &gt; last_window_start + 86_400_000</code>, the validator treats the window as expired and allows spending up to the full cap again. The new <code className="mono">last_window_start</code> is written into the continuing output datum.</P>
      <H2>Example</H2>
      <CodeSnippet lang="TYPESCRIPT">{`// At deploy time:
dailyCapLovelace: 2_500_000_000n  // ₳2,500 per rolling 24h window

// Query remaining budget:
import { getDailyUsage } from "./sdk/src/analytics.js";
const { windowSpentAda, dailyCapAda, pctUsed } = await getDailyUsage(lucid, wallet);`}</CodeSnippet>
    </>
  );
}

function RuleWhitelistBody() {
  return (
    <>
      <P><code className="mono" style={{ color: "var(--accent)" }}>allowed_addresses</code> registers trusted recipient addresses that bypass the per-tx cap check entirely. The daily cap still applies unless you freeze or raise it.</P>
      <H2>How it works</H2>
      <P>The validator extracts the payment credential hash from the recipient address in the transaction output. If that hash appears in <code className="mono">allowed_addresses</code>, the per-tx cap check is skipped for that transaction.</P>
      <H2>Add an address</H2>
      <CodeSnippet lang="TYPESCRIPT">{`import { ownerAction } from "./sdk/src/index.js";
import { getAddressDetails } from "@lucid-evolution/lucid";

const { paymentCredential } = getAddressDetails("addr_test1...");
const hash = paymentCredential.hash; // 28-byte hex

await ownerAction(lucid, wallet, {
  ...wallet.config,
  allowedCredentialHashes: [...wallet.config.allowedCredentialHashes, hash],
});`}</CodeSnippet>
      <H2>Remove an address</H2>
      <CodeSnippet lang="TYPESCRIPT">{`const hashToRemove = "4b0f3ae1...";
await ownerAction(lucid, wallet, {
  ...wallet.config,
  allowedCredentialHashes: wallet.config.allowedCredentialHashes
    .filter(h => h !== hashToRemove),
});`}</CodeSnippet>
      <Callout title="Credential hashes, not full addresses">Addresses change form across networks (mainnet vs testnet). Storing the 28-byte payment credential hash is network-agnostic and is how Cardano's ledger identifies addresses internally.</Callout>
    </>
  );
}

function RuleRequireApprovalBody() {
  return (
    <>
      <P><code className="mono" style={{ color: "var(--accent)" }}>queueSpend()</code> is the SDK function that implements the require-approval pattern — it stores the pending spend in a queue rather than broadcasting it immediately.</P>
      <H2>Queue a spend</H2>
      <CodeSnippet lang="TYPESCRIPT">{`import { queueSpend } from "./sdk/src/index.js";

const pending = await queueSpend(
  wallet,
  "addr_test1...",      // recipient
  1_000_000_000n,       // ₳1,000 — above per-tx cap
  "Invoice #42 — Acme Corp cloud services",
);
// → { id: "uuid-v4", status: "pending", createdAt: 1716000000000 }`}</CodeSnippet>
      <H2>Approve on-chain</H2>
      <P>The owner co-signs using <code className="mono">approveSpend()</code>, which submits an <strong>OwnerAction</strong> redeemer. This satisfies the on-chain validator's owner-signature check and bypasses all caps.</P>
      <CodeSnippet lang="TYPESCRIPT">{`import { getPendingSpends, approveSpend } from "./sdk/src/index.js";

const queue = await getPendingSpends(wallet);    // filter status === "pending"
const txHash = await approveSpend(lucid, wallet, queue[0].id);
// → "a1b2c3..." (transaction hash)`}</CodeSnippet>
      <H2>Reject</H2>
      <CodeSnippet lang="TYPESCRIPT">{`import { rejectSpend } from "./sdk/src/index.js";

// No on-chain transaction — just marks the queue entry as rejected.
await rejectSpend(wallet, queue[0].id);`}</CodeSnippet>
      <Callout accent title="Phase 4 — Persistent queue">The current queue uses a local JSON file. Phase 4 will migrate to Vercel KV for multi-session persistence and webhook push notifications.</Callout>
    </>
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
          <h1 className="display" style={{ fontSize: "clamp(48px, 9vw, 120px)", lineHeight: 0.88, margin: 0, letterSpacing: "-0.03em" }}>
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
                <Wordmark size={24}/>
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
            <div className="display" style={{ fontSize: "clamp(48px, 8vw, 110px)", lineHeight: 0.9, letterSpacing: "-0.025em" }}>Guardrails for AI money.</div>
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
      <div className="display" style={{ fontSize: 72, color: "var(--accent)", lineHeight: 0.9, letterSpacing: "-0.02em" }}>{n}</div>
      <div>
        <h2 className="display" style={{ fontSize: 44, lineHeight: 0.96, margin: 0, letterSpacing: "-0.02em" }}>{title}</h2>
        <p style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink-2)", marginTop: 12, maxWidth: 560 }}>{sub}</p>
      </div>
    </div>
  );
}

Object.assign(window, { SecurityPage, DocsPage, BrandPage });
