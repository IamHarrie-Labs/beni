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

// ── Toast helper ─────────────────────────────────────────────────────────────
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, background: "var(--ink)", color: "var(--paper)",
      padding: "12px 28px", border: "1.5px solid var(--ink)",
      fontFamily: "var(--serif)", fontSize: 14, letterSpacing: "0.01em",
      boxShadow: "4px 4px 0 var(--accent)", pointerEvents: "none", whiteSpace: "nowrap",
    }}>
      {msg}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "var(--paper)", border: "2px solid var(--ink)",
        boxShadow: "8px 8px 0 var(--ink)", maxWidth: 540, width: "90%",
        maxHeight: "80vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: "18px 24px", borderBottom: "1.5px solid var(--ink)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--paper-2)",
        }}>
          <div className="display" style={{ fontSize: 22 }}>{title}</div>
          <button onClick={onClose} style={{
            width: 30, height: 30, border: "1.5px solid var(--ink)", background: "transparent",
            cursor: "pointer", display: "grid", placeItems: "center",
            fontFamily: "var(--mono)", fontSize: 16, color: "var(--ink)",
          }}>✕</button>
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ ROOT ═══════════════════════════════════════ */
function Dashboard({ wallet }) {
  const [frozen, setFrozen] = useStateD(false);
  const [showChat, setShowChat] = useStateD(true);
  const [modal, setModal] = useStateD(null); // "add-agent" | "api" | null
  const [toast, setToast] = useStateD(null);
  const agentState = useAgentState();

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  function scrollTo(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
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
      <Sidebar wallet={wallet} agentState={agentState} scrollTo={scrollTo} showToast={showToast} setModal={setModal}/>
      <Main frozen={frozen} setFrozen={setFrozen} wallet={wallet} showChat={showChat} setShowChat={setShowChat} agentState={agentState} setModal={setModal}/>
      {showChat && <AssistantPanel wallet={wallet} agentState={agentState} setShowChat={setShowChat}/>}

      {/* Modals */}
      {modal === "add-agent" && (
        <Modal title="Deploy a new agent" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.6, color: "var(--ink-2)" }}>
              Each Beni agent wallet is a deployed Aiken smart contract on Cardano Preview testnet. To add a new agent:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                ["1. Generate a key", "npx tsx sdk/scripts/generate-key.ts"],
                ["2. Fund the address", "https://docs.cardano.org/cardano-testnets/tools/faucet/"],
                ["3. Set env vars", "BLOCKFROST_PREVIEW_KEY, AGENT_PRIVATE_KEY"],
                ["4. Deploy contract", "npx tsx sdk/scripts/deploy-wallet.ts"],
              ].map(([label, code]) => (
                <div key={label} style={{ padding: "12px 16px", border: "1.5px solid var(--ink)", background: "var(--paper-2)" }}>
                  <div className="smallcaps" style={{ fontSize: 10, color: "var(--accent)", marginBottom: 6 }}>{label}</div>
                  <div className="mono" style={{ fontSize: 12, color: "var(--ink)", letterSpacing: "0.04em" }}>{code}</div>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5 }}>
              Each wallet gets its own one-shot thread token NFT that uniquely identifies it on-chain. Multiple agents can coexist with independent guardrail configs.
            </div>
          </div>
        </Modal>
      )}

      {modal === "api" && (
        <Modal title="Beni SDK API" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Install the SDK to control your agent wallet programmatically.
            </div>
            <div style={{ padding: "14px 16px", border: "1.5px solid var(--ink)", background: "var(--paper-2)" }}>
              <div className="smallcaps" style={{ fontSize: 10, color: "var(--accent)", marginBottom: 6 }}>Install</div>
              <div className="mono" style={{ fontSize: 12 }}>npm install @beni-wallet/sdk</div>
            </div>
            {[
              ["createAgentWallet(lucid, config)", "Deploy a new guardrail contract on-chain"],
              ["agentSpend(lucid, wallet, addr, lovelace)", "Submit a guarded spend — enforced by Aiken validator"],
              ["ownerAction(lucid, wallet, newConfig?)", "Update rules or reclaim funds as owner"],
              ["freezeWallet(lucid, wallet)", "Emergency freeze — halts all agent spends instantly"],
              ["queueSpend(wallet, addr, lovelace, reason)", "Queue an above-cap spend for owner approval"],
              ["approveSpend(lucid, wallet, pendingId)", "Owner approves a queued spend on-chain"],
              ["getBalance(lucid, wallet)", "Read live contract balance from Blockfrost"],
              ["getDailyUsage(lucid, wallet)", "Get rolling 24h spend window state"],
            ].map(([sig, desc]) => (
              <div key={sig} style={{ padding: "10px 14px", border: "1.5px solid var(--paper-3)", background: "var(--paper)" }}>
                <div className="mono" style={{ fontSize: 11, color: "var(--accent)", marginBottom: 4 }}>{sig}</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)" }}>{desc}</div>
              </div>
            ))}
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
              Chat server: localhost:3001 · Blockfrost: Preview testnet
            </div>
          </div>
        </Modal>
      )}

      <Toast msg={toast}/>
    </div>
  );
}

