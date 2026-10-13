<template>
  <div class="artifact-interpretation">
    <section class="artifact-interpretation__purpose">
      <span class="artifact-interpretation__eyebrow">结果用途</span>
      <p>{{ interpretation.purpose }}</p>
    </section>

    <section class="artifact-interpretation__reading">
      <div class="artifact-interpretation__section-heading">
        <div>
          <span class="artifact-interpretation__eyebrow">{{
            interpretation.presentation === "image"
              ? "图中内容怎么看"
              : "文件内容怎么看"
          }}</span>
          <strong>{{
            interpretation.presentation === "image"
              ? "颜色、边缘和数值的含义"
              : "字段、指标和记录的含义"
          }}</strong>
        </div>
      </div>
      <div class="artifact-interpretation__detail-list">
        <article v-for="detail in interpretation.reading" :key="detail.label">
          <strong>{{ detail.label }}</strong>
          <p>{{ detail.text }}</p>
        </article>
      </div>
    </section>

    <section
      v-if="interpretation.legend"
      class="artifact-interpretation__legend"
    >
      <div class="artifact-interpretation__section-heading">
        <div>
          <span class="artifact-interpretation__eyebrow">图例</span>
          <strong>{{ interpretation.legend.title }}</strong>
        </div>
      </div>
      <div class="artifact-interpretation__legend-items">
        <div
          v-for="item in interpretation.legend.items"
          :key="`${item.label}-${item.color}`"
          class="artifact-interpretation__legend-item"
        >
          <span
            class="artifact-interpretation__swatch"
            :style="{ background: item.color }"
            :data-transparent="item.color === 'transparent'"
          />
          <div>
            <strong>{{ item.label }}</strong
            ><span>{{ item.description }}</span>
          </div>
        </div>
      </div>
      <p class="artifact-interpretation__legend-note">
        {{ interpretation.legend.note }}
      </p>
    </section>

    <section class="artifact-interpretation__generation">
      <span class="artifact-interpretation__eyebrow"
        >为什么会生成这样的结果</span
      >
      <ol>
        <li v-for="item in interpretation.generation" :key="item">
          {{ item }}
        </li>
      </ol>
    </section>

    <section class="artifact-interpretation__uses">
      <span class="artifact-interpretation__eyebrow">实际作用</span>
      <ul>
        <li v-for="item in interpretation.uses" :key="item">{{ item }}</li>
      </ul>
    </section>

    <section class="artifact-interpretation__parameters">
      <div class="artifact-interpretation__section-heading">
        <div>
          <span class="artifact-interpretation__eyebrow">生成参数</span>
          <strong>本产物的关键处理依据</strong>
        </div>
        <small>{{ parameterSourceLabel }}</small>
      </div>
      <div
        v-if="interpretation.parameters.length"
        class="artifact-interpretation__table"
        role="table"
      >
        <div class="artifact-interpretation__table-head" role="row">
          <span>参数</span><span>当前取值</span><span>对结果的影响</span>
        </div>
        <div
          v-for="parameter in interpretation.parameters"
          :key="parameter.key"
          class="artifact-interpretation__table-row"
          role="row"
        >
          <span
            class="artifact-interpretation__parameter-name"
            :data-group="parameter.group"
            >{{ parameter.name }}</span
          >
          <strong>{{ parameter.value }}</strong>
          <span>{{ parameter.effect }}</span>
        </div>
      </div>
      <p v-else class="artifact-interpretation__empty">
        本次任务没有返回可展示的参数记录，当前说明根据产物类型和处理阶段生成。
      </p>
    </section>

    <section class="artifact-interpretation__pipeline">
      <span class="artifact-interpretation__eyebrow">处理链路</span>
      <div class="artifact-interpretation__pipeline-steps">
        <span>输入数据</span>
        <i aria-hidden="true" />
        <span>{{ currentStageLabel }}</span>
        <i aria-hidden="true" />
        <strong>{{ artifact.displayName || artifact.type }}</strong>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
  ExecutionProgressArtifact,
  ExecutionProgressStage
} from "@/api/multiSourceSatellite";
import { artifactInterpretation } from "@/features/multisource/artifactInterpretation";
import { processingStageLabel } from "@/features/multisource/processingRunState";

const props = defineProps<{
  artifact: ExecutionProgressArtifact;
  stages: readonly ExecutionProgressStage[];
  fallbackDescription?: string;
}>();

const stage = computed(() =>
  props.stages.find(
    candidate => String(candidate.stageId) === String(props.artifact.stageId)
  )
);
const interpretation = computed(() =>
  artifactInterpretation(
    props.artifact,
    props.fallbackDescription,
    stage.value?.parameterSnapshot
  )
);
const parameterSourceLabel = computed(() =>
  stage.value?.parameterSnapshot ? "本次任务快照" : "未记录"
);
const currentStageLabel = computed(() => {
  const current = stage.value;
  if (!current) return "当前处理阶段";
  return processingStageLabel(current.stageCode || current.stageKey);
});
</script>

