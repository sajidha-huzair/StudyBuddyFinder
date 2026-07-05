import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/authService';
import ProfileFormSteps, { buildInitialValues, buildProfilePayload, getSelectableSubjects } from '../../components/profile/ProfileFormSteps';
import { toast } from 'react-toastify';
import './ProfileSetup.css';

const validationSchema = Yup.object({
  gradeBand: Yup.string().required('Select your grade level'),
  grade: Yup.string().required('Select your grade'),
  school: Yup.string().required('School is required'),
  medium: Yup.string().required('Medium is required'),
  stream: Yup.string().when('gradeBand', {
    is: 'AL',
    then: (s) => s.required('Select your A/L stream'),
  }),
  strengths: Yup.array().min(1, 'Select at least one strength'),
  weaknesses: Yup.array().min(1, 'Select at least one area to improve'),
  studyGoals: Yup.array().min(1, 'Select at least one study goal'),
  learningStyles: Yup.array().min(1, 'Select at least one learning style'),
  bio: Yup.string().max(200),
});

const validateSubjects = (values) => {
  const errors = {};
  if (values.gradeBand === 'JUNIOR' && values.subjects.length < 3) {
    errors.subjects = 'Select at least 3 subjects';
  }
  if (values.gradeBand === 'OL' && values.olOptional.length !== 3) {
    errors.olOptional = 'Select exactly 3 optional O/L subjects';
  }
  if (values.gradeBand === 'AL') {
    const pick = values.stream === 'TECHNOLOGY' ? 3 : (values.stream ? 3 : 0);
    if (values.alSubjects.length !== pick) {
      errors.alSubjects = `Select exactly ${pick} A/L subjects`;
    }
  }
  return errors;
};

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);

  const formik = useFormik({
    initialValues: buildInitialValues(user),
    validationSchema,
    validate: validateSubjects,
    onSubmit: async (values) => {
      try {
        await authService.updateProfile(buildProfilePayload(values));
        updateUser({ profileCompleted: true });
        toast.success('Profile setup complete!');
        navigate('/availability');
      } catch {
        toast.error('Failed to save profile');
      }
    },
  });

  const canNext = () => {
    const v = formik.values;
    if (step === 1) return v.gradeBand && v.grade && v.school && v.medium && (v.gradeBand !== 'AL' || v.stream);
    if (step === 2) {
      if (v.gradeBand === 'JUNIOR') return v.subjects.length >= 3;
      if (v.gradeBand === 'OL') return v.olOptional.length === 3;
      if (v.gradeBand === 'AL') return v.alSubjects.length === 3;
    }
    if (step === 3) return v.strengths.length && v.weaknesses.length && v.studyGoals.length;
    if (step === 4) return v.learningStyles.length >= 1;
    return true;
  };

  return (
    <div className="profile-setup">
      <div className="setup-container">
        <div className="setup-header">
          <h1>Complete Your Profile</h1>
          <p>Sri Lankan O/L & A/L students — online study partners matched to your syllabus</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        </div>

        <form onSubmit={formik.handleSubmit} className="setup-form">
          <ProfileFormSteps formik={formik} step={step} />

          <div className="form-actions">
            {step > 1 && (
              <button type="button" className="btn btn-outline" onClick={() => setStep(step - 1)}>Back</button>
            )}
            {step < 4 ? (
              <button type="button" className="btn btn-primary" disabled={!canNext()} onClick={() => setStep(step + 1)}>
                Next
              </button>
            ) : (
              <button type="submit" className="btn btn-primary">Complete Setup</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
