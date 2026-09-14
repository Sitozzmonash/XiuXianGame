'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Layers, Lock, Plus, Sparkles, Swords } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  EQUIP_SLOTS,
  EQUIP_SLOT_LABEL,
  SCHOOL_LABEL,
  type Element,
  type EquipSlotId,
  type SpiritRootQuality,
} from '@/lib/game/types'
import { flatStage } from '@/lib/game/config/realms'
import { SKINS, skinArt } from '@/lib/game/config/skins'
import { equipArt } from '@/lib/game/ui-art'
import { playerCombatant } from '@/lib/game/engine/battle'
import { useGameStore } from '@/lib/game/state/store'
import { power } from '@/lib/game/state/selectors'
import { formatNumber } from '@/lib/game/utils'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { BuildTabs } from '../Tabs'
import { GameIcon } from '../GameIcon'
import { InkButton, Panel, QualityBadge, StatBar } from '../primitives'
import {
  equipmentView,
  petView,
  qualityView,
  statRows,
  techniqueView,
  type EquipmentView,
} from '../viewModels'

const TABS = ['属性', '流派', '灵根', '功法', '皮肤'] as const

const ELEMENT_LABEL: Record<Element, string> = {
  metal: '金',
  wood: '木',
  water: '水',
  fire: '火',
  earth: '土',
}

const ROOT_LABEL: Record<SpiritRootQuality, string> = {
  mixed: '杂灵根',
  quad: '四灵根',
  triple: '三灵根',
  dual: '双灵根',
  single: '单灵根',
  heaven: '天灵根',
}

/** 传给 GameShell 的槽位数据：item 只带弹窗需要的装备名 */
export interface SlotTarget {
  id: EquipSlotId
  label: string
  item?: { name: string } | null
}

interface SlotRow {
  id: EquipSlotId
  label: string
  view: EquipmentView | null
}

function EquipSlotButton({
  slot,
  onClick,
}: {
  slot: SlotRow
  onClick: (target: SlotTarget) => void
}) {
  const q = slot.view ? qualityView(slot.view.quality) : null
  const art = equipArt(slot.id)
  return (
    <button
      type="button"
      onClick={() =>
        onClick({
          id: slot.id,
          label: slot.label,
          item: slot.view ? { name: slot.view.name } : null,
        })
      }
      aria-label={slot.view ? `${slot.label}：${slot.view.name}` : `${slot.label}：未装备`}
      className={cn(
        'group relative flex size-12 items-center justify-center rounded-md',
        'bg-gradient-to-b from-ink-800/90 to-ink-950/95 transition-transform duration-150 active:scale-95',
      )}
      style={{
        boxShadow: q
          ? `inset 0 0 0 1.5px ${q.ring}, 0 0 10px ${q.glow}`
          : 'inset 0 0 0 1px rgba(232,200,119,0.22)',
      }}
    >
      {slot.view ? (
        <>
          {art ? (
            <img src={art} alt="" className="size-9 object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,0.7)]" />
          ) : (
            <GameIcon name={slot.view.icon} className="size-6 text-cream" strokeWidth={1.4} />
          )}
          <span className="absolute left-0.5 top-0.5 rounded-[3px] bg-ink-950/85 px-1 font-serif text-[9px] leading-[13px] text-gold-200">
            {slot.view.level}
          </span>
          {slot.view.enhance > 0 && (
            <span className="absolute right-0.5 top-0.5 rounded-[3px] bg-gold-400/90 px-1 font-serif text-[9px] font-bold leading-[13px] text-ink-950">
              +{slot.view.enhance}
            </span>
          )}
          {slot.view.locked && (
            <span className="absolute bottom-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-[3px] bg-ink-950/85 text-gold-300">
              <Lock className="size-2" />
            </span>
          )}
        </>
      ) : (
        <Plus className="size-4 text-cream-faint" />
      )}
      <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap font-serif text-[9px] text-cream-faint">
        {slot.label}
      </span>
    </button>
  )
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: string
}) {
  return (
    <li className="flex items-center gap-2 rounded-sm border border-gold-300/10 bg-ink-950/50 px-2.5 py-2">
      <GameIcon name={icon} className="size-3.5 shrink-0 text-jade-300" />
      <span className="text-[11px] text-cream-faint">{label}</span>
      <span className="ml-auto truncate font-serif text-xs tabular-nums text-cream">
        {value}
      </span>
    </li>
  )
}

