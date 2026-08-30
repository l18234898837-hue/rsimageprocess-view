const { VITE_API_PATH } = import.meta.env;

function apiUrl(path: string) {
  const base = String(VITE_API_PATH || "").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Starts a native browser download so it appears in the download manager. */
export function startBrowserDownload(path: string) {
  const link = document.createElement("a");
  link.href = apiUrl(path);
  link.download = "";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
