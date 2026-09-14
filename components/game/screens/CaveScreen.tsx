'use client'

import { useGameStore } from '@/lib/game/state/store'
import { idleBreakdown } from '@/lib/game/engine/idle'
import { formatNumber } from '@/lib/game/utils'
import { ComingSoon } from './ComingSoon'

/* 洞府：设施养成属于 PRD 25 章，配置与状态层尚未提供，这里只展示
   已经真实生效的洞府倍率与开发计划，不编造设施等级。 */
export function CaveScreen({ onBack }: { onBack: () => void }) {
  const save = useGameStore((s) => s.save)
  const bd = idleBreakdown(save)

  return (
    <ComingSoon
      title="洞府"
      backdrop="/images/cave-dwelling.png"
      chapter="Phase 5 · 长期养成"
      summary="开辟属于自己的洞府，聚灵、种药、炼丹、养兽，让修为在离线时也自行增长。"
      activeNote={
        <ul className="flex flex-col gap-1">
          <li className="flex items-center justify-between">
            <span>洞府倍率</span>
            <span className="tabular-nums text-jade-300">
              ×{bd.caveFactor.toFixed(2)}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span>当前离线修为</span>
            <span className="tabular-nums text-jade-300">
              每秒 {formatNumber(bd.cultivationPerSec)}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span>当前离线灵石</span>
            <span className="tabular-nums text-gold-200">
              每秒 {formatNumber(bd.stonePerSec)}
            </span>
          </li>
          <li className="mt-1 text-[11px] leading-relaxed text-cream-faint">
            洞府尚未开辟，以上为当前真实结算值；开辟后倍率将进一步提升。
          </li>
        </ul>
      }
      items={[
        { icon: 'array', name: '聚灵阵', desc: '提升挂机修为，阵法等级越高，离线上限内的收益越厚。' },
        { icon: 'field', name: '灵田', desc: '种植灵药，成熟后收取炼丹材料。' },
        { icon: 'furnace', name: '炼丹房', desc: '根据丹方炼制修为丹、突破丹与战斗丹。' },
        { icon: 'anvil', name: '炼器室', desc: '以装备胚子与材料炼出随机装备与随机词条。' },
        { icon: 'beast', name: '灵兽园', desc: '培养出战灵兽，解锁辅助灵兽位。' },
        { icon: 'library', name: '藏经阁', desc: '闭关参悟功法，提升功法等级上限。' },
        { icon: 'gift', name: '会客亭', desc: '承载 NPC 主动拜访等人物事件。' },
        { icon: 'shield', name: '问心台', desc: '高境界的道心与心魔事件，影响突破走向。' },
      ]}
      onBack={onBack}
    />
  )
}
