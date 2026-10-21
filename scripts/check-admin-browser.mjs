import { build } from "esbuild";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const artifacts = path.join(root, ".browser-artifacts");
await mkdir(artifacts, { recursive: true });
const directory = await mkdtemp(path.join(artifacts, "admin-"));
// Isolated component fixture. All API traffic is intercepted with synthetic data
// in Playwright. No app route, authentication bypass or production data is added.
await build({
  stdin: {
    contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {InspectorConsole} from './src/components/ccs-admin/InspectorConsole.jsx';import './src/components/ccs-admin/inspector.css';createRoot(document.getElementById('root')).render(<div className="ccs-admin-shell"><InspectorConsole viewer={{id:'admin-a',name:'Admin',role:'admin',email:'admin@example.com'}} /></div>);`,
    resolveDir: root,
    sourcefile: "inspector-check.jsx",
    loader: "jsx",
  },
  outdir: directory,
  entryNames: "inspector-check",
  bundle: true,
  splitting: true,
  format: "esm",
  platform: "browser",
  jsx: "automatic",
  loader: { ".js": "jsx" },
  define: { "process.env.NODE_ENV": '"development"' },
});
await writeFile(
  path.join(directory, "inspector-check.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin component verification</title><link rel="stylesheet" href="/inspector-check.css"><style>body{margin:0}button,input,textarea,select{font:inherit}p{line-height:1.6}a{color:inherit}</style></head><body><div id="root"></div><script>globalThis.process={env:{NODE_ENV:'development'},nextTick:cb=>queueMicrotask(cb)};</script><script type="module" src="/inspector-check.js"></script></body></html>`,
);
let failed = false;
for (const test of ["admin-navigation.cjs", "admin-workflows.cjs"]) {
  const result = spawnSync(
    process.execPath,
    [path.join(root, "tests/browser", test)],
    {
      cwd: root,
      env: { ...process.env, CCS_BROWSER_FIXTURE_DIR: directory },
      stdio: "inherit",
    },
  );
  if (result.status !== 0) failed = true;
}
console.log(`Browser artifacts: ${directory}`);
if (failed) process.exitCode = 1;
