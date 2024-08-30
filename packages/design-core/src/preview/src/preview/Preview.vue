<template>
  <div :class="['vue-repl-container', debugSwitch ? 'preview-debug-mode' : '']">
    <Repl
      :editor="editorComponent"
      :store="store"
      :sfcOptions="sfcOptions"
      :showCompileOutput="false"
      :showTsConfig="false"
      :showImportMap="true"
      :clearConsole="false"
      :autoResize="false"
    />
  </div>
</template>

<script>
import { defineComponent, computed, defineAsyncComponent } from 'vue'
import { Repl } from '@vue/repl'
import { injectDebugSwitch } from './debugSwitch'
import { injectPreview } from './usePreview'
import '@vue/repl/style.css'

const Monaco = defineAsyncComponent(() => import('@vue/repl/monaco-editor')) // 异步组件实现懒加载，打开debug后再加载

const EmptyEditor = defineComponent({
  setup() {
    return () => null
  }
})

export default {
  components: {
    Repl
  },
  setup() {
    const debugSwitch = injectDebugSwitch()
    const editorComponent = computed(() => (debugSwitch?.value ? Monaco : EmptyEditor))

    const sfcOptions = {
      script: {
        // scirpt setup 编译后注入 import { * } from "vue"
        inlineTemplate: false
      }
    }

    const [sandbox, store] = injectPreview()

    return {
      sandbox,
      store,
      sfcOptions,
      editorComponent,
      debugSwitch
    }
  }
}
</script>

<style lang="less">
.vue-repl {
  height: 100%;

  .split-pane {
    .left {
      display: none;
    }

    .right {
      width: 100% !important;

      .output-container {
        height: 100%;

        .msg.warn {
          display: none;
        }
      }

      .tab-buttons {
        display: none;
      }
    }
  }
}

.vue-repl-container {
  height: calc(100vh - 48px);

  &.preview-debug-mode .vue-repl .split-pane {
    .left,
    .right .tab-buttons {
      display: block;
    }

    .right .output-container {
      height: calc(100% - 38px);
    }
  }
}

.vue-codesandbox {
  width: 100%;
  height: 900px;
  outline: 1px solid #252525;
  border: 0;
  border-radius: 8px;
  margin-bottom: 16px;
  z-index: 100;
}
</style>
