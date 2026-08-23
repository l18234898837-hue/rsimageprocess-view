import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultTileRoot = resolve(scriptDir, "..", "..", "otherfile", "map-data", "GaoDe");
const tileRoot = resolve(process.env.MAP_DATA_DIR || defaultTileRoot);
const port = Number(process.env.MAP_DATA_PORT || 9000);
const mimeTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

if (!existsSync(tileRoot)) {
  throw new Error(`Map tile directory does not exist: ${tileRoot}`);
}

createServer((request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const filePath = normalize(resolve(tileRoot, `.${requestPath}`));

  if (!filePath.startsWith(`${tileRoot}${sep}`)) {
    response.writeHead(403).end();
    return;
  }

  if (!existsSync(filePath)) {
    response.writeHead(404).end();
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "public, max-age=86400"
  });
  createReadStream(filePath).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Map tile server: http://127.0.0.1:${port}`);
  console.log(`Tile directory: ${tileRoot}`);
});
