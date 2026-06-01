/**
 * ImportModal Component
 * Handles JSON file import for scraped contacts.
 */

'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileJson, CheckCircle, AlertCircle } from 'lucide-react';
import { DashboardButton } from '@/design-system';
import { Select } from '@/components/ui/select-native';
import { SOURCE_OPTIONS } from '@/lib/admin/scraped-contact-types';
import type { SourcePlatform } from '@/lib/admin/scraped-contact-types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (contacts: Record<string, unknown>[], sourcePlatform: string, sourceFile?: string) => Promise<{ inserted: number; skipped: number }>;
}

type ImportState = 'idle' | 'preview' | 'importing' | 'done';

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [state, setState] = useState<ImportState>('idle');
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState('');
  const [sourcePlatform, setSourcePlatform] = useState<SourcePlatform>('bni');
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const reset = () => {
    setState('idle');
    setRecords([]);
    setFileName('');
    setResult(null);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setFileName(file.name);

    try {
      const text = await file.text();
      let parsed = JSON.parse(text);

      // Handle both array and { data: [...] } formats
      if (!Array.isArray(parsed)) {
        if (parsed.data && Array.isArray(parsed.data)) {
          parsed = parsed.data;
        } else if (parsed.contacts && Array.isArray(parsed.contacts)) {
          parsed = parsed.contacts;
        } else {
          throw new Error('JSON must be an array or contain a "data" or "contacts" array');
        }
      }

      if (parsed.length === 0) {
        setError('File contains no records');
        return;
      }

      setRecords(parsed);
      setState('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON file');
    }

    // Reset file input
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImport = async () => {
    setState('importing');
    const res = await onImport(records, sourcePlatform, fileName);
    setResult(res);
    setState('done');
  };

  const previewRecords = records.slice(0, 5);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={handleClose} />
      <div className="fixed inset-x-4 top-[10%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-xl bg-white rounded-2xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto">
        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-fm-neutral-900">Import Contacts</h2>
            <button onClick={handleClose} className="text-fm-neutral-400 hover:text-fm-neutral-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Idle — File selection */}
          {state === 'idle' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fm-neutral-700 mb-1.5">
                  Source Platform
                </label>
                <Select
                  value={sourcePlatform}
                  onChange={(e) => setSourcePlatform(e.target.value as SourcePlatform)}
                >
                  {SOURCE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-fm-neutral-700 mb-1.5">
                  JSON File
                </label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-fm-neutral-300 rounded-xl cursor-pointer hover:border-fm-magenta-400 hover:bg-fm-neutral-50 transition-colors">
                  <FileJson className="w-8 h-8 text-fm-neutral-400 mb-2" />
                  <span className="text-sm text-fm-neutral-600">Click to select a JSON file</span>
                  <span className="text-xs text-fm-neutral-400 mt-1">Supports scraper output format</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".json"
                    onChange={handleFile}
                    className="hidden"
                  />
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {state === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-fm-neutral-700 bg-fm-neutral-50 rounded-lg p-3">
                <FileJson className="w-4 h-4 shrink-0 text-fm-magenta-600" />
                <span className="font-medium">{fileName}</span>
                <span className="text-fm-neutral-500">— {records.length} records</span>
              </div>

              <div>
                <h3 className="text-sm font-medium text-fm-neutral-700 mb-2">
                  Preview (first {Math.min(5, records.length)})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {previewRecords.map((r, i) => {
                    const name = `${r.firstName || r.first_name || ''} ${r.lastName || r.last_name || ''}`.trim();
                    const company = (r.companyName || r.company_name || r.company || '') as string;
                    const email = (r.email || '') as string;
                    return (
                      <div key={i} className="text-sm bg-fm-neutral-50 rounded-lg p-2.5">
                        <span className="font-medium text-fm-neutral-900">{name || 'Unknown'}</span>
                        {company && <span className="text-fm-neutral-500"> — {company}</span>}
                        {email && (
                          <span className="text-fm-neutral-400 block text-xs mt-0.5">{email}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <DashboardButton variant="secondary" size="sm" onClick={reset}>
                  Back
                </DashboardButton>
                <DashboardButton variant="primary" size="sm" onClick={handleImport}>
                  <Upload className="w-4 h-4" />
                  Import {records.length} Contacts
                </DashboardButton>
              </div>
            </div>
          )}

          {/* Importing */}
          {state === 'importing' && (
            <div className="flex flex-col items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fm-magenta-600 mb-4" />
              <p className="text-sm text-fm-neutral-600">Importing {records.length} contacts...</p>
            </div>
          )}

          {/* Done */}
          {state === 'done' && result && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4">
                <CheckCircle className="w-10 h-10 text-green-500 mb-3" />
                <p className="text-lg font-semibold text-fm-neutral-900">Import Complete</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div style={{ textAlign: 'center' }} className="bg-green-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-700">{result.inserted}</p>
                  <p className="text-xs text-green-600">Imported</p>
                </div>
                <div style={{ textAlign: 'center' }} className="bg-fm-neutral-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-fm-neutral-700">{result.skipped}</p>
                  <p className="text-xs text-fm-neutral-500">Skipped (duplicates)</p>
                </div>
              </div>

              <DashboardButton variant="primary" size="sm" onClick={handleClose} className="w-full justify-center">
                Done
              </DashboardButton>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
