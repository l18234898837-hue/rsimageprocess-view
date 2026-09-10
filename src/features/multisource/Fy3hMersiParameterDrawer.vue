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
    <template #header>
      <div class="drawer-heading">
        <h2 class="drawer-heading__workbench-title">参数配置工作台</h2>
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
          工程网格
          <ParameterHint
            label="工程网格"
            text="定义扫描带产品的输出坐标、像元大小、重采样方式和处理范围。"
          />
        </legend>
        <p class="roi-parameter-block__note">
          WGS84 ROI 开启后按经纬度范围处理；关闭后处理产品全幅。
        </p>
        <div class="field-grid">
          <label>
            <span
              >输出坐标系
              <ParameterHint
                label="输出坐标系"
                text="选择输出数据使用的坐标系；经纬度输出使用 WGS84，需要地图投影时可选择 Web Mercator 或 UTM 分区。"
            /></span>
            <select v-model="form.targetCrs" class="crs-input">
              <option value="EPSG:4326">EPSG:4326 - WGS84 经纬度</option>
              <option value="EPSG:3857">EPSG:3857 - Web Mercator</option>
              <option value="EPSG:32648">EPSG:32648 - UTM 48N</option>
              <option value="EPSG:32649">EPSG:32649 - UTM 49N</option>
              <option value="EPSG:32650">EPSG:32650 - UTM 50N</option>
              <option value="EPSG:32651">EPSG:32651 - UTM 51N</option>
              <option value="EPSG:32652">EPSG:32652 - UTM 52N</option>
            </select>
            <ParameterFieldStatus
              :issues="issues"
              :fields="['targetCrs']"
              guidance="请选择输出坐标系"
            />
          </label>
          <label>
            <span
              >{{ isWgs84 ? "分辨率（度）" : "分辨率（米）" }}
              <ParameterHint
                label="输出分辨率"
                text="输出像元大小。地理坐标系使用度，投影坐标系使用米，数值必须大于 0。"
            /></span>
            <ParameterNumberInput
              v-if="isWgs84"
              v-model="form.resolutionDegrees"
              min="0.000001"
              step="0.001"
            />
            <ParameterNumberInput
              v-else
              v-model="form.resolutionMeters"
              min="0.01"
              step="10"
            />
            <ParameterFieldStatus
              :issues="issues"
              :fields="['resolution']"
              :guidance="
                isWgs84
                  ? '最小 0.000001 度，步长 0.001'
                  : '最小 0.01 米，步长 10'
              "
            />
          </label>
          <label>
            <span
              >连续数据重采样
              <ParameterHint
                label="连续数据重采样"
                text="连续测量变量固定采用最近邻，避免改变原始测量值，因此不可调整。" /></span
            ><input value="nearest" disabled /><small
              class="parameter-field__guide is-neutral"
              >固定值：nearest</small
            ></label
          >
          <label class="toggle-row">
            <span
              >WGS84 ROI
              <ParameterHint
                label="WGS84 ROI"
                text="限定处理范围。关闭后按产品全幅处理。"
              />
            </span>
            <input
              v-model="form.roi.enabled"
              type="checkbox"
              :disabled="locked || !roiDataReady"
              :title="
                roiDataReady
                  ? '可开启 WGS84 ROI'
                  : '请先完成当前产品所需文件上传'
              "
            />
          </label>
        </div>
        <p v-if="!roiDataReady" class="roi-parameter-block__status is-warning">
          请先完成当前产品所需文件上传，再开启 ROI。
        </p>
        <div v-if="form.roi.enabled" class="field-grid compact-grid">
          <label v-for="field in ROI_FIELDS" :key="field.key">
            <span
              >{{ field.label }}
              <ParameterHint
                :label="field.label"
                :text="
                  field.longitude
                    ? '经度范围为 -180 到 180。'
                    : '纬度范围为 -90 到 90。'
                "
            /></span>
            <ParameterNumberInput
              v-model="form.roi[field.key]"
              step="0.0001"
              :min="field.longitude ? -180 : -90"
              :max="field.longitude ? 180 : 90"
              :disabled="locked"
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
        v-if="visibleSteps.includes('preprocess')"
        class="parameter-step-card"
        :disabled="locked"
      >
        <legend>
          输出波段
          <ParameterHint
            label="输出波段"
            text="选择写入标准产品的 MERSI 通道。后续 RGB 与检测只能使用已选通道。"
          />
        </legend>
        <OutputBandPicker
          v-model="form.bands"
          :bands="FY3H_OUTPUT_BANDS"
          :columns="5"
          :disabled="locked"
          aria-label="MERSI 输出波段选择"
        />
        <ParameterFieldStatus :issues="issues" :fields="['bands']" />
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
            text="从已选通道计算统计、梯度或局部方差等特征。"
          />
        </legend>
        <FeatureMetricPicker
          v-model="form.features.metrics"
          :metrics="
            featureMetricOptions(['statistics', 'gradient', 'local_variance'])
          "
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
          RGB 波段组合
          <ParameterHint
            label="RGB 波段组合"
            text="选择反射通道作为红、绿、蓝输出，并设置显示拉伸范围。"
          />
        </legend>
        <div class="rgb-grid">
          <label v-for="channel in RGB_CHANNELS" :key="channel.key">
            <span
              ><strong>{{ channel.label }}</strong> {{ channel.name }}
              <ParameterHint
                :label="channel.name"
                text="RGB 组合通道，只能选择已选的反射通道。"
            /></span>
            <select
              v-model.number="form.fusion[channel.key]"
              :disabled="!form.fusion.enabled || locked"
            >
              <option v-for="band in reflectiveBands" :key="band" :value="band">
                CH{{ String(band).padStart(2, "0") }}
              </option>
            </select>
            <small class="parameter-field__guide is-neutral">{{
              channel.guide
            }}</small>
          </label>
        </div>
        <ParameterFieldStatus :issues="issues" :fields="['fusion.bands']" />
        <div class="field-grid compact-grid">
          <label
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
            />
          </label>
          <label
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
            text="在选定通道或特征中识别局部异常区域。"
          />
        </legend>
        <div class="field-grid">
          <label class="is-wide">
            <span
              >数据源
              <ParameterHint
                label="数据源"
                text="用于检测的已选通道或由其计算出的特征。"
            /></span>
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
            <ParameterFieldStatus
              :issues="issues"
              :fields="['saliency.source']"
            />
          </label>
          <label
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
          <label
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
            />
          </label>
        </div>
      </fieldset>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <span :class="{ 'is-invalid': issues.length }">{{
          issues.length ? `发现 ${issues.length} 项待处理` : "参数校验已通过"
        }}</span>
        <el-button
          type="primary"
          :disabled="!locked && issues.length > 0"
          @click="emit('confirm')"
          >{{ locked ? "关闭快照" : "完成配置" }}</el-button
        >
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { Close } from "@element-plus/icons-vue";
import ParameterWorkbenchOverview from "./ParameterWorkbenchOverview.vue";
import ParameterHint from "./ParameterHint.vue";
import ParameterFieldStatus from "./ParameterFieldStatus.vue";
import ParameterNumberInput from "./ParameterNumberInput.vue";
import FeatureMetricPicker from "./FeatureMetricPicker.vue";
import OutputBandPicker, {
  type OutputBandOption
} from "./OutputBandPicker.vue";
import { featureMetricOptions } from "./featureMetricLabels";
import {
  FY3H_MERSI_BANDS,
  fy3hVariableName,
  isFy3hWgs84Crs,
  type Fy3hMersiForm,
  type Fy3hMersiPanelSummary,
  type Fy3hMersiValidationIssue
} from "./fy3hMersiParameters";

