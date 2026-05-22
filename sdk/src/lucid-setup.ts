import { Blockfrost, Lucid, type LucidEvolution } from "@lucid-evolution/lucid";
import type { BeniNetwork, BeniSDKOptions } from "./types.js";

const BLOCKFROST_URLS: Record<BeniNetwork, string> = {
  Preview: "https://cardano-preview.blockfrost.io/api/v0",
  Preprod: "https://cardano-preprod.blockfrost.io/api/v0",
  Mainnet: "https://cardano-mainnet.blockfrost.io/api/v0",
};

export async function makeLucid(opts: BeniSDKOptions): Promise<LucidEvolution> {
  return await Lucid(
    new Blockfrost(BLOCKFROST_URLS[opts.network], opts.blockfrostApiKey),
    opts.network,
  );
}
