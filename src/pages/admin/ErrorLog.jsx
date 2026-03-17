import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

const PAGE_SIZE = 100;

export default function ErrorLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filterEmail, setFilterEmail] = useState('');
  const [emails, setEmails] = useState([]);

  const fetchLogs = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    let query = supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (filterEmail) {
      query = query.eq('user_email', filterEmail);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch error logs:', error);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (append) {
      setLogs((prev) => [...prev, ...(data || [])]);
    } else {
      setLogs(data || []);
    }

    setHasMore((data || []).length === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  }, [filterEmail]);

  useEffect(() => {
    fetchLogs(0, false);
  }, [fetchLogs]);

  useEffect(() => {
    async function fetchEmails() {
      const { data, error } = await supabase
        .from('error_logs')
        .select('user_email')
        .order('user_email');

      if (!error && data) {
        const unique = [...new Set(data.map((row) => row.user_email).filter(Boolean))];
        setEmails(unique);
      }
    }
    fetchEmails();
  }, []);

  function handleLoadMore() {
    fetchLogs(logs.length, true);
  }

  function formatTimestamp(ts) {
    return format(parseISO(ts), 'MMM d, yyyy HH:mm');
  }

  if (loading) {
    return <div className="loading-message">Loading...</div>;
  }

  return (
    <div className="error-log">
      <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertTriangle size={24} />
        Error Log
      </h1>

      <div className="filters-bar">
        <div className="filter-group">
          <label className="filter-label">User</label>
          <select
            className="filter-select"
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.target.value)}
          >
            <option value="">All users</option>
            {emails.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Source</th>
                <th>Message</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                    No error log entries found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    style={{ borderLeft: '3px solid #ef4444' }}
                  >
                    <td style={{ whiteSpace: 'nowrap' }}>{formatTimestamp(log.created_at)}</td>
                    <td>{log.user_email || '-'}</td>
                    <td>
                      <code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                        {log.source}
                      </code>
                    </td>
                    <td>{log.message}</td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {hasMore && logs.length > 0 && (
          <div style={{ padding: 16, textAlign: 'center', borderTop: '1px solid #e2e8f0' }}>
            <button
              className="btn btn-secondary"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
