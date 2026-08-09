import { ref, toRefs } from "vue";
import { getDicts } from "@/api/system/dict/data";
import { useDictStoreHook } from "@/store/modules/dict";

/**
 * 获取字典数据
 */
export const useDict = (...args) => {
  const res = ref({});
  return (() => {
    args.forEach(dictType => {
      res.value[dictType] = [];
      const dicts = useDictStoreHook().getDict(dictType);
      if (dicts) {
        res.value[dictType] = dicts;
      } else {
        getDicts(dictType).then(resp => {
          res.value[dictType] = resp.data.map(p => ({
            label: p.dictLabel,
            value: p.dictValue,
            elTagType: p.listClass,
            elTagClass: p.cssClass
          }));
          useDictStoreHook().setDict(dictType, res.value[dictType]);
        });
      }
    });
    return toRefs(res.value) as any;
  })();
};
