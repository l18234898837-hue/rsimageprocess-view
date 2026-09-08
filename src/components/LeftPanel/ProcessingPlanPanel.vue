<template>
  <div class="processing-plan-stack">
    <section class="processing-plan" aria-labelledby="processing-plan-title">
      <div class="processing-plan__header">
        <div class="processing-plan__title-block">
          <div class="processing-plan__title-row">
            <h4 id="processing-plan-title">选择处理功能</h4>
            <el-tooltip
              content="先选择目标功能，系统会自动补齐必要的前置步骤。"
              placement="top-start"
              effect="light"
              :show-after="180"
            >
              <button
                class="processing-plan__help"
                type="button"
                aria-label="查看处理功能说明"
              >
                <el-icon><QuestionFilled /></el-icon>
              </button>
            </el-tooltip>
            <span
              v-if="!selectedTargets.length"
              class="processing-plan__empty-inline"
              role="status"
              >请选择至少一个处理功能</span
            >
          </div>
        </div>
        <div class="processing-plan__header-meta">
          <button
            class="processing-plan__toggle"
            type="button"
            :aria-expanded="isTargetsVisible"
            aria-controls="processing-plan-targets"
            :title="isTargetsVisible ? '收起处理功能' : '展开处理功能'"
            @click="isTargetsVisible = !isTargetsVisible"
          >
            <el-icon :class="{ 'is-expanded': isTargetsVisible }">
              <ArrowDown />
            </el-icon>
          </button>
        </div>
      </div>

      <div
        v-if="isTargetsVisible"
        id="processing-plan-targets"
        class="processing-plan__targets"
      >
        <section
          v-for="group in targetGroups"
          :key="group.key"
          class="processing-plan__group"
        >
          <div class="processing-plan__group-heading">
            <strong>{{ group.title }}</strong>
            <span>{{ group.steps.length }} 项</span>
          </div>
          <el-tooltip
            v-for="step in group.steps"
            :key="step.key"
            class="processing-plan__target-tooltip"
            :content="step.productTitle || step.title"
            placement="top"
            effect="light"
            :offset="6"
            :show-after="180"
          >
            <label
              class="processing-plan__target"
              :class="{
                'is-selected': checkedTargets.includes(step.key),
                'is-automatic': isAutomaticTarget(step.key)
              }"
            >
              <input
                type="checkbox"
                :checked="checkedTargets.includes(step.key)"
                :disabled="disabled || isLockedTarget(step.key)"
                @change="toggleTarget(step.key)"
              />
              <span class="processing-plan__target-copy">
                <strong>{{ step.title }}</strong>
                <small v-if="isAutomaticTarget(step.key)" class="is-auto-label"
                  >自动依赖</small
                >
                <small
                  v-else-if="isLockedTarget(step.key)"
                  class="is-auto-label"
                  >必需前置</small
                >
              </span>
            </label>
          </el-tooltip>
        </section>
      </div>
    </section>

    <section
      v-if="planSteps.length"
      class="execution-plan"
      aria-labelledby="execution-plan-title"
    >
      <div class="processing-plan__subheading">
        <div class="processing-plan__resolved-heading">
          <strong id="execution-plan-title">执行计划</strong>
          <el-tooltip
            v-if="automaticPlanSteps.length"
            class="processing-plan__dependency-tooltip"
            :content="automaticPlanSummary"
            placement="top"
            effect="light"
            :show-after="180"
          >
            <button
              class="processing-plan__dependency-summary"
              type="button"
              aria-label="查看自动补齐的前置步骤"
            >
              <el-icon><InfoFilled /></el-icon>
              <span>已自动补齐 {{ automaticPlanSteps.length }} 个前置步骤</span>
            </button>
          </el-tooltip>
        </div>
      </div>
      <div
        class="processing-plan__steps"
        :class="{ 'is-scrollable': planSteps.length > 3 }"
      >
        <div
          v-for="(step, index) in planSteps"
          :key="step.key"
          class="processing-plan__step-row"
        >
          <div class="processing-plan__step" :class="`is-${step.kind}`">
            <span class="processing-plan__step-marker" aria-hidden="true" />
            <span class="processing-plan__step-copy">
              <span class="processing-plan__step-title-row">
                <strong>{{ step.title }}</strong>
                <small class="processing-plan__step-status">{{
                  step.kind === "target" ? "用户选择" : "系统自动添加"
                }}</small>
              </span>
            </span>
            <span class="processing-plan__step-index" aria-hidden="true">
              {{ index + 1 }}
            </span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowDown, InfoFilled, QuestionFilled } from "@element-plus/icons-vue";
