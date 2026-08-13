import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname);
const html = readFileSync(resolve(root, "index.html"), "utf8");
const css = readFileSync(resolve(root, "styles.css"), "utf8");
const game = readFileSync(resolve(root, "game.js"), "utf8");
const tutorialImage = readFileSync(resolve(root, "assets/tutorial-tilt.jpg"));
const resourceSheet = readFileSync(resolve(root, "assets/ice-breaking-resource-sheet.png"));
const output = resolve(root, "dist/server");

rmSync(resolve(root, "dist"), { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const worker = `
const files = {
  "/": { body: ${JSON.stringify(html)}, type: "text/html; charset=utf-8" },
  "/index.html": { body: ${JSON.stringify(html)}, type: "text/html; charset=utf-8" },
  "/styles.css": { body: ${JSON.stringify(css)}, type: "text/css; charset=utf-8" },
  "/game.js": { body: ${JSON.stringify(game)}, type: "text/javascript; charset=utf-8" }
};

const binaryFiles = {
  "/assets/tutorial-tilt.jpg": { body: ${JSON.stringify(tutorialImage.toString("base64"))}, type: "image/jpeg" },
  "/assets/ice-breaking-resource-sheet.png": { body: ${JSON.stringify(resourceSheet.toString("base64"))}, type: "image/png" }
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/favicon.ico") return new Response(null, { status: 204 });
    const binary = binaryFiles[url.pathname];
    const file = binary || files[url.pathname] || files["/"];
    const body = binary ? Uint8Array.from(atob(binary.body), character => character.charCodeAt(0)) : file.body;
    return new Response(request.method === "HEAD" ? null : body, {
      status: 200,
      headers: {
        "content-type": file.type,
        "cache-control": url.pathname === "/" || url.pathname === "/index.html" ? "no-cache" : "public, max-age=3600",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer"
      }
    });
  }
};
`;

writeFileSync(resolve(output, "index.js"), worker);
console.log("ICE BREAKING deployment build ready");
