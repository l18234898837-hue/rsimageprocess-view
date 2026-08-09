<template>
  <div class="z-container">
    <!-- <Header /> -->
    <Menu />
    <div class="container-main">
      <router-view>
        <template #default="{ Component, route }">
          <!-- <transitionMain :route="route"> -->
          <component :is="Component" :key="route.fullPath" />
          <!-- </transitionMain> -->
        </template>
      </router-view>
    </div>
  </div>
</template>
<script lang="ts" setup>
// import Header from "@/components/Header.vue";
import Menu from "@/components/Menu/Menu.vue";
// import IndexMain from "@/components/indexMain.vue";
</script>

<style lang="less" scoped>
.z-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  .container-main {
    overflow: hidden;
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    background: url("@/assets/common/bg_20251126_152925.png") no-repeat center /
      100% 100%;
    // background: url("@/assets/main_bg.png") no-repeat top center / 100% 100%;
  }
}
</style>
