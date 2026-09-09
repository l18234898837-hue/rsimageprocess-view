<template>
  <el-tooltip :content="text" placement="top" effect="light" :show-after="180">
    <button
      class="parameter-hint"
      type="button"
      :aria-label="`查看${label}说明`"
    >
      <el-icon><QuestionFilled /></el-icon>
    </button>
  </el-tooltip>
</template>

<script setup lang="ts">
import { QuestionFilled } from "@element-plus/icons-vue";

withDefaults(
  defineProps<{
    text: string;
    label?: string;
  }>(),
  { label: "参数" }
);
</script>
