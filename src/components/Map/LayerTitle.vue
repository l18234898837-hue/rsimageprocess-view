<template>
  <div class="layer-title-wrap">
    <div class="map-layer-title">
      <div class="item title">{{ title }}</div>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps({
  title: {
    default: "",
    type: String
  }
});
</script>
<style lang="scss" scoped>
.layer-title-wrap {
  .map-layer-title {
    height: 40px;
    line-height: 40px;
    color: var(--color-white);
    border-radius: 4px;

    .title {
      padding: 0 20px;
      background: rgb(0 0 0 / 65%);
    }
  }
}
</style>
