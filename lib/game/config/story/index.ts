import type { NpcDef, StoryNode } from '../../types'
import { NPCS, NPC_BY_ID, npcById, npcName, relationStage } from './npcs'
import { STORY_NODES } from './main_story'
import { ENCOUNTERS } from './encounters'
import { CHAPTERS, CHAPTER_BY_ID, chapterOf, type StoryChapter } from './chapters'

/** 主线 + 奇遇的全量节点表 */
export const ALL_STORY_NODES: StoryNode[] = [...STORY_NODES, ...ENCOUNTERS]

export const STORY_NODE_BY_ID: Record<string, StoryNode> = Object.fromEntries(
  ALL_STORY_NODES.map((n) => [n.id, n]),
)

export { NPCS, NPC_BY_ID, npcById, npcName, relationStage }
export { STORY_NODES, ENCOUNTERS, CHAPTERS, CHAPTER_BY_ID, chapterOf }
export { SECRET_REALMS, SECRET_REALM_BY_ID } from './secret_realms'
export type { NpcDef, StoryChapter }

export default {
  NPCS,
  STORY_NODES,
  ENCOUNTERS,
  CHAPTERS,
}
