'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Lock, Package, Sparkles, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QUALITY_ORDER, type Quality } from '@/lib/game/types'
import { PILL_BY_ID, PILL_CATEGORY_LABEL, type PillDef } from '@/lib/game/config/pills'
import { expandCost, salvageValue } from '@/lib/game/engine/loot'
import { useGameStore } from '@/lib/game/state/store'
import { bagSummary } from '@/lib/game/state/selectors'
import { equipArt, pillArt, treasureArt } from '@/lib/game/ui-art'
import { formatNumber } from '@/lib/game/utils'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { BuildTabs } from '../Tabs'
import { GameIcon } from '../GameIcon'
import { InkButton, Panel, QualityBadge, SectionTitle, StatBar } from '../primitives'
import {
  equipmentBrief,
  materialView,
  pillView,
  qualityView,
  treasureView,
  type EquipmentBrief,
  type MaterialView,
  type TreasureView,
} from '../viewModels'

const TABS = ['全部', '装备', '法宝', '材料', '丹药'] as const

/** 传给 GameShell 的选中项：只带弹窗需要的装备名 */
export interface InventoryPick {
  name: string
}

/** 不可服用丹药的缘故（store.usePill 只结算修为丹） */
const PILL_UNUSABLE_NOTE: Record<PillDef['category'], string> = {
  cultivation: '',
  battle: '斗法之际自会服下',
  breakthrough: '突破关隘时方有其用',
  permanent: '药性未明，尚不可服',
}

const SHEET_KIND_LABEL = { pill: '丹药', material: '材料', treasure: '法宝' } as const

interface SheetModel {
  kind: keyof typeof SHEET_KIND_LABEL
  name: string
  quality: Quality
  icon: string
  /** 装备部位立绘；缺省时用矢量图标 */
  art?: string
  desc: string
  meta: string[]
  action?: { label: string; disabled: boolean; note?: string; run: () => void }
}

/** 品质降序：viewModels 未给排序权重，用 QUALITY_ORDER 的下标比较 */
function qualityRank(q: Quality): number {
  return QUALITY_ORDER.indexOf(q)
}

function BagCell({
  icon,
  art,
  quality,
  corner,
  badge,
  locked,
  label,
  onOpen,
  onToggleLock,
}: {
  icon: string
  /** 部位立绘；缺省时回落到矢量图标 */
  art?: string
  quality: Quality
  corner?: string
  badge?: string
  locked?: boolean
  label: string
  onOpen?: () => void
  onToggleLock?: () => void
}) {
  const q = qualityView(quality)
  return (
    <div className={cn('relative aspect-square rounded-md', locked && 'ring-1 ring-gold-300/50')}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={label}
        className="group relative size-full overflow-hidden rounded-md bg-gradient-to-b from-ink-800 to-ink-950 transition-transform duration-150 active:scale-95"
        style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}` }}
      >
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(120% 90% at 50% 115%, ${q.glow}, transparent 62%)`,
          }}
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <GameIcon name={icon} className="size-7 text-cream" strokeWidth={1.4} />
        </span>
        {art && (
          <img
            src={art}
            alt=""
            className="absolute inset-1.5 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)]"
          />
        )}
        {corner && (
          <span className="absolute left-0.5 top-0.5 rounded-[3px] bg-ink-950/85 px-1 font-serif text-[9px] leading-[13px] text-gold-200">
            {corner}
          </span>
        )}
        {badge && (
          <span className="absolute right-0.5 top-0.5 rounded-[3px] bg-gold-400/90 px-1 font-serif text-[9px] font-bold leading-[13px] text-ink-950">
            {badge}
          </span>
        )}
      </button>
      {onToggleLock && (
        <button
          type="button"
          onClick={onToggleLock}
          aria-label={locked ? `解除锁定：${label}` : `锁定：${label}`}
          className={cn(
            'absolute bottom-0 right-0 z-10 flex size-10 items-center justify-center rounded-br-md rounded-tl-md transition-colors',
            locked
              ? 'bg-gold-400/90 text-ink-950'
              : 'bg-ink-950/70 text-cream-faint hover:text-gold-200',
          )}
        >
          <Lock className="size-3.5" />
        </button>
      )}
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </section>
  )
}

