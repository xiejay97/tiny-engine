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

import { constants } from '@opentiny/tiny-engine-utils'
import { useHttp } from '@opentiny/tiny-engine-http'
import useCanvas from '../../src/useCanvas'
import useBlock from '../../src/useBlock'
import useLayout from '../../src/useLayout'
import useEditorInfo from '../../src/useEditorInfo'
import { parseRequiredBlocks } from '../block'
import { getGlobalConfig } from '../../src/globalConfig'
import { fetchMetaData, fetchPageList, fetchBlockSchema } from './http'

const { PREVIEW_SANDBOX } = constants

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

const getAllPageDetails = async (pageList) => {
  const detailPromise = pageList.map(({ id }) => useLayout().getPluginApi('AppManage').getPageById(id))
  const detailList = await Promise.allSettled(detailPromise)

  return detailList
    .map((item) => {
      if (item.status === 'fulfilled' && item.value) {
        return item.value
      }
    })
    .filter((item) => Boolean(item))
}

const getParams = () => {
  const { isBlock, getCurrentPage, canvasApi } = useCanvas()
  const { getCurrentBlock } = useBlock()

  const { getSchema } = canvasApi.value
  const params = {
    framework: getGlobalConfig()?.dslMode,
    platform: getGlobalConfig()?.platformId,
    pageInfo: {
      schema: getSchema()
    }
  }
  const paramsMap = new URLSearchParams(location.search)
  params.app = paramsMap.get('id')
  params.tenant = paramsMap.get('tenant')

  if (isBlock()) {
    const block = getCurrentBlock()
    params.id = block?.id
    params.pageInfo.name = block?.label
    params.type = 'Block'
  } else {
    const page = getCurrentPage()
    params.id = page?.id
    params.pageInfo.name = page?.name
    params.type = 'Page'
  }

  return params
}

export const getPreGenerateInfo = async (instance, sandbox = PREVIEW_SANDBOX.Web) => {
  const params = getParams()
  const { id, pageId } = useEditorInfo().useInfo()
  const currentPage = await useLayout().getPluginApi('AppManage').getPageById(pageId)
  const promises = [
    useHttp().get(`/app-center/v1/api/apps/schema/${id}`),
    fetchMetaData(params),
    fetchPageList(params.app)
  ]

  const [appData, metaData, pageList] = await Promise.all(promises)
  const pageDetailList = await getAllPageDetails(pageList)

  const blockSet = new Set()
  const list = pageDetailList.map((page) => getBlocksSchema(page.page_content, blockSet))
  const blocks = await Promise.allSettled(list)

  const blockSchema = []
  blocks.forEach((item) => {
    if (item.status === 'fulfilled' && Array.isArray(item.value)) {
      blockSchema.push(...item.value)
    }
  })

  const appSchema = {
    // metaData 包含dataSource、utils、i18n、globalState
    ...metaData,
    // 页面 schema
    pageSchema: pageDetailList.map((item) => {
      const { page_content, ...meta } = item
      return {
        ...page_content,
        meta: {
          ...meta,
          isHome: sandbox === PREVIEW_SANDBOX.Web ? meta.isHome : meta.id === currentPage?.id,
          router: meta.route
        }
      }
    }),
    blockSchema,
    // 物料数据
    componentsMap: [...(appData.componentsMap || [])],

    meta: {
      ...(appData.meta || {})
    }
  }

  const res = await instance.generate(appSchema)

  const { genResult = [] } = res || {}
  const fileRes = genResult.map(({ fileContent, fileName, path, fileType }) => {
    const slash = path.endsWith('/') || path === '.' ? '' : '/'
    let filePath = `${path}${slash}`
    if (filePath.startsWith('./')) {
      filePath = filePath.slice(2)
    }
    if (filePath.startsWith('.')) {
      filePath = filePath.slice(1)
    }

    if (filePath.startsWith('/')) {
      filePath = filePath.slice(1)
    }

    return {
      fileContent,
      filePath: `${filePath}${fileName}`,
      fileType
    }
  })

  return fileRes
}

export default getPreGenerateInfo
