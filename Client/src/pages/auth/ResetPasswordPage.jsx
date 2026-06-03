import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { FiLock, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';
import authService from '../../services/authService';
import { toast } from 'react-toastify';
import './AuthPages.css';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [showPassword, setShowPassword] = useState(false);

  const formik = useFormik({
    initialValues: { password: '', confirmPassword: '' },
    validationSchema: Yup.object({
      password: Yup.string().min(8, 'At least 8 characters').required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .required('Confirm your password'),
    }),
    onSubmit: async (values, { setSubmitting, setFieldError }) => {
      if (!token) {
        setFieldError('password', 'Invalid reset link');
        return;
      }
      try {
        await authService.resetPassword(token, values.password);
        toast.success('Password updated! Sign in with your new password.');
        navigate('/login');
      } catch (error) {
        const msg = error?.error || error?.message || 'Reset failed';
        setFieldError('password', msg);
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-container auth-container-narrow">
          <div className="auth-card">
            <div className="auth-header">
              <h1>Invalid Link</h1>
              <p>This password reset link is missing or expired.</p>
            </div>
            <Link to="/forgot-password" className="btn btn-primary btn-block">Request a new link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-narrow">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Set New Password</h1>
            <p>Choose a strong password for your account.</p>
          </div>

          <form onSubmit={formik.handleSubmit} className="auth-form">
            <div className="input-group">
              <label htmlFor="password" className="input-label">New Password</label>
              <div className="input-with-icon">
                <FiLock className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`input-field ${formik.touched.password && formik.errors.password ? 'input-error' : ''}`}
                  placeholder="At least 8 characters"
                  {...formik.getFieldProps('password')}
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {formik.touched.password && formik.errors.password && (
                <span className="error-message">{formik.errors.password}</span>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
              <div className="input-with-icon">
                <FiLock className="input-icon" />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  className={`input-field ${formik.touched.confirmPassword && formik.errors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="Repeat password"
                  {...formik.getFieldProps('confirmPassword')}
                />
              </div>
              {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                <span className="error-message">{formik.errors.confirmPassword}</span>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={formik.isSubmitting}>
              {formik.isSubmitting ? 'Updating…' : 'Update Password'}
            </button>
          </form>

          <div className="auth-footer">
            <Link to="/login" className="auth-link auth-back-link">
              <FiArrowLeft /> Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
