import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import authService from '../../services/authService';
import { toast } from 'react-toastify';
import './AuthPages.css';

const ForgotPasswordPage = () => {
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState('');

  const formik = useFormik({
    initialValues: { email: '' },
    validationSchema: Yup.object({
      email: Yup.string().email('Invalid email address').required('Email is required'),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const result = await authService.forgotPassword(values.email);
        setSubmitted(true);
        if (result.resetUrl) {
          setDevResetUrl(result.resetUrl);
        }
        toast.success(result.message || 'Check your email for reset instructions.');
      } catch (error) {
        const msg = error?.error || error?.message || 'Could not send reset email';
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-narrow">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Forgot Password</h1>
            <p>Enter your email and we will send you a reset link.</p>
          </div>

          {submitted ? (
            <div className="auth-form">
              <p className="auth-success-text">
                If an account exists for that email, reset instructions have been sent.
              </p>
              {devResetUrl && (
                <p className="dev-reset-link">
                  <strong>Development:</strong>{' '}
                  <a href={devResetUrl}>Open reset link</a>
                </p>
              )}
              <Link to="/login" className="btn btn-primary btn-block">Back to Sign In</Link>
            </div>
          ) : (
            <form onSubmit={formik.handleSubmit} className="auth-form">
              <div className="input-group">
                <label htmlFor="email" className="input-label">Email Address</label>
                <div className="input-with-icon">
                  <FiMail className="input-icon" />
                  <input
                    id="email"
                    type="email"
                    className={`input-field ${formik.touched.email && formik.errors.email ? 'input-error' : ''}`}
                    placeholder="Enter your email"
                    {...formik.getFieldProps('email')}
                  />
                </div>
                {formik.touched.email && formik.errors.email && (
                  <span className="error-message">{formik.errors.email}</span>
                )}
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={formik.isSubmitting}>
                {formik.isSubmitting ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          )}

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

export default ForgotPasswordPage;
