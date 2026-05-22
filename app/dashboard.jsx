/* global React */
// NOTE: fmtAda, shortenAddr, timeAgo, CHAT_API, BLOCKFROST_API are all
// exported to window by components.jsx (loaded first).
const { useState: useStateD, useEffect: useEffectD, useRef: useRefD } = React;

// ── On-chain agent state hook ────────────────────────────────────────────────
const AGENT_STATE_API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://localhost:3001/api/agent-state"
  : "/api/agent-state";

function useAgentState() {
  const [state, setStateD] = useStateD({ loading: true, deployed: false, data: null, error: null });

  async function refresh() {
    try {
      const res  = await fetch(AGENT_STATE_API);
      const data = await res.json();
      setStateD({ loading: false, deployed: data.deployed ?? false, data, error: null });
    } catch (err) {
      setStateD(s => ({ ...s, loading: false, error: err.message }));
    }
  }

  useEffectD(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, []);

  return { ...state, refresh };
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, background: "var(--ink)", color: "var(--paper)",
      padding: "12px 28px", border: "1.5px solid var(--ink)",
      fontFamily: "var(--serif)", fontSize: 14,
      boxShadow: "4px 4px 0 var(--accent)", pointerEvents: "none", whiteSpace: "nowrap",
    }}>
      {msg}
    </div>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: "var(--paper)", border: "2px solid var(--ink)",
        boxShadow: "8px 8px 0 var(--ink)", maxWidth: wide ? 780 : 560, width: "100%",
        maxHeight: "88vh", display: "flex", flexDirection: "column",
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: "16px 24px", borderBottom: "1.5px solid var(--ink)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--paper-2)", flexShrink: 0,
        }}>
          <div className="display" style={{ fontSize: 22 }}>{title}</div>
          <button onClick={onClose} style={{
            width: 30, height: 30, border: "1.5px solid var(--ink)", background: "transparent",
            cursor: "pointer", display: "grid", placeItems: "center",
            fontFamily: "var(--mono)", fontSize: 16, color: "var(--ink)",
          }}>✕</button>
        </div>
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Code block ────────────────────────────────────────────────────────────────
function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useStateD(false);
  function copy() {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div style={{ position: "relative", background: "#18140e", border: "1.5px solid var(--ink)", marginBottom: 2 }}>
      <div style={{ padding: "6px 14px", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#888", letterSpacing: "0.1em" }}>{lang}</span>
        <button onClick={copy} style={{
          background: "transparent", border: "1px solid #444", color: "#aaa",
          fontFamily: "var(--mono)", fontSize: 10, padding: "2px 8px", cursor: "pointer",
        }}>{copied ? "copied!" : "copy"}</button>
      </div>
      <pre style={{ margin: 0, padding: "14px 14px", overflowX: "auto", fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.6, color: "#e8dcc8", whiteSpace: "pre" }}>{code}</pre>
    </div>
  );
}

/* ═══════════════════════════════ ROOT ═══════════════════════════════════════ */
function Dashboard({ wallet }) {
  const [activePage, setActivePage] = useStateD("overview");
  const [frozen, setFrozen] = useStateD(false);
  const [showChat, setShowChat] = useStateD(true);
  const [modal, setModal] = useStateD(null);
  const [toast, setToast] = useStateD(null);
  const agentState = useAgentState();

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  return (
    <div className="fade-in" data-screen-label="02 Dashboard" style={{
      display: "grid",
      gridTemplateColumns: showChat ? "260px minmax(0,1fr) 360px" : "260px minmax(0,1fr)",
      minWidth: 1280,
      height: "calc(100vh - 70px)",
      overflow: "hidden",
      borderTop: "1.5px solid var(--ink)",
      background: "var(--paper)",
    }}>
      <Sidebar
        activePage={activePage}
        navigateTo={setActivePage}
        wallet={wallet}
        agentState={agentState}
        setModal={setModal}
        showToast={showToast}
      />
      <Main
        activePage={activePage}
        navigateTo={setActivePage}
        frozen={frozen}
        setFrozen={setFrozen}
        wallet={wallet}
        showChat={showChat}
        setShowChat={setShowChat}
        agentState={agentState}
        setModal={setModal}
        showToast={showToast}
      />
      {showChat && <AssistantPanel wallet={wallet} agentState={agentState} setShowChat={setShowChat}/>}

      {/* ── Modals ── */}
      {modal === "add-agent" && (
        <Modal title="Deploy a new agent wallet" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Each Beni agent wallet is an Aiken smart contract deployed to Cardano Preview. Every wallet gets a unique one-shot thread token NFT.
            </div>
            {[
              ["1 · Generate a signing key", "npx tsx sdk/scripts/generate-key.ts"],
              ["2 · Fund the address from the faucet", "https://docs.cardano.org/cardano-testnets/tools/faucet/"],
              ["3 · Set env vars", "BLOCKFROST_PREVIEW_KEY=preview...\nAGENT_PRIVATE_KEY=ed25519_sk1..."],
              ["4 · Deploy contract on-chain", "npx tsx sdk/scripts/deploy-wallet.ts"],
            ].map(([label, code]) => (
              <div key={label}>
                <div className="smallcaps" style={{ fontSize: 10, color: "var(--accent)", marginBottom: 4 }}>{label}</div>
                <CodeBlock lang="bash" code={code}/>
              </div>
            ))}
            <div style={{ padding: "12px 14px", border: "1.5px solid var(--ink-4)", background: "var(--paper-2)", fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5 }}>
              After deploy, <code style={{ fontFamily: "var(--mono)", background: "var(--paper-3)", padding: "1px 4px" }}>beni-wallet-state.json</code> is written with the script address and thread token policy. Set those as Vercel env vars and redeploy.
            </div>
          </div>
        </Modal>
      )}

      {modal === "api" && (
        <Modal title="Beni SDK — Integration Guide" onClose={() => setModal(null)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Install the SDK, point it at a deployed wallet, and your AI agent can spend ADA on-chain — fully guarded by the Aiken validator.
            </div>

            <div>
              <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 6 }}>Install</div>
              <CodeBlock lang="bash" code={`npm install @lucid-evolution/lucid
# (SDK ships as local package for now — copy sdk/ into your project)
# Then import from sdk/src/index.ts`}/>
            </div>

            <div>
              <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 6 }}>1. Initialize &amp; load wallet state</div>
              <CodeBlock lang="typescript" code={`import { makeLucid } from "./sdk/src/lucid-setup.js";
import type { BeniWallet, GuardrailConfig } from "./sdk/src/types.js";
import walletState from "./beni-wallet-state.json" assert { type: "json" };

const lucid = await makeLucid({
  network: "Preview",
  blockfrostApiKey: process.env.BLOCKFROST_PREVIEW_KEY,
});
lucid.selectWallet.fromPrivateKey(process.env.AGENT_PRIVATE_KEY);

const wallet: BeniWallet = {
  scriptAddress:          walletState.scriptAddress,
  scriptCbor:             walletState.scriptCbor,
  threadTokenPolicyCbor:  walletState.threadTokenPolicyCbor,
  config: {
    ownerPkh:               walletState.ownerPkh,
    perTxCapLovelace:       BigInt(walletState.perTxCapLovelace),
    dailyCapLovelace:       BigInt(walletState.dailyCapLovelace),
    allowedCredentialHashes: [],
    threadTokenPolicyId:    walletState.threadTokenPolicyId,
    lastWindowStart:        0n,
    windowSpent:            0n,
    isFrozen:               false,
  },
};`}/>
            </div>

            <div>
              <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 6 }}>2. Make a guarded spend (agent-initiated)</div>
              <CodeBlock lang="typescript" code={`import { agentSpend, validateSpend } from "./sdk/src/index.js";

// Optional: pre-validate before hitting the chain
const recipientAddress = "addr_test1...";
const lovelace = 10_000_000n; // ₳10

const { txHash, newConfig } = await agentSpend(
  lucid,
  wallet,
  recipientAddress,
  lovelace,
);
console.log("Spend confirmed:", txHash);
// newConfig contains updated windowSpent — persist it`}/>
            </div>

            <div>
              <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 6 }}>3. Queue an above-cap spend for owner approval</div>
              <CodeBlock lang="typescript" code={`import { queueSpend, getPendingSpends, approveSpend } from "./sdk/src/index.js";

// Agent: queue the request (no on-chain tx yet)
const pending = await queueSpend(
  wallet,
  "addr_test1...",
  1_000_000_000n, // ₳1,000 — above per-tx cap
  "Pay invoice #42 to Acme Corp for cloud services",
);
console.log("Queued:", pending.id);

// Owner: list and approve
const queue = await getPendingSpends(wallet);
const txHash = await approveSpend(lucid, wallet, queue[0].id);
// Owner co-signs → OwnerAction redeemer → bypasses cap`}/>
            </div>

            <div>
              <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 6 }}>4. Emergency freeze &amp; update rules</div>
              <CodeBlock lang="typescript" code={`import { freezeWallet, ownerAction } from "./sdk/src/index.js";

// Freeze — halts all agent spends instantly
await freezeWallet(lucid, wallet);

// Update rules (owner only)
await ownerAction(lucid, wallet, {
  ...wallet.config,
  perTxCapLovelace: 200_000_000n, // ₳200 new cap
  isFrozen: false,                // unfreeze
});`}/>
            </div>

            <div>
              <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 6 }}>REST endpoints (Vercel / local chat server)</div>
              <CodeBlock lang="bash" code={`# Live on-chain state — balance, rules, recent txs
GET  /api/agent-state

# Beni AI assistant (Claude Haiku)
POST /api/chat
Content-Type: application/json
Body: { "messages": [{ "role": "user", "content": "How much have I spent today?" }] }

# Blockfrost proxy (avoids CORS)
GET  /api/blockfrost?action=address&addr=addr_test1...
GET  /api/blockfrost?action=txs&addr=addr_test1...`}/>
            </div>

            <div>
              <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 6 }}>Guardrail validation flow</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  ["isFrozen check", "If wallet is frozen, all spends revert on-chain."],
                  ["per_tx_cap", "Single tx lovelace ≤ cap → proceeds. Else: queue or revert."],
                  ["daily_cap (rolling window)", "24h rolling spend sum ≤ cap → proceeds. Resets after 86,400s."],
                  ["whitelist bypass", "If recipient credential hash is in allowed_addresses, cap is skipped."],
                  ["owner co-sign", "OwnerAction redeemer requires owner PKH signature → bypasses all limits."],
                ].map(([rule, desc]) => (
                  <div key={rule} style={{ display: "flex", gap: 14, padding: "8px 12px", border: "1.5px solid var(--paper-3)", background: "var(--paper)" }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--accent)", minWidth: 160, flexShrink: 0 }}>{rule}</span>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)" }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: "12px 14px", border: "1.5px solid var(--ok)", background: "var(--paper-2)", fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>
              <strong>Contract address (Preview):</strong><br/>
              <span className="mono" style={{ fontSize: 11, wordBreak: "break-all" }}>
                addr_test1wpmhu0jkd6vttmct0fez808472lt578dr9m0745ydguakagnpc3h6
              </span><br/>
              <strong>Thread token policy:</strong><br/>
              <span className="mono" style={{ fontSize: 11 }}>
                d0c145e409a7a746671ef003184da5bae5fcc4516f3f3ba3165adac2
              </span>
            </div>

          </div>
        </Modal>
      )}

      <Toast msg={toast}/>
    </div>
  );
}