import type { StepDefinition } from "@/features/multisource/pipelineDefinitions";

const props = defineProps<{
  targetSteps: readonly StepDefinition[];
  planSteps: readonly StepDefinition[];
  selectedTargets: readonly string[];
  checkedTargets: readonly string[];
  lockedTargets: readonly string[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:selectedTargets": [value: string[]];
  configure: [];
}>();

const isTargetsVisible = ref(true);

const targetGroups = computed(() => {
  const groups = [
    { key: "preprocess", title: "预处理", steps: [] as StepDefinition[] },
    { key: "derived", title: "专题处理", steps: [] as StepDefinition[] }
  ];
  props.targetSteps.forEach(step => {
    const group = groups.find(item => item.key === (step.group || "derived"));
    group?.steps.push(step);
  });
  return groups.filter(group => group.steps.length);
});

const automaticPlanSteps = computed(() =>
  props.planSteps.filter(step => step.kind === "system")
);
const automaticPlanSummary = computed(() =>
  automaticPlanSteps.value.map(step => step.title).join("、")
);

function isAutomaticTarget(stepKey: string) {
  return (
    props.checkedTargets.includes(stepKey) &&
    !props.selectedTargets.includes(stepKey)
  );
}

function isLockedTarget(stepKey: string) {
  return props.lockedTargets.includes(stepKey);
}

function toggleTarget(stepKey: string) {
  if (props.disabled) return;
  if (isLockedTarget(stepKey)) return;
  const next = props.selectedTargets.includes(stepKey)
    ? props.selectedTargets.filter(key => key !== stepKey)
    : [...props.selectedTargets, stepKey];
  emit("update:selectedTargets", next);
}
</script>

<style scoped lang="less">
.processing-plan {
  padding: 14px;
  background: #fff;
  border: 1px solid #d7e1e7;
  border-radius: 4px;
}

.processing-plan-stack {
  display: grid;
  gap: 8px;
}

.processing-plan__header,
.processing-plan__subheading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.processing-plan__header {
  flex-wrap: nowrap;
}

.processing-plan__title-block,
.processing-plan__header-meta {
  min-width: 0;
}

.processing-plan__toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
  padding: 2px 4px 2px 7px;
  color: #647585;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
}

.processing-plan__toggle:hover {
  color: #2e718d;
  background: #edf7fa;
  border-color: #c7e3ea;
}

.processing-plan__toggle:focus-visible {
  outline: 2px solid #2e7da3;
  outline-offset: 2px;
}

.processing-plan__toggle .el-icon {
  font-size: 13px;
  transition: transform 150ms ease;
}

.processing-plan__toggle .el-icon.is-expanded {
  transform: rotate(180deg);
}

.processing-plan__title-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.processing-plan__help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  color: #6c8490;
  cursor: help;
  background: transparent;
  border: 0;
  border-radius: 3px;
}

.processing-plan__help .el-icon {
  font-size: 14px;
}

.processing-plan__help:hover {
  color: #206e8c;
  background: #e6f2f6;
}

.processing-plan__help:focus-visible,
.processing-plan__target:has(input:focus-visible) {
  outline: 2px solid #2e7da3;
  outline-offset: 2px;
}

.processing-plan__subheading span {
  color: #647585;
  font-size: 11px;
}

