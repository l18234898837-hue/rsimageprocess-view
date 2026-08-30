const FY3H_MERSI_FILENAME =
  /^(?<identity>FY3H_MERSI_.+)_(?<kind>1000M|GEO1K)_(?<version>[^_]+)\.HDF$/i;

export interface Fy3hMersiPairFiles {
  observation?: File;
  geo1k?: File;
}

export type Fy3hMersiPairIssueCode =
  | "MISSING_FILE"
  | "INVALID_FILENAME"
  | "WRONG_SLOT"
  | "UNMATCHED_IDENTITY"
  | "UNMATCHED_VERSION";

export interface Fy3hMersiPairValidation {
  valid: boolean;
  issues: readonly {
    code: Fy3hMersiPairIssueCode;
    message: string;
  }[];
}

function parseFile(file: File | undefined) {
  if (!file) return undefined;
  return FY3H_MERSI_FILENAME.exec(file.name)?.groups as
    | { identity: string; kind: "1000M" | "GEO1K"; version: string }
    | undefined;
}

export function validateFy3hMersiPair(
  files: Fy3hMersiPairFiles
): Fy3hMersiPairValidation {
  const issues: Array<{
    code: Fy3hMersiPairIssueCode;
    message: string;
  }> = [];
  if (!files.observation || !files.geo1k) {
    issues.push({
      code: "MISSING_FILE",
      message: "请同时选择 1000M 与 GEO1K 文件"
    });
  }

  const observation = parseFile(files.observation);
  const geo = parseFile(files.geo1k);
  if (files.observation && !observation) {
    issues.push({
      code: "INVALID_FILENAME",
      message: "观测文件名不符合 FY-3H MERSI 1000M 规范"
    });
  }
  if (files.geo1k && !geo) {
    issues.push({
      code: "INVALID_FILENAME",
      message: "定位文件名不符合 FY-3H MERSI GEO1K 规范"
    });
  }
  if (observation && observation.kind.toUpperCase() !== "1000M") {
    issues.push({ code: "WRONG_SLOT", message: "观测槽位必须选择 1000M 文件" });
  }
  if (geo && geo.kind.toUpperCase() !== "GEO1K") {
    issues.push({ code: "WRONG_SLOT", message: "定位槽位必须选择 GEO1K 文件" });
  }
  if (observation && geo && observation.identity !== geo.identity) {
    issues.push({
      code: "UNMATCHED_IDENTITY",
      message: "1000M 与 GEO1K 文件的产品时次必须一致"
    });
  }
  if (observation && geo && observation.version !== geo.version) {
    issues.push({
      code: "UNMATCHED_VERSION",
      message: "1000M 与 GEO1K 文件版本必须一致"
    });
  }
  return { valid: issues.length === 0, issues };
}
