<template>
  <div class="header-bg">
    <div class="h-in-bg">
      <div class="h-title">
        {{ title }}
      </div>
      <div class="h-menu-list flex-bc">
        <div class="flex">
          <div
            v-for="item of menuList"
            :key="item.url"
            class="menu ml-[69px]"
            :class="{ active: active.indexOf(item.url) > -1 }"
            @click="goUrl(item)"
          >
            <p
              :class="{ active: active.indexOf(item.url) > -1 }"
              class="text-left ml-[20px]"
            >
              {{ item.name }}
            </p>
          </div>
        </div>
        <div
          class="text-[#fff] cursor-pointer text-[22px] mr-[20px]"
          @click="logout"
        >
          退出
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useNav } from "@/layout/hooks/useNav";
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import router from "@/router";

const { title, logout } = useNav();

const route = useRoute();

const active = ref(route.path);

watch(
  () => route.path,
  value => {
    active.value = value;
  }
);

const menuList = ref([
  {
    name: "首页",
    url: "index"
  }
]);
const goUrl = item => {
  router.push(`/${item.url}`);
};
</script>

<style lang="scss" scoped>
.header-bg {
  position: fixed;
  top: 0;
  z-index: 1000;
  width: 100%;
  background: #406eeb;

  .h-in-bg {
    position: relative;
    z-index: 5;
    width: 1920px;
    height: 70px;
    margin: auto;

    .h-title {
      width: fit-content;
      margin: 0 auto;
      font-family: YouSheBiaoTiHei, sans-serif;
      font-size: 30px;
      font-style: normal;
      font-weight: 400;
      line-height: 70px;
      color: #fff;
      text-align: center;
      letter-spacing: 7.2px;
    }

    .h-menu-list {
      position: absolute;
      top: 11px;
      left: 50%;
      z-index: 500;
      width: 100%;
      transform: translateX(-50%);

      .menu {
        width: 161px;
        height: 46px;
        font-family: YouSheBiaoTiHei, sans-serif;
        font-size: 22px;
        line-height: 46px;
        text-align: left;
        cursor: pointer;

        p {
          color: rgb(187 187 187 / 95%);

          &.active {
            color: #fff;
          }
        }
      }
    }
  }
}
</style>
