'use client'

import { useState } from 'react'
import { myRank, ranking, rankingTabs } from '@/lib/game-data'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { BuildTabs } from '../Tabs'
import { RankItem } from '../RankItem'

export function RankingScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<string>(rankingTabs[0])

  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader title="排行榜" onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col gap-3 overflow-hidden px-3 pt-3">
        <BuildTabs
          tabs={rankingTabs}
          active={tab}
          onChange={setTab}
          className="shrink-0"
        />

        <div className="flex shrink-0 items-center justify-between px-1 text-[10px] text-cream-faint">
          <span>名次 / 道友</span>
          <span>{tab === '最高关卡' ? '关卡' : '战力'}</span>
        </div>

        <div className="flex-1 overflow-y-auto pb-2 no-scrollbar">
          <ul className="flex flex-col gap-1.5">
            {ranking.map((entry) => (
              <li key={entry.rank}>
                <RankItem entry={entry} />
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0 border-t border-gold-300/15 pt-2.5">
          <RankItem entry={myRank} highlight />
          <p className="mt-1.5 text-center text-[10px] text-cream-faint">
            排行榜每小时更新一次
          </p>
        </div>
      </div>
    </ScreenFrame>
  )
}
