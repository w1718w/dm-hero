import { describe, expect, it } from 'vitest'
import { getLocalizedReferenceName, getLocalizedTagName } from '../../app/utils/localized-reference-name'
import { getOpenAiCompatibleUrls, normalizeAiBaseUrl } from '../../server/utils/ai-url'
import { findLocalizedReferenceKey, isStandardTranslationOnlyUpdate } from '../../server/utils/reference-data'
import { migrations } from '../../server/utils/migrations'
import { getTestDb } from '../utils/test-db'

describe('localized reference names', () => {
  it('shows Chinese defaults and preserves German and English', () => {
    const human = { name: 'human', name_de: 'Mensch', name_en: 'Human', name_zh: '人类' }
    const wizard = { name: 'wizard', name_de: 'Magier', name_en: 'Wizard', name_zh: '法师' }

    expect(getLocalizedReferenceName(human, 'zh-CN')).toBe('人类')
    expect(getLocalizedReferenceName(wizard, 'zh-CN')).toBe('法师')
    expect(getLocalizedReferenceName(human, 'de')).toBe('Mensch')
    expect(getLocalizedReferenceName(human, 'en')).toBe('Human')
  })

  it('falls back from Chinese to English and then the stable key', () => {
    expect(getLocalizedReferenceName({ name: 'custom', name_en: 'Custom' }, 'zh-CN')).toBe('Custom')
    expect(getLocalizedReferenceName({ name: 'custom' }, 'zh-CN')).toBe('custom')
    expect(getLocalizedReferenceName({ name: 'custom', name_en: 'Custom' }, 'de')).toBe('Custom')
  })

  it('keeps tag slugs stable while displaying localized names', () => {
    const tag = { name: 'quest-giver', name_en: 'Quest Giver', name_zh: '任务发布者' }
    expect(tag.name).toBe('quest-giver')
    expect(getLocalizedTagName(tag, 'zh-CN')).toBe('任务发布者')
  })
})

describe('localized reference database migration and lookup', () => {
  it('seeds Chinese names and resolves display names to stable keys', () => {
    const db = getTestDb()
    const human = db.prepare("SELECT name, name_zh FROM races WHERE name = 'human'").get() as { name: string, name_zh: string }
    const wizard = db.prepare("SELECT name, name_zh FROM classes WHERE name = 'wizard'").get() as { name: string, name_zh: string }

    expect(human).toEqual({ name: 'human', name_zh: '人类' })
    expect(wizard).toEqual({ name: 'wizard', name_zh: '法师' })
    expect((db.prepare("SELECT COUNT(*) AS count FROM races WHERE is_standard = 1 AND NULLIF(name_zh, '') IS NULL").get() as { count: number }).count).toBe(0)
    expect((db.prepare("SELECT COUNT(*) AS count FROM classes WHERE is_standard = 1 AND NULLIF(name_zh, '') IS NULL").get() as { count: number }).count).toBe(0)
    expect(findLocalizedReferenceKey(db, 'races', '人类')).toBe('human')
    expect(findLocalizedReferenceKey(db, 'classes', '法师')).toBe('wizard')
    db.close()
  })

  it('allows standard translations but rejects stable-key and description changes', () => {
    expect(isStandardTranslationOnlyUpdate('human', { name_zh: '人类' })).toBe(true)
    expect(isStandardTranslationOnlyUpdate('human', { name: 'human', name_zh: '人类' })).toBe(true)
    expect(isStandardTranslationOnlyUpdate('human', { name: 'human-renamed' })).toBe(false)
    expect(isStandardTranslationOnlyUpdate('human', { description: 'changed' })).toBe(false)
  })

  it('is repeatable and preserves existing entity associations', () => {
    const db = getTestDb()
    const npc = db.prepare(`
      SELECT e.id FROM entities e JOIN entity_types t ON t.id = e.type_id
      WHERE t.name = 'NPC' LIMIT 1
    `).get() as { id: number }
    const beforeMetadata = (db.prepare('SELECT metadata FROM entities WHERE id = ?').get(npc.id) as { metadata: string | null }).metadata
    const tagId = Number(db.prepare("INSERT INTO tags (name, name_zh) VALUES ('quest-giver', '任务发布者')").run().lastInsertRowid)
    db.prepare('INSERT INTO entity_tags (entity_id, tag_id) VALUES (?, ?)').run(npc.id, tagId)

    const migration = migrations.find(item => item.version === 55)!
    migration.up(db)
    migration.up(db)

    const entity = db.prepare('SELECT metadata FROM entities WHERE id = ?').get(npc.id) as { metadata: string | null }
    const association = db.prepare('SELECT 1 FROM entity_tags WHERE entity_id = ? AND tag_id = ?').get(npc.id, tagId)
    expect(entity.metadata).toBe(beforeMetadata)
    expect(association).toBeDefined()
    db.close()
  })
})

describe('custom AI base URL', () => {
  it('accepts arbitrary HTTP(S) OpenAI-compatible roots and joins endpoints', () => {
    expect(normalizeAiBaseUrl('https://example.test/openai/v1/')).toBe('https://example.test/openai/v1')
    expect(getOpenAiCompatibleUrls('http://localhost:1234/v1')).toEqual({
      chatUrl: 'http://localhost:1234/v1/chat/completions',
      modelsUrl: 'http://localhost:1234/v1/models',
      imagesUrl: 'http://localhost:1234/v1/images/generations',
    })
  })

  it('rejects non-HTTP protocols', () => {
    expect(() => normalizeAiBaseUrl('file:///tmp/api')).toThrow('http or https')
  })
})
