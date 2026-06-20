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

// ── Local policy store ───────────────────────────────────────────────────────
// The dashboard lets owners configure guardrails from the front end. The desired
// policy is held here and persisted in the browser. When a contract is deployed
// and funded, the live on-chain values (from /api/agent-state) are the source of
// truth; until then this is your working draft, applied at deploy time.
const POLICY_KEY    = "beni.policy.v1";
const WORKSPACE_KEY = "beni.workspace.v1";

function loadJSON(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}

function usePolicy() {
  const [policy, setPolicy] = useStateD(() => loadJSON(POLICY_KEY, {
    perTxCapAda: 2,
    dailyCapAda: 10,
    whitelist:   [],
  }));

  useEffectD(() => {
    try { localStorage.setItem(POLICY_KEY, JSON.stringify(policy)); } catch { /* ignore */ }
  }, [policy]);

  return [policy, setPolicy];
}

function useWorkspaceName() {
  const [name, setName] = useStateD(() => {
    try { return localStorage.getItem(WORKSPACE_KEY) || "My workspace"; }
    catch { return "My workspace"; }
  });
  useEffectD(() => {
    try { localStorage.setItem(WORKSPACE_KEY, name); } catch { /* ignore */ }
  }, [name]);
  return [name, setName];
}

const GITHUB_URL = "https://github.com/IamHarrie-Labs/beni";

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

/* ═══════════════════════════════ ROOT ═══════════════════════════════════════ */
function Dashboard({ wallet }) {
  const [activePage, setActivePage] = useStateD("overview");
  const [frozen, setFrozen] = useStateD(false);
  const [showChat, setShowChat] = useStateD(true);
  const [modal, setModal] = useStateD(null);
  const [toast, setToast] = useStateD(null);
  const agentState = useAgentState();
  const [policy, setPolicy] = usePolicy();
  const [workspaceName, setWorkspaceName] = useWorkspaceName();

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
        workspaceName={workspaceName}
        setWorkspaceName={setWorkspaceName}
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
        policy={policy}
        setPolicy={setPolicy}
      />
      {showChat && <AssistantPanel wallet={wallet} agentState={agentState} setShowChat={setShowChat}/>}

      {/* ── Modals ── */}
      {modal === "add-agent" && (
        <Modal title="Deploy a new agent wallet" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Each Beni agent wallet is an Aiken smart contract on Cardano Preview, with its own
              one-shot thread token. Deployment runs once from the SDK and writes a wallet-state
              file you point the dashboard at.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["Generate a signing key", "Create the agent's keypair and fund it from the Preview faucet."],
                ["Set your guardrails", "Pick a per-transaction cap and a daily cap on the Rules page."],
                ["Deploy on-chain", "One SDK command mints the thread token and locks the config datum."],
              ].map(([t, d], i) => (
                <div key={t} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span style={{ width: 24, height: 24, flexShrink: 0, border: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontSize: 12 }}>{i + 1}</span>
                  <div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 500 }}>{t}</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5 }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => window.open(`${GITHUB_URL}#deploying-a-wallet`, "_blank")} className="ink-btn" style={{ height: 42, fontSize: 14, boxShadow: "2px 2px 0 var(--ink)" }}>
              <Icon.github size={15}/> Full deploy guide on GitHub
            </button>
          </div>
        </Modal>
      )}

      {modal === "api" && (
        <Modal title="Integrate Beni" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Point the SDK at a deployed wallet and your agent can spend on-chain, fully guarded
              by the Aiken validator. The full integration guide, with copy-paste examples for every
              call, lives in the GitHub repo.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["agentSpend()", "Guarded spend. Reverts on-chain if it breaks a rule."],
                ["queueSpend() / approveSpend()", "Above-cap spends pause for owner co-signature."],
                ["freezeWallet()", "Halt every agent spend within one block."],
                ["ownerAction()", "Owner-signed update to caps, whitelist, or freeze state."],
              ].map(([fn, desc]) => (
                <div key={fn} style={{ display: "flex", gap: 14, padding: "10px 12px", border: "1.5px solid var(--paper-3)", background: "var(--paper)" }}>
                  <span className="mono" style={{ fontSize: 12, color: "var(--accent)", minWidth: 210, flexShrink: 0 }}>{fn}</span>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)" }}>{desc}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: "12px 14px", border: "1.5px solid var(--ok)", background: "var(--paper-2)", fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>
              <strong>Contract address (Preview):</strong><br/>
              <span className="mono" style={{ fontSize: 11, wordBreak: "break-all" }}>
                addr_test1wpmhu0jkd6vttmct0fez808472lt578dr9m0745ydguakagnpc3h6
              </span><br/>
              <strong>Thread token policy:</strong><br/>
              <span className="mono" style={{ fontSize: 11, wordBreak: "break-all" }}>
                d0c145e409a7a746671ef003184da5bae5fcc4516f3f3ba3165adac2
              </span>
            </div>

            <button onClick={() => window.open(GITHUB_URL, "_blank")} className="ink-btn" style={{ height: 42, fontSize: 14, boxShadow: "2px 2px 0 var(--ink)" }}>
              <Icon.github size={15}/> Read the integration guide
            </button>
          </div>
        </Modal>
      )}

      {modal === "freeze" && (
        <Modal title={frozen ? "Resume wallet operations" : "Emergency freeze"} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {frozen ? (
              <>
                <div style={{ padding: "14px 16px", border: "1.5px solid var(--ok)", background: "rgba(0,180,80,0.05)", fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink)", lineHeight: 1.6 }}>
                  The wallet is frozen and every agent spend is halted. Resuming re-enables spending
                  under your existing caps. On a live wallet this is an owner-signed action, so only
                  you can lift a freeze.
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setFrozen(false); setModal(null); showToast("Wallet resumed. Agent spending is active again."); }}
                    className="ink-btn" style={{ flex: 1, height: 42, fontSize: 14 }}>
                    Resume wallet
                  </button>
                  <button onClick={() => setModal(null)} className="ink-btn ghost" style={{ height: 42, padding: "0 20px", fontSize: 14 }}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ padding: "14px 16px", border: "1.5px solid var(--danger)", background: "rgba(180,40,40,0.04)", fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink)", lineHeight: 1.6 }}>
                  <strong>Freezing halts every agent spend within one block.</strong> Use it the moment
                  something looks wrong. On a live wallet the freeze is enforced on-chain by the Aiken
                  validator, and only you, the owner, can resume.
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setFrozen(true); setModal(null); showToast("Wallet frozen. All agent spending is halted."); }}
                    className="ink-btn" style={{ flex: 1, height: 42, fontSize: 14, background: "var(--danger)", borderColor: "var(--danger)" }}>
                    <Icon.freeze size={15} color="var(--paper)"/> Freeze now
                  </button>
                  <button onClick={() => setModal(null)} className="ink-btn ghost" style={{ height: 42, padding: "0 20px", fontSize: 14 }}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      <Toast msg={toast}/>
    </div>
  );
}

