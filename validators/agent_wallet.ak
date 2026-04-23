use aiken/collection/list
use aiken/interval
use cardano/transaction.{Transaction, OutputReference}
use cardano/assets.{lovelace_of}

/// Datum holds the guardrail rules for the agent wallet
pub type WalletDatum {
  /// Max ADA (in lovelace) the agent can spend in a single tx
  per_tx_cap: Int,
  /// Whitelisted addresses the agent is allowed to send to
  allowed_addresses: List<ByteArray>,
  /// The human owner's public key hash — required to co-sign above-cap txs
  owner_pkh: ByteArray,
}

/// Redeemer signals what the agent is trying to do
pub type WalletRedeemer {
  /// Normal spend within the guardrail rules
  Spend
  /// Owner is reclaiming or updating the wallet
  OwnerAction
}

validator agent_wallet {
  spend(
    datum: Option<WalletDatum>,
    redeemer: WalletRedeemer,
    _input: OutputReference,
    tx: Transaction,
  ) {
    when datum is {
      None -> False
      Some(rules) ->
        when redeemer is {
          OwnerAction -> {
            // Owner can always act — just needs to sign
            list.any(
              tx.extra_signatories,
              fn(pkh) { pkh == rules.owner_pkh },
            )
          }

          Spend -> {
            // Check that total output value to non-whitelisted addresses
            // does not exceed the per-tx cap
            let total_spent =
              list.foldl(
                tx.outputs,
                0,
                fn(output, acc) {
                  let is_allowed =
                    list.any(
                      rules.allowed_addresses,
                      fn(addr) {
                        // Compare destination — simplified for scaffold
                        // Full impl checks output.address.payment_credential
                        addr == #""
                      },
                    )
                  if is_allowed {
                    acc
                  } else {
                    acc + lovelace_of(output.value)
                  }
                },
              )

            total_spent <= rules.per_tx_cap
          }
        }
    }
  }

  else(_) {
    fail
  }
}
