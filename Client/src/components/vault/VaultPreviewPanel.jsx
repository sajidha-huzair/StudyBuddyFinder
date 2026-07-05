import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FiX, FiDownload, FiEdit2, FiTrash2, FiShare2, FiCheck, FiExternalLink, FiFile,
} from 'react-icons/fi';
import { getVaultFileKind } from './VaultFileTile';
import VaultShareModal from './VaultShareModal';
import sessionService from '../../services/sessionService';
import { toast } from 'react-toastify';

const VaultPreviewPanel = ({ file, onClose, onUpdated, onDeleted }) => {
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(file?.title || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [blobUrl, setBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    setTitle(file?.title || '');
    setRenaming(false);
  }, [file]);

  useEffect(() => {
    if (!file?.id) return undefined;

    const kind = getVaultFileKind(file);
    if (kind === 'image') {
      setBlobUrl(null);
      setTextContent('');
      setPreviewLoading(false);
      setPreviewError(false);
      return undefined;
    }

    if (kind !== 'pdf' && kind !== 'text') {
      setBlobUrl(null);
      setPreviewLoading(false);
      return undefined;
    }

    let cancelled = false;
    let objectUrl = null;

    setPreviewLoading(true);
    setPreviewError(false);
    setTextContent('');
    setBlobUrl(null);

    sessionService.fetchVaultFilePreview(file.id)
      .then(async (blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        if (kind === 'text') {
          const text = await blob.text();
          if (!cancelled) setTextContent(text.slice(0, 50000));
        }
      })
      .catch(() => {
        if (!cancelled) setPreviewError(true);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || shareOpen) return;
      if (renaming) {
        setTitle(file?.title || '');
        setRenaming(false);
        return;
      }
      onClose?.();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, shareOpen, renaming, file?.title]);

  if (!file) return null;

  const kind = getVaultFileKind(file);
  const downloadTarget = blobUrl || file.fileUrl;

  const handleRename = async () => {
    const next = title.trim();
    if (!next) {
      toast.error('Title cannot be empty');
      return;
    }
    if (next === file.title) {
      setRenaming(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await sessionService.renameVaultFile(file.id, next);
      toast.success('Renamed');
      setRenaming(false);
      onUpdated?.(updated);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Rename failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${file.title}" from your vault?`)) return;
    setDeleting(true);
    try {
      await sessionService.deleteVaultFile(file.id);
      toast.success('File deleted');
      onDeleted?.(file.id);
      onClose?.();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const renderPreview = () => {
    if (previewLoading) {
      return <div className="flex-center vault-preview-loading"><div className="spinner" /></div>;
    }

    if (previewError && kind !== 'image') {
      return (
        <div className="vault-preview-fallback">
          <FiFile size={48} />
          <p>Could not load preview.</p>
          {file.fileUrl && (
            <a href={file.fileUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
              <FiExternalLink /> Open in new tab
            </a>
          )}
        </div>
      );
    }

    if (!file.fileUrl && !blobUrl) {
      return <div className="vault-preview-empty"><FiFile /> File unavailable</div>;
    }

    if (kind === 'image') {
      return <img src={file.fileUrl} alt={file.title} className="vault-preview-image" />;
    }

    if (kind === 'pdf' && blobUrl) {
      return (
        <iframe
          title={file.title}
          src={blobUrl}
          className="vault-preview-iframe"
        />
      );
    }

    if (kind === 'text') {
      return (
        <pre className="vault-preview-text">{textContent || 'Empty file.'}</pre>
      );
    }

    return (
      <div className="vault-preview-fallback">
        <FiFile size={48} />
        <p>Preview not available for this file type.</p>
        {downloadTarget && (
          <a href={downloadTarget} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
            <FiExternalLink /> Open in new tab
          </a>
        )}
      </div>
    );
  };

  return createPortal(
    <div
      className="vault-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="File preview"
      onClick={() => { if (!shareOpen) onClose?.(); }}
    >
      <div className="vault-preview-shell" onClick={(e) => e.stopPropagation()}>
        <header className="vault-preview-toolbar">
          <div className="vault-preview-title-wrap">
            {renaming ? (
              <div className="vault-preview-rename-row">
                <input
                  type="text"
                  className="input-field input-field-sm vault-preview-rename-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') {
                      setTitle(file.title);
                      setRenaming(false);
                    }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={saving}
                  onClick={handleRename}
                  title="Save name"
                >
                  <FiCheck />
                </button>
              </div>
            ) : (
              <>
                <h2 className="vault-preview-title">{file.title}</h2>
                <span className="vault-preview-meta">
                  {file.subject}{file.sessionTitle ? ` · ${file.sessionTitle}` : ''}
                </span>
              </>
            )}
          </div>

          <div className="vault-preview-actions">
            {!renaming && (
              <button
                type="button"
                className="vault-preview-action-btn"
                onClick={() => setRenaming(true)}
                title="Rename"
              >
                <FiEdit2 /> <span>Rename</span>
              </button>
            )}
            <button
              type="button"
              className="vault-preview-action-btn"
              onClick={() => setShareOpen(true)}
              title="Share to chat"
            >
              <FiShare2 /> <span>Share</span>
            </button>
            <a
              href={downloadTarget || '#'}
              download={file.title}
              className="vault-preview-action-btn"
              title="Download"
            >
              <FiDownload /> <span>Download</span>
            </a>
            <button
              type="button"
              className="vault-preview-action-btn vault-preview-action-danger"
              disabled={deleting}
              onClick={handleDelete}
              title="Delete"
            >
              <FiTrash2 /> <span>{deleting ? 'Deleting…' : 'Delete'}</span>
            </button>
            <button
              type="button"
              className="vault-preview-close"
              onClick={onClose}
              aria-label="Close preview"
            >
              <FiX />
            </button>
          </div>
        </header>

        <div className="vault-preview-stage">
          <div className={`vault-preview-canvas vault-preview-canvas-${kind}`}>
            {renderPreview()}
          </div>
        </div>
      </div>

      {shareOpen && (
        <VaultShareModal file={file} onClose={() => setShareOpen(false)} />
      )}
    </div>,
    document.body,
  );
};

export default VaultPreviewPanel;
