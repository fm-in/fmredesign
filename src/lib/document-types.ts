/**
 * Shared document types and constants
 */

export type DocumentCategory =
  | 'brand'
  | 'campaign'
  | 'report'
  | 'contract'
  | 'invoice'
  | 'design'
  | 'client_upload'
  | 'general';

export interface DocumentRecord {
  id: string;
  clientId: string;
  projectId: string | null;
  projectName: string | null;
  name: string;
  description: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: DocumentCategory;
  uploadedBy: string;
  uploadedByName: string;
  driveFileId: string | null;
  driveWebViewLink: string | null;
  isPublic: boolean;
  clientVisible: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface StorageInfo {
  usedBytes: number;
  limitBytes: number;
  percentage: number;
  fileCount: number;
}

// Max upload sizes
export const MAX_FILE_SIZE_ADMIN = 250 * 1024 * 1024; // 250 MB
export const MAX_FILE_SIZE_CLIENT = 50 * 1024 * 1024;  // 50 MB

export const DOCUMENT_CATEGORIES: { key: DocumentCategory; label: string }[] = [
  { key: 'brand', label: 'Brand Assets' },
  { key: 'campaign', label: 'Campaign Materials' },
  { key: 'report', label: 'Reports' },
  { key: 'contract', label: 'Contracts' },
  { key: 'invoice', label: 'Invoices' },
  { key: 'design', label: 'Design' },
  { key: 'client_upload', label: 'Client Uploads' },
  { key: 'general', label: 'General' },
];

/** Maps DocumentManager folder names to categories */
export const FOLDER_TO_CATEGORY: Record<string, DocumentCategory> = {
  'Brand Assets': 'brand',
  'Campaign Materials': 'campaign',
  'Reports': 'report',
  'Contracts': 'contract',
  'Client Uploads': 'client_upload',
};

export const CATEGORY_TO_FOLDER: Record<DocumentCategory, string> = {
  brand: 'Brand Assets',
  campaign: 'Campaign Materials',
  report: 'Reports',
  contract: 'Contracts',
  invoice: 'Invoices',
  design: 'Design',
  client_upload: 'Client Uploads',
  general: 'General',
};

export function transformDocumentRow(doc: Record<string, unknown>): DocumentRecord {
  return {
    id: doc.id as string,
    clientId: doc.client_id as string,
    projectId: (doc.project_id as string) || null,
    projectName: (doc.project_name as string) || null,
    name: doc.name as string,
    description: (doc.description as string) || '',
    fileUrl: (doc.file_url as string) || '',
    fileType: (doc.file_type as string) || 'document',
    fileSize: Number(doc.file_size) || 0,
    category: (doc.category as DocumentCategory) || 'general',
    uploadedBy: (doc.uploaded_by as string) || 'admin',
    uploadedByName: (doc.uploaded_by_name as string) || '',
    driveFileId: (doc.drive_file_id as string) || null,
    driveWebViewLink: (doc.drive_web_view_link as string) || null,
    isPublic: Boolean(doc.is_public),
    clientVisible: doc.client_visible !== false,
    version: Number(doc.version) || 1,
    createdAt: doc.created_at as string,
    updatedAt: doc.updated_at as string,
  };
}
