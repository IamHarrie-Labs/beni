use aiken/interval.{between}
use cardano/address.{Address, from_verification_key}
use cardano/assets.{add, from_lovelace, from_asset}
use cardano/transaction.{
  InlineDatum, Input, NoDatum, Output, OutputReference, Transaction, placeholder,
}
use validators/agent_wallet.{WalletDatum, WalletRedeemer, Spend, OwnerAction, FreezeWallet, agent_wallet}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn mock_datum(
  per_tx_cap: Int,
  daily_cap: Int,
  allowed: List<ByteArray>,
  owner: ByteArray,
  window_start: Int,
  window_spent: Int,
  frozen: Bool,
) -> WalletDatum {
  WalletDatum {
    per_tx_cap,
    daily_cap,
    allowed_addresses: allowed,
    owner_pkh: owner,
    last_window_start: window_start,
    window_spent,
    is_frozen: frozen,
    thread_token_policy: #"aabbcc",
  }
}

// A bech32-agnostic address built from a raw credential hash for testing.
fn test_addr(hash: ByteArray) -> Address {
  from_verification_key(hash)
}

fn script_addr() -> Address {
  from_verification_key(#"5c7777")
}

fn thread_token_value(lovelace: Int) -> assets.Value {
  from_lovelace(lovelace)
    |> add(#"aabbcc", "", 1)
}

fn mock_input(ref: OutputReference, addr: Address, lovelace: Int) -> Input {
  Input {
    output_reference: ref,
    output: Output {
      address: addr,
      value: from_lovelace(lovelace),
      datum: NoDatum,
      reference_script: None,
    },
  }
}

fn continuing_output(
  new_datum: WalletDatum,
  lovelace: Int,
) -> Output {
  Output {
    address: script_addr(),
    value: thread_token_value(lovelace),
    datum: InlineDatum(new_datum),
    reference_script: None,
  }
}

fn destination_output(addr: Address, lovelace: Int) -> Output {
  Output {
    address: addr,
    value: from_lovelace(lovelace),
    datum: NoDatum,
    reference_script: None,
  }
}

fn own_ref() -> OutputReference {
  OutputReference { transaction_id: #"deadbeef", output_index: 0 }
}

// Build a minimal Spend transaction.
fn spend_tx(
  datum: WalletDatum,
  lovelace_sent: Int,
  destination: Address,
  now: Int,
  new_datum: WalletDatum,
) -> Transaction {
  let ref = own_ref()
  Transaction {
    ..placeholder,
    inputs: [mock_input(ref, script_addr(), 20_000_000)],
    outputs: [
      continuing_output(new_datum, 20_000_000 - lovelace_sent),
      destination_output(destination, lovelace_sent),
    ],
    validity_range: between(now, now + 300_000),
  }
}

fn owner_pkh() -> ByteArray {
  #"cafebabe"
}

fn base_datum() -> WalletDatum {
  mock_datum(
    2_000_000,
    10_000_000,
    [],
    owner_pkh(),
    0,
    0,
    False,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

/// Valid spend well within per-tx cap and daily cap.
test valid_spend_within_cap() {
  let datum = base_datum()
  let dest = test_addr(#"1111")
  let now = 1_000_000
  let spend = 1_000_000

  let new_datum =
    WalletDatum {
      ..datum,
      window_spent: spend,
      last_window_start: now,
    }
  let tx = spend_tx(datum, spend, dest, now, new_datum)
  let ref = own_ref()

  agent_wallet.spend(Some(datum), Spend, ref, tx)
}

/// Spend exceeds per_tx_cap — must be rejected.
test spend_exceeds_per_tx_cap() fail {
  let datum = base_datum()
  let dest = test_addr(#"1111")
  let now = 1_000_000
  let spend = 3_000_000

  let new_datum =
    WalletDatum {
      ..datum,
      window_spent: spend,
      last_window_start: now,
    }
  let tx = spend_tx(datum, spend, dest, now, new_datum)
  let ref = own_ref()

  agent_wallet.spend(Some(datum), Spend, ref, tx)
}

/// Spend to a whitelisted address is not counted against the cap.
/// Even 5 ADA to a whitelisted address passes a 2 ADA per_tx_cap.
test spend_to_whitelisted_address_not_counted() {
  let whitelisted_hash = #"feed"
  let datum =
    mock_datum(2_000_000, 10_000_000, [whitelisted_hash], owner_pkh(), 0, 0, False)
  let dest = test_addr(whitelisted_hash)
  let now = 1_000_000
  let spend = 5_000_000

  // this_spend == 0 because destination is whitelisted; new_datum records 0
  let new_datum =
    WalletDatum {
      ..datum,
      window_spent: 0,
      last_window_start: now,
    }

  let ref = own_ref()
  let tx =
    Transaction {
      ..placeholder,
      inputs: [mock_input(ref, script_addr(), 20_000_000)],
      outputs: [
        continuing_output(new_datum, 20_000_000 - spend),
        destination_output(dest, spend),
      ],
      validity_range: between(now, now + 300_000),
    }

  agent_wallet.spend(Some(datum), Spend, ref, tx)
}

/// Daily limit exceeded within the current window — must be rejected.
test daily_limit_exceeded_in_window() fail {
  let now = 1_000_000
  // window started 1 second ago, already spent 9 ADA
  let datum =
    mock_datum(2_000_000, 10_000_000, [], owner_pkh(), now - 1_000, 9_000_000, False)
  let dest = test_addr(#"1111")
  let spend = 2_000_000

  let new_datum =
    WalletDatum {
      ..datum,
      window_spent: datum.window_spent + spend,
      last_window_start: datum.last_window_start,
    }
  let tx = spend_tx(datum, spend, dest, now, new_datum)
  let ref = own_ref()

  agent_wallet.spend(Some(datum), Spend, ref, tx)
}

/// Daily window has elapsed (25 hours) — counter resets, spend is allowed.
test daily_limit_resets_after_window() {
  let old_window_start = 0
  let now = 90_000_000

  // 25 hours elapsed, previous window had 9.5 ADA spent
  let datum =
    mock_datum(
      2_000_000,
      10_000_000,
      [],
      owner_pkh(),
      old_window_start,
      9_500_000,
      False,
    )
  let dest = test_addr(#"1111")
  let spend = 1_500_000

  // New window starts at `now`, window_spent resets to just this spend
  let new_datum =
    WalletDatum {
      ..datum,
      window_spent: spend,
      last_window_start: now,
    }
  let tx = spend_tx(datum, spend, dest, now, new_datum)
  let ref = own_ref()

  agent_wallet.spend(Some(datum), Spend, ref, tx)
}

/// Owner action succeeds when the owner signs.
test owner_action_with_signature() {
  let datum = base_datum()
  let ref = own_ref()
  let tx =
    Transaction {
      ..placeholder,
      inputs: [mock_input(ref, script_addr(), 10_000_000)],
      outputs: [destination_output(test_addr(owner_pkh()), 9_700_000)],
      extra_signatories: [owner_pkh()],
      validity_range: between(1_000_000, 2_000_000),
    }

  agent_wallet.spend(Some(datum), OwnerAction, ref, tx)
}

/// Owner action fails without the owner's signature.
test owner_action_without_signature() fail {
  let datum = base_datum()
  let ref = own_ref()
  let tx =
    Transaction {
      ..placeholder,
      inputs: [mock_input(ref, script_addr(), 10_000_000)],
      outputs: [destination_output(test_addr(owner_pkh()), 9_700_000)],
      extra_signatories: [],
      validity_range: between(1_000_000, 2_000_000),
    }

  agent_wallet.spend(Some(datum), OwnerAction, ref, tx)
}

/// Missing datum always fails.
test none_datum_fails() fail {
  let ref = own_ref()
  let tx =
    Transaction {
      ..placeholder,
      inputs: [mock_input(ref, script_addr(), 10_000_000)],
      validity_range: between(1_000_000, 2_000_000),
    }

  agent_wallet.spend(None, Spend, ref, tx)
}

/// Continuing output with a tampered window_spent is rejected.
test tampered_window_spent_fails() fail {
  let datum = base_datum()
  let dest = test_addr(#"1111")
  let now = 1_000_000
  let spend = 1_000_000

  // Agent lies: claims to have spent 0 instead of 1_000_000
  let lying_datum =
    WalletDatum {
      ..datum,
      window_spent: 0,
      last_window_start: now,
    }
  let tx = spend_tx(datum, spend, dest, now, lying_datum)
  let ref = own_ref()

  agent_wallet.spend(Some(datum), Spend, ref, tx)
}

/// Frozen wallet rejects all Spend redeemers.
test frozen_wallet_rejects_spend() fail {
  let datum =
    mock_datum(2_000_000, 10_000_000, [], owner_pkh(), 0, 0, True)
  let dest = test_addr(#"1111")
  let now = 1_000_000
  let spend = 500_000

  let new_datum =
    WalletDatum {
      ..datum,
      window_spent: spend,
      last_window_start: now,
    }
  let tx = spend_tx(datum, spend, dest, now, new_datum)
  let ref = own_ref()

  agent_wallet.spend(Some(datum), Spend, ref, tx)
}

/// FreezeWallet redeemer succeeds when owner signs.
test freeze_wallet_with_owner_signature() {
  let datum = base_datum()
  let ref = own_ref()
  let tx =
    Transaction {
      ..placeholder,
      inputs: [mock_input(ref, script_addr(), 10_000_000)],
      outputs: [continuing_output(WalletDatum { ..datum, is_frozen: True }, 9_800_000)],
      extra_signatories: [owner_pkh()],
      validity_range: between(1_000_000, 2_000_000),
    }

  agent_wallet.spend(Some(datum), FreezeWallet, ref, tx)
}

/// FreezeWallet fails without owner signature.
test freeze_wallet_without_signature() fail {
  let datum = base_datum()
  let ref = own_ref()
  let tx =
    Transaction {
      ..placeholder,
      inputs: [mock_input(ref, script_addr(), 10_000_000)],
      outputs: [continuing_output(WalletDatum { ..datum, is_frozen: True }, 9_800_000)],
      extra_signatories: [],
      validity_range: between(1_000_000, 2_000_000),
    }

  agent_wallet.spend(Some(datum), FreezeWallet, ref, tx)
}
