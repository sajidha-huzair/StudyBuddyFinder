import React from 'react';
import {
  GRADE_BANDS, OL_COMPULSORY, OL_OPTIONAL_BASKETS, JUNIOR_SUBJECTS, AESTHETIC_OPTIONS,
  AL_STREAMS, AL_COMMON, MEDIUMS, DISTRICTS, STUDY_GOALS, LEARNING_STYLES,
  GROUP_SIZE_PREFS, STUDY_LANGUAGES, EXPLAIN_PREFS,
} from '../../constants/curriculum/sl';

const EXAM_YEARS = [2025, 2026, 2027, 2028, 2029];

const normalizeLearningStyles = (user) => {
  if (Array.isArray(user?.learningStyles) && user.learningStyles.length) {
    return user.learningStyles;
  }
  if (typeof user?.learningStyle === 'string' && user.learningStyle.trim()) {
    return user.learningStyle.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

export const buildInitialValues = (user = {}) => ({
  gradeBand: user?.gradeBand || '',
  grade: user?.grade ? String(user.grade) : '',
  school: user?.school || user?.university || '',
  district: user?.district || '',
  medium: user?.medium || '',
  examYear: user?.examYear || '',
  stream: user?.stream || '',
  technologyOption: user?.technologyOption || '',
  subjects: user?.subjects || [],
  olOptional: user?.olOptional || [],
  alSubjects: user?.alSubjects || [],
  sitsGit: user?.sitsGit || false,
  strengths: user?.strengths || [],
  weaknesses: user?.weaknesses || [],
  studyGoals: user?.studyGoals || [],
  learningStyles: normalizeLearningStyles(user),
  studyLanguage: user?.studyLanguage || '',
  groupSizePreference: user?.groupSizePreference || '1-on-1',
  pastPaperFocus: user?.pastPaperFocus || false,
  explainPreference: user?.explainPreference || '',
  mentorMode: user?.mentorMode || false,
  parentEmail: user?.parentEmail || '',
  bio: user?.bio || '',
});

export const buildProfilePayload = (values) => {
  const band = values.gradeBand;
  const gradeInfo = GRADE_BANDS[band];
  let subjects = values.subjects;
  let olOptional = values.olOptional;
  let alSubjects = values.alSubjects;

  if (band === 'OL') {
    subjects = OL_COMPULSORY;
  } else if (band === 'AL') {
    subjects = alSubjects;
  }

  return {
    educationLevel: gradeInfo?.educationLevel || '',
    gradeBand: band,
    grade: values.grade,
    school: values.school,
    university: values.school,
    district: values.district,
    medium: values.medium,
    examYear: values.examYear ? Number(values.examYear) : null,
    stream: band === 'AL' ? values.stream : '',
    subjects,
    olOptional: band === 'OL' ? olOptional : [],
    alSubjects: band === 'AL' ? alSubjects : [],
    technologyOption: values.technologyOption,
    sitsGit: values.sitsGit,
    strengths: values.strengths,
    weaknesses: values.weaknesses,
    studyGoals: values.studyGoals,
    learningStyles: values.learningStyles,
    studyLanguage: values.studyLanguage,
    groupSizePreference: values.groupSizePreference,
    pastPaperFocus: values.pastPaperFocus,
    explainPreference: values.explainPreference,
    mentorMode: values.mentorMode,
    parentEmail: values.parentEmail || null,
    bio: values.bio,
    profileCompleted: true,
  };
};

export const getSelectableSubjects = (values) => {
  const band = values.gradeBand;
  if (band === 'JUNIOR') return values.subjects;
  if (band === 'OL') return [...OL_COMPULSORY, ...values.olOptional];
  if (band === 'AL') {
    const list = [...values.alSubjects];
    if (values.sitsGit) list.push('General Information Technology (GIT)');
    return list;
  }
  return values.subjects;
};

const toggleArray = (formik, field, value, max = null) => {
  const current = formik.values[field];
  if (current.includes(value)) {
    formik.setFieldValue(field, current.filter((v) => v !== value));
  } else if (max && current.length >= max) {
    formik.setFieldValue(field, [...current.slice(1), value]);
  } else {
    formik.setFieldValue(field, [...current, value]);
  }
};

const ProfileFormSteps = ({ formik, step }) => {
  const band = formik.values.gradeBand;
  const selectableSubjects = getSelectableSubjects(formik.values);

  const onBandChange = (newBand) => {
    formik.setFieldValue('gradeBand', newBand);
    formik.setFieldValue('grade', '');
    formik.setFieldValue('subjects', []);
    formik.setFieldValue('olOptional', []);
    formik.setFieldValue('alSubjects', []);
    formik.setFieldValue('stream', '');
    formik.setFieldValue('strengths', []);
    formik.setFieldValue('weaknesses', []);
  };

  if (step === 1) {
    return (
      <div className="form-step">
        <h2>School details</h2>
        <p>Tell us your grade and school — we only match students at a compatible level.</p>

        <div className="form-group">
          <label>Grade level *</label>
          <select value={formik.values.gradeBand} onChange={(e) => onBandChange(e.target.value)}>
            <option value="">Select level</option>
            {Object.entries(GRADE_BANDS).map(([key, info]) => (
              <option key={key} value={key}>{info.label}</option>
            ))}
          </select>
        </div>

        {band && (
          <div className="form-group">
            <label>Current grade *</label>
            <select name="grade" value={formik.values.grade} onChange={formik.handleChange}>
              <option value="">Select grade</option>
              {GRADE_BANDS[band].grades.map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>School *</label>
            <input type="text" name="school" placeholder="e.g., Royal College Colombo"
              value={formik.values.school} onChange={formik.handleChange} />
          </div>
          <div className="form-group">
            <label>District</label>
            <select name="district" value={formik.values.district} onChange={formik.handleChange}>
              <option value="">Select district</option>
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Medium of study *</label>
            <select name="medium" value={formik.values.medium} onChange={formik.handleChange}>
              <option value="">Select medium</option>
              {MEDIUMS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {(band === 'OL' || band === 'AL') && (
            <div className="form-group">
              <label>Target exam year</label>
              <select name="examYear" value={formik.values.examYear} onChange={formik.handleChange}>
                <option value="">Select year</option>
                {EXAM_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
        </div>

        {band === 'AL' && (
          <>
            <div className="form-group">
              <label>A/L stream *</label>
              <select name="stream" value={formik.values.stream} onChange={(e) => {
                formik.setFieldValue('stream', e.target.value);
                formik.setFieldValue('alSubjects', []);
              }}>
                <option value="">Select stream</option>
                {Object.entries(AL_STREAMS).map(([key, info]) => (
                  <option key={key} value={key}>{info.label}</option>
                ))}
              </select>
            </div>
            {formik.values.stream === 'TECHNOLOGY' && (
              <div className="form-group">
                <label>Technology option *</label>
                <select name="technologyOption" value={formik.values.technologyOption} onChange={(e) => {
                  formik.setFieldValue('technologyOption', e.target.value);
                  formik.setFieldValue('alSubjects', AL_STREAMS.TECHNOLOGY.options[e.target.value] || []);
                }}>
                  <option value="">Select option</option>
                  <option value="ENGINEERING">Engineering Technology</option>
                  <option value="BIOSYSTEMS">Bio Systems Technology</option>
                </select>
              </div>
            )}
          </>
        )}

        {band === 'AL' && formik.values.mentorMode !== undefined && (
          <label className="checkbox-card mentor-toggle">
            <input type="checkbox" checked={formik.values.mentorMode}
              onChange={(e) => formik.setFieldValue('mentorMode', e.target.checked)} />
            <span>Open to mentoring O/L students (online only)</span>
          </label>
        )}
      </div>
    );
  }

  if (step === 2) {
    if (band === 'JUNIOR') {
      return (
        <div className="form-step">
          <h2>Your subjects</h2>
          <p>Select the subjects you are studying (Grades 6–9).</p>
          <div className="checkbox-grid">
            {JUNIOR_SUBJECTS.map((subject) => (
              <label key={subject} className="checkbox-card">
                <input type="checkbox" checked={formik.values.subjects.includes(subject)}
                  onChange={() => toggleArray(formik, 'subjects', subject)} />
                <span>{subject}</span>
              </label>
            ))}
          </div>
          <p className="text-muted mt-sm">If you take an aesthetic subject, pick Art, Music, Dancing, or Drama below:</p>
          <div className="checkbox-grid">
            {AESTHETIC_OPTIONS.map((subject) => (
              <label key={subject} className="checkbox-card">
                <input type="checkbox" checked={formik.values.subjects.includes(subject)}
                  onChange={() => toggleArray(formik, 'subjects', subject)} />
                <span>{subject}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (band === 'OL') {
      return (
        <div className="form-step">
          <h2>O/L subjects</h2>
          <p>Compulsory subjects are included automatically. Choose exactly 3 optional subjects.</p>
          <div className="ol-compulsory-list">
            <strong>Compulsory (6):</strong> {OL_COMPULSORY.join(', ')}
          </div>
          {Object.entries(OL_OPTIONAL_BASKETS).map(([basketKey, items]) => (
            <div key={basketKey} className="input-group mt-md">
              <label className="input-label">{basketKey.replace('basket', 'Basket ')}</label>
              <div className="checkbox-grid">
                {items.map((subject) => (
                  <label key={subject} className="checkbox-card">
                    <input type="checkbox" checked={formik.values.olOptional.includes(subject)}
                      onChange={() => toggleArray(formik, 'olOptional', subject, 3)} />
                    <span>{subject}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <p className="text-muted">Selected optional: {formik.values.olOptional.length}/3</p>
        </div>
      );
    }

    if (band === 'AL' && formik.values.stream) {
      const streamInfo = AL_STREAMS[formik.values.stream];
      const pick = streamInfo.pick || 3;
      const options = formik.values.stream === 'TECHNOLOGY' && formik.values.technologyOption
        ? AL_STREAMS.TECHNOLOGY.options[formik.values.technologyOption]
        : streamInfo.subjects;

      return (
        <div className="form-step">
          <h2>A/L subjects</h2>
          <p>Select your {pick} A/L subjects for {streamInfo.label}.</p>
          {formik.values.stream !== 'TECHNOLOGY' && (
            <div className="checkbox-grid">
              {options.map((subject) => (
                <label key={subject} className="checkbox-card">
                  <input type="checkbox" checked={formik.values.alSubjects.includes(subject)}
                    onChange={() => toggleArray(formik, 'alSubjects', subject, pick)} />
                  <span>{subject}</span>
                </label>
              ))}
            </div>
          )}
          {formik.values.stream === 'TECHNOLOGY' && formik.values.technologyOption && (
            <p className="text-muted">Technology subjects: {formik.values.alSubjects.join(', ')}</p>
          )}
          <p className="text-muted">Selected: {formik.values.alSubjects.length}/{pick}</p>
          <label className="checkbox-card mt-md">
            <input type="checkbox" checked={formik.values.sitsGit}
              onChange={(e) => formik.setFieldValue('sitsGit', e.target.checked)} />
            <span>Sitting for GIT exam ({AL_COMMON[1]})</span>
          </label>
        </div>
      );
    }

    return (
      <div className="form-step">
        <p className="text-muted">Complete step 1 first to select subjects.</p>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="form-step">
        <h2>Strengths & areas to improve</h2>
        <p>Pick from your subjects — this powers personalized matching.</p>
        {selectableSubjects.length === 0 ? (
          <p className="text-muted">Select subjects in the previous step first.</p>
        ) : (
          <>
            <div className="input-group">
              <label className="input-label">Strengths *</label>
              <div className="checkbox-grid">
                {selectableSubjects.map((subject) => (
                  <label key={`s-${subject}`} className="checkbox-card">
                    <input type="checkbox" checked={formik.values.strengths.includes(subject)}
                      onChange={() => toggleArray(formik, 'strengths', subject)} />
                    <span>{subject}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="input-group mt-lg">
              <label className="input-label">Areas to improve *</label>
              <div className="checkbox-grid">
                {selectableSubjects.map((subject) => (
                  <label key={`w-${subject}`} className="checkbox-card">
                    <input type="checkbox" checked={formik.values.weaknesses.includes(subject)}
                      onChange={() => toggleArray(formik, 'weaknesses', subject)} />
                    <span>{subject}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="input-group mt-lg">
              <label className="input-label">Study goals *</label>
              <div className="checkbox-grid">
                {STUDY_GOALS.map((goal) => (
                  <label key={goal} className="checkbox-card">
                    <input type="checkbox" checked={formik.values.studyGoals.includes(goal)}
                      onChange={() => toggleArray(formik, 'studyGoals', goal)} />
                    <span>{goal}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="form-step">
      <h2>Learning preferences</h2>
      <p>All study sessions are online — video calls inside the app.</p>

      <div className="input-group">
        <label className="input-label">Learning styles * (select all that apply)</label>
        <div className="checkbox-grid">
          {LEARNING_STYLES.map((style) => (
            <label key={style} className="checkbox-card">
              <input
                type="checkbox"
                checked={formik.values.learningStyles.includes(style)}
                onChange={() => toggleArray(formik, 'learningStyles', style)}
              />
              <span>{style}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-row mt-md">
        <div className="form-group">
          <label>Language for study sessions</label>
          <select name="studyLanguage" value={formik.values.studyLanguage} onChange={formik.handleChange}>
            <option value="">Select</option>
            {STUDY_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Preferred group size</label>
          <select name="groupSizePreference" value={formik.values.groupSizePreference} onChange={formik.handleChange}>
            {GROUP_SIZE_PREFS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>How do you learn best with others?</label>
        <select name="explainPreference" value={formik.values.explainPreference} onChange={formik.handleChange}>
          <option value="">Select</option>
          {EXPLAIN_PREFS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <label className="checkbox-card">
        <input type="checkbox" checked={formik.values.pastPaperFocus}
          onChange={(e) => formik.setFieldValue('pastPaperFocus', e.target.checked)} />
        <span>I mainly want past paper / model paper practice</span>
      </label>

      <div className="form-group mt-md">
        <label>Parent/guardian email (optional)</label>
        <input type="email" name="parentEmail" placeholder="parent@example.com"
          value={formik.values.parentEmail} onChange={formik.handleChange} />
        <small className="text-muted">They can receive a read-only link to your session summaries.</small>
      </div>

      <div className="form-group mt-md">
        <label htmlFor="bio">About you (optional)</label>
        <textarea id="bio" className="input-field" rows="3"
          placeholder="e.g., Preparing for 2026 O/L, prefer evening sessions..."
          {...formik.getFieldProps('bio')} />
        <small className="text-muted">{formik.values.bio.length}/200</small>
      </div>
    </div>
  );
};

export default ProfileFormSteps;
