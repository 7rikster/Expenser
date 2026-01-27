import esbuild from "esbuild";

/* Traspiled JS code from TS */
const buildDir = "build";
const buildEntry = "index.js";

/* ESBuild outDir */
const distDir = "dist";
const distOutfile = "server.cjs";

esbuild
  .build({
    entryPoints: [`./${buildDir}/${buildEntry}`],
    bundle: true,
    platform: "node",
    target: "node20",
    outfile: `./${distDir}/${distOutfile}`,
    minify: true,
  })
  .catch(() => process.exit(1));