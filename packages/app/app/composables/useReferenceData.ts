/**
 * Composable for displaying reference data (races, classes)
 * with fallback logic: DB translations (custom) → i18n (standard)
 */

interface ReferenceData {
  name: string
  key?: string // i18n key (e.g., "human", "elf")
  name_de?: string | null | undefined
  name_en?: string | null | undefined
  name_zh?: string | null | undefined
}

export function useRaceName(race: ReferenceData) {
  const { t, locale } = useI18n()

  const localizedName = getLocalizedReferenceName(race, locale.value)
  if (localizedName !== race.name) return localizedName

  // Standard race: Use i18n with KEY field (e.g., "human" not "Mensch")
  if (race.key) {
    const i18nKey = `referenceData.raceNames.${race.key}`
    const translated = t(i18nKey)

    // Return translated if found, otherwise fallback to name
    if (translated !== i18nKey) {
      return translated
    }
  }

  // Fallback to raw name
  return race.name
}

export function useClassName(classData: ReferenceData) {
  const { t, locale } = useI18n()

  const localizedName = getLocalizedReferenceName(classData, locale.value)
  if (localizedName !== classData.name) return localizedName

  // Standard class: Use i18n with KEY field (e.g., "barbarian" not "Barbar")
  if (classData.key) {
    const i18nKey = `referenceData.classNames.${classData.key}`
    const translated = t(i18nKey)

    // Return translated if found, otherwise fallback to name
    if (translated !== i18nKey) {
      return translated
    }
  }

  // Fallback to raw name
  return classData.name
}
