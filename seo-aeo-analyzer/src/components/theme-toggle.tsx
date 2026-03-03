'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

const OPTIONS = [
  { value: 'light',  Icon: Sun,     label: 'Light' },
  { value: 'dark',   Icon: Moon,    label: 'Dark' },
  { value: 'system', Icon: Monitor, label: 'System' },
] as const

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <div className="flex items-center gap-1.5">
      {/* Show resolved theme when system is selected, so user can see what's detected */}
      {theme === 'system' && (
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          ({resolvedTheme})
        </span>
      )}
      <div className="flex items-center gap-0.5 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-slate-100 dark:bg-slate-900">
        {OPTIONS.map(({ value, Icon, label }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            title={label}
            className={`p-1.5 rounded transition-colors ${
              theme === value
                ? 'bg-white dark:bg-slate-800 text-cyan-500 shadow-sm'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>
    </div>
  )
}