/* ═══════════════════════════════ SIDEBAR ════════════════════════════════════ */
function Sidebar({ activePage, navigateTo, wallet, agentState, setModal, showToast, workspaceName, setWorkspaceName }) {
  const deployed = agentState?.data?.deployed && agentState?.data?.funded;
  const [editingName, setEditingName] = useStateD(false);
  const [draftName, setDraftName] = useStateD(workspaceName);

  function saveName() {
    const next = draftName.trim();
    if (next) setWorkspaceName(next);
    else setDraftName(workspaceName);
    setEditingName(false);
  }

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
            {editingName ? (
              <input
                autoFocus
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                onBlur={saveName}
                onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setDraftName(workspaceName); setEditingName(false); } }}
                maxLength={32}
                style={{ width: "100%", font: "16px var(--display)", border: "1.5px solid var(--accent)", background: "var(--paper)", color: "var(--ink)", padding: "1px 5px", outline: 0 }}
              />
            ) : (
              <button
                onClick={() => { setDraftName(workspaceName); setEditingName(true); }}
                title="Rename workspace"
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--ink)", maxWidth: "100%" }}
              >
                <span className="display" style={{ fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{workspaceName}</span>
                <span style={{ color: "var(--ink-4)", fontSize: 11, flexShrink: 0 }}>✎</span>
              </button>
            )}
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
function Main({ activePage, navigateTo, frozen, setFrozen, wallet, showChat, setShowChat, agentState, setModal, showToast, policy, setPolicy }) {
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
            onClick={() => setModal("freeze")}
            className="ink-btn"
            style={{
              height: 38, fontSize: 13, padding: "0 14px",
              background: frozen ? "var(--danger)" : "var(--ink)",
              borderColor: frozen ? "var(--danger)" : "var(--ink)",
              boxShadow: "2px 2px 0 var(--ink)",
            }}
          >
            <Icon.freeze size={13} color="var(--paper)"/>
            {frozen ? "Frozen · Resume" : "Emergency freeze"}
          </button>
        </div>
      </div>

      {/* Page content */}
      {activePage === "overview"  && <OverviewPage  frozen={frozen} wallet={wallet} agentState={agentState} navigateTo={navigateTo}/>}
      {activePage === "approvals" && <ApprovalsPage agentState={agentState} showToast={showToast}/>}
      {activePage === "rules"     && <RulesPage     agentState={agentState} showToast={showToast} policy={policy} setPolicy={setPolicy} frozen={frozen} setFrozen={setFrozen} setModal={setModal}/>}
      {activePage === "whitelist" && <WhitelistPage agentState={agentState} showToast={showToast} policy={policy} setPolicy={setPolicy}/>}
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
    ? "all agent spends halted, emergency freeze active"
    : ad?.funded ? `${ad.scriptAddress?.slice(0, 20)}… · Preview testnet`
    : wallet.connected ? `${wallet.addrShort} · operator wallet`
    : "connect wallet or deploy a contract to begin";

  const spentAda    = rules?.windowSpentAda ?? null;
  const dailyCapAda = rules?.dailyCapAda ?? null;
  const pctUsed     = rules?.pctUsed ?? 0;
  const txCount     = ad?.funded ? (ad.txCount ?? 0) : wallet.txCount;

  let resetLabel = "rolling window";
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
            {primaryAda != null ? `₳ ${fmtAda(primaryAda)}` : "₳ ·"}
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
            {spentAda != null ? `₳ ${fmtAda(spentAda)}` : "·"}
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
          <div className="display" style={{ fontSize: 40, lineHeight: 1 }}>{txCount != null ? txCount.toLocaleString() : "·"}</div>
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
  const approvals = useApprovals();
  const count = approvals.pending.length;
  const hasItems = count > 0;
  const next = approvals.pending[0];

  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "4px 4px 0 var(--ink)" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)", fontSize: 9 }}>Approvals queue</div>
          <div className="display" style={{ fontSize: 18, lineHeight: 1.1, marginTop: 2 }}>
            {hasItems ? `${count} pending` : "0 pending"}
          </div>
        </div>
        <ViewAllBtn onClick={() => navigateTo("approvals")}/>
      </div>
      <div style={{ padding: "20px 18px 22px", textAlign: hasItems ? "left" : "center" }}>
        {hasItems ? (
          <div>
            <div className="display" style={{ fontSize: 20, color: "var(--ink)", marginBottom: 4 }}>
              ₳ {fmtAda(next.ada)}
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6 }}>
              → {shortenAddr(next.toAddress)}
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45, marginBottom: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {next.reason || "·"}
            </div>
            <button onClick={() => navigateTo("approvals")} className="ink-btn" style={{
              height: 36, padding: "0 16px", fontSize: 13, boxShadow: "2px 2px 0 var(--ink)", width: "100%",
            }}>Review & decide →</button>
          </div>
        ) : (
          <div>
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
        )}
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
          { name: "per_tx_cap", val: live ? `₳ ${fmtAda(r.perTxCapAda)}` : "·", on: live },
          { name: "daily_cap",  val: live ? `₳ ${fmtAda(r.dailyCapAda)}` : "·",  on: live },
          { name: "freeze",     val: live ? (r.isFrozen ? "FROZEN" : "active") : "·", on: live && !r.isFrozen },
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

