/**
 * Document & Assets Manager Component
 * Comprehensive file management system — wired to real API (Google Drive backend).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  Upload,
  Share2,
  Eye,
  EyeOff,
  Trash2,
  Search,
  Folder,
  Star,
  Clock,
  MoreVertical,
  Grid3X3,
  List,
  Archive,
  FileImage,
  FileVideo,
  FileAudio,
  File,
  ExternalLink,
  Loader2,
  Copy,
} from 'lucide-react';
import { Button } from '@/design-system/components/primitives/Button';
import { UploadModal } from '@/components/admin/UploadModal';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { DocumentRecord, StorageInfo, DocumentCategory } from '@/lib/document-types';
import { DOCUMENT_CATEGORIES, CATEGORY_TO_FOLDER } from '@/lib/document-types';

interface DocumentManagerProps {
  clientId?: string;
  campaignId?: string;
}

export function DocumentManager({ clientId }: DocumentManagerProps) {
  const [files, setFiles] = useState<DocumentRecord[]>([]);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string>('All Files');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('date');
  const [filterType, setFilterType] = useState<'all' | 'images' | 'documents' | 'videos' | 'other'>('all');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentRecord | null>(null);

  const folders = ['Brand Assets', 'Campaign Materials', 'Reports', 'Contracts', 'Client Uploads', 'General'];

  const loadData = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/admin/documents?clientId=${clientId}`);
      if (res.ok) {
        const json = await res.json();
        setFiles(json.data || []);
        if (json.storage) setStorage(json.storage);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getFileIcon = (type: string, size: 'sm' | 'lg' = 'sm') => {
    const iconSize = size === 'lg' ? 'h-8 w-8' : 'h-4 w-4';

    if (type.startsWith('image/'))
      return <FileImage className={`${iconSize} text-green-600`} />;
    if (type.startsWith('video/'))
      return <FileVideo className={`${iconSize} text-purple-600`} />;
    if (type.startsWith('audio/'))
      return <FileAudio className={`${iconSize} text-orange-600`} />;
    if (type.includes('pdf'))
      return <FileText className={`${iconSize} text-red-600`} />;
    if (type.includes('spreadsheet') || type.includes('excel'))
      return <FileText className={`${iconSize} text-green-600`} />;
    if (type.includes('document') || type.includes('word'))
      return <FileText className={`${iconSize} text-blue-600`} />;
    return <File className={`${iconSize} text-fm-neutral-600`} />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDownload = (doc: DocumentRecord) => {
    window.open(`/api/admin/documents/download?id=${doc.id}`, '_blank');
  };

  const handlePreview = (doc: DocumentRecord) => {
    if (doc.driveWebViewLink) {
      window.open(doc.driveWebViewLink, '_blank');
    }
  };

  const handleToggleVisibility = async (doc: DocumentRecord) => {
    try {
      const res = await fetch('/api/admin/documents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc.id, clientVisible: !doc.clientVisible }),
      });
      if (res.ok) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === doc.id ? { ...f, clientVisible: !f.clientVisible } : f
          )
        );
      }
    } catch (err) {
      console.error('Toggle visibility error:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/documents?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
        setSelectedFiles((prev) => prev.filter((id) => id !== deleteTarget.id));
        setDeleteTarget(null);
        loadData(); // Refresh storage
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleShareLink = async (doc: DocumentRecord) => {
    // Copy a shareable download link to clipboard
    const url = `${window.location.origin}/api/admin/documents/download?id=${doc.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for older browsers
    }
  };

  // Map categories to folder names for filtering
  const getCategoryForFolder = (folder: string): DocumentCategory | null => {
    const entry = Object.entries(CATEGORY_TO_FOLDER).find(([, f]) => f === folder);
    return entry ? (entry[0] as DocumentCategory) : null;
  };

  const filteredFiles = files
    .filter((file) => {
      // Folder filter
      if (selectedFolder !== 'All Files') {
        const cat = getCategoryForFolder(selectedFolder);
        if (cat && file.category !== cat) return false;
      }

      // Search filter
      if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Type filter
      if (filterType !== 'all') {
        if (filterType === 'images' && !file.fileType.startsWith('image/')) return false;
        if (filterType === 'documents' && !file.fileType.includes('pdf') && !file.fileType.includes('document') && !file.fileType.includes('spreadsheet')) return false;
        if (filterType === 'videos' && !file.fileType.startsWith('video/')) return false;
        if (filterType === 'other' && (file.fileType.startsWith('image/') || file.fileType.startsWith('video/') || file.fileType.includes('pdf') || file.fileType.includes('document') || file.fileType.includes('spreadsheet'))) return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'size': return b.fileSize - a.fileSize;
        case 'type': return a.fileType.localeCompare(b.fileType);
        case 'date':
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 text-fm-neutral-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-fm-neutral-200 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-fm-neutral-900">Document & Asset Manager</h2>
            <p className="text-fm-neutral-600 mt-1">
              Centralized file management system
            </p>
            {/* Storage usage bar */}
            {storage && (
              <div className="mt-3 max-w-sm">
                <div className="flex justify-between text-xs text-fm-neutral-500 mb-1">
                  <span>{formatFileSize(storage.usedBytes)} used</span>
                  <span>{formatFileSize(storage.limitBytes)} limit</span>
                </div>
                <div className="w-full bg-fm-neutral-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      storage.percentage > 90 ? 'bg-red-500' : 'bg-fm-magenta-600'
                    }`}
                    style={{ width: `${Math.min(storage.percentage, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <Button size="sm" icon={<Upload className="h-4 w-4" />} onClick={() => setShowUploadModal(true)}>
              <span className="hidden sm:inline">Upload Files</span>
              <span className="sm:hidden">Upload</span>
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 mt-4 sm:mt-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fm-neutral-400" />
            <input
              type="text"
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-fm-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="px-3 py-2 border border-fm-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="images">Images</option>
              <option value="documents">Documents</option>
              <option value="videos">Videos</option>
              <option value="other">Other</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 border border-fm-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:border-transparent"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="size">Sort by Size</option>
              <option value="type">Sort by Type</option>
            </select>

            <div className="flex items-center space-x-1 border border-fm-neutral-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-fm-magenta-100 text-fm-magenta-700' : 'text-fm-neutral-600'}`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-fm-magenta-100 text-fm-magenta-700' : 'text-fm-neutral-600'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Sidebar - Folders */}
        <div className="bg-white rounded-xl shadow-sm border border-fm-neutral-200 p-3 sm:p-4">
          <h3 className="font-semibold text-fm-neutral-900 mb-3 sm:mb-4">Folders</h3>

          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible scrollbar-none pb-2 lg:pb-0">
            <button
              onClick={() => setSelectedFolder('All Files')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors whitespace-nowrap shrink-0 ${
                selectedFolder === 'All Files'
                  ? 'bg-fm-magenta-50 text-fm-magenta-700'
                  : 'text-fm-neutral-700 hover:bg-fm-neutral-50'
              }`}
            >
              <Archive className="h-4 w-4" />
              <span>All Files</span>
              <span className="ml-auto text-sm text-fm-neutral-500">{files.length}</span>
            </button>

            {folders.map((folder) => {
              const cat = getCategoryForFolder(folder);
              const folderCount = cat
                ? files.filter((f) => f.category === cat).length
                : 0;
              return (
                <button
                  key={folder}
                  onClick={() => setSelectedFolder(folder)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors whitespace-nowrap shrink-0 ${
                    selectedFolder === folder
                      ? 'bg-fm-magenta-50 text-fm-magenta-700'
                      : 'text-fm-neutral-700 hover:bg-fm-neutral-50'
                  }`}
                >
                  <Folder className="h-4 w-4" />
                  <span>{folder}</span>
                  <span className="ml-auto text-sm text-fm-neutral-500">{folderCount}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="hidden lg:block mt-6 pt-4 border-t border-fm-neutral-200">
            <h4 className="font-medium text-fm-neutral-900 mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <button className="w-full flex items-center space-x-3 px-3 py-2 text-left text-fm-neutral-700 hover:bg-fm-neutral-50 rounded-lg">
                <Clock className="h-4 w-4" />
                <span>Recent</span>
              </button>
              <button className="w-full flex items-center space-x-3 px-3 py-2 text-left text-fm-neutral-700 hover:bg-fm-neutral-50 rounded-lg">
                <Share2 className="h-4 w-4" />
                <span>Shared</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-3 sm:space-y-4">
          {/* Action Bar */}
          {selectedFiles.length > 0 && (
            <div className="bg-fm-magenta-50 border border-fm-magenta-200 rounded-lg p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-fm-magenta-800 font-medium">
                  {selectedFiles.length} file(s) selected
                </span>
                <div className="flex items-center flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => {
                    selectedFiles.forEach((id) => {
                      const doc = files.find((f) => f.id === id);
                      if (doc) handleDownload(doc);
                    });
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => {
                    const doc = files.find((f) => f.id === selectedFiles[0]);
                    if (doc) {
                      setDeleteTarget(doc);
                    }
                  }}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* File Grid/List */}
          <div className="bg-white rounded-xl shadow-sm border border-fm-neutral-200 p-4 sm:p-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`p-3 sm:p-4 border rounded-lg cursor-pointer transition-colors hover:shadow-md ${
                      selectedFiles.includes(file.id)
                        ? 'border-fm-magenta-300 bg-fm-magenta-50'
                        : 'border-fm-neutral-200 hover:border-fm-magenta-200'
                    }`}
                    onClick={() => toggleFileSelection(file.id)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      {getFileIcon(file.fileType, 'lg')}
                      <div className="flex items-center space-x-1">
                        {!file.clientVisible && (
                          <span title="Hidden from client"><EyeOff className="h-3.5 w-3.5 text-fm-neutral-400" /></span>
                        )}
                      </div>
                    </div>

                    <h4 className="font-medium text-fm-neutral-900 truncate mb-1">
                      {file.name}
                    </h4>

                    <div className="flex items-center justify-between text-xs text-fm-neutral-500 mb-2">
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span>v{file.version}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-fm-neutral-100 text-fm-neutral-700">
                        {file.category}
                      </span>
                      <span className="text-xs text-fm-neutral-500">
                        {new Date(file.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 mt-3 pt-2 border-t border-fm-neutral-100" onClick={(e) => e.stopPropagation()}>
                      {file.driveWebViewLink && (
                        <button onClick={() => handlePreview(file)} className="p-1.5 text-fm-neutral-500 hover:text-fm-magenta-600 hover:bg-fm-neutral-100 rounded" title="Preview">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleDownload(file)} className="p-1.5 text-fm-neutral-500 hover:text-fm-magenta-600 hover:bg-fm-neutral-100 rounded" title="Download">
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleToggleVisibility(file)} className={`p-1.5 rounded ${file.clientVisible ? 'text-green-600 hover:bg-green-50' : 'text-fm-neutral-400 hover:bg-fm-neutral-100'}`} title={file.clientVisible ? 'Visible to client' : 'Hidden from client'}>
                        {file.clientVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => handleShareLink(file)} className="p-1.5 text-fm-neutral-500 hover:text-fm-magenta-600 hover:bg-fm-neutral-100 rounded" title="Copy link">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(file)} className="p-1.5 text-fm-neutral-400 hover:text-red-600 hover:bg-red-50 rounded ml-auto" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 overflow-x-auto">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center justify-between p-2 sm:p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedFiles.includes(file.id)
                        ? 'bg-fm-magenta-50 border border-fm-magenta-200'
                        : 'hover:bg-fm-neutral-50'
                    }`}
                    onClick={() => toggleFileSelection(file.id)}
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                      {getFileIcon(file.fileType)}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-fm-neutral-900 truncate text-sm sm:text-base">
                            {file.name}
                          </h4>
                          {!file.clientVisible && (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-fm-neutral-200 text-fm-neutral-600">Internal</span>
                          )}
                        </div>

                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-fm-neutral-500">
                          <span>{formatFileSize(file.fileSize)}</span>
                          <span>v{file.version}</span>
                          <span className="hidden sm:inline">
                            {new Date(file.createdAt).toLocaleDateString()}
                          </span>
                          {file.uploadedByName && <span className="hidden md:inline">by {file.uploadedByName}</span>}
                          <span className="hidden lg:inline">{file.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-1 sm:gap-2 ml-2 sm:ml-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {file.driveWebViewLink && (
                        <button onClick={() => handlePreview(file)} className="p-2 text-fm-neutral-500 hover:text-fm-magenta-600 hover:bg-fm-neutral-100 rounded-lg" title="Preview">
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => handleDownload(file)} className="p-2 text-fm-neutral-500 hover:text-fm-magenta-600 hover:bg-fm-neutral-100 rounded-lg" title="Download">
                        <Download className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleToggleVisibility(file)} className={`p-2 rounded-lg ${file.clientVisible ? 'text-green-600 hover:bg-green-50' : 'text-fm-neutral-400 hover:bg-fm-neutral-100'}`} title={file.clientVisible ? 'Visible to client' : 'Hidden from client'}>
                        {file.clientVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <span className="hidden sm:inline-flex">
                        <button onClick={() => handleShareLink(file)} className="p-2 text-fm-neutral-500 hover:text-fm-magenta-600 hover:bg-fm-neutral-100 rounded-lg" title="Copy link">
                          <Copy className="h-4 w-4" />
                        </button>
                      </span>
                      <button onClick={() => setDeleteTarget(file)} className="p-2 text-fm-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {filteredFiles.length === 0 && (
              <div style={{ textAlign: 'center' }} className="py-12">
                <FileText className="h-12 w-12 text-fm-neutral-400 mx-auto mb-4" />
                <h4 className="font-semibold text-fm-neutral-900 mb-2">No files found</h4>
                <p className="text-fm-neutral-600 mb-6">
                  {searchQuery || filterType !== 'all' || selectedFolder !== 'All Files'
                    ? 'Try adjusting your search or filters'
                    : 'Upload your first files to get started'}
                </p>
                <Button onClick={() => setShowUploadModal(true)} icon={<Upload className="h-4 w-4" />}>
                  Upload Files
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {clientId && (
        <UploadModal
          open={showUploadModal}
          onOpenChange={setShowUploadModal}
          clientId={clientId}
          onUploadComplete={loadData}
          storageUsed={storage?.usedBytes}
          storageLimit={storage?.limitBytes}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This will also remove it from Google Drive.`}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
