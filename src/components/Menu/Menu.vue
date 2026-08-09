<template>
  <div
    class="w-[100%] flex justify-start items-center bg-[rgb(0,64,141,0)] h-[70px]"
    :style="{
      backgroundImage: 'url(' + headerBgImg + ')',
      backgroundSize: '100% 100%'
    }"
  >
    <div class="logo flex justify-center items-center">
      <div class="flex justify-center">
        <img :src="LogoImg" alt="" />
      </div>
      <div class="text-[32px] px-3.5 text-white">
        {{ title }}
      </div>
    </div>
    <div
      class="menu_list ml-[200px] h-full"
      :style="{
        display: userToken ? 'flex' : 'none'
      }"
    >
      <div
        v-for="item of menuList"
        :key="item.path"
        :class="[
          'pr-[65px] flex items-center cursor-pointer text-[#498FE4] text-[24px]'
        ]"
        :style="{
          'font-weight': 'normal',
          'line-height': '24px',
          'text-align': 'right',
          'letter-spacing': '0',
          color: `${route.path === item.path ? '#498FE4' : '#498FE4'}`,
          backgroundImage: `${route.path === item.path ? 'url(' + item.bg_img + ')' : 'none'}`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: '100% 100%',
          backgroundPosition: 'right 0px top 0',
          height: '100%',
          transition: 'all 0.1s ease-in-out'
        }"
        @click="handleMenuClick(item.path)"
      >
        <el-image
          :style="{
            opacity: route.path === item.path ? 1 : 1,
            marginLeft: '40px',
            height: '40%'
          }"
          :src="item.icon"
          fit="cover"
          alt=""
        />
        <div class="pl-[10px]">{{ item.name }}</div>
      </div>
    </div>
    <div class="mr-[20px] absolute right-0 flex items-center">
      <div
        class="text-[#1c8aea] text-[25px] mr-[40px] mt-1 hover:text-[#1c8aea] cursor-pointer"
      >
        <el-tooltip
          placement="bottom"
          effect="light"
          popper-class="custom-tooltip"
          :popper-style="{
            // 'background-color': 'rgba(85, 129, 182, 0.8)',
            // color: '#fff',
            // border: '1px solid rgb(73,143,228)'
          }"
        >
          <template #content>
            如有疑问，请联系管理员邮箱： <br />
            guanliyuan@123.com
          </template>
          <el-icon><QuestionFilled /></el-icon>
        </el-tooltip>
      </div>
      <div
        v-if="!username"
        class="text-[#1c8aea] text-[14px] cursor-pointer hover:text-[rgb(73,143,228)]"
        @click="$router.push('/login')"
      >
        请先登录
      </div>
      <el-dropdown v-else :hide-on-click="false" trigger="click">
        <span class="el-dropdown-link text-[#1c8aea] mb-1">
          <el-icon size="20"><Avatar /></el-icon>
          <el-icon size="20">
            <arrow-down />
          </el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="upPasswdFormVisible = true"
              >修改密码</el-dropdown-item
            >
            <el-dropdown-item @click="$router.push('/user')"
              >个人中心</el-dropdown-item
            >
            <el-dropdown-item @click="logout">
              <div class="flex justify-center w-full">注销</div>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
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

<script setup>
import { ref, watch, onMounted, Transition } from "vue";
import { useNav } from "@/layout/hooks/useNav";
import { useRoute, useRouter } from "vue-router";
import { Avatar, ArrowDown, QuestionFilled } from "@element-plus/icons-vue";
import { message } from "@/utils/message";
import map from "@/libs/tdtmap";

import LogoImg from "@/assets/logo/Group_1321315239@2x.png";
import dataSoureImg from "@/assets/common/shuju_1@2x.png";
import indexImg from "@/assets/common/yaogan_1@2x.png";
import sateOrbitImg from "@/assets/common/EMI-_1@2x.png";
import headerBgImg from "@/assets/common/Group_1321316003@2x.png";
import viewImg from "@/assets/common/Group_1321316195@2x.png";

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
    icon: dataSoureImg,
    bg_img: viewImg
  },
  {
    name: "卫星应用",
    path: "/satellite-applications",
    icon: indexImg,
    bg_img: viewImg
  },
  {
    name: "卫星轨道",
    path: "/satelliteOrbit",
    icon: sateOrbitImg,
    bg_img: viewImg
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
.logo {
  padding-left: 15px;
}

.menu_list {
  display: flex;
  justify-content: space-between;
  align-items: center;
  // height: 4vw;
}

.titel_bg {
  background-image: url("../../assets/bg_21x.png");
}

.el-dropdown {
  border: none !important;
}

:deep(.el-form-item__label) {
  color: #545353;
  text-wrap: nowrap;
}

// :deep(.el-input__wrapper) {
//   background-color: rgba(85, 129, 182, 0.5);
//   box-shadow: inset 0 0 1px rgba(242, 242, 242, 0.8);
//   input {
//     color: #fff;
//   }
// }
</style>
