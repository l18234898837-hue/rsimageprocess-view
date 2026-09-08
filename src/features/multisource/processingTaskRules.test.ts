import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type {
  ExecutionProgressArtifact,
  PreflightCandidate
} from "../../api/multiSourceSatellite";
import {
  FY4B_AGRI_TEMPLATE,
  FY3H_MERSI_TEMPLATE,
  GF6_WFV_L1A_TEMPLATE,
  GF6_WFV_BROWSE_TEMPLATE,
  HY1C_CZI_L2A_TEMPLATE,
  HY2D_ALTIMETER_TEMPLATE
} from "./productTemplates";
import {
  artifactDownloadFileName,
  assertTemplateSwitchAllowed,
  extractProcessingErrorMessage,
  authorizeArtifactDownload,
  buildPreflightAssets,
  isRetryableStageStatus,
  processingStartSuccessMessage,
  resetProcessingRunState,
  resetSlotStates,
  resultZipFileName,
  selectPreflightCandidate,
  serializeParameterSnapshot,
  translateProcessingErrorMessage
} from "./processingTaskRules";

const candidate = (
  overrides: Partial<PreflightCandidate>
): PreflightCandidate => ({
  id: "candidate",
  packageId: "package",
  supportStatus: "SUPPORTED",
  confidence: 1,
  ...overrides
});

test("candidate selection prefers one exact profile key", () => {
  const exact = candidate({
    id: "exact",
    profileKey: { productCode: "HY-1C-CZI", profileVersion: "L2A-v1" }
  });
  const generic = candidate({
    id: "generic",
    packageId: "HY1C-CZI-LEGACY-PACKAGE"
  });

  assert.equal(
    selectPreflightCandidate([generic, exact], HY1C_CZI_L2A_TEMPLATE),
    exact
  );
});

test("HY-1C rejects a candidate matching only productCode", () => {
  assert.throws(
    () =>
      selectPreflightCandidate(
        [
          candidate({
            profileKey: {
              productCode: "HY-1C-CZI",
              profileVersion: "L1B-v1"
            }
          })
        ],
        HY1C_CZI_L2A_TEMPLATE
      ),
    /当前处理服务不支持 HY-1C CZI L2A/
  );
});

test("HY-1C rejects a candidate matching only profileVersion", () => {
  assert.throws(
    () =>
      selectPreflightCandidate(
        [
          candidate({
            profileKey: {
              productCode: "HY-1C-CZI-OTHER",
              profileVersion: "L2A-v1"
            }
          })
        ],
        HY1C_CZI_L2A_TEMPLATE
      ),
    /当前处理服务不支持 HY-1C CZI L2A/
  );
});

test("HY-1C rejects a supported generic legacy candidate", () => {
  assert.throws(
    () =>
      selectPreflightCandidate(
        [candidate({ packageId: "HY1C-CZI-LEGACY-PACKAGE" })],
        HY1C_CZI_L2A_TEMPLATE
      ),
    /当前处理服务不支持 HY-1C CZI L2A/
  );
});

test("replaced GF-6 Browse package ids no longer use a frontend fallback", () => {
  const legacy = candidate({ packageId: "GF6-WFV-LEVEL1A-20260826" });
  assert.throws(
    () => selectPreflightCandidate([legacy], GF6_WFV_BROWSE_TEMPLATE),
    /当前处理服务不支持 GF-6 WFV 浏览产品/
  );
});

