'use client'

/* ------------------------------------------------------------------ *
 * 剧情 / 奇遇播放流程
 *
 * 待播节点来自存档的 story.pending 队列：推关胜利后入队，玩家空闲在
 * 主界面时按顺序弹出。这里只负责「取队首 → 播放 → 结算 → 出队」，
 * 奖励落档交给 store 的 submitChoice / resolveStoryNode。
 *
 * 选择后的追加台词（choice.reply）会在同一个 Overlay 里接着播完再关闭。
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGameStore } from '@/lib/game/state/store'
import { choicesFor } from '@/lib/game/engine/story'
import { STORY_NODE_BY_ID } from '@/lib/game/config/story'
import type { StoryLine, StoryNode } from '@/lib/game/types'
import { StoryOverlay } from './StoryOverlay'
import { EncounterOverlay } from './EncounterOverlay'

export interface StoryFlowProps {
  /** 只在主界面等空闲场景弹出，避免覆盖战斗 */
  enabled: boolean
  /** 一个节点播完后回调（用于刷新界面 / 做奖励提示） */
  onResolved?: (node: StoryNode) => void
}

export function StoryFlow({ enabled, onResolved }: StoryFlowProps) {
  const save = useGameStore((s) => s.save)
  const submitChoice = useGameStore((s) => s.submitChoice)
  const resolveStoryNode = useGameStore((s) => s.resolveStoryNode)

  /** 已播完的节点，避免 pending 未清理时重复弹出 */
  const [played, setPlayed] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  /** 选择后的追加台词 */
  const [reply, setReply] = useState<{ node: StoryNode; lines: StoryLine[] } | null>(null)

  const pending = save.story.pending

  const current = useMemo<StoryNode | null>(() => {
    if (!enabled || reply) return null
    const id = pending.find((x) => !played.includes(x))
    if (!id) return null
    return STORY_NODE_BY_ID[id] ?? null
  }, [enabled, pending, played, reply])

  useEffect(() => {
    if (current && !open) setOpen(true)
  }, [current, open])

  const finish = useCallback(
    (node: StoryNode) => {
      setPlayed((prev) => (prev.includes(node.id) ? prev : [...prev, node.id]))
      setOpen(false)
      setReply(null)
      onResolved?.(node)
    },
    [onResolved],
  )

  const handleChoose = useCallback(
    (choiceId: string) => {
      if (!current) return
      const node = current
      const choice = node.choices?.find((c) => c.id === choiceId)
      submitChoice(node.id, choiceId)
      if (choice?.reply?.length) {
        // 先让追加台词播完，再关闭
        setReply({ node, lines: choice.reply })
      } else {
        finish(node)
      }
    },
    [current, submitChoice, finish],
  )

  const handleClose = useCallback(() => {
    if (reply) {
      finish(reply.node)
      return
    }
    if (!current) return
    // 无选择的节点（叙述 / 演出）直接结算奖励
    resolveStoryNode(current.id)
    finish(current)
  }, [current, reply, resolveStoryNode, finish])

  const getChoiceState = useCallback(
    (choiceId: string) => {
      if (!current) return { enabled: false }
      const list = choicesFor(current, save)
      const found = list.find((c) => c.choice.id === choiceId)
      return found ? { enabled: found.enabled, reason: found.reason } : { enabled: false }
    },
    [current, save],
  )

  /* 追加台词阶段：复用 StoryOverlay 播完 reply */
  if (reply) {
    const replyNode: StoryNode = {
      ...reply.node,
      id: `${reply.node.id}__reply`,
      type: 'dialogue',
      lines: reply.lines,
      choices: undefined,
    }
    return (
      <StoryOverlay
        open
        node={replyNode}
        onChoose={() => undefined}
        getChoiceState={() => ({ enabled: false })}
        onClose={handleClose}
      />
    )
  }

  if (!current) return null

  if (current.type === 'encounter') {
    return (
      <EncounterOverlay
        open={open}
        node={current}
        onChoose={handleChoose}
        getChoiceState={getChoiceState}
        onClose={handleClose}
      />
    )
  }

  return (
    <StoryOverlay
      open={open}
      node={current}
      onChoose={handleChoose}
      getChoiceState={getChoiceState}
      onClose={handleClose}
    />
  )
}
