export function normalizeAiBaseUrl(value: string): string {
  const url = new URL(value.trim())
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Base URL must use http or https')
  }
  return url.toString().replace(/\/$/, '')
}

export function getOpenAiCompatibleUrls(baseUrl: string) {
  const normalized = normalizeAiBaseUrl(baseUrl)
  return {
    chatUrl: `${normalized}/chat/completions`,
    modelsUrl: `${normalized}/models`,
    imagesUrl: `${normalized}/images/generations`,
  }
}
