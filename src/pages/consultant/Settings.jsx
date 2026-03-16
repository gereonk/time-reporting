import { format, parseISO } from 'date-fns'
import { Mail, Shield, Calendar } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const Settings = () => {
  const { user, profile } = useAuth()

  const createdAt = user?.created_at
    ? format(parseISO(user.created_at), 'MMMM d, yyyy')
    : 'Unknown'

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p className="text-muted">Your account information</p>
      </div>

      <div className="card">
        <div className="profile-info">
          <div className="info-row">
            <div className="info-label">
              <Mail size={16} /> Email
            </div>
            <div className="info-value">{user?.email || 'N/A'}</div>
          </div>

          <div className="info-row">
            <div className="info-label">
              <Shield size={16} /> Role
            </div>
            <div className="info-value">
              <span className={`role-badge role-${profile?.role || 'consultant'}`}>
                {profile?.role || 'consultant'}
              </span>
            </div>
          </div>

          <div className="info-row">
            <div className="info-label">
              <Calendar size={16} /> Member Since
            </div>
            <div className="info-value">{createdAt}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
