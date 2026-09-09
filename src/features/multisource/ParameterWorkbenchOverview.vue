<template>
  <section class="parameter-workbench-overview" aria-label="参数工作台概览">
    <header class="parameter-workbench-overview__heading">
      <strong>当前参数</strong>
    </header>

    <section
      v-if="parameters.length"
      class="parameter-workbench-overview__section"
    >
      <dl class="parameter-workbench-overview__parameters">
        <div v-for="parameter in parameters" :key="parameter.label">
          <dt>{{ parameter.label }}</dt>
          <dd>{{ parameter.value }}</dd>
        </div>
      </dl>
    </section>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  parameters: readonly { label: string; value: string }[];
}>();
</script>
