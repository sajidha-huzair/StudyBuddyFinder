import React, { useState, useEffect, useRef } from 'react';
import { FiFolder, FiUpload, FiGrid, FiList } from 'react-icons/fi';
import sessionService from '../../services/sessionService';
import { flattenSubjects } from '../../constants/curriculum/sl';
import { useAuth } from '../../contexts/AuthContext';
import VaultFileTile from '../../components/vault/VaultFileTile';
import VaultPreviewPanel from '../../components/vault/VaultPreviewPanel';
import { toast } from 'react-toastify';

const VIEW_KEY = 'vaultViewMode';

const SubjectVaultPage = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(VIEW_KEY) || 'grid');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const subjects = flattenSubjects(user) || [];

  const loadFiles = async () => {
    setLoading(true);
    try {
      setFiles(await sessionService.getVaultFiles(subjectFilter));
    } catch {
      toast.error('Failed to load vault');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [subjectFilter]);

  useEffect(() => {
    if (!uploadSubject && subjects.length) {
      setUploadSubject(subjects[0]);
    }
  }, [subjects, uploadSubject]);

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, viewMode);
  }, [viewMode]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!uploadSubject) {
      toast.error('Choose a subject first');
      return;
    }
    setUploading(true);
    try {
      await sessionService.uploadVaultFileStandalone(file, {
        subject: uploadSubject,
        title: uploadTitle.trim() || file.name,
      });
      toast.success('File uploaded to vault');
      setUploadTitle('');
      loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const grouped = files.reduce((acc, file) => {
    const key = file.subject || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(file);
    return acc;
  }, {});

  const subjectOptions = subjects.length
    ? subjects
    : ['Geography', 'History', 'Mathematics', 'Science', 'English'];

  return (
    <div className="page-container vault-page">
      {selectedFile && (
        <VaultPreviewPanel
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onUpdated={(updated) => {
            setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
            setSelectedFile(updated);
          }}
          onDeleted={(id) => {
            setFiles((prev) => prev.filter((f) => f.id !== id));
            setSelectedFile(null);
          }}
        />
      )}
      <div className="vault-page-header">
        <div>
          <h1><FiFolder /> Subject Vault</h1>
          <p className="page-intro">Store notes, past papers, and study files by subject.</p>
        </div>
        <div className="vault-view-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
            title="Icon view"
            aria-pressed={viewMode === 'grid'}
          >
            <FiGrid />
          </button>
          <button
            type="button"
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
            title="List view"
            aria-pressed={viewMode === 'list'}
          >
            <FiList />
          </button>
        </div>
      </div>

      <div className="card vault-upload-card vault-upload-compact">
        <div className="vault-upload-row">
          <div className="vault-upload-icon" aria-hidden="true"><FiUpload /></div>
          <div className="form-group vault-upload-field">
            <label>Subject</label>
            <select
              className="input-field input-field-sm"
              value={uploadSubject}
              onChange={(e) => setUploadSubject(e.target.value)}
            >
              {subjectOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="form-group vault-upload-field vault-upload-title-field">
            <label>Title (optional)</label>
            <input
              type="text"
              className="input-field input-field-sm"
              placeholder="Past paper notes…"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
            onChange={handleUpload}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm vault-upload-btn"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'Upload file'}
          </button>
        </div>
        <p className="text-muted vault-upload-hint">PDF, Word, images, or text — max 5 MB</p>
      </div>

      <div className="vault-toolbar">
        <div className="filter-bar card vault-filter-bar">
          <label className="text-muted">Subject</label>
          <select className="input-field input-field-sm" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="">All subjects</option>
            {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <span className="text-muted vault-file-count">
          {files.length} file{files.length === 1 ? '' : 's'}
        </span>
      </div>

      {loading ? (
        <div className="flex-center"><div className="spinner" /></div>
      ) : files.length === 0 ? (
        <div className="empty-state card">
          <p>No files yet. Upload above or save from a completed session.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([subject, subjectFiles]) => (
          <section key={subject} className="vault-subject-folder">
            <header className="vault-subject-folder-header">
              <FiFolder className="vault-folder-icon" />
              <h2>{subject}</h2>
              <span className="text-muted vault-folder-count">{subjectFiles.length}</span>
            </header>
            <div className={viewMode === 'grid' ? 'vault-file-grid' : 'vault-file-list-view'}>
              {subjectFiles.map((f) => (
                <VaultFileTile
                  key={f.id}
                  file={f}
                  view={viewMode}
                  onSelect={setSelectedFile}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
};

export default SubjectVaultPage;