test("new products select only their exact supported profile", () => {
  const fy3h = candidate({
    profileKey: {
      productCode: "FY-3H-MERSI",
      profileVersion: "L1-1000M-GEO1K-v1"
    }
  });
  const hy2d = candidate({
    profileKey: { productCode: "HY-2D-ALTIMETER", profileVersion: "v1" }
  });
  const fy4b = candidate({
    profileKey: { productCode: "FY-4B-AGRI", profileVersion: "v1" }
  });
  const gf6 = candidate({
    profileKey: { productCode: "GF-6-WFV-L1A", profileVersion: "v1" }
  });

  assert.equal(selectPreflightCandidate([fy3h], FY3H_MERSI_TEMPLATE), fy3h);
  assert.equal(selectPreflightCandidate([hy2d], HY2D_ALTIMETER_TEMPLATE), hy2d);
  assert.equal(selectPreflightCandidate([fy4b], FY4B_AGRI_TEMPLATE), fy4b);
  assert.equal(selectPreflightCandidate([gf6], GF6_WFV_L1A_TEMPLATE), gf6);
});

test("template switch clears every slot and rejects active work", () => {
  const slots = {
    browseImage: { status: "UPLOADED", sysFileId: 7 },
    metadata: { status: "FAILED", error: "bad" }
  };

  resetSlotStates(slots, ["browseImage", "metadata"]);
  assert.deepEqual(slots, {
    browseImage: { status: "EMPTY" },
    metadata: { status: "EMPTY" }
  });
  assert.throws(
    () => assertTemplateSwitchAllowed(101, "RUNNING", false),
    /任务正在执行/
  );
  assert.throws(
    () => assertTemplateSwitchAllowed(undefined, undefined, true),
    /文件正在上传/
  );
  assert.doesNotThrow(() =>
    assertTemplateSwitchAllowed(101, "SUCCEEDED", false)
  );
});

test("retry is gated to FAILED and RECOVERY_PENDING", () => {
  assert.equal(isRetryableStageStatus("FAILED"), true);
  assert.equal(isRetryableStageStatus("RECOVERY_PENDING"), true);
  for (const status of ["CREATED", "RUNNING", "SUCCEEDED", "CANCELED"]) {
    assert.equal(isRetryableStageStatus(status), false);
  }
});

test("start success message remains started after a synchronous dispatch", () => {
  assert.equal(processingStartSuccessMessage(), "任务已启动");
});

test("multisource API preserves backend long identifiers as strings", () => {
  const api = readFileSync("src/api/multiSourceSatellite.ts", "utf8");

  assert.match(api, /type ProcessingIdentifier = string \| number/);
  assert.match(api, /taskId: ProcessingIdentifier/);
  assert.match(api, /stageId: ProcessingIdentifier/);
});

test("processing errors prefer the backend message over the HTTP status", () => {
  const error = {
    message: "Request failed with status code 409",
    response: { data: { msg: "输入参数错误：L2A ROI bounds are invalid" } }
  };

  assert.equal(
    extractProcessingErrorMessage(error),
    "输入参数错误：L2A ROI bounds are invalid"
  );
});

test("processing errors explain an ROI with no quality-valid pixels", () => {
  assert.equal(
    translateProcessingErrorMessage(
      "L2A quality filtering left no valid pixels in the requested output area"
    ),
    "所选 ROI 没有质量有效像元，请更换 ROI 或使用包含该区域有效覆盖的产品"
  );
});

test("processing errors explain the authoritative GF-6 output limit", () => {
  assert.equal(
    translateProcessingErrorMessage(
      "GF6_OUTPUT_LIMIT_EXCEEDED: grid pixels 31339110702159 exceed 2000000000"
    ),
    "GF-6 输出网格超出服务端安全上限：请增大输出分辨率、缩小 ROI、减少波段或关闭部分衍生产物"
  );
});

test("processing errors explain a Worker timeout", () => {
  assert.equal(
    translateProcessingErrorMessage(" process timed out "),
    "处理超时：当前数据量或输出范围较大，请减少波段、启用 ROI，或检查 Worker 超时配置"
  );
});

test("resetting a processing run clears the previous candidate and progress", () => {
  const state = {
    preflight: { preflightToken: "old" },
    candidate: { packageId: "old" },
    taskStatus: "FAILED" as const,
    progress: { taskId: 101 },
    errorMessage: "old error"
  };

  resetProcessingRunState(state);

  assert.deepEqual(state, {
    preflight: undefined,
    candidate: undefined,
    taskStatus: undefined,
    progress: undefined,
    errorMessage: ""
  });
});

