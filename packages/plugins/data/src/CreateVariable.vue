<template>
  <tiny-form
    ref="createData"
    label-position="top"
    class="create-form"
    :model="state.createData"
    :rules="rules"
    validate-type="text"
    :inline-message="true"
  >
    <tiny-form-item label="变量名" prop="name">
      <tiny-input
        v-model="state.createData.name"
        placeholder="只能包含数字字母及下划线"
        @change="$emit('nameInput', $event)"
      ></tiny-input>
    </tiny-form-item>
    <tiny-form-item label="初始值类型" class="var-type-item">
      <tiny-radio-group v-model="state.variableType" :options="VAR_TYPES"></tiny-radio-group>
    </tiny-form-item>
    <tiny-form-item>
      <monaco-editor
        ref="variableEditor"
        class="variable-editor"
        :value="editorCode"
        :showFormatBtn="true"
        :options="state.editorOptions"
        @editorDidMount="editorDidMount"
      >
        <template #toolbarStart>
          <div class="label-left-wrap">
            <div>初始值</div>
            <tiny-popover placement="bottom-start" effect="dark" trigger="hover" popper-class="state-data-example-tips">
              <div class="tips-content">
                <div class="create-content-head">
                  <div class="create-content-tip">数据写法和JS写法一致</div>
                </div>
                <div class="create-content-demo">
                  <ul>
                    <li>字符串: "string"</li>
                    <li>数字: 123</li>
                    <li>布尔值: true/false</li>
                    <li>对象: {"name": "xxx"}</li>
                    <li>数组: ["1", "2"]</li>
                    <li>空值: null</li>
                    <li>JS表达式: (需要先选择JS表达式类型)</li>
                    <li class="ml20">示例1： t('i18nkey1')</li>
                    <li class="ml20">示例2： function fnName() {}</li>
                    <li class="ml20">示例3： { getValue: () => {} }</li>
                  </ul>
                  <div class="create-content-foot">
                    <div class="create-content-tip">
                      注意：使用JS表达式定义state变量的时候无法调用state其他变量定义，<br />另由于JS函数定义在变量之后，也无法调用JS面板定义的函数
                    </div>
                  </div>
                </div>
              </div>
              <template #reference>
                <div class="create-content-description">查看示例</div>
              </template>
            </tiny-popover>
          </div>
        </template>
        <template #buttons>
          <editor-i18n-tool ref="i18nToolRef" @confirm="insertContent"></editor-i18n-tool>
        </template>
      </monaco-editor>
    </tiny-form-item>
    <tiny-form-item v-if="state.hasAccessor">
      <monaco-editor ref="getterEditor" class="variable-editor" :options="options" :value="state.getterEditorValue">
        <template #toolbarStart>
          <div class="label-left-wrap">
            <div>getter</div>
            <tiny-popover placement="bottom-start" trigger="hover" popper-class="state-data-example-tips">
              <div class="tips-content">
                <div class="create-content-demo">
                  <pre><code>{{ dslMode === 'React' ? getterReactExample : getterExample }}</code></pre>
                </div>
              </div>
              <template #reference>
                <div class="create-content-description">查看示例</div>
              </template>
            </tiny-popover>
          </div>
        </template>
      </monaco-editor>
    </tiny-form-item>
    <tiny-form-item v-if="state.hasAccessor && moduleDisplayStatus[dslMode].globalState">
      <monaco-editor ref="setterEditor" class="variable-editor" :options="options" :value="state.setterEditorValue">
        <template #toolbarStart>
          <div class="label-left-wrap">
            <div>setter</div>
            <tiny-popover placement="bottom-start" trigger="hover" popper-class="state-data-example-tips">
              <div class="tips-content">
                <div class="create-content-demo">
                  <pre><code>{{ setterExample }}</code></pre>
                </div>
              </div>
              <template #reference>
                <div class="create-content-description">查看示例</div>
              </template>
            </tiny-popover>
          </div>
        </template>
      </monaco-editor>
    </tiny-form-item>
    <div class="show-advanced" @click="state.hasAccessor = !state.hasAccessor">
      {{ (state.hasAccessor ? '移除' : '添加') + '高级属性' }}
    </div>
  </tiny-form>
