const PROFILE_CHECKS = [
  { key: 'gradeBand', label: 'Grade level', test: (u) => Boolean(u?.gradeBand) },
  { key: 'grade', label: 'Grade', test: (u) => Boolean(u?.grade) },
  { key: 'subjects', label: 'Subjects', test: (u) => {
    const count = (u?.subjects?.length || 0) + (u?.olOptional?.length || 0) + (u?.alSubjects?.length || 0);
    return count > 0;
  }},
  { key: 'learningStyle', label: 'Learning style', test: (u) => {
    const styles = u?.learningStyles?.length
      ? u.learningStyles
      : (u?.learningStyle ? [u.learningStyle] : []);
    return styles.length > 0;
  }},
  { key: 'availability', label: 'Availability', test: (u) => {
    const slots = u?.availability?.slots || u?.availability;
    return slots && typeof slots === 'object' && Object.keys(slots).length > 0;
  }},
  { key: 'medium', label: 'Medium', test: (u) => Boolean(u?.medium) },
  { key: 'school', label: 'School', test: (u) => Boolean(u?.school || u?.university) },
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
  const dismissed = user.semesterRefreshDismissed;
  if (dismissed) {
    const dismissedAt = new Date(dismissed);
    const months = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (months < 4) return false;
  }
  return getProfileCompleteness(user).percent < 100;
};