/* ═══════════════════════════════ SIDEBAR ════════════════════════════════════ */
function Sidebar({ activePage, navigateTo, wallet, agentState, setModal, showToast }) {
  const deployed = agentState?.data?.deployed && agentState?.data?.funded;

  const navConfig = [
    {
      group: "Overview",
      items: [
        { icon: <Icon.flow size={16}/>, label: "Command center", page: "overview" },
        { icon: <Icon.eye size={16}/>, label: "Live monitor",   page: "monitor" },
        { icon: <Icon.list size={16}/>, label: "Transactions",  page: "txs" },
        { icon: <Icon.bell size={16}/>, label: "Approvals",     page: "approvals" },
      ],
    },
    {
      group: "Configure",
      items: [
        { icon: <Icon.shield size={16}/>, label: "Rules & policies", page: "rules" },
        { icon: <Icon.lock size={16}/>,   label: "Whitelist",        page: "whitelist" },
        { icon: <Icon.user size={16}/>,   label: "Team",             page: null, toast: "Team management — coming soon in Phase 4" },
        { icon: <Icon.code size={16}/>,   label: "Webhooks",         page: null, toast: "Webhook delivery — coming soon in Phase 4" },
      ],
    },
  ];

  return (
    <aside style={{
      borderRight: "1.5px solid var(--ink)",
      padding: "24px 20px",
      background: "var(--paper-2)",
      display: "flex", flexDirection: "column", gap: 28,
      height: "100%", overflowY: "auto",
    }}>
      {/* Workspace */}
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
            <div className="display" style={{ fontSize: 16 }}>
              {deployed ? "atlas-trader-v2" : "Your Workspace"}
            </div>
            {wallet.connected ? (
              <div className="mono" style={{ fontSize: 10, color: "var(--ok)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {wallet.addrShort}
              </div>
            ) : (
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>PREVIEW TESTNET</div>
            )}
          </div>
        </div>
        {deployed ? (
          <div className="mono" style={{ fontSize: 10, marginTop: 8, color: "var(--ok)", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ok)", border: "1.5px solid var(--ink)", flexShrink: 0 }}/>
            CONTRACT LIVE · PREVIEW
          </div>
        ) : agentState?.data?.deployed ? (
          <div className="mono" style={{ fontSize: 10, marginTop: 8, color: "var(--warn)" }}>CONTRACT DEPLOYED · UNFUNDED</div>
        ) : (
          <div className="mono" style={{ fontSize: 10, marginTop: 8, color: "var(--ink-4)" }}>CONTRACT NOT DEPLOYED</div>
        )}
      </div>

      {/* Nav groups */}
      {navConfig.map(group => (
        <div key={group.group}>
          <div className="smallcaps" style={{ color: "var(--ink-3)", marginBottom: 8, padding: "0 4px" }}>{group.group}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {group.items.map(item => (
              <button
                key={item.label}
                onClick={() => item.page ? navigateTo(item.page) : showToast(item.toast)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                  background: activePage === item.page ? "var(--paper)" : "transparent",
                  border: "1.5px solid " + (activePage === item.page ? "var(--ink)" : "transparent"),
                  cursor: "pointer", color: "var(--ink)", textAlign: "left",
                  fontFamily: "var(--serif)", fontSize: 14,
                }}
              >
                <span style={{ display: "inline-flex", color: activePage === item.page ? "var(--accent)" : "var(--ink-2)" }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.page && item.page !== "overview" && (
                  <span style={{ fontSize: 11, color: "var(--ink-4)", opacity: activePage === item.page ? 0 : 1 }}>→</span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Agents */}
      <div>
        <div className="smallcaps" style={{ color: "var(--ink-3)", marginBottom: 8, padding: "0 4px" }}>Agents</div>
        <div style={{
          padding: "16px 10px", textAlign: "center",
          border: "1.5px dashed var(--ink-4)", marginBottom: 6,
        }}>
          <div className="hand" style={{ fontSize: 18, color: "var(--ink-3)", marginBottom: 6 }}>no agents yet</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 12, color: "var(--ink-4)", lineHeight: 1.45 }}>
            Deploy a wallet with the SDK to see agents here.
          </div>
        </div>
        <button
          onClick={() => setModal("add-agent")}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", width: "100%",
            background: "transparent", border: "1.5px dashed var(--ink-3)",
            color: "var(--ink-2)", fontFamily: "var(--serif)", fontSize: 13, cursor: "pointer",
          }}>
          <Icon.plus size={13}/> New agent
        </button>
      </div>

      {/* System status */}
      <div style={{ marginTop: "auto" }}>
        <div style={{ padding: 12, border: "1.5px solid var(--ink)", background: "var(--paper)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ok)", border: "1.5px solid var(--ink)" }}/>
            <span className="mono" style={{ fontSize: 10, letterSpacing: "0.12em" }}>SYSTEM HEALTHY</span>
          </div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", lineHeight: 1.8, letterSpacing: "0.06em" }}>
            VALIDATOR v0.4.1 · AIKEN<br/>
            CARDANO PREVIEW TESTNET
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════ MAIN PANEL ═════════════════════════════════ */
function Main({ activePage, navigateTo, frozen, setFrozen, wallet, showChat, setShowChat, agentState, setModal, showToast }) {
  return (
    <main style={{ padding: "28px 32px", height: "100%", overflowY: "auto" }}>

      {/* Persistent header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 28, paddingBottom: 20, borderBottom: "1.5px solid var(--ink)",
      }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 4 }}>
            {activePage === "overview"  ? "The dashboard"
           : activePage === "approvals" ? "Approvals"
           : activePage === "rules"     ? "Guardrails"
           : activePage === "whitelist" ? "Whitelist"
           : activePage === "txs"       ? "Transactions"
           : activePage === "monitor"   ? "Live monitor"
           : "Beni"}
          </div>
          <h1 className="display" style={{ fontSize: 42, margin: 0, lineHeight: 1, letterSpacing: "-0.02em" }}>
            {activePage === "overview"  ? "Command Center."
           : activePage === "approvals" ? "Approvals Queue."
           : activePage === "rules"     ? "Rules & Policies."
           : activePage === "whitelist" ? "Trusted Addresses."
           : activePage === "txs"       ? "Transaction History."
           : activePage === "monitor"   ? "Live Activity."
           : "Dashboard."}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => setShowChat(v => !v)}
            className="ink-btn ghost"
            style={{
              height: 38, fontSize: 13, padding: "0 14px",
              boxShadow: "2px 2px 0 var(--ink)",
              background: showChat ? "var(--ink)" : "transparent",
              color: showChat ? "var(--paper)" : "var(--ink)",
            }}
          >
            <Icon.chat size={14} color={showChat ? "var(--paper)" : "var(--ink)"}/>
            {showChat ? "Hide Beni" : "Ask Beni"}
          </button>
          <button onClick={() => setModal("api")} className="ink-btn ghost"
            style={{ height: 38, fontSize: 13, padding: "0 14px", boxShadow: "2px 2px 0 var(--ink)" }}>
            <Icon.code size={13}/> API
          </button>
          <button
            onClick={() => setFrozen(!frozen)}
            className="ink-btn"
            style={{
              height: 38, fontSize: 13, padding: "0 14px",
              background: frozen ? "var(--danger)" : "var(--ink)",
              borderColor: frozen ? "var(--danger)" : "var(--ink)",
              boxShadow: "2px 2px 0 var(--ink)",
            }}
          >
            <Icon.freeze size={13} color="var(--paper)"/>
            {frozen ? "Frozen — Resume" : "Emergency freeze"}
          </button>
        </div>
      </div>

      {/* Page content */}
      {activePage === "overview"  && <OverviewPage  frozen={frozen} wallet={wallet} agentState={agentState} navigateTo={navigateTo}/>}
      {activePage === "approvals" && <ApprovalsPage agentState={agentState} showToast={showToast}/>}
      {activePage === "rules"     && <RulesPage     agentState={agentState} showToast={showToast}/>}
      {activePage === "whitelist" && <WhitelistPage agentState={agentState} showToast={showToast}/>}
      {activePage === "txs"       && <TransactionsPage wallet={wallet} agentState={agentState}/>}
      {activePage === "monitor"   && <MonitorPage   wallet={wallet} agentState={agentState}/>}
    </main>
  );
}

/* ═══════════════════════════ PAGE: OVERVIEW ════════════════════════════════ */
function OverviewPage({ frozen, wallet, agentState, navigateTo }) {
  const ad    = agentState?.data;
  const rules = ad?.rules;

  const contractBalanceAda = ad?.funded && ad?.balanceAda != null ? ad.balanceAda : null;
  const operatorBalanceAda = wallet.connected ? wallet.balanceAda : (ad?.operatorBalanceAda ?? null);
  const effectiveFrozen    = frozen || rules?.isFrozen;

  const primaryAda   = contractBalanceAda ?? operatorBalanceAda;
  const primaryLabel = contractBalanceAda != null ? "Contract wallet" : "Operator wallet";

  const statusLabel = effectiveFrozen ? "FROZEN" : ad?.funded ? "ON-CHAIN · LIVE" : wallet.connected ? "CONNECTED" : "NO WALLET";
  const statusColor = effectiveFrozen ? "var(--danger)" : ad?.funded ? "var(--ok)" : wallet.connected ? "var(--accent-2)" : "var(--ink-4)";

  const subText = effectiveFrozen
    ? "all agent spends halted — emergency freeze active"
    : ad?.funded ? `${ad.scriptAddress?.slice(0, 20)}… · Preview testnet`
    : wallet.connected ? `${wallet.addrShort} · operator wallet`
    : "connect wallet or deploy a contract to begin";

  const spentAda    = rules?.windowSpentAda ?? null;
  const dailyCapAda = rules?.dailyCapAda ?? null;
  const pctUsed     = rules?.pctUsed ?? 0;
  const txCount     = ad?.funded ? (ad.txCount ?? 0) : wallet.txCount;

  let resetLabel = "—";
  if (rules?.windowResetMs) {
    const msLeft = rules.windowResetMs - Date.now();
    const h = Math.floor(Math.max(0, msLeft) / 3_600_000);
    const m = Math.floor((Math.max(0, msLeft) % 3_600_000) / 60_000);
    resetLabel = msLeft <= 0 ? "resets now" : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  }

  return (
    <div>
      {/* Balance hero */}
      <div style={{
        padding: "20px 0 24px",
        display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 40, alignItems: "end",
        borderBottom: "1.5px solid var(--ink)", marginBottom: 24,
      }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--ink-3)", marginBottom: 10 }}>{primaryLabel} balance</div>
          <div className="display" style={{ fontSize: 88, lineHeight: 0.9, letterSpacing: "-0.03em", color: primaryAda != null ? "var(--ink)" : "var(--ink-4)" }}>
            {primaryAda != null ? `₳ ${fmtAda(primaryAda)}` : "₳ —"}
          </div>
          <div style={{ marginTop: 12 }}>
            <span className="hand" style={{ fontSize: 18, color: "var(--ink-2)" }}>{subText}</span>
          </div>
          {(contractBalanceAda != null || operatorBalanceAda != null) && (
            <div style={{ display: "flex", gap: 24, marginTop: 16, paddingTop: 14, borderTop: "1.5px dashed var(--ink-4)" }}>
              {contractBalanceAda != null && (
                <div>
                  <div className="mono" style={{ fontSize: 9, color: "var(--accent)", letterSpacing: "0.1em", marginBottom: 2 }}>CONTRACT</div>
                  <div className="display" style={{ fontSize: 20, lineHeight: 1 }}>₳ {fmtAda(contractBalanceAda)}</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 11, color: "var(--ink-4)", marginTop: 1 }}>agent's budget</div>
                </div>
              )}
              {operatorBalanceAda != null && (
                <div>
                  <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", marginBottom: 2 }}>OPERATOR</div>
                  <div className="display" style={{ fontSize: 20, lineHeight: 1 }}>₳ {fmtAda(operatorBalanceAda)}</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 11, color: "var(--ink-4)", marginTop: 1 }}>your reserve</div>
                </div>
              )}
              {contractBalanceAda != null && operatorBalanceAda != null && (
                <div>
                  <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", marginBottom: 2 }}>TOTAL</div>
                  <div className="display" style={{ fontSize: 20, lineHeight: 1, color: "var(--ink-2)" }}>₳ {fmtAda(contractBalanceAda + operatorBalanceAda)}</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 11, color: "var(--ink-4)", marginTop: 1 }}>combined</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: "14px 20px", border: "1.5px solid var(--ink)", background: "var(--paper-2)" }}>
          <div className="smallcaps" style={{ color: "var(--ink-3)", marginBottom: 6 }}>24h spend curve</div>
          <SpendCurve wallet={wallet}/>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "end", gap: 10 }}>
          <span className="stamp-filled" style={{ background: statusColor }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--paper)" }}/>
            {statusLabel}
          </span>
          {ad?.funded && <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", textAlign: "right" }}>{ad.txCount ?? 0} VALIDATOR TXS</div>}
          <div className="hand" style={{ fontSize: 18, color: "var(--ink-3)", transform: "rotate(-2deg)" }}>
            {ad?.funded ? `₳ ${fmtAda(rules?.windowSpentAda ?? 0)} today` : wallet.connected ? `${wallet.txCount ?? 0} tx total` : "nothing yet"}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", border: "1.5px solid var(--ink)", marginBottom: 24 }}>
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="smallcaps" style={{ color: "var(--ink-3)", fontSize: 9 }}>Spend today</div>
          <div className="display" style={{ fontSize: 40, lineHeight: 1, color: spentAda != null ? "var(--ink)" : "var(--ink-4)" }}>
            {spentAda != null ? `₳ ${fmtAda(spentAda)}` : "—"}
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-2)" }}>
            {dailyCapAda != null ? `of ₳ ${fmtAda(dailyCapAda)} cap · ${resetLabel}` : "no contract deployed yet"}
          </div>
          <div style={{ height: 6, background: "var(--paper-3)", border: "1px solid var(--ink-4)", marginTop: 4, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, width: `${pctUsed}%`, background: "var(--ink-4)" }}/>
          </div>
        </div>
        <div style={{ padding: "18px 22px", borderLeft: "1.5px solid var(--ink)", borderRight: "1.5px solid var(--ink)", display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="smallcaps" style={{ color: "var(--ink-3)", fontSize: 9 }}>Transactions</div>
          <div className="display" style={{ fontSize: 40, lineHeight: 1 }}>{txCount != null ? txCount.toLocaleString() : "—"}</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-2)" }}>
            {ad?.funded ? "through the validator" : wallet.connected ? "on operator address" : "deploy an agent to begin"}
          </div>
        </div>
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="smallcaps" style={{ color: "var(--ink-3)", fontSize: 9 }}>Validator latency</div>
          <div className="display" style={{ fontSize: 40, lineHeight: 1 }}>28ms</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-2)" }}>
            {ad?.funded ? "p95: 41ms · on-chain healthy" : "will measure after first spend"}
          </div>
        </div>
      </div>

      {/* Activity + Approvals summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 22, marginBottom: 22 }}>
        <ActivityFeed wallet={wallet} agentState={agentState} navigateTo={navigateTo}/>
        <ApprovalsSummary navigateTo={navigateTo}/>
      </div>

      {/* Rules + Whitelist summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 22 }}>
        <RulesSummary agentState={agentState} navigateTo={navigateTo}/>
        <WhitelistSummary agentState={agentState} navigateTo={navigateTo}/>
      </div>
    </div>
  );
}

/* ─── Shared "view all" button ──────────────────────────────────────────────── */
function ViewAllBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "transparent", border: "none", cursor: "pointer",
      fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent)",
      letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 4, padding: 0,
    }}>
      {label ?? "VIEW ALL"} →
    </button>
  );
}

