<template>
  <el-drawer
    v-model="open"
    class="product-parameter-drawer"
    direction="rtl"
    size="440px"
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
        v-if="visibleSteps.includes('along-track-feature-extraction')"
        class="parameter-step-card"
        :disabled="locked"
      >
        <legend>
          质量与特征
          <ParameterHint
            label="质量与特征"
            text="控制沿轨观测的质量过滤和局部统计窗口。"
          />
        </legend>
        <div class="field-grid">
          <div class="fixed-setting-row is-wide">
            <span
              >质量策略
              <ParameterHint
                label="质量策略"
                text="固定使用产品质量标识过滤异常观测，保证处理结果可追溯，因此不可调整。" /></span
            ><strong>使用产品质量标识过滤异常观测</strong>
          </div>
          <label
            ><span
              >特征窗口（点）
              <ParameterHint
                label="特征窗口"
                text="沿轨局部统计使用的观测点数，必须是正奇数；数值越大，结果越平滑。" /></span
            ><ParameterNumberInput
              v-model="form.featureWindowSize"
              :min="1"
              :step="2"
            />
            <ParameterFieldStatus
              :issues="issues"
              :fields="['featureWindowSize']"
              guidance="正奇数，步长 2"
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
          异常检测
          <ParameterHint
            label="异常检测"
            text="识别沿轨高度序列中的异常波动和突变。"
          />
        </legend>
        <div class="field-grid">
          <label
            ><span
              >MAD 阈值
              <ParameterHint
                label="MAD 阈值"
                text="基于中位数绝对偏差识别异常的阈值，不得小于 0.1；数值越高，判定越严格。" /></span
            ><ParameterNumberInput
              v-model="form.anomaly.madThreshold"
              :min="0.1"
              :step="0.1"
            />
            <ParameterFieldStatus
              :issues="issues"
              :fields="['anomaly.madThreshold']"
              guidance="必须为正数，步长 0.1"
            />
          </label>
          <label
            ><span
              >跳变阈值（米）
              <ParameterHint
                label="跳变阈值"
                text="相邻观测高度跳变的判定阈值，不得小于 0.01 米。" /></span
            ><ParameterNumberInput
              v-model="form.anomaly.jumpThresholdMeters"
              :min="0.01"
              :step="0.1"
            />
            <ParameterFieldStatus
              :issues="issues"
              :fields="['anomaly.jumpThresholdMeters']"
              guidance="必须为正数，单位：米"
            />
          </label>
        </div>
      </fieldset>
      <fieldset
        v-if="visibleSteps.includes('track-gridding')"
        class="parameter-step-card"
        :disabled="locked"
      >
        <legend>
          可选网格输出
          <ParameterHint
            label="可选网格输出"
            text="将沿轨观测整理为便于地图展示的规则网格。"
          />
        </legend>
        <div class="field-grid compact-grid">
          <label
            ><span
              >网格间距（度）
              <ParameterHint
                label="网格间距"
                text="规则网格的空间间隔，范围为 0.1 到 5 度。" /></span
            ><ParameterNumberInput
              v-model="form.grid.spacingDegrees"
              :min="0.1"
              :max="5"
              :step="0.05"
              :disabled="!form.grid.enabled || locked"
            />
            <ParameterFieldStatus
              :issues="issues"
              :fields="['grid.spacingDegrees']"
              guidance="范围 0.1 到 5 度，步长 0.05"
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
import type { Hy2dAltimeterForm } from "./hy2dAltimeterParameters";

const open = defineModel<boolean>({ required: true });
const props = defineProps<{
  form: Hy2dAltimeterForm;
  visibleSteps: readonly string[];
  locked: boolean;
  issues: { field: string; message: string }[];
  summary: { window: string; anomaly: string; grid: string };
}>();
const emit = defineEmits<{
  "update-form": [value: Hy2dAltimeterForm];
  confirm: [];
}>();
const form = reactive<Hy2dAltimeterForm>(
  JSON.parse(JSON.stringify(props.form)) as Hy2dAltimeterForm
);
const overviewParameters = computed(() => {
  const parameters: { label: string; value: string }[] = [];
  if (props.visibleSteps.includes("along-track-feature-extraction")) {
    parameters.push({ label: "特征窗口", value: props.summary.window });
  }
  if (props.visibleSteps.includes("anomaly-detection")) {
    parameters.push({ label: "异常阈值", value: props.summary.anomaly });
  }
  if (props.visibleSteps.includes("track-gridding")) {
    parameters.push({ label: "空间输出", value: props.summary.grid });
  }
  return parameters;
});
watch(
  form,
  value =>
    emit("update-form", JSON.parse(JSON.stringify(value)) as Hy2dAltimeterForm),
  { deep: true }
);
</script>