export function InventoryScreen({
  onBack,
  onSelectItem,
}: {
  onBack: () => void
  onSelectItem: (item: InventoryPick) => void
}) {
  const [tab, setTab] = useState<string>(TABS[0])
  const [hint, setHint] = useState<string | null>(null)
  const [sheet, setSheet] = useState<SheetModel | null>(null)

  const save = useGameStore((s) => s.save)
  const autoEquip = useGameStore((s) => s.autoEquip)
  const salvageBatch = useGameStore((s) => s.salvageBatch)
  const lockItem = useGameStore((s) => s.lockItem)
  const expandCapacity = useGameStore((s) => s.expandCapacity)
  const usePill = useGameStore((s) => s.usePill)

  const bag = bagSummary(save)
  const cost = expandCost(save)
  const stone = save.resources.stone

  const equips = useMemo(
    () =>
      save.inventory.items
        .map(equipmentBrief)
        .sort((a, b) => qualityRank(b.quality) - qualityRank(a.quality)),
    [save.inventory.items],
  )

  const treasures = useMemo(
    () =>
      save.combat.ownedTreasures
        .map((t) => {
          const active = save.combat.activeTreasures.indexOf(t.defId)
          const passive = save.combat.passiveTreasures.indexOf(t.defId)
          return treasureView(t.defId, active >= 0 ? active : passive >= 0 ? passive : null, t.level, t.tier)
        })
        .filter((v): v is TreasureView => v !== null),
    [save.combat.ownedTreasures, save.combat.activeTreasures, save.combat.passiveTreasures],
  )

  const materials = useMemo(
    () =>
      Object.entries(save.inventory.materials)
        .filter(([, n]) => n > 0)
        .map(([id, n]) => materialView(id, n))
        .sort(
          (a, b) => qualityRank(b.quality) - qualityRank(a.quality) || a.name.localeCompare(b.name, 'zh'),
        ),
    [save.inventory.materials],
  )

  const pills = useMemo(
    () =>
      Object.entries(save.inventory.pills)
        .filter(([, n]) => n > 0)
        .map(([id, n]) => pillView(id, n))
        .sort(
          (a, b) => qualityRank(b.quality) - qualityRank(a.quality) || a.name.localeCompare(b.name, 'zh'),
        ),
    [save.inventory.pills],
  )

  const handleAutoEquip = () => {
    const changed = autoEquip()
    setHint(changed.length > 0 ? `换上新装：${changed.join('、')}` : '行囊中并无更胜一筹之物')
  }

  const handleSalvageBatch = () => {
    const limit = QUALITY_ORDER.indexOf('purple')
    const targets = save.inventory.items.filter(
      (i) => !i.locked && QUALITY_ORDER.indexOf(i.quality) < limit,
    )
    if (targets.length === 0) {
      setHint('并无地品以下的未锁定装备可分解')
      return
    }
    const estimate = targets.reduce((sum, i) => sum + salvageValue(i), 0)
    const go = window.confirm(
      `将分解 ${targets.length} 件地品以下的未锁定装备，约得灵石 ${formatNumber(estimate)}。可曾想清楚？`,
    )
    if (!go) return
    const gain = salvageBatch('purple')
    setHint(gain > 0 ? `分解已毕，得灵石 ${formatNumber(gain)}` : '分解未成，行囊中已无可分解之物')
  }

  const handleExpand = () => {
    const spent = expandCapacity()
    setHint(spent > 0 ? `耗灵石 ${formatNumber(spent)}，库房更宽绰了` : '灵石不足，扩容未成')
  }

  const openEquipSheet = (e: EquipmentBrief) => onSelectItem({ name: e.name })

  const openTreasureSheet = (t: TreasureView) =>
    setSheet({
      kind: 'treasure',
      name: t.name,
      quality: t.quality,
      icon: t.icon,
      art: treasureArt(t.icon),
      desc: t.desc,
      meta: [
        `法宝 · ${t.kindLabel}`,
        `Lv.${t.level}${t.tier > 0 ? ` · ${t.tier} 阶` : ''}`,
        `冷却 ${t.cooldown}s`,
        t.slot === null ? '未曾上阵' : `已列${t.kindLabel}槽第 ${t.slot + 1} 位`,
      ],
    })

  const openMaterialSheet = (m: MaterialView) =>
    setSheet({
      kind: 'material',
      name: m.name,
      quality: m.quality,
      icon: m.icon,
      desc: m.desc,
      meta: [m.category, `存有 ${m.count} 份`],
    })

  const openPillSheet = (p: MaterialView) => {
    const def = PILL_BY_ID[p.id]
    const granted = def?.category === 'cultivation' ? (def.effect.cultivation ?? 0) : 0
    const usable = granted > 0
    setSheet({
      kind: 'pill',
      name: p.name,
      quality: p.quality,
      icon: p.icon,
      desc: p.desc,
      meta: [def ? PILL_CATEGORY_LABEL[def.category] : '丹药', `存有 ${p.count} 枚`],
      action: usable
        ? {
            label: `服下 · 修为 +${formatNumber(granted)}`,
            disabled: false,
            run: () => {
              const ok = usePill(p.id, 1)
              setSheet(null)
              setHint(ok ? `服下${p.name}，修为精进` : '此丹暂不可服')
            },
          }
        : {
            label: '服下',
            disabled: true,
            note: PILL_UNUSABLE_NOTE[def?.category ?? 'permanent'],
            run: () => {},
          },
    })
  }

  const equipGrid = (
    <div className="grid grid-cols-4 gap-1.5">
      {equips.map((e) => (
        <BagCell
          key={e.uid}
          icon={e.icon}
          art={equipArt(e.icon)}
          quality={e.quality}
          corner={`Lv.${e.level}`}
          badge={e.enhance > 0 ? `+${e.enhance}` : undefined}
          locked={e.locked}
          label={`${e.name} Lv.${e.level}`}
          onOpen={() => openEquipSheet(e)}
          onToggleLock={() => {
            const ok = lockItem(e.uid, !e.locked)
            setHint(ok ? (e.locked ? `已解除锁定：${e.name}` : `已锁入匣中：${e.name}`) : '锁定未成')
          }}
        />
      ))}
    </div>
  )

  const treasureGrid = (
    <div className="grid grid-cols-4 gap-1.5">
      {treasures.map((t) => (
        <BagCell
          key={t.defId}
          icon={t.icon}
          art={treasureArt(t.icon)}
          quality={t.quality}
          corner={`Lv.${t.level}`}
          badge={t.tier > 0 ? `${t.tier}阶` : undefined}
          label={`${t.name} Lv.${t.level}`}
          onOpen={() => openTreasureSheet(t)}
        />
      ))}
    </div>
  )

  const materialGrid = (
    <div className="grid grid-cols-4 gap-1.5">
      {materials.map((m) => (
        <BagCell
          key={m.id}
          icon={m.icon}
          quality={m.quality}
          badge={`×${formatNumber(m.count)}`}
          label={`${m.name} ×${m.count}`}
          onOpen={() => openMaterialSheet(m)}
        />
      ))}
    </div>
  )

  const pillGrid = (
    <div className="grid grid-cols-4 gap-1.5">
      {pills.map((p) => (
        <BagCell
          key={p.id}
          icon={p.icon}
          art={pillArt(p.quality)}
          quality={p.quality}
          badge={`×${formatNumber(p.count)}`}
          label={`${p.name} ×${p.count}`}
          onOpen={() => openPillSheet(p)}
        />
      ))}
    </div>
  )

  const emptyTips: Record<string, string> = {
    装备: '行囊中尚无装备，且去斩妖夺宝',
    法宝: '尚未得授法宝',
    材料: '尚无炼器材料',
    丹药: '尚无丹药在身',
  }

  const allEmpty =
    equips.length === 0 && treasures.length === 0 && materials.length === 0 && pills.length === 0

  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader title="背包" onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col gap-2.5 overflow-hidden px-3 pt-3">
        <BuildTabs tabs={TABS} active={tab} onChange={setTab} className="shrink-0" />

        <Panel className="shrink-0 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Package className="size-3.5 shrink-0 text-jade-300" />
            <span className="text-[11px] text-cream-faint">库房</span>
            <span className="font-serif text-xs tabular-nums text-cream">
              {bag.used} / {bag.capacity}
            </span>
            <span className="ml-auto text-[10px] text-cream-faint">锁定 {bag.locked} 件</span>
          </div>
          <StatBar value={bag.pct} className="mt-2" height="h-1.5" />
          <div className="mt-2.5 flex items-center gap-2">
            <InkButton
              variant="ghost"
              size="md"
              className="min-h-[40px] flex-1"
              disabled={cost === 0 || stone < cost}
              onClick={handleExpand}
            >
              {cost === 0 ? '库房已至极致' : `扩容 · 灵石 ${formatNumber(cost)}`}
            </InkButton>
            <span className="shrink-0 text-[10px] text-cream-faint">
              现有灵石 {formatNumber(stone)}
            </span>
          </div>
          {cost > 0 && stone < cost && (
            <p className="mt-1.5 text-[10px] text-blood-400">
              灵石不足，尚缺 {formatNumber(cost - stone)}
            </p>
          )}
        </Panel>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2 no-scrollbar">
          {tab === '全部' && allEmpty && (
            <p className="py-6 text-center text-[11px] text-cream-faint">
              行囊空空如也，且去斩妖夺宝
            </p>
          )}
          {tab === '全部' && !allEmpty && (
            <>
              {equips.length > 0 && <Group title={`装备 · ${equips.length}`}>{equipGrid}</Group>}
              {treasures.length > 0 && <Group title={`法宝 · ${treasures.length}`}>{treasureGrid}</Group>}
              {materials.length > 0 && <Group title={`材料 · ${materials.length}`}>{materialGrid}</Group>}
              {pills.length > 0 && <Group title={`丹药 · ${pills.length}`}>{pillGrid}</Group>}
            </>
          )}

          {tab === '装备' &&
            (equips.length > 0 ? (
              equipGrid
            ) : (
              <p className="py-6 text-center text-[11px] text-cream-faint">{emptyTips.装备}</p>
            ))}

          {tab === '法宝' &&
            (treasures.length > 0 ? (
              treasureGrid
            ) : (
              <p className="py-6 text-center text-[11px] text-cream-faint">{emptyTips.法宝}</p>
            ))}

          {tab === '材料' &&
            (materials.length > 0 ? (
              materialGrid
            ) : (
              <p className="py-6 text-center text-[11px] text-cream-faint">{emptyTips.材料}</p>
            ))}

          {tab === '丹药' &&
            (pills.length > 0 ? (
              pillGrid
            ) : (
              <p className="py-6 text-center text-[11px] text-cream-faint">{emptyTips.丹药}</p>
            ))}
        </div>

        {hint && (
          <p className="shrink-0 rounded-sm border border-jade-500/25 bg-jade-800/20 px-2.5 py-1.5 text-[11px] leading-relaxed text-jade-200">
            {hint}
          </p>
        )}
      </div>

      <div className="relative z-10 flex items-center gap-2 border-t border-gold-300/15 bg-ink-950/80 px-3 py-3">
        <InkButton
          variant="jade"
          size="md"
          className="min-h-[40px] flex-1"
          onClick={handleAutoEquip}
        >
          <Sparkles className="size-3.5" />
          一键穿戴
        </InkButton>
        <InkButton
          variant="ghost"
          size="md"
          className="min-h-[40px] flex-1"
          onClick={handleSalvageBatch}
        >
          <Wand2 className="size-3.5" />
          一键分解
        </InkButton>
      </div>

      {sheet && (
        <div
          className="absolute inset-0 z-30 flex items-end justify-center"
          role="dialog"
          aria-label={`${SHEET_KIND_LABEL[sheet.kind]}详情`}
        >
          <button
            type="button"
            aria-label="收起"
            onClick={() => setSheet(null)}
            className="absolute inset-0 animate-fade-in bg-ink-950/75 backdrop-blur-[2px]"
          />
          <div className="relative m-3 w-full animate-rise overflow-hidden rounded-lg panel-ink px-3.5 py-3.5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/60 to-transparent" />
            <div className="flex items-center gap-3">
              <span
                className="flex size-14 shrink-0 items-center justify-center rounded-md bg-gradient-to-b from-ink-800 to-ink-950"
                style={{
                  boxShadow: `inset 0 0 0 1.5px ${qualityView(sheet.quality).ring}, 0 0 16px ${qualityView(sheet.quality).glow}`,
                }}
              >
                {sheet.art ? (
                  <img src={sheet.art} alt="" className="size-12 object-contain" />
                ) : (
                  <GameIcon name={sheet.icon} className="size-7 text-cream" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate font-serif text-sm font-bold text-cream">{sheet.name}</p>
                <QualityBadge quality={sheet.quality} className="mt-1 inline-block" />
                <p className="mt-1 text-[10px] text-cream-faint">{sheet.meta.join(' · ')}</p>
              </div>
            </div>

            {sheet.desc && (
              <p className="mt-3 rounded-sm border border-gold-300/10 bg-ink-950/50 px-2.5 py-2 text-[11px] leading-relaxed text-cream-dim">
                {sheet.desc}
              </p>
            )}

            <div className="mt-3 flex items-center gap-2">
              <InkButton
                variant="ghost"
                size="md"
                className="min-h-[40px] flex-1"
                onClick={() => setSheet(null)}
              >
                收起
              </InkButton>
              {sheet.action && (
                <InkButton
                  variant="primary"
                  size="md"
                  className="min-h-[40px] flex-1"
                  disabled={sheet.action.disabled}
                  onClick={sheet.action.run}
                >
                  {sheet.action.label}
                </InkButton>
              )}
            </div>
            {sheet.action?.note && sheet.action.disabled && (
              <p className="mt-1.5 text-center text-[10px] text-cream-faint">{sheet.action.note}</p>
            )}
          </div>
        </div>
      )}
    </ScreenFrame>
  )
}