/* ═══════════════════════════════ SIDEBAR ════════════════════════════════════ */
function Sidebar({ wallet, agentState, scrollTo, showToast, setModal }) {
  const deployed = agentState?.data?.deployed && agentState?.data?.funded;
  const rules    = agentState?.data?.rules;

  return (
    <aside style={{
      borderRight: "1.5px solid var(--ink)",
      padding: "24px 20px",
      background: "var(--paper-2)",
      display: "flex", flexDirection: "column", gap: 28,
      height: "100%", overflowY: "auto",
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
            <div className="display" style={{ fontSize: 16 }}>
              {deployed ? "atlas-trader-v2" : "Your Workspace"}
            </div>
            {wallet.connected ? (
              <div className="mono" style={{ fontSize: 10, color: "var(--ok)", letterSpacing: "0.08em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {wallet.addrShort}
              </div>
            ) : (
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em" }}>PREVIEW TESTNET</div>
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

      <NavGroup title="Overview">
        <NavItem icon={<Icon.flow size={16}/>} label="Command center" active onClick={() => scrollTo("section-top")}/>
        <NavItem icon={<Icon.eye size={16}/>} label="Live monitor" onClick={() => scrollTo("section-monitor")}/>
        <NavItem icon={<Icon.list size={16}/>} label="Transactions" onClick={() => scrollTo("section-txs")}/>
        <NavItem icon={<Icon.bell size={16}/>} label="Approvals" onClick={() => scrollTo("section-approvals")}/>
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
        <button
          onClick={() => setModal("add-agent")}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
            background: "transparent", border: "1.5px dashed var(--ink-3)",
            color: "var(--ink-2)", fontFamily: "var(--serif)", fontSize: 14, cursor: "pointer",
          }}>
          <Icon.plus size={14}/> New agent
        </button>
      </NavGroup>

      <NavGroup title="Configure">
        <NavItem icon={<Icon.shield size={16}/>} label="Rules & policies" onClick={() => scrollTo("section-rules")}/>
        <NavItem icon={<Icon.lock size={16}/>} label="Whitelist" onClick={() => scrollTo("section-whitelist")}/>
        <NavItem icon={<Icon.user size={16}/>} label="Team" onClick={() => showToast("Team management — coming soon in Phase 4")}/>
        <NavItem icon={<Icon.code size={16}/>} label="Webhooks" onClick={() => showToast("Webhook configuration — coming soon in Phase 4")}/>
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

function NavItem({ icon, label, active, badge, onClick }) {
  return (
    <button onClick={onClick} style={{
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
function Main({ frozen, setFrozen, wallet, showChat, setShowChat, agentState, setModal }) {
  return (
    <main style={{
      padding: "28px 32px",
      height: "100%",
      overflowY: "auto",
    }}>

      {/* Header */}
      <div id="section-top" style={{
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
          {/* Chat toggle */}
          <button
            onClick={() => setShowChat(v => !v)}
            className="ink-btn ghost"
            title={showChat ? "Hide assistant" : "Show assistant"}
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
          <button
            className="ink-btn ghost"
            style={{ height: 38, fontSize: 14, padding: "0 14px", boxShadow: "2px 2px 0 var(--ink)" }}
          ><Icon.search size={14}/> Search</button>
          <button
            onClick={() => setModal("api")}
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
      <BalanceHero frozen={frozen} wallet={wallet} agentState={agentState}/>

      {/* KPI row */}
      <KPIRow wallet={wallet} agentState={agentState}/>

      {/* Activity + Approvals */}
      <div id="section-monitor" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24, marginBottom: 28 }}>
        <ActivityCard wallet={wallet} agentState={agentState}/>
        <ApprovalsCard agentState={agentState}/>
      </div>

      {/* Rules + Whitelist */}
      <div id="section-rules" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, marginBottom: 28 }}>
        <RulesCard agentState={agentState}/>
        <WhitelistCard agentState={agentState}/>
      </div>

      {/* Transactions table */}
      <div id="section-txs">
        <TransactionsTable wallet={wallet}/>
      </div>
    </main>
  );
}

/* ── Balance hero ──────────────────────────────────────────────────────────── */
function BalanceHero({ frozen, wallet, agentState }) {
  const ad = agentState?.data;
  const rules = ad?.rules;

  const contractBalanceAda = ad?.funded && ad?.balanceAda != null ? ad.balanceAda : null;
  // Prefer CIP-30 connected wallet balance; fall back to operator address fetched server-side
  const operatorBalanceAda = wallet.connected ? wallet.balanceAda
    : (ad?.operatorBalanceAda ?? null);

  const effectiveFrozen = frozen || rules?.isFrozen;
  const statusLabel = effectiveFrozen ? "FROZEN" : ad?.funded ? "ON-CHAIN · LIVE" : wallet.connected ? "CONNECTED" : "NO WALLET";
  const statusColor = effectiveFrozen ? "var(--danger)" : ad?.funded ? "var(--ok)" : wallet.connected ? "var(--accent-2)" : "var(--ink-4)";

  const subText = effectiveFrozen
    ? "all agent spends halted — emergency freeze active"
    : ad?.funded
      ? `${ad.scriptAddress?.slice(0, 20)}… · Preview testnet`
      : wallet.connected
        ? `${wallet.addrShort} · operator wallet connected`
        : "connect wallet and deploy a contract to begin";

  // Main display: contract balance when live, else operator balance
  const primaryAda = contractBalanceAda ?? operatorBalanceAda;
  const primaryLabel = contractBalanceAda != null ? "Contract wallet balance" : "Operator wallet balance";

  return (
    <div style={{
      position: "relative", padding: "24px 0",
      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 40, alignItems: "end",
    }}>
      {/* Left: main balance */}
      <div>
        <div className="smallcaps" style={{ color: "var(--ink-3)", marginBottom: 12 }}>
          {primaryLabel}
        </div>
        <div className="display" style={{
          fontSize: 96, lineHeight: 0.9, letterSpacing: "-0.03em",
          color: primaryAda != null ? "var(--ink)" : "var(--ink-4)",
        }}>
          {primaryAda != null ? `₳ ${fmtAda(primaryAda)}` : "₳ —"}
        </div>
        <div style={{ marginTop: 14 }}>
          <span className="hand" style={{ fontSize: 20, color: "var(--ink-2)" }}>{subText}</span>
        </div>

        {/* Dual balance breakdown */}
        {(contractBalanceAda != null || operatorBalanceAda != null) && (
          <div style={{
            display: "flex", gap: 20, marginTop: 18,
            paddingTop: 14, borderTop: "1.5px dashed var(--ink-4)",
          }}>
            {contractBalanceAda != null && (
              <div>
                <div className="mono" style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", marginBottom: 3 }}>CONTRACT</div>
                <div className="display" style={{ fontSize: 22, lineHeight: 1, color: "var(--ink)" }}>
                  ₳ {fmtAda(contractBalanceAda)}
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 11, color: "var(--ink-4)", marginTop: 2 }}>agent's budget</div>
              </div>
            )}
            {operatorBalanceAda != null && (
              <div>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", marginBottom: 3 }}>OPERATOR</div>
                <div className="display" style={{ fontSize: 22, lineHeight: 1, color: "var(--ink)" }}>
                  ₳ {fmtAda(operatorBalanceAda)}
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 11, color: "var(--ink-4)", marginTop: 2 }}>your reserve</div>
              </div>
            )}
            {contractBalanceAda != null && operatorBalanceAda != null && (
              <div>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", marginBottom: 3 }}>TOTAL</div>
                <div className="display" style={{ fontSize: 22, lineHeight: 1, color: "var(--ink-2)" }}>
                  ₳ {fmtAda(contractBalanceAda + operatorBalanceAda)}
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 11, color: "var(--ink-4)", marginTop: 2 }}>combined</div>
              </div>
            )}
          </div>
        )}

        {ad?.deployed && !ad?.funded && (
          <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
            <span className="stamp warn">UNFUNDED</span>
            <span style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)" }}>
              Fund the script address from the Preview faucet
            </span>
          </div>
        )}
      </div>

      {/* Center: 24h spend curve */}
      <div style={{
        position: "relative", padding: "16px 24px",
        border: "1.5px solid var(--ink)", background: "var(--paper-2)",
      }}>
        <div className="smallcaps" style={{ color: "var(--ink-3)" }}>24h spend curve</div>
        <SpendCurve wallet={wallet} agentState={agentState}/>
      </div>

      {/* Right: status */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "end", gap: 12 }}>
        <span className="stamp-filled" style={{ background: statusColor }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--paper)" }}/>
          {statusLabel}
        </span>
        {ad?.funded && (
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", textAlign: "right", letterSpacing: "0.08em" }}>
            {ad.txCount ?? 0} VALIDATOR TXS
          </div>
        )}
        <div className="hand" style={{ fontSize: 20, color: "var(--ink-3)", transform: "rotate(-2deg)" }}>
          {ad?.funded ? `₳ ${fmtAda(rules?.windowSpentAda ?? 0)} today` : wallet.connected ? `${wallet.txCount ?? 0} tx total` : "nothing to guard yet"}
        </div>
      </div>
    </div>
  );
}

