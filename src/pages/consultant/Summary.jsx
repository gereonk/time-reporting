import { useState, useEffect, useCallback } from 'react'
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  format,
  eachDayOfInterval,
  isWeekend,
  parseISO,
  isWithinInterval,
  isBefore,
  isAfter,
  max,
  min,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Clock, Palmtree, Briefcase } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { logError } from '../../lib/errorLog'
import { useAuth } from '../../contexts/AuthContext'

const Summary = () => {
  const { user } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [entries, setEntries] = useState({}) // { 'YYYY-MM-DD': hours }
  const [vacationDates, setVacationDates] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const workingDays = allDays.filter((d) => !isWeekend(d))

  const fetchData = useCallback(async () => {
    if (!user) return

    setLoading(true)

    const startStr = format(monthStart, 'yyyy-MM-dd')
    const endStr = format(monthEnd, 'yyyy-MM-dd')

    const [entriesRes, vacationsRes] = await Promise.all([
      supabase
        .from('time_entries')
        .select('work_date, hours')
        .eq('user_id', user.id)
        .gte('work_date', startStr)
        .lte('work_date', endStr),
      supabase
        .from('vacations')
        .select('start_date, end_date')
        .eq('user_id', user.id)
        .lte('start_date', endStr)
        .gte('end_date', startStr),
    ])

    if (entriesRes.error) {
      logError('Summary.fetch', 'Failed to load time entries', entriesRes.error.message)
      toast.error('Failed to load time entries')
    }
    if (vacationsRes.error) {
      logError('Summary.fetch', 'Failed to load vacations', vacationsRes.error.message)
      toast.error('Failed to load vacations')
    }

    // Build entries map
    const entriesMap = {}
    ;(entriesRes.data || []).forEach((e) => {
      entriesMap[e.work_date] = e.hours
    })
    setEntries(entriesMap)

    // Build vacation dates set
    const vacDates = new Set()
    ;(vacationsRes.data || []).forEach((v) => {
      const vStart = max([parseISO(v.start_date), monthStart])
      const vEnd = min([parseISO(v.end_date), monthEnd])
      const days = eachDayOfInterval({ start: vStart, end: vEnd })
      days.forEach((d) => {
        if (!isWeekend(d)) {
          vacDates.add(format(d, 'yyyy-MM-dd'))
        }
      })
    })
    setVacationDates(vacDates)

    setLoading(false)
  }, [user, currentMonth])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalHours = Object.values(entries).reduce(
    (sum, h) => sum + (parseFloat(h) || 0),
    0
  )
  const vacationDayCount = vacationDates.size
  const workingDayCount = workingDays.length

  const navigateMonth = (direction) => {
    setCurrentMonth((prev) =>
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    )
  }

  const getDayStatus = (dateKey) => {
    const hasHours = entries[dateKey] !== undefined && entries[dateKey] > 0
    const isVacation = vacationDates.has(dateKey)

    if (isVacation) return 'vacation'
    if (hasHours) return 'reported'
    return 'missing'
  }

  return (
    <div className="summary-page">
      <div className="page-header">
        <h1>Monthly Summary</h1>
      </div>

      <div className="month-navigator">
        <button
          className="btn btn-sm"
          onClick={() => navigateMonth('prev')}
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="month-label">{format(currentMonth, 'MMMM yyyy')}</span>
        <button
          className="btn btn-sm"
          onClick={() => navigateMonth('next')}
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="summary-cards">
        <div className="card summary-card">
          <div className="summary-icon hours-icon">
            <Clock size={24} />
          </div>
          <div className="summary-value">{totalHours}</div>
          <div className="summary-label">Hours Reported</div>
        </div>

        <div className="card summary-card">
          <div className="summary-icon vacation-icon">
            <Palmtree size={24} />
          </div>
          <div className="summary-value">{vacationDayCount}</div>
          <div className="summary-label">Vacation, planned absence days</div>
        </div>

        <div className="card summary-card">
          <div className="summary-icon workdays-icon">
            <Briefcase size={24} />
          </div>
          <div className="summary-value">{workingDayCount}</div>
          <div className="summary-label">Working Days</div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Daily Breakdown</h2>
        {loading ? (
          <p className="text-muted">Loading...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Status</th>
                <th className="text-right">Hours</th>
              </tr>
            </thead>
            <tbody>
              {workingDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const status = getDayStatus(dateKey)
                const hours = entries[dateKey]

                return (
                  <tr key={dateKey} className={`day-status-${status}`}>
                    <td>{format(day, 'MMM d')}</td>
                    <td>{format(day, 'EEEE')}</td>
                    <td>
                      <span className={`status-badge status-${status}`}>
                        {status === 'reported' && 'Reported'}
                        {status === 'vacation' && 'Vacation'}
                        {status === 'missing' && 'Missing'}
                      </span>
                    </td>
                    <td className="text-right">
                      {status === 'vacation'
                        ? '\u2014'
                        : hours !== undefined
                        ? hours
                        : '\u2013'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Summary
