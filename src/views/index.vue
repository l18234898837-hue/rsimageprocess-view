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
  overflow: hidden;
  background: #071827;

  .container-main {
    position: relative;
    overflow: hidden;
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: #071827;
    background-image: linear-gradient(
        rgb(131 211 246 / 4%) 1px,
        transparent 1px
      ),
      linear-gradient(90deg, rgb(131 211 246 / 4%) 1px, transparent 1px),
      radial-gradient(circle at 78% 12%, rgb(28 143 204 / 28%), transparent 31%),
      radial-gradient(circle at 13% 110%, rgb(15 93 151 / 34%), transparent 41%),
      linear-gradient(135deg, #061725 0%, #0a2235 52%, #0c2e45 100%);
    background-position: center;
    background-size:
      56px 56px,
      56px 56px,
      auto,
      auto,
      auto;
    box-shadow: inset 0 18px 46px rgb(0 9 19 / 18%);
  }
}
</style>
