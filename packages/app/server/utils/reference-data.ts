import type Database from 'better-sqlite3'

export interface ReferenceUpdateBody {
  name?: string
  name_de?: string | null
  name_en?: string | null
  name_zh?: string | null
  description?: string | null
}

export function isStandardTranslationOnlyUpdate(stableKey: string, body: ReferenceUpdateBody): boolean {
  return (body.name === undefined || body.name === stableKey) && body.description === undefined
}

export function findLocalizedReferenceKey(
  db: Database.Database,
  table: 'races' | 'classes',
  value: string,
): string | null {
  const normalized = value.toLowerCase()
  const row = db.prepare(`
    SELECT name FROM ${table}
    WHERE (LOWER(name_de) = ? OR LOWER(name_en) = ? OR LOWER(name_zh) = ? OR LOWER(name) = ?)
      AND deleted_at IS NULL
    LIMIT 1
  `).get(normalized, normalized, normalized, normalized) as { name: string } | undefined

  return row?.name ?? null
}
