const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const json = require("@rollup/plugin-json");
const replace = require("@rollup/plugin-replace");
const copy = require("rollup-plugin-copy");

const isWatch = Boolean(process.env.ROLLUP_WATCH);
const isProduction = process.env.NODE_ENV === "production";

const sharedPlugins = [
  nodeResolve({ browser: true }),
  commonjs(),
  json(),
  replace({
    preventAssignment: true,
    "process.env.NODE_ENV": JSON.stringify(
      isProduction ? "production" : "development"
    ),
  }),
];

const copyStaticAssets = copy({
  targets: [
    { src: "manifest.json", dest: "dist" },
    { src: "icon.png", dest: "dist" },
    {
      src: "sidepanel/**/*",
      dest: "dist/sidepanel",
      filter: (filepath) => !filepath.endsWith("index.css"),
    },
  ],
  copyOnce: !isWatch,
});

function tailwindCssPlugin() {
  const tailwindBin = process.platform === "win32"
    ? path.resolve(__dirname, "node_modules/.bin/tailwindcss.cmd")
    : path.resolve(__dirname, "node_modules/.bin/tailwindcss");

  const inputPath = path.resolve(__dirname, "sidepanel/index.css");
  const outputDir = path.resolve(__dirname, "dist/sidepanel");
  const outputPath = path.join(outputDir, "index.css");

  return {
    name: "tailwindcss-cli",
    buildStart() {
      this.addWatchFile(inputPath);

      fs.mkdirSync(outputDir, { recursive: true });

      const args = ["-i", inputPath, "-o", outputPath];
      if (isProduction) {
        args.push("--minify");
      }

      try {
        execFileSync(tailwindBin, args, { stdio: "inherit" });
      } catch (error) {
        this.error(
          error instanceof Error
            ? error
            : new Error(`Failed to build Tailwind CSS: ${String(error)}`)
        );
      }
    },
  };
}

module.exports = [
  {
    input: "background.js",
    output: {
      file: "dist/background.js",
      format: "iife",
      sourcemap: !isProduction,
    },
    plugins: [...sharedPlugins, copyStaticAssets],
    treeshake: isProduction,
  },
  {
    input: "sidepanel/index.js",
    output: {
      file: "dist/sidepanel/index.js",
      format: "iife",
      sourcemap: !isProduction,
    },
    plugins: [tailwindCssPlugin(), ...sharedPlugins],
    treeshake: isProduction,
  },
  {
    input: "sidepanel/terms-table.js",
    output: {
      file: "dist/sidepanel/terms-table.js",
      format: "iife",
      sourcemap: !isProduction,
    },
    plugins: [tailwindCssPlugin(), ...sharedPlugins],
    treeshake: isProduction,
  },
  {
    input: "sidepanel/title-render.js",
    output: {
      file: "dist/sidepanel/title-render.js",
      format: "iife",
      name: "titlePanel",
      sourcemap: !isProduction,
    },
    plugins: [tailwindCssPlugin(), ...sharedPlugins],
    treeshake: isProduction,
  },  
  {
    input: "scripts/extract-content.js",
    output: {
      file: "dist/scripts/extract-content.js",
      format: "iife",
      sourcemap: !isProduction,
    },
    plugins: sharedPlugins,
    treeshake: isProduction,
  },
];
