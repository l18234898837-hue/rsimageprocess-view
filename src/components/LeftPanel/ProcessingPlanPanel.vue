<template>
  <section class="processing-plan" aria-labelledby="processing-plan-title">
    <div class="processing-plan__header">
      <div>
        <span class="processing-plan__eyebrow">PROCESSING PLAN</span>
        <h4 id="processing-plan-title">选择处理功能</h4>
        <p>先选择目标功能，系统会自动补齐必要的前置步骤。</p>
      </div>
      <span class="processing-plan__count"
        >{{ selectedTargets.length }} 项目标</span
      >
    </div>

    <div class="processing-plan__targets">
      <section
        v-for="group in targetGroups"
        :key="group.key"
        class="processing-plan__group"
      >
        <div class="processing-plan__group-heading">
          <strong>{{ group.title }}</strong>
          <span>{{ group.steps.length }} 项</span>
        </div>
        <label
          v-for="step in group.steps"
          :key="step.key"
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
          <span>
            <strong>{{ step.title }}</strong>
            <small v-if="step.productTitle">{{ step.productTitle }}</small>
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
      </section>
    </div>

    <div v-if="planSteps.length" class="processing-plan__resolved">
      <div class="processing-plan__subheading">
        <strong>执行计划</strong>
        <span>自动依赖已补齐</span>
      </div>
      <div class="processing-plan__steps">
        <template v-for="(step, index) in planSteps" :key="step.key">
          <span v-if="index" class="processing-plan__arrow" aria-hidden="true"
            >↓</span
          >
          <div class="processing-plan__step" :class="`is-${step.kind}`">
            <span class="processing-plan__step-marker" aria-hidden="true" />
            <span>
              <strong>{{ step.title }}</strong>
              <small>{{
                step.kind === "target" ? "用户选择" : "系统自动添加"
              }}</small>
            </span>
          </div>
        </template>
      </div>
    </div>
    <p v-else class="processing-plan__empty">请选择至少一个处理功能。</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
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

const targetGroups = computed(() => {
  const groups = [
    { key: "preprocess", title: "预处理", steps: [] as StepDefinition[] },
    { key: "derived", title: "派生处理", steps: [] as StepDefinition[] }
  ];
  props.targetSteps.forEach(step => {
    const group = groups.find(item => item.key === (step.group || "derived"));
    group?.steps.push(step);
  });
  return groups.filter(group => group.steps.length);
});

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

.processing-plan__header,
.processing-plan__subheading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.processing-plan__eyebrow,
.processing-plan__subheading span,
.processing-plan__count {
  color: #647585;
  font-size: 11px;
}

.processing-plan h4 {
  margin: 4px 0;
  color: #243746;
  font-size: 15px;
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
  padding: 3px 2px 0;
  color: #243746;
  font-size: 12px;
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
  padding: 11px 12px;
  color: #405665;
  background: #f7fafb;
  border: 1px solid #dce5ea;
  border-radius: 4px;
  cursor: pointer;
}

.processing-plan__target.is-selected {
  color: #155d7a;
  background: #e6f4fa;
  border-color: #2e7da3;
}

.processing-plan__target.is-automatic {
  color: #5d7280;
  background: #eef4f6;
  border-color: #c4d2d8;
  cursor: not-allowed;
}

.processing-plan__target .is-auto-label {
  color: #738993;
}

.processing-plan__target input {
  margin-top: 2px;
  accent-color: #2e7da3;
}

.processing-plan__target strong,
.processing-plan__target small,
.processing-plan__step strong,
.processing-plan__step small {
  display: block;
}

.processing-plan__target small,
.processing-plan__step small {
  margin-top: 3px;
  color: #647585;
  font-size: 11px;
}

.processing-plan__resolved {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #e3eaee;
}

.processing-plan__steps {
  display: flex;
  align-items: stretch;
  gap: 5px;
  margin-top: 9px;
  overflow-x: auto;
}

.processing-plan__step {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-width: 118px;
  padding: 7px;
  background: #f7fafb;
  border: 1px solid #dce5ea;
  border-radius: 3px;
}

.processing-plan__step.is-target {
  background: #eef8f4;
  border-color: #b9daca;
}

.processing-plan__step-marker {
  width: 7px;
  height: 7px;
  margin-top: 4px;
  flex: 0 0 auto;
  background: #9eafb8;
  border-radius: 50%;
}

.is-target .processing-plan__step-marker {
  background: #338467;
}

.processing-plan__arrow {
  align-self: center;
  color: #9eafb8;
}

.processing-plan__empty {
  margin-top: 12px !important;
  padding: 10px;
  background: #fafcfd;
  border: 1px dashed #cbd9df;
}

@media (max-width: 640px) {
  .processing-plan__header {
    align-items: flex-start;
  }
}
</style>
