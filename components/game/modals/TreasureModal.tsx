'use client'

import { ArrowUpCircle, Coins, Sparkles, Timer } from 'lucide-react'
import type { Treasure } from '@/lib/game-data'
import type { TreasureDef } from '@/lib/game/types'
import { TREASURE_BY_ID } from '@/lib/game/config/treasures'
import { useGameStore } from '@/lib/game/state/store'
import { formatNumber } from '@/lib/game/utils'
import { GameModal } from '../GameModal'
import { GameIcon } from '../GameIcon'
import { InkButton, QualityBadge } from '../primitives'
import { qualityView } from '../viewModels'

/** 施放方式 → 修仙文案 */
const CAST_LABEL: Record<TreasureDef['cast'], string> = {
  projectile: '直线弹道',
  aoe: '范围伤害',
  shield: '生成护盾',
  heal: '回复生命',
  buff: '自身增益',
  summon: '召出援手',
  dot: '持续侵蚀',
  aura: '常驻加持',
}

const TREASURE_MAX_LEVEL = 30

function upgradeCost(level: number): number {
  return Math.round(120 * (level + 1) ** 1.4)
}

export function TreasureModal({
  open,
  onClose,
  treasure,
}: {
  open: boolean
  onClose: () => void
  treasure: Treasure | null
}) {
  const save = useGameStore((s) => s.save)
  const equipTreasure = useGameStore((s) => s.equipTreasure)
  const unequipTreasure = useGameStore((s) => s.unequipTreasure)
  const upgradeTreasure = useGameStore((s) => s.upgradeTreasure)

  if (!treasure) return null

  const def = TREASURE_BY_ID[treasure.id]
  const inst = def ? (save.combat.ownedTreasures.find((x) => x.defId === def.id) ?? null) : null

  if (!def || !inst) {
    const q = qualityView(treasure.quality)
    return (
      <GameModal
        open={open}
        onClose={onClose}
        title={def?.name ?? treasure.name}
        subtitle="尚未入囊"
        footer={
          <InkButton variant="ghost" size="md" className="min-h-10 flex-1" onClick={onClose}>
            知晓了
          </InkButton>
        }
      >
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span
            className="flex size-14 items-center justify-center rounded-md bg-ink-950/80 opacity-60"
            style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}` }}
          >
            <GameIcon name={def?.icon ?? treasure.icon} className="size-7 text-cream-faint" />
          </span>
          <p className="font-serif text-xs leading-relaxed text-cream-dim">
            此宝尚未入你囊中，机缘未至时强求不得。
          </p>
          {def && <p className="text-[11px] leading-relaxed text-cream-faint">{def.desc}</p>}
        </div>
      </GameModal>
    )
  }

  const q = qualityView(def.quality)
  const slots = def.kind === 'active' ? save.combat.activeTreasures : save.combat.passiveTreasures
  const slotIndex = slots.indexOf(def.id)
  const equipped = slotIndex >= 0
  const freeSlot = slots.findIndex((v) => !v)
  const atMaxLevel = inst.level >= TREASURE_MAX_LEVEL
  const cost = upgradeCost(inst.level)
  const canAfford = save.resources.stone >= cost
  const scaleText =
    def.scale > 0
      ? [
          CAST_LABEL[def.cast],
          `每击 ${def.scale.toFixed(1)} 倍攻击`,
          def.targets && def.targets > 1 ? `至多 ${def.targets} 名敌人` : '单体',
          def.duration ? `持续 ${def.duration} 息` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : `${CAST_LABEL[def.cast]}，不主动施放，威能常驻于身。`

  return (
    <GameModal
      open={open}
      onClose={onClose}
      title={def.name}
      subtitle={`${q.label} · ${def.kind === 'active' ? '主动法宝' : '被动法宝'}${equipped ? ` · 已列阵第 ${slotIndex + 1} 坛` : ' · 未列阵'}`}
      footer={
        <>
          {equipped ? (
            <InkButton
              variant="ghost"
              size="md"
              className="min-h-10 flex-1"
              onClick={() => unequipTreasure(slotIndex)}
            >
              卸下
            </InkButton>
          ) : (
            <InkButton
              variant="jade"
              size="md"
              className="min-h-10 flex-1"
              disabled={freeSlot < 0}
              onClick={() => equipTreasure(freeSlot, def.id)}
            >
              {freeSlot < 0 ? '法坛已满' : '装备'}
            </InkButton>
          )}
          <InkButton
            variant="primary"
            size="md"
            className="min-h-10 flex-1"
            disabled={atMaxLevel || !canAfford}
            onClick={() => upgradeTreasure(def.id)}
          >
            <ArrowUpCircle className="size-3.5" />
            升级
          </InkButton>
        </>
      }
    >
      <div className="flex items-center gap-3">
        <span
          className="flex size-16 shrink-0 items-center justify-center rounded-md bg-gradient-to-b from-ink-800 to-ink-950"
          style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}, 0 0 16px ${q.glow}` }}
        >
          <GameIcon name={def.icon} className="size-8 text-cream" />
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <QualityBadge quality={def.quality} />
            <span className="rounded-[3px] bg-ink-800 px-1.5 py-0.5 font-serif text-[10px] leading-none text-gold-200">
              Lv.{inst.level}
              <span className="text-cream-faint"> / {TREASURE_MAX_LEVEL}</span>
            </span>
            <span className="rounded-[3px] border border-gold-300/25 px-1.5 py-0.5 font-serif text-[10px] leading-none text-cream-dim">
              {inst.tier} 阶
            </span>
          </div>
          <span className="flex items-center gap-1 font-serif text-[11px] text-cream-dim">
            <Timer className="size-3 text-jade-300" />
            {def.cooldown > 0 ? `冷却 ${def.cooldown} 息` : '无冷却 · 常驻'}
          </span>
          <span className="flex items-center gap-1 font-serif text-[11px] text-cream-faint">
            <Sparkles className="size-3 text-gold-300" />
            {def.kind === 'active' ? '主动催动' : '被动护身'}
          </span>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-cream-dim">{def.desc}</p>

      <div className="mt-3 rounded-md border border-gold-300/15 bg-ink-950/60 px-3 py-2">
        <p className="font-serif text-[11px] tracking-wide text-gold-300/80">威能</p>
        <p className="mt-1 text-[11px] leading-relaxed text-cream-dim">{scaleText}</p>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-md border border-gold-300/15 bg-ink-950/60 px-3 py-2">
        <span className="flex items-center gap-1 font-serif text-[11px] text-cream-faint">
          <Coins className="size-3 text-gold-300" />
          囊中灵石
        </span>
        <span className="font-serif text-xs tabular-nums text-gold-200">
          {formatNumber(save.resources.stone)}
        </span>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed">
        {atMaxLevel ? (
          <span className="text-jade-300">此宝已炼至三十级圆满，再难寸进。</span>
        ) : canAfford ? (
          <span className="text-cream-faint">
            升至 Lv.{inst.level + 1} 需灵石 {formatNumber(cost)}
          </span>
        ) : (
          <span className="text-blood-400">
            升至 Lv.{inst.level + 1} 需灵石 {formatNumber(cost)}，囊中不足
          </span>
        )}
      </p>
    </GameModal>
  )
}
