import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  addMonths,
  subMonths,
  parseISO,
  isWithinInterval,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminTimeReporting() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('all');
  const [consultants, setConsultants] = useState([]);
  const [filteredConsultants, setFilteredConsultants] = useState([]);
  const [selectedConsultantId, setSelectedConsultantId] = useState('all');
  const [timeEntries, setTimeEntries] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [loading, setLoading] = useState(true);

  const monthStart = format(currentMonth, 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const workingDays = useMemo(() => {
    const allDays = eachDayOfInterval({
      start: currentMonth,
      end: endOfMonth(currentMonth),
    });
    return allDays.filter((day) => !isWeekend(day));
  }, [currentMonth]);

  // Fetch teams
  useEffect(() => {
    async function fetchTeams() {
      const { data, error } = await supabase.from('teams').select('*').order('name');
      if (error) {
        toast.error('Failed to load teams');
        return;
      }
      setTeams(data || []);
    }
    fetchTeams();
  }, []);

  // Fetch consultants (filtered by team if selected)
  useEffect(() => {
    async function fetchConsultants() {
      let userIds = null;

      if (selectedTeamId !== 'all') {
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', selectedTeamId);

        if (membersError) {
          toast.error('Failed to load team members');
          return;
        }
        userIds = (members || []).map((m) => m.user_id);
      }

      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'consultant')
        .order('email');

      if (userIds !== null) {
        if (userIds.length === 0) {
          setConsultants([]);
          setFilteredConsultants([]);
          return;
        }
        query = query.in('id', userIds);
      }

      const { data, error } = await query;
      if (error) {
        toast.error('Failed to load consultants');
        return;
      }
      setConsultants(data || []);
    }
    fetchConsultants();
  }, [selectedTeamId]);

  // Filter consultants by selected consultant
  useEffect(() => {
    if (selectedConsultantId === 'all') {
      setFilteredConsultants(consultants);
    } else {
      setFilteredConsultants(consultants.filter((c) => c.id === selectedConsultantId));
    }
  }, [consultants, selectedConsultantId]);

  // Fetch time entries and vacations
  useEffect(() => {
    async function fetchData() {
      const userIds = filteredConsultants.map((c) => c.id);
      if (userIds.length === 0) {
        setTimeEntries([]);
        setVacations([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const [entriesResult, vacationsResult] = await Promise.all([
        supabase
          .from('time_entries')
          .select('*')
          .in('user_id', userIds)
          .gte('work_date', monthStart)
          .lte('work_date', monthEnd),
        supabase
          .from('vacations')
          .select('*')
          .in('user_id', userIds)
          .lte('start_date', monthEnd)
          .gte('end_date', monthStart),
      ]);

      if (entriesResult.error) {
        toast.error('Failed to load time entries');
      }
      if (vacationsResult.error) {
        toast.error('Failed to load vacations');
      }

      setTimeEntries(entriesResult.data || []);
      setVacations(vacationsResult.data || []);
      setLoading(false);
    }
    fetchData();
  }, [filteredConsultants, monthStart, monthEnd]);

  // Build lookup maps
  const entriesByUserDate = useMemo(() => {
    const map = {};
    for (const entry of timeEntries) {
      const key = `${entry.user_id}_${entry.work_date}`;
      map[key] = (map[key] || 0) + Number(entry.hours || 0);
    }
    return map;
  }, [timeEntries]);

  const vacationsByUser = useMemo(() => {
    const map = {};
    for (const v of vacations) {
      if (!map[v.user_id]) map[v.user_id] = [];
      map[v.user_id].push(v);
    }
    return map;
  }, [vacations]);

  function isOnVacation(userId, date) {
    const userVacations = vacationsByUser[userId] || [];
    return userVacations.some((v) =>
      isWithinInterval(date, {
        start: parseISO(v.start_date),
        end: parseISO(v.end_date),
      })
    );
  }

  function getCellInfo(userId, day) {
    const dateStr = format(day, 'yyyy-MM-dd');
    const key = `${userId}_${dateStr}`;
    const hours = entriesByUserDate[key];

    if (hours) {
      return { type: 'hours', value: hours };
    }
    if (isOnVacation(userId, day)) {
      return { type: 'vacation', value: 'V' };
    }
    return { type: 'missing', value: '' };
  }

  function getTotalHours(userId) {
    let total = 0;
    for (const day of workingDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const key = `${userId}_${dateStr}`;
      total += entriesByUserDate[key] || 0;
    }
    return total;
  }

  return (
    <div className="admin-time-reporting">
      <h1 className="page-title">Time Reporting Overview</h1>

      <div className="filters-bar">
        <div className="month-selector">
          <button
            className="btn btn-icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="month-label">{format(currentMonth, 'MMMM yyyy')}</span>
          <button
            className="btn btn-icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="filter-group">
          <label className="filter-label">Team</label>
          <select
            className="filter-select"
            value={selectedTeamId}
            onChange={(e) => {
              setSelectedTeamId(e.target.value);
              setSelectedConsultantId('all');
            }}
          >
            <option value="all">All Teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Consultant</label>
          <select
            className="filter-select"
            value={selectedConsultantId}
            onChange={(e) => setSelectedConsultantId(e.target.value)}
          >
            <option value="all">All Consultants</option>
            {consultants.map((c) => (
              <option key={c.id} value={c.id}>
                {c.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-message">Loading time reports...</div>
      ) : filteredConsultants.length === 0 ? (
        <div className="empty-message">No consultants found for the selected filters.</div>
      ) : (
        <div className="table-scroll-wrapper">
          <table className="time-table">
            <thead>
              <tr>
                <th className="sticky-col consultant-header">Consultant</th>
                {workingDays.map((day) => (
                  <th key={day.toISOString()} className="day-header">
                    <div className="day-number">{format(day, 'd')}</div>
                    <div className="day-name">{format(day, 'EEE')}</div>
                  </th>
                ))}
                <th className="total-header">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredConsultants.map((consultant) => {
                const totalHours = getTotalHours(consultant.id);
                return (
                  <tr key={consultant.id}>
                    <td className="sticky-col consultant-cell">
                      <div className="consultant-name">
                        {consultant.email}
                      </div>
                      <div className="consultant-email">{consultant.email}</div>
                    </td>
                    {workingDays.map((day) => {
                      const cell = getCellInfo(consultant.id, day);
                      let cellClass = 'day-cell';
                      if (cell.type === 'hours') cellClass += ' cell-hours';
                      else if (cell.type === 'vacation') cellClass += ' cell-vacation';
                      else cellClass += ' cell-missing';

                      return (
                        <td key={day.toISOString()} className={cellClass}>
                          {cell.value}
                        </td>
                      );
                    })}
                    <td className="total-cell">{totalHours}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
