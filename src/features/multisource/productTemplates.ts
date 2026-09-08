import {
  buildHy1cCziL2aSnapshot,
  defaultL2aForm
} from "./hy1cCziL2aParameters";
import {
  buildFy3hMersiSnapshot,
  defaultFy3hMersiForm
} from "./fy3hMersiParameters";
import {
  buildHy2dAltimeterSnapshot,
  defaultHy2dAltimeterForm
} from "./hy2dAltimeterParameters";
import { validateFy3hMersiPair } from "./fy3hMersiFiles";
import { validateFy4bAgriFiles } from "./fy4bAgriFiles";
import {
  buildFy4bAgriSnapshot,
  defaultFy4bAgriForm
} from "./fy4bAgriParameters";
import { validateGf6WfvL1aFiles } from "./gf6WfvL1aFiles";
import {
  buildGf6WfvL1aSnapshot,
  defaultGf6WfvL1aForm
} from "./gf6WfvL1aParameters";

/** A file role required by a product template. */
export type ProductFileRole =
  | "BROWSE_IMAGE"
  | "GEOREFERENCE"
  | "MAIN"
  | "METADATA"
  | "BROWSE"
  | "OBSERVATION"
  | "GEO1K"
  | "L1_0500M"
  | "L1_1000M"
  | "L1_2000M"
  | "L1_4000M"
  | "GEO_4000M"
  | "MAIN_TIFF_TILE"
  | "METADATA_XML"
  | "RPC_RPB"
  | "NAV"
  | "TILE_INDEX_TIL";
export type SlotId =
  | "browseImage"
  | "georeference"
  | "main"
  | "metadata"
  | "browse"
  | "observation"
  | "geo1k"
  | "l1_0500m"
  | "l1_1000m"
  | "l1_2000m"
  | "l1_4000m"
  | "geo_4000m"
  | "mainTiffTile0"
  | "mainTiffTile1"
  | "mainTiffTile2"
  | "metadataXml"
  | "rpcRpb"
  | "nav"
  | "tileIndexTil";

export interface ProductFileSlot {
  readonly id: SlotId;
  readonly label: string;
  readonly role: ProductFileRole;
  readonly extensions: readonly string[];
  readonly required: boolean;
  readonly ordinal?: number;
}

export interface ProductTemplate {
  readonly id: string;
  readonly label: string;
  readonly productCode: string;
  readonly profileVersion: string;
  readonly packageRequirements: string;
  readonly requireMatchingBasenames: boolean;
  readonly slots: readonly ProductFileSlot[];
  readonly parameterSnapshot: Readonly<object>;
}

export type ProductFiles = Readonly<Partial<Record<SlotId, File>>>;

export interface InvalidProductFile {
  readonly slot: ProductFileSlot;
  readonly fileName: string;
  readonly expectedExtensions: readonly string[];
}

export interface ProductFileValidationResult {
  readonly valid: boolean;
  readonly missingSlots: readonly ProductFileSlot[];
  readonly invalidExtensions: readonly InvalidProductFile[];
  readonly mismatchedBasenames: boolean;
  readonly basenames: readonly string[];
  readonly productIssues: readonly string[];
}

export const DEFAULT_PROCESS_SNAPSHOT = Object.freeze({
  schemaVersion: "1" as const,
  operation: "DEFAULT_PROCESS" as const
});

export const GF6_WFV_BROWSE_TEMPLATE: ProductTemplate = Object.freeze({
  id: "gf6-wfv-browse-v1",
  label: "GF-6 WFV 浏览产品",
  productCode: "GF-6-WFV-BROWSE",
  profileVersion: "v1",
  packageRequirements:
    "同一产品编号的 JPG 浏览影像、JGW 地理参考和 JSON 元数据",
  requireMatchingBasenames: true,
  slots: Object.freeze([
    Object.freeze({
      id: "browseImage",
      label: "浏览影像",
      role: "BROWSE_IMAGE" as const,
      extensions: Object.freeze([".jpg", ".jpeg"]),
      required: true
    }),
    Object.freeze({
      id: "georeference",
      label: "地理参考文件",
      role: "GEOREFERENCE" as const,
      extensions: Object.freeze([".jgw"]),
      required: true
    }),
    Object.freeze({
      id: "metadata",
      label: "产品元数据",
      role: "METADATA" as const,
      extensions: Object.freeze([".json"]),
      required: true
    })
  ]),
  parameterSnapshot: DEFAULT_PROCESS_SNAPSHOT
});

