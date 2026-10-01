<template>
  <div>
    <template v-for="item of options" :key="item.value">
      <template v-if="values.includes(String(item.value))">
        <span
          v-if="item.elTagType == 'default' || !item.elTagType"
          :class="item.elTagClass"
          >{{ item.label }}</span
        >
        <el-tag
          v-else
          :disable-transitions="true"
          :type="item.elTagType ? item.elTagType : 'primary'"
          :class="item.elTagClass"
          >{{ item.label }}</el-tag
        >
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

type DictionaryOption = {
  value: string | number;
  label: string;
  elTagType?:
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "default"
    | "";
  elTagClass?: string;
};

const props = withDefaults(
  defineProps<{
    options?: DictionaryOption[];
    value?: string | number | Array<string | number>;
  }>(),
  { options: () => [] }
);

const values = computed(() => {
  if (props.value !== null && typeof props.value !== "undefined") {
    return (Array.isArray(props.value) ? props.value : [props.value]).map(
      String
    );
  } else {
    return [];
  }
});
</script>

<style scoped>
.el-tag + .el-tag {
  margin-left: 10px;
}
</style>
