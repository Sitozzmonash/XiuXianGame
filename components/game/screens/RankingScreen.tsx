'use client'

import { useGameStore } from '@/lib/game/state/store'
import { power } from '@/lib/game/state/selectors'
import { flatStage } from '@/lib/game/config/realms'
import { SCHOOL_LABEL } from '@/lib/game/types'
import { formatNumber } from '@/lib/game/utils'
import { ComingSoon } from './ComingSoon'

/* 排行榜：PRD 30 章需要服务端快照，后端尚未提供。
   这里展示玩家自己的真实成绩（随时可对照未来上榜的门槛），不编造他人名次。 */
export function RankingScreen({ onBack }: { onBack: () => void }) {
  const save = useGameStore((s) => s.save)
  const stage = flatStage(save.profile.stageId)

  return (
    <ComingSoon
      title="仙缘榜"
      backdrop="/images/bg-ink-mountains.png"
      chapter="Phase 5 · 长期养成"
      summary="以关卡、战力、境界与其他修士一较高下。榜单只提供展示、称号与少量仙玉，不构成强竞争压力。"
      activeNote={
        <ul className="flex flex-col gap-1">
          <li className="flex items-center justify-between">
            <span>最高关卡</span>
            <span className="tabular-nums text-jade-300">第 {save.progress.maxStage} 关</span>
          </li>
          <li className="flex items-center justify-between">
            <span>综合战力</span>
            <span className="tabular-nums text-gold-200">{formatNumber(power(save))}</span>
          </li>
          <li className="flex items-center justify-between">
            <span>修仙境界</span>
            <span className="text-cream">{stage.stage.label}</span>
          </li>
          <li className="flex items-center justify-between">
            <span>流派</span>
            <span className="text-cream">{SCHOOL_LABEL[save.profile.school]}</span>
          </li>
          <li className="mt-1 text-[11px] leading-relaxed text-cream-faint">
            以上为你的真实成绩；全服榜单开启后可直接对照排名。
          </li>
        </ul>
      }
      items={[
        { icon: 'map', name: '最高关卡榜', desc: '按已通关的最高关卡排序，推关进度即名次。' },
        { icon: 'sword', name: '综合战力榜', desc: '按战力估算排序，反映装备与法宝的养成程度。' },
        { icon: 'lotus', name: '修仙境界榜', desc: '按大境界与阶段排序，突破即跃升。' },
        { icon: 'gate', name: '通天塔榜', desc: '长期爬塔，每十层一位特殊首领，另设独立榜单。' },
      ]}
      onBack={onBack}
    />
  )
}
