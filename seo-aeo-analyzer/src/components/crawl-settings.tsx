'use client'

import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'

interface CrawlSettingsProps {
  maxPages: number
  maxDepth: number
  onChange: (settings: { maxPages: number; maxDepth: number }) => void
  disabled?: boolean
}

const PRESETS = {
  Quick:    { maxPages: 10, maxDepth: 1 },
  Standard: { maxPages: 25, maxDepth: 2 },
  Deep:     { maxPages: 100, maxDepth: 3 },
}

export function CrawlSettings({ maxPages, maxDepth, onChange, disabled }: CrawlSettingsProps) {
  function setPreset(name: keyof typeof PRESETS) {
    onChange(PRESETS[name])
  }

  function handlePageSlider(value: number[]) {
    onChange({ maxPages: value[0], maxDepth })
  }

  function handleDepthSlider(value: number[]) {
    onChange({ maxPages, maxDepth: value[0] })
  }

  return (
    <div className="space-y-5">
      {/* Preset buttons */}
      <div className="flex gap-2">
        {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(name => (
          <Button
            key={name}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => setPreset(name)}
            className={`flex-1 transition-colors ${
              maxPages === PRESETS[name].maxPages && maxDepth === PRESETS[name].maxDepth
                ? 'border-cyan-500 text-cyan-500 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30'
                : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-400 hover:text-cyan-500 dark:hover:border-cyan-500 dark:hover:text-cyan-400 bg-transparent'
            }`}
          >
            {name}
          </Button>
        ))}
      </div>

      {/* Max pages slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-700 dark:text-white">Max Pages</span>
          <span className="text-cyan-500 dark:text-cyan-400 font-mono font-semibold">{maxPages} pages</span>
        </div>
        <Slider
          min={1}
          max={50}
          step={1}
          value={[maxPages]}
          onValueChange={handlePageSlider}
          disabled={disabled}
          className="[&_[role=slider]]:bg-cyan-400 [&_[role=slider]]:border-cyan-400 [&_[data-slot=slider-track]]:bg-slate-200 dark:[&_[data-slot=slider-track]]:bg-white/20 [&_[data-slot=slider-range]]:bg-cyan-500 dark:[&_[data-slot=slider-range]]:bg-white"
        />
        <div className="flex justify-between text-xs text-slate-400 dark:text-slate-600">
          <span>1</span>
          <span>10</span>
          <span>25</span>
          <span>50</span>
        </div>
      </div>

      {/* Max depth slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-700 dark:text-white">Crawl Depth</span>
          <span className="text-cyan-500 dark:text-cyan-400 font-mono font-semibold">depth {maxDepth}</span>
        </div>
        <Slider
          min={1}
          max={3}
          step={1}
          value={[maxDepth]}
          onValueChange={handleDepthSlider}
          disabled={disabled}
          className="[&_[role=slider]]:bg-cyan-400 [&_[role=slider]]:border-cyan-400 [&_[data-slot=slider-track]]:bg-slate-200 dark:[&_[data-slot=slider-track]]:bg-white/20 [&_[data-slot=slider-range]]:bg-cyan-500 dark:[&_[data-slot=slider-range]]:bg-white"
        />
        <div className="flex justify-between text-xs text-slate-400 dark:text-slate-600">
          <span>Shallow</span>
          <span>Medium</span>
          <span>Deep</span>
        </div>
      </div>
    </div>
  )
}
