import { useEffect } from 'react'

const DEFAULT_MESSAGES = [
  '🥺 Tussi na jaao...',
  '😢 We miss you',
  '👀 Come back!',
  '🚗 Your dream ride is waiting.',
  '❤️ Your perfect modification is just one click away.',
]

const DEFAULT_CONFIG = {
  enabled: true,
  rotationInterval: 2000,
  messages: DEFAULT_MESSAGES,
  favicon: {
    enabled: false,
    attentionHref: '/favicon.svg',
    attentionType: 'image/svg+xml',
  },
}

let activeController = null
let activeSubscribers = 0

const normalizeConfig = (config = {}) => ({
  ...DEFAULT_CONFIG,
  ...config,
  messages: Array.isArray(config.messages) && config.messages.length > 0
    ? config.messages
    : DEFAULT_CONFIG.messages,
  favicon: {
    ...DEFAULT_CONFIG.favicon,
    ...(config.favicon || {}),
  },
})

const pickRandomMessage = (messages, previousMessage) => {
  if (messages.length === 1) {
    return messages[0]
  }

  let nextMessage = previousMessage

  while (nextMessage === previousMessage) {
    nextMessage = messages[Math.floor(Math.random() * messages.length)]
  }

  return nextMessage
}

const getPrimaryFavicon = () => document.querySelector('link[rel~="icon"]:not([data-tab-attention])')

const captureFavicon = () => {
  const element = getPrimaryFavicon()

  if (!element) {
    return { element: null, created: true }
  }

  return {
    element,
    created: false,
    rel: element.getAttribute('rel'),
    href: element.getAttribute('href'),
    type: element.getAttribute('type'),
    sizes: element.getAttribute('sizes'),
    media: element.getAttribute('media'),
  }
}

const restoreAttribute = (element, name, value) => {
  if (value === null || value === undefined) {
    element.removeAttribute(name)
    return
  }

  element.setAttribute(name, value)
}

const applyAttentionFavicon = (faviconConfig, faviconSnapshot) => {
  if (!faviconConfig.enabled || !faviconConfig.attentionHref) {
    return null
  }

  const element = faviconSnapshot.element || document.createElement('link')

  if (!faviconSnapshot.element) {
    element.setAttribute('data-tab-attention', 'true')
    document.head.appendChild(element)
  }

  element.setAttribute('rel', faviconConfig.rel || faviconSnapshot.rel || 'icon')
  element.setAttribute('href', faviconConfig.attentionHref)

  if (faviconConfig.attentionType) {
    element.setAttribute('type', faviconConfig.attentionType)
  } else {
    element.removeAttribute('type')
  }

  return element
}

const restoreFavicon = (faviconSnapshot, attentionFaviconElement) => {
  if (!faviconSnapshot) {
    return
  }

  if (faviconSnapshot.created) {
    attentionFaviconElement?.remove()
    return
  }

  if (!faviconSnapshot.element) {
    return
  }

  restoreAttribute(faviconSnapshot.element, 'rel', faviconSnapshot.rel)
  restoreAttribute(faviconSnapshot.element, 'href', faviconSnapshot.href)
  restoreAttribute(faviconSnapshot.element, 'type', faviconSnapshot.type)
  restoreAttribute(faviconSnapshot.element, 'sizes', faviconSnapshot.sizes)
  restoreAttribute(faviconSnapshot.element, 'media', faviconSnapshot.media)
}

const createTabAttentionController = (initialConfig) => {
  let config = normalizeConfig(initialConfig)
  let intervalId = null
  let isAttentionActive = false
  let originalTitle = document.title
  let lastAttentionMessage = ''
  let faviconSnapshot = null
  let attentionFaviconElement = null
  let titleObserver = null

  const clearRotation = () => {
    if (intervalId) {
      window.clearInterval(intervalId)
      intervalId = null
    }
  }

  const setAttentionTitle = () => {
    const nextMessage = pickRandomMessage(config.messages, lastAttentionMessage)
    lastAttentionMessage = nextMessage
    document.title = nextMessage
  }

  const startAttention = () => {
    if (!config.enabled || isAttentionActive) {
      return
    }

    originalTitle = document.title
    isAttentionActive = true
    faviconSnapshot = captureFavicon()
    attentionFaviconElement = applyAttentionFavicon(config.favicon, faviconSnapshot)

    setAttentionTitle()
    intervalId = window.setInterval(setAttentionTitle, config.rotationInterval)
  }

  const stopAttention = () => {
    if (!isAttentionActive) {
      return
    }

    clearRotation()
    document.title = originalTitle
    restoreFavicon(faviconSnapshot, attentionFaviconElement)

    isAttentionActive = false
    lastAttentionMessage = ''
    faviconSnapshot = null
    attentionFaviconElement = null
  }

  const handleVisibilityChange = () => {
    if (document.hidden) {
      startAttention()
      return
    }

    stopAttention()
  }

  const watchTitleChanges = () => {
    const titleElement = document.querySelector('title')

    if (!titleElement || titleObserver) {
      return
    }

    titleObserver = new MutationObserver(() => {
      const latestTitle = document.title

      if (!isAttentionActive) {
        originalTitle = latestTitle
        return
      }

      if (document.hidden && latestTitle !== lastAttentionMessage) {
        originalTitle = latestTitle
        setAttentionTitle()
      }
    })

    titleObserver.observe(titleElement, { childList: true })
  }

  const start = () => {
    if (!config.enabled) {
      return
    }

    watchTitleChanges()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    if (document.hidden) {
      startAttention()
    }
  }

  const destroy = () => {
    clearRotation()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    titleObserver?.disconnect()
    titleObserver = null

    if (isAttentionActive) {
      document.title = originalTitle
      restoreFavicon(faviconSnapshot, attentionFaviconElement)
    }

    isAttentionActive = false
    faviconSnapshot = null
    attentionFaviconElement = null
  }

  return {
    start,
    destroy,
    update(nextConfig) {
      config = normalizeConfig(nextConfig)

      if (!config.enabled) {
        stopAttention()
      }
    },
  }
}

const initializeTabAttention = (config) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return () => {}
  }

  activeSubscribers += 1

  if (!activeController) {
    activeController = createTabAttentionController(config)
    activeController.start()
  } else {
    activeController.update(config)
  }

  return () => {
    activeSubscribers = Math.max(0, activeSubscribers - 1)

    if (activeSubscribers === 0 && activeController) {
      activeController.destroy()
      activeController = null
    }
  }
}

export default function useTabAttention(config = DEFAULT_CONFIG) {
  useEffect(() => initializeTabAttention(config), [config])
}