.processing-plan__subheading strong {
  color: var(--plain-ink, #243746);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
}

.processing-plan__resolved-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.processing-plan__dependency-summary {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  color: #2e718d;
  font-size: 11px;
  line-height: 1.3;
  cursor: help;
  background: #edf7fa;
  border: 1px solid #c7e3ea;
  border-radius: 3px;
}

.processing-plan__dependency-summary:hover {
  color: #1d5e79;
  background: #e4f3f7;
  border-color: #9fcbd8;
}

.processing-plan__dependency-summary .el-icon {
  flex: 0 0 auto;
  font-size: 12px;
}

.processing-plan__dependency-summary span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.processing-plan__dependency-summary:focus-visible {
  outline: 2px solid #2e7da3;
  outline-offset: 2px;
}

.processing-plan__header-meta {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  text-align: right;
}

.processing-plan__empty-inline {
  overflow: hidden;
  color: #a66a34;
  text-overflow: ellipsis;
  font-size: 11px;
  line-height: 1.3;
  white-space: nowrap;
}

.processing-plan h4 {
  margin: 0;
  color: var(--plain-ink, #243746);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
}

.processing-plan p {
  margin: 0;
  color: #647585;
  font-size: 12px;
  line-height: 1.5;
}

.processing-plan__targets {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 12px;
}

.processing-plan__group {
  display: grid;
  gap: 7px;
}

.processing-plan__group-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 2px 0;
  color: #243746;
  font-size: 13px;
  font-weight: 650;
}

.processing-plan__group-heading span {
  color: #647585;
  font-size: 11px;
}

.processing-plan__target {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 10px 11px;
  color: #405665;
  background: #f7fafb;
  border: 1px solid #dce5ea;
  border-radius: 4px;
  cursor: pointer;
  transition:
    border-color 150ms ease,
    background-color 150ms ease;
}

.processing-plan__target-tooltip {
  display: block;
}

.processing-plan__target:hover:not(:has(input:disabled)) {
  background: #f0f8fa;
  border-color: #9fc6d4;
}

.processing-plan__target.is-selected {
  color: #155d7a;
  background: #e6f4fa;
  border-color: #2e7da3;
}

.processing-plan__target.is-automatic {
  cursor: not-allowed;
}

.processing-plan__target.is-selected.is-automatic {
  color: #155d7a;
  background: #e6f4fa;
  border-color: #2e7da3;
}

.processing-plan__target .is-auto-label {
  color: #3d7186;
}

.processing-plan__target input {
  margin-top: 2px;
  accent-color: #2e7da3;
}

.processing-plan__target strong,
.processing-plan__target small {
  display: block;
}

.processing-plan__target-copy {
  display: flex;
  min-width: 0;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.processing-plan__target strong {
  color: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.processing-plan__target small {
  flex: 0 0 auto;
  margin-top: 0;
  color: #647585;
  font-size: 10px;
  line-height: 1.3;
  white-space: nowrap;
}

.execution-plan {
  padding: 12px 14px 14px;
  background: #fff;
  border: 1px solid #d7e1e7;
  border-radius: 4px;
}

.execution-plan .processing-plan__subheading {
  margin-bottom: 9px;
}

.processing-plan__steps {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 5px;
  margin-top: 9px;
}

.processing-plan__steps.is-scrollable {
  max-height: 132px;
  padding-right: 4px;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.processing-plan__step-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: stretch;
}

.processing-plan__step {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 32px;
  padding: 6px 9px;
  background: #f8fbfc;
  border: 1px solid #d6e2e8;
  border-radius: 5px;
  box-shadow: 0 1px 2px rgb(33 67 83 / 5%);
}

.processing-plan__step.is-target {
  background: #eef8f4;
  border-color: #b9daca;
  box-shadow: 0 1px 3px rgb(51 132 103 / 10%);
}

.processing-plan__step-marker {
  width: 7px;
  height: 7px;
  margin-top: 0;
  flex: 0 0 auto;
  background: #9eafb8;
  border-radius: 50%;
}

.is-target .processing-plan__step-marker {
  background: #338467;
}

.processing-plan__step-copy {
  min-width: 0;
}

.processing-plan__step-title-row {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
}

.processing-plan__step-title-row strong {
  overflow: hidden;
  color: #314957;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.processing-plan__step-status {
  flex: 0 0 auto;
  margin: 0;
  color: #71838e;
  font-size: 10px;
  line-height: 1.35;
  white-space: nowrap;
}

.processing-plan__step-index {
  display: inline-flex;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  color: #617783;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  background: #e8eef1;
  border: 1px solid #cbd8de;
  border-radius: 50%;
}

@media (max-width: 640px) {
  .processing-plan__empty-inline {
    max-width: 12rem;
  }

  .processing-plan__resolved-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }
}
</style>
