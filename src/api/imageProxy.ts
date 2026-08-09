import { http } from "@/utils/http";
import type { Result } from "@/api/api";

export const imageProxy = (url: string) => {
  return http
    .request<Result>("get", `/proxy/image?url=${url}`, {
      responseType: "arraybuffer"
    })
    .then(async res => {
      return await new Promise(resolve => {
        let blob = new Blob([res.data], { type: "image/png" });
        let fileReader = new FileReader();
        fileReader.readAsDataURL(blob);
        fileReader.onloadend = e => {
          resolve(e.target.result);
        };
      });
    });
};
