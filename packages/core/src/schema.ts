import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import type { ErrorObject } from "ajv";
import scanResultSchema from "../schema/result-v1.json";
import type { ScanResult } from "./result";

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: true,
});
addFormats(ajv);

const validate = ajv.compile<ScanResult>(scanResultSchema);

export { scanResultSchema };

export type SchemaIssue = {
  instancePath: string;
  message: string;
};

export type ScanResultValidation =
  | { ok: true; value: ScanResult }
  | { ok: false; issues: SchemaIssue[] };

export function validateScanResult(data: unknown): ScanResultValidation {
  if (validate(data)) {
    return { ok: true, value: data };
  }
  return {
    ok: false,
    issues: (validate.errors ?? []).map(toIssue),
  };
}

function toIssue(error: ErrorObject): SchemaIssue {
  return {
    instancePath: error.instancePath,
    message: error.message ?? "invalid",
  };
}
