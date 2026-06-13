import { useSettingsStore } from '../../stores/useSettingsStore'
import { BREAK_MINUTES, FOCUS_MINUTES, type Theme, type WeekStart } from '../../types/models'
import { Section, Row, Toggle, ChipSelect } from './controls'
import { CategoryManager } from './CategoryManager'
import { DataSection } from './DataSection'

const THEMES: Theme[] = ['light', 'dark', 'system']
const WEEK_STARTS: WeekStart[] = [1, 0, 6]
const WEEK_LABEL: Record<WeekStart, string> = { 0: 'Sunday', 1: 'Monday', 6: 'Saturday' }
const HOURS = Array.from({ length: 24 }, (_, h) => h)

export function SettingsView() {
  const { settings, update } = useSettingsStore()
  const s = settings

  return (
    <div className="w-full overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 sm:p-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>

        <Section title="Appearance">
          <Row label="Theme">
            <ChipSelect options={THEMES} value={s.theme} onChange={(v) => void update({ theme: v })} format={(t) => t[0].toUpperCase() + t.slice(1)} />
          </Row>
        </Section>

        <Section title="Timer">
          <Row label="Default session length" hint="minutes">
            <ChipSelect options={FOCUS_MINUTES} value={s.defaultFocusMinutes} onChange={(v) => void update({ defaultFocusMinutes: v })} />
          </Row>
          <Row label="Default break length" hint="minutes">
            <ChipSelect options={BREAK_MINUTES} value={s.defaultBreakMinutes} onChange={(v) => void update({ defaultBreakMinutes: v })} />
          </Row>
          <Row label="Long break every" hint="focus sessions">
            <ChipSelect options={[2, 3, 4, 5, 6]} value={s.longBreakEvery} onChange={(v) => void update({ longBreakEvery: v })} />
          </Row>
          <Row label="Auto-start breaks" hint="Begin the break automatically when a session ends.">
            <Toggle checked={s.autoStartBreak} onChange={(v) => void update({ autoStartBreak: v })} label="Auto-start breaks" />
          </Row>
          <Row label="Auto-advance queue" hint="Load the next task after a break finishes.">
            <Toggle checked={s.autoAdvanceQueue} onChange={(v) => void update({ autoAdvanceQueue: v })} label="Auto-advance queue" />
          </Row>
        </Section>

        <Section title="Sound & notifications">
          <Row label="Completion sound">
            <Toggle checked={s.soundEnabled} onChange={(v) => void update({ soundEnabled: v })} label="Completion sound" />
          </Row>
          <Row label="Volume">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.soundVolume}
              disabled={!s.soundEnabled}
              onChange={(e) => void update({ soundVolume: Number(e.target.value) })}
              aria-label="Sound volume"
              className="w-40 accent-blue-500 disabled:opacity-40"
            />
          </Row>
          <Row label="Ticking sound" hint="A soft tick each second while focusing.">
            <Toggle checked={s.tickSoundEnabled} onChange={(v) => void update({ tickSoundEnabled: v })} label="Ticking sound" />
          </Row>
          <Row label="Desktop notifications">
            <Toggle checked={s.notificationsEnabled} onChange={(v) => void update({ notificationsEnabled: v })} label="Desktop notifications" />
          </Row>
        </Section>

        <Section title="Categories" desc="Rename, recolor, add, or archive. Archiving keeps a category's history.">
          <CategoryManager />
        </Section>

        <Section title="Schedule">
          <Row label="Week starts on">
            <ChipSelect options={WEEK_STARTS} value={s.weekStartsOn} onChange={(v) => void update({ weekStartsOn: v })} format={(w) => WEEK_LABEL[w]} />
          </Row>
          <Row label="Day start hour" hint="Sessions before this hour count toward the previous day.">
            <select
              value={s.dayStartHour}
              onChange={(e) => void update({ dayStartHour: Number(e.target.value) })}
              aria-label="Day start hour"
              className="field py-1.5"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
              ))}
            </select>
          </Row>
        </Section>

        <Section title="Data">
          <DataSection />
        </Section>

        <p className="pb-4 text-center text-xs text-gray-400">FocusFlow · all data stays on this device</p>
      </div>
    </div>
  )
}
