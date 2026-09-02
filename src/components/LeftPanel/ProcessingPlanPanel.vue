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
      <div
        v-for="step in targetSteps"
        :key="step.key"
        class="processing-plan__target-group"
      >
        <label
          class="processing-plan__target"
          :class="{ 'is-selected': selectedTargets.includes(step.key) }"
        >
          <input
            type="checkbox"
            :checked="selectedTargets.includes(step.key)"
            :disabled="disabled"
            @change="toggleTarget(step.key)"
          />
          <span>
            <strong>{{ step.title }}</strong>
            <small v-if="step.productTitle">{{ step.productTitle }}</small>
          </span>
        </label>
        <div
          v-if="selectedTargets.includes(step.key)"
          class="processing-plan__detail"
        >
          <div class="processing-plan__detail-header">
            <strong>处理细节</strong>
            <button
              type="button"
              :disabled="disabled"
              @click="emit('configure')"
            >
              <el-icon><Setting /></el-icon>
              <span>配置参数</span>
            </button>
          </div>
          <dl class="processing-plan__detail-list">
            <div>
              <dt>处理内容</dt>
              <dd>{{ step.productTitle || step.title }}</dd>
            </div>
            <div>
              <dt>自动补齐</dt>
              <dd>
                <span
                  v-for="prerequisite in getPrerequisiteSteps(step)"
                  :key="prerequisite.key"
                  class="processing-plan__dependency"
                  >{{ prerequisite.title }}</span
                >
                <span v-if="!getPrerequisiteSteps(step).length">无</span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
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
import { Setting } from "@element-plus/icons-vue";
import type { StepDefinition } from "@/features/multisource/pipelineDefinitions";

const props = defineProps<{
  targetSteps: readonly StepDefinition[];
  planSteps: readonly StepDefinition[];
  selectedTargets: readonly string[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:selectedTargets": [value: string[]];
  configure: [];
}>();

const planStepsByKey = computed(
  () => new Map(props.planSteps.map(step => [step.key, step]))
);

function getPrerequisiteSteps(step: StepDefinition): StepDefinition[] {
  const prerequisites: StepDefinition[] = [];
  const visited = new Set<string>();
  const visit = (stepKey: string) => {
    if (visited.has(stepKey)) return;
    visited.add(stepKey);
    const prerequisite = planStepsByKey.value.get(stepKey);
    if (!prerequisite) return;
    prerequisite.dependsOn.forEach(visit);
    prerequisites.push(prerequisite);
  };

  step.dependsOn.forEach(visit);
  return prerequisites;
}

function toggleTarget(stepKey: string) {
  if (props.disabled) return;
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

.processing-plan__detail {
  padding: 10px 12px 12px 33px;
  background: #f8fbfc;
  border: 1px solid #b8d5e1;
  border-top: 0;
  border-radius: 0 0 4px 4px;
}

.processing-plan__target-group:has(.processing-plan__detail)
  .processing-plan__target {
  border-radius: 4px 4px 0 0;
}

.processing-plan__detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #243746;
  font-size: 12px;
}

.processing-plan__detail-header button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  color: #155d7a;
  font-size: 11px;
  background: #fff;
  border: 1px solid #9fc3d2;
  border-radius: 3px;
  cursor: pointer;
}

.processing-plan__detail-header button:disabled {
  color: #8a9ba6;
  cursor: not-allowed;
  background: #f1f5f7;
  border-color: #d5e0e5;
}

.processing-plan__detail-list {
  display: grid;
  gap: 8px;
  padding: 9px 0 0;
  margin: 0;
}

.processing-plan__detail-list div {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
}

.processing-plan__detail-list dt,
.processing-plan__detail-list dd {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
}

.processing-plan__detail-list dt {
  color: #647585;
}

.processing-plan__detail-list dd {
  color: #405665;
}

.processing-plan__dependency {
  display: inline-block;
  margin: 0 4px 4px 0;
  padding: 2px 5px;
  color: #315a6d;
  background: #edf4f7;
  border: 1px solid #d4e2e8;
  border-radius: 3px;
}

.processing-plan__target.is-selected {
  color: #155d7a;
  background: #e6f4fa;
  border-color: #2e7da3;
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
