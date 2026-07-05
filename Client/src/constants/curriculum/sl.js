export const GRADE_BANDS = {
  JUNIOR: { label: 'Grades 6–9', educationLevel: 'Grades 6-9', grades: [6, 7, 8, 9] },
  OL: { label: 'Grades 10–11 (O/L)', educationLevel: 'GCE O/L', grades: [10, 11] },
  AL: { label: 'Grades 12–13 (A/L)', educationLevel: 'GCE A/L', grades: [12, 13] },
};

export const OL_COMPULSORY = [
  'Religion', 'First Language', 'English', 'Mathematics', 'Science', 'History',
];

export const OL_OPTIONAL_BASKETS = {
  basket1: ['Geography', 'Civic Education', 'Business & Accounting Studies', 'Second National Language'],
  basket2: ['Art', 'Music', 'Dancing', 'Drama & Theatre', 'English Literature', 'Tamil Literature'],
  basket3: ['ICT', 'Health & Physical Education', 'Home Economics', 'Agriculture & Food Technology'],
};

export const JUNIOR_SUBJECTS = [
  'Religion', 'First Language', 'English', 'Mathematics', 'Science', 'History',
  'Geography', 'Civic Education', 'Health & Physical Education', 'Practical & Technical Skills',
  'ICT', 'Second National Language', 'Aesthetic Subject',
];

export const AESTHETIC_OPTIONS = ['Art', 'Music', 'Dancing', 'Drama & Theatre'];

export const AL_STREAMS = {
  PHYSICAL_SCIENCE: {
    label: 'Physical Science',
    subjects: ['Combined Mathematics', 'Physics', 'Chemistry'],
    pick: 3,
  },
  BIOLOGICAL_SCIENCE: {
    label: 'Biological Science',
    subjects: ['Biology', 'Chemistry', 'Physics', 'Agricultural Science'],
    pick: 3,
    required: ['Biology', 'Chemistry'],
  },
  COMMERCE: {
    label: 'Commerce',
    subjects: ['Accounting', 'Business Studies', 'Economics'],
    pick: 3,
  },
  ARTS: {
    label: 'Arts',
    subjects: [
      'History', 'Political Science', 'Geography', 'Sinhala', 'Tamil', 'English',
      'Logic & Scientific Method', 'Buddhist Civilization', 'Islamic Civilization',
      'Hindu Civilization', 'Economics', 'Media Studies', 'Drama & Theatre',
    ],
    pick: 3,
  },
  TECHNOLOGY: {
    label: 'Technology',
    subjects: ['Engineering Technology', 'Bio Systems Technology', 'Science for Technology', 'ICT'],
    pick: 3,
    options: {
      ENGINEERING: ['Engineering Technology', 'Science for Technology', 'ICT'],
      BIOSYSTEMS: ['Bio Systems Technology', 'Science for Technology', 'ICT'],
    },
  },
};

export const AL_COMMON = ['General English', 'General Information Technology (GIT)'];

export const MEDIUMS = ['Sinhala', 'Tamil', 'English'];
export const STUDY_LANGUAGES = ['Sinhala', 'Tamil', 'English', 'Mixed'];

export const DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle',
];

export const STUDY_GOALS = [
  'O/L exam preparation', 'A/L exam preparation', 'Past paper practice',
  'Theory revision', 'Model paper discussion', 'Homework help', 'Weekly study group',
];

export const LEARNING_STYLES = ['Visual', 'Auditory', 'Reading/Writing', 'Kinesthetic'];

export const GROUP_SIZE_PREFS = ['1-on-1', 'Small group (2–4)'];

export const EXPLAIN_PREFS = ['I like explaining to others', 'I prefer being taught', 'Both equally'];

export const MATCH_TYPES = [
  { value: 'all', label: 'All matches' },
  { value: 'partner', label: 'Study partners' },
  { value: 'complement', label: 'Help me improve' },
  { value: 'group', label: 'Group candidates' },
  { value: 'mentor', label: 'Find a mentor' },
];

export const PAST_PAPER_TEMPLATES = [
  { id: 'ol-maths', label: 'O/L Mathematics past paper', subject: 'Mathematics', gradeBand: 'OL' },
  { id: 'ol-science', label: 'O/L Science past paper', subject: 'Science', gradeBand: 'OL' },
  { id: 'ol-english', label: 'O/L English past paper', subject: 'English', gradeBand: 'OL' },
  { id: 'al-combined-maths', label: 'A/L Combined Maths past paper', subject: 'Combined Mathematics', gradeBand: 'AL' },
  { id: 'al-physics', label: 'A/L Physics past paper', subject: 'Physics', gradeBand: 'AL' },
  { id: 'al-chemistry', label: 'A/L Chemistry past paper', subject: 'Chemistry', gradeBand: 'AL' },
  { id: 'al-biology', label: 'A/L Biology past paper', subject: 'Biology', gradeBand: 'AL' },
  { id: 'al-accounting', label: 'A/L Accounting past paper', subject: 'Accounting', gradeBand: 'AL' },
];

export function gradeBandForGrade(grade) {
  const g = Number(grade);
  for (const [band, info] of Object.entries(GRADE_BANDS)) {
    if (info.grades.includes(g)) return band;
  }
  return null;
}

export function getExamCountdown(examYear, gradeBand) {
  if (!examYear) return null;
  const examMonth = gradeBand === 'OL' ? 11 : gradeBand === 'AL' ? 7 : null;
  if (!examMonth) return null;
  const examDate = new Date(examYear, examMonth - 1, 1);
  const now = new Date();
  const diff = examDate - now;
  if (diff <= 0) return { days: 0, label: 'Exam period', examDate };
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return { days, label: gradeBand === 'OL' ? 'O/L' : 'A/L', examDate };
}

/** Flat list of all subjects for a user profile (for sessions, vault, etc.) */
export function flattenSubjects(profile) {
  if (!profile) return [];
  const gradeBand = profile.gradeBand || profile.grade_band;
  const subjects = profile.subjects || [];
  const olOptional = profile.olOptional || profile.ol_optional || [];
  const alSubjects = profile.alSubjects || profile.al_subjects || [];
  if (gradeBand === 'JUNIOR' && subjects.length) return subjects;
  if (gradeBand === 'OL') {
    return [...OL_COMPULSORY, ...olOptional];
  }
  if (gradeBand === 'AL') {
    const list = [...alSubjects];
    if (profile.sitsGit) list.push('General Information Technology (GIT)');
    return list;
  }
  return subjects;
}

export default GRADE_BANDS;
