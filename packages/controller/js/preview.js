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
import { isDevelopEnv } from './environments'
import useResource from '../src/useResource'
// prefer old unicode hacks for backward compatibility

const { COMPONENT_NAME, PREVIEW_SANDBOX } = constants

export const utoa = (string) => btoa(unescape(encodeURIComponent(string)))

export const atou = (base64) => decodeURIComponent(escape(atob(base64)))

const getParams = (_params, type, sandbox) => {
  const params = Object.assign({ type, sandbox }, _params)
  const paramsMap = new URLSearchParams(location.search)
  params.app = paramsMap.get('id')
  params.tenant = paramsMap.get('tenant')
  const { scripts, styles } = useResource().resState.thirdPartyDeps
  params.scripts = scripts
    .filter((item) => item.script)
    .reduce((pre, cur) => ({ ...pre, [cur.package]: cur.script }), {})
  params.styles = [...styles]
  return params
}

const open = (params = {}) => {
  const href = window.location.href.split('?')[0] || './'
  const tenant = new URLSearchParams(location.search).get('tenant') || ''
  let openUrl = ''
  const hashString = utoa(JSON.stringify(params))

  openUrl = isDevelopEnv
    ? `./preview.html?tenant=${tenant}#${hashString}`
    : `${href}/preview?tenant=${tenant}#${hashString}`

  const aTag = document.createElement('a')
  aTag.href = openUrl
  aTag.target = '_blank'
  aTag.click()
}

export const previewPage = (params = {}, sandbox = PREVIEW_SANDBOX.Web) => {
  open(getParams(params, COMPONENT_NAME.Page, sandbox))
}

export const previewBlock = (params = {}, sandbox = PREVIEW_SANDBOX.Web) => {
  open(getParams(params, COMPONENT_NAME.Block, sandbox))
}
