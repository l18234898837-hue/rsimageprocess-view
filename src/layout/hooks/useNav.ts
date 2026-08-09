import { getConfig } from "@/config";
import { useRouter, useRoute } from "vue-router";
import { computed } from "vue";
import { useUserStoreHook } from "@/store/modules/user";
import { useGlobal, isAllEmpty } from "@pureadmin/utils";

export function useNav() {
  const route = useRoute();
  const routers = useRouter().options.routes;

  /** 昵称（如果昵称为空则显示用户名） */
  const username = computed(() => {
    return isAllEmpty(useUserStoreHook()?.nickname)
      ? useUserStoreHook()?.username
      : useUserStoreHook()?.nickname;
  });

  const { $config } = useGlobal<GlobalPropertiesApi>();

  const title = computed(() => {
    return $config.Title;
  });

  /** 动态title */
  function changeTitle(meta) {
    const Title = getConfig().Title;
    if (Title) document.title = `${meta.title} | ${Title}`;
    else document.title = meta.title;
  }

  /** 退出登录 */
  function logout() {
    useUserStoreHook().logOut();
  }

  const userToken = computed(() => {
    return useUserStoreHook().token;
  });

  return {
    route,
    title,
    logout,
    routers,
    changeTitle,
    username,
    userToken
  };
}
