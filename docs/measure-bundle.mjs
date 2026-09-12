import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : join(dir, e.name),
      ),
    )
  ).flat();
}
const files = (await walk(".next/static")).filter(
  (p) => p.endsWith(".js") || p.endsWith(".css"),
);
const rows = await Promise.all(
  files.map(async (path) => {
    const bytes = await readFile(path);
    return {
      path: path.replaceAll("\\", "/"),
      bytes: bytes.length,
      gzipBytes: gzipSync(bytes).length,
    };
  }),
);
const report = {
  date: new Date().toISOString(),
  definition:
    "Sum of all production .next/static JS and CSS files, including chunks for other routes. Not initial-route transfer size. gzip computed locally with Node defaults.",
  files: rows.length,
  rawBytes: rows.reduce((n, r) => n + r.bytes, 0),
  gzipBytes: rows.reduce((n, r) => n + r.gzipBytes, 0),
  largest: rows.sort((a, b) => b.bytes - a.bytes).slice(0, 5),
};
await mkdir("docs", { recursive: true });
await writeFile(
  "docs/bundle-measurement.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
