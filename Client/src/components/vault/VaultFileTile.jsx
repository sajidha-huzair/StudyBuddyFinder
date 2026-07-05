import React from 'react';
import {
  FiFile, FiFileText, FiDownload,
} from 'react-icons/fi';

const EXT = {
  pdf: 'pdf',
  doc: 'doc',
  docx: 'doc',
  txt: 'text',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
};

export function getVaultFileKind(file) {
  const sources = [file?.fileName, file?.title, file?.fileUrl].filter(Boolean);
  for (const raw of sources) {
    const name = String(raw).split('?')[0].toLowerCase();
    const ext = name.split('.').pop();
    if (ext && EXT[ext]) return EXT[ext];
  }
  return 'file';
}

export function isVaultImage(file) {
  return getVaultFileKind(file) === 'image';
}

function FilePreviewIcon({ file }) {
  const kind = getVaultFileKind(file);
  if (kind === 'image' && file.fileUrl) {
    return (
      <img
        src={file.fileUrl}
        alt=""
        className="vault-tile-preview-img"
        loading="lazy"
      />
    );
  }
  const cls = `vault-tile-preview-icon vault-tile-preview-${kind}`;
  if (kind === 'pdf') return <div className={cls}><FiFileText /></div>;
  if (kind === 'doc') return <div className={cls}><FiFile /></div>;
  if (kind === 'text') return <div className={cls}><FiFileText /></div>;
  return <div className={cls}><FiFile /></div>;
}

export function VaultFileTile({ file, view = 'grid', onSelect }) {
  const kind = getVaultFileKind(file);

  const handleClick = (e) => {
    e.preventDefault();
    onSelect?.(file);
  };

  if (view === 'list') {
    return (
      <button type="button" onClick={handleClick} className="vault-file-list-row">
        <div className="vault-file-list-thumb">
          <FilePreviewIcon file={file} />
        </div>
        <div className="vault-file-list-body">
          <span className="vault-file-title">{file.title}</span>
          {file.sessionTitle && (
            <span className="text-muted vault-file-session">{file.sessionTitle}</span>
          )}
          <span className="vault-file-type-label">{kind.toUpperCase()}</span>
        </div>
        <span className="vault-file-list-action" aria-hidden="true"><FiDownload /></span>
      </button>
    );
  }

  return (
    <button type="button" onClick={handleClick} className="vault-file-tile" title={file.title}>
      <div className="vault-file-tile-preview">
        <FilePreviewIcon file={file} />
        <span className="vault-file-tile-badge">{kind === 'image' ? 'IMG' : kind.toUpperCase()}</span>
      </div>
      <p className="vault-file-tile-name">{file.title}</p>
      {file.sessionTitle && (
        <p className="vault-file-tile-session">{file.sessionTitle}</p>
      )}
      <span className="vault-file-tile-open">Preview</span>
    </button>
  );
}

export default VaultFileTile;
