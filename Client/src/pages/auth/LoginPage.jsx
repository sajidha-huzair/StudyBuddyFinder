import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import GoogleAuthBlock from '../../components/auth/GoogleAuthBlock';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import './AuthPages.css';

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, loginWithGoogle } = useAuth();

  const formik = useFormik({
    initialValues: {
      email: '',
      password: ''
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      password: Yup.string()
        .required('Password is required')
    }),
    onSubmit: async (values, { setSubmitting, setFieldError }) => {
      try {
        await login(values.email, values.password);
      } catch (error) {
        const msg = error?.error || error?.message || 'Login failed';
        setFieldError('password', msg);
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
            <h1>Welcome Back</h1>
            <p>Sign in to continue to Study Buddy Finder</p>
          </div>

          <GoogleAuthBlock mode="signin" onSuccess={loginWithGoogle} />

          <form onSubmit={formik.handleSubmit} className="auth-form">
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
            </div>

            <div className="input-group">
              <div className="label-row">
                <label htmlFor="password" className="input-label">
                  Password
                </label>
                <Link to="/forgot-password" className="auth-link forgot-link">
                  Forgot password?
                </Link>
              </div>
              <div className="input-with-icon">
                <FiLock className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`input-field ${formik.touched.password && formik.errors.password ? 'input-error' : ''}`}
                  placeholder="Enter your password"
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

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={formik.isSubmitting}
            >
              {formik.isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="auth-link">
                Sign up here
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-side">
          <div className="auth-side-content">
            <h2>Start Your Learning Journey</h2>
            <p>Connect with study partners who share your academic goals and enhance your learning experience.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
