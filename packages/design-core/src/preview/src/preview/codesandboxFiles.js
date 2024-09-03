export const codesandboxFiles = {
  '.codesandbox/tasks.json': {
    content: String.raw`{
// These tasks will run in order when initializing your CodeSandbox project.
"setupTasks": [
{
  "name": "pnpm install",
  "command": "pnpm install"
}
],

// These tasks can be run from CodeSandbox. Running one will open a log in the app.
"tasks": {
"install-dependencies": {
  "name": "Install Dependencies",
  "command": "pnpm install"
},
"start-app": {
  "name": "Run Dev Server",
  "command": "pnpm run dev",
  "runAtStart": true
}
}
}
`
  },
  'public/robots.txt': {
    content: String.raw`User-agent: *
Allow: /`
  },

  'src/main.js': {
    content: String.raw`import { createApp } from "vue";
import App from "./App.vue";

const app = window.__app__ = createApp(App);
app.mount('#app');
`
  },
  '.editorconfig': {
    content: String.raw`# editorconfig.org
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
`
  },
  '.env.sample': {
    content: String.raw`# To prevent accidentally leaking env variables to the client, only
# variables prefixed with VITE_ are exposed to your Vite-processed code

VITE_BASE_PUBLIC_PATH=
`
  },
  '.eslintrc.js': {
    content: String.raw`module.exports = {
env: {
browser: true,
es2021: true,
node: true,
},
extends: [
'airbnb-base',
'plugin:vue/vue3-recommended',
'plugin:tailwindcss/recommended',
],
parserOptions: {
ecmaVersion: 2021,
},
plugins: ['vue', 'tailwindcss'],
rules: {
'import/extensions': 'off',
'import/no-extraneous-dependencies': [0, { 'packageDir ': './src/' }],
'max-len': ['error', {
  code: 160,
  ignorePattern: 'class="([\\s\\S]*?)"|d="([\\s\\S]*?)"', // ignore classes or svg draw attributes
  ignoreUrls: true,
}],
'vue/multi-word-component-names': 'off',
},
settings: {
'import/resolver': {
  node: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue', 'svg'],
    moduleDirectory: ['node_modules', 'src/'],
  },
  alias: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue', 'svg'],
    map: [['@', './src']],
  },
},
},
};
`
  },
  '.gitignore': {
    content: String.raw`# Logs
/logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
report.*.json
debug.log

# Dependency directories
node_modules/
jspm_packages/

# macOS
.DS_Store

# Vim swap files
*.swp

# Build
dist
dist-ssr

# IDE / Editor
.idea

# dotenv
.env*
*.local
!.env.sample
`
  },
  'index.html': {
    content: String.raw`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vue.js starter template</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`
  },
  'jsconfig.json': {
    content: String.raw`{
"compilerOptions": {
"baseUrl": ".",
"paths": {
  "@/*": ["src/*"]
}
},
"exclude": ["node_modules", "dist"]
}
`
  },
  'postcss.config.js': {
    content: String.raw`module.exports = {
plugins: {
autoprefixer: {},
tailwindcss: {},
},
};
`
  },
  'stylelint.config.js': {
    content: String.raw`module.exports = {
extends: [
'stylelint-config-standard',
'stylelint-config-rational-order',
'stylelint-config-recommended-vue',
],
rules: {
'at-rule-no-unknown': [
  true,
  {
    ignoreAtRules: ['tailwind', 'apply', 'variants', 'responsive', 'screen', 'layer'],
  },
],
'declaration-block-trailing-semicolon': null,
'no-descending-specificity': null,
},
};
`
  },
  'tailwind.config.js': {
    content: String.raw`const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
content: [
'./index.html',
'./src/**/*.{vue,js,ts,jsx,tsx}',
],
darkMode: 'class',
theme: {
extend: {
  fontFamily: {
    sans: ['Inter', ...defaultTheme.fontFamily.sans],
  },
},
},
};
`
  },
  'vite.config.js': {
    content: String.raw`import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import svgLoader from 'vite-svg-loader';
import { resolve } from 'path';

export default ({ mode }) => {
process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

return defineConfig({
base: process.env.VITE_BASE_PUBLIC_PATH,
plugins: [
  svgLoader(),
  vue(),
],
resolve: {
  alias: {
    '@': resolve(__dirname, 'src'),
  },
},
});
};
`
  }
}
