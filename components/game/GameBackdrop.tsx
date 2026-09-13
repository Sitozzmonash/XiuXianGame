import Image from 'next/image'
import { cn } from '@/lib/utils'

export function GameBackdrop({
  src = '/images/bg-ink-mountains.png',
  className,
  overlay = true,
  children,
}: {
  src?: string
  className?: string
  overlay?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden bg-ink-950', className)}>
      <Image
        src={src}
        alt=""
        fill
        priority
        sizes="(max-width: 430px) 100vw, 430px"
        className="object-cover opacity-70"
      />
      {overlay && (
        <>
          <div className="absolute inset-0 ink-vignette" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/70 via-transparent to-ink-950/90" />
        </>
      )}
      {children}
    </div>
  )
}