export const FY4B_AGRI_TEMPLATE: ProductTemplate = Object.freeze({
  id: "fy4b-agri-v1",
  label: "FY-4B AGRI 全圆盘 L1",
  productCode: "FY-4B-AGRI",
  profileVersion: "v1",
  packageRequirements: "同一星下点、时次和版本的四个 FDI HDF 与一个 GEO HDF",
  requireMatchingBasenames: false,
  slots: Object.freeze([
    Object.freeze({
      id: "l1_0500m" as const,
      label: "FDI 0500M",
      role: "L1_0500M" as const,
      extensions: Object.freeze([".hdf"]),
      required: true
    }),
    Object.freeze({
      id: "l1_1000m" as const,
      label: "FDI 1000M",
      role: "L1_1000M" as const,
      extensions: Object.freeze([".hdf"]),
      required: true
    }),
    Object.freeze({
      id: "l1_2000m" as const,
      label: "FDI 2000M",
      role: "L1_2000M" as const,
      extensions: Object.freeze([".hdf"]),
      required: true
    }),
    Object.freeze({
      id: "l1_4000m" as const,
      label: "FDI 4000M",
      role: "L1_4000M" as const,
      extensions: Object.freeze([".hdf"]),
      required: true
    }),
    Object.freeze({
      id: "geo_4000m" as const,
      label: "GEO 4000M",
      role: "GEO_4000M" as const,
      extensions: Object.freeze([".hdf"]),
      required: true
    })
  ]),
  parameterSnapshot: Object.freeze(buildFy4bAgriSnapshot(defaultFy4bAgriForm()))
});

export const GF6_WFV_L1A_TEMPLATE: ProductTemplate = Object.freeze({
  id: "gf6-wfv-l1a-v1",
  label: "GF-6 WFV L1A 工程产品",
  productCode: "GF-6-WFV-L1A",
  profileVersion: "v1",
  packageRequirements: "三块 TIFF、产品 XML、主 RPB、NAV、TIL",
  requireMatchingBasenames: false,
  slots: Object.freeze([
    Object.freeze({
      id: "mainTiffTile0" as const,
      label: "主 TIFF 瓦片 -1",
      role: "MAIN_TIFF_TILE" as const,
      ordinal: 0,
      extensions: Object.freeze([".tif", ".tiff"]),
      required: true
    }),
    Object.freeze({
      id: "mainTiffTile1" as const,
      label: "主 TIFF 瓦片 -2",
      role: "MAIN_TIFF_TILE" as const,
      ordinal: 1,
      extensions: Object.freeze([".tif", ".tiff"]),
      required: true
    }),
    Object.freeze({
      id: "mainTiffTile2" as const,
      label: "主 TIFF 瓦片 -3",
      role: "MAIN_TIFF_TILE" as const,
      ordinal: 2,
      extensions: Object.freeze([".tif", ".tiff"]),
      required: true
    }),
    Object.freeze({
      id: "metadataXml" as const,
      label: "产品 XML",
      role: "METADATA_XML" as const,
      extensions: Object.freeze([".xml"]),
      required: true
    }),
    Object.freeze({
      id: "rpcRpb" as const,
      label: "主产品 RPB",
      role: "RPC_RPB" as const,
      extensions: Object.freeze([".rpb"]),
      required: true
    }),
    Object.freeze({
      id: "nav" as const,
      label: "NAV 导航文件",
      role: "NAV" as const,
      extensions: Object.freeze([".nav"]),
      required: true
    }),
    Object.freeze({
      id: "tileIndexTil" as const,
      label: "TIL 镶嵌索引",
      role: "TILE_INDEX_TIL" as const,
      extensions: Object.freeze([".til"]),
      required: true
    })
  ]),
  parameterSnapshot: Object.freeze(
    buildGf6WfvL1aSnapshot(defaultGf6WfvL1aForm())
  )
});

export const HY1C_CZI_L2A_TEMPLATE: ProductTemplate = Object.freeze({
  id: "hy1c-czi-l2a-v1",
  label: "HY-1C CZI L2A",
  productCode: "HY-1C-CZI",
  profileVersion: "L2A-v1",
  packageRequirements: "一套 L2A HDF5 主文件、产品 XML 元数据和 JPG 浏览图",
  requireMatchingBasenames: false,
  slots: Object.freeze([
    Object.freeze({
      id: "main",
      label: "L2A 主文件",
      role: "MAIN" as const,
      extensions: Object.freeze([".h5", ".hdf5"]),
      required: true
    }),
    Object.freeze({
      id: "metadata",
      label: "产品元数据",
      role: "METADATA" as const,
      extensions: Object.freeze([".xml"]),
      required: true
    }),
    Object.freeze({
      id: "browse",
      label: "浏览图",
      role: "BROWSE" as const,
      extensions: Object.freeze([".jpg", ".jpeg"]),
      required: true
    })
  ]),
  parameterSnapshot: Object.freeze(buildHy1cCziL2aSnapshot(defaultL2aForm()))
});

