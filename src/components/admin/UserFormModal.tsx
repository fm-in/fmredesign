'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ROLES, Role } from '@/lib/admin/permissions';
import { DashboardButton } from '@/design-system';
import { X } from 'lucide-react';
import { createUserSchema } from '@/lib/validations/schemas';

type UserFormData = z.infer<typeof createUserSchema>;

export interface UserFormModalProps {
  mode: 'create' | 'edit';
  user?: {
    id: string;
    name: string;
    email: string;
    mobileNumber: string;
    role: string;
    notes?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
  currentUserRole: string;
  canManagePermissions: boolean;
}

export function UserFormModal({
  mode,
  user,
  onClose,
  onSuccess,
  currentUserRole,
  canManagePermissions,
}: UserFormModalProps) {
  const [serverError, setServerError] = useState('');
  const isEdit = mode === 'edit';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      mobileNumber: user?.mobileNumber || '',
      role: (user?.role as UserFormData['role']) || 'viewer',
      notes: user?.notes || '',
    },
  });

  const selectedRole = watch('role');

  const getAssignableRoles = (currentRole: string): Role[] => {
    const currentRoleObj = ROLES.find(r => r.key === currentRole);
    if (!currentRoleObj) return [];
    if (currentRole === 'super_admin') return ROLES;
    return ROLES.filter(role => role.hierarchy < currentRoleObj.hierarchy);
  };

  const availableRoles = getAssignableRoles(currentUserRole);
  const inputClass = 'w-full px-3 py-2 border border-fm-neutral-300 rounded focus:ring-2 focus:ring-fm-magenta-700 focus:border-fm-magenta-700';

  const onSubmit = async (data: UserFormData) => {
    setServerError('');
    try {
      const body = isEdit ? { id: user!.id, ...data } : data;
      const response = await fetch('/api/admin/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.success) {
        onSuccess();
      } else {
        setServerError(result.error || `Failed to ${isEdit ? 'update' : 'add'} user.`);
      }
    } catch (error) {
      console.error(`Error ${isEdit ? 'updating' : 'adding'} user:`, error);
      setServerError(`Error ${isEdit ? 'updating' : 'adding'} user. Please try again.`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{isEdit ? 'Edit User' : 'Add New User'}</h3>
            <button type="button" onClick={onClose} className="text-fm-neutral-400 hover:text-fm-neutral-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-600">{serverError}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Name *</label>
            <input {...register('name')} className={inputClass} />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Email *</label>
            <input {...register('email')} type="email" className={inputClass} />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Mobile Number *</label>
            <input {...register('mobileNumber')} type="tel" placeholder="+91 98765 43210" className={inputClass} />
            {errors.mobileNumber && <p className="text-xs text-red-600 mt-1">{errors.mobileNumber.message}</p>}
          </div>

          {canManagePermissions && (
            <div>
              <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Role *</label>
              <select {...register('role')} className={inputClass}>
                {availableRoles.map(role => (
                  <option key={role.key} value={role.key}>{role.name}</option>
                ))}
              </select>
              <p className="text-xs text-fm-neutral-500 mt-1">
                {ROLES.find(r => r.key === selectedRole)?.description}
              </p>
              {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role.message}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Notes</label>
            <textarea {...register('notes')} className={inputClass} rows={3} />
          </div>

          <div className="flex gap-3 pt-4">
            <DashboardButton type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (isEdit ? 'Updating...' : 'Adding...') : (isEdit ? 'Update User' : 'Add User')}
            </DashboardButton>
            <DashboardButton type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </DashboardButton>
          </div>
        </form>
      </div>
    </div>
  );
}
