import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Mail, Shield, Calendar, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const Settings = () => {
  const { user, profile } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const createdAt = user?.created_at
    ? format(parseISO(user.created_at), 'MMMM d, yyyy')
    : 'Unknown'

  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)

    if (error) {
      toast.error(error.message || 'Failed to change password')
    } else {
      toast.success('Password changed successfully')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

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

      <div className="card" style={{ marginTop: '24px' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Lock size={20} /> Change Password
        </h2>
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              className="form-input"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{ maxWidth: '360px' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
            <input
              id="confirm-password"
              type="password"
              className="form-input"
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ maxWidth: '360px' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Settings
