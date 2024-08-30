/**
 * Copyright (c) 2023 - present TinyEngine Authors.
 * Copyright (c) 2023 - present Huawei Cloud Computing Technologies Co., Ltd.
 *
 * Use of this source code is governed by an MIT-style license.
 *
 * THE OPEN SOURCE SOFTWARE IN THIS PRODUCT IS DISTRIBUTED IN THE HOPE THAT IT WILL BE USEFUL,
 * BUT WITHOUT ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS FOR
 * A PARTICULAR PURPOSE. SEE THE APPLICABLE LICENSES FOR MORE DETAILS.
 *
 */

import { provide, inject } from 'vue'
import { ReplStore } from '@vue/repl'
import vueJsx from '@vue/babel-plugin-jsx'
import { transformSync } from '@babel/core'
import { genSFCWithDefaultPlugin, parseRequiredBlocks } from '@opentiny/tiny-engine-dsl-vue'
import importMap from './importMap'
import srcFiles from './srcFiles'
import generateMetaFiles, { processAppJsCode } from './generate'
import { getSearchParams, fetchMetaData, fetchImportMap, fetchAppSchema, fetchBlockSchema } from './http'
import { PanelType, PreviewTips } from '../constant'

export const previewTokenKey = Symbol('tiny-engine-preview-preview')

export default (onReady) => {
  const params = getSearchParams()

  const store = new ReplStore()

  // 相比store.setFiles，只要少了state.activeFile = state.files[filename]，因为改变activeFile会触发多余的文件解析
  const setFiles = async (newFiles, mainFileName) => {
    await store.setFiles(newFiles, mainFileName)
    // 强制更新 codeSandbox
    store.state.resetFlip = !store.state.resetFlip
    store['initTsConfig']() // 触发获取组件d.ts方便调试
  }

  const addUtilsImportMap = (importMap, utils = []) => {
    const utilsImportMaps = {}
    utils.forEach(({ type, content: { package: packageName, cdnLink } }) => {
      if (type === 'npm' && cdnLink) {
        utilsImportMaps[packageName] = cdnLink
      }
    })
    const newImportMap = { imports: { ...importMap.imports, ...utilsImportMaps } }
    store.setImportMap(newImportMap)
  }
  const getBlocksSchema = async (pageSchema, blockSet = new Set()) => {
    let res = []

    const blockNames = parseRequiredBlocks(pageSchema)
    const promiseList = blockNames
      .filter((name) => {
        if (blockSet.has(name)) {
          return false
        }

        blockSet.add(name)

        return true
      })
      .map((name) => fetchBlockSchema(name))

    const schemaList = await Promise.allSettled(promiseList)
    const extraList = []

    schemaList.forEach((item) => {
      if (item.status === 'fulfilled' && item.value?.[0]?.content) {
        res.push(item.value[0].content)
        extraList.push(getBlocksSchema(item.value[0].content, blockSet))
      }
    })
    ;(await Promise.allSettled(extraList)).forEach((item) => {
      if (item.status === 'fulfilled' && item.value) {
        res.push(...item.value)
      }
    })

    return res
  }

  const getImportMap = async () => {
    if (import.meta.env.VITE_LOCAL_BUNDLE_DEPS === 'true') {
      const mapJSON = await fetchImportMap()
      return {
        imports: {
          ...mapJSON.imports,
          ...getSearchParams().scripts
        }
      }
    }
    return importMap
  }

  const promiseList = [
    fetchAppSchema(params.app),
    fetchMetaData(params),
    setFiles(srcFiles, 'src/Main.vue'),
    getImportMap()
  ]
  Promise.all(promiseList).then(async ([appData, metaData, _void, importMapData]) => {
    addUtilsImportMap(importMapData, metaData.utils || [])

    const blocks = await getBlocksSchema(params.pageInfo?.schema)

    // TODO: 需要验证级联生成 block schema
    // TODO: 物料内置 block 需要如何处理？
    const pageCode = [
      {
        panelName: 'Main.vue',
        panelValue:
          genSFCWithDefaultPlugin(params.pageInfo?.schema, appData?.componentsMap || [], {
            blockRelativePath: './'
          }) || '',
        panelType: 'vue',
        index: true
      },
      ...(blocks || []).map((blockSchema) => {
        return {
          panelName: `${blockSchema.fileName}.vue`,
          panelValue:
            genSFCWithDefaultPlugin(blockSchema, appData?.componentsMap || [], { blockRelativePath: './' }) || '',
          panelType: 'vue'
        }
      })
    ]

    // [@vue/repl] `Only lang="ts" is supported for <script> blocks.`
    const langReg = /lang="jsx"/
    const fixScriptLang = (generatedCode) => {
      const fixedCode = { ...generatedCode }

      if (generatedCode.panelType === PanelType.VUE) {
        fixedCode.panelValue = generatedCode.panelValue.replace(langReg, '')
      }

      return fixedCode
    }

    const newFiles = store.getFiles()

    const assignFiles = ({ panelName, panelValue, index }) => {
      if (index) {
        panelName = 'Main.vue'
      }

      const newPanelValue = panelValue.replace(/<script\s*setup\s*>([\s\S]*)<\/script>/, (match, p1) => {
        if (!p1) {
          // eslint-disable-next-line no-useless-escape
          return '<script setup></script>'
        }

        const transformedScript = transformSync(p1, {
          babelrc: false,
          plugins: [[vueJsx, { pragma: 'h' }]],
          sourceMaps: false,
          configFile: false
        })

        const res = `<script setup>${transformedScript.code}`
        // eslint-disable-next-line no-useless-escape
        const endTag = '</script>'

        return `${res}${endTag}`
      })

      newFiles[panelName] = newPanelValue
    }

    const appJsCode = processAppJsCode(newFiles['app.js'], params.styles)

    newFiles['app.js'] = appJsCode

    pageCode.map(fixScriptLang).forEach(assignFiles)

    const metaFiles = generateMetaFiles(metaData)
    Object.assign(newFiles, metaFiles)

    setFiles(newFiles)

    onReady?.(params.sandbox, params.pageInfo?.name ?? 'vue3-tiny-engine-template', newFiles)
    return PreviewTips.READY_FOR_PREVIEW
  })

  const preview = [params.sandbox, store]

  provide(previewTokenKey, preview)

  return preview
}

export function injectPreview() {
  return inject(previewTokenKey)
}