// Deterministic pseudo-random float [0, 1) from a string.
// Prevents bar heights from flickering on every re-render.
function hashToFloat(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return (h >>> 0) / 0xFFFFFFFF;
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
        const barH = 8 + hashToFloat(tx.tx_hash) * 18;
        return <rect key={tx.tx_hash} x={x + 1} y={h * 0.9 - barH} width={barW} height={barH} fill="var(--ink)" opacity="0.6"/>;
      })}
      <text x="4" y="10" fontSize="8" fontFamily="var(--mono)" fill="var(--accent)">{txs.length} TXS</text>
    </svg>
  );
}

/* ═══════════════════════════ PAGE: APPROVALS ════════════════════════════════ */

const APPROVALS_API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://localhost:3001/api/approvals"
  : "/api/approvals";

function useApprovals() {
  const [state, setStateD] = useStateD({ loading: true, pending: [], all: [], persistent: false, error: null });

  async function refresh() {
    try {
      const res  = await fetch(APPROVALS_API);
      const data = await res.json();
      setStateD({
        loading:    false,
        pending:    Array.isArray(data.pending) ? data.pending : [],
        all:        Array.isArray(data.all)     ? data.all     : [],
        persistent: Boolean(data.persistent),
        error:      null,
      });
    } catch (err) {
      setStateD(s => ({ ...s, loading: false, error: err.message }));
    }
  }

  async function create({ toAddress, ada, reason }) {
    const res = await fetch(APPROVALS_API, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ toAddress, ada, reason }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
    await refresh();
    return res.json();
  }

  async function decide(id, status, txHash) {
    const res = await fetch(`${APPROVALS_API}?id=${encodeURIComponent(id)}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status, txHash }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
    await refresh();
    return res.json();
  }

  async function remove(id) {
    const res = await fetch(`${APPROVALS_API}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
    await refresh();
  }

  useEffectD(() => {
    refresh();
    const id = setInterval(refresh, 15_000); // re-poll twice a minute
    return () => clearInterval(id);
  }, []);

  return { ...state, refresh, create, decide, remove };
}

function ApprovalsPage({ agentState, showToast }) {
  const ad        = agentState?.data;
  const live      = ad?.funded;
  const approvals = useApprovals();
  const pending   = approvals.pending;
  const history   = approvals.all.filter(a => a.status !== "pending").slice(0, 8);
  const [showQueueForm, setShowQueueForm] = useStateD(false);

  async function onApprove(entry) {
    try {
      await approvals.decide(entry.id, "approved");
      showToast(`Marked approved. Run approveSpend(lucid, wallet, "${entry.id.slice(0, 8)}…") to co-sign on-chain.`);
    } catch (err) { showToast(`Error: ${err.message}`); }
  }
  async function onReject(entry) {
    try {
      await approvals.decide(entry.id, "rejected");
      showToast("Marked rejected. No on-chain effect.");
    } catch (err) { showToast(`Error: ${err.message}`); }
  }
  async function onClear(entry) {
    try { await approvals.remove(entry.id); } catch (err) { showToast(`Error: ${err.message}`); }
  }

  return (
    <div>
      {/* Info banner */}
      <div style={{
        padding: "16px 20px", border: "1.5px solid var(--ink)", background: "var(--paper-2)",
        display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 24,
      }}>
        <Icon.bell size={18}/>
        <div style={{ flex: 1 }}>
          <div className="display" style={{ fontSize: 16, marginBottom: 4 }}>How approvals work</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55, maxWidth: 700 }}>
            When your AI agent requests a spend above the <strong>per-tx cap</strong>, the transaction is paused and queued here.
            The owner co-signs to release it on-chain, satisfying the Aiken validator's owner-signature check.
            Rejected items are discarded with no on-chain effect.
          </div>
        </div>
        <span className="mono" style={{
          fontSize: 9, letterSpacing: "0.14em",
          padding: "4px 8px", border: `1.5px solid ${approvals.persistent ? "var(--ok)" : "var(--ink-4)"}`,
          color: approvals.persistent ? "var(--ok)" : "var(--ink-4)",
          textTransform: "uppercase", whiteSpace: "nowrap",
        }}>
          {approvals.persistent ? "Persisted · KV" : "In-memory only"}
        </span>
      </div>

      {/* Queue */}
      <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)", marginBottom: 24 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="smallcaps" style={{ color: "var(--accent)", fontSize: 9 }}>Pending approvals</div>
            <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>
              {pending.length === 0
                ? "0 awaiting your decision"
                : `${pending.length} awaiting your decision`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={() => setShowQueueForm(true)}
              style={{
                padding: "8px 14px", border: "1.5px solid var(--ink)", background: "var(--paper-2)",
                fontFamily: "var(--serif)", fontSize: 13, cursor: "pointer", color: "var(--ink)",
              }}
            >+ Simulate request</button>
            <span className="stamp" style={{
              borderColor: pending.length === 0 ? "var(--ok)" : "var(--accent)",
              color:       pending.length === 0 ? "var(--ok)" : "var(--accent)",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: pending.length === 0 ? "var(--ok)" : "var(--accent)" }}/>
              {pending.length === 0 ? "CLEAR" : `${pending.length} PENDING`}
            </span>
          </div>
        </div>

        {approvals.loading ? (
          <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--ink-3)", fontFamily: "var(--serif)" }}>
            Loading queue…
          </div>
        ) : pending.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <div className="hand" style={{ fontSize: 40, color: "var(--ok)", marginBottom: 12 }}>All clear ✓</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 16, color: "var(--ink-3)", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
              No pending approvals right now. When your agent tries to spend above the
              {live ? ` ₳${fmtAda(ad.rules.perTxCapAda)} ` : " "}per-tx cap, the request will appear here.
            </div>
          </div>
        ) : (
          <div>
            {pending.map((entry, i) => (
              <ApprovalRow
                key={entry.id}
                entry={entry}
                last={i === pending.length - 1}
                onApprove={() => onApprove(entry)}
                onReject={() => onReject(entry)}
              />
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", marginBottom: 24 }}>
          <div style={{ padding: "12px 18px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="smallcaps" style={{ color: "var(--accent)", fontSize: 9 }}>Recent decisions</div>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{history.length} item{history.length === 1 ? "" : "s"}</span>
          </div>
          {history.map((entry, i) => (
            <div key={entry.id} style={{
              display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 14, alignItems: "center",
              padding: "12px 18px", borderBottom: i < history.length - 1 ? "1px solid var(--paper-3)" : "none",
            }}>
              <span className="mono" style={{
                fontSize: 9, padding: "3px 7px",
                background: entry.status === "approved" ? "var(--ok)" : "var(--ink-4)",
                color: "var(--paper)", letterSpacing: "0.12em",
              }}>{entry.status.toUpperCase()}</span>
              <div>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink)" }}>{shortenAddr(entry.toAddress)}</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 12, color: "var(--ink-3)" }}>{entry.reason || "·"}</div>
              </div>
              <div className="display" style={{ fontSize: 16, color: "var(--ink)" }}>₳ {fmtAda(entry.ada)}</div>
              <button onClick={() => onClear(entry)} title="Remove" style={{
                background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-4)", fontSize: 18, lineHeight: 1, padding: 0,
              }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Simulate-request modal */}
      {showQueueForm && (
        <QueueRequestModal
          defaultPerTxCap={live ? ad.rules.perTxCapAda : 500}
          onClose={() => setShowQueueForm(false)}
          onSubmit={async (payload) => {
            try {
              await approvals.create(payload);
              showToast(`Spend of ₳${fmtAda(payload.ada)} queued for owner approval.`);
              setShowQueueForm(false);
            } catch (err) { showToast(`Error: ${err.message}`); }
          }}
        />
      )}

      {/* Where this connects to the agent */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "16px 20px", border: "1.5px solid var(--ink)", background: "var(--paper-2)" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5, maxWidth: 620 }}>
          Your agent queues above-cap spends automatically; approving here releases them with an owner
          co-signature. The exact SDK calls your agent uses are documented in the repo.
        </div>
        <button onClick={() => window.open(GITHUB_URL, "_blank")} className="ink-btn ghost" style={{ height: 36, padding: "0 16px", fontSize: 13, boxShadow: "2px 2px 0 var(--ink)", flexShrink: 0 }}>
          <Icon.github size={14}/> SDK reference
        </button>
      </div>
    </div>
  );
}

function ApprovalRow({ entry, last, onApprove, onReject }) {
  const ageMin = Math.max(1, Math.floor((Date.now() - entry.requestedAt) / 60_000));
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto auto",
      gap: 16, alignItems: "center",
      padding: "18px 20px",
      borderBottom: last ? "none" : "1px solid var(--paper-3)",
    }}>
      <div style={{
        width: 44, height: 44, border: "1.5px solid var(--accent)",
        background: "var(--paper-2)",
        display: "grid", placeItems: "center",
      }}>
        <Icon.bell size={18} color="var(--accent)"/>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 2 }}>
          <span className="display" style={{ fontSize: 20, color: "var(--ink)" }}>
            ₳ {fmtAda(entry.ada)}
          </span>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
            → {shortenAddr(entry.toAddress)}
          </span>
        </div>
        <div style={{
          fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-2)",
          lineHeight: 1.4, marginBottom: 4,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {entry.reason || <span style={{ color: "var(--ink-4)" }}>no reason provided</span>}
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.06em" }}>
          REQUESTED {ageMin}M AGO · ID {entry.id.slice(0, 8)}
        </div>
      </div>
      <button
        onClick={onReject}
        style={{
          padding: "8px 14px", border: "1.5px solid var(--ink)",
          background: "var(--paper)", fontFamily: "var(--serif)", fontSize: 13,
          cursor: "pointer", color: "var(--ink)",
        }}
      >Reject</button>
      <button
        onClick={onApprove}
        style={{
          padding: "8px 16px", border: "1.5px solid var(--ink)",
          background: "var(--ok)", color: "var(--paper)",
          fontFamily: "var(--serif)", fontSize: 13, cursor: "pointer",
          boxShadow: "2px 2px 0 var(--ink)",
        }}
      >Approve</button>
    </div>
  );
}