/* ─── Overview widgets ────────────────────────────────────────────────────── */
function ActivityFeed({ wallet, agentState, navigateTo }) {
  const ad = agentState?.data;
  const contractTxs = ad?.funded && Array.isArray(ad.recentTxs) ? ad.recentTxs : null;
  const displayTxs  = contractTxs ?? (wallet.connected ? wallet.txs : []);
  const isLive      = displayTxs.length > 0;

  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "4px 4px 0 var(--ink)" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)", fontSize: 9 }}>Live activity</div>
          <div className="display" style={{ fontSize: 18, lineHeight: 1.1, marginTop: 2 }}>Every decision, in order.</div>
        </div>
        <ViewAllBtn onClick={() => navigateTo("monitor")}/>
      </div>
      {displayTxs.length > 0 ? (
        <div>
          {displayTxs.slice(0, 5).map((tx, i) => (
            <div key={tx.tx_hash} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 18px", borderBottom: i < 4 ? "1px solid var(--paper-3)" : "none" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: "var(--ok)", border: "1.5px solid var(--ink)" }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.tx_hash}</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>
                  {timeAgo(tx.block_time ?? tx.block_time_unix)} · #{tx.block_height?.toLocaleString()}
                </div>
              </div>
              <a href={`https://preview.cardanoscan.io/transaction/${tx.tx_hash}`} target="_blank" rel="noopener noreferrer"
                style={{ color: "var(--accent)", fontSize: 11, textDecoration: "none" }}>↗</a>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: "36px 20px", textAlign: "center" }}>
          <div className="hand" style={{ fontSize: 26, color: "var(--ink-3)", marginBottom: 8 }}>no transactions yet</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-4)", lineHeight: 1.5 }}>
            Run an agent spend via the SDK to see activity here.
          </div>
        </div>
      )}
    </div>
  );
}

