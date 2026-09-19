'use client';

import { useTalentPortal } from '@/lib/talent-portal/context';
import { User, Briefcase, Star, Clock } from 'lucide-react';

export default function TalentDashboardPage() {
  const { profile } = useTalentPortal();

  if (!profile) return null;

  const personalInfo = profile.personalInfo as Record<string, unknown>;
  const fullName = (personalInfo?.fullName as string) || 'Talent';
  const professionalDetails = profile.professionalDetails as Record<string, unknown>;
  const category = (professionalDetails?.primaryCategory as string) || 'Creative';
  const skills = (professionalDetails?.skills as string[]) || [];
  const availability = profile.availability as Record<string, unknown>;
  const availabilityStatus = (availability?.status as string) || 'unknown';
  const ratings = profile.ratings as Record<string, unknown>;
  const overallRating = (ratings?.overallRating as number) || 0;
  const totalReviews = (ratings?.totalReviews as number) || 0;

  const stats = [
    {
      label: 'Category',
      value: category,
      icon: <User className="w-5 h-5 text-fm-magenta-600" />,
    },
    {
      label: 'Skills',
      value: skills.length.toString(),
      icon: <Briefcase className="w-5 h-5 text-fm-magenta-600" />,
    },
    {
      label: 'Rating',
      value: overallRating > 0 ? `${overallRating.toFixed(1)} (${totalReviews})` : 'No reviews',
      icon: <Star className="w-5 h-5 text-fm-magenta-600" />,
    },
    {
      label: 'Availability',
      value: availabilityStatus.replace(/_/g, ' '),
      icon: <Clock className="w-5 h-5 text-fm-magenta-600" />,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fm-neutral-900">
          Welcome back, {fullName.split(' ')[0]}
        </h1>
        <p className="text-fm-neutral-600 mt-1">
          Here&apos;s an overview of your CreativeMinds profile.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(stat => (
          <div
            key={stat.label}
            className="rounded-site-md border border-fm-neutral-200 bg-white p-5"
          >
            <div className="flex items-center gap-3 mb-2">
              {stat.icon}
              <span className="text-sm text-fm-neutral-500">{stat.label}</span>
            </div>
            <p className="text-lg font-semibold text-fm-neutral-900 capitalize">{stat.value}</p>
          </div>
        ))}
      </div>

      {skills.length > 0 && (
        <div className="rounded-site-md border border-fm-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-fm-neutral-900 mb-4">Your Skills</h2>
          <div className="flex flex-wrap gap-2">
            {skills.map(skill => (
              <span
                key={skill}
                className="px-3 py-1.5 bg-fm-magenta-50 text-fm-magenta-700 rounded-full text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-site-md border border-fm-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-fm-neutral-900 mb-2">Public Profile</h2>
        <p className="text-fm-neutral-600 text-sm mb-3">
          Your public profile is visible at the URL below.
        </p>
        <a
          href={`/talent/${profile.profileSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-fm-magenta-600 hover:underline text-sm font-medium"
        >
          freakingminds.in/talent/{profile.profileSlug}
        </a>
      </div>
    </div>
  );
}
