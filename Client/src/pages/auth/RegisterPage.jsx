import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import GoogleAuthBlock from '../../components/auth/GoogleAuthBlock';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import './AuthPages.css';

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const { register, loginWithGoogle } = useAuth();

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(2, 'Name must be at least 2 characters')
        .required('Name is required'),
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
        .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .matches(/[0-9]/, 'Password must contain at least one number')
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .required('Please confirm your password')
    }),
    onSubmit: async (values, { setSubmitting, setFieldError }) => {
      setEmailTaken(false);
      try {
        await register({
          name: values.name,
          email: values.email,
          password: values.password
        });
      } catch (error) {
        const msg = error?.formatted || error?.message || error?.email?.[0] || 'Registration failed';
        const taken = /already exists|signing in/i.test(msg);
        setEmailTaken(taken);
        setFieldError('email', msg);
      } finally {
        setSubmitting(false);
      }
    }
  });

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Create Account</h1>
            <p>Join Study Buddy Finder and start collaborating</p>
          </div>

          <GoogleAuthBlock mode="signup" onSuccess={loginWithGoogle} />

          <form onSubmit={formik.handleSubmit} className="auth-form">
            <div className="input-group">
              <label htmlFor="name" className="input-label">
                Full Name
              </label>
              <div className="input-with-icon">
                <FiUser className="input-icon" />
                <input
                  id="name"
                  type="text"
                  className={`input-field ${formik.touched.name && formik.errors.name ? 'input-error' : ''}`}
                  placeholder="Enter your full name"
                  {...formik.getFieldProps('name')}
                />
              </div>
              {formik.touched.name && formik.errors.name && (
                <span className="error-message">{formik.errors.name}</span>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="email" className="input-label">
                Email Address
              </label>
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
              {emailTaken && (
                <p className="auth-hint-login">
                  This email is already registered.{' '}
                  <Link to="/login" state={{ email: formik.values.email }}>Sign in here</Link>
                </p>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="password" className="input-label">
                Password
              </label>
              <div className="input-with-icon">
                <FiLock className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`input-field ${formik.touched.password && formik.errors.password ? 'input-error' : ''}`}
                  placeholder="Create a password"
                  {...formik.getFieldProps('password')}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {formik.touched.password && formik.errors.password && (
                <span className="error-message">{formik.errors.password}</span>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword" className="input-label">
                Confirm Password
              </label>
              <div className="input-with-icon">
                <FiLock className="input-icon" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`input-field ${formik.touched.confirmPassword && formik.errors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="Confirm your password"
                  {...formik.getFieldProps('confirmPassword')}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                <span className="error-message">{formik.errors.confirmPassword}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={formik.isSubmitting}
            >
              {formik.isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-side">
          <div className="auth-side-content">
            <h2>Join Our Community</h2>
            <ul className="benefit-list">
              <li>✓ Find compatible study partners</li>
              <li>✓ Schedule collaborative sessions</li>
              <li>✓ Track your progress together</li>
              <li>✓ Safe and secure platform</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