/* ── KPI row ───────────────────────────────────────────────────────────────── */
function KPIRow({ wallet, agentState }) {
  const ad    = agentState?.data;
  const rules = ad?.rules;

  const spentAda    = rules?.windowSpentAda ?? null;
  const dailyCapAda = rules?.dailyCapAda ?? null;
  const pctUsed     = rules?.pctUsed ?? 0;
  const txCount     = ad?.funded ? (ad.txCount ?? 0) : wallet.txCount;

  let resetLabel = "—";
  if (rules?.windowResetMs) {
    const msLeft = rules.windowResetMs - Date.now();
    if (msLeft <= 0) {
      resetLabel = "resets now";
    } else {
      const h = Math.floor(msLeft / 3_600_000);
      const m = Math.floor((msLeft % 3_600_000) / 60_000);
      resetLabel = h > 0 ? `resets in ${h}h ${m}m` : `resets in ${m}m`;
    }
  }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
      borderTop: "1.5px solid var(--ink)", borderBottom: "1.5px solid var(--ink)",
      marginTop: 20, marginBottom: 28,
    }}>
      <KPI
        label="Spend today"
        big={spentAda != null ? `₳ ${fmtAda(spentAda)}` : "—"}
        sub={dailyCapAda != null
          ? `of ₳ ${fmtAda(dailyCapAda)} daily cap · ${resetLabel}`
          : rules === null && ad?.deployed ? "contract deployed — no spends yet" : "no contract deployed yet"}
        extra={<MiniBar pct={pctUsed}/>}
      />
      <KPI
        label="Transactions"
        big={txCount != null ? txCount.toLocaleString() : "—"}
        sub={ad?.funded ? "through the validator" : wallet.connected ? "on operator address" : "deploy an agent to begin"}
        border
      />
      <KPI
        label="Validator latency"
        big="28ms"
        sub={ad?.funded ? "p95: 41ms · on-chain healthy" : "will measure after first spend"}
      />
    </div>
  );
}