test("completed processing view exposes the ZIP action without an artifact list", () => {
  const component = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );
  const taskComposable = readFileSync(
    "src/features/multisource/useProcessingTask.ts",
    "utf8"
  );

  assert.equal(component.includes('class="artifact-shelf"'), false);
  assert.equal(component.includes("下载最终 ZIP"), true);
  assert.equal(component.includes(':loading="isDownloadingResult"'), true);
  assert.equal(component.includes(':disabled="isDownloadingResult"'), true);
  assert.equal(
    taskComposable.includes("if (isDownloadingResult.value) return false;"),
    true
  );
  assert.match(
    taskComposable,
    /finally \{\s*isDownloadingResult\.value = false;\s*\}/
  );
});

test("parameter snapshots are serialized as JSON strings", () => {
  const serialized = serializeParameterSnapshot({
    schemaVersion: "1",
    operation: "DEFAULT_PROCESS"
  });

  assert.equal(typeof serialized, "string");
  assert.deepEqual(JSON.parse(serialized), {
    schemaVersion: "1",
    operation: "DEFAULT_PROCESS"
  });
});

test("artifact download authorization requires the exact current artifact", () => {
  const authorized: ExecutionProgressArtifact = {
    stageId: 8,
    type: "STANDARD_COG",
    uri: "rs://output/task/standard-cog.tif",
    checksum: "sha256",
    downloadable: true
  };
  const denied = { ...authorized, uri: "rs://output/task/private.tif" };

  assert.equal(authorizeArtifactDownload([authorized], authorized), authorized);
  assert.throws(
    () => authorizeArtifactDownload([authorized], denied),
    /未获服务端下载授权/
  );
  assert.throws(
    () =>
      authorizeArtifactDownload(
        [{ ...authorized, downloadable: false }],
        authorized
      ),
    /未获服务端下载授权/
  );
});

test("download filenames preserve GF-6 ZIP compatibility and artifact extensions", () => {
  assert.equal(
    resultZipFileName(GF6_WFV_BROWSE_TEMPLATE),
    "gf6-wfv-result.zip"
  );
  assert.equal(
    resultZipFileName(HY1C_CZI_L2A_TEMPLATE),
    "hy1c-czi-l2a-result.zip"
  );
  assert.equal(
    artifactDownloadFileName({
      stageId: 8,
      type: "STANDARD_COG",
      uri: "rs://output/task/standard-cog.tif?token=ignored",
      checksum: "sha256",
      downloadable: true
    }),
    "standard-cog.tif"
  );
  assert.equal(
    artifactDownloadFileName({
      stageId: 9,
      type: "SALIENCY_MASK_COG",
      uri: "rs://output/task/no-extension",
      checksum: "sha256",
      downloadable: true
    }),
    "saliency_mask_cog.bin"
  );
});

test("preflight assets retain GF-6 tile ordinals without optional footprint slots", () => {
  const slots = Object.fromEntries(
    GF6_WFV_L1A_TEMPLATE.slots.map((slot, index) => [
      slot.id,
      { sysFileId: index + 1, file: { name: `${slot.id}.file` } as File }
    ])
  );

  const assets = buildPreflightAssets(GF6_WFV_L1A_TEMPLATE, slots);

  assert.deepEqual(
    assets
      .slice(0, 3)
      .map(asset => [asset.role, asset.ordinal, asset.required]),
    [
      ["MAIN_TIFF_TILE", 0, true],
      ["MAIN_TIFF_TILE", 1, true],
      ["MAIN_TIFF_TILE", 2, true]
    ]
  );
  assert.equal(assets.length, 7);
  assert.equal(
    assets.some(asset => asset.role.startsWith("FOOTPRINT_")),
    false
  );
});