</template>

<script>
import { reactive, ref, computed, watch, onBeforeUnmount } from 'vue'
import { Popover, Form, FormItem, Input, RadioGroup } from '@opentiny/vue'
import { MonacoEditor } from '@opentiny/tiny-engine-common'
import { getGlobalConfig } from '@opentiny/tiny-engine-controller'
import { verifyJsVarName } from '@opentiny/tiny-engine-controller/js/verification'
import { initCompletion } from '@opentiny/tiny-engine-controller/js/completion'
import * as Monaco from 'monaco-editor'
import { validateMonacoEditorData } from './js/common'
import EditorI18nTool from './EditorI18nTool.vue'

export default {
  components: {
    MonacoEditor,
    TinyForm: Form,
    TinyFormItem: FormItem,
    TinyInput: Input,
    TinyPopover: Popover,
    TinyRadioGroup: RadioGroup,
    EditorI18nTool
  },
  props: {
    createData: {
      type: Object
    },
    dataSource: {
      type: Object
    },
    flag: {
      type: String
    },
    updateKey: {
      type: String
    }
  },
  emits: ['nameInput'],
  setup(props) {
    const dslMode = getGlobalConfig()?.dslMode
    const moduleDisplayStatus = getGlobalConfig()?.moduleDisplayStatus
    const variableEditor = ref(null)
    const getterEditor = ref(null)
    const setterEditor = ref(null)

    const i18nToolRef = ref(null)

    const getEditor = () => variableEditor.value

    const isAccessorData = (data) => [data?.accessor?.getter?.type, data?.accessor?.setter?.type].includes('JSFunction')
    const getPropsCreateData = () => ({
      name: '',
      ...props.createData,
      variable: isAccessorData(props.createData.variable)
        ? props.createData.variable.defaultValue
        : props.createData.variable
    })

    const DEFAULT_GETTER = 'function getter() {}'
    const DEFAULT_SETTER = 'function setter() {}'

    const LANG_TYPES = {
      JSON: 'json',
      JS: 'javascript'
    }
    const VAR_TYPES = [
      { text: 'JSON类型', label: LANG_TYPES.JSON },
      { text: 'JS表达式类型', label: LANG_TYPES.JS }
    ]
    const getVarType = () => (props.createData.variable?.type === 'JSExpression' ? LANG_TYPES.JS : LANG_TYPES.JSON)

    const state = reactive({
      errorMessage: '',
      createData: getPropsCreateData(),
      hasAccessor: isAccessorData(props.createData?.variable),
      variableType: getVarType(),
      getterEditorValue: props.createData.variable?.accessor?.getter?.value || DEFAULT_GETTER,
      setterEditorValue: props.createData.variable?.accessor?.setter?.value || DEFAULT_SETTER,
      editorOptions: {
        language: getVarType(),
        lineNumbers: true,
        // 禁用滚动条边边一直显示的边框
        overviewRulerBorder: false,
        renderLineHighlightOnlyWhenFocus: true,
        quickSuggestions: false, // 快速提示禁用，避免调用其他模块提供的函数，因为变量是最先初始化
        suggest: {
          showFields: false,
          showFunctions: false
        }
      },
      completionProvider: null
    })

    const changeLanguage = (language) => {
      state.editorOptions.language = language
      Monaco.editor.setModelLanguage(variableEditor.value.getEditor().getModel(), language)
    }

    watch(
      () => props.createData.variable,
      () => {
        state.errorMessage = ''
        state.hasAccessor = isAccessorData(props.createData?.variable)
        state.getterEditorValue = props.createData.variable?.accessor?.getter?.value || DEFAULT_GETTER
        state.setterEditorValue = props.createData.variable?.accessor?.setter?.value || DEFAULT_SETTER
        state.variableType = getVarType()
        if (state.editorOptions.language !== state.variableType) {
          changeLanguage(state.variableType)
        }
      }
    )

    watch(
      () => [props.createData.name, props.createData.variable],
      () => {
        state.createData = getPropsCreateData()
      }
    )

    watch(
      () => props.createData.name,
      () => {
        variableEditor.value?.switchFullScreen(false)
        getterEditor.value?.switchFullScreen(false)
        setterEditor.value?.switchFullScreen(false)
      }
    )

    watch(
      () => state.variableType,
      () => {
        changeLanguage(state.variableType)
      }
    )

    const validate = () => {
      if (state.errorMessage) {
        return { success: false, message: state.errorMessage }
      }
      // JS表达式不进行校验
      if (state.variableType === LANG_TYPES.JS) {
        return { success: true }
      }
      return validateMonacoEditorData(variableEditor.value, '初始数据')
    }

    const getDefaultValue = () => {
      // JS表达式使用字符串值，不进行解析
      if (state.variableType === LANG_TYPES.JS) {
        return { type: 'JSExpression', value: getEditor().getEditor().getValue() }
      }
      return getEditor().getValue()
    }

    const getFormData = () => {
      const defaultValue = getDefaultValue()
      if (!state.hasAccessor) return defaultValue

      const getter = getterEditor.value.getEditor().getValue()
      const setter = setterEditor.value.getEditor().getValue()
      if (!getter && !setter) return defaultValue

      const result = { defaultValue }
      if (getter && getter !== DEFAULT_GETTER) {
        result.accessor = { ...result.accessor, getter: { type: 'JSFunction', value: getter } }
      }
      if (setter && setter !== DEFAULT_SETTER) {
        result.accessor = { ...result.accessor, setter: { type: 'JSFunction', value: setter } }
      }

      return result
    }

    const validateName = (rule, name, callback) => {
      state.errorMessage = ''

      if (!name) {
        state.errorMessage = 'state 属性名称未定义'
      } else if (!verifyJsVarName(name)) {
        state.errorMessage = ' state 属性名称只能以字母或下划线开头且仅包含数字字母及下划线'
      } else if (
        Object.keys(props.dataSource).includes(name) &&
        (props.flag !== 'update' || name !== props.updateKey)
      ) {
        state.errorMessage = '已存在同名 state 属性'
      }

      state.errorMessage ? callback(new Error(state.errorMessage)) : callback()
    }

    const rules = {
      name: { validator: validateName, required: true }
    }

    const editorCode = computed(() => {
      const { type, value } = state.createData.variable || {}

      if (type === 'JSExpression') {
        return value
      }

      return JSON.stringify(state.createData.variable, null, 2)
    })

    const addContextMenu = (editorInstance, id, label, handler) => {
      editorInstance.addAction({
        id,
        label,
        precondition: null,
        keybindingContext: null,
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1,
        run: handler
      })
    }

    const editorDidMount = (editorInstance) => {
      addContextMenu(editorInstance, 'addI18n', '插入词条', () => {
        i18nToolRef.value.state.showPopover = true
      })

      // 支持对象类型数据或表达式，不显示语法校验报错
      const diagnosticsOptions = variableEditor.value.editor
        .getMonaco()
        .languages?.typescript?.javascriptDefaults.getDiagnosticsOptions()
      variableEditor.value.editor.getMonaco().languages?.typescript?.javascriptDefaults.setDiagnosticsOptions({
        ...diagnosticsOptions,
        noSyntaxValidation: true,
        noSemanticValidation: true
      })
      if (variableEditor.value) {
        state.completionProvider = initCompletion(
          variableEditor.value.editor.getMonaco(),
          variableEditor.value.editor.getEditor()?.getModel(),
          (item) => item.label !== 'this.state' && !item.label.startsWith('this.state.')
        )
      }
    }

    onBeforeUnmount(() => {
      state.completionProvider?.forEach((provider) => {
        provider.dispose()
      })
    })

    const insertContent = (insertText = '') => {
      const monacoEditor = getEditor().editor.getEditor()
      const selection = monacoEditor.getSelection()
      const range = new Monaco.Range(
        selection?.startLineNumber || 1,
        selection?.startColumn || 1,
        selection?.endLineNumber || 1,
        selection?.endColumn || 1
      )

      monacoEditor.executeEdits('', [{ range, text: insertText }])
      getEditor().formatCode()
      monacoEditor.focus()
    }

    const options = {
      lineNumbers: true,
      language: 'javascript',
      // 禁用滚动条边边一直显示的边框
      overviewRulerBorder: false,
      renderLineHighlightOnlyWhenFocus: true
    }
    const getterExample =
      'function getter() {\r\n  // this.state.name = `${this.props.firstName} ${this.props.lastName}`\r\n}' // eslint-disable-line
    const getterReactExample = 'function getter() {\r\n  return `${this.props.firstName} ${this.props.lastName}`\r\n}' // eslint-disable-line
    const setterExample =
      "function setter() {\r\n  // const [firstName, lastName] = this.state.name.split(' ')\r\n  // this.emit('update:firstName', firstName)\r\n  // this.emit('update:lastName', lastName)\r\n}" // eslint-disable-line

    return {
      state,
      VAR_TYPES,
      variableEditor,
      getterEditor,
      setterEditor,
      i18nToolRef,
      editorCode,
      rules,
      options,
      getterExample,
      setterExample,
      getEditor,
      validateName,
      editorDidMount,
      validate,
      getFormData,
      insertContent,
      dslMode,
      moduleDisplayStatus,
      getterReactExample
    }
  }
}
</script>

