use aiken/collection/list
use aiken/interval.{Finite}
use cardano/address.{Address, Script, VerificationKey}
use cardano/assets.{lovelace_of, quantity_of}
use cardano/transaction.{InlineDatum, OutputReference, Transaction}

/// Datum holds all guardrail rules and rolling window state for the agent wallet.
/// Field order is load-bearing — the TypeScript SDK encodes this via Lucid's
/// Data.Object and must match this declaration order exactly.
pub type WalletDatum {
  /// Max lovelace the agent can spend in a single tx (to non-whitelisted addresses)
  per_tx_cap: Int,
  /// Max lovelace the agent can spend in any 24h rolling window
  daily_cap: Int,
  /// Payment credential hashes the agent is allowed to send to freely
  allowed_addresses: List<ByteArray>,
  /// Owner's payment credential hash — required to co-sign OwnerAction and FreezeWallet
  owner_pkh: ByteArray,
  /// POSIX milliseconds when the current 24h window started
  last_window_start: Int,
  /// Lovelace spent so far in the current window
  window_spent: Int,
  /// Emergency freeze flag — when True, all Spend redeemers are rejected
  is_frozen: Bool,
  /// Policy ID of the thread token NFT minted at wallet creation
  thread_token_policy: ByteArray,
}

/// Redeemer signals what action is being performed.
pub type WalletRedeemer {
  /// Normal agent spend — subject to all guardrail rules
  Spend
  /// Owner reclaims funds or updates the wallet config
  OwnerAction
  /// Owner emergency-freezes the wallet (blocks all future Spend)
  FreezeWallet
}

/// Extract the raw credential hash from an address.
fn credential_hash(addr: Address) -> ByteArray {
  when addr.payment_credential is {
    VerificationKey(hash) -> hash
    Script(hash) -> hash
  }
}

/// Returns True if the address's payment credential is in the allowed list.
fn is_whitelisted(addr: Address, allowed: List<ByteArray>) -> Bool {
  let hash = credential_hash(addr)
  list.any(allowed, fn(h) { h == hash })
}

validator agent_wallet {
  spend(
    datum: Option<WalletDatum>,
    redeemer: WalletRedeemer,
    input: OutputReference,
    tx: Transaction,
  ) {
    when datum is {
      None -> False
      Some(rules) ->
        when redeemer is {
          // ── OwnerAction ──────────────────────────────────────────────────
          // Owner can always act (reclaim or update config). No guardrails.
          OwnerAction ->
            list.any(tx.extra_signatories, fn(pkh) { pkh == rules.owner_pkh })

          // ── FreezeWallet ─────────────────────────────────────────────────
          // Owner sets is_frozen = True on the continuing output to halt the agent.
          FreezeWallet ->
            list.any(tx.extra_signatories, fn(pkh) { pkh == rules.owner_pkh })

          // ── Spend ─────────────────────────────────────────────────────────
          // Agent spend — must satisfy all guardrails.
          Spend -> {
            // 1. Reject immediately if frozen.
            let not_frozen = !rules.is_frozen

            // 2. Extract current POSIX time from the tx validity range lower bound.
            //    SDK must always call validFrom() — the validator rejects txs without it.
            let now =
              when tx.validity_range.lower_bound.bound_type is {
                Finite(t) -> t
                _ -> fail
              }

            // 3. Find the script input being spent to get the script address
            //    and the lovelace locked before this spend.
            expect Some(own_input) =
              list.find(tx.inputs, fn(i) { i.output_reference == input })
            let script_addr = own_input.output.address
            let script_input_lovelace = lovelace_of(own_input.output.value)

            // 4. Find the single continuing output back to the script address.
            //    There must be exactly one — the thread token stays locked here.
            expect [continuing] =
              list.filter(tx.outputs, fn(o) { o.address == script_addr })

            // 5. Thread token must stay in the continuing output.
            let has_thread_token =
              quantity_of(continuing.value, rules.thread_token_policy, "") == 1

            // 6. Compute the net lovelace outflow from the script.
            //    this_spend = what left the script, regardless of how many external
            //    outputs the transaction has (recipient + agent change + fees, etc.).
            //    This matches exactly what the SDK passes as the `lovelace` parameter.
            let this_spend = script_input_lovelace - lovelace_of(continuing.value)

            // 7. Check if any non-script output targets a whitelisted address.
            //    Whitelisted sends bypass per-tx and daily caps entirely.
            let any_whitelisted =
              list.any(
                tx.outputs,
                fn(o) {
                  o.address != script_addr && is_whitelisted(
                    o.address,
                    rules.allowed_addresses,
                  )
                },
              )

            // 8. Per-tx cap: only enforced for non-whitelisted sends.
            let per_tx_ok = any_whitelisted || this_spend <= rules.per_tx_cap

            // 9. Daily rolling window check.
            //    If we're still in the same 24h window, accumulate. Otherwise reset.
            let in_window = now - rules.last_window_start < 86_400_000
            let daily_ok =
              if any_whitelisted {
                True
              } else if in_window {
                rules.window_spent + this_spend <= rules.daily_cap
              } else {
                this_spend <= rules.daily_cap
              }

            // 10. Decode the new datum from the continuing output.
            expect InlineDatum(raw_datum) = continuing.datum
            expect new_rules: WalletDatum = raw_datum

            // 11. Compute the expected new window state.
            let expected_spent =
              if in_window {
                rules.window_spent + this_spend
              } else {
                this_spend
              }
            let expected_start =
              if in_window {
                rules.last_window_start
              } else {
                now
              }

            // 12. All immutable fields must be unchanged; mutable fields must
            //     reflect exactly the net spend that just happened.
            let continuing_ok =
              new_rules.per_tx_cap == rules.per_tx_cap && new_rules.daily_cap == rules.daily_cap && new_rules.allowed_addresses == rules.allowed_addresses && new_rules.owner_pkh == rules.owner_pkh && new_rules.thread_token_policy == rules.thread_token_policy && new_rules.window_spent == expected_spent && new_rules.last_window_start == expected_start && !new_rules.is_frozen

            not_frozen && per_tx_ok && daily_ok && has_thread_token && continuing_ok
          }
        }
    }
  }

  else(_) {
    fail
  }
}
