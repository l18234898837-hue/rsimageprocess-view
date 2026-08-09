export default {
  path: "/",
  name: "Home",
  component: () => import("@/views/index.vue"),
  redirect: "/data-source",
  meta: {
    title: "首页",
    showLink: false,
    rank: 0
  },
  children: [
    {
      path: "/satellite-applications",
      name: "SatelliteApplications",
      component: () => import("@/components/indexMain.vue"),
      meta: {
        title: "首页",
        showLink: false
      }
    },
    {
      path: "user",
      name: "user",
      component: () => import("@/views/user/index.vue"),
      meta: {
        title: "个人中心",
        showLink: false
      }
    },
    {
      path: "/login",
      name: "Login",
      component: () => import("@/views/login/index.vue"),
      meta: {
        title: "登录",
        showLink: false
      }
    },
    {
      path: "/register",
      name: "Register",
      component: () => import("@/views/user/register.vue"),
      meta: {
        title: "账号注册",
        showLink: false
      }
    },
    {
      path: "/forget",
      name: "Forget",
      component: () => import("@/views/user/forget.vue"),
      meta: {
        title: "忘记密码",
        showLink: false
      }
    },
    {
      path: "/data-source",
      name: "DataSource",
      component: () => import("@/views/dataSource/index.vue"),
      meta: {
        title: "数据集",
        showLink: false
      }
    },
    {
      path: "/satelliteOrbit",
      name: "SatelliteOrbit",
      component: () => import("@/views/satelliteOrbit/index.vue"),
      meta: {
        title: "卫星轨道",
        showLink: false
      }
    }
  ]
} as RouteConfigsTable;
