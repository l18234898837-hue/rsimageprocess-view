<template>
  <el-drawer
    v-model="open"
    class="product-parameter-drawer"
    direction="rtl"
    size="470px"
    :lock-scroll="false"
    :modal="true"
    :show-close="false"
  >
    <template #header>
      <div class="drawer-heading">
        <div>
          <span>TRACK CONFIGURATION</span>
          <h2>HY-2D 高度计参数</h2>
          <p>
            {{
              locked
                ? "当前显示已保存的参数快照。"
                : "配置沿轨特征、异常与可选网格。"
            }}
          </p>
        </div>
        <button type="button" aria-label="关闭参数工作台" @click="open = false">
          <el-icon><Close /></el-icon>
        </button>
      </div>
    </template>

    <div class="drawer-body">
      <div class="profile-signal">
        <div>
          <span>OUTPUT PROFILE</span><strong>{{ summary.grid }}</strong>
        </div>
      </div>
      <fieldset :disabled="locked">
        <legend>质量与特征</legend>
        <div class="field-grid">
          <label class="is-wide"
            ><span>质量策略</span
            ><input :value="form.qualityPolicyVersion" readonly
          /></label>
          <label
            ><span>特征窗口（点）</span
            ><input
              v-model.number="form.featureWindowSize"
              type="number"
              min="1"
              step="2"
          /></label>
        </div>
      </fieldset>
      <fieldset :disabled="locked">
        <legend>异常检测</legend>
        <div class="field-grid">
          <label
            ><span>MAD 阈值</span
            ><input
              v-model.number="form.anomaly.madThreshold"
              type="number"
              min="0.1"
              step="0.1"
          /></label>
          <label
            ><span>跳变阈值（米）</span
            ><input
              v-model.number="form.anomaly.jumpThresholdMeters"
              type="number"
              min="0.01"
              step="0.1"
          /></label>
        </div>
      </fieldset>
      <fieldset :disabled="locked">
        <legend class="toggle-heading">
          <span>可选网格输出</span>
          <label class="toggle">
            <input v-model="form.grid.enabled" type="checkbox" />
            <i aria-hidden="true" />
            <small>{{ form.grid.enabled ? "启用" : "关闭" }}</small>
          </label>
        </legend>
        <div class="field-grid compact-grid">
          <label
            ><span>网格间距（度）</span
            ><input
              v-model.number="form.grid.spacingDegrees"
              type="number"
              min="0.1"
              max="5"
              step="0.05"
              :disabled="!form.grid.enabled || locked"
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
import { reactive, watch } from "vue";
import { Close } from "@element-plus/icons-vue";
import type { Hy2dAltimeterForm } from "./hy2dAltimeterParameters";

const open = defineModel<boolean>({ required: true });
const props = defineProps<{
  form: Hy2dAltimeterForm;
  locked: boolean;
  issues: { field: string; message: string }[];
  summary: { window: string; anomaly: string; grid: string };
}>();
const emit = defineEmits<{
  "update-form": [value: Hy2dAltimeterForm];
}>();
const form = reactive<Hy2dAltimeterForm>(
  JSON.parse(JSON.stringify(props.form)) as Hy2dAltimeterForm
);
watch(
  form,
  value =>
    emit("update-form", JSON.parse(JSON.stringify(value)) as Hy2dAltimeterForm),
  { deep: true }
);
</script>
