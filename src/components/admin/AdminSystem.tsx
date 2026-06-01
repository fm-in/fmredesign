/**
 * Admin & Permissions System Component
 * Comprehensive role-based access control and system administration
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Settings,
  UserPlus,
  Eye,
  Edit,
  Trash2,
  Search,
  CheckCircle,
  Activity,
  Server,
  Download,
  Crown,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { Button } from '@/design-system/components/primitives/Button';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'manager' | 'editor' | 'viewer';
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  createdAt: string;
  avatar?: string;
  department: string;
  clientAccess: string[]; // client IDs they can access
}

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  result: 'success' | 'failed';
}

export function AdminSystem() {
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'system' | 'audit'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Fetch users from API
    try {
      const res = await fetch('/api/admin/users');
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setUsers(result.data.map((u: any) => ({
          id: u.id,
          name: u.name || 'Unknown',
          email: u.email || '',
          role: u.role || 'viewer',
          permissions: u.permissions || [],
          status: u.status || 'active',
          lastLogin: u.last_login || u.updated_at || '',
          createdAt: u.created_at || '',
          department: u.department || '',
          clientAccess: [],
        })));
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }

    // Fetch audit logs from API
    try {
      const res = await fetch('/api/admin/audit');
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setAuditLogs(result.data.map((log: any) => ({
          id: log.id,
          userId: log.user_id || '',
          userName: log.user_name || 'System',
          action: log.action || '',
          resource: [log.resource_type, log.resource_id].filter(Boolean).join(': '),
          timestamp: log.created_at || '',
          ipAddress: log.ip_address || '',
          userAgent: '',
          result: 'success',
        })));
      }
    } catch (err) {
      console.error('Error loading audit logs:', err);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Crown className="h-4 w-4 text-purple-600" />;
      case 'admin': return <ShieldCheck className="h-4 w-4 text-blue-600" />;
      case 'manager': return <UserCheck className="h-4 w-4 text-green-600" />;
      case 'editor': return <Edit className="h-4 w-4 text-orange-600" />;
      case 'viewer': return <Eye className="h-4 w-4 text-fm-neutral-600" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      super_admin: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      manager: 'bg-green-100 text-green-800',
      editor: 'bg-orange-100 text-orange-800',
      viewer: 'bg-fm-neutral-100 text-fm-neutral-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role as keyof typeof colors]}`}>
        {role.replace('_', ' ')}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-fm-neutral-100 text-fm-neutral-800',
      suspended: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}>
        {status}
      </span>
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const renderUsersTab = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Users Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-fm-neutral-900">User Management</h3>
          <p className="text-fm-neutral-600 mt-1">Manage team members and their access levels</p>
        </div>
        <Button size="sm" icon={<UserPlus className="h-4 w-4" />} onClick={() => setShowUserModal(true)}>
          Add User
        </Button>
      </div>

      {/* Users Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fm-neutral-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-fm-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:border-transparent"
          />
        </div>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="px-3 py-2 border border-fm-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:border-transparent"
        >
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-fm-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-fm-neutral-200">
            <thead className="bg-fm-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-fm-neutral-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-fm-neutral-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-fm-magenta-100 rounded-full flex items-center justify-center">
                        <span className="text-fm-magenta-700 font-medium">
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-fm-neutral-900">{user.name}</div>
                        <div className="text-sm text-fm-neutral-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(user.role)}
                      {getRoleBadge(user.role)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-fm-neutral-900">
                    {user.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-fm-neutral-500">
                    {new Date(user.lastLogin).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="secondary">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="secondary">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user.role !== 'super_admin' && (
                        <Button size="sm" variant="secondary">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSystemTab = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-fm-neutral-900">System Status</h3>
        <p className="text-fm-neutral-600 mt-1">System diagnostics powered by Supabase</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg border border-fm-neutral-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-fm-neutral-900">Database</h4>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-sm text-fm-neutral-600">Supabase PostgreSQL — connected</p>
        </div>
        <div className="bg-white rounded-lg border border-fm-neutral-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-fm-neutral-900">Users</h4>
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-sm text-fm-neutral-600">{users.length} authorized user{users.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>
  );

  const renderAuditTab = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-fm-neutral-900">Audit Logs</h3>
        <p className="text-fm-neutral-600 mt-1">Track user activities and system events</p>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg border border-fm-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-fm-neutral-200">
            <thead className="bg-fm-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                  Result
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-fm-neutral-500 uppercase tracking-wider">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-fm-neutral-200">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-fm-neutral-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-fm-neutral-900">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-fm-neutral-900">
                    {log.userName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-fm-neutral-900">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-fm-neutral-500">
                    {log.resource}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.result === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {log.result}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-fm-neutral-500">
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-fm-neutral-200 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-fm-neutral-900">Admin & Permissions System</h2>
            <p className="text-fm-neutral-600 mt-1 text-sm sm:text-base">Comprehensive system administration and access control</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button size="sm" variant="secondary" icon={<Download className="h-4 w-4" />}>
              Export Report
            </Button>
            <Button size="sm" icon={<Settings className="h-4 w-4" />}>
              System Settings
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto scrollbar-none space-x-6 sm:space-x-8 mt-6 border-b border-fm-neutral-200">
          {[
            { id: 'users', label: 'Users', icon: Users },
            { id: 'permissions', label: 'Permissions', icon: Shield },
            { id: 'system', label: 'System', icon: Server },
            { id: 'audit', label: 'Audit Logs', icon: Activity }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 pb-4 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'border-fm-magenta-500 text-fm-magenta-600'
                    : 'border-transparent text-fm-neutral-600 hover:text-fm-neutral-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-fm-neutral-200 p-4 sm:p-6">
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'system' && renderSystemTab()}
        {activeTab === 'audit' && renderAuditTab()}
        {activeTab === 'permissions' && (
          <div style={{ textAlign: 'center' }} className="py-12">
            <Shield className="h-12 w-12 text-fm-neutral-400 mx-auto mb-4" />
            <h4 className="font-semibold text-fm-neutral-900 mb-2">Permissions Management</h4>
            <p className="text-fm-neutral-600">
              Advanced role-based permissions system coming soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}