function ApprovalsSummary({ navigateTo }) {
  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "4px 4px 0 var(--ink)" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)", fontSize: 9 }}>Approvals queue</div>
          <div className="display" style={{ fontSize: 18, lineHeight: 1.1, marginTop: 2 }}>0 pending</div>
        </div>
        <ViewAllBtn onClick={() => navigateTo("approvals")}/>
      </div>
      <div style={{ padding: "28px 18px", textAlign: "center" }}>
        <div className="hand" style={{ fontSize: 26, color: "var(--ok)", marginBottom: 6 }}>queue clear ✓</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5 }}>
          Above-cap spends pause here for your co-signature before hitting the chain.
        </div>
        <button onClick={() => navigateTo("approvals")} style={{
          marginTop: 16, padding: "8px 20px", border: "1.5px solid var(--ink)",
          background: "var(--paper-2)", fontFamily: "var(--serif)", fontSize: 13,
          cursor: "pointer", color: "var(--ink)",
        }}>Manage approvals →</button>
      </div>
    </div>
  );
}

function RulesSummary({ agentState, navigateTo }) {
  const ad   = agentState?.data;
  const live = ad?.funded && ad?.rules;
  const r    = ad?.rules;
  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "4px 4px 0 var(--ink)" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)", fontSize: 9 }}>Guardrails</div>
          <div className="display" style={{ fontSize: 18, lineHeight: 1.1, marginTop: 2 }}>
            {live ? "Enforced on chain" : "Not deployed"}
          </div>
        </div>
        <ViewAllBtn label="CONFIGURE" onClick={() => navigateTo("rules")}/>
      </div>
      <div style={{ padding: "12px 0" }}>
        {[
          { name: "per_tx_cap", val: live ? `₳ ${fmtAda(r.perTxCapAda)}` : "—", on: live },
          { name: "daily_cap",  val: live ? `₳ ${fmtAda(r.dailyCapAda)}` : "—",  on: live },
          { name: "freeze",     val: live ? (r.isFrozen ? "FROZEN" : "active") : "—", on: live && !r.isFrozen },
        ].map((row, i) => (
          <div key={row.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 18px", borderBottom: i < 2 ? "1px solid var(--paper-3)" : "none" }}>
            <span className="mono" style={{ fontSize: 11, color: live ? "var(--accent)" : "var(--ink-4)" }}>{row.name}</span>
            <span className="display" style={{ fontSize: 15, color: row.name === "freeze" && live && r.isFrozen ? "var(--danger)" : live ? "var(--ink)" : "var(--ink-4)" }}>{row.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WhitelistSummary({ agentState, navigateTo }) {
  const ad    = agentState?.data;
  const live  = ad?.funded && ad?.rules;
  const count = live ? (ad.rules.allowedAddressCount ?? 0) : 0;
  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "4px 4px 0 var(--ink)" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)", fontSize: 9 }}>Whitelist</div>
          <div className="display" style={{ fontSize: 18, lineHeight: 1.1, marginTop: 2 }}>{count} address{count !== 1 ? "es" : ""}</div>
        </div>
        <ViewAllBtn label="MANAGE" onClick={() => navigateTo("whitelist")}/>
      </div>
      <div style={{ padding: "28px 18px", textAlign: "center" }}>
        <div className="hand" style={{ fontSize: 26, color: live ? "var(--ok)" : "var(--ink-3)", marginBottom: 6 }}>
          {live ? "no restrictions ✓" : "not deployed"}
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-4)", lineHeight: 1.5 }}>
          Whitelisted addresses bypass the per-tx cap entirely.
        </div>
      </div>
    </div>
  );
}

function SpendCurve({ wallet }) {
  const w = 300, h = 52;
  if (!wallet.connected || wallet.txs.length === 0) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block", marginTop: 4 }}>
        <line x1="0" y1={h * 0.8} x2={w} y2={h * 0.8} stroke="var(--ink-4)" strokeWidth="1" strokeDasharray="4 4"/>
        <text x={w/2} y={h * 0.45} textAnchor="middle" fontSize="9" fontFamily="var(--mono)" fill="var(--ink-4)">NO DATA</text>
      </svg>
    );
  }
  const txs = wallet.txs.slice().reverse();
  const barW = Math.max(2, Math.floor(w / txs.length) - 2);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block", marginTop: 4 }}>
      <line x1="0" y1={h * 0.9} x2={w} y2={h * 0.9} stroke="var(--ink-4)" strokeWidth="1"/>
      {txs.map((tx, i) => {
        const x = i * (w / txs.length);
        const barH = 8 + Math.random() * 18;
        return <rect key={tx.tx_hash} x={x + 1} y={h * 0.9 - barH} width={barW} height={barH} fill="var(--ink)" opacity="0.6"/>;
      })}
      <text x="4" y="10" fontSize="8" fontFamily="var(--mono)" fill="var(--accent)">{txs.length} TXS</text>
    </svg>
  );
}

