import { getDb } from '../../utils/db'
import { isStandardTranslationOnlyUpdate } from '../../utils/reference-data'

interface RaceRow {
  id: number
  name: string
  is_standard: number
}

export default defineEventHandler(async (event) => {
  const db = getDb()
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Race ID is required',
    })
  }

  const { name, name_de, name_en, name_zh, description } = body

  // Check if race exists
  const existing = db
    .prepare<unknown[], RaceRow>(
      `
    SELECT id, name, is_standard FROM races WHERE id = ? AND deleted_at IS NULL
  `,
    )
    .get(id)

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Race not found',
    })
  }

  // Standard keys and descriptions are immutable; translations remain editable.
  if (existing.is_standard && !isStandardTranslationOnlyUpdate(existing.name, body)) {
    throw createError({
      statusCode: 403,
      message: 'Standard race keys and descriptions cannot be edited',
    })
  }

  // Check if name conflicts with another race
  if (name) {
    const conflict = db
      .prepare(
        `
      SELECT id FROM races WHERE name = ? AND id != ? AND deleted_at IS NULL
    `,
      )
      .get(name, id)

    if (conflict) {
      throw createError({
        statusCode: 409,
        message: 'Race with this name already exists',
      })
    }
  }

  db.prepare(
    `
    UPDATE races
    SET
      name = COALESCE(?, name),
      name_de = COALESCE(?, name_de),
      name_en = COALESCE(?, name_en),
      name_zh = COALESCE(?, name_zh),
      description = COALESCE(?, description)
    WHERE id = ? AND deleted_at IS NULL
  `,
  ).run(existing.is_standard ? null : name, name_de, name_en, name_zh, description, id)

  const race = db
    .prepare(
      `
    SELECT * FROM races WHERE id = ?
  `,
    )
    .get(id)

  return race
})
