import { useState, useEffect, useCallback } from 'react'
import {
  format,
  parseISO,
  eachDayOfInterval,
  isWeekend,
  isBefore,
  startOfDay,
} from 'date-fns'
import { Plus, Trash2, CalendarDays } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

function countBusinessDays(startDate, endDate) {
  const days = eachDayOfInterval({ start: startDate, end: endDate })
  return days.filter((d) => !isWeekend(d)).length
}

const Vacation = () => {
  const { user } = useAuth()
  const [vacations, setVacations] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchVacations = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('vacations')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false })

    if (error) {
      toast.error('Failed to load vacations')
      return
    }

    setVacations(data || [])
  }, [user])

  useEffect(() => {
    fetchVacations()
  }, [fetchVacations])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates')
      return
    }

    if (isBefore(parseISO(endDate), parseISO(startDate))) {
      toast.error('End date must be on or after start date')
      return
    }

    setSubmitting(true)

    const { error } = await supabase.from('vacations').insert({
      user_id: user.id,
      start_date: startDate,
      end_date: endDate,
    })

    setSubmitting(false)

    if (error) {
      toast.error('Failed to add vacation')
    } else {
      toast.success('Vacation added')
      setStartDate('')
      setEndDate('')
      fetchVacations()
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vacation?')) return

    const { error } = await supabase.from('vacations').delete().eq('id', id)

    if (error) {
      toast.error('Failed to delete vacation')
    } else {
      toast.success('Vacation deleted')
      setVacations((prev) => prev.filter((v) => v.id !== id))
    }
  }

  const totalVacationDays = vacations.reduce((sum, v) => {
    return sum + countBusinessDays(parseISO(v.start_date), parseISO(v.end_date))
  }, 0)

  return (
    <div className="vacation-page">
      <div className="page-header">
        <h1>Vacation</h1>
        <p className="text-muted">Manage your vacation days</p>
      </div>

      <div className="card">
        <h2 className="card-title">
          <CalendarDays size={20} /> Request Vacation
        </h2>
        <form onSubmit={handleSubmit} className="vacation-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                required
              />
            </div>
            <div className="form-group form-group-action">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                <Plus size={16} />
                {submitting ? 'Adding...' : 'Add Vacation'}
              </button>
            </div>
          </div>
          {startDate && endDate && !isBefore(parseISO(endDate), parseISO(startDate)) && (
            <p className="text-muted vacation-preview">
              {countBusinessDays(parseISO(startDate), parseISO(endDate))} business
              day(s)
            </p>
          )}
        </form>
      </div>

      <div className="card">
        <div className="card-header-row">
          <h2 className="card-title">Your Vacations</h2>
          <span className="badge">{totalVacationDays} days total</span>
        </div>

        {vacations.length === 0 ? (
          <p className="text-muted empty-state">No vacations scheduled yet.</p>
        ) : (
          <div className="vacation-list">
            {vacations.map((vacation) => {
              const start = parseISO(vacation.start_date)
              const end = parseISO(vacation.end_date)
              const days = countBusinessDays(start, end)
              return (
                <div key={vacation.id} className="vacation-item">
                  <div className="vacation-info">
                    <span className="vacation-dates">
                      {format(start, 'MMM d, yyyy')} &ndash;{' '}
                      {format(end, 'MMM d, yyyy')}
                    </span>
                    <span className="vacation-days">
                      {days} business day{days !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(vacation.id)}
                    aria-label="Delete vacation"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Vacation
