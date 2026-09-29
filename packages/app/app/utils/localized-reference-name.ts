export interface LocalizedReferenceName {
  name: string
  name_de?: string | null
  name_en?: string | null
  name_zh?: string | null
}

export function getLocalizedReferenceName(entry: LocalizedReferenceName, locale: string): string {
  if (locale.toLowerCase().startsWith('zh')) {
    return entry.name_zh || entry.name_en || entry.name
  }
  if (locale.toLowerCase().startsWith('de')) {
    return entry.name_de || entry.name_en || entry.name
  }
  return entry.name_en || entry.name
}

export const getLocalizedTagName = getLocalizedReferenceName
