<template>
  <header class="platform-nav">
    <button
      type="button"
      class="brand-lockup"
      aria-label="返回数据服务首页"
      @click="handleMenuClick('/data-source')"
    >
      <span class="brand-mark"><img :src="LogoImg" alt="" /></span>
      <span class="brand-copy">
        <span class="brand-name">{{ title }}</span>
        <span class="brand-context">SATELLITE INTELLIGENCE</span>
      </span>
    </button>

    <nav v-if="userToken" class="menu-list" aria-label="主导航">
      <button
        v-for="item of menuList"
        :key="item.path"
        type="button"
        class="menu-item"
        :class="{ active: route.path === item.path }"
        :aria-current="route.path === item.path ? 'page' : undefined"
        @click="handleMenuClick(item.path)"
      >
        <img :src="item.icon" alt="" />
        <span>{{ item.name }}</span>
      </button>
    </nav>

    <div class="platform-tools">
      <el-tooltip
        placement="bottom"
        effect="dark"
        popper-class="custom-tooltip"
      >
        <template #content>
          如有疑问，请联系管理员邮箱： <br />
          guanliyuan@123.com
        </template>
        <button type="button" class="tool-icon" aria-label="帮助信息">
          <el-icon><QuestionFilled /></el-icon>
        </button>
      </el-tooltip>
      <button
        v-if="!username"
        type="button"
        class="login-action"
        @click="$router.push('/login')"
      >
        请先登录
      </button>
      <el-dropdown v-else :hide-on-click="false" trigger="click">
        <span class="el-dropdown-link">
          <el-icon size="20"><Avatar /></el-icon>
          <el-icon size="20"><arrow-down /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="upPasswdFormVisible = true">
              修改密码
            </el-dropdown-item>
            <el-dropdown-item @click="$router.push('/user')">
              个人中心
            </el-dropdown-item>
            <el-dropdown-item @click="logout">
              <div class="flex justify-center w-full">注销</div>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
  <el-dialog
    v-model="upPasswdFormVisible"
    style="padding: 30px; background-color: rgb(255 255 255)"
    destroy-on-close
    title=""
    width="500"
  >
    <template #header>
      <h3 class="text-[#545353]">修改密码</h3>
    </template>
    <el-form :model="upPasswdForm" label-width="70px" label-position="left">
      <el-form-item label="用户名">
        <span class="text-[#545353]">{{ upPasswdForm.username }}</span>
      </el-form-item>
      <!-- <el-form-item label="用户ID">
        <span class="text-white">{{ upPasswdForm.userId }}</span>
      </el-form-item> -->
      <el-form-item label="旧密码">
        <el-input
          v-model="upPasswdForm.password"
          type="password"
          show-password
          clearable
        />
      </el-form-item>
      <el-form-item label="新密码">
        <el-input
          v-model="upPasswdForm.newPassword"
          type="password"
          show-password
          clearable
        />
      </el-form-item>
      <el-form-item label="确认密码">
        <el-input
          v-model="upPasswdForm.confirmPassword"
          type="password"
          show-password
          clearable
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="flex justify-between">
        <el-button style="width: 45%" @click="upPasswdFormVisible = false"
          >取消</el-button
        >
        <el-button style="width: 45%" type="primary" @click="updatePwd">
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useNav } from "@/layout/hooks/useNav";
import { useRoute, useRouter } from "vue-router";
import { Avatar, ArrowDown, QuestionFilled } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { message } from "@/utils/message";
import map from "@/libs/tdtmap";

import LogoImg from "@/assets/logo/bluescope-satellite-mark.png";
import dataSoureImg from "@/assets/common/shuju_1@2x.png";
import indexImg from "@/assets/common/yaogan_1@2x.png";
import sateOrbitImg from "@/assets/common/EMI-_1@2x.png";

import { updateUserPwd } from "@/api/user";

const route = useRoute();
const router = useRouter();
const { title, username, logout, userToken } = useNav();
const upPasswdFormVisible = ref(false);
const upPasswdForm = ref({
  password: "",
  newPassword: "",
  confirmPassword: "",
  username: "",
  userId: ""
});

const menuList = ref([
  {
    name: "数据服务",
    path: "/data-source",
    icon: dataSoureImg
  },
  {
    name: "算法服务",
    path: "/satellite-applications",
    icon: indexImg
  },
  {
    name: "过境查询",
    path: "/satelliteOrbit",
    icon: sateOrbitImg
  }
]);

const updatePwd = async () => {
  if (!upPasswdForm.value.password) {
    message("请输入旧密码", {
      type: "warning"
    });
    return;
  }
  if (!upPasswdForm.value.newPassword) {
    message("请输入新密码", {
      type: "warning"
    });
    return;
  }
  if (!upPasswdForm.value.confirmPassword) {
    message("请输入确认密码", {
      type: "warning"
    });
    return;
  }
  if (upPasswdForm.value.newPassword !== upPasswdForm.value.confirmPassword) {
    message("两次输入的密码不一致", {
      type: "warning"
    });
    return;
  }
  try {
    const res = await updateUserPwd(
      upPasswdForm.value.password,
      upPasswdForm.value.newPassword
    );
    if (res.code === 200) {
      message("密码修改成功,请重新登录", {
        type: "success"
      });
      logout();
      upPasswdFormVisible.value = false;
    } else {
      ElMessage.error(res.msg || "密码修改失败");
    }
  } catch (error) {
    // message("密码修改失败", {
    //   type: "error"
    // });
  }
};

