import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logAction } from '../../lib/auditLog';
import { useAuth } from '../../contexts/AuthContext';
import {
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  Users,
  ChevronDown,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { logError } from '../../lib/errorLog';

export default function AdminUsers() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Team creation
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  // Team renaming
  const [renamingTeamId, setRenamingTeamId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Add member
  const [addingMemberTeamId, setAddingMemberTeamId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');

  // Delete confirmation
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [deletingTeamId, setDeletingTeamId] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [teamsResult, usersResult, membersResult] = await Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('profiles').select('*').order('email'),
      supabase.from('team_members').select('*'),
    ]);

    if (teamsResult.error) {
      logError('AdminUsers.fetchAll', 'Failed to load teams', teamsResult.error.message);
      toast.error('Failed to load teams');
    }
    if (usersResult.error) {
      logError('AdminUsers.fetchAll', 'Failed to load users', usersResult.error.message);
      toast.error('Failed to load users');
    }
    if (membersResult.error) {
      logError('AdminUsers.fetchAll', 'Failed to load team members', membersResult.error.message);
      toast.error('Failed to load team members');
    }

    setTeams(teamsResult.data || []);
    setUsers(usersResult.data || []);
    setTeamMembers(membersResult.data || []);
    setLoading(false);
  }

  // --- Team operations ---

  async function createTeam() {
    if (!newTeamName.trim()) return;
    const { error } = await supabase.from('teams').insert({ name: newTeamName.trim() });
    if (error) {
      logError('AdminUsers.createTeam', 'Failed to create team', error.message);
      toast.error('Failed to create team');
      return;
    }
    logAction('team_created', newTeamName.trim());
    toast.success('Team created');
    setNewTeamName('');
    setShowCreateTeam(false);
    fetchAll();
  }

  async function renameTeam(teamId) {
    if (!renameValue.trim()) return;
    const { error } = await supabase
      .from('teams')
      .update({ name: renameValue.trim() })
      .eq('id', teamId);
    if (error) {
      logError('AdminUsers.renameTeam', 'Failed to rename team', error.message);
      toast.error('Failed to rename team');
      return;
    }
    const oldName = teams.find((t) => t.id === teamId)?.name;
    logAction('team_renamed', `${oldName} → ${renameValue.trim()}`);
    toast.success('Team renamed');
    setRenamingTeamId(null);
    setRenameValue('');
    fetchAll();
  }

  async function deleteTeam(teamId) {
    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    if (error) {
      logError('AdminUsers.deleteTeam', 'Failed to delete team', error.message);
      toast.error('Failed to delete team');
      return;
    }
    const teamName = teams.find((t) => t.id === teamId)?.name;
    logAction('team_deleted', teamName);
    toast.success('Team deleted');
    setDeletingTeamId(null);
    if (expandedTeamId === teamId) setExpandedTeamId(null);
    fetchAll();
  }

  async function addMember(teamId) {
    if (!selectedUserId) return;
    const { error } = await supabase
      .from('team_members')
      .insert({ team_id: teamId, user_id: selectedUserId });
    if (error) {
      logError('AdminUsers.addMember', 'Failed to add member', error.message);
      toast.error('Failed to add member');
      return;
    }
    const memberEmail = users.find((u) => u.id === selectedUserId)?.email;
    const teamName = teams.find((t) => t.id === teamId)?.name;
    logAction('member_added', `${memberEmail} → ${teamName}`);
    toast.success('Member added');
    setSelectedUserId('');
    setAddingMemberTeamId(null);
    fetchAll();
  }

  async function removeMember(memberId) {
    const { error } = await supabase.from('team_members').delete().eq('id', memberId);
    if (error) {
      logError('AdminUsers.removeMember', 'Failed to remove member', error.message);
      toast.error('Failed to remove member');
      return;
    }
    const member = teamMembers.find((m) => m.id === memberId);
    const memberEmail = users.find((u) => u.id === member?.user_id)?.email;
    const teamName = teams.find((t) => t.id === member?.team_id)?.name;
    logAction('member_removed', `${memberEmail} → ${teamName}`);
    toast.success('Member removed');
    fetchAll();
  }

  // --- User operations ---

  async function toggleRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'consultant' : 'admin';
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);
    if (error) {
      logError('AdminUsers.toggleRole', 'Failed to update role', error.message);
      toast.error('Failed to update role');
      return;
    }
    const userEmail = users.find((u) => u.id === userId)?.email;
    logAction('role_changed', `${userEmail}: ${currentRole} → ${newRole}`);
    toast.success(`Role changed to ${newRole}`);
    fetchAll();
  }

  async function deleteUser(userId) {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) {
      logError('AdminUsers.deleteUser', 'Failed to delete user', error.message);
      toast.error('Failed to delete user');
      return;
    }
    const userEmail = users.find((u) => u.id === userId)?.email;
    logAction('user_deleted', userEmail);
    toast.success('User deleted');
    setDeletingUserId(null);
    fetchAll();
  }

  // --- Helpers ---

  function getTeamMembers(teamId) {
    return teamMembers
      .filter((m) => m.team_id === teamId)
      .map((m) => ({
        ...m,
        profile: users.find((u) => u.id === m.user_id),
      }));
  }

  function getMemberCount(teamId) {
    return teamMembers.filter((m) => m.team_id === teamId).length;
  }

  function getAvailableConsultants(teamId) {
    const memberUserIds = teamMembers
      .filter((m) => m.team_id === teamId)
      .map((m) => m.user_id);
    return users.filter(
      (u) => u.role === 'consultant' && !memberUserIds.includes(u.id)
    );
  }

  function getUserTeams(userId) {
    return teamMembers
      .filter((m) => m.user_id === userId)
      .map((m) => teams.find((t) => t.id === m.team_id))
      .filter(Boolean);
  }

  if (loading) {
    return <div className="loading-message">Loading...</div>;
  }

  return (
    <div className="admin-users">
      <h1 className="page-title">Team & User Management</h1>

      <div className="admin-users-grid">
        {/* Teams Section */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Users size={20} />
              Teams
            </h2>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowCreateTeam(!showCreateTeam)}
            >
              <Plus size={16} />
              Create Team
            </button>
          </div>

          {showCreateTeam && (
            <div className="inline-form">
              <input
                type="text"
                className="input"
                placeholder="Team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createTeam()}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={createTeam}>
                <Check size={16} />
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setShowCreateTeam(false);
                  setNewTeamName('');
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="teams-list">
            {teams.length === 0 ? (
              <div className="empty-message">No teams yet.</div>
            ) : (
              teams.map((team) => {
                const isExpanded = expandedTeamId === team.id;
                const members = getTeamMembers(team.id);
                const available = getAvailableConsultants(team.id);

                return (
                  <div key={team.id} className="team-item">
                    <div className="team-row">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          setExpandedTeamId(isExpanded ? null : team.id)
                        }
                      >
                        {isExpanded ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </button>

                      {renamingTeamId === team.id ? (
                        <div className="inline-form">
                          <input
                            type="text"
                            className="input input-sm"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === 'Enter' && renameTeam(team.id)
                            }
                            autoFocus
                          />
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => renameTeam(team.id)}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setRenamingTeamId(null);
                              setRenameValue('');
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="team-name">{team.name}</span>
                      )}

                      <span className="member-count">
                        {getMemberCount(team.id)} members
                      </span>

                      <div className="team-actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Rename team"
                          onClick={() => {
                            setRenamingTeamId(team.id);
                            setRenameValue(team.name);
                          }}
                        >
                          <Pencil size={14} />
                        </button>

                        {deletingTeamId === team.id ? (
                          <div className="confirm-delete">
                            <span className="confirm-text">Delete?</span>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => deleteTeam(team.id)}
                            >
                              Yes
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setDeletingTeamId(null)}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Delete team"
                            onClick={() => setDeletingTeamId(team.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="team-members">
                        {members.length === 0 ? (
                          <div className="empty-message">No members yet.</div>
                        ) : (
                          <ul className="members-list">
                            {members.map((member) => (
                              <li key={member.id} className="member-row">
                                <span className="member-name">
                                  {member.profile?.email || 'Unknown'}
                                </span>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  title="Remove from team"
                                  onClick={() => removeMember(member.id)}
                                >
                                  <UserMinus size={14} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}

                        {addingMemberTeamId === team.id ? (
                          <div className="inline-form">
                            <select
                              className="filter-select"
                              value={selectedUserId}
                              onChange={(e) => setSelectedUserId(e.target.value)}
                            >
                              <option value="">Select consultant...</option>
                              {available.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.email}
                                </option>
                              ))}
                            </select>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => addMember(team.id)}
                              disabled={!selectedUserId}
                            >
                              Add
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                setAddingMemberTeamId(null);
                                setSelectedUserId('');
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-ghost btn-sm add-member-btn"
                            onClick={() => setAddingMemberTeamId(team.id)}
                          >
                            <UserPlus size={14} />
                            Add Member
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Users Section */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Users size={20} />
              Users
            </h2>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Teams</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const userTeams = getUserTeams(u.id);
                return (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>
                      <button
                        className={`role-badge role-${u.role}`}
                        style={{ cursor: u.id === user?.id ? 'not-allowed' : 'pointer', border: 'none' }}
                        title={u.id === user?.id ? 'Cannot change own role' : `Click to make ${u.role === 'admin' ? 'consultant' : 'admin'}`}
                        onClick={() => u.id !== user?.id && toggleRole(u.id, u.role)}
                        disabled={u.id === user?.id}
                      >
                        {u.role}
                      </button>
                    </td>
                    <td>
                      {userTeams.length > 0
                        ? userTeams.map((t) => t.name).join(', ')
                        : '-'}
                    </td>
                    <td>
                      {deletingUserId === u.id ? (
                        <div className="confirm-delete">
                          <div className="confirm-warning">
                            This will permanently delete the user and all their data.
                          </div>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => deleteUser(u.id)}
                          >
                            Confirm Delete
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDeletingUserId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Delete user"
                          onClick={() => setDeletingUserId(u.id)}
                          disabled={u.id === user?.id}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
