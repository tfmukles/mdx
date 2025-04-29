import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "sitepins-mdx-2",
      fileName: (format) => {
        if (format === "es") return "index.mjs";
        if (format === "umd") return "index.browser.mjs";
        return "index.js";
      },
      formats: ["es", "cjs", "umd"],
    },
    rollupOptions: {
      external: [
        "acorn",
        "ccount",
        "estree-util-is-identifier-name",
        "lodash.flatten",
        "mdast-util-compact",
        "mdast-util-directive",
        "mdast-util-from-markdown",
        "mdast-util-gfm",
        "mdast-util-mdx-jsx",
        "mdast-util-to-markdown",
        "micromark-extension-gfm",
        "micromark-factory-mdx-expression",
        "micromark-factory-space",
        "micromark-factory-whitespace",
        "micromark-util-character",
        "micromark-util-symbol",
        "micromark-util-types",
        "parse-entities",
        "prettier",
        "remark",
        "remark-gfm",
        "remark-mdx",
        "stringify-entities",
        "unist-util-source",
        "unist-util-stringify-position",
        "unist-util-visit",
        "uvu",
        "vfile-message",
      ],
    },
    sourcemap: true,
    minify: false,
  },
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
  assetsInclude: ["**/*.md"],
  resolve: {
    alias: {
      "^.*\\.md\\?raw$": "$&",
    },
  },
});
