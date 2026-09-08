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
    <template #header>
      <div class="drawer-heading">
        <div>
          <span>SWATH CONFIGURATION</span>
          <h2>FY-3H MERSI L1 参数</h2>
          <p>
            {{
              locked
                ? "当前显示已保存的参数快照。"
                : "配置扫描带输出与派生算法。"
            }}
          </p>
        </div>
        <button type="button" aria-label="关闭参数工作台" @click="open = false">
          <el-icon><Close /></el-icon>
        </button>
      </div>
    </template>

    <div class="drawer-body">
      <div v-if="visibleSteps.includes('preprocess')" class="profile-signal">
        <div>
          <span>OUTPUT PROFILE</span><strong>{{ summary.grid }}</strong>
        </div>
        <code>{{ form.bands.length }}/25 CHANNELS</code>
      </div>
      <ParameterWorkbenchOverview
        :bands="visibleSteps.includes('preprocess') ? summary.outputBands : []"
        :parameters="overviewParameters"
      />

      <fieldset v-if="visibleSteps.includes('preprocess')" :disabled="locked">
        <legend>网格</legend>
        <div class="field-grid">
          <label class="is-wide">
            <span>目标 CRS</span>
            <input
              v-model.trim="form.targetCrs"
              list="fy3h-crs-options"
              placeholder="EPSG:4326 或投影 EPSG"
            />
            <datalist id="fy3h-crs-options">
              <option value="EPSG:4326" />
              <option value="EPSG:3857" />
              <option value="EPSG:32650" />
              <option value="EPSG:32651" />
            </datalist>
          </label>
          <label>
            <span>{{ isWgs84 ? "分辨率（度）" : "分辨率（米）" }}</span>
            <input
              v-if="isWgs84"
              v-model.number="form.resolutionDegrees"
              type="number"
              min="0.000001"
              step="0.001"
            />
            <input
              v-else
              v-model.number="form.resolutionMeters"
              type="number"
              min="0.01"
              step="10"
            />
          </label>
          <label
            ><span>连续数据重采样</span><input value="nearest" readonly
          /></label>
        </div>
      </fieldset>

      <fieldset v-if="visibleSteps.includes('preprocess')" :disabled="locked">
        <legend>输出波段</legend>
        <div class="band-grid">
          <label
            v-for="band in FY3H_MERSI_BANDS"
            :key="band"
            :class="[
              { 'is-selected': form.bands.includes(band) },
              band <= 19 ? 'is-reflective' : 'is-emissive'
            ]"
          >
            <input v-model="form.bands" type="checkbox" :value="band" />
            <i aria-hidden="true" />
            <strong>CH{{ String(band).padStart(2, "0") }}</strong>
            <small>{{ band <= 19 ? "REF" : "TIR" }}</small>
          </label>
        </div>
      </fieldset>

      <fieldset v-if="visibleSteps.includes('preprocess')" :disabled="locked">
        <legend class="toggle-heading">
          <span>WGS84 ROI</span>
          <label class="toggle">
            <input v-model="form.roi.enabled" type="checkbox" />
            <i aria-hidden="true" />
            <small>{{ form.roi.enabled ? "启用" : "关闭" }}</small>
          </label>
        </legend>
        <div class="field-grid">
          <label v-for="field in ROI_FIELDS" :key="field.key">
            <span>{{ field.label }}</span>
            <input
              v-model.number="form.roi[field.key]"
              type="number"
              step="0.0001"
              :min="field.longitude ? -180 : -90"
              :max="field.longitude ? 180 : 90"
              :disabled="!form.roi.enabled || locked"
            />
          </label>
        </div>
      </fieldset>

      <fieldset
        v-if="visibleSteps.includes('feature-extraction')"
        :disabled="locked"
      >
        <legend class="toggle-heading">
          <span>特征提取</span>
          <label class="toggle">
            <i aria-hidden="true" />
          </label>
        </legend>
        <div class="chip-list">
          <label v-for="metric in FEATURE_METRICS" :key="metric.value">
            <input
              v-model="form.features.metrics"
              type="checkbox"
              :value="metric.value"
              :disabled="!form.features.enabled || locked"
            />
            <span>{{ metric.label }}</span>
          </label>
        </div>
        <div
          v-if="form.features.metrics.includes('local_variance')"
          class="field-grid compact-grid"
        >
          <label>
            <span>局部方差窗口</span>
            <input
              v-model.number="form.features.windowSize"
              type="number"
              min="3"
              step="2"
              :disabled="!form.features.enabled || locked"
            />
          </label>
        </div>
      </fieldset>

      <fieldset v-if="visibleSteps.includes('rgb-fusion')" :disabled="locked">
        <legend class="toggle-heading">
          <span>RGB 波段组合</span>
          <label class="toggle">
            <i aria-hidden="true" />
          </label>
        </legend>
        <div class="rgb-grid">
          <label v-for="channel in RGB_CHANNELS" :key="channel.key">
            <span>{{ channel.label }}</span>
            <select
              v-model.number="form.fusion[channel.key]"
              :disabled="!form.fusion.enabled || locked"
            >
              <option v-for="band in reflectiveBands" :key="band" :value="band">
                CH{{ String(band).padStart(2, "0") }}
              </option>
            </select>
          </label>
        </div>
        <div class="field-grid compact-grid">
          <label
            ><span>低百分位</span
            ><input
              v-model.number="form.fusion.lowPercentile"
              type="number"
              min="0"
              max="100"
              :disabled="!form.fusion.enabled || locked"
          /></label>
          <label
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
          <span>显著性检测</span>
          <label class="toggle">
            <i aria-hidden="true" />
          </label>
        </legend>
        <div class="field-grid">
          <label class="is-wide">
            <span>数据源</span>
            <select
              v-model="form.saliency.source"
              :disabled="!form.saliency.enabled || locked"
            >
              <option
                v-for="source in saliencySources"
                :key="source"
                :value="source"
              >
                {{ source }}
              </option>
            </select>
          </label>
          <label
            ><span>窗口</span
            ><input
              v-model.number="form.saliency.windowSize"
              type="number"
              min="3"
              step="2"
              :disabled="!form.saliency.enabled || locked"
          /></label>
          <label
            ><span>阈值</span
            ><input
              v-model.number="form.saliency.threshold"
              type="number"
              min="0"
              max="1"
              step="0.05"
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

    <template #footer>
      <div class="drawer-footer">
        <span :class="{ 'is-invalid': issues.length }">{{
          issues.length ? `发现 ${issues.length} 项待处理` : "参数校验已通过"
        }}</span>
        <el-button type="primary" @click="open = false">{{
          locked ? "关闭快照" : "完成配置"
        }}</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { Close } from "@element-plus/icons-vue";