<style lang="less" scoped>
.create-form {
  padding: 12px;
  height: calc(100% - 45px);
  overflow-y: auto;

  .tiny-form-item:not(:last-child) {
    margin-bottom: 12px;
  }

  :deep(.tiny-form-item__label) {
    color: var(--ti-lowcode-toolbar-icon-color);
  }

  .label-left-wrap {
    color: var(--ti-lowcode-toolbar-icon-color);
    display: flex;
  }
}

.tips-content {
  padding: 12px;
  .create-content-head {
    display: flex;
    flex: 1;
    font-size: 12px;

    .icon-info-circle {
      font-size: 14px;
      margin-right: 4px;
      color: var(--ti-lowcode-toolbar-icon-color);
    }
  }
  .create-content-tip {
    font-size: 14px;
  }

  .create-content-demo {
    font-size: 14px;
    .ml20 {
      margin-left: 20px;
    }
    li {
      margin-top: 8px;
    }
  }
  .create-content-foot {
    margin-top: 4px;
    font-size: 14px;
    line-height: 22px;
  }
}

.create-content-description {
  font-size: 12px;
  color: var(--ti-lowcode-common-primary-color);
  margin-left: 8px;
  cursor: pointer;
}

.variable-editor {
  height: 270px;
}

.show-advanced {
  font-size: 12px;
  color: var(--ti-lowcode-data-advanced-text-color);
  &:hover {
    color: var(--ti-lowcode-data-advanced-text-hover-color);
    cursor: pointer;
  }
}
</style>

<style lang="less">
.tiny-popover.tiny-popper.state-data-example-tips {
  background-color: var(--ti-lowcode-data-example-bg-color);
  color: var(--ti-lowcode-data-example-color);

  &[x-placement^='bottom'] .popper__arrow {
    &,
    &::after {
      border-bottom-color: var(--ti-lowcode-data-example-bg-color);
    }
  }

  &[x-placement^='top'] .popper__arrow {
    &,
    &::after {
      border-top-color: var(--ti-lowcode-data-example-bg-color);
    }
  }
}
</style>
