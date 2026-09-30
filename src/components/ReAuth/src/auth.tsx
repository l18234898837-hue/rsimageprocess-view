import { defineComponent, Fragment } from "vue";
import { hasRequiredPermissions } from "@/router/utils";
import { useUserStoreHook } from "@/store/modules/user";

export default defineComponent({
  name: "Auth",
  props: {
    value: {
      type: undefined,
      default: []
    }
  },
  setup(props, { slots }) {
    return () => {
      if (!slots) return null;
      return hasRequiredPermissions(
        useUserStoreHook().permissions ?? [],
        props.value as string | string[] | undefined
      ) ? (
        <Fragment>{slots.default?.()}</Fragment>
      ) : null;
    };
  }
});
