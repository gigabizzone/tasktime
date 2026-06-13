import { useRef, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { toPng } from 'html-to-image'
import { useReportData } from '../../lib/useReportData'
import { toCSV, type RangeType } from '../../lib/reports'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { downloadText, triggerDownload } from '../../lib/download'
import { toast } from '../../stores/useToastStore'
import { RangeNav, rangeLabel } from './RangeNav'
import { SummaryStats } from './SummaryStats'
import { ActiveTimeChart } from './ActiveTimeChart'
import { CategoryDonut } from './CategoryDonut'
import { DetailList } from './DetailList'
import { EstimateAccuracy } from './EstimateAccuracy'
import { YearHeatmap } from './YearHeatmap'
import type { ID } from '../../types/models'

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ReportsView() {
  const settings = useSettingsStore((s) => s.settings)
  const [type, setType] = useState<RangeType>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [selectedCat, setSelectedCat] = useState<ID | null>(null)
  const captureRef = useRef<HTMLDivElement>(null)

  const data = useReportData(type, anchor)
  const opts = { weekStartsOn: settings.weekStartsOn, dayStartHour: settings.dayStartHour }

  const exportCSV = () => {
    const csv = toCSV(data.sessions, data.tasks, data.categories, type, anchor, opts)
    downloadText(`focusflow-${type}-${format(anchor, 'yyyy-MM-dd')}.csv`, csv)
    toast('Exported CSV')
  }

  const exportPNG = async () => {
    if (!captureRef.current) return
    try {
      const url = await toPng(captureRef.current, {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#030712' : '#f9fafb',
        pixelRatio: 2,
      })
      triggerDownload(url, `focusflow-${type}-${format(anchor, 'yyyy-MM-dd')}.png`)
      toast('Exported PNG')
    } catch {
      toast('PNG export failed')
    }
  }

  return (
    <div className="flex w-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangeNav
          type={type}
          anchor={anchor}
          weekStartsOn={settings.weekStartsOn}
          onType={setType}
          onAnchor={setAnchor}
        />
        <div className="flex gap-2 text-sm">
          <button
            onClick={exportCSV}
            className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            Export CSV
          </button>
          <button
            onClick={() => void exportPNG()}
            className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            Export PNG
          </button>
        </div>
      </div>

      <div ref={captureRef} className="flex flex-col gap-4">
        <SummaryStats stats={data.summary} streaks={data.streaks} />

        <Card title={`Active time · ${rangeLabel(type, anchor, settings.weekStartsOn)}`}>
          <ActiveTimeChart series={data.series} categories={data.categories} />
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="By category">
            <CategoryDonut
              totals={data.categoryTotals}
              categories={data.categories}
              selected={selectedCat}
              onSelect={setSelectedCat}
            />
            {selectedCat && (
              <DetailList
                selected={selectedCat}
                category={data.categories.find((c) => c.id === selectedCat)}
                sessions={data.sessions}
                tasks={data.tasks}
                type={type}
                anchor={anchor}
                opts={opts}
              />
            )}
          </Card>

          <Card title="Estimate accuracy">
            <EstimateAccuracy rows={data.estimates} categories={data.categories} />
          </Card>
        </div>

        {type === 'year' && (
          <Card title={`Consistency · ${format(anchor, 'yyyy')}`}>
            <YearHeatmap anchor={anchor} data={data.heatmap} weekStartsOn={settings.weekStartsOn} />
          </Card>
        )}
      </div>
    </div>
  )
}