import ParameterWorkbenchOverview from "./ParameterWorkbenchOverview.vue";
import {
  FY3H_MERSI_BANDS,
  fy3hVariableName,
  isFy3hWgs84Crs,
  type Fy3hFeatureMetric,
  type Fy3hMersiForm,
  type Fy3hMersiPanelSummary,
  type Fy3hMersiValidationIssue
} from "./fy3hMersiParameters";

const open = defineModel<boolean>({ required: true });
const props = defineProps<{
  form: Fy3hMersiForm;
  visibleSteps: readonly string[];
  locked: boolean;
  issues: Fy3hMersiValidationIssue[];
  summary: Fy3hMersiPanelSummary;
}>();
const emit = defineEmits<{
  "update-form": [value: Fy3hMersiForm];
}>();
const form = reactive<Fy3hMersiForm>(
  JSON.parse(JSON.stringify(props.form)) as Fy3hMersiForm
);
const overviewParameters = computed(() => {
  const parameters: { label: string; value: string }[] = [];
  if (props.visibleSteps.includes("preprocess")) {
    parameters.push(
      { label: "网格定义", value: props.summary.grid },
      { label: "处理范围", value: props.summary.roi }
    );
  }
  return parameters;
});
watch(
  form,
  value =>
    emit("update-form", JSON.parse(JSON.stringify(value)) as Fy3hMersiForm),
  { deep: true }
);
const FEATURE_METRICS: readonly { value: Fy3hFeatureMetric; label: string }[] =
  [
    { value: "statistics", label: "统计" },
    { value: "gradient", label: "梯度" },
    { value: "local_variance", label: "局部方差" }
  ];
const ROI_FIELDS = [
  { key: "minLon", label: "最小经度", longitude: true },
  { key: "minLat", label: "最小纬度", longitude: false },
  { key: "maxLon", label: "最大经度", longitude: true },
  { key: "maxLat", label: "最大纬度", longitude: false }
] as const;
const RGB_CHANNELS = [
  { key: "red", label: "R" },
  { key: "green", label: "G" },
  { key: "blue", label: "B" }
] as const;
const isWgs84 = computed(() => isFy3hWgs84Crs(form.targetCrs));
const reflectiveBands = computed(() => form.bands.filter(band => band <= 19));
const saliencySources = computed(() =>
  form.bands.flatMap(band => {
    const variable = fy3hVariableName(band);
    const featureSources = form.features.enabled
      ? form.features.metrics
          .filter(metric => metric !== "statistics")
          .map(metric => `${metric}:${variable}`)
      : [];
    return [variable, ...featureSources];
  })
);
</script>
