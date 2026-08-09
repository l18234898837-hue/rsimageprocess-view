<template>
  <div class="analysis-mode-panel">
    <div class="analysis-mode-panel__body flex">
      <div
        :class="[...itemClass, 'border-l-0 border-r-0']"
        @click="emit('select', 'point')"
      >
        点
      </div>
      <!-- <div
        :class="[
          ...itemClass,
          'w-12 whitespace-nowrap overflow-hidden border-l-2'
        ]"
        @click="emit('select', 'rectangle')"
      >
        矩形
      </div> -->
    </div>
    <span
      class="analysis-mode-panel__close"
      title="关闭"
      @click.stop="emit('close')"
    >
      ×
    </span>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  select: [mode: "point" | "rectangle"];
  close: [];
}>();

const itemClass = [
  "text-[#545353] font-[YouSheBiaoTiHei] cursor-pointer",
  "flex items-center justify-start p-2 py-0.5  border-[rgba(210,210,212)]",
  "hover:text-[#95ccfc] transition-all duration-200 ease-in-out"
];
</script>

<style lang="less" scoped>
.analysis-mode-panel {
  position: relative;
  border: 2px solid rgba(255, 255, 255, 0.6);
  background: #fff;
  color: #545353;
  font-family: YouSheBiaoTiHei;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.analysis-mode-panel__close {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 16px;
  height: 16px;
  line-height: 14px;
  text-align: center;
  font-size: 14px;
  color: #888;
  cursor: pointer;
  user-select: none;

  &:hover {
    color: #95ccfc;
  }
}
</style>
