import js from "@eslint/js";
import tseslint from "typescript-eslint";

const runtimeGlobals = {
  console: "readonly",
  document: "readonly",
  fetch: "readonly",
  process: "readonly",
  window: "readonly",
};

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "**/dist/**",
      "release/**",
      "**/release/**",
      "coverage/**",
      "**/coverage/**",
      "target/**",
      "**/target/**",
      ".turbo/**",
      "**/.turbo/**",
      ".local/**",
      "**/.local/**",
      "*.zip",
    ],
  },
  {
    languageOptions: {
      globals: runtimeGlobals,
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
];
