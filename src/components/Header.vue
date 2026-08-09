<template>
  <div class="top-header">
    <div class="logo" @click="$router.push('/index')">
      <div class="img">
        <!-- <img src="../assets/logo.png" alt=""/> -->
      </div>
      <div class="txt">
        <!-- <span class="cn">{{ nameStore.cnName }}</span>
        <span class="en">{{ nameStore.enName }}</span> -->
      </div>
    </div>
    <div class="right-info">
      <div class="item" @click="$router.push('/user')">
        <el-avatar
          :size="28"
          src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"
        />
        <!--<img src="../assets/icon_user.png" alt="" />-->
        <div class="txt">{{ username }}</div>
      </div>
      <div class="item">
        <i class="iconfont icon-tuichu" />
        <div class="txt" @click="logout">退出登录</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useNav } from "@/layout/hooks/useNav";
import { getCurrentDate } from "@pureadmin/utils";
import { onBeforeUnmount, ref } from "vue";
// import {useNameStoreHook} from "@/store/modules/name";

// const nameStore = useNameStoreHook();
const timer = ref();
const nowDate = ref();

timer.value = setInterval(() => {
  nowDate.value = `${getCurrentDate().ymd} ${getCurrentDate().week} ${
    getCurrentDate().hms
  }`;
}, 1000);

onBeforeUnmount(() => {
  timer.value = null;
});

const { title, username, logout } = useNav();
</script>

<style lang="less" scoped>
.top-header {
  display: flex;
  width: 100%;
  min-width: var(--min-width);
  height: var(--index-header-height);
  background: #003f88;
  z-index: var(--zindex-header);

  > .logo {
    display: flex;
    padding-left: 11px;
    //width: 600px;
    line-height: var(--index-header-height);
    cursor: pointer;

    > .img {
      padding-top: 6px;
      margin-right: 20px;
      width: 60px;
      height: 100%;
      height: 100%;

      img {
        height: 60px;
        width: auto;
      }
    }

    .txt {
      flex: 1;
      font-size: 28px;
      color: var(--color-white);
      display: flex;
      flex-direction: column;

      .cn {
        line-height: 40px;
        font-weight: 700;
      }

      .en {
        line-height: 30px;
        font-size: 13px;
        letter-spacing: 1px;
      }
    }
  }

  > .right-info {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: right;
    color: #fff;

    .item {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0 20px;
      height: 100%;
      line-height: 60px;
      color: var(--color-white);
      cursor: pointer;

      img {
        position: relative;
        height: 16px;
      }

      .txt {
        padding-left: 6px;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }

    .item:last-child:before {
      position: absolute;
      top: 2px;
      left: 0;
      content: "|";
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);
    }
  }
}
</style>
