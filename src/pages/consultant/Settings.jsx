import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { User, Mail, Shield, Calendar, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const Settings = () => {
  const { user, profile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name)
    }
  }, [profile])

  const handleSave = async (e) => {
    e.preventDefault()

    if (!fullName.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', user.id)

    setSaving(false)

    if (error) {
      toast.error('Failed to update profile')
    } else {
      toast.success('Profile updated')
    }
  }

  const createdAt = user?.created_at
    ? format(parseISO(user.created_at), 'MMMM d, yyyy')
    : 'Unknown'

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p className="text-muted">Manage your account</p>
      </div>

      <div className="card">
        <h2 className="card-title">
          <User size={20} /> Profile Information
        </h2>

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
              <span className="role-badge">{profile?.role || 'consultant'}</span>
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

      <div className="card">
        <h2 className="card-title">Edit Profile</h2>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label" htmlFor="full-name">
              Full Name
            </label>
            <input
              id="full-name"
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Settings
