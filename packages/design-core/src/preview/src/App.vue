<template>
  <div v-if="redirect" class="loading">
    <div class="loadingco">
      <h2>Loading</h2>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>
  <template v-else>
    <Toolbar v-if="showToolbar" />
    <Preview />
  </template>
</template>

<script>
import { useDebugSwitch } from './preview/debugSwitch'
import usePreview from './preview/usePreview'
import Preview from './preview/Preview.vue'
import { codesandboxFiles } from './preview/codesandboxFiles'
import Toolbar from './Toolbar.vue'
import { constants } from '@opentiny/tiny-engine-utils'
import '@opentiny/tiny-engine-theme'
import { getParameters } from 'codesandbox/lib/api/define'

const { PREVIEW_SANDBOX } = constants

export default {
  components: {
    Preview,
    Toolbar
  },
  props: {
    showToolbar: {
      type: Boolean,
      default: true
    }
  },
  setup() {
    useDebugSwitch()
    const [sandbox] = usePreview((sandbox, prejectName, srcFiles) => {
      if (sandbox === PREVIEW_SANDBOX.CodeSandbox) {
        const files = Object.assign({}, codesandboxFiles)
        Object.keys(srcFiles).forEach((key) => {
          if (key === 'tsconfig.json') {
            return
          }
          if (key === 'import-map.json') {
            const deps = { 'core-js': '^3.8.3' }
            const dependencies = JSON.parse(srcFiles[key]).imports
            Object.keys(dependencies).forEach((key) => {
              if (key === 'vue/server-renderer') {
                return
              }
              const name = key
                .split('/')
                .filter((s) => s)
                .join('/')
              const version = dependencies[key].match(new RegExp(String.raw`https://unpkg.com/.+@([~^]?[0-9]+.*?)/`))[1]
              dependencies[key] = version.split('.')
              if (dependencies[key].length < 3) {
                for (let index = 0; index < 3; index++) {
                  dependencies[key][index] = dependencies[key][index] ?? '0'
                }
                deps[name] = (dependencies[key][0].match(/[~^]/) ? '' : '~') + dependencies[key].join('.')
              } else {
                deps[name] = dependencies[key].join('.')
              }
            })
            files['package.json'] = {
              content: {
                name: prejectName,
                version: '0.0.0',
                private: true,
                scripts: {
                  build: 'vite build',
                  dev: 'vite --host',
                  lint: 'pnpm run lint:js && pnpm run lint:style',
                  'lint:fix': 'pnpm run lint:js -- --fix && pnpm run lint:style -- --fix',
                  'lint:js': 'eslint --ext .js,.vue --ignore-path .gitignore src',
                  'lint:style': 'stylelint **/*.{vue,css} --ignore-path .gitignore',
                  serve: 'vite preview'
                },
                dependencies: deps,
                devDependencies: {
                  '@vitejs/plugin-vue': '^2.3.2',
                  autoprefixer: '^10.4.7',
                  eslint: '^8.15.0',
                  'eslint-config-airbnb-base': '^15.0.0',
                  'eslint-import-resolver-alias': '^1.1.2',
                  'eslint-plugin-import': '^2.26.0',
                  'eslint-plugin-tailwindcss': '^3.5.0',
                  'eslint-plugin-vue': '^8.7.1',
                  postcss: '^8.4.13',
                  'postcss-html': '^1.4.1',
                  stylelint: '^14.8.2',
                  'stylelint-config-rational-order': '^0.1.2',
                  'stylelint-config-recommended-vue': '^1.4.0',
                  'stylelint-config-standard': '^25.0.0',
                  tailwindcss: '^3.0.24',
                  vite: '^2.9.8',
                  'vite-plugin-eslint': '^1.6.0',
                  'vite-plugin-stylelint': '^2.2.1',
                  'vite-svg-loader': '^3.3.0'
                }
              }
            }
          } else {
            files['src/' + key] = {
              content: srcFiles[key]
            }
          }
        })

        const parameters = getParameters({ files, template: 'vue-cli' })
        const form = document.createElement('form')
        form.method = 'POST'
        form.action = 'https://codesandbox.io/api/v1/sandboxes/define'
        const parametersInput = document.createElement('input')
        parametersInput.name = 'parameters'
        parametersInput.value = parameters
        const queryInput = document.createElement('input')
        queryInput.name = 'query'
        queryInput.value = 'module=/src/App.vue'
        const environmentInput = document.createElement('input')
        environmentInput.name = 'environment'
        environmentInput.value = 'server'
        form.appendChild(parametersInput)
        form.appendChild(queryInput)
        form.appendChild(environmentInput)
        document.body.append(form)
        form.submit()
        document.body.removeChild(form)
      }
    })

    return {
      redirect: sandbox !== PREVIEW_SANDBOX.Web
    }
  }
}
</script>

<style lang="less" scoped>
/* 一般类型的预览，顶部有工具条 */
#app > .vue-repl {
  --base-top-panel-border-bottom-width: 1px;
  height: calc(100vh - var(--base-top-panel-height) - var(--base-top-panel-border-bottom-width));
}
/* console 类型的预览，内容区域样式 */
#J_container > .vue-repl {
  height: 100%;
  width: 100%;
  position: static;
}
</style>
