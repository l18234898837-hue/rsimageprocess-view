<template>
  <section class="parameter-workbench-overview" aria-label="参数工作台概览">
    <header class="parameter-workbench-overview__heading">
      <div>
        <span>PARAMETER WORKBENCH</span>
        <strong>参数工作台</strong>
      </div>
      <small>当前执行计划</small>
    </header>

    <section v-if="bands.length" class="parameter-workbench-overview__section">
      <div class="parameter-workbench-overview__section-heading">
        <strong>输出波段</strong>
        <small>当前 {{ bands.length }} 项</small>
      </div>
      <div class="parameter-workbench-overview__bands">
        <span v-for="band in bands" :key="band">{{ band }}</span>
      </div>
    </section>

    <section
      v-if="parameters.length"
      class="parameter-workbench-overview__section"
    >
      <div class="parameter-workbench-overview__section-heading">
        <strong>必要参数</strong>
        <small>仅展示本次生效项</small>
      </div>
      <dl class="parameter-workbench-overview__parameters">
        <div v-for="parameter in parameters" :key="parameter.label">
          <dt>{{ parameter.label }}</dt>
          <dd>{{ parameter.value }}</dd>
        </div>
      </dl>
    </section>

    <section
      v-if="constraints.length"
      class="parameter-workbench-overview__section"
    >
      <div class="parameter-workbench-overview__section-heading">
        <strong>工程约束</strong>
        <small>只读</small>
      </div>
      <div class="parameter-workbench-overview__constraints">
        <span v-for="constraint in constraints" :key="constraint">
          {{ constraint }}
        </span>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    bands?: readonly string[];
    parameters: readonly { label: string; value: string }[];
    constraints?: readonly string[];
  }>(),
  {
    bands: () => [],
    constraints: () => []
  }
);
</script>