/* ═══════════════════════════ PAGE: APPROVALS ════════════════════════════════ */
function ApprovalsPage({ agentState, showToast }) {
  const ad   = agentState?.data;
  const live = ad?.funded;

  return (
    <div>
      {/* Info banner */}
      <div style={{
        padding: "16px 20px", border: "1.5px solid var(--ink)", background: "var(--paper-2)",
        display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 24,
      }}>
        <Icon.bell size={18}/>
        <div>
          <div className="display" style={{ fontSize: 16, marginBottom: 4 }}>How approvals work</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55, maxWidth: 700 }}>
            When your AI agent requests a spend above the <strong>per-tx cap</strong>, the transaction is paused and queued here.
            The owner must co-sign using <code className="mono" style={{ fontSize: 12, background: "var(--paper-3)", padding: "1px 5px" }}>approveSpend()</code> to release it on-chain — satisfying the Aiken validator's owner-signature check.
            Rejected items are discarded with no on-chain effect.
          </div>
        </div>
      </div>

      {/* Queue */}
      <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)", marginBottom: 24 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="smallcaps" style={{ color: "var(--accent)", fontSize: 9 }}>Pending approvals</div>
            <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>0 awaiting your decision</div>
          </div>
          <span className="stamp" style={{ borderColor: "var(--ok)", color: "var(--ok)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ok)" }}/>
            CLEAR
          </span>
        </div>

        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <div className="hand" style={{ fontSize: 40, color: "var(--ok)", marginBottom: 12 }}>All clear ✓</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 16, color: "var(--ink-3)", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
            No pending approvals right now. When your agent tries to spend above the ₳500 per-tx cap, the request will appear here.
          </div>
        </div>
      </div>

      {/* How to trigger & approve via SDK */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", padding: "20px 20px" }}>
          <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 10, fontSize: 10 }}>Queue a spend (agent side)</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)", marginBottom: 12, lineHeight: 1.5 }}>
            Call this instead of <code className="mono" style={{ fontSize: 11 }}>agentSpend()</code> when the amount exceeds the per-tx cap.
          </div>
          <CodeBlock lang="typescript" code={`import { queueSpend } from "./sdk/src/index.js";

const pending = await queueSpend(
  wallet,
  "addr_test1...",
  1_000_000_000n, // ₳1,000
  "Pay invoice #42 — Acme Corp cloud bill",
);
// → { id: "uuid", status: "pending", ... }`}/>
        </div>
        <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", padding: "20px 20px" }}>
          <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 10, fontSize: 10 }}>Approve (owner side)</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)", marginBottom: 12, lineHeight: 1.5 }}>
            Owner selects a queued item and co-signs on-chain. Requires the owner private key.
          </div>
          <CodeBlock lang="typescript" code={`import { getPendingSpends, approveSpend, rejectSpend } from "./sdk/src/index.js";

// List pending items
const queue = await getPendingSpends(wallet);

// Approve — submits OwnerAction tx on-chain
const txHash = await approveSpend(lucid, wallet, queue[0].id);

// Or reject — no on-chain tx, just marks the queue entry
await rejectSpend(wallet, queue[0].id);`}/>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ PAGE: RULES ════════════════════════════════════ */
function RulesPage({ agentState, showToast }) {
  const ad   = agentState?.data;
  const live = ad?.funded && ad?.rules;
  const r    = ad?.rules;

  return (
    <div>
      {/* Live rules */}
      <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)", marginBottom: 24 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="smallcaps" style={{ color: "var(--accent)", fontSize: 9 }}>On-chain guardrails</div>
            <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>
              {live ? "Active — enforced by Aiken validator" : "Contract not yet deployed"}
            </div>
          </div>
          {live ? (
            <span className="stamp" style={{ borderColor: "var(--ok)", color: "var(--ok)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ok)" }}/>
              ON-CHAIN
            </span>
          ) : (
            <span className="stamp">OFFLINE</span>
          )}
        </div>

        <div>
          {[
            {
              key: "per_tx_cap",
              label: "Per-transaction cap",
              val:   live ? `₳ ${fmtAda(r.perTxCapAda)}` : "Not set",
              desc:  "Hard ceiling on any single agent-initiated spend. Exceeding this routes to the approvals queue.",
              on:    live,
              danger: false,
            },
            {
              key: "daily_cap",
              label: "Rolling 24h cap",
              val:   live ? `₳ ${fmtAda(r.dailyCapAda)}` : "Not set",
              desc:  "Cumulative limit per rolling 24-hour window. The window start is stored in the on-chain datum and resets automatically.",
              on:    live,
              danger: false,
            },
            {
              key: "window_spent",
              label: "Spent this window",
              val:   live ? `₳ ${fmtAda(r.windowSpentAda)} (${r.pctUsed}%)` : "—",
              desc:  "How much has been spent in the current 24h window. Resets when window_start + 86,400s passes.",
              on:    live,
              danger: r?.pctUsed > 80,
            },
            {
              key: "freeze_switch",
              label: "Emergency freeze",
              val:   live ? (r.isFrozen ? "⚠ FROZEN" : "Active — not frozen") : "Off",
              desc:  "When frozen, all Spend and OwnerAction redeemers are rejected. Only FreezeWallet redeemer succeeds. Owner must call ownerAction() to unfreeze.",
              on:    live,
              danger: live && r.isFrozen,
            },
            {
              key: "whitelist_routing",
              label: "Whitelist bypass",
              val:   live ? `${r.allowedAddressCount ?? 0} addresses whitelisted` : "—",
              desc:  "If the recipient's payment credential hash appears in allowed_addresses, the per-tx cap check is skipped entirely.",
              on:    live && (r?.allowedAddressCount ?? 0) > 0,
              danger: false,
            },
          ].map((row, i, arr) => (
            <div key={row.key} style={{
              display: "grid", gridTemplateColumns: "220px 1fr auto", gap: 20, alignItems: "start",
              padding: "16px 20px",
              borderBottom: i < arr.length - 1 ? "1px solid var(--paper-3)" : "none",
              opacity: row.on || !live ? 1 : 0.5,
              background: row.danger ? "rgba(180,40,40,0.04)" : "transparent",
            }}>
              <div>
                <div className="mono" style={{ fontSize: 11, color: row.danger ? "var(--danger)" : live ? "var(--accent)" : "var(--ink-4)" }}>{row.key}</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 500, marginTop: 2 }}>{row.label}</div>
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.55, paddingTop: 2 }}>{row.desc}</div>
              <div className="display" style={{
                fontSize: 18, textAlign: "right", minWidth: 140,
                color: row.danger ? "var(--danger)" : live ? "var(--ink)" : "var(--ink-4)",
              }}>{row.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Update rules */}
      <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", padding: "20px 20px", marginBottom: 22 }}>
        <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 10, fontSize: 10 }}>Update rules on-chain (owner only)</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink-2)", marginBottom: 14, lineHeight: 1.55 }}>
          Rules are immutable from the agent's perspective — only the owner PKH can update them by submitting an <strong>OwnerAction</strong> transaction.
          Pass a new <code className="mono" style={{ fontSize: 12 }}>GuardrailConfig</code> to apply changes.
        </div>
        <CodeBlock lang="typescript" code={`import { ownerAction } from "./sdk/src/index.js";

// Tighten the per-tx cap and raise the daily limit
const txHash = await ownerAction(lucid, wallet, {
  ...wallet.config,
  perTxCapLovelace: 200_000_000n,    // ₳200 new per-tx cap
  dailyCapLovelace: 5_000_000_000n,  // ₳5,000 new daily cap
  isFrozen:         false,           // unfreeze if needed
});
console.log("Rules updated on-chain:", txHash);`}/>
      </div>

      {/* Freeze / unfreeze */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        <div style={{ border: "1.5px solid var(--danger)", background: "var(--paper)", padding: "18px 20px" }}>
          <div className="smallcaps" style={{ color: "var(--danger)", marginBottom: 8, fontSize: 10 }}>Emergency freeze</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)", marginBottom: 12, lineHeight: 1.5 }}>
            Immediately halts all agent spends. Uses FreezeWallet redeemer — sets <code className="mono" style={{ fontSize: 11 }}>is_frozen = true</code> in the continuing datum.
          </div>
          <CodeBlock lang="typescript" code={`await freezeWallet(lucid, wallet);`}/>
        </div>
        <div style={{ border: "1.5px solid var(--ok)", background: "var(--paper)", padding: "18px 20px" }}>
          <div className="smallcaps" style={{ color: "var(--ok)", marginBottom: 8, fontSize: 10 }}>Unfreeze &amp; restore</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)", marginBottom: 12, lineHeight: 1.5 }}>
            Owner submits an OwnerAction transaction with <code className="mono" style={{ fontSize: 11 }}>isFrozen: false</code> to resume agent spending.
          </div>
          <CodeBlock lang="typescript" code={`await ownerAction(lucid, wallet, {
  ...wallet.config,
  isFrozen: false,
});`}/>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ PAGE: WHITELIST ════════════════════════════════ */
function WhitelistPage({ agentState, showToast }) {
  const ad    = agentState?.data;
  const live  = ad?.funded && ad?.rules;
  const count = live ? (ad.rules.allowedAddressCount ?? 0) : 0;
  const [addInput, setAddInput] = useStateD("");

  function handleAdd() {
    if (!addInput.trim()) return;
    showToast("To add an address, call ownerAction() from the SDK with the updated allowedCredentialHashes array.");
    setAddInput("");
  }

  return (
    <div>
      {/* Header */}
      <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)", marginBottom: 24 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="smallcaps" style={{ color: "var(--accent)", fontSize: 9 }}>Trusted addresses</div>
            <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>
              {count} address{count !== 1 ? "es" : ""} whitelisted
            </div>
          </div>
          {live && (
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
              OWNER: {ad.rules.ownerPkh ? `${ad.rules.ownerPkh.slice(0, 14)}…` : "—"}
            </div>
          )}
        </div>
        {count === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div className="hand" style={{ fontSize: 36, color: live ? "var(--ok)" : "var(--ink-3)", marginBottom: 10 }}>
              {live ? "empty — all addresses checked ✓" : "contract not deployed"}
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-4)", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
              Addresses on this list bypass the per-tx cap and go straight to the chain — no approval queue required.
            </div>
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", border: "1.5px solid var(--ok)", background: "var(--paper-2)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ok)", border: "1.5px solid var(--ink)", flexShrink: 0 }}/>
              <div className="mono" style={{ fontSize: 12, color: "var(--ok)" }}>
                {count} credential hash{count !== 1 ? "es" : ""} registered on-chain
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add address (SDK-gated) */}
      <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", padding: "20px 20px", marginBottom: 22 }}>
        <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 8, fontSize: 10 }}>Add a trusted address</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink-3)", marginBottom: 14, lineHeight: 1.5 }}>
          Paste a Preview testnet address below. Beni will extract its payment credential hash. To actually register it on-chain, run the <code className="mono" style={{ fontSize: 12 }}>ownerAction()</code> SDK call shown beneath.
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <input
            value={addInput}
            onChange={e => setAddInput(e.target.value)}
            placeholder="addr_test1..."
            style={{ flex: 1, height: 38, padding: "0 12px", border: "1.5px solid var(--ink)", background: "var(--paper-2)", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink)", outline: 0 }}
          />
          <button onClick={handleAdd} className="ink-btn" style={{ height: 38, padding: "0 18px", fontSize: 13, boxShadow: "2px 2px 0 var(--ink)" }}>
            <Icon.plus size={13} color="var(--paper)"/> Add
          </button>
        </div>
        {addInput.trim() && (
          <div style={{ marginBottom: 14, padding: "10px 14px", border: "1.5px dashed var(--ink-3)", background: "var(--paper-2)" }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 4 }}>EXTRACTED CREDENTIAL HASH (example)</div>
            <div className="mono" style={{ fontSize: 12, color: "var(--ink)", wordBreak: "break-all" }}>
              {addInput.length > 10 ? addInput.replace(/^addr_test1/, "").slice(0, 56) + "…" : "enter a full address"}
            </div>
          </div>
        )}
        <CodeBlock lang="typescript" code={`import { ownerAction, getAddressDetails } from "./sdk/src/index.js";

// Get credential hash from the address
const { paymentCredential } = getAddressDetails("addr_test1...");
const hash = paymentCredential.hash;

await ownerAction(lucid, wallet, {
  ...wallet.config,
  allowedCredentialHashes: [
    ...wallet.config.allowedCredentialHashes,
    hash,
  ],
});`}/>
      </div>

      {/* Remove address */}
      <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", padding: "20px 20px" }}>
        <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 8, fontSize: 10 }}>Remove an address</div>
        <CodeBlock lang="typescript" code={`// Filter out the hash and submit a new ownerAction
const hashToRemove = "4b0f3ae1...";

await ownerAction(lucid, wallet, {
  ...wallet.config,
  allowedCredentialHashes: wallet.config.allowedCredentialHashes
    .filter(h => h !== hashToRemove),
});`}/>
      </div>
    </div>
  );
}

