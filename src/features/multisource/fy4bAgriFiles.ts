export interface Fy4bAgriFiles {
  l1_0500m?: File;
  l1_1000m?: File;
  l1_2000m?: File;
  l1_4000m?: File;
  geo_4000m?: File;
}

export type Fy4bAgriFileIssueCode =
  | "MISSING_FILE"
  | "INVALID_FILENAME"
  | "WRONG_SLOT"
  | "UNMATCHED_OBSERVATION"
  | "UNMATCHED_VERSION"
  | "UNMATCHED_SATELLITE";

export interface Fy4bAgriFileValidation {
  valid: boolean;
  issues: readonly { code: Fy4bAgriFileIssueCode; message: string }[];
}

const FILE_PATTERN =
  /^FY4B-_AGRI--_N_DISK_(?<subsat>[^_]+)_L1-_(?<kind>FDI|GEO)-_MULT_NOM_(?<start>\d{14})_(?<end>\d{14})_(?<resolution>0500M|500M|1000M|2000M|4000M)_(?<version>V[^.]+)\.HDF$/i;

const EXPECTED = {
  l1_0500m: ["FDI", "0500M"],
  l1_1000m: ["FDI", "1000M"],
  l1_2000m: ["FDI", "2000M"],
  l1_4000m: ["FDI", "4000M"],
  geo_4000m: ["GEO", "4000M"]
} as const;

function parse(file: File | undefined) {
  if (!file) return undefined;
  return FILE_PATTERN.exec(file.name)?.groups as
    | {
        subsat: string;
        kind: string;
        start: string;
        end: string;
        resolution: string;
        version: string;
      }
    | undefined;
}

export function validateFy4bAgriFiles(
  files: Fy4bAgriFiles
): Fy4bAgriFileValidation {
  const issues: Array<{
    code: Fy4bAgriFileIssueCode;
    message: string;
  }> = [];
  const parsed = Object.entries(files).map(([slot, file]) => ({
    slot: slot as keyof Fy4bAgriFiles,
    file,
    value: parse(file)
  }));

  for (const [slot] of Object.entries(EXPECTED) as Array<
    [keyof typeof EXPECTED, readonly [string, string]]
  >) {
    if (!files[slot]) {
      issues.push({ code: "MISSING_FILE", message: `缺少 FY-4B ${slot} 文件` });
    }
  }
  for (const item of parsed) {
    if (!item.file) continue;
    if (!item.value) {
      issues.push({
        code: "INVALID_FILENAME",
        message: "FY-4B 文件名不符合 AGRI 全圆盘 L1 规范"
      });
      continue;
    }
    const expected = EXPECTED[item.slot];
    if (
      expected &&
      (item.value.kind.toUpperCase() !== expected[0] ||
        item.value.resolution.toUpperCase() !== expected[1])
    ) {
      issues.push({
        code: "WRONG_SLOT",
        message: "FY-4B 文件类型或分辨率与上传槽位不匹配"
      });
    }
  }

  const first = parsed.find(item => item.value)?.value;
  if (first) {
    const mismatch = (key: "start" | "end" | "version" | "subsat") =>
      parsed.some(item => item.value && item.value[key] !== first[key]);
    if (mismatch("start") || mismatch("end")) {
      issues.push({
        code: "UNMATCHED_OBSERVATION",
        message: "FY-4B 文件的观测起止时间必须一致"
      });
    }
    if (mismatch("version")) {
      issues.push({
        code: "UNMATCHED_VERSION",
        message: "FY-4B 文件版本必须一致"
      });
    }
    if (mismatch("subsat")) {
      issues.push({
        code: "UNMATCHED_SATELLITE",
        message: "FY-4B 文件的星下点必须一致"
      });
    }
  }
  return { valid: issues.length === 0, issues };
}
