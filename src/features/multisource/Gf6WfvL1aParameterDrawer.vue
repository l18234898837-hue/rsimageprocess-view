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
          工程网格
          <ParameterHint
            label="工程网格"
            text="定义标准产品的坐标参考、输出分辨率和处理范围。"
          />
        </legend>
        <p class="roi-parameter-block__note">
          默认处理产品全幅；开启 WGS84 ROI
          后按经纬度范围处理，可在上传数据覆盖范围内选择处理区域。
        </p>
        <div class="field-grid">
          <label
            ><span
              >输出坐标系
              <ParameterHint
                label="输出坐标系"
                text="选择输出数据使用的坐标系；经纬度输出可使用 WGS84 或 CGCS2000，需要地图投影时可选择 Web Mercator 或 UTM 分区。" /></span
            ><select v-model="form.targetCrs" class="crs-input">
              <option value="EPSG:4326">EPSG:4326 - WGS84 经纬度</option>
              <option value="EPSG:4490">EPSG:4490 - CGCS2000 经纬度</option>
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
            /> </label
          ><label
            ><span
              >输出分辨率（{{ resolutionConstraint.unit }}）
              <ParameterHint
                label="输出分辨率"
                text="输出像元大小。地理坐标系使用度，投影坐标系使用米；不得小于当前显示的最小值。后端会按网格像元数和预估字节执行最终保护。" /></span
            ><ParameterNumberInput
              v-model="form.resolution"
              :min="resolutionConstraint.minimum"
              :step="resolutionConstraint.step"
            />
            <ParameterFieldStatus
              :issues="issues"
              :fields="['resolution']"
              :guidance="`最小 ${resolutionConstraint.minimum} ${resolutionConstraint.unit}，步长 ${resolutionConstraint.step}`"
            /> </label
          ><label
            ><span
              >高度模式
              <ParameterHint
                label="高度模式"
                text="RPC 正射校正使用的高程模式。当前名义工程产品固定为 CONSTANT，不可修改。" /></span
            ><input :value="rpcHeightMode" readonly /><small
              class="parameter-field__guide is-neutral"
              >固定模式：CONSTANT</small
            ></label
          ><label
            ><span
              >固定高程（米）
              <ParameterHint
                label="固定高程"
                text="名义 RPC 的固定高程值。该产品配置固定为 0 米，不可修改。" /></span
            ><input :value="rpcHeight" readonly /><small
              class="parameter-field__guide is-neutral"
              >固定值：0 米</small
            ></label
          >
        </div>
        <div class="roi-control-card">
          <label class="toggle-row"
            ><span
              >WGS84 ROI
              <ParameterHint
                label="WGS84 ROI"
                text="默认关闭并处理产品全幅。定位元数据解析完成后，可开启并在数据覆盖范围内框选处理区域。" /></span
            ><input
              v-model="roiEnabled"
              type="checkbox"
              :disabled="locked || !roiReady || !roiDataReady"
              :title="roiDisabledReason || '可开启 WGS84 ROI'"
          /></label>
          <p v-if="roiEnabled" class="roi-control-card__note">
            可手动输入或使用地图框选，最后一次修改生效；输入范围必须位于上传数据覆盖范围内。
          </p>
          <p
            v-if="!roiDataReady || !roiReady"
            class="roi-parameter-block__status is-warning"
          >
            {{ roiDisabledReason }}
          </p>
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
          <RoiMapPicker
            v-show="roiEnabled"
            v-model="roiModel"
            :bounds="roiBounds"
            :disabled="locked"
          />
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
            text="选择要写入标准产品的 WFV 波段。至少保留一个波段，后续 RGB 与检测只能使用已选波段。"
          />
        </legend>
        <OutputBandPicker
          v-model="form.bands"
          :bands="GF6_OUTPUT_BANDS"
          :columns="4"
          :disabled="locked"
          aria-label="GF-6 WFV 输出波段选择"
        />
        <ParameterFieldStatus
          :issues="issues"
          :fields="['bands']"
          guidance="至少选择一个输出波段"
        />
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
            text="从已选波段计算统计、梯度或局部方差等空间特征。"
          />
        </legend>
        <FeatureMetricPicker
          v-model="form.features.metrics"
          :metrics="featureMetricOptions(GF6_WFV_L1A_METRICS)"
          :disabled="!form.features.enabled || locked"
        >
          <template #local-variance>
            <div class="feature-metric-picker__parameter">
              <span
                >纹理窗口
                <ParameterHint
                  label="纹理窗口"
                  text="局部方差的计算邻域，必须为 3 到 255 的奇数；数值越大，结果越平滑。"
                />
              </span>
              <ParameterNumberInput
                v-model="form.features.windowSize"
                min="3"
                :max="GF6_WFV_L1A_MAX_WINDOW_SIZE"
                step="2"
                :disabled="!form.features.enabled || locked"
              />
              <ParameterFieldStatus
                :issues="issues"
                :fields="['features.windowSize']"
                guidance="范围 3 到 255，必须为奇数"
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
            text="指定彩色合成的红、绿、蓝通道及显示拉伸范围。只能选择已输出的波段。"
          />
        </legend>
        <div class="rgb-grid">
          <label
            ><span
              ><strong>R</strong> 红色通道
              <ParameterHint
                label="红色通道"
                text="作为彩色合成的红色显示通道，只能选择已输出的波段。" /></span
            ><select
              v-model.number="form.fusion.red"
              :disabled="!form.fusion.enabled || locked"
            >
              <option v-for="band in rgbBands" :key="band" :value="band">
                B{{ band }}
              </option></select
            ><small class="parameter-field__guide is-neutral"
              >暖色与高反射目标</small
            ></label
          ><label
            ><span
              ><strong>G</strong> 绿色通道
              <ParameterHint
                label="绿色通道"
                text="作为彩色合成的绿色显示通道，只能选择已输出的波段。" /></span
            ><select
              v-model.number="form.fusion.green"
              :disabled="!form.fusion.enabled || locked"
            >
              <option v-for="band in rgbBands" :key="band" :value="band">
                B{{ band }}
              </option></select
            ><small class="parameter-field__guide is-neutral"
              >植被与中间色调</small
            ></label
          ><label
            ><span
              ><strong>B</strong> 蓝色通道
              <ParameterHint
                label="蓝色通道"
                text="作为彩色合成的蓝色显示通道，只能选择已输出的波段。" /></span
            ><select
              v-model.number="form.fusion.blue"
              :disabled="!form.fusion.enabled || locked"
            >
              <option v-for="band in rgbBands" :key="band" :value="band">
                B{{ band }}
              </option></select
            ><small class="parameter-field__guide is-neutral"
              >水体、薄雾与冷色调</small
            ></label
          >
        </div>
        <ParameterFieldStatus
          :issues="issues"
          :fields="['fusion.bands']"
          errors-only
        />
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
            text="在选定波段中识别局部异常区域。"
          />
        </legend>
        <div class="field-grid">
          <label class="is-wide"
            ><span
              >数据源
              <ParameterHint
                label="数据源"
                text="用于检测的输入波段，只能选择已输出的波段。" /></span
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
            </select>
            <ParameterFieldStatus
              :issues="issues"
              :fields="['saliency.source']"
              guidance="用于检测的输出波段"
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
                text="检测的局部邻域，必须为 3 到 255 的奇数。" /></span
            ><ParameterNumberInput
              v-model="form.saliency.windowSize"
              min="3"
              :max="GF6_WFV_L1A_MAX_WINDOW_SIZE"
              step="2"
              :disabled="!form.saliency.enabled || locked"
            />
            <ParameterFieldStatus
              :issues="issues"
              :fields="['saliency.windowSize']"
              guidance="范围 3 到 255，必须为奇数"
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
        ><el-button
          type="primary"
          :disabled="!locked && issues.length > 0"
          @click="emit('confirm')"
          >{{ locked ? "关闭快照" : "完成配置" }}</el-button
        >
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
import RoiMapPicker, { type RoiBounds } from "./RoiMapPicker.vue";
import FeatureMetricPicker from "./FeatureMetricPicker.vue";
import OutputBandPicker, {
  type OutputBandOption
} from "./OutputBandPicker.vue";
import {
  featureMetricLabel,
  featureMetricOptions
} from "./featureMetricLabels";
import {
  GF6_WFV_L1A_BANDS,
  GF6_WFV_L1A_MAX_WINDOW_SIZE,
  GF6_WFV_L1A_METRICS,
  gf6ResolutionConstraint,
  type Gf6WfvL1aForm
} from "./gf6WfvL1aParameters";
import { gf6RoiStateAfterMetadataChange } from "./gf6WfvL1aRoi";

