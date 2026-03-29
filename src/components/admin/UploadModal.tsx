/**
 * Upload Modal — Reusable file upload dialog with drag-and-drop.
 * Supports multi-file upload with per-file category, description, and visibility toggles.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DashboardButton as Button } from '@/design-system';
import { Upload, X, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { DOCUMENT_CATEGORIES } from '@/lib/document-types';
import type { DocumentCategory } from '@/lib/document-types';

interface ClientProject {
  id: string;
  name: string;
}

interface PendingFile {
  file: File;
  category: DocumentCategory;
  description: string;
  projectId: string;
  clientVisible: boolean;
  isPublic: boolean;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
}

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onUploadComplete: () => void;
  storageUsed?: number;
  storageLimit?: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function UploadModal({
  open,
  onOpenChange,
  clientId,
  onUploadComplete,
  storageUsed = 0,
  storageLimit = 500 * 1024 * 1024,
}: UploadModalProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && clientId) {
      fetch(`/api/projects?clientId=${clientId}`)
        .then(res => res.json())
        .then(data => {
          const items = Array.isArray(data) ? data : data.data || [];
          setProjects(items.map((p: Record<string, string>) => ({ id: p.id, name: p.name })));
        })
        .catch(() => setProjects([]));
    }
  }, [open, clientId]);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: PendingFile[] = Array.from(fileList).map((file) => ({
      file,
      category: 'general' as DocumentCategory,
      description: '',
      projectId: '',
      clientVisible: true,
      isPublic: false,
      status: 'pending' as const,
      progress: 0,
    }));
    setPendingFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFile = (index: number, updates: Partial<PendingFile>) => {
    setPendingFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const uploadAll = async () => {
    setUploading(true);

    for (let i = 0; i < pendingFiles.length; i++) {
      const pf = pendingFiles[i];
      if (pf.status !== 'pending') continue;

      updateFile(i, { status: 'uploading', progress: 0 });

      try {
        const formData = new FormData();
        formData.append('file', pf.file);
        formData.append('clientId', clientId);
        formData.append('category', pf.category);
        formData.append('description', pf.description);
        formData.append('clientVisible', String(pf.clientVisible));
        formData.append('isPublic', String(pf.isPublic));
        if (pf.projectId) formData.append('projectId', pf.projectId);

        const xhr = new XMLHttpRequest();
        await new Promise<void>((resolve, reject) => {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 100);
              updateFile(i, { progress: pct });
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              updateFile(i, { status: 'done', progress: 100 });
              resolve();
            } else {
              const body = JSON.parse(xhr.responseText || '{}');
              reject(new Error(body.error || `Upload failed (${xhr.status})`));
            }
          };
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.open('POST', '/api/admin/documents');
          xhr.send(formData);
        });
      } catch (err) {
        updateFile(i, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Upload failed',
        });
      }
    }

    setUploading(false);
    onUploadComplete();
  };

  const pendingCount = pendingFiles.filter((f) => f.status === 'pending').length;
  const allDone = pendingFiles.length > 0 && pendingFiles.every((f) => f.status === 'done');

  const handleClose = () => {
    if (!uploading) {
      setPendingFiles([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-fm-neutral-900">Upload Documents</DialogTitle>
        </DialogHeader>

        {/* Storage info */}
        {storageLimit > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-fm-neutral-500 mb-1">
              <span>{formatBytes(storageUsed)} used</span>
              <span>{formatBytes(storageLimit)} limit</span>
            </div>
            <div className="w-full bg-fm-neutral-100 rounded-full h-2">
              <div
                className="bg-fm-magenta-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((storageUsed / storageLimit) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
            isDragging
              ? 'border-fm-magenta-400 bg-fm-magenta-50'
              : 'border-fm-neutral-300 hover:border-fm-magenta-300 hover:bg-fm-neutral-50'
          }`}
          style={{ textAlign: 'center' }}
        >
          <Upload className="h-8 w-8 text-fm-neutral-400 mx-auto mb-3" />
          <p className="text-fm-neutral-700 font-medium">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-fm-neutral-500 mt-1">Max 250 MB per file</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        {pendingFiles.length > 0 && (
          <div className="space-y-3 mt-4">
            {pendingFiles.map((pf, index) => (
              <div
                key={`${pf.file.name}-${index}`}
                className="border border-fm-neutral-200 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {pf.status === 'done' ? (
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : pf.status === 'error' ? (
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    ) : pf.status === 'uploading' ? (
                      <Loader2 className="h-4 w-4 text-fm-magenta-600 animate-spin flex-shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-fm-neutral-500 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium text-fm-neutral-900 truncate">
                      {pf.file.name}
                    </span>
                    <span className="text-xs text-fm-neutral-500 flex-shrink-0">
                      {formatBytes(pf.file.size)}
                    </span>
                  </div>
                  {pf.status === 'pending' && (
                    <button onClick={() => removeFile(index)} className="text-fm-neutral-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                {pf.status === 'uploading' && (
                  <div className="w-full bg-fm-neutral-100 rounded-full h-1.5 mb-2">
                    <div
                      className="bg-fm-magenta-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${pf.progress}%` }}
                    />
                  </div>
                )}

                {pf.status === 'error' && (
                  <p className="text-xs text-red-600 mb-2">{pf.error}</p>
                )}

                {/* Settings (only for pending files) */}
                {pf.status === 'pending' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    <select
                      value={pf.category}
                      onChange={(e) => updateFile(index, { category: e.target.value as DocumentCategory })}
                      className="text-sm px-2 py-1.5 border border-fm-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fm-magenta-700"
                    >
                      {DOCUMENT_CATEGORIES.map((cat) => (
                        <option key={cat.key} value={cat.key}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={pf.projectId}
                      onChange={(e) => updateFile(index, { projectId: e.target.value })}
                      className="text-sm px-2 py-1.5 border border-fm-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fm-magenta-700"
                    >
                      <option value="">No project (general)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={pf.description}
                      onChange={(e) => updateFile(index, { description: e.target.value })}
                      className="text-sm px-2 py-1.5 border border-fm-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 sm:col-span-2"
                    />
                    <label className="flex items-center gap-2 text-sm text-fm-neutral-700">
                      <input
                        type="checkbox"
                        checked={pf.clientVisible}
                        onChange={(e) => updateFile(index, { clientVisible: e.target.checked })}
                        className="rounded text-fm-magenta-600"
                      />
                      Visible to client
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-4">
          <Button variant="secondary" size="sm" onClick={handleClose} disabled={uploading}>
            {allDone ? 'Close' : 'Cancel'}
          </Button>
          {pendingCount > 0 && (
            <Button size="sm" onClick={uploadAll} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