function QueueRequestModal({ defaultPerTxCap, onClose, onSubmit }) {
  const suggestedAda = Math.max(50, Math.round((defaultPerTxCap || 500) * 1.4));
  const [toAddress, setToAddress] = useStateD("addr_test1qz0rxk3kxhg9p6jufv5w8ucz3kc9w8aqxhag7rmllz2lqujkv57hl3rxk7w4qx6xrpzzdz4kqdwh7s3cunucy0rfmxq49v8w8");
  const [ada,       setAda]       = useStateD(String(suggestedAda));
  const [reason,    setReason]    = useStateD("Pay invoice #42, Acme Corp cloud bill");

  function submit(e) {
    e.preventDefault();
    const num = Number(ada);
    if (!toAddress.trim()) return;
    if (!Number.isFinite(num) || num <= 0) return;
    onSubmit({ toAddress: toAddress.trim(), ada: num, reason: reason.trim() });
  }

  return (
    <Modal title="Queue an above-cap spend" onClose={onClose}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <p style={{ fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55, margin: 0 }}>
          This simulates what your agent's SDK would do when a spend exceeds the per-tx cap.
          The entry goes into the persistent queue and waits for owner co-signature.
        </p>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="smallcaps" style={{ fontSize: 10, color: "var(--ink-3)" }}>Destination address</span>
          <input
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            placeholder="addr_test1…"
            className="mono"
            style={{
              padding: "10px 12px", border: "1.5px solid var(--ink)", background: "var(--paper-2)",
              fontSize: 12, color: "var(--ink)",
            }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="smallcaps" style={{ fontSize: 10, color: "var(--ink-3)" }}>Amount (ADA)</span>
          <input
            type="number" min="0.1" step="0.1" value={ada}
            onChange={(e) => setAda(e.target.value)}
            className="mono"
            style={{
              padding: "10px 12px", border: "1.5px solid var(--ink)", background: "var(--paper-2)",
              fontSize: 14, color: "var(--ink)",
            }}
          />
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-4)" }}>
            Per-tx cap is ₳{fmtAda(defaultPerTxCap)}. Anything above will queue here.
          </span>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="smallcaps" style={{ fontSize: 10, color: "var(--ink-3)" }}>Reason</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What is this spend for?"
            style={{
              padding: "10px 12px", border: "1.5px solid var(--ink)", background: "var(--paper-2)",
              fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink)",
            }}
          />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 6 }}>
          <button type="button" onClick={onClose} style={{
            padding: "10px 18px", border: "1.5px solid var(--ink-4)", background: "var(--paper)",
            fontFamily: "var(--serif)", fontSize: 14, cursor: "pointer", color: "var(--ink-3)",
          }}>Cancel</button>
          <button type="submit" className="ink-btn" style={{
            height: 40, padding: "0 18px", fontSize: 14, boxShadow: "2px 2px 0 var(--ink)",
          }}>Add to queue</button>
        </div>
      </form>
    </Modal>
  );
}

