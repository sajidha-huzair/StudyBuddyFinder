import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/authService';
import { toast } from 'react-toastify';
import './ProfileSetup.css';

import { SUBJECTS } from '../../constants/subjects';
const LEARNING_STYLES = ['Visual', 'Auditory', 'Reading/Writing', 'Kinesthetic'];
const EDUCATION_LEVELS = ['GCE O/L', 'GCE A/L', 'University'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate'];
const STUDY_GOALS = ['Exam Preparation', 'Assignment Help', 'Concept Understanding', 'Project Work', 'General Study'];

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);

  const formik = useFormik({
    initialValues: {
      educationLevel: user?.educationLevel || '',
      university: user?.university || '',
      major: user?.major || '',
      year: user?.year || '',
      grade: user?.grade || '',
      subjects: user?.subjects || [],
      strengths: user?.strengths || [],
      weaknesses: user?.weaknesses || [],
      studyGoals: user?.studyGoals || [],
      learningStyle: user?.learningStyle || '',
      bio: user?.bio || ''
    },
    validationSchema: Yup.object({
      educationLevel: Yup.string().required('Education level is required'),
      university: Yup.string().when('educationLevel', {
        is: 'University',
        then: (schema) => schema.required('University is required'),
        otherwise: (schema) => schema.notRequired()
      }),
      major: Yup.string().when('educationLevel', {
        is: 'University',
        then: (schema) => schema.required('Major/Program is required'),
        otherwise: (schema) => schema.notRequired()
      }),
      year: Yup.string().when('educationLevel', {
        is: 'University',
        then: (schema) => schema.required('Year of study is required'),
        otherwise: (schema) => schema.notRequired()
      }),
      subjects: Yup.array().min(1, 'Select at least one subject').required(),
      strengths: Yup.array().min(1, 'Select at least one strength'),
      weaknesses: Yup.array().min(1, 'Select at least one weakness'),
      studyGoals: Yup.array().min(1, 'Select at least one study goal'),
      learningStyle: Yup.string().required('Select your learning style'),
      bio: Yup.string().max(200, 'Bio must be less than 200 characters')
    }),
    onSubmit: async (values) => {
      try {
        await authService.updateProfile({ ...values, profileCompleted: true });
        updateUser({ profileCompleted: true });
        toast.success('Profile setup complete!');
        navigate('/availability');
      } catch (error) {
        toast.error('Failed to save profile');
      }
    }
  });

  const toggleArrayField = (field, value) => {
    const current = formik.values[field];
    if (current.includes(value)) {
      formik.setFieldValue(field, current.filter(v => v !== value));
    } else {
      formik.setFieldValue(field, [...current, value]);
    }
  };

  return (
    <div className="profile-setup">
      <div className="setup-container">
        <div className="setup-header">
          <h1>Complete Your Profile</h1>
          <p>Help us find the perfect study partners for you</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(step / 4) * 100}%` }}></div>
          </div>
        </div>

        <form onSubmit={formik.handleSubmit} className="setup-form">
          {step === 1 && (
            <div className="form-step">
              <h2>Basic Information</h2>
              <p>Tell us about your academic background</p>
              
              <div className="form-group">
                <label>Education Level *</label>
                <select name="educationLevel" {...formik.getFieldProps('educationLevel')}>
                  <option value="">Select education level</option>
                  {EDUCATION_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
                {formik.touched.educationLevel && formik.errors.educationLevel && (
                  <span className="error-message">{formik.errors.educationLevel}</span>
                )}
              </div>

              {formik.values.educationLevel === 'University' && (
                <>
                  <div className="form-group">
                    <label>University/Institution *</label>
                    <input
                      type="text"
                      name="university"
                      placeholder="e.g., University of Moratuwa"
                      {...formik.getFieldProps('university')}
                    />
                    {formik.touched.university && formik.errors.university && (
                      <span className="error-message">{formik.errors.university}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Major/Program *</label>
                    <input
                      type="text"
                      name="major"
                      placeholder="e.g., Computer Science & Engineering"
                      {...formik.getFieldProps('major')}
                    />
                    {formik.touched.major && formik.errors.major && (
                      <span className="error-message">{formik.errors.major}</span>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Year of Study *</label>
                      <select name="year" {...formik.getFieldProps('year')}>
                        <option value="">Select year</option>
                        {YEARS.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      {formik.touched.year && formik.errors.year && (
                        <span className="error-message">{formik.errors.year}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Current GPA/Grade (Optional)</label>
                      <input
                        type="text"
                        name="grade"
                        placeholder="e.g., 3.8 or A"
                        {...formik.getFieldProps('grade')}
                      />
                    </div>
                  </div>
                </>
              )}

              {(formik.values.educationLevel === 'GCE O/L' || formik.values.educationLevel === 'GCE A/L') && (
                <div className="form-group">
                  <label>School/Institution (Optional)</label>
                  <input
                    type="text"
                    name="university"
                    placeholder="e.g., Royal College Colombo"
                    {...formik.getFieldProps('university')}
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="form-step">
              <h2>Select Your Subjects</h2>
              <p>Choose the subjects you're currently studying</p>
              <div className="checkbox-grid">
                {SUBJECTS.map(subject => (
                  <label key={subject} className="checkbox-card">
                    <input
                      type="checkbox"
                      checked={formik.values.subjects.includes(subject)}
                      onChange={() => toggleArrayField('subjects', subject)}
                    />
                    <span>{subject}</span>
                  </label>
                ))}
              </div>
              {formik.touched.subjects && formik.errors.subjects && (
                <span className="error-message">{formik.errors.subjects}</span>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="form-step">
              <h2>Your Strengths & Weaknesses</h2>
              <p>Help us match you with complementary partners</p>
              
              <div className="input-group">
                <label className="input-label">Strengths</label>
                <div className="checkbox-grid">
                  {formik.values.subjects.map(subject => (
                    <label key={subject} className="checkbox-card">
                      <input
                        type="checkbox"
                        checked={formik.values.strengths.includes(subject)}
                        onChange={() => toggleArrayField('strengths', subject)}
                      />
                      <span>{subject}</span>
                    </label>
                  ))}
                </div>
                {formik.touched.strengths && formik.errors.strengths && (
                  <span className="error-message">{formik.errors.strengths}</span>
                )}
              </div>

              <div className="input-group mt-lg">
                <label className="input-label">Areas to Improve</label>
                <div className="checkbox-grid">
                  {formik.values.subjects.map(subject => (
                    <label key={subject} className="checkbox-card">
                      <input
                        type="checkbox"
                        checked={formik.values.weaknesses.includes(subject)}
                        onChange={() => toggleArrayField('weaknesses', subject)}
                      />
                      <span>{subject}</span>
                    </label>
                  ))}
                </div>
                {formik.touched.weaknesses && formik.errors.weaknesses && (
                  <span className="error-message">{formik.errors.weaknesses}</span>
                )}
              </div>

              <div className="input-group mt-lg">
                <label className="input-label">Study Goals</label>
                <div className="checkbox-grid">
                  {STUDY_GOALS.map(goal => (
                    <label key={goal} className="checkbox-card">
                      <input
                        type="checkbox"
                        checked={formik.values.studyGoals.includes(goal)}
                        onChange={() => toggleArrayField('studyGoals', goal)}
                      />
                      <span>{goal}</span>
                    </label>
                  ))}
                </div>
                {formik.touched.studyGoals && formik.errors.studyGoals && (
                  <span className="error-message">{formik.errors.studyGoals}</span>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="form-step">
              <h2>Learning Preferences</h2>
              <p>Tell us how you learn best</p>

              <div className="input-group">
                <label className="input-label">Learning Style</label>
                <div className="radio-grid">
                  {LEARNING_STYLES.map(style => (
                    <label key={style} className="radio-card">
                      <input
                        type="radio"
                        name="learningStyle"
                        value={style}
                        checked={formik.values.learningStyle === style}
                        onChange={formik.handleChange}
                      />
                      <span>{style}</span>
                    </label>
                  ))}
                </div>
                {formik.touched.learningStyle && formik.errors.learningStyle && (
                  <span className="error-message">{formik.errors.learningStyle}</span>
                )}
              </div>

              <div className="input-group mt-lg">
                <label htmlFor="bio" className="input-label">About You (Optional)</label>
                <textarea
                  id="bio"
                  className="input-field"
                  rows="4"
                  placeholder="Tell potential study buddies a bit about yourself..."
                  {...formik.getFieldProps('bio')}
                />
                <small className="text-muted">{formik.values.bio.length}/200</small>
              </div>
            </div>
          )}

          <div className="form-actions">
            {step > 1 && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep(step + 1)}
              >
                Next
              </button>
            ) : (
              <button type="submit" className="btn btn-primary">
                Complete Setup
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
