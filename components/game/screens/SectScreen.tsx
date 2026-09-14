'use client'

import { useGameStore } from '@/lib/game/state/store'
import { KARMA_LABEL, type KarmaKey } from '@/lib/game/types'
import { ComingSoon } from './ComingSoon'

/* 宗门：PRD 26 章为 NPC 宗门系统，配置与状态层尚未提供，
   这里展示已在存档里真实累积的声望变量与开发计划。 */

const FAME_KEYS: KarmaKey[] = ['qingxuanFame', 'yaozuFame', 'youmingFame']

export function SectScreen({ onBack }: { onBack: () => void }) {
  const save = useGameStore((s) => s.save)

  return (
    <ComingSoon
      title="宗门"
      backdrop="/images/sect-gate.png"
      chapter="Phase 5 · 长期养成"
      summary="加入宗门、做宗门任务、学宗门功法、参与宗门事件，最终改变宗门派系倾向。"
      activeNote={
        <ul className="flex flex-col gap-1">
          {FAME_KEYS.map((k) => (
            <li key={k} className="flex items-center justify-between">
              <span>{KARMA_LABEL[k]}声望</span>
              <span className="tabular-nums text-jade-300">{save.karma[k] ?? 0}</span>
            </li>
          ))}
          <li className="mt-1 text-[11px] leading-relaxed text-cream-faint">
            声望已在剧情选择中真实累积；加入宗门后它将决定你能接触到的功法与任务。
          </li>
        </ul>
      }
      items={[
        { icon: 'sword', name: '青玄剑宗', desc: '正道剑修宗门，重秩序与传承，剑修功法最全。' },
        { icon: 'flame', name: '五雷山', desc: '雷法宗门，善阵法与雷术，法修路线重镇。' },
        { icon: 'shield', name: '镇岳门', desc: '体修宗门，守护边境与古封印，专精肉身与反伤。' },
        { icon: 'drop', name: '幽冥谷', desc: '被正道视为魔门，内部派系复杂，魂修与魔功之源。' },
        { icon: 'field', name: '百草谷', desc: '炼丹与灵植势力，高阶丹药与灵田之法的来源。' },
        { icon: 'vase', name: '海天楼', desc: '海外商会与情报组织，掌握海外地图与高阶法宝。' },
      ]}
      onBack={onBack}
    />
  )
}