/* ═══════════════════════════ PAGE: RULES ════════════════════════════════════ */
function RulesPage({ agentState, showToast, policy, setPolicy, frozen, setFrozen, setModal }) {
  const ad   = agentState?.data;
  const live = ad?.funded && ad?.rules;
  const r    = ad?.rules;

  // Draft values bound to the form inputs.
  const [perTx, setPerTx] = useStateD(String(policy.perTxCapAda));
  const [daily, setDaily] = useStateD(String(policy.dailyCapAda));

  const dirty = String(policy.perTxCapAda) !== perTx || String(policy.dailyCapAda) !== daily;
  const effectiveFrozen = frozen || (live && r.isFrozen);

  function save() {
    const p = Number(perTx), d = Number(daily);
    if (!Number.isFinite(p) || p <= 0) { showToast("Per-transaction cap must be greater than zero."); return; }
    if (!Number.isFinite(d) || d <= 0) { showToast("Daily cap must be greater than zero."); return; }
    setPolicy(prev => ({ ...prev, perTxCapAda: p, dailyCapAda: d }));
    showToast(live ? "Policy saved. Apply on-chain to enforce it." : "Guardrails saved. They apply when you deploy the wallet.");
  }

  return (
    <div>
      {/* Configure guardrails (front-end form) */}
      <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)", marginBottom: 24 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="smallcaps" style={{ color: "var(--accent)", fontSize: 9 }}>Spending guardrails</div>
            <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>
              {live ? "Enforced on chain" : "Set your limits"}
            </div>
          </div>
          <span className="stamp" style={{ borderColor: live ? "var(--ok)" : "var(--ink-4)", color: live ? "var(--ok)" : "var(--ink-4)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: live ? "var(--ok)" : "var(--ink-4)" }}/>
            {live ? "ON-CHAIN" : "DRAFT"}
          </span>
        </div>

        <div style={{ padding: "22px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
          <CapField
            label="Per-transaction cap"
            hint="The most the agent can move in a single transaction. Anything larger pauses for your approval."
            value={perTx}
            onChange={setPerTx}
            live={live}
            liveVal={live ? r.perTxCapAda : null}
          />
          <CapField
            label="Rolling 24h cap"
            hint="The most the agent can spend across a rolling 24-hour window. Resets automatically."
            value={daily}
            onChange={setDaily}
            live={live}
            liveVal={live ? r.dailyCapAda : null}
          />
        </div>

        {live && (
          <div style={{ padding: "0 20px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", border: "1.5px solid var(--paper-3)", background: "var(--paper-2)" }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--accent)" }}>Spent this window</span>
              <span className="display" style={{ fontSize: 18, color: r.pctUsed > 80 ? "var(--danger)" : "var(--ink)" }}>₳ {fmtAda(r.windowSpentAda)}</span>
              <span style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)" }}>of ₳ {fmtAda(r.dailyCapAda)} ({r.pctUsed}%)</span>
              <div style={{ flex: 1, height: 6, background: "var(--paper-3)", border: "1px solid var(--ink-4)", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, width: `${r.pctUsed}%`, background: r.pctUsed > 80 ? "var(--danger)" : "var(--ink-4)" }}/>
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: "16px 20px", borderTop: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5 }}>
            {live
              ? "Saving updates your working policy. Applying on-chain requires your owner signature, so only you can change a live wallet's rules."
              : "Saved here as your working policy. It is written into the contract datum when you deploy the wallet."}
          </div>
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <button onClick={save} disabled={!dirty} className="ink-btn" style={{ height: 38, padding: "0 18px", fontSize: 13, boxShadow: "2px 2px 0 var(--ink)", opacity: dirty ? 1 : 0.5 }}>
              Save policy
            </button>
            {live && (
              <button onClick={() => setModal("api")} className="ink-btn ghost" style={{ height: 38, padding: "0 16px", fontSize: 13, boxShadow: "2px 2px 0 var(--ink)" }}>
                Apply on-chain
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Emergency freeze */}
      <div style={{ border: `1.5px solid ${effectiveFrozen ? "var(--danger)" : "var(--ink)"}`, background: "var(--paper)", padding: "20px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
        <div style={{ maxWidth: 620 }}>
          <div className="smallcaps" style={{ color: effectiveFrozen ? "var(--danger)" : "var(--accent)", marginBottom: 6, fontSize: 10 }}>Emergency freeze</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55 }}>
            {effectiveFrozen
              ? "The wallet is frozen. Every agent spend is halted until you resume it."
              : "Halt every agent spend in a single block. Use this the moment something looks wrong; you can resume at any time."}
          </div>
        </div>
        <button
          onClick={() => setModal("freeze")}
          className="ink-btn"
          style={{ height: 42, padding: "0 20px", fontSize: 14, flexShrink: 0, background: effectiveFrozen ? "var(--danger)" : "var(--ink)", borderColor: effectiveFrozen ? "var(--danger)" : "var(--ink)", boxShadow: "2px 2px 0 var(--ink)" }}
        >
          <Icon.freeze size={15} color="var(--paper)"/>
          {effectiveFrozen ? "Resume wallet" : "Freeze wallet"}
        </button>
      </div>
    </div>
  );
}

function CapField({ label, hint, value, onChange, live, liveVal }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5, marginBottom: 10, minHeight: 38 }}>{hint}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1.5px solid var(--ink)", background: "var(--paper-2)", padding: "0 12px", height: 44 }}>
        <span className="display" style={{ fontSize: 20, color: "var(--ink-3)" }}>₳</span>
        <input
          type="number" min="0.1" step="0.1" value={value}
          onChange={e => onChange(e.target.value)}
          className="display"
          style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 24, color: "var(--ink)", width: "100%" }}
        />
      </div>
      {live && liveVal != null && (
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 6 }}>
          LIVE ON-CHAIN: ₳ {fmtAda(liveVal)}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ PAGE: WHITELIST ════════════════════════════════ */
