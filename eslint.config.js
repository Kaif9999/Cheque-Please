import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist', 'shots'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  { files: ['src/**/*.ts'], languageOptions: { globals: globals.browser } },
  { files: ['tests/**/*.ts', '*.config.{js,ts}'], languageOptions: { globals: globals.node } },
  // The browser tools also pass callbacks to page.evaluate, which run in the page.
  { files: ['tools/**/*.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  // Formatting is Prettier's job.
  prettier,
);
