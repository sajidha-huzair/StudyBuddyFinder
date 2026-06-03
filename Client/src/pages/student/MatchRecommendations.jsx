import React, { useState, useEffect } from 'react';
import { FiStar, FiFilter, FiSearch, FiChevronRight, FiClock, FiBookmark } from 'react-icons/fi';
import matchService from '../../services/matchService';
import BuddyDetailModal from '../../components/matches/BuddyDetailModal';
import VerifiedBadge from '../../components/common/VerifiedBadge';
import { SUBJECTS } from '../../constants/subjects';
import { toast } from 'react-toastify';
import './MatchRecommendations.css';

const LEARNING_STYLES = ['', 'Visual', 'Auditory', 'Reading/Writing', 'Kinesthetic'];
const SORT_OPTIONS = [
  { value: 'compatibility', label: 'Best match' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'active', label: 'Recently active' },
];

const ACTIVITY_LABELS = {
  today: 'Active today',
  week: 'Active this week',
  inactive: 'Not recently active',
};

const EDUCATION_LEVELS = ['', 'GCE O/L', 'GCE A/L', 'University'];

const MatchRecommendations = () => {
  const [matches, setMatches] = useState([]);
  const [viewMode, setViewMode] = useState('all');
  const [filters, setFilters] = useState({
    subject: '',
    educationLevel: '',
    university: '',
    search: '',
    minCompatibility: 15,
    learningStyle: '',
    sort: 'compatibility',
  });
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMatches();
  }, [filters, viewMode]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const data = viewMode === 'saved'
        ? await matchService.getBookmarks(filters)
        : await matchService.getRecommendations(filters);
      setMatches(data);
    } catch {
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBookmark = async (userId, event) => {
    event?.stopPropagation();
    try {
      const result = await matchService.toggleBookmark(userId);
      setMatches((prev) => prev.map((m) => (
        m.id === userId ? { ...m, isBookmarked: result.bookmarked } : m
      )));
      if (selectedMatch?.id === userId) {
        setSelectedMatch((prev) => (prev ? { ...prev, isBookmarked: result.bookmarked } : null));
      }
      if (viewMode === 'saved' && !result.bookmarked) {
        setMatches((prev) => prev.filter((m) => m.id !== userId));
      }
      toast.success(result.bookmarked ? 'Profile saved' : 'Removed from saved');
    } catch {
      toast.error('Could not update bookmark');
    }
  };

  const sendRequest = async (userId, message) => {
    setSending(true);
    try {
      await matchService.sendRequest(userId, message || 'Hi! Would you like to study together?');
      toast.success('Request sent!');
      setMatches(matches.filter((m) => m.id !== userId));
      setSelectedMatch(null);
    } catch {
      toast.error('Failed to send request');
    } finally {
      setSending(false);
    }
  };

  const openDetails = (match) => setSelectedMatch(match);

  const handleCardKeyDown = (event, match) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDetails(match);
    }
  };

  if (loading && matches.length === 0) {
    return <div className="flex-center"><div className="spinner" /></div>;
  }

  return (
    <div className="match-recommendations">
      <div className="page-header">
        <h1>Find Study Buddies</h1>
        <p>Discover students with complementary skills and interests</p>
      </div>

      <div className="match-view-tabs">
        <button
          type="button"
          className={`view-tab ${viewMode === 'all' ? 'active' : ''}`}
          onClick={() => setViewMode('all')}
        >
          All matches
        </button>
        <button
          type="button"
          className={`view-tab ${viewMode === 'saved' ? 'active' : ''}`}
          onClick={() => setViewMode('saved')}
        >
          <FiBookmark /> Saved
        </button>
      </div>

      <div className="filter-bar card">
        <FiFilter />
        <input
          type="text"
          placeholder="Search by name..."
          className="input-field"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          className="input-field"
          value={filters.subject}
          onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
        >
          <option value="">All subjects</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="input-field"
          value={filters.educationLevel}
          onChange={(e) => setFilters({ ...filters, educationLevel: e.target.value })}
        >
          {EDUCATION_LEVELS.map((level) => (
            <option key={level || 'all'} value={level}>
              {level || 'All education levels'}
            </option>
          ))}
        </select>
        <select
          className="input-field"
          value={filters.learningStyle}
          onChange={(e) => setFilters({ ...filters, learningStyle: e.target.value })}
        >
          {LEARNING_STYLES.map((style) => (
            <option key={style || 'all-styles'} value={style}>
              {style || 'All learning styles'}
            </option>
          ))}
        </select>
        <select
          className="input-field"
          value={filters.sort}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="University / school..."
          className="input-field"
          value={filters.university}
          onChange={(e) => setFilters({ ...filters, university: e.target.value })}
        />
      </div>

      <div className="compat-slider-row card">
        <label htmlFor="minCompat">
          Min compatibility: <strong>{filters.minCompatibility}%</strong>
        </label>
        <input
          id="minCompat"
          type="range"
          min="0"
          max="80"
          step="5"
          value={filters.minCompatibility}
          onChange={(e) => setFilters({ ...filters, minCompatibility: Number(e.target.value) })}
        />
      </div>

      <div className="matches-grid">
        {matches.length === 0 ? (
          <div className="empty-state">
            <FiSearch size={40} />
            <p>
              {viewMode === 'saved'
                ? 'No saved profiles yet. Bookmark interesting matches to review them later.'
                : 'No matches found. Try adjusting your filters or complete your profile.'}
            </p>
          </div>
        ) : (
          matches.map((match) => {
            const previewSubjects = match.subjects?.slice(0, 2) || [];
            const extraSubjects = Math.max(0, (match.subjects?.length || 0) - previewSubjects.length);

            return (
              <div
                key={match.id}
                className="match-card card match-card-compact"
                role="button"
                tabIndex={0}
                onClick={() => openDetails(match)}
                onKeyDown={(e) => handleCardKeyDown(e, match)}
                aria-label={`View ${match.name}'s profile`}
              >
                <div className="match-header">
                  <div className="match-avatar">{match.name.charAt(0)}</div>
                  <div className="match-header-badges">
                    {match.activityStatus && (
                      <span className={`activity-badge activity-${match.activityStatus}`}>
                        {ACTIVITY_LABELS[match.activityStatus]}
                      </span>
                    )}
                    <button
                      type="button"
                      className={`bookmark-btn ${match.isBookmarked ? 'bookmarked' : ''}`}
                      onClick={(e) => handleToggleBookmark(match.id, e)}
                      aria-label={match.isBookmarked ? 'Remove bookmark' : 'Save profile'}
                    >
                      <FiBookmark />
                    </button>
                    <div className="compatibility-score">
                      <FiStar />
                      <span>{match.compatibilityScore}%</span>
                    </div>
                  </div>
                </div>

                <h3>
                  {match.name}
                  <VerifiedBadge show={match.isVerified ?? match.is_verified} />
                </h3>

                <p className="match-meta">
                  {[match.educationLevel, match.university].filter(Boolean).join(' · ') || 'Student'}
                </p>

                {previewSubjects.length > 0 && (
                  <div className="match-preview-tags">
                    {previewSubjects.map((s) => (
                      <span key={s} className="badge badge-primary">{s}</span>
                    ))}
                    {extraSubjects > 0 && (
                      <span className="badge badge-primary match-more-tag">+{extraSubjects}</span>
                    )}
                  </div>
                )}

                {match.overlapCount > 0 && (
                  <span className="match-overlap-hint">
                    <FiClock /> {match.overlapCount} shared time slot{match.overlapCount !== 1 ? 's' : ''}
                  </span>
                )}

                <span className="match-view-hint">
                  View details <FiChevronRight />
                </span>
              </div>
            );
          })
        )}
      </div>

      <BuddyDetailModal
        buddy={selectedMatch}
        onClose={() => setSelectedMatch(null)}
        onSendRequest={sendRequest}
        onToggleBookmark={handleToggleBookmark}
        sending={sending}
      />
    </div>
  );
};

export default MatchRecommendations;
