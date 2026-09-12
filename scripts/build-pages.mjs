import { spawn } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const staging = join(root, ".pages-staging");
const output = join(root, "out");
const basePath = "/Ocean-Atlas";

async function copy(source, destination = source) {
  await cp(join(root, source), join(staging, destination), { recursive: true });
}

async function runNextBuild() {
  const next = join(root, "node_modules", "next", "dist", "bin", "next");
  await new Promise((resolveBuild, rejectBuild) => {
    const child = spawn(process.execPath, [next, "build", staging], {
      cwd: root,
      env: {
        ...process.env,
        NODE_ENV: "production",
        AI_ENABLED: "false",
        OPENAI_API_KEY: "",
      },
      stdio: "inherit",
    });
    child.once("error", rejectBuild);
    child.once("exit", (code, signal) => {
      if (code === 0) resolveBuild();
      else rejectBuild(new Error(`Static Next.js build failed (${signal ?? code})`));
    });
  });
}

async function verifyExport() {
  const html = await readFile(join(output, "index.html"), "utf8");
  if (!html.includes("HOSTED DEMO · AI UNAVAILABLE"))
    throw new Error("Hosted-demo AI notice is missing from the static HTML");
  if (html.includes("OPENAI_API_KEY"))
    throw new Error("Server configuration marker leaked into the static HTML");

  const assetPaths = [
    ...html.matchAll(/(?:src|href)="(\/Ocean-Atlas\/[^"?#]+)"/g),
  ].map((match) => match[1]);
  const javascript = assetPaths.filter((path) => path.endsWith(".js"));
  if (javascript.length === 0)
    throw new Error("No base-path-prefixed JavaScript assets were emitted");

  for (const assetPath of new Set(assetPaths)) {
    const localPath = join(output, assetPath.slice(basePath.length + 1));
    await access(localPath).catch(() => {
      throw new Error(
        `Export references missing asset ${assetPath} (${relative(root, localPath)})`,
      );
    });
  }
  for (const excluded of ["api", "dev"])
    await access(join(output, excluded)).then(
      () => {
        throw new Error(`Static export unexpectedly contains /${excluded}`);
      },
      () => {},
    );
}

await rm(staging, { recursive: true, force: true });
await rm(output, { recursive: true, force: true });
await mkdir(join(staging, "app"), { recursive: true });

try {
  await Promise.all([
    copy("app/globals.css"),
    copy("app/icon.svg"),
    copy("app/layout.tsx"),
    copy("components"),
    copy("lib"),
    copy("package.json"),
    copy("tsconfig.json"),
    copy("next.pages.config.mjs", "next.config.mjs"),
  ]);
  await writeFile(
    join(staging, "app", "page.tsx"),
    `import Explorer from "../components/Explorer";\n\nexport const dynamic = "force-static";\n\nexport default function Page() {\n  return <Explorer aiEnabled={false} staticDemo />;\n}\n`,
  );
  await runNextBuild();
  await cp(join(staging, "out"), output, { recursive: true });
  await writeFile(join(output, ".nojekyll"), "");
  await verifyExport();
  console.log(`Static GitHub Pages export verified for ${basePath}/`);
} finally {
  await rm(staging, { recursive: true, force: true });
}
