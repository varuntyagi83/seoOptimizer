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

const PAGE_STEPS = [10, 25, 50, 100]

export function CrawlSettings({ maxPages, maxDepth, onChange, disabled }: CrawlSettingsProps) {
  function setPreset(name: keyof typeof PRESETS) {
    onChange(PRESETS[name])
  }

  function handlePageSlider(value: number[]) {
    const idx = Math.round(value[0])
    onChange({ maxPages: PAGE_STEPS[idx], maxDepth })
  }

  function handleDepthSlider(value: number[]) {
    onChange({ maxPages, maxDepth: value[0] })
  }

  const pageIdx = PAGE_STEPS.indexOf(maxPages)

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
            className={`flex-1 border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-400 transition-colors ${
              maxPages === PRESETS[name].maxPages && maxDepth === PRESETS[name].maxDepth
                ? 'border-cyan-500 text-cyan-400 bg-cyan-950/30'
                : 'bg-transparent'
            }`}
          >
            {name}
          </Button>
        ))}
      </div>

      {/* Max pages slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Max Pages</span>
          <span className="text-cyan-400 font-mono font-semibold">{maxPages} pages</span>
        </div>
        <Slider
          min={0}
          max={3}
          step={1}
          value={[pageIdx >= 0 ? pageIdx : 1]}
          onValueChange={handlePageSlider}
          disabled={disabled}
          className="[&_[role=slider]]:bg-cyan-400 [&_[role=slider]]:border-cyan-400"
        />
        <div className="flex justify-between text-xs">
          {PAGE_STEPS.map(p => (
            <span key={p} className={p === maxPages ? 'text-cyan-400 font-semibold' : 'text-slate-600'}>
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Max depth slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Crawl Depth</span>
          <span className="text-cyan-400 font-mono font-semibold">depth {maxDepth}</span>
        </div>
        <Slider
          min={1}
          max={3}
          step={1}
          value={[maxDepth]}
          onValueChange={handleDepthSlider}
          disabled={disabled}
          className="[&_[role=slider]]:bg-cyan-400 [&_[role=slider]]:border-cyan-400"
        />
        <div className="flex justify-between text-xs text-slate-600">
          <span>Shallow</span>
          <span>Medium</span>
          <span>Deep</span>
        </div>
      </div>
    </div>
  )
}
