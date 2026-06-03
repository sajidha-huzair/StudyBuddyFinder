import React from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiCalendar, FiMessageSquare, FiBarChart2, FiShield, FiZap } from 'react-icons/fi';
import './LandingPage.css';

const LandingPage = () => {
  const features = [
    {
      icon: <FiUsers />,
      title: 'Smart Matching',
      description: 'Get paired with students who complement your strengths and weaknesses'
    },
    {
      icon: <FiCalendar />,
      title: 'Easy Scheduling',
      description: 'Coordinate study sessions with built-in calendar and reminders'
    },
    {
      icon: <FiMessageSquare />,
      title: 'Real-time Chat',
      description: 'Communicate seamlessly with your study buddies'
    },
    {
      icon: <FiBarChart2 />,
      title: 'Track Progress',
      description: 'Monitor your study sessions and collaboration history'
    },
    {
      icon: <FiShield />,
      title: 'Safe & Secure',
      description: 'Report and block features ensure a safe learning environment'
    },
    {
      icon: <FiZap />,
      title: 'Stay Motivated',
      description: 'Accountability partners help you stay consistent with your goals'
    }
  ];

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <h1>Study Buddy Finder</h1>
            </div>
            <nav className="landing-nav">
              <Link to="/login" className="btn btn-outline">Login</Link>
              <Link to="/register" className="btn btn-primary">Get Started</Link>
            </nav>
          </div>
        </div>
      </header>

      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              Find Your Perfect <span className="highlight">Study Partner</span>
            </h1>
            <p className="hero-subtitle">
              Connect with students who share your academic goals. Study smarter, not harder, 
              with personalized matches based on your strengths, weaknesses, and schedule.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                Start Finding Buddies
              </Link>
              <Link to="/login" className="btn btn-outline btn-lg">
                Sign In
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <div className="hero-illustration">
              <FiUsers size={120} />
            </div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2>Why Choose Study Buddy Finder?</h2>
            <p>Everything you need to succeed in collaborative learning</p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="how-it-works-section">
        <div className="container">
          <div className="section-header">
            <h2>How It Works</h2>
            <p>Get started in just a few simple steps</p>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Create Your Profile</h3>
              <p>Tell us about your subjects, strengths, and study preferences</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Get Matched</h3>
              <p>Our algorithm finds students with complementary skills</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Connect & Study</h3>
              <p>Schedule sessions and collaborate with your study buddies</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Track Progress</h3>
              <p>Monitor your study habits and improve together</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Transform Your Study Experience?</h2>
            <p>Join students who are already studying smarter together</p>
            <Link to="/register" className="btn btn-primary btn-lg">
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-info">
              <h3>Study Buddy Finder</h3>
              <p>A project by M.H.F Sajidha (225095E)</p>
              <p>University of Moratuwa - Faculty of Information Technology</p>
            </div>
            <div className="footer-links">
              <p>&copy; 2025 Study Buddy Finder. IS 3920 Project.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