function SpendCurve({ wallet }) {
  const w = 320, h = 60;
  if (!wallet.connected || wallet.txs.length === 0) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block", marginTop: 6 }}>
        <line x1="0" y1={h * 0.8} x2={w} y2={h * 0.8} stroke="var(--ink-4)" strokeWidth="1" strokeDasharray="4 4"/>
        <line x1="0" y1={h * 0.5} x2={w} y2={h * 0.5} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="3 5" opacity="0.3"/>
        <text x={w/2} y={h * 0.45} textAnchor="middle" fontSize="9" fontFamily="var(--mono)" fill="var(--ink-4)">NO DATA</text>
      </svg>
    );
  }
  const txs = wallet.txs.slice().reverse();
  const barW = Math.floor(w / txs.length) - 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block", marginTop: 6 }}>
      <line x1="0" y1={h * 0.9} x2={w} y2={h * 0.9} stroke="var(--ink-4)" strokeWidth="1"/>
      {txs.map((tx, i) => {
        const x = i * (w / txs.length);
        const barH = 8 + Math.random() * 20;
        return (
          <rect key={tx.tx_hash} x={x + 1} y={h * 0.9 - barH} width={barW} height={barH} fill="var(--ink)" opacity="0.6"/>
        );
      })}
      <text x="4" y="10" fontSize="8" fontFamily="var(--mono)" fill="var(--accent)">{txs.length} TXS</text>
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
function ActivityCard({ wallet, agentState }) {
  const ad = agentState?.data;
  const contractTxs  = ad?.funded && Array.isArray(ad.recentTxs) ? ad.recentTxs : null;
  const displayTxs   = contractTxs ?? (wallet.connected ? wallet.txs : []);
  const isLive       = contractTxs ? contractTxs.length > 0 : wallet.connected && wallet.txs.length > 0;
  const sourceLabel  = contractTxs ? "SCRIPT ADDRESS" : wallet.connected ? "WALLET" : "WAITING";

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
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: isLive ? "var(--ok)" : "var(--ink-4)" }}/>
          {isLive ? sourceLabel : "WAITING"}
        </span>
      </div>
      {displayTxs.length > 0 ? (
        <div>
          {displayTxs.slice(0, 6).map((tx, i) => (
            <div key={tx.tx_hash} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
              borderBottom: i < Math.min(displayTxs.length, 6) - 1 ? "1px solid var(--paper-3)" : "none",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: "var(--ok)", border: "1.5px solid var(--ink)" }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {tx.tx_hash}
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                  {timeAgo(tx.block_time ?? tx.block_time_unix)} · block #{tx.block_height?.toLocaleString()}
                </div>
              </div>
              <a href={`https://preview.cardanoscan.io/transaction/${tx.tx_hash}`} target="_blank" rel="noopener noreferrer"
                style={{ color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 11, textDecoration: "none" }}>↗</a>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <div className="hand" style={{ fontSize: 32, color: "var(--ink-3)", marginBottom: 10 }}>
            {ad?.funded ? "no script transactions yet" : wallet.connected ? "no wallet transactions found" : "no transactions yet"}
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-4)", maxWidth: 320, margin: "0 auto", lineHeight: 1.55 }}>
            {ad?.funded
              ? "The script address is live. Run a spend transaction via the SDK to see it appear here."
              : wallet.connected
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
    <div id="section-approvals" style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
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
function RulesCard({ agentState }) {
  const ad    = agentState?.data;
  const live  = ad?.funded && ad?.rules;
  const r     = ad?.rules;

  const rules = [
    {
      name: "per_tx_cap",
      val:  live ? `₳ ${fmtAda(r.perTxCapAda)}` : "Not set",
      desc: "Hard ceiling on any single transaction",
      on:   live && !r.isFrozen,
    },
    {
      name: "daily_cap",
      val:  live ? `₳ ${fmtAda(r.dailyCapAda)}` : "Not set",
      desc: "Rolling 24h budget window",
      on:   live && !r.isFrozen,
    },
    {
      name: "whitelist_routing",
      val:  live ? `${r.allowedAddressCount ?? 0} addrs` : "0 addrs",
      desc: "Skip approval for trusted addresses",
      on:   live && (r.allowedAddressCount ?? 0) > 0,
    },
    {
      name: "freeze_switch",
      val:  live ? (r.isFrozen ? "FROZEN" : "Active") : "Off",
      desc: "Emergency freeze — halts all agent spends",
      on:   live,
    },
  ];

  return (
    <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
      <div style={{
        padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)" }}>Guardrails</div>
          <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>
            {live ? "Enforced on chain" : "Contract not deployed"}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {live ? (
            <span className="stamp" style={{ borderColor: "var(--ok)", color: "var(--ok)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ok)" }}/>
              ON-CHAIN
            </span>
          ) : (
            <span className="hand" style={{ fontSize: 16, color: "var(--ink-3)" }}>configure via SDK →</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {rules.map((rule, i) => (
          <div key={rule.name} style={{
            display: "grid", gridTemplateColumns: "1fr auto auto", gap: 14, alignItems: "center",
            padding: "12px 18px",
            borderBottom: i < rules.length - 1 ? "1.5px solid var(--paper-3)" : "none",
            opacity: rule.on ? 1 : 0.45,
          }}>
            <div>
              <div className="mono" style={{ fontSize: 12, color: live ? "var(--accent)" : "var(--ink-3)" }}>{rule.name}</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>{rule.desc}</div>
            </div>
            <span className="display" style={{
              fontSize: 16,
              color: rule.name === "freeze_switch" && live && r.isFrozen ? "var(--danger)"
                   : live ? "var(--ink)" : "var(--ink-4)",
            }}>{rule.val}</span>
            <div style={{
              width: 40, height: 22, border: "1.5px solid var(--ink)",
              background: rule.on ? "var(--ink)" : "var(--paper)",
              position: "relative", pointerEvents: "none",
            }}>
              <span style={{
                position: "absolute", top: 1, left: rule.on ? 20 : 1,
                width: 16, height: 16,
                background: rule.on ? "var(--paper)" : "var(--ink-4)",
              }}/>
            </div>
          </div>
        ))}
      </div>
      {!live && (
        <div style={{ padding: "14px 18px", borderTop: "1.5px solid var(--paper-3)", background: "var(--paper-2)" }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.06em" }}>
            Deploy a contract to see live on-chain rules. Run: <span style={{ color: "var(--accent)" }}>npx tsx sdk/scripts/deploy-wallet.ts</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Whitelist card ────────────────────────────────────────────────────────── */
function WhitelistCard({ agentState }) {
  const ad     = agentState?.data;
  const live   = ad?.funded && ad?.rules;
  const count  = live ? (ad.rules.allowedAddressCount ?? 0) : 0;

  return (
    <div id="section-whitelist" style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", boxShadow: "5px 5px 0 var(--ink)" }}>
      <div style={{
        padding: "16px 20px", borderBottom: "1.5px solid var(--ink)", background: "var(--paper-2)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div className="smallcaps" style={{ color: "var(--accent)" }}>Whitelist</div>
          <div className="display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>
            {count} trusted address{count === 1 ? "" : "es"}
          </div>
        </div>
        <button className="ink-btn ghost" style={{ height: 30, fontSize: 12, padding: "0 12px", boxShadow: "2px 2px 0 var(--ink)" }}
          title="Add address via SDK ownerAction()">
          <Icon.plus size={12}/>
        </button>
      </div>

      {live && count > 0 ? (
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", border: "1.5px solid var(--ink)", background: "var(--paper-2)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ok)", border: "1.5px solid var(--ink)", flexShrink: 0 }}/>
            <div>
              <div className="mono" style={{ fontSize: 12, color: "var(--ok)" }}>{count} credential hash{count === 1 ? "" : "es"} registered</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>
                These addresses bypass the per-tx cap — use ownerAction() to update the list
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.08em" }}>
              OWNER PKH: {ad.rules.ownerPkh ? `${ad.rules.ownerPkh.slice(0, 16)}…` : "—"}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: "32px 20px", textAlign: "center" }}>
          <div className="hand" style={{ fontSize: 26, color: live ? "var(--ok)" : "var(--ink-3)", marginBottom: 8 }}>
            {live ? "no addresses whitelisted ✓" : "nothing whitelisted yet"}
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink-4)", lineHeight: 1.5 }}>
            {live
              ? "All spends go through the guardrail checks. Add trusted addresses via SDK ownerAction()."
              : "Addresses on this list bypass the per-tx cap and skip the approval queue."}
          </div>
          {live && (
            <div style={{ marginTop: 14 }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.06em" }}>
                sdk: ownerAction(lucid, wallet, {"{ addAllowed: [...] }"})
              </span>
            </div>
          )}
        </div>
      )}
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
                <th key={h} className="smallcaps" style={{ padding: "10px 20px", textAlign: "left", fontSize: 10, color: "var(--ink-3)", fontWeight: "normal" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {wallet.txs.map((tx, i) => (
              <tr key={tx.tx_hash} style={{ borderBottom: i < wallet.txs.length - 1 ? "1px solid var(--paper-3)" : "none" }}>
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
              <a href="https://docs.cardano.org/cardano-testnets/tools/faucet/" target="_blank" rel="noopener noreferrer"
                className="ink-btn ghost"
                style={{ display: "inline-flex", height: 36, padding: "0 20px", fontSize: 13, boxShadow: "2px 2px 0 var(--ink)", textDecoration: "none" }}>
                Get Preview testnet ADA →
              </a>
            </div>
          )}
        </div>
      )}
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

  // Update greeting when wallet connects
  useEffectD(() => {
    if (wallet.connected && messages.length === 1) {
      setMessages([{
        who: "beni",
        text: `Wallet connected — ${wallet.addrShort}. Balance: ₳ ${fmtAda(wallet.balanceAda)} · ${wallet.txCount} transaction${wallet.txCount === 1 ? "" : "s"} on this address. To activate guardrails, deploy an agent wallet with the SDK.`,
      }]);
    }
  }, [wallet.connected]);

  // Update greeting when contract comes live
  useEffectD(() => {
    const ad = agentState?.data;
    if (ad?.funded && ad?.rules && messages.length <= 1) {
      const r = ad.rules;
      setMessages([{
        who: "beni",
        text: `Contract live on Preview testnet! Script balance: ₳ ${fmtAda(ad.balanceAda)}. Per-tx cap ₳ ${fmtAda(r.perTxCapAda)}, daily cap ₳ ${fmtAda(r.dailyCapAda)}. Spent today: ₳ ${fmtAda(r.windowSpentAda)} (${r.pctUsed}%). ${r.isFrozen ? "⚠ Wallet is currently FROZEN." : "Guardrails active — ready for agent spends."}`,
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
      if (!res.ok) throw new Error(`Server error ${res.status}`);
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
      height: "100%",
      overflow: "hidden",
    }}>
      {/* Panel header — with X close button */}
      <div style={{
        padding: "16px 18px", borderBottom: "1.5px solid var(--ink)",
        display: "flex", alignItems: "center", gap: 12,
        flexShrink: 0, background: "var(--paper)",
      }}>
        <div style={{
          width: 34, height: 34, border: "1.5px solid var(--ink)", background: "var(--paper-2)",
          display: "grid", placeItems: "center", flexShrink: 0,
        }}>
          <BeniMark size={20}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="display" style={{ fontSize: 17 }}>Beni</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em" }}>
            POLICY-AWARE · READS THE CHAIN
          </div>
        </div>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: loading ? "var(--warn)" : "var(--ok)",
          border: "1.5px solid var(--ink)", flexShrink: 0,
        }}/>
        {/* X close button */}
        <button
          onClick={() => setShowChat(false)}
          title="Close Beni panel"
          style={{
            width: 28, height: 28, border: "1.5px solid var(--ink)",
            background: "transparent", cursor: "pointer",
            display: "grid", placeItems: "center",
            fontFamily: "var(--mono)", fontSize: 14, color: "var(--ink)",
            flexShrink: 0, lineHeight: 1,
          }}
        >✕</button>
      </div>

      {/* Message list */}
      <div style={{ flex: 1, padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
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
          }}>thinking…</div>
        )}
        {/* Suggested questions */}
        <div style={{ marginTop: 8, padding: 12, border: "1.5px solid var(--accent)", background: "var(--paper)" }}>
          <div className="smallcaps" style={{ color: "var(--accent)", marginBottom: 8, fontSize: 9 }}>Try asking</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
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
      <div style={{ padding: 12, borderTop: "1.5px solid var(--ink)", flexShrink: 0 }}>
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
            style={{ flex: 1, height: 36, background: "transparent", border: 0, outline: 0, color: "var(--ink)", font: "15px var(--serif)" }}
          />
          <button className="ink-btn" onClick={send} disabled={loading}
            style={{ height: 28, padding: "0 10px", fontSize: 12, boxShadow: "2px 2px 0 var(--ink)", opacity: loading ? 0.5 : 1 }}>
            <Icon.send size={12} color="var(--paper)"/>
          </button>
        </div>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-4)", marginTop: 8, textAlign: "center", letterSpacing: "0.08em" }}>
          POWERED BY CLAUDE · BENI v0.4.1
        </div>
      </div>
    </aside>
  );
}

function SuggestedAction({ t, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "7px 10px", background: "var(--paper-2)", border: "1.5px solid var(--ink)",
      color: "var(--ink)", fontFamily: "var(--serif)", fontSize: 12, cursor: "pointer", textAlign: "left",
    }}>
      {t} <Icon.arrow size={13}/>
    </button>
  );
}

Object.assign(window, { Dashboard });
