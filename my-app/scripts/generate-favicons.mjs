/**
 * Regenerate public/keyrambitvn-favicon.png from public/brand/keyrambitvn-icon.png.
 * Run: npm run icons:generate
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "public", "brand", "keyrambitvn-icon.png");
const out = path.join(root, "public", "keyrambitvn-favicon.png");
const siteBg = { r: 6, g: 7, b: 15, alpha: 1 };

async function main() {
  if (!fs.existsSync(src)) {
    console.error("Missing:", src);
    process.exit(1);
  }

  await sharp(src)
    .ensureAlpha()
    .resize(48, 48, { fit: "contain", background: siteBg })
    .png({ compressionLevel: 9 })
    .toFile(out);

  console.log("Wrote", path.relative(root, out));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