const FY3H_OUTPUT_BANDS: OutputBandOption[] = FY3H_MERSI_BANDS.map(band => ({
  value: band,
  label: `CH${String(band).padStart(2, "0")}`,
  category: band <= 19 ? "反射通道" : "热红外通道",
  group: band <= 19 ? "反射通道" : "热红外通道",
  tone: band <= 19 ? "blue" : "thermal"
}));

const open = defineModel<boolean>({ required: true });
const props = defineProps<{
  form: Fy3hMersiForm;
  visibleSteps: readonly string[];
  locked: boolean;
  roiDataReady: boolean;
  issues: Fy3hMersiValidationIssue[];
  summary: Fy3hMersiPanelSummary;
}>();
const emit = defineEmits<{
  "update-form": [value: Fy3hMersiForm];
  confirm: [];
}>();
const form = reactive<Fy3hMersiForm>(
  JSON.parse(JSON.stringify(props.form)) as Fy3hMersiForm
);
const roiDataReady = computed(() => props.roiDataReady);
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
watch(
  form,
  value =>
    emit("update-form", JSON.parse(JSON.stringify(value)) as Fy3hMersiForm),
  { deep: true }
);
watch(roiDataReady, ready => {
  if (!ready) form.roi.enabled = false;
});
const ROI_FIELDS = [
  { key: "minLon", label: "最小经度", longitude: true },
  { key: "minLat", label: "最小纬度", longitude: false },
  { key: "maxLon", label: "最大经度", longitude: true },
  { key: "maxLat", label: "最大纬度", longitude: false }
] as const;
const RGB_CHANNELS = [
  { key: "red", label: "R", name: "红色通道", guide: "暖色与高反射目标" },
  { key: "green", label: "G", name: "绿色通道", guide: "植被与中间色调" },
  { key: "blue", label: "B", name: "蓝色通道", guide: "水体、薄雾与冷色调" }
] as const;
const isWgs84 = computed(() => isFy3hWgs84Crs(form.targetCrs));
const reflectiveBands = computed(() =>
  form.bands.filter(band => band <= 19).sort((left, right) => left - right)
);
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
