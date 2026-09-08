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
    <template #header="{ titleId }">
      <div class="drawer-heading">
        <div>
          <span>FULL-DISK CONFIGURATION</span>
          <h2 :id="titleId">FY-4B AGRI 参数</h2>
          <p>
            {{
              locked
                ? "当前显示已保存的参数快照。"
                : "配置全圆盘产品的派生输出。"
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
        <code>NOMINAL_UNVERIFIED</code>
      </div>
      <p
        v-if="visibleSteps.includes('preprocess')"
        class="engineering-warning"
        role="note"
      >
        <strong>NOMINAL_UNVERIFIED</strong>：名义定位尚未完成测绘级验证。
      </p>
      <ParameterWorkbenchOverview
        :parameters="overviewParameters"
        :constraints="visibleSteps.includes('preprocess') ? ['NOMINAL_UNVERIFIED'] : []"
      />

      <fieldset v-if="visibleSteps.includes('preprocess')" :disabled="locked">
        <legend>空间范围</legend>
        <div class="field-grid">
          <label
            ><span>目标 CRS</span
            ><select v-model="form.targetCrs">
              <option value="EPSG:4326">EPSG:4326</option>
              <option value="EPSG:4490">EPSG:4490</option>
            </select></label
          >
          <label class="toggle-row"
            ><span>WGS84 ROI</span><input v-model="roiEnabled" type="checkbox"
          /></label>
        </div>
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
          <label v-for="metric in FY4B_AGRI_METRICS" :key="metric"
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
              step="2"
              :disabled="!form.features.enabled || locked"
          /></label>
        </div>
      </fieldset>

      <fieldset v-if="visibleSteps.includes('rgb-fusion')" :disabled="locked">
        <legend class="toggle-heading">
          <span>伪彩融合</span
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
        <div class="field-grid compact-grid">
          <label class="is-wide"
            ><span>融合模式</span
            ><input :value="form.fusion.mode" readonly /></label
          ><label
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
        <small class="field-note"
          >NIR_RED_BLUE 为假彩色融合，不表示真彩色。</small
        >
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
                v-for="source in FY4B_AGRI_SALIENCY_SOURCES"
                :key="source"
                :value="source"
              >
                {{ source }}
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
  FY4B_AGRI_DEFAULT_ROI,
  FY4B_AGRI_METRICS,
  FY4B_AGRI_SALIENCY_SOURCES,
  type Fy4bAgriForm,
  type Fy4bAgriValidationIssue
} from "./fy4bAgriParameters";

const open = defineModel<boolean>({ required: true });
const props = defineProps<{
  form: Fy4bAgriForm;
  visibleSteps: readonly string[];
  locked: boolean;
  issues: Fy4bAgriValidationIssue[];
  summary: { grid: string; roi: string };
}>();
const emit = defineEmits<{ "update-form": [value: Fy4bAgriForm] }>();
const form = reactive<Fy4bAgriForm>(
  JSON.parse(JSON.stringify(props.form)) as Fy4bAgriForm
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
const roiEnabled = ref(form.roi !== null);
const roi = reactive<[number, number, number, number]>(
  form.roi ? [...form.roi] : [...FY4B_AGRI_DEFAULT_ROI]
);
const ROI_FIELDS = [
  { key: "minLon", label: "最小经度", index: 0, longitude: true },
  { key: "minLat", label: "最小纬度", index: 1, longitude: false },
  { key: "maxLon", label: "最大经度", index: 2, longitude: true },
  { key: "maxLat", label: "最大纬度", index: 3, longitude: false }
] as const;
watch(roiEnabled, enabled => {
  form.roi = enabled ? [...roi] : null;
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
    emit("update-form", JSON.parse(JSON.stringify(value)) as Fy4bAgriForm),
  { deep: true }
);
</script>
