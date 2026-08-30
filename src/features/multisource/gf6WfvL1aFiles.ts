export interface Gf6WfvL1aFiles {
  mainTiffTile0?: File;
  mainTiffTile1?: File;
  mainTiffTile2?: File;
  metadataXml?: File;
  rpcRpb?: File;
  nav?: File;
  tileIndexTil?: File;
  footprintShp?: File;
  footprintDbf?: File;
  footprintShx?: File;
}

export type Gf6WfvL1aFileIssueCode =
  | "MISSING_FILE"
  | "INVALID_TILE_FILENAME"
  | "INVALID_TILE_ORDINALS"
  | "WRONG_TILE_SLOT"
  | "TILE_RPB"
  | "UNMATCHED_BASENAME"
  | "PARTIAL_FOOTPRINT";

export interface Gf6WfvL1aFileValidation {
  valid: boolean;
  issues: readonly { code: Gf6WfvL1aFileIssueCode; message: string }[];
}

const REQUIRED = [
  "mainTiffTile0",
  "mainTiffTile1",
  "mainTiffTile2",
  "metadataXml",
  "rpcRpb",
  "nav",
  "tileIndexTil"
] as const;
const TILE_PATTERN = /^(?<basename>.+)-(?<ordinal>[123])\.tiff?$/i;

function sidecarBase(file: File | undefined, extension: string) {
  if (!file) return undefined;
  const suffix = `.${extension}`;
  return file.name.toLowerCase().endsWith(suffix)
    ? file.name.slice(0, -suffix.length)
    : undefined;
}

export function validateGf6WfvL1aFiles(
  files: Gf6WfvL1aFiles
): Gf6WfvL1aFileValidation {
  const issues: Array<{
    code: Gf6WfvL1aFileIssueCode;
    message: string;
  }> = [];
  for (const slot of REQUIRED) {
    if (!files[slot]) {
      issues.push({ code: "MISSING_FILE", message: `缺少 GF-6 ${slot} 文件` });
    }
  }

  const tiles = [files.mainTiffTile0, files.mainTiffTile1, files.mainTiffTile2]
    .filter((file): file is File => !!file)
    .map(file => ({ file, parsed: TILE_PATTERN.exec(file.name)?.groups }));
  if (tiles.some(tile => !tile.parsed)) {
    issues.push({
      code: "INVALID_TILE_FILENAME",
      message: "GF-6 TIFF 必须使用 -1、-2、-3 瓦片后缀"
    });
  }
  const ordinals = tiles.flatMap(tile =>
    tile.parsed ? [Number(tile.parsed.ordinal)] : []
  );
  if (
    tiles.length === 3 &&
    (new Set(ordinals).size !== 3 ||
      ![1, 2, 3].every(item => ordinals.includes(item)))
  ) {
    issues.push({
      code: "INVALID_TILE_ORDINALS",
      message: "GF-6 TIFF 瓦片必须恰好包含 -1、-2、-3"
    });
  }
  const expectedTiles: Array<[keyof Gf6WfvL1aFiles, number]> = [
    ["mainTiffTile0", 1],
    ["mainTiffTile1", 2],
    ["mainTiffTile2", 3]
  ];
  if (
    expectedTiles.some(([slot, ordinal]) => {
      const parsed =
        files[slot] && TILE_PATTERN.exec(files[slot]?.name ?? "")?.groups;
      return parsed && Number(parsed.ordinal) !== ordinal;
    })
  ) {
    issues.push({
      code: "WRONG_TILE_SLOT",
      message: "GF-6 TIFF 瓦片后缀必须与上传槽位 -1、-2、-3 对应"
    });
  }
  const basename = tiles.find(tile => tile.parsed)?.parsed?.basename;
  if (basename && tiles.some(tile => tile.parsed?.basename !== basename)) {
    issues.push({
      code: "UNMATCHED_BASENAME",
      message: "GF-6 文件基名必须一致"
    });
  }

  const sidecars: Array<[File | undefined, string]> = [
    [files.metadataXml, "xml"],
    [files.rpcRpb, "rpb"],
    [files.nav, "nav"],
    [files.tileIndexTil, "til"]
  ];
  if (files.rpcRpb && /-[123]\.rpb$/i.test(files.rpcRpb.name)) {
    issues.push({ code: "TILE_RPB", message: "GF-6 必须选择主产品 RPB" });
  }
  if (
    basename &&
    sidecars.some(
      ([file, extension]) => file && sidecarBase(file, extension) !== basename
    )
  ) {
    issues.push({
      code: "UNMATCHED_BASENAME",
      message: "GF-6 文件基名必须一致"
    });
  }

  const footprint = [
    files.footprintShp,
    files.footprintDbf,
    files.footprintShx
  ];
  if (footprint.some(Boolean) && !footprint.every(Boolean)) {
    issues.push({
      code: "PARTIAL_FOOTPRINT",
      message: "GF-6 足迹文件必须同时提供 SHP、DBF 和 SHX"
    });
  }
  if (
    basename &&
    footprint.every(Boolean) &&
    ["shp", "dbf", "shx"].some(
      (extension, index) =>
        sidecarBase(footprint[index], extension) !== basename
    )
  ) {
    issues.push({
      code: "UNMATCHED_BASENAME",
      message: "GF-6 文件基名必须一致"
    });
  }
  return { valid: issues.length === 0, issues };
}
