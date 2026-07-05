import React, { useState, useEffect } from 'react';
import { FiFileText, FiUpload, FiZap } from 'react-icons/fi';
import sessionService from '../../services/sessionService';
import { toast } from 'react-toastify';

const SessionLifecyclePanel = ({ session, filter }) => {
  const [agenda, setAgenda] = useState(null);
  const [noteContent, setNoteContent] = useState('');
  const [weakTopics, setWeakTopics] = useState('');
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const isPast = filter === 'past' || session?.status === 'completed';

  useEffect(() => {
    if (!session?.id) return;
    sessionService.getAgenda(session.id).then(setAgenda).catch(() => setAgenda(null));
    if (isPast) {
      sessionService.getNotes(session.id).then((notes) => {
        const post = notes.find((n) => n.noteType === 'post');
        if (post) {
          setNoteContent(post.content || '');
          setWeakTopics((post.weakTopics || []).join(', '));
        }
      }).catch(() => {});
      sessionService.getSummary(session.id).then(setSummary).catch(() => setSummary(null));
    }
  }, [session?.id, isPast]);

  const savePostNote = async () => {
    try {
      await sessionService.saveNote(session.id, {
        noteType: 'post',
        content: noteContent,
        weakTopics: weakTopics.split(',').map((t) => t.trim()).filter(Boolean),
      });
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    }
  };

  const generateSummary = async () => {
    setLoadingSummary(true);
    try {
      await sessionService.saveNote(session.id, {
        noteType: 'post',
        content: noteContent,
        weakTopics: weakTopics.split(',').map((t) => t.trim()).filter(Boolean),
      });
      const data = await sessionService.generateSummary(session.id);
      setSummary(data);
      toast.success(data.aiGenerated ? 'AI summary generated' : 'Summary created');
    } catch {
      toast.error('Failed to generate summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  const uploadFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await sessionService.uploadVaultFile(session.id, file, file.name);
      toast.success('File saved to subject vault');
    } catch {
      toast.error('Upload failed');
    }
  };

  if (!session) return null;

  return (
    <div className="session-lifecycle-panel">
      <h3><FiFileText /> Session materials</h3>

      {agenda && (agenda.sessionGoal || agenda.pastPaperRef || agenda.topics?.length) && (
        <div className="lifecycle-block">
          <strong>Agenda</strong>
          {agenda.sessionGoal && <p>{agenda.sessionGoal}</p>}
          {agenda.pastPaperRef && <p className="text-muted">Past paper: {agenda.pastPaperRef}</p>}
          {agenda.topics?.length > 0 && (
            <p className="text-muted">Topics: {agenda.topics.join(', ')}</p>
          )}
          {agenda.checklist?.length > 0 && (
            <ul className="checklist-preview">
              {agenda.checklist.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
        </div>
      )}

      {isPast && (
        <>
          <div className="lifecycle-block">
            <strong>Post-session notes</strong>
            <textarea className="input-field" rows={3} value={noteContent}
              placeholder="What did you cover? Key points discussed..."
              onChange={(e) => setNoteContent(e.target.value)} />
            <input className="input-field mt-sm" value={weakTopics}
              placeholder="Topics still unclear (comma-separated)"
              onChange={(e) => setWeakTopics(e.target.value)} />
            <div className="lifecycle-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={savePostNote}>Save notes</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={loadingSummary} onClick={generateSummary}>
                <FiZap /> {loadingSummary ? 'Generating…' : 'Generate summary'}
              </button>
            </div>
          </div>

          {summary?.summary_text && (
            <div className="lifecycle-block summary-block">
              <strong>Session summary {summary.aiGenerated && '(AI)'}</strong>
              <p>{summary.summary_text}</p>
              {summary.actionItems?.length > 0 && (
                <>
                  <strong>Action items</strong>
                  <ul>{summary.actionItems.map((item) => <li key={item}>{item}</li>)}</ul>
                </>
              )}
            </div>
          )}

          <div className="lifecycle-block">
            <label className="btn btn-outline btn-sm">
              <FiUpload /> Save file to subject vault
              <input type="file" hidden onChange={uploadFile} />
            </label>
          </div>
        </>
      )}
    </div>
  );
};

export default SessionLifecyclePanel;
