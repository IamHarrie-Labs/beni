/**
 * Vercel serverless function — deploy a Beni agent wallet on-chain
 *
 * POST /api/deploy
 * Body: { perTxCapLovelace: number, dailyCapLovelace: number, ownerPkh?: string }
 *
 * Uses AGENT_PRIVATE_KEY + BLOCKFROST_PREVIEW_KEY from Vercel env vars.
 * Mints the thread token and locks the config datum — no terminal needed.
 */

import {
  Lucid,
  Blockfrost,
  applyParamsToScript,
  Constr,
  Data,
  mintingPolicyToId,
  validatorToAddress,
  getAddressDetails,
} from "@lucid-evolution/lucid";

const NETWORK   = "Preview";
const BF_URL    = "https://cardano-preview.blockfrost.io/api/v0";
const INITIAL_LOVELACE = 5_000_000n;

// Compiled validator CBORs — kept in sync with sdk/src/validators.ts
const AGENT_WALLET_CBOR =
  "59068a01010029800aba2aba1aba0aab9faab9eaab9dab9a488888896600264653001300800198041804800cdc3a400530080024888966002600460106ea800e3300130093754007370e90024dc3a40013008375400891111991192cc004c0140122b3001301037540170018b20228acc004c0240122b3001301037540170018b20228acc004c0180122b3001301037540170018b20228b201c403880705660026010601c6ea80062942330013012300f375400323013301430143014001911919800800801912cc00400629422b30013003375c602c00314a31330020023017001404480a2601c6ea802a4602660286028602860286028602860286028002911112cc004c03400a2660066eb0c004c050dd5006119b8f001375c600a602a6ea801a2b3001300a0028998019bac300130143754018466e3c004dd71802980a9baa006899914c004c9660026020602c6ea800626eb4c068c05cdd5000c59015180c980b1baa3019301637546004602c6ea803a64660020026eb0c068c05cdd5007912cc004006298103d87a80008992cc004cdd7980e180c9baa00100c898021980d800a5eb82266006006603a00480b8c06c00501948c068c06cc06cc06cc06cc06cc06c005222598009807180c1baa0028cc004c070c064dd500148c074c07800644464b30013016301c375400314800226eb4c080c074dd5000a0363259800980b180e1baa0018a60103d87a8000899198008009bab3021301e375400444b30010018a6103d87a8000899192cc004cdc8803000c56600266e3c0180062601866046604200497ae08a60103d87a8000407d1330040043025003407c6eb8c07c004c088005020203632330010010042259800800c5300103d87a8000899192cc004cdc8803000c56600266e3c0180062601666044604000497ae08a60103d87a80004079133004004302400340786eb8c078004c08400501f48c074c078c0780052222323322598009812001466002604600532330010013758600a60426ea8064896600200314a1159800992cc006600266ebcc098c08cdd5000803528528a042899198099bac30083024375402a466e3c004008c966002603260466ea800626eb8c09cc090dd5000c4dd7181398121baa0014088604c60466ea8c098c08cdd5000c528204230250018a518998010011813000a040408d2302430253025302530250019181218129812981298129812800a4445300133702600a6eacc028c090dd5180518121baa00b30053756601460486ea801266e20cdc08071bad30023024375402a90407859294c020c090dd50022444b3001301d3026375400313259800980e98139baa001899191919191919194c004dd71819800cdd698198044dd69819803cdd71819802cdd698198024dd69819801cc966002606200315980099b8948010c0c00062d1302a303000140bd1640c86ea8c0cc009222222259800981d80444c8cc004004dd6181d807112cc0040062b300198009819181c1baa3021303937540554a14a281ba2b30015980080c4528c4cdc480a9bad303c3039375405481ba2b30015980080c4528c56600202913371266e00dd6980b181c9baa02a015375a603e60726ea80aa266e24054dd6980f981c9baa02a40dc81ba2b3001303298009bab301f30393754033375c604a60726ea80aa910100407915980099b87375a607860726ea8048dd6981e181c9baa02a8acc004cdc39bad301f303937540246eb4c07cc0e4dd5015456600266ebcc074c0e4dd5009180e981c9baa02a8acc004cdc79bae3029303937540246eb8c0a4c0e4dd5015456600266e3cdd71812981c9baa012375c604a60726ea80aa2b30013370e6eb4c058c0e4dd50092cc004052266e00dd6980b181c9baa02a015880aa06e8acc004cdc39bad301730393754024b300101489bad301730393754055102340dd198009819181c1baa3021303937540254a14a281ba29410374528206e8a5040dd14a081ba29410374528206e8a5040dd14a081ba29410374528206e8a5040dd13233003003303e002375c607800281d22c81c06066002606400260620026060002605e002605c002605a00260506ea80062c8130c0a8c09cdd5000c59025116408464660020026eb0c00cc07cdd500b912cc004006297ae0899912cc004cdd7981298111baa00200589981200119802002000c4cc01001000502018118009812000a04229800800d22100a4410040106040603a6ea8c00cc074dd500222c80b84603060326032603260326032603260320026e952000404880908068c040010c040c04401116401c300800130033754011149a26cac8009";

