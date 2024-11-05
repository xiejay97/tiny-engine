<template>
  <tiny-popover
    trigger="hover"
    :open-delay="1000"
    popper-class="toolbar-right-popover"
    append-to-body
    content="CodeSandbox"
  >
    <template #reference>
      <span class="icon" @click="preview">
        <svg-icon :name="icon"></svg-icon>
      </span>
    </template>
  </tiny-popover>
</template>

<script>
import { reactive } from 'vue'
import { Popover } from '@opentiny/vue'
import { previewBlock } from '@opentiny/tiny-engine-controller/js/preview'
import getPreGenerateInfo from '@opentiny/tiny-engine-controller/js/generate-files'
import { getGlobalConfig, useBlock, useCanvas, useLayout, useNotify } from '@opentiny/tiny-engine-controller'
import { constants } from '@opentiny/tiny-engine-utils'
import { generateApp } from '@opentiny/tiny-engine-dsl-vue'
import { getParameters } from 'codesandbox/lib/api/define'
import { codesandboxFiles } from './codesandboxFiles'

const { PREVIEW_SANDBOX } = constants

export default {
  components: {
    TinyPopover: Popover
  },
  props: {
    icon: {
      type: String,
      default: 'code-sandbox'
    }
  },
  setup() {
    const state = reactive({
      generating: false
    })

    const { isBlock, canvasApi } = useCanvas()
    const { getCurrentBlock } = useBlock()

    const preview = async () => {
      if (useLayout().isEmptyPage()) {
        useNotify({
          type: 'warning',
          message: '请先创建页面'
        })

        return
      }

      const params = {
        framework: getGlobalConfig()?.dslMode,
        platform: getGlobalConfig()?.platformId,
        pageInfo: {
          schema: canvasApi.value?.getSchema?.()
        }
      }

      if (isBlock()) {
        const block = getCurrentBlock()
        params.id = block?.id
        params.pageInfo.name = block?.label
        previewBlock(params, PREVIEW_SANDBOX.CodeSandbox)
      } else {
        if (state.generating) {
          useNotify({ type: 'info', title: '代码生成中, 请稍后...' })
          return
        } else {
          useNotify({ type: 'info', title: '代码生成中...' })
          state.generating = true
        }

        try {
          const instance = generateApp()
          const fileRes = await getPreGenerateInfo(instance, PREVIEW_SANDBOX.CodeSandbox)

          const files = {}
          fileRes.forEach((file) => {
            // 使用 pnpm 包管理
            if (file.filePath === 'README.md') {
              files[file.filePath] = { content: file.fileContent.replace(/npm /g, 'pnpm ') }
            } else {
              files[file.filePath] = { content: file.fileContent }
            }
          })
          Object.assign(files, codesandboxFiles)

          const parameters = getParameters({ files, template: 'vue-cli' })
          const form = document.createElement('form')
          form.method = 'POST'
          form.action = 'https://codesandbox.io/api/v1/sandboxes/define'
          form.target = '_blank'
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
          state.generating = false
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error)
          useNotify({ type: 'error', title: '代码生成失败', message: error?.message || error })
          state.generating = false
        }
      }
    }

    return {
      preview
    }
  }
}
</script>
