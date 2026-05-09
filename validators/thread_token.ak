use aiken/collection/list
use cardano/transaction.{OutputReference, Transaction}

/// One-shot minting policy for the Beni thread token.
///
/// Parameterized by a specific UTxO reference that must be consumed in the
/// minting transaction. Because a UTxO can only be spent once, this policy
/// can mint exactly once — making the resulting token unique per agent wallet.
///
/// The validator checks nothing about the token name or quantity beyond the
/// presence of the seed UTxO being consumed. The SDK always mints exactly 1
/// token with name "" (empty), and the agent_wallet validator checks for it.
validator thread_token(seed_utxo: OutputReference) {
  mint(_redeemer, _policy_id, tx: Transaction) {
    list.any(tx.inputs, fn(input) { input.output_reference == seed_utxo })
  }

  else(_) {
    fail
  }
}