const THREAD_TOKEN_BASE_CBOR =
  "5887010100229800aba2aba1aab9faab9eaab9dab9a48888896600264646644b30013370e900018031baa00189991198008009bac300b30093754601600c6eb8c024c01cdd5000912cc00400629422b30013375e601660126ea8c02c00403a29462660040046018002803900a459005180380098039804000980380098019baa0078a4d13656400401";

// WalletDatum schema — field order must match Aiken declaration exactly
const WalletDatumSchema = Data.Object({
  per_tx_cap:          Data.Integer(),
  daily_cap:           Data.Integer(),
  allowed_addresses:   Data.Array(Data.Bytes()),
  owner_pkh:           Data.Bytes(),
  last_window_start:   Data.Integer(),
  window_spent:        Data.Integer(),
  is_frozen:           Data.Boolean(),
  thread_token_policy: Data.Bytes(),
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const bfKey    = process.env.BLOCKFROST_PREVIEW_KEY;
  const agentKey = process.env.AGENT_PRIVATE_KEY;

  if (!bfKey || !agentKey) {
    return res.status(500).json({
      error: "BLOCKFROST_PREVIEW_KEY and AGENT_PRIVATE_KEY must be set in Vercel environment variables.",
    });
  }

  const body = req.body ?? {};
  const perTxCapLovelace  = BigInt(body.perTxCapLovelace  ?? 500_000_000);
  const dailyCapLovelace  = BigInt(body.dailyCapLovelace  ?? 2_500_000_000);
  const allowedAddresses  = body.allowedAddresses ?? [];

  try {
    const lucid = await Lucid(new Blockfrost(BF_URL, bfKey), NETWORK);
    lucid.selectWallet.fromPrivateKey(agentKey);

    const agentAddress = await lucid.wallet().address();
    const utxos = await lucid.wallet().getUtxos();

    if (utxos.length === 0) {
      return res.status(400).json({
        error: "Agent wallet has no UTxOs. Fund it first.",
        agentAddress,
        faucet: "https://docs.cardano.org/cardano-testnet/tools/faucet/",
      });
    }

    // Use the agent's payment credential as owner PKH if none provided
    const ownerPkh = body.ownerPkh
      || getAddressDetails(agentAddress).paymentCredential?.hash
      || "";

    const seedUtxo = utxos[0];

    // Parameterize the thread token minting policy with the seed UTxO
    const seedParam = new Constr(0, [seedUtxo.txHash, BigInt(seedUtxo.outputIndex)]);
    const threadTokenCbor   = applyParamsToScript(THREAD_TOKEN_BASE_CBOR, [seedParam]);
    const threadTokenScript = { type: "PlutusV3", script: threadTokenCbor };
    const policyId          = mintingPolicyToId(threadTokenScript);
    const threadTokenUnit   = policyId;

    const agentWalletScript = { type: "PlutusV3", script: AGENT_WALLET_CBOR };
    const scriptAddress     = validatorToAddress(NETWORK, agentWalletScript);

    const lastWindowStart = BigInt(Date.now());
    const datum = Data.to({
      per_tx_cap:          perTxCapLovelace,
      daily_cap:           dailyCapLovelace,
      allowed_addresses:   allowedAddresses,
      owner_pkh:           ownerPkh,
      last_window_start:   lastWindowStart,
      window_spent:        0n,
      is_frozen:           false,
      thread_token_policy: policyId,
    }, WalletDatumSchema);

    const txSignBuilder = await lucid
      .newTx()
      .collectFrom([seedUtxo])
      .mintAssets({ [threadTokenUnit]: 1n }, Data.to(new Constr(0, [])))
      .attach.MintingPolicy(threadTokenScript)
      .pay.ToContract(
        scriptAddress,
        { kind: "inline", value: datum },
        { lovelace: INITIAL_LOVELACE, [threadTokenUnit]: 1n },
      )
      .complete();

    const txSigned = await txSignBuilder.sign.withWallet().complete();
    const txHash   = await txSigned.submit();

    return res.status(200).json({
      ok: true,
      scriptAddress,
      threadTokenPolicyId: policyId,
      deployTxHash: txHash,
      agentAddress,
      perTxCapLovelace: perTxCapLovelace.toString(),
      dailyCapLovelace: dailyCapLovelace.toString(),
      ownerPkh,
      explorerUrl: `https://preview.cardanoscan.io/transaction/${txHash}`,
    });

  } catch (err) {
    console.error("[Beni] deploy error:", err.message);

    // Translate the common stale-UTxO race into a clear, actionable message.
    // After any spend, the agent's single change UTxO takes ~30-60s to settle
    // in Blockfrost's indexer. A deploy clicked inside that window builds its
    // transaction against an already-spent input and the node rejects it with
    // BadInputsUTxO / TranslationLogicMissingInput / ValueNotConservedUTxO.
    const raw = err.message ?? "";
    if (/BadInputsUTxO|TranslationLogicMissingInput|ValueNotConservedUTxO|MissingInput/.test(raw)) {
      return res.status(409).json({
        error: "Your previous transaction is still settling on-chain. Wait ~30-60 seconds for the wallet's UTxO to confirm, then deploy again.",
        code: "UTXO_SETTLING",
      });
    }

    return res.status(500).json({ error: raw });
  }
}
