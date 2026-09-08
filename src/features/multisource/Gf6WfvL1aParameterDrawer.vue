<template>
  <el-drawer
    v-model="open"
    class="product-parameter-drawer"
    direction="rtl"
    size="520px"
    append-to-body
    :lock-scroll="false"
    :modal="true"
    :show-close="false"
  >
    <template #header="{ titleId }"
      ><div class="drawer-heading">
        <div>
          <span>ENGINEERING CONFIGURATION</span>
          <h2 :id="titleId">GF-6 WFV L1A 参数</h2>
          <p>
            {{
              locked
                ? "当前显示已保存的参数快照。"
                : "配置名义 RPC 工程产品输出。"
            }}
          </p>
        </div>
        <button type="button" aria-label="关闭参数工作台" @click="open = false">
          <el-icon><Close /></el-icon>
        </button></div
    ></template>
    <div class="drawer-body">
      <ParameterWorkbenchOverview
        :bands="overviewBands"
        :parameters="overviewParameters"
        :constraints="ENGINEERING_CONSTRAINTS"
      />
      <fieldset v-if="visibleSteps.includes('preprocess')" :disabled="locked">
        <legend>工程网格</legend>
        <div class="field-grid">
          <label
            ><span>目标 CRS</span
            ><input
              v-model.trim="form.targetCrs"
              placeholder="EPSG:4326" /></label
          ><label
            ><span>输出分辨率（{{ resolutionConstraint.unit }}）</span
            ><input
              v-model.number="form.resolution"
              type="number"
              :min="resolutionConstraint.minimum"
              :step="resolutionConstraint.step" /></label
          ><label
            ><span>高度模式</span
            ><input :value="rpcHeightMode" readonly /></label
          ><label
            ><span>固定高程（米）</span
            ><input :value="rpcHeight" readonly /></label
          ><label class="toggle-row"
            ><span>WGS84 ROI（默认开启）</span
            ><input v-model="roiEnabled" type="checkbox" :disabled="!roiReady"
          /></label>
        </div>
        <small class="field-note"
          >默认使用快速测试范围；取消勾选后按产品全幅处理。EPSG:4326/4490
          按度，其余投影 CRS
          按米；后端会在写入前按网格像元数和预估字节执行最终保护。</small
        >
        <div v-if="roiEnabled" class="field-grid compact-grid">
          <label v-for="field in ROI_FIELDS" :key="field.key"
            ><span>{{ field.label }}</span
            ><input
              v-model.number="roi[field.index]"
              type="number"
              step="0.0001"
              :min="field.longitude ? -180 : -90"
              :max="field.longitude ? 180 : 90"
          /></label>
        </div>
      </fieldset>
      <fieldset v-if="visibleSteps.includes('preprocess')" :disabled="locked">
        <legend>输出波段</legend>
        <div class="band-grid">
          <label
            v-for="band in GF6_WFV_L1A_BANDS"
            :key="band"
            :class="{ 'is-selected': form.bands.includes(band) }"
            ><input v-model="form.bands" type="checkbox" :value="band" /><i
              aria-hidden="true"
            /><strong>B{{ band }}</strong
            ><small>WFV</small></label
          >
        </div>
      </fieldset>
      <fieldset
        v-if="visibleSteps.includes('feature-extraction')"
        :disabled="locked"
      >
        <legend class="toggle-heading">
          <span>特征提取</span
          ><label class="toggle"
            ><input
              :checked="visibleSteps.includes('feature-extraction')"
              disabled
              type="checkbox"
            /><i aria-hidden="true" /><small>{{
              form.features.enabled ? "启用" : "关闭"
            }}</small></label
          >
        </legend>
        <div class="chip-list">
          <label v-for="metric in GF6_WFV_L1A_METRICS" :key="metric"
            ><input
              v-model="form.features.metrics"
              type="checkbox"
              :value="metric"
              :disabled="!form.features.enabled || locked"
            /><span>{{ featureMetricLabel(metric) }}</span></label
          >
        </div>
        <div
          v-if="form.features.metrics.includes('local_variance')"
          class="field-grid compact-grid"
        >
          <label
            ><span>局部方差窗口</span
            ><input
              v-model.number="form.features.windowSize"
              type="number"
              min="3"
              :max="GF6_WFV_L1A_MAX_WINDOW_SIZE"
              step="2"
              :disabled="!form.features.enabled || locked"
          /></label>
        </div>
      </fieldset>
      <fieldset v-if="visibleSteps.includes('rgb-fusion')" :disabled="locked">
        <legend class="toggle-heading">
          <span>RGB 波段组合</span
          ><label class="toggle"
            ><input
              :checked="visibleSteps.includes('rgb-fusion')"
              disabled
              type="checkbox"
            /><i aria-hidden="true" /><small>{{
              form.fusion.enabled ? "启用" : "关闭"
            }}</small></label
          >
        </legend>
        <div class="rgb-grid">
          <label
            ><span>R</span
            ><select
              v-model.number="form.fusion.red"
              :disabled="!form.fusion.enabled || locked"
            >
              <option v-for="band in form.bands" :key="band" :value="band">
                B{{ band }}
              </option>
            </select></label
          ><label
            ><span>G</span
            ><select
              v-model.number="form.fusion.green"
              :disabled="!form.fusion.enabled || locked"
            >
              <option v-for="band in form.bands" :key="band" :value="band">
                B{{ band }}
              </option>
            </select></label
          ><label
            ><span>B</span
            ><select
              v-model.number="form.fusion.blue"
              :disabled="!form.fusion.enabled || locked"
            >
              <option v-for="band in form.bands" :key="band" :value="band">
                B{{ band }}
              </option>
            </select></label
          >
        </div>
        <div class="field-grid compact-grid">
          <label
            ><span>低百分位</span
            ><input
              v-model.number="form.fusion.lowPercentile"
              type="number"
              min="0"
              max="100"
              :disabled="!form.fusion.enabled || locked" /></label
          ><label
            ><span>高百分位</span
            ><input
              v-model.number="form.fusion.highPercentile"
              type="number"
              min="0"
              max="100"
              :disabled="!form.fusion.enabled || locked"
          /></label>
        </div>
      </fieldset>
      <fieldset
        v-if="visibleSteps.includes('anomaly-detection')"
        :disabled="locked"
      >
        <legend class="toggle-heading">
          <span>显著性检测</span
          ><label class="toggle"
            ><input
              :checked="visibleSteps.includes('anomaly-detection')"
              disabled
              type="checkbox"
            /><i aria-hidden="true" /><small>{{
              form.saliency.enabled ? "启用" : "关闭"
            }}</small></label
          >
        </legend>
        <div class="field-grid">
          <label class="is-wide"
            ><span>数据源</span
            ><select
              v-model="form.saliency.source"
              :disabled="!form.saliency.enabled || locked"
            >
              <option
                v-for="band in form.bands"
                :key="band"
                :value="`B${band}`"
              >
                B{{ band }}
              </option>
            </select></label
          ><label
            ><span>阈值</span
            ><input
              v-model.number="form.saliency.threshold"
              type="number"
              min="0"
              max="1"
              step="0.05"
              :disabled="!form.saliency.enabled || locked" /></label
          ><label
            ><span>窗口</span
            ><input
              v-model.number="form.saliency.windowSize"
              type="number"
              min="3"
              :max="GF6_WFV_L1A_MAX_WINDOW_SIZE"
              step="2"
              :disabled="!form.saliency.enabled || locked"
          /></label>
        </div>
      </fieldset>
      <div v-if="issues.length" class="parameter-errors" role="alert">
        <span v-for="issue in issues" :key="issue.field">{{
          issue.message
        }}</span>
      </div>
    </div>
    <template #footer
      ><div class="drawer-footer">
        <span :class="{ 'is-invalid': issues.length }">{{
          issues.length ? `发现 ${issues.length} 项待处理` : "参数校验已通过"
        }}</span
        ><el-button type="primary" @click="open = false">{{
          locked ? "关闭快照" : "完成配置"
        }}</el-button>
      </div></template
    >
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { Close } from "@element-plus/icons-vue";
import ParameterWorkbenchOverview from "./ParameterWorkbenchOverview.vue";
import { featureMetricLabel } from "./featureMetricLabels";
import {
  GF6_WFV_L1A_BANDS,
  GF6_WFV_L1A_MAX_WINDOW_SIZE,
  GF6_WFV_L1A_METRICS,
  gf6ResolutionConstraint,
  type Gf6WfvL1aForm
} from "./gf6WfvL1aParameters";
import { gf6RoiStateAfterMetadataChange } from "./gf6WfvL1aRoi";

