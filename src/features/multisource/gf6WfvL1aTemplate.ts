export type Gf6L1aRole =
  | "MAIN_TIFF_TILE"
  | "METADATA_XML"
  | "RPC_RPB"
  | "NAV"
  | "TILE_INDEX_TIL";
export interface Gf6L1aForm {
  targetCrs: string;
  resolution: number;
  rpcHeight: number;
  roi: [number, number, number, number] | null;
  bands: number[];
  features: { enabled: boolean; metrics: string[] };
  fusion: { enabled: boolean; red: number; green: number; blue: number };
  saliency: {
    enabled: boolean;
    source: string;
    windowSize: number;
    threshold: number;
  };
}
export const GF6_WFV_L1A_TEMPLATE = Object.freeze({
  id: "gf6-wfv-l1a-v1",
  label: "GF-6 WFV L1A",
  productCode: "GF-6-WFV-L1A",
  profileVersion: "v1",
  slots: Object.freeze([
    {
      id: "tile1",
      role: "MAIN_TIFF_TILE" as const,
      extensions: [".tif", ".tiff"],
      required: true
    },
    {
      id: "tile2",
      role: "MAIN_TIFF_TILE" as const,
      extensions: [".tif", ".tiff"],
      required: true
    },
    {
      id: "tile3",
      role: "MAIN_TIFF_TILE" as const,
      extensions: [".tif", ".tiff"],
      required: true
    },
    {
      id: "metadata",
      role: "METADATA_XML" as const,
      extensions: [".xml"],
      required: true
    },
    {
      id: "rpc",
      role: "RPC_RPB" as const,
      extensions: [".rpb"],
      required: true
    },
    {
      id: "navigation",
      role: "NAV" as const,
      extensions: [".nav"],
      required: true
    },
    {
      id: "tileIndex",
      role: "TILE_INDEX_TIL" as const,
      extensions: [".til"],
      required: true
    }
  ]),
  parameterSnapshotSchema: "gf6-wfv-l1a-v1"
});
export const defaultGf6WfvL1aForm = (): Gf6L1aForm => ({
  targetCrs: "EPSG:4326",
  resolution: 0.00015,
  rpcHeight: 0,
  roi: null,
  bands: [1, 2, 3, 4, 5, 6, 7, 8],
  features: { enabled: false, metrics: [] },
  fusion: { enabled: false, red: 3, green: 2, blue: 1 },
  saliency: { enabled: false, source: "B3", windowSize: 9, threshold: 0.95 }
});
export function buildGf6WfvL1aSnapshot(form: Gf6L1aForm): string {
  if (
    form.resolution <= 0 ||
    !Number.isFinite(form.resolution) ||
    !Number.isFinite(form.rpcHeight)
  )
    throw new Error("GF6 parameters are invalid");
  if (
    !form.bands.length ||
    new Set(form.bands).size !== form.bands.length ||
    form.bands.some(b => b < 1 || b > 8)
  )
    throw new Error("GF6 bands are invalid");
  if (
    form.fusion.enabled &&
    [form.fusion.red, form.fusion.green, form.fusion.blue].some(
      b => !form.bands.includes(b)
    )
  )
    throw new Error("GF6 fusion bands must be selected");
  if (
    form.saliency.enabled &&
    !form.bands.includes(Number(form.saliency.source.slice(1)))
  )
    throw new Error("GF6 saliency source must be selected");
  if (
    form.saliency.windowSize < 3 ||
    form.saliency.windowSize % 2 === 0 ||
    form.saliency.threshold < 0 ||
    form.saliency.threshold > 1
  )
    throw new Error("GF6 saliency parameters are invalid");
  return JSON.stringify({
    schemaVersion: "gf6-wfv-l1a-v1",
    targetCrs: form.targetCrs,
    resolution: form.resolution,
    rpcHeightMode: "CONSTANT",
    rpcHeight: form.rpcHeight,
    roi: form.roi,
    bands: form.bands,
    features: form.features,
    fusion: form.fusion,
    saliency: form.saliency
  });
}