<style scoped>
.artifact-interpretation {
  display: grid;
  gap: 14px;
  font-size: 12px;
  line-height: 1.6;
  color: #405665;
}

.artifact-interpretation__eyebrow {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #607387;
}

.artifact-interpretation__purpose {
  padding: 10px 12px;
  background: #f3f8fc;
  border-left: 3px solid #2f78b7;
}

.artifact-interpretation__purpose p {
  margin: 3px 0 0;
}

.artifact-interpretation__reading,
.artifact-interpretation__generation,
.artifact-interpretation__uses,
.artifact-interpretation__legend {
  padding: 12px;
  background: #fff;
  border: 1px solid #dce6ef;
}

.artifact-interpretation__detail-list {
  display: grid;
  gap: 8px;
}

.artifact-interpretation__detail-list article {
  padding: 8px 10px;
  background: #f8fbfd;
  border-left: 3px solid #8ab6d1;
}

.artifact-interpretation__detail-list strong,
.artifact-interpretation__legend-item strong {
  display: block;
  color: #294d67;
}

.artifact-interpretation__detail-list p,
.artifact-interpretation__legend-note {
  margin: 2px 0 0;
  white-space: pre-line;
}

.artifact-interpretation__generation ol,
.artifact-interpretation__uses ul {
  padding-left: 20px;
  margin: 5px 0 0;
}

.artifact-interpretation__generation li,
.artifact-interpretation__uses li {
  margin: 4px 0;
}

.artifact-interpretation__legend-items {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.artifact-interpretation__legend-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  min-width: 0;
  padding: 8px;
  background: #f9fbfc;
  border: 1px solid #e3ebf1;
}

.artifact-interpretation__legend-item > div {
  min-width: 0;
}

.artifact-interpretation__legend-item > div > span {
  display: block;
  color: #607387;
}

.artifact-interpretation__swatch {
  flex: 0 0 28px;
  width: 28px;
  height: 18px;
  border: 1px solid #c6d6e0;
  border-radius: 3px;
}

.artifact-interpretation__swatch[data-transparent="true"] {
  background: repeating-linear-gradient(
    45deg,
    #fff 0 4px,
    #d8e2e8 4px 8px
  ) !important;
}

.artifact-interpretation__legend-note {
  color: #607387;
}

.artifact-interpretation__parameters {
  min-width: 0;
  padding: 12px;
  border: 1px solid #dce6ef;
}

.artifact-interpretation__section-heading {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
}

.artifact-interpretation__section-heading strong {
  display: block;
  font-size: 13px;
  color: #24364b;
}

.artifact-interpretation__section-heading small {
  color: #607387;
  white-space: nowrap;
}

.artifact-interpretation__table {
  border-top: 1px solid #dce6ef;
}

.artifact-interpretation__table-head,
.artifact-interpretation__table-row {
  display: grid;
  grid-template-columns: minmax(76px, 0.8fr) minmax(82px, 1fr) minmax(
      120px,
      1.45fr
    );
  gap: 8px;
  align-items: center;
}

.artifact-interpretation__table-head {
  padding: 6px 0;
  font-size: 11px;
  color: #607387;
}

.artifact-interpretation__table-row {
  padding: 8px 0;
  border-top: 1px solid #edf2f5;
}

.artifact-interpretation__table-row strong {
  font-weight: 600;
  color: #24364b;
  overflow-wrap: anywhere;
}

.artifact-interpretation__parameter-name {
  font-weight: 600;
  color: #356f9b;
}

.artifact-interpretation__parameter-name[data-group="时间"] {
  color: #5b7289;
}

.artifact-interpretation__parameter-name[data-group="质量"] {
  color: #287a62;
}

.artifact-interpretation__parameter-name[data-group="算法"] {
  color: #8a6a38;
}

.artifact-interpretation__empty {
  padding: 8px 0;
  margin: 0;
  color: #71838e;
}

.artifact-interpretation__pipeline {
  padding-top: 2px;
}

.artifact-interpretation__pipeline-steps {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
  margin-top: 5px;
  overflow-x: auto;
  color: #607387;
  white-space: nowrap;
}

.artifact-interpretation__pipeline-steps i {
  flex: 0 0 18px;
  width: 18px;
  height: 1px;
  background: #9bb6ca;
}

.artifact-interpretation__pipeline-steps strong {
  color: #2f78b7;
}

@media (width <= 640px) {
  .artifact-interpretation__table-head {
    display: none;
  }

  .artifact-interpretation__table-row {
    grid-template-columns: minmax(84px, 0.7fr) minmax(0, 1fr);
  }

  .artifact-interpretation__table-row > :last-child {
    grid-column: 1 / -1;
    color: #607387;
  }
}
</style>