const handleMenuClick = path => {
  if (route.path !== path) {
    map.removeLocalImageLayers();
    map.viewer.entities.removeAll();
    router.push(path).then(() => {
      if (path === "/satellite-applications") {
        window.location.reload();
      }
    });
  }
};

watch(
  () => username.value,
  val => {
    upPasswdForm.value.username = val;
  },
  { immediate: true }
);
</script>

<style lang="less" scoped>
.platform-nav {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 72px;
  padding: 0 clamp(18px, 2.4vw, 42px);
  overflow: hidden;
  color: #eaf8ff;
  background: radial-gradient(
      circle at 78% -40%,
      rgb(66 202 255 / 38%),
      transparent 35%
    ),
    linear-gradient(104deg, #061725 0%, #0b2a43 52%, #0d3f60 100%);
  border-bottom: 1px solid rgb(164 228 255 / 20%);
  box-shadow: 0 10px 32px rgb(0 21 38 / 30%);
  isolation: isolate;

  &::after {
    position: absolute;
    top: 0;
    right: 14%;
    z-index: -1;
    width: 360px;
    height: 100%;
    content: "";
    background-image: linear-gradient(
      110deg,
      transparent 5%,
      rgb(143 225 255 / 9%) 50%,
      transparent 91%
    );
    transform: skewX(-26deg);
  }
}

.brand-lockup {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 12px;
  min-width: 278px;
  padding: 0;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;

  &:focus-visible,
  &:hover .brand-name {
    outline: none;
    filter: brightness(1.14);
  }
}

.brand-mark {
  display: grid;
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  place-items: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 4px 8px rgb(0 0 0 / 25%));
  }
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1;
}

.brand-name {
  display: inline-block;
  font-family: "Avenir Next", "Segoe UI", "PingFang SC", sans-serif;
  font-size: clamp(25px, 2vw, 31px);
  font-weight: 760;
  letter-spacing: 0.075em;
  background: linear-gradient(105deg, #fff 6%, #a1e4ff 54%, #71c8ff 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 18px rgb(79 205 255 / 18%);
  transition: filter 0.2s ease;
}

.brand-context {
  padding-left: 2px;
  font-size: 9px;
  font-weight: 650;
  line-height: 1.4;
  color: rgb(184 222 240 / 75%);
  letter-spacing: 0.21em;
}

.menu-list {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  margin-left: clamp(20px, 5vw, 112px);
}

.menu-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 15px;
  font-family: "Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: rgb(216 237 247 / 76%);
  letter-spacing: 0.04em;
  white-space: nowrap;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 7px;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;

  img {
    width: 19px;
    height: 19px;
    object-fit: contain;
    filter: saturate(0.78) brightness(1.75);
    opacity: 0.78;
    transition: opacity 0.2s ease;
  }

  &::after {
    position: absolute;
    right: 16px;
    bottom: -8px;
    left: 16px;
    height: 2px;
    content: "";
    background: linear-gradient(
      90deg,
      transparent,
      #79dbff 18%,
      #79dbff 82%,
      transparent
    );
    border-radius: 2px;
    opacity: 0;
    transform: scaleX(0.35);
    transition:
      opacity 0.2s ease,
      transform 0.2s ease;
  }

  &:hover,
  &:focus-visible,
  &.active {
    color: #f4fcff;
    background: rgb(129 219 255 / 10%);
    border-color: rgb(147 225 255 / 16%);
    outline: none;
  }

  &:hover {
    transform: translateY(-1px);
  }

  &:hover img,
  &.active img {
    opacity: 1;
  }

  &.active::after {
    opacity: 1;
    transform: scaleX(1);
  }
}

.platform-tools {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-left: auto;
}

.tool-icon,
.login-action {
  color: rgb(212 240 251 / 84%);
  background: transparent;
  border: 0;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background-color 0.2s ease;
}

.tool-icon {
  display: grid;
  width: 30px;
  height: 30px;
  font-size: 18px;
  place-items: center;
  border: 1px solid rgb(174 229 249 / 18%);
  border-radius: 50%;

  &:hover,
  &:focus-visible {
    color: #fff;
    background: rgb(119 218 255 / 16%);
    outline: 2px solid rgb(140 222 255 / 44%);
    outline-offset: 2px;
  }
}

.login-action {
  padding: 7px 12px;
  font-size: 13px;
  letter-spacing: 0.04em;
  border: 1px solid rgb(174 229 249 / 26%);
  border-radius: 5px;

  &:hover,
  &:focus-visible {
    color: #fff;
    background: rgb(112 211 255 / 15%);
    border-color: rgb(177 237 255 / 55%);
    outline: none;
  }
}

.el-dropdown {
  display: flex;
  align-items: center;
  border: none !important;
}

.el-dropdown-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: rgb(212 240 251 / 88%);
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: #fff;
  }
}

@media (max-width: 1180px) {
  .platform-nav {
    padding: 0 20px;
  }

  .brand-lockup {
    min-width: auto;
  }

  .menu-list {
    margin-left: 22px;
  }

  .menu-item {
    padding: 0 10px;
  }
}

@media (max-width: 900px) {
  .brand-context,
  .menu-item img {
    display: none;
  }

  .menu-list {
    gap: 2px;
    margin-left: 16px;
  }

  .menu-item {
    padding: 0 8px;
    font-size: 14px;
  }
}

@media (max-width: 680px) {
  .platform-nav {
    min-height: 62px;
    padding: 0 13px;
  }

  .brand-mark {
    width: 40px;
    height: 40px;
  }

  .brand-name {
    font-size: 23px;
  }

  .menu-list {
    display: none;
  }

  .platform-tools {
    gap: 8px;
  }
}
</style>
