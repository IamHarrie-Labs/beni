import type { Script } from "@lucid-evolution/lucid";

// Lucid Evolution natively supports "PlutusV3" as a Script type.
export function makeScript(cbor: string): Script {
  return { type: "PlutusV3", script: cbor };
}