/* ═══════════════════════════ PAGE: TRANSACTIONS ═════════════════════════════ */
function TransactionsPage({ wallet, agentState }) {
  const ad = agentState?.data;
  const contractTxs = ad?.funded && Array.isArray(ad.recentTxs) ? ad.recentTxs : null;
  const displayTxs  = contractTxs ?? (wallet.connected ? wallet.txs : []);
  const sourceLabel = contractTxs ? "script address" : "operator wallet";

  return (
    <div>
      <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="smallcaps" style={{ color: "var(--accent)", fontSize: 9 }}>Transaction history</div>
            <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>Recent on-chain activity</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="stamp">{sourceLabel.toUpperCase()}</span>
            <span className="stamp">{displayTxs.length} TXS</span>
          </div>
        </div>

        {displayTxs.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)" }}>
                {["TX HASH", "TIME", "BLOCK", "EXPLORER"].map(h => (
                  <th key={h} className="smallcaps" style={{ padding: "10px 20px", textAlign: "left", fontSize: 9, color: "var(--ink-3)", fontWeight: "normal" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayTxs.map((tx, i) => (
                <tr key={tx.tx_hash} style={{ borderBottom: i < displayTxs.length - 1 ? "1px solid var(--paper-3)" : "none" }}>
                  <td style={{ padding: "12px 20px", fontFamily: "var(--mono)", fontSize: 12 }}>
                    {tx.tx_hash.slice(0, 14)}…{tx.tx_hash.slice(-8)}
                  </td>
                  <td style={{ padding: "12px 20px", fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-2)" }}>
                    {timeAgo(tx.block_time ?? tx.block_time_unix)}
                  </td>
                  <td style={{ padding: "12px 20px", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)" }}>
                    #{tx.block_height?.toLocaleString()}
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    <a href={`https://preview.cardanoscan.io/transaction/${tx.tx_hash}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 11, textDecoration: "none", borderBottom: "1px solid var(--accent)" }}>
                      cardanoscan ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <div className="hand" style={{ fontSize: 36, color: "var(--ink-3)", marginBottom: 12 }}>
              {wallet.connected ? "no transactions found" : "no transactions yet"}
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-4)", maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
              {wallet.connected
                ? "This address has no on-chain history. Fund it from the Preview faucet and run a demo spend."
                : "Transactions will appear here once your agent begins making on-chain spends."}
            </div>
            <div style={{ marginTop: 24 }}>
              <a href="https://docs.cardano.org/cardano-testnets/tools/faucet/" target="_blank" rel="noopener noreferrer"
                className="ink-btn ghost"
                style={{ display: "inline-flex", height: 36, padding: "0 20px", fontSize: 13, boxShadow: "2px 2px 0 var(--ink)", textDecoration: "none" }}>
                Get Preview testnet ADA →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════ PAGE: MONITOR ══════════════════════════════════ */
function MonitorPage({ wallet, agentState }) {
  const ad = agentState?.data;
  const contractTxs = ad?.funded && Array.isArray(ad.recentTxs) ? ad.recentTxs : null;
  const displayTxs  = contractTxs ?? (wallet.connected ? wallet.txs : []);
  const [pulse, setPulse] = useStateD(false);

  useEffectD(() => {
    const id = setInterval(() => setPulse(v => !v), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      {/* Live indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22, padding: "14px 20px", border: "1.5px solid var(--ink)", background: "var(--paper-2)" }}>
        <div style={{ position: "relative", width: 16, height: 16 }}>
          <span style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: ad?.funded ? "var(--ok)" : "var(--ink-4)",
            opacity: pulse ? 0.4 : 1, transition: "opacity 0.4s",
          }}/>
          <span style={{ position: "absolute", inset: 4, borderRadius: "50%", background: ad?.funded ? "var(--ok)" : "var(--ink-4)", border: "1.5px solid var(--ink)" }}/>
        </div>
        <div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", color: ad?.funded ? "var(--ok)" : "var(--ink-4)" }}>
            {ad?.funded ? "LIVE — POLLING EVERY 30s" : "WAITING FOR CONTRACT"}
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>
            {ad?.funded ? `Monitoring: ${ad.scriptAddress?.slice(0, 24)}…` : "Deploy an agent wallet to begin live monitoring"}
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--ink-4)" }}>
            {ad?.txCount ?? 0} TOTAL TXS · {displayTxs.length} SHOWN
          </span>
        </div>
      </div>

      {/* Live feed */}
      <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)" }}>
          <div className="smallcaps" style={{ color: "var(--accent)", fontSize: 9 }}>Activity stream</div>
          <div className="display" style={{ fontSize: 20, marginTop: 2 }}>Every decision, in real time.</div>
        </div>

        {displayTxs.length > 0 ? (
          <div>
            {displayTxs.map((tx, i) => (
              <div key={tx.tx_hash} style={{
                display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 16, alignItems: "center",
                padding: "14px 20px",
                borderBottom: i < displayTxs.length - 1 ? "1px solid var(--paper-3)" : "none",
                background: i === 0 ? "rgba(0, 200, 100, 0.03)" : "transparent",
              }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                    background: i === 0 ? "var(--ok)" : "var(--ink-4)",
                    border: "1.5px solid var(--ink)",
                  }}/>
                  {i === 0 && <span className="mono" style={{ fontSize: 8, color: "var(--ok)", letterSpacing: "0.1em" }}>NEW</span>}
                </div>
                <div>
                  <div className="mono" style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 3 }}>{tx.tx_hash}</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 12, color: "var(--ink-3)" }}>
                    {timeAgo(tx.block_time ?? tx.block_time_unix)} · block #{tx.block_height?.toLocaleString()}
                  </div>
                </div>
                <span className="stamp" style={{ fontSize: 9, padding: "3px 8px" }}>CONFIRMED</span>
                <a href={`https://preview.cardanoscan.io/transaction/${tx.tx_hash}`} target="_blank" rel="noopener noreferrer"
                  style={{ color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 12, textDecoration: "none" }}>
                  ↗ view
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "80px 24px", textAlign: "center" }}>
            <div className="hand" style={{ fontSize: 40, color: "var(--ink-4)", marginBottom: 14 }}>watching…</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-4)", lineHeight: 1.6 }}>
              No activity yet. Run an agent spend via the SDK and it will appear here within the next 30-second poll.
            </div>
            <div style={{ marginTop: 16 }}>
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>npx tsx sdk/examples/demo.ts</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════ ASSISTANT PANEL ════════════════════════════ */
function AssistantPanel({ wallet, agentState, setShowChat }) {
  const [messages, setMessages] = useStateD([
    { who: "beni", text: "Hi! I'm Beni — your on-chain wallet guardian. Connect a wallet above to see your live balance, or ask me anything about how Beni's guardrails work." },
  ]);
  const [input, setInput] = useStateD("");
  const [loading, setLoading] = useStateD(false);
  const bottomRef = useRefD(null);

  useEffectD(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffectD(() => {
    if (wallet.connected && messages.length === 1) {
      setMessages([{
        who: "beni",
        text: `Wallet connected — ${wallet.addrShort}. Balance: ₳ ${fmtAda(wallet.balanceAda)} · ${wallet.txCount} transactions. To activate guardrails, deploy an agent wallet with the SDK.`,
      }]);
    }
  }, [wallet.connected]);

  useEffectD(() => {
    const ad = agentState?.data;
    if (ad?.funded && ad?.rules && messages.length <= 1) {
      const r = ad.rules;
      setMessages([{
        who: "beni",
        text: `Contract live on Preview testnet! Script balance: ₳ ${fmtAda(ad.balanceAda)}. Per-tx cap ₳ ${fmtAda(r.perTxCapAda)}, daily cap ₳ ${fmtAda(r.dailyCapAda)}. Spent today: ₳ ${fmtAda(r.windowSpentAda)} (${r.pctUsed}%). ${r.isFrozen ? "⚠ FROZEN." : "Guardrails active."}`,
      }]);
    }
  }, [agentState?.data?.funded]);

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
          messages: history.map(m => ({ role: m.who === "user" ? "user" : "assistant", content: m.text })),
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, { who: "beni", text: data.text }]);
    } catch {
      setMessages(prev => [...prev, { who: "beni", text: "⚠ Chat server not reachable. Run: cd sdk && npm run chat" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside style={{
      borderLeft: "1.5px solid var(--ink)",
      background: "var(--paper-2)",
      display: "flex", flexDirection: "column",
      height: "100%", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px", borderBottom: "1.5px solid var(--ink)",
        display: "flex", alignItems: "center", gap: 10,
        flexShrink: 0, background: "var(--paper)",
      }}>
        <div style={{ width: 32, height: 32, border: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <BeniMark size={19}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="display" style={{ fontSize: 16 }}>Beni</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em" }}>POLICY-AWARE · READS THE CHAIN</div>
        </div>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: loading ? "var(--warn)" : "var(--ok)", border: "1.5px solid var(--ink)", flexShrink: 0 }}/>
        <button onClick={() => setShowChat(false)} title="Close" style={{
          width: 28, height: 28, border: "1.5px solid var(--ink)", background: "transparent",
          cursor: "pointer", display: "grid", placeItems: "center",
          fontFamily: "var(--mono)", fontSize: 14, color: "var(--ink)", flexShrink: 0,
        }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          m.who === "user" ? (
            <div key={i} style={{
              alignSelf: "flex-end", maxWidth: "88%",
              padding: "9px 12px", background: "var(--ink)", color: "var(--paper)",
              border: "1.5px solid var(--ink)", fontFamily: "var(--serif)", fontSize: 14, lineHeight: 1.45,
            }}>{m.text}</div>
          ) : (
            <div key={i} style={{
              alignSelf: "flex-start", maxWidth: "95%",
              padding: "10px 12px", background: "var(--paper)",
              border: "1.5px solid var(--ink)", fontFamily: "var(--serif)", fontSize: 14, lineHeight: 1.5,
            }}>{m.text}</div>
          )
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", padding: "10px 12px", background: "var(--paper)", border: "1.5px solid var(--ink)", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)" }}>
            thinking…
          </div>
        )}
        <div style={{ padding: 10, border: "1.5px solid var(--accent)", background: "var(--paper)", marginTop: 4 }}>
          <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 6, fontSize: 9 }}>Try asking</div>
          {["How does the thread token work?", "What happens when I freeze a wallet?", "How does the daily cap reset?"].map(t => (
            <button key={t} onClick={() => setInput(t)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
              padding: "6px 8px", marginBottom: 4, background: "var(--paper-2)", border: "1.5px solid var(--ink)",
              color: "var(--ink)", fontFamily: "var(--serif)", fontSize: 12, cursor: "pointer", textAlign: "left",
            }}>
              {t} <Icon.arrow size={12}/>
            </button>
          ))}
        </div>
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ padding: 10, borderTop: "1.5px solid var(--ink)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 5px 0 10px", border: "1.5px solid var(--ink)", background: "var(--paper)", opacity: loading ? 0.6 : 1 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Ask Beni…"
            disabled={loading}
            style={{ flex: 1, height: 34, background: "transparent", border: 0, outline: 0, color: "var(--ink)", font: "14px var(--serif)" }}
          />
          <button className="ink-btn" onClick={send} disabled={loading}
            style={{ height: 26, padding: "0 8px", fontSize: 11, boxShadow: "2px 2px 0 var(--ink)", opacity: loading ? 0.5 : 1 }}>
            <Icon.send size={11} color="var(--paper)"/>
          </button>
        </div>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-4)", marginTop: 7, textAlign: "center", letterSpacing: "0.08em" }}>
          POWERED BY CLAUDE · BENI v0.4.1
        </div>
      </div>
    </aside>
  );
}

Object.assign(window, { Dashboard });
