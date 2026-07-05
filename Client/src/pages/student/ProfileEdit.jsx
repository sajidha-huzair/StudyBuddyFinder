import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/authService';
import UserAvatar from '../../components/common/UserAvatar';
import ProfileFormSteps, { buildInitialValues, buildProfilePayload } from '../../components/profile/ProfileFormSteps';
import { toast } from 'react-toastify';
import './ProfileSetup.css';

const validationSchema = Yup.object({
  gradeBand: Yup.string().required('Select your grade level'),
  grade: Yup.string().required('Select your grade'),
  school: Yup.string().required('School is required'),
  medium: Yup.string().required('Medium is required'),
  strengths: Yup.array().min(1),
  weaknesses: Yup.array().min(1),
  studyGoals: Yup.array().min(1),
  learningStyles: Yup.array().min(1, 'Select at least one learning style'),
  bio: Yup.string().max(200),
});

const ProfileEdit = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarUploading(true);
    try {
      const updated = await authService.uploadAvatar(file);
      updateUser(updated);
      toast.success('Profile photo updated');
    } catch (error) {
      toast.error(error?.error || 'Failed to upload photo');
    } finally {
      setAvatarUploading(false);
    }
  };

  const formik = useFormik({
    initialValues: buildInitialValues(user),
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        const updatedUser = await authService.updateProfile(buildProfilePayload({ ...values, profileCompleted: true }));
        updateUser(updatedUser);
        toast.success('Profile updated!');
        navigate('/dashboard');
      } catch {
        toast.error('Failed to update profile');
      }
    },
  });

  return (
    <div className="profile-setup">
      <div className="setup-container">
        <div className="setup-header">
          <h1>Edit Profile</h1>
          <div className="avatar-edit-row">
            <UserAvatar user={user} size="lg" />
            <label className="btn btn-outline btn-sm">
              {avatarUploading ? 'Uploading…' : 'Change photo'}
              <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />
            </label>
          </div>
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
            <button type="button" className="btn btn-outline" onClick={() => navigate('/dashboard')}>Cancel</button>
            {step < 4 ? (
              <button type="button" className="btn btn-primary" onClick={() => setStep(step + 1)}>Next</button>
            ) : (
              <button type="submit" className="btn btn-primary">Save Changes</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEdit;
