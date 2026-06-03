import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import authService from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import './AvailabilityPage.css';

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
];

const DAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

const emptyAvailability = () =>
  Object.fromEntries(DAYS.map(({ key }) => [key, []]));

const AvailabilityPage = () => {
  const { user, updateUser } = useAuth();
  const [availability, setAvailability] = useState(emptyAvailability);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.availability && typeof user.availability === 'object') {
      setAvailability({
        ...emptyAvailability(),
        ...user.availability,
      });
    }
    setLoading(false);
  }, [user]);

  const toggleTimeSlot = (day, time) => {
    setAvailability((prev) => {
      const daySlots = prev[day] || [];
      return {
        ...prev,
        [day]: daySlots.includes(time)
          ? daySlots.filter((t) => t !== time)
          : [...daySlots, time],
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await authService.updateProfile({ availability });
      updateUser(updated);
      toast.success('Availability updated!');
    } catch {
      toast.error('Failed to update availability');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="availability-page"><div className="spinner" /></div>;
  }

  return (
    <div className="availability-page">
      <div className="availability-top">
        <div className="page-header">
          <h1>Set Your Availability</h1>
          <p>Tap cells when you are free to study — green means available.</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="btn btn-primary availability-save-btn"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Availability'}
        </button>
      </div>

      <div className="availability-grid card">
        <div className="availability-scheduler">
          <div className="scheduler-corner" aria-hidden="true" />
          {DAYS.map(({ key, label }) => (
            <div key={key} className="scheduler-day-head">{label}</div>
          ))}

          {TIME_SLOTS.map((time) => (
            <React.Fragment key={time}>
              <div className="scheduler-time">{time}</div>
              {DAYS.map(({ key }) => {
                const selected = (availability[key] || []).includes(time);
                return (
                  <button
                    key={`${key}-${time}`}
                    type="button"
                    className={`scheduler-cell ${selected ? 'selected' : ''}`}
                    onClick={() => toggleTimeSlot(key, time)}
                    aria-label={`${key} at ${time}${selected ? ', available' : ''}`}
                    aria-pressed={selected}
                  >
                    {selected ? '✓' : ''}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <p className="availability-hint text-muted">
        Your shared free times help match you with buddies who study when you do.
      </p>
    </div>
  );
};

export default AvailabilityPage;
