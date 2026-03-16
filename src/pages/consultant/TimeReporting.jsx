import { useState, useEffect, useCallback, useRef } from 'react'
import {
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  format,
  getISOWeek,
  getYear,
  parseISO,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Check, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const WEEKDAYS = [0, 1, 2, 3, 4] // Mon–Fri offsets from weekStart

const TimeReporting = () => {
  const { user } = useAuth()
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [entries, setEntries] = useState({}) // { 'YYYY-MM-DD': hours }
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const debounceTimers = useRef({})

  const weekEnd = addDays(weekStart, 4) // Friday
  const weekNumber = getISOWeek(weekStart)
  const weekYear = getYear(weekStart)

  const days = WEEKDAYS.map((offset) => {
    const date = addDays(weekStart, offset)
    return {
      date,
      key: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEEE'),
      formatted: format(date, 'MMM d'),
    }
  })

  const totalHours = days.reduce((sum, day) => {
    const val = parseFloat(entries[day.key])
    return sum + (isNaN(val) ? 0 : val)
  }, 0)

  // Fetch entries for the current week
  const fetchEntries = useCallback(async () => {
    if (!user) return

    const monday = format(weekStart, 'yyyy-MM-dd')
    const friday = format(addDays(weekStart, 4), 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('time_entries')
      .select('work_date, hours')
      .eq('user_id', user.id)
      .gte('work_date', monday)
      .lte('work_date', friday)

    if (error) {
      toast.error('Failed to load time entries')
      return
    }

    const map = {}
    data.forEach((entry) => {
      map[entry.work_date] = entry.hours
    })
    setEntries(map)
    setSaved(false)
  }, [user, weekStart])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Upsert a single entry with debounce
  const saveEntry = useCallback(
    (dateKey, hours) => {
      if (debounceTimers.current[dateKey]) {
        clearTimeout(debounceTimers.current[dateKey])
      }

      debounceTimers.current[dateKey] = setTimeout(async () => {
        if (!user) return

        setSaving(true)
        setSaved(false)

        // Check if entry already exists
        const { data: existing } = await supabase
          .from('time_entries')
          .select('id')
          .eq('user_id', user.id)
          .eq('work_date', dateKey)
          .maybeSingle()

        let error
        if (existing) {
          ({ error } = await supabase
            .from('time_entries')
            .update({ hours })
            .eq('id', existing.id))
        } else {
          ({ error } = await supabase
            .from('time_entries')
            .insert({ user_id: user.id, work_date: dateKey, hours }))
        }

        setSaving(false)

        if (error) {
          console.error('Save error:', error)
          toast.error(`Failed to save: ${error.message}`)
        } else {
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        }
      }, 600)
    },
    [user]
  )

  const handleHoursChange = (dateKey, value) => {
    // Replace comma with dot for decimal input
    const raw = value === '' ? '' : value.replace(',', '.')
    const num = parseFloat(raw)

    // Allow empty, partial input like "7." or valid numbers >= 0
    if (raw !== '' && raw !== '.' && !/^\d*\.?\d*$/.test(raw)) return
    if (raw !== '' && raw !== '.' && !isNaN(num) && num < 0) return

    setEntries((prev) => ({ ...prev, [dateKey]: raw }))

    if (raw !== '' && raw !== '.' && !isNaN(num) && num >= 0) {
      saveEntry(dateKey, num)
    }
  }

  const navigateWeek = (direction) => {
    setWeekStart((prev) =>
      direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
    )
  }

  return (
    <div className="time-reporting">
      <div className="page-header">
        <div>
          <h1>Time Reporting</h1>
          <p className="text-muted">
            Week {weekNumber}, {weekYear}
          </p>
        </div>
        <div className="save-indicator">
          {saving && (
            <span className="save-status saving">
              <Loader size={14} className="spin" /> Saving...
            </span>
          )}
          {saved && !saving && (
            <span className="save-status saved">
              <Check size={14} /> Saved
            </span>
          )}
        </div>
      </div>

      <div className="week-navigator">
        <button
          className="btn btn-sm"
          onClick={() => navigateWeek('prev')}
          aria-label="Previous week"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="week-range">
          {format(weekStart, 'MMM d')} &ndash; {format(weekEnd, 'MMM d, yyyy')}
        </span>
        <button
          className="btn btn-sm"
          onClick={() => navigateWeek('next')}
          aria-label="Next week"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="card">
        <div className="day-columns">
          {days.map((day) => {
            const value = entries[day.key]
            const displayValue = value === undefined || value === null ? '' : value
            return (
              <div key={day.key} className="day-column">
                <span className="day-name">{day.label}</span>
                <span className="day-date">{day.formatted}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="form-input hours-input"
                  placeholder="0"
                  value={displayValue}
                  onChange={(e) => handleHoursChange(day.key, e.target.value)}
                />
                <span className="hours-label">hrs</span>
              </div>
            )
          })}
          <div className="day-column total-column">
            <span className="day-name">Total</span>
            <span className="day-date">&nbsp;</span>
            <span className="total-value">{totalHours}</span>
            <span className="hours-label">hrs</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TimeReporting
