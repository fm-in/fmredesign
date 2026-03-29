'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DashboardCard as Card,
  CardContent,
} from '@/design-system';
import { Badge } from '@/components/ui/Badge';
import {
  FolderOpen,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image,
  Video,
  Archive,
  File,
  Download,
  ExternalLink,
  Upload,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useClientPortal } from '@/lib/client-portal/context';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterTabBar } from '@/components/ui/filter-tab-bar';

interface Document {
  id: string;
  name: string;
  description: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  projectId: string | null;
  projectName: string | null;
  uploadedBy: string;
  uploadedByName: string;
  driveWebViewLink: string | null;
  version: number;
  createdAt: string;
}

interface StorageInfo {
  usedBytes: number;
  limitBytes: number;
  percentage: number;
  fileCount: number;
}

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'contract', label: 'Contracts' },
  { key: 'report', label: 'Reports' },
  { key: 'invoice', label: 'Invoices' },
  { key: 'design', label: 'Design' },
  { key: 'brand', label: 'Brand' },
  { key: 'client_upload', label: 'My Uploads' },
  { key: 'general', label: 'General' },
];

function getFileIcon(type: string) {
  switch (type) {
    case 'spreadsheet':
      return <FileSpreadsheet className="w-5 h-5" />;
    case 'presentation':
      return <Presentation className="w-5 h-5" />;
    case 'image':
      return <Image className="w-5 h-5" />;
    case 'video':
      return <Video className="w-5 h-5" />;
    case 'archive':
      return <Archive className="w-5 h-5" />;
    case 'document':
      return <FileText className="w-5 h-5" />;
    default:
      return <File className="w-5 h-5" />;
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'contract':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'report':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'invoice':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'design':
      return 'bg-pink-100 text-pink-800 border-pink-200';
    case 'brand':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'client_upload':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-fm-neutral-100 text-fm-neutral-800 border-fm-neutral-200';
  }
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ClientDocumentsPage() {
  const { clientId } = useClientPortal();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const url = `/api/client-portal/${clientId}/documents${category !== 'all' ? `?category=${category}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setDocuments(json.data || []);
        if (json.storage) setStorage(json.storage);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId, category]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDownload = (doc: Document) => {
    if (doc.fileUrl && !doc.fileUrl.includes('drive.google.com')) {
      // Legacy file_url — direct download
      window.open(doc.fileUrl, '_blank');
    } else {
      // Proxied download via our API
      window.open(`/api/client-portal/${clientId}/documents/download?id=${doc.id}`, '_blank');
    }
  };

  const handlePreview = (doc: Document) => {
    if (doc.driveWebViewLink) {
      window.open(doc.driveWebViewLink, '_blank');
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !clientId) return;
    setUploading(true);
    setUploadStatus('idle');
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('category', 'client_upload');
      if (uploadDesc) formData.append('description', uploadDesc);

      const res = await fetch(`/api/client-portal/${clientId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setUploadStatus('success');
        setUploadFile(null);
        setUploadDesc('');
        fetchDocuments();
        setTimeout(() => {
          setShowUpload(false);
          setUploadStatus('idle');
        }, 1500);
      } else {
        const body = await res.json();
        setUploadError(body.error || 'Upload failed');
        setUploadStatus('error');
      }
    } catch {
      setUploadError('Network error');
      setUploadStatus('error');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold text-fm-neutral-900">
              Document <span className="v2-accent">Vault</span>
            </h1>
            <p className="text-fm-neutral-600 mt-1 font-medium">
              Access shared documents and upload files
            </p>
          </div>
          <div className="flex items-center gap-3">
            {storage && (
              <span className="text-sm text-fm-neutral-500">
                {formatFileSize(storage.usedBytes)} of {formatFileSize(storage.limitBytes)} used
              </span>
            )}
            <Badge variant="secondary" className="bg-fm-magenta-50 text-fm-magenta-700 border-fm-magenta-200">
              {documents.length} Document{documents.length !== 1 ? 's' : ''}
            </Badge>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-fm-magenta-600 text-white rounded-lg text-sm font-medium hover:bg-fm-magenta-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          </div>
        </div>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-fm-neutral-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-fm-neutral-900">Upload a File</h3>
            <button onClick={() => { setShowUpload(false); setUploadFile(null); setUploadStatus('idle'); }} className="text-fm-neutral-400 hover:text-fm-neutral-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {uploadStatus === 'success' ? (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">File uploaded successfully!</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-fm-neutral-300 rounded-xl p-6 cursor-pointer hover:border-fm-magenta-300 hover:bg-fm-neutral-50 transition-colors"
                style={{ textAlign: 'center' }}
              >
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-5 h-5 text-fm-magenta-600" />
                    <span className="font-medium text-fm-neutral-900">{uploadFile.name}</span>
                    <span className="text-sm text-fm-neutral-500">({formatFileSize(uploadFile.size)})</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-fm-neutral-400 mx-auto mb-2" />
                    <p className="text-fm-neutral-600">Click to select a file (max 50 MB)</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setUploadFile(f);
                  }}
                />
              </div>

              <input
                type="text"
                placeholder="Description (optional)"
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                className="w-full px-3 py-2 border border-fm-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fm-magenta-600"
              />

              {uploadStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {uploadError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowUpload(false); setUploadFile(null); setUploadStatus('idle'); }}
                  className="px-4 py-2 text-sm text-fm-neutral-600 hover:text-fm-neutral-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-fm-magenta-600 text-white rounded-lg text-sm font-medium hover:bg-fm-magenta-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Storage bar */}
      {storage && storage.limitBytes > 0 && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-fm-neutral-200 p-4">
          <div className="flex justify-between text-xs text-fm-neutral-500 mb-1.5">
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

      {/* Category Filter */}
      <FilterTabBar
        tabs={CATEGORIES.map((cat) => ({ key: cat.key, label: cat.label }))}
        active={category}
        onChange={setCategory}
        variant="client"
        className="mb-6"
      />

      {/* Documents Grid */}
      {documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <Card key={doc.id} variant="client" hover glow className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-fm-magenta-100 to-fm-magenta-50 flex items-center justify-center text-fm-magenta-600 flex-shrink-0">
                    {getFileIcon(doc.fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-fm-neutral-900 truncate">{doc.name}</h3>
                    {doc.description && (
                      <p className="text-sm text-fm-neutral-600 mt-1 line-clamp-2">{doc.description}</p>
                    )}
                    <div className="flex items-center flex-wrap gap-1.5 mt-2">
                      <Badge className={getCategoryColor(doc.category)} variant="secondary">
                        {doc.category === 'client_upload' ? 'My Upload' : doc.category}
                      </Badge>
                      {doc.projectName && (
                        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200" variant="secondary">
                          {doc.projectName}
                        </Badge>
                      )}
                      {doc.fileSize > 0 && (
                        <span className="text-xs text-fm-neutral-500">{formatFileSize(doc.fileSize)}</span>
                      )}
                      <span className="text-xs text-fm-neutral-500">v{doc.version}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-fm-neutral-500">
                        {new Date(doc.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        {doc.driveWebViewLink && (
                          <button
                            onClick={() => handlePreview(doc)}
                            className="inline-flex items-center text-sm font-medium text-fm-neutral-500 hover:text-fm-magenta-600"
                            title="Preview"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(doc)}
                          className="inline-flex items-center text-sm font-medium text-fm-magenta-600 hover:text-fm-magenta-700"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderOpen className="w-6 h-6" />}
          title="No documents yet"
          description={
            category === 'all'
              ? 'Documents shared by your team will appear here'
              : `No ${category} documents at the moment`
          }
        />
      )}
    </>
  );
}
