#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import kebabCase from "lodash.kebabcase";

const BLOG_PATH = "src/content/posts";
const TEMPLATE_PATH = path.join(BLOG_PATH, "hello-world.md");

function nowKST() {
  // Asia/Seoul is fixed UTC+9, no DST.
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const pad = n => String(n).padStart(2, "0");
  const y = kst.getUTCFullYear();
  const mo = pad(kst.getUTCMonth() + 1);
  const d = pad(kst.getUTCDate());
  const h = pad(kst.getUTCHours());
  const mi = pad(kst.getUTCMinutes());
  const s = pad(kst.getUTCSeconds());
  return `${y}-${mo}-${d}T${h}:${mi}:${s}+09:00`;
}

const title = process.argv.slice(2).join(" ").trim();

if (!title) {
  console.error("Usage: pnpm new-post <title>");
  process.exit(1);
}

const slug = kebabCase(title);
const filePath = path.join(BLOG_PATH, `${slug}.md`);

if (fs.existsSync(filePath)) {
  console.error(`File already exists: ${filePath}`);
  process.exit(1);
}

if (!fs.existsSync(TEMPLATE_PATH)) {
  console.error(`Template not found: ${TEMPLATE_PATH}`);
  process.exit(1);
}

let content = fs.readFileSync(TEMPLATE_PATH, "utf8");
content = content.replace(/^title:.*$/m, `title: ${title}`);
content = content.replace(/^pubDatetime:.*$/m, `pubDatetime: ${nowKST()}`);

fs.mkdirSync(BLOG_PATH, { recursive: true });
fs.writeFileSync(filePath, content);

console.log(`Created ${filePath}`);
