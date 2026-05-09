import type { Script } from "lucid-cardano";

// lucid-cardano v0.10.x ScriptType is typed as "PlutusV1" | "PlutusV2" only,
// but the underlying Cardano Multiplatform Lib does support PlutusV3 at runtime.
// Aiken v1.1.13 compiles exclusively to PlutusV3, so we cast through unknown.
export function makeScript(cbor: string): Script {
  return { type: "PlutusV3" as unknown as Script["type"], script: cbor };
}
