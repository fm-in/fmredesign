/**
 * Team Management Dashboard
 * Main team overview and directory page
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Plus,
  Filter,
  Star,
  MapPin,
  Clock,
  TrendingUp,
  Building,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  Award
} from 'lucide-react';
import {
  DashboardCard as Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DashboardButton,
  MetricCard
} from '@/design-system';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/select-native';
import { AvatarInitials } from '@/components/ui/avatar-initials';
import { TagChip } from '@/components/ui/tag-chip';
import { Badge } from '@/components/ui/Badge';
import { adminToast } from '@/lib/admin/toast';
import { getWorkloadColor, getLocationEmoji } from '@/lib/admin/format-helpers';
import { TeamMember, TeamMetrics, TEAM_ROLES, TEAM_DEPARTMENTS } from '@/lib/admin/types';

export default function TeamDashboardPage() {
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      const response = await fetch('/api/team');
      const result = await response.json();
      if (result.success) {
        setTeamMembers(result.data || []);
        if (result.metrics) setTeamMetrics(result.metrics as TeamMetrics);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
      adminToast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTeamMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      TEAM_ROLES[member.role].toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment = selectedDepartment === 'all' || member.department === selectedDepartment;
    const matchesType = selectedType === 'all' || member.type === selectedType;

    return matchesSearch && matchesDepartment && matchesType;
  });

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Team Management"
        icon={<Users className="w-6 h-6" />}
        description="Manage your in-house employees and freelancers"
        actions={
          <div className="flex items-center gap-2">
            <DashboardButton
              variant="secondary"
              className="flex items-center gap-2"
              onClick={() => router.push('/admin/team/workload')}
            >
              <TrendingUp className="w-4 h-4" />
              Workload
            </DashboardButton>
            <DashboardButton
              variant="primary"
              className="flex items-center gap-2"
              onClick={() => router.push('/admin/team/new')}
            >
              <Plus className="w-4 h-4" />
              Add Team Member
            </DashboardButton>
          </div>
        }
      />

      {/* Team Metrics */}
      {teamMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          <MetricCard
            title="Total Team"
            value={teamMetrics.totalMembers.toString()}
            subtitle={`${teamMetrics.activeMembers} active members`}
            icon={<Users className="w-6 h-6" />}
            variant="admin"
          />
          <MetricCard
            title="Employees"
            value={teamMetrics.employees.toString()}
            subtitle={`${teamMetrics.freelancers} freelancers`}
            icon={<Building className="w-6 h-6" />}
            variant="admin"
          />
          <MetricCard
            title="Team Utilization"
            value={`${teamMetrics.avgUtilization}%`}
            subtitle="Average workload"
            icon={<TrendingUp className="w-6 h-6" />}
            variant="admin"
            change={{
              value: teamMetrics.avgUtilization,
              type: teamMetrics.avgUtilization > 85 ? 'negative' : 'positive',
              period: 'utilization'
            }}
          />
          <MetricCard
            title="Total Capacity"
            value={`${teamMetrics.totalCapacity}h`}
            subtitle="Hours per week"
            icon={<Clock className="w-6 h-6" />}
            variant="admin"
          />
        </div>
      )}

      {/* Search and Filters */}
      <Card variant="admin">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fm-neutral-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Department Filter */}
            <Select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="all">All Departments</option>
              {Object.entries(TEAM_DEPARTMENTS).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </Select>

            {/* Type Filter */}
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="employee">Employees</option>
              <option value="freelancer">Freelancers</option>
              <option value="contractor">Contractors</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Team Directory */}
      <Card variant="admin">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-fm-magenta-600" />
                Team Directory
              </CardTitle>
              <CardDescription>
                {filteredTeamMembers.length} of {teamMembers.length} team members
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 sm:space-y-4 p-4 sm:p-6">
            {filteredTeamMembers.map((member) => (
              <div
                key={member.id}
                className="bg-fm-neutral-50 rounded-lg p-4 border border-fm-neutral-200 hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3 sm:gap-0">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <AvatarInitials name={member.name} size="lg" className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg" />

                    {/* Member Info */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="font-semibold text-base sm:text-lg text-fm-neutral-900">
                          {member.name}
                        </h3>
                        <StatusBadge status={member.status} />
                        <Badge variant="outline">
                          {member.type}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <p className="text-fm-magenta-600 font-medium">
                            {TEAM_ROLES[member.role]} • {TEAM_DEPARTMENTS[member.department]}
                          </p>
                          <div className="flex items-center gap-2 text-fm-neutral-600">
                            <Mail className="w-4 h-4" />
                            <span>{member.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-fm-neutral-600">
                            <Phone className="w-4 h-4" />
                            <span>{member.phone}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-fm-neutral-600">
                            <MapPin className="w-4 h-4" />
                            <span>{getLocationEmoji(member.location)} {member.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-fm-neutral-600">
                            <Clock className="w-4 h-4" />
                            <span>{member.capacity}h/week</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-fm-neutral-600" />
                            <span className={`font-medium ${getWorkloadColor(member.workload)}`}>
                              {member.workload}% utilized
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Skills */}
                      {(member.skills || []).length > 0 && (
                        <div className="mt-3">
                          <div className="flex flex-wrap gap-2">
                            {(member.skills || []).slice(0, 6).map((skill, index) => (
                              <TagChip key={index}>{skill}</TagChip>
                            ))}
                            {(member.skills || []).length > 6 && (
                              <TagChip>+{(member.skills || []).length - 6} more</TagChip>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 sm:gap-2 ml-0 sm:ml-4 flex-wrap">
                    {member.clientRatings > 0 && (
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-medium">{member.clientRatings}</span>
                      </div>
                    )}
                    <DashboardButton
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/admin/team/${member.id}`)}
                    >
                      View Profile
                    </DashboardButton>
                    <DashboardButton
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/admin/team/${member.id}/edit`)}
                    >
                      Edit
                    </DashboardButton>
                  </div>
                </div>
              </div>
            ))}

            {filteredTeamMembers.length === 0 && (
              <EmptyState
                icon={<Users className="w-6 h-6" />}
                title="No team members found"
                description="Try adjusting your search or filters"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
