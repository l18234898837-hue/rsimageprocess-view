<template>
  <el-drawer
    v-model="open"
    class="product-parameter-drawer"
    direction="rtl"
    size="480px"
    append-to-body
    modal-class="parameter-drawer-overlay"
    :lock-scroll="false"
    :modal="false"
    :show-close="false"
  >
    <template #header="{ titleId }">
      <div class="drawer-heading">
        <h2 :id="titleId" class="drawer-heading__workbench-title">
          参数配置工作台
        </h2>
        <button type="button" aria-label="关闭参数工作台" @click="open = false">
          <el-icon><Close /></el-icon>
        </button>
      </div>
    </template>

    <div class="drawer-body">
      <ParameterWorkbenchOverview :parameters="overviewParameters" />

      <fieldset
        v-if="visibleSteps.includes('preprocess')"
        class="parameter-step-card roi-parameter-block"
        :disabled="locked"
      >
        <legend>
          空间范围
          <ParameterHint label="空间范围" text="限定产品输出坐标和处理范围。" />
        </legend>
        <p class="roi-parameter-block__note">
          开启后按经纬度范围处理；关闭后处理产品全幅。
        </p>
        <div class="field-grid">
          <label
            ><span
              >目标 CRS
              <ParameterHint
                label="目标 CRS"
                text="输出坐标系。FY-4B 产品仅支持 EPSG:4326 或 EPSG:4490。" /></span
            ><select v-model="form.targetCrs" class="crs-input">
              <option value="EPSG:4326">EPSG:4326</option>
              <option value="EPSG:4490">EPSG:4490</option>
            </select>
            <ParameterFieldStatus
              :issues="issues"
              :fields="['targetCrs']"
              guidance="仅支持 EPSG:4326 或 EPSG:4490"
            />
          </label>
          <label class="toggle-row"
            ><span
              >WGS84 ROI
              <ParameterHint
                label="WGS84 ROI"
                text="限定处理范围。关闭后按产品全幅处理。" /></span
            ><input v-model="roiEnabled" type="checkbox"
          /></label>
        </div>
        <div v-if="roiEnabled" class="field-grid compact-grid">
          <label v-for="field in ROI_FIELDS" :key="field.key"
            ><span
              >{{ field.label }}
              <ParameterHint
                :label="field.label"
                :text="
                  field.longitude
                    ? '经度范围为 -180 到 180。'
                    : '纬度范围为 -90 到 90。'
                " /></span
            ><ParameterNumberInput
              v-model="roi[field.index]"
              step="0.0001"
              :min="field.longitude ? -180 : -90"
              :max="field.longitude ? 180 : 90"
            />
            <ParameterFieldStatus
              :issues="issues"
              :fields="['roi']"
              :guidance="
                field.longitude ? '范围 -180 到 180 度' : '范围 -90 到 90 度'
              "
            />
          </label>
        </div>
      </fieldset>

      <fieldset
        v-if="visibleSteps.includes('feature-extraction')"
        class="parameter-step-card"
        :disabled="locked"
      >
        <legend>
          特征提取
          <ParameterHint
            label="特征提取"
            text="从 AGRI 通道计算选定的空间特征。"
          />
        </legend>
        <FeatureMetricPicker
          v-model="form.features.metrics"
          :metrics="featureMetricOptions(FY4B_AGRI_METRICS)"
          :disabled="!form.features.enabled || locked"
        >
          <template #local-variance>
            <div class="feature-metric-picker__parameter">
              <span
                >纹理窗口
                <ParameterHint
                  label="纹理窗口"
                  text="局部方差的计算邻域，必须为不小于 3 的奇数；数值越大，结果越平滑。"
                />
              </span>
              <ParameterNumberInput
                v-model="form.features.windowSize"
                min="3"
                step="2"
                :disabled="!form.features.enabled || locked"
              />
              <ParameterFieldStatus
                :issues="issues"
                :fields="['features.windowSize']"
                guidance="不小于 3，必须为奇数"
              />
            </div>
          </template>
        </FeatureMetricPicker>
        <ParameterFieldStatus :issues="issues" :fields="['features.metrics']" />
      </fieldset>

      <fieldset
        v-if="visibleSteps.includes('rgb-fusion')"
        class="parameter-step-card"
        :disabled="locked"
      >
        <legend>
          伪彩融合
          <ParameterHint
            label="伪彩融合"
            text="生成适合云图和气象现象判读的假彩色影像。"
          />
        </legend>
        <div class="field-grid compact-grid">
          <label class="is-wide"
            ><span
              >融合模式
              <ParameterHint
                label="融合模式"
                text="近红外、红光、蓝光组合。为保持产品判读一致性，该方式固定不可修改。" /></span
            ><input :value="form.fusion.mode" readonly /></label
          ><label
            ><span
              >低百分位
              <ParameterHint
                label="低百分位"
                text="显示拉伸的下限，范围 0 到 100，且必须小于高百分位。" /></span
            ><ParameterNumberInput
              v-model="form.fusion.lowPercentile"
              min="0"
              max="100"
              :disabled="!form.fusion.enabled || locked"
            />
            <ParameterFieldStatus
              :issues="issues"
              :fields="['fusion.percentiles']"
              guidance="范围 0 到 100 %，且小于高百分位"
            /> </label
          ><label
            ><span
              >高百分位
              <ParameterHint
                label="高百分位"
                text="显示拉伸的上限，范围 0 到 100，且必须大于低百分位。" /></span
            ><ParameterNumberInput
              v-model="form.fusion.highPercentile"
              min="0"
              max="100"
              :disabled="!form.fusion.enabled || locked"
            />
            <ParameterFieldStatus
              :issues="issues"
              :fields="['fusion.percentiles']"
              guidance="范围 0 到 100 %，且大于低百分位"
            />
          </label>
        </div>
      </fieldset>

      <fieldset
        v-if="visibleSteps.includes('anomaly-detection')"
        class="parameter-step-card"
        :disabled="locked"
      >
        <legend>
          显著性检测
          <ParameterHint
            label="显著性检测"
            text="在指定 AGRI 通道中识别局部异常区域。"
          />
        </legend>
        <div class="field-grid">
          <label class="is-wide"
            ><span
              >数据源
              <ParameterHint
                label="数据源"
                text="用于检测的 AGRI 通道。" /></span
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
            </select>
            <ParameterFieldStatus
              :issues="issues"
              :fields="['saliency.source']"
            /> </label
          ><label
            ><span
              >阈值
              <ParameterHint
                label="阈值"
                text="异常显著程度的判定值，范围 0 到 1；数值越高，判定越严格。" /></span
            ><ParameterNumberInput
              v-model="form.saliency.threshold"
              min="0"
              max="1"
              step="0.05"
              :disabled="!form.saliency.enabled || locked"
            />
            <ParameterFieldStatus
              :issues="issues"
              :fields="['saliency.threshold']"
              guidance="范围 0 到 1，步长 0.05"
            /> </label
          ><label
            ><span
              >窗口
              <ParameterHint
                label="窗口"
                text="检测的局部邻域，必须为不小于 3 的奇数。" /></span
            ><ParameterNumberInput
              v-model="form.saliency.windowSize"
              min="3"
              step="2"
              :disabled="!form.saliency.enabled || locked"
            />
            <ParameterFieldStatus
              :issues="issues"
              :fields="['saliency.windowSize']"
              guidance="不小于 3，必须为奇数"
            />
          </label>
        </div>
      </fieldset>
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
import ParameterHint from "./ParameterHint.vue";
import ParameterFieldStatus from "./ParameterFieldStatus.vue";
import ParameterNumberInput from "./ParameterNumberInput.vue";
import FeatureMetricPicker from "./FeatureMetricPicker.vue";
import { featureMetricOptions } from "./featureMetricLabels";
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
watch(
  () => [
    props.form.features.enabled,
    props.form.fusion.enabled,
    props.form.saliency.enabled
  ],
  ([featuresEnabled, fusionEnabled, saliencyEnabled]) => {
    form.features.enabled = featuresEnabled;
    form.fusion.enabled = fusionEnabled;
    form.saliency.enabled = saliencyEnabled;
  }
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
