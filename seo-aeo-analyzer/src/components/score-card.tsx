'use client'

import { useEffect, useState } from 'react'

interface ScoreCardProps {
  label: string
  score: number
  size?: number
}

function getColor(score: number): string {
  if (score >= 80) return '#22d3ee'   // cyan-400
  if (score >= 60) return '#a3e635'   // lime-400
  if (score >= 40) return '#facc15'   // yellow-400
  return '#f87171'                     // red-400
}

function getStatus(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Needs Work'
  return 'Poor'
}

export function ScoreCard({ label, score, size = 120 }: ScoreCardProps) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    let frame: number
    const start = performance.now()
    const duration = 800

    function animate(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(eased * score))
      if (progress < 1) frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [score])

  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (displayed / 100) * circumference
  const color = getColor(score)
  const status = getStatus(score)

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={8}
        />
        {/* Score ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.05s linear' }}
        />
      </svg>

      {/* Score number centered inside ring */}
      <div className="relative" style={{ marginTop: -(size + 8) }}>
        <div
          className="flex flex-col items-center justify-center"
          style={{ width: size, height: size }}
        >
          <span className="text-3xl font-bold tabular-nums" style={{ color }}>
            {displayed}
          </span>
          <span className="text-xs text-slate-500 mt-0.5">/ 100</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 mt-1">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {status}
        </span>
      </div>
    </div>
  )
}
