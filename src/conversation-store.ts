const LEGACY_STORAGE_KEY = 'xinyu-study-companion:conversations'

export const clearLegacyConversationHistory = () => {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // Storage can be unavailable in private browsing; no data is written.
  }
}

export const titleFromMessage = (message: string) => {
  const title = message.replace(/\s+/g, ' ').trim()
  return title.length > 18 ? `${title.slice(0, 18)}...` : title
}