export function CharacterScreen({
  onBack,
  onSelectSlot,
  onOpenBuild,
  onOpenMall,
}: {
  onBack: () => void
  onSelectSlot: (slot: SlotTarget) => void
  onOpenBuild?: () => void
  onOpenMall?: () => void
}) {
  const [tab, setTab] = useState<string>(TABS[0])
  const [hint, setHint] = useState<string | null>(null)

  const save = useGameStore((s) => s.save)
  const autoEquip = useGameStore((s) => s.autoEquip)
  const equipSkin = useGameStore((s) => s.equipSkin)

  const slots: SlotRow[] = EQUIP_SLOTS.map((id) => {
    const equipped = save.combat.equipment[id]
    return { id, label: EQUIP_SLOT_LABEL[id], view: equipped ? equipmentView(equipped) : null }
  })
  const left = slots.slice(0, 5)
  const right = slots.slice(5)

  const stage = flatStage(save.profile.stageId)
  const statList = statRows(playerCombatant(save).stats)

  const mainProgress = save.combat.mainTechnique
    ? save.combat.techniques.find((t) => t.defId === save.combat.mainTechnique)
    : undefined
  const mainView = mainProgress
    ? techniqueView(mainProgress.defId, mainProgress.level, true, null)
    : null
  const pet = save.combat.pet ? petView(save.combat.pet, true) : null

  const root = save.profile.spiritRoot
  const rootEntries = (Object.entries(root.elements) as [Element, number][])
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
  const rootMax = rootEntries[0]?.[1] ?? 1

  const handleAutoEquip = () => {
    const changed = autoEquip()
    setHint(changed.length > 0 ? `换上新装：${changed.join('、')}` : '行囊中并无更胜一筹之物')
  }

  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader title="角色" onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col gap-3 overflow-hidden px-3 pt-3">
        <div className="relative flex shrink-0 items-center justify-between">
          <div className="flex flex-col gap-6">
            {left.map((slot) => (
              <EquipSlotButton key={slot.id} slot={slot} onClick={onSelectSlot} />
            ))}
          </div>

          <div className="relative h-56 flex-1">
            <Image
              src={skinArt(save.appearance.skin)}
              alt={save.profile.name}
              fill
              sizes="220px"
              className="object-contain object-bottom drop-shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
            />
          </div>

          <div className="flex flex-col gap-6">
            {right.map((slot) => (
              <EquipSlotButton key={slot.id} slot={slot} onClick={onSelectSlot} />
            ))}
          </div>
        </div>

        <div className="shrink-0 text-center">
          <p className="font-serif text-base font-bold text-cream">{save.profile.name}</p>
          <p className="text-[11px] text-gold-300/90">
            {stage.stage.label} · 战力 {formatNumber(power(save))}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <InkButton
            variant="jade"
            size="md"
            className="min-h-[40px] flex-1"
            onClick={handleAutoEquip}
          >
            <Swords className="size-3.5" />
            一键穿戴
          </InkButton>
          {onOpenBuild && (
            <InkButton variant="ghost" size="md" className="min-h-[40px]" onClick={onOpenBuild}>
              <Layers className="size-3.5" />
              流派方案
            </InkButton>
          )}
          {hint && (
            <p className="flex-1 text-[11px] leading-tight text-jade-200">{hint}</p>
          )}
        </div>

        <BuildTabs tabs={TABS} active={tab} onChange={setTab} className="shrink-0" />

        <div className="flex-1 overflow-y-auto pb-2 no-scrollbar">
          {tab === '属性' && (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {statList.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center gap-2 rounded-sm border border-gold-300/10 bg-ink-950/50 px-2.5 py-1.5"
                >
                  <span className="text-[11px] text-cream-faint">{row.label}</span>
                  <span className="ml-auto font-serif text-xs tabular-nums text-cream">
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {tab === '流派' && (
            <ul className="grid grid-cols-1 gap-1.5">
              <InfoRow label="修行流派" value={SCHOOL_LABEL[save.profile.school]} icon="sword" />
              <InfoRow
                label="主修功法"
                value={mainView ? `${mainView.name} · ${mainView.level} 重` : '尚未择定'}
                icon="book"
              />
              <InfoRow
                label="辅修功法"
                value={`${save.combat.supportTechniques.filter(Boolean).length} / ${save.combat.supportTechniques.length}`}
                icon="scroll"
              />
              <InfoRow
                label="随行灵兽"
                value={pet ? pet.name : '尚未结契'}
                icon="beast"
              />
              <InfoRow
                label="护身法宝"
                value={`${save.combat.ownedTreasures.filter((t) => t.equipped).length} 件在身`}
                icon="seal"
              />
            </ul>
          )}

          {tab === '灵根' && (
            <Panel className="px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-gold-300" />
                <span className="font-serif text-xs text-cream">
                  {ROOT_LABEL[root.quality]}
                </span>
                <span className="ml-auto text-[10px] text-cream-faint">
                  五行亲和
                </span>
              </div>
              <ul className="mt-2.5 flex flex-col gap-2">
                {rootEntries.map(([element, weight]) => (
                  <li key={element} className="flex items-center gap-2">
                    <span className="w-4 shrink-0 font-serif text-xs text-jade-300">
                      {ELEMENT_LABEL[element]}
                    </span>
                    <StatBar value={weight / rootMax} className="flex-1" />
                    <span className="w-10 shrink-0 text-right font-serif text-[11px] tabular-nums text-cream-dim">
                      {weight.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {tab === '功法' && (
            <ul className="flex flex-col gap-1.5">
              {save.combat.techniques.map((t) => {
                const view = techniqueView(
                  t.defId,
                  t.level,
                  save.combat.mainTechnique === t.defId,
                  null,
                )
                if (!view) return null
                return (
                  <li
                    key={t.defId}
                    className="flex items-center gap-2.5 rounded-sm border border-gold-300/10 bg-ink-950/50 px-2.5 py-2"
                  >
                    <GameIcon name={view.icon} className="size-4 shrink-0 text-cream" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-serif text-xs text-cream">
                          {view.name}
                        </span>
                        {view.isMain && (
                          <span className="rounded-[3px] bg-gold-400/90 px-1 font-serif text-[9px] font-bold leading-[14px] text-ink-950">
                            主修
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-cream-faint">
                        {view.schoolLabel} · {view.level} / {view.maxLevel} 重
                      </span>
                    </span>
                    <QualityBadge quality={view.quality} className="ml-auto shrink-0" />
                  </li>
                )
              })}
            </ul>
          )}
          {tab === '皮肤' && (
            <ul className="grid grid-cols-2 gap-2.5">
              {SKINS.map((skin) => {
                const owned = save.appearance.ownedSkins.includes(skin.id)
                const wearing = save.appearance.skin === skin.id
                return (
                  <li
                    key={skin.id}
                    className="overflow-hidden rounded-md border bg-ink-950/60"
                    style={{
                      borderColor: wearing ? 'rgba(58,157,139,0.6)' : 'rgba(232,200,119,0.15)',
                      boxShadow: wearing ? '0 0 12px rgba(58,157,139,0.25)' : undefined,
                    }}
                  >
                    <div className="relative h-36 bg-gradient-to-b from-ink-800/60 to-ink-950">
                      <img
                        src={skin.image}
                        alt={skin.name}
                        className="size-full object-contain object-bottom drop-shadow-[0_6px_16px_rgba(0,0,0,0.8)]"
                        style={{ filter: owned ? undefined : 'grayscale(0.85) opacity(0.7)' }}
                      />
                      {wearing && (
                        <span className="absolute left-1.5 top-1.5 rounded-[3px] bg-jade-500/90 px-1.5 font-serif text-[9px] font-bold leading-[15px] text-ink-950">
                          穿戴中
                        </span>
                      )}
                    </div>
                    <div className="px-2.5 pb-2.5 pt-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-serif text-xs font-bold text-cream">
                          {skin.name}
                        </span>
                        <QualityBadge quality={skin.quality} />
                      </span>
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-cream-faint">{skin.desc}</p>
                      <div className="mt-2">
                        {owned ? (
                          <InkButton
                            variant={wearing ? 'ghost' : 'jade'}
                            size="sm"
                            className="min-h-7 w-full"
                            disabled={wearing}
                            onClick={() => {
                              if (equipSkin(skin.id)) setHint(`已换上「${skin.name}」`)
                            }}
                          >
                            {wearing ? '本命装' : '穿戴'}
                          </InkButton>
                        ) : (
                          <InkButton
                            variant="primary"
                            size="sm"
                            className="min-h-7 w-full"
                            onClick={onOpenMall}
                          >
                            <Sparkles className="size-3" />
                            {skin.price} 仙玉
                          </InkButton>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </ScreenFrame>
  )
}