function WhitelistPage({ agentState, showToast, policy, setPolicy }) {
  const ad    = agentState?.data;
  const live  = ad?.funded && ad?.rules;
  const list  = policy.whitelist ?? [];
  const [addInput, setAddInput] = useStateD("");

  function handleAdd() {
    const addr = addInput.trim();
    if (!addr) return;
    if (!addr.startsWith("addr_test1")) { showToast("Enter a valid Preview testnet address (addr_test1…)."); return; }
    if (list.includes(addr)) { showToast("That address is already on the list."); setAddInput(""); return; }
    setPolicy(prev => ({ ...prev, whitelist: [...(prev.whitelist ?? []), addr] }));
    setAddInput("");
    showToast(live ? "Added. Apply on-chain to register it with the validator." : "Address added to your trusted list.");
  }

  function handleRemove(addr) {
    setPolicy(prev => ({ ...prev, whitelist: (prev.whitelist ?? []).filter(a => a !== addr) }));
    showToast("Address removed from your trusted list.");
  }

  return (
    <div>
      {/* Header */}
      <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)", marginBottom: 24 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="smallcaps" style={{ color: "var(--accent)", fontSize: 9 }}>Trusted addresses</div>
            <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>
              {list.length} address{list.length !== 1 ? "es" : ""} trusted
            </div>
          </div>
          <span className="stamp" style={{ borderColor: live ? "var(--ok)" : "var(--ink-4)", color: live ? "var(--ok)" : "var(--ink-4)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: live ? "var(--ok)" : "var(--ink-4)" }}/>
            {live ? "ON-CHAIN" : "DRAFT"}
          </span>
        </div>

        <div style={{ padding: "18px 20px" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55, marginBottom: 16 }}>
            Addresses on this list bypass the per-transaction cap and settle straight away, with no
            approval queue. Use it for counterparties you already trust, like a DEX or your own treasury.
          </div>

          {/* Add row */}
          <div style={{ display: "flex", gap: 10, marginBottom: list.length ? 18 : 0 }}>
            <input
              value={addInput}
              onChange={e => setAddInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
              placeholder="addr_test1..."
              style={{ flex: 1, height: 40, padding: "0 12px", border: "1.5px solid var(--ink)", background: "var(--paper-2)", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink)", outline: 0 }}
            />
            <button onClick={handleAdd} className="ink-btn" style={{ height: 40, padding: "0 18px", fontSize: 13, boxShadow: "2px 2px 0 var(--ink)" }}>
              <Icon.plus size={13} color="var(--paper)"/> Add address
            </button>
          </div>

          {/* List */}
          {list.length > 0 && (
            <div style={{ border: "1.5px solid var(--ink)" }}>
              {list.map((addr, i) => (
                <div key={addr} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                  borderBottom: i < list.length - 1 ? "1px solid var(--paper-3)" : "none",
                  background: "var(--paper)",
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ok)", border: "1.5px solid var(--ink)", flexShrink: 0 }}/>
                  <span className="mono" style={{ flex: 1, fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{addr}</span>
                  <button onClick={() => handleRemove(addr)} title="Remove" style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-4)", fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: "14px 20px", borderTop: "1.5px solid var(--ink)", background: "var(--paper-2)", fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5 }}>
          {live
            ? "This is your working list. Registering it with the validator takes an owner-signed transaction, so a compromised agent can never widen its own whitelist."
            : "Saved as your working list. It is written into the contract when you deploy the wallet."}
        </div>
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
            {ad?.funded ? "LIVE · POLLING EVERY 30s" : "WAITING FOR CONTRACT"}
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
            <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-4)", lineHeight: 1.6, maxWidth: 460, margin: "0 auto" }}>
              No activity yet. Once your agent makes its first spend, it appears here within the next poll.
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
    { who: "beni", text: "Hi! I'm Beni, your on-chain wallet guardian. Connect a wallet above to see your live balance, or ask me anything about how Beni's guardrails work." },
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
        text: `Wallet connected: ${wallet.addrShort}. Balance: ₳ ${fmtAda(wallet.balanceAda)} · ${wallet.txCount} transactions. To activate guardrails, deploy an agent wallet with the SDK.`,
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
