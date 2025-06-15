/**
 * 根據執行環境返回適當的 API URL
 * @param {string} path - API 路徑
 * @returns {string} 完整的 API URL
 */
export const getApiUrl = (path) => {
  const isServer = typeof window === 'undefined'
  const baseUrl = isServer ? 'http://localhost:8888' : ''
  return `${baseUrl}${path}`
}