const GF6_OUTPUT_BANDS: OutputBandOption[] = GF6_WFV_L1A_BANDS.map(band => ({
  value: band,
  label: `B${band}`,
  category: "WFV 通道",
  tone: "standard"
}));

const open = defineModel<boolean>({ required: true });
const props = defineProps<{
  form: Gf6WfvL1aForm;
  metadataFile?: File;
  visibleSteps: readonly string[];
  locked: boolean;
  roiDataReady: boolean;
  issues: { field: string; message: string }[];
}>();
const emit = defineEmits<{
  "update-form": [value: Gf6WfvL1aForm];
  confirm: [];
}>();
const rpcHeightMode = "CONSTANT" as const;
const rpcHeight = 0 as const;
const form = reactive<Gf6WfvL1aForm>(
  JSON.parse(JSON.stringify(props.form)) as Gf6WfvL1aForm
);
const rgbBands = computed(() =>
  form.bands.slice().sort((left, right) => left - right)
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
const roiEnabled = ref(false);
const roiDataReady = computed(() => props.roiDataReady);
const roiReady = ref(false);
const roiStatusMessage = ref("正在等待定位元数据；解析成功后可开启 ROI。");
const roiDisabledReason = computed(() => {
  if (!roiDataReady.value) return "请先完成当前产品所需文件上传，再开启 ROI。";
  if (!roiReady.value) return roiStatusMessage.value;
  return "";
});
const roiBounds = ref<RoiBounds | null>(form.roi ? [...form.roi] : null);
const roi = reactive<[number, number, number, number]>(
  form.roi ? [...form.roi] : [0, 0, 0, 0]
);
const ROI_FIELDS = [
  { key: "minLon", label: "最小经度", index: 0, longitude: true },
  { key: "minLat", label: "最小纬度", index: 1, longitude: false },
  { key: "maxLon", label: "最大经度", index: 2, longitude: true },
  { key: "maxLat", label: "最大纬度", index: 3, longitude: false }
] as const;
const roiModel = computed<RoiBounds | null>({
  get: () =>
    roiEnabled.value && roiReady.value && roiDataReady.value ? [...roi] : null,
  set: value => {
    if (!value) {
      roiEnabled.value = false;
      return;
    }
    roi.splice(0, roi.length, ...value);
    roiEnabled.value = true;
  }
});
form.roi = null;
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
      roiBounds.value = null;
      form.roi = null;
    }
    if (!metadataFile) {
      roiBounds.value = null;
      roiStatusMessage.value = "正在等待定位元数据；解析成功后可开启 ROI。";
      if (form.roi === null) roiReady.value = false;
      return;
    }
    try {
      const state = gf6RoiStateAfterMetadataChange(await metadataFile.text());
      if (readVersion !== metadataReadVersion) return;
      if (!state.draft) {
        roiBounds.value = null;
        roiReady.value = false;
        roiStatusMessage.value =
          "定位元数据中未找到有效的四角坐标，ROI 暂不可用；请检查 XML 是否包含 TopLeft/TopRight/BottomRight/BottomLeft 的经纬度字段。当前仍按产品全幅处理。";
        return;
      }
      roiBounds.value = [...state.draft];
      if (metadataChanged || form.roi === null) {
        roi.splice(0, roi.length, ...state.draft);
        roiReady.value = true;
        roiStatusMessage.value = "";
      }
    } catch {
      roiBounds.value = null;
      roiReady.value = false;
      roiStatusMessage.value =
        "定位元数据读取失败，ROI 暂不可用；当前仍按产品全幅处理。";
      if (readVersion === metadataReadVersion && form.roi === null) {
        roiReady.value = false;
      }
    }
  },
  { immediate: true }
);
watch(roiEnabled, enabled => {
  form.roi = enabled && roiReady.value && roiDataReady.value ? [...roi] : null;
});
watch(roiDataReady, ready => {
  if (!ready) roiEnabled.value = false;
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