export const FY3H_MERSI_TEMPLATE: ProductTemplate = Object.freeze({
  id: "fy3h-mersi-l1-1000m-geo1k-v1",
  label: "FY-3H MERSI L1",
  productCode: "FY-3H-MERSI",
  profileVersion: "L1-1000M-GEO1K-v1",
  packageRequirements: "同一产品时次和版本的 1000M 观测 HDF 与 GEO1K 定位 HDF",
  requireMatchingBasenames: false,
  slots: Object.freeze([
    Object.freeze({
      id: "observation",
      label: "1000M 观测文件",
      role: "OBSERVATION" as const,
      extensions: Object.freeze([".hdf"]),
      required: true
    }),
    Object.freeze({
      id: "geo1k",
      label: "GEO1K 定位文件",
      role: "GEO1K" as const,
      extensions: Object.freeze([".hdf"]),
      required: true
    })
  ]),
  parameterSnapshot: Object.freeze(
    buildFy3hMersiSnapshot(defaultFy3hMersiForm())
  )
});

export const HY2D_ALTIMETER_TEMPLATE: ProductTemplate = Object.freeze({
  id: "hy2d-altimeter-v1",
  label: "HY-2D 高度计 IDR 2MC",
  productCode: "HY-2D-ALTIMETER",
  profileVersion: "v1",
  packageRequirements: "单个 HY-2D IDR 2MC 原始 tar.gz 产品包",
  requireMatchingBasenames: false,
  slots: Object.freeze([
    Object.freeze({
      id: "main",
      label: "IDR 2MC 产品包",
      role: "MAIN" as const,
      extensions: Object.freeze([".tar.gz"]),
      required: true
    })
  ]),
  parameterSnapshot: Object.freeze(
    buildHy2dAltimeterSnapshot(defaultHy2dAltimeterForm())
  )
});

export const PRODUCT_TEMPLATES = Object.freeze([
  GF6_WFV_L1A_TEMPLATE,
  FY4B_AGRI_TEMPLATE,
  HY1C_CZI_L2A_TEMPLATE,
  FY3H_MERSI_TEMPLATE,
  HY2D_ALTIMETER_TEMPLATE
]);

/** Returns a file's base name without its final extension. */
export function basenameWithoutExtension(fileName: string): string {
  const normalizedName = fileName.replace(/\\/g, "/").split("/").pop() ?? "";
  if (normalizedName.toLowerCase().endsWith(".tar.gz")) {
    return normalizedName.slice(0, -".tar.gz".length);
  }
  return normalizedName.replace(/\.[^.]+$/, "");
}

function matchesExtension(
  fileName: string,
  expectedExtension: string
): boolean {
  const normalizedName = fileName.replace(/\\/g, "/").split("/").pop() ?? "";
  return normalizedName.toLowerCase().endsWith(expectedExtension.toLowerCase());
}

/**
 * Validates the files selected for a product template before any upload starts.
 * The map is keyed by the slot id declared by the template.
 */
export function validateProductFiles(
  files: ProductFiles,
  template: ProductTemplate = GF6_WFV_L1A_TEMPLATE
): ProductFileValidationResult {
  const missingSlots = template.slots.filter(
    slot => slot.required && !files[slot.id]
  );
  const invalidExtensions: InvalidProductFile[] = [];
  const basenames: string[] = [];

  for (const slot of template.slots) {
    const file = files[slot.id];
    if (!file) continue;

    if (
      !slot.extensions.some(expected => matchesExtension(file.name, expected))
    ) {
      invalidExtensions.push({
        slot,
        fileName: file.name,
        expectedExtensions: slot.extensions
      });
    }
    basenames.push(basenameWithoutExtension(file.name));
  }

  const mismatchedBasenames =
    template.requireMatchingBasenames &&
    basenames.length > 1 &&
    basenames.some(name => name !== basenames[0]);
  const productIssues =
    template.id === FY3H_MERSI_TEMPLATE.id
      ? validateFy3hMersiPair({
          observation: files.observation,
          geo1k: files.geo1k
        })
          .issues.filter(issue => issue.code !== "MISSING_FILE")
          .map(issue => issue.message)
      : template.id === FY4B_AGRI_TEMPLATE.id
        ? validateFy4bAgriFiles({
            l1_0500m: files.l1_0500m,
            l1_1000m: files.l1_1000m,
            l1_2000m: files.l1_2000m,
            l1_4000m: files.l1_4000m,
            geo_4000m: files.geo_4000m
          })
            .issues.filter(issue => issue.code !== "MISSING_FILE")
            .map(issue => issue.message)
        : template.id === GF6_WFV_L1A_TEMPLATE.id
          ? validateGf6WfvL1aFiles({
              mainTiffTile0: files.mainTiffTile0,
              mainTiffTile1: files.mainTiffTile1,
              mainTiffTile2: files.mainTiffTile2,
              metadataXml: files.metadataXml,
              rpcRpb: files.rpcRpb,
              nav: files.nav,
              tileIndexTil: files.tileIndexTil
            })
              .issues.filter(issue => issue.code !== "MISSING_FILE")
              .map(issue => issue.message)
          : [];

  return {
    valid:
      missingSlots.length === 0 &&
      invalidExtensions.length === 0 &&
      !mismatchedBasenames &&
      productIssues.length === 0,
    missingSlots,
    invalidExtensions,
    mismatchedBasenames,
    basenames,
    productIssues
  };
}
