<template>
  <el-dialog
    v-model="open"
    class="multisource-dialog"
    :title="title"
    :width="width"
    append-to-body
    :close-on-click-modal="false"
    destroy-on-close
  >
    <slot />
    <template #footer>
      <slot name="footer">
        <el-button type="primary" @click="open = false">知道了</el-button>
      </slot>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{ title: string; width?: string }>(),
  { width: "420px" }
);
const open = defineModel<boolean>({ required: true });
</script>

<style scoped lang="less">
.multisource-dialog :deep(.el-dialog__header) {
  margin-right: 0;
  border-bottom: 1px solid #e2e9ed;
}
</style>