const open = defineModel<boolean>({ required: true });
const props = defineProps<{
  form: Gf6WfvL1aForm;
  metadataFile?: File;
  visibleSteps: readonly string[];
  locked: boolean;
  issues: { field: string; message: string }[];
}>();
const emit = defineEmits<{ "update-form": [value: Gf6WfvL1aForm] }>();
const ENGINEERING_CONSTRAINTS = [
  "NOMINAL_RPC_NO_DEM",
  "accuracyStatus=UNVALIDATED",
  "CANDIDATE_ONLY"
] as const;
const rpcHeightMode = "CONSTANT" as const;
const rpcHeight = 0 as const;
const form = reactive<Gf6WfvL1aForm>(
  JSON.parse(JSON.stringify(props.form)) as Gf6WfvL1aForm
);
const overviewBands = computed(() =>
  props.visibleSteps.includes("preprocess")
    ? form.bands.map(band => `B${band}`)
    : []
);
const overviewParameters = computed(() => {
  const parameters: { label: string; value: string }[] = [];
  if (props.visibleSteps.includes("preprocess")) {
    parameters.push(
      { label: "工程网格", value: `${form.targetCrs} · ${form.resolution}` },
      { label: "处理范围", value: form.roi ? form.roi.join(", ") : "全幅镶嵌" }
    );
  }
  if (props.visibleSteps.includes("rgb-fusion")) {
    parameters.push(
      {
        label: "RGB 波段",
        value: `B${form.fusion.red} / B${form.fusion.green} / B${form.fusion.blue}`
      },
      {
        label: "拉伸范围",
        value: `${form.fusion.lowPercentile}% - ${form.fusion.highPercentile}%`
      }
    );
  }
  if (props.visibleSteps.includes("feature-extraction")) {
    parameters.push({
      label: "特征项",
      value: form.features.metrics.map(featureMetricLabel).join("、")
    });
  }
  if (props.visibleSteps.includes("anomaly-detection")) {
    parameters.push({
      label: "检测源",
      value: `${form.saliency.source} · 阈值 ${form.saliency.threshold}`
    });
  }
  return parameters;
});
const resolutionConstraint = computed(() =>
  gf6ResolutionConstraint(form.targetCrs)
);
const roiEnabled = ref(form.roi !== null);
const roiReady = ref(form.roi !== null);
const roi = reactive<[number, number, number, number]>(
  form.roi ? [...form.roi] : [0, 0, 0, 0]
);
const ROI_FIELDS = [
  { key: "minLon", label: "最小经度", index: 0, longitude: true },
  { key: "minLat", label: "最小纬度", index: 1, longitude: false },
  { key: "maxLon", label: "最大经度", index: 2, longitude: true },
  { key: "maxLat", label: "最大纬度", index: 3, longitude: false }
] as const;
let metadataReadVersion = 0;
watch(
  () => props.metadataFile,
  async (metadataFile, previousMetadataFile) => {
    const readVersion = ++metadataReadVersion;
    const metadataChanged =
      previousMetadataFile !== undefined &&
      metadataFile !== previousMetadataFile;
    if (metadataChanged) {
      roiEnabled.value = false;
      roiReady.value = false;
      form.roi = null;
    }
    if (!metadataFile) {
      if (form.roi === null) roiReady.value = false;
      return;
    }
    try {
      const state = gf6RoiStateAfterMetadataChange(await metadataFile.text());
      if (readVersion !== metadataReadVersion || !state.draft) return;
      if (metadataChanged || form.roi === null) {
        roi.splice(0, roi.length, ...state.draft);
        roiReady.value = true;
      }
    } catch {
      if (readVersion === metadataReadVersion && form.roi === null) {
        roiReady.value = false;
      }
    }
  },
  { immediate: true }
);
watch(roiEnabled, enabled => {
  form.roi = enabled && roiReady.value ? [...roi] : null;
});
watch(
  roi,
  value => {
    if (roiEnabled.value) form.roi = [...value];
  },
  { deep: true }
);
watch(
  form,
  value =>
    emit("update-form", JSON.parse(JSON.stringify(value)) as Gf6WfvL1aForm),
  { deep: true }
);
</script>
