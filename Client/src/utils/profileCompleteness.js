const PROFILE_CHECKS = [
  { key: 'educationLevel', label: 'Education level', test: (u) => Boolean(u?.educationLevel) },
  { key: 'subjects', label: 'Subjects', test: (u) => (u?.subjects?.length || 0) > 0 },
  { key: 'learningStyle', label: 'Learning style', test: (u) => Boolean(u?.learningStyle) },
  { key: 'availability', label: 'Availability', test: (u) => {
    const slots = u?.availability?.slots || u?.availability;
    return slots && typeof slots === 'object' && Object.keys(slots).length > 0;
  }},
  { key: 'bio', label: 'Bio', test: (u) => Boolean(u?.bio?.trim()) },
  { key: 'avatarUrl', label: 'Profile photo', test: (u) => Boolean(u?.avatarUrl) },
  { key: 'year', label: 'Year / grade', test: (u) => Boolean(u?.year || u?.grade) },
];

export const getProfileCompleteness = (user) => {
  if (!user) {
    return { percent: 0, completed: 0, total: PROFILE_CHECKS.length, missing: PROFILE_CHECKS.map(c => c.label) };
  }
  const done = PROFILE_CHECKS.filter(c => c.test(user));
  const missing = PROFILE_CHECKS.filter(c => !c.test(user)).map(c => c.label);
  const percent = Math.round((done.length / PROFILE_CHECKS.length) * 100);
  return { percent, completed: done.length, total: PROFILE_CHECKS.length, missing };
};

export const shouldShowSemesterRefresh = (user) => {
  if (!user) return false;
  if (user.educationLevel === 'University' && !user.year) return true;
  if (user.educationLevel === 'GCE A/L' && !user.grade && !user.year) return true;
  const dismissed = user.semesterRefreshDismissed;
  if (dismissed) {
    const dismissedAt = new Date(dismissed);
    const months = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (months < 4) return false;
  }
  return getProfileCompleteness(user).percent < 100;
};
