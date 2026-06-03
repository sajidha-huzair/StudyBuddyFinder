import api from './api';

const DEMO_MODE = false;

const MOCK_STUDENTS = [
  {
    id: 1,
    name: 'Sarah Johnson',
    email: 'sarah.j@university.edu',
    university: 'University of Moratuwa',
    major: 'Computer Science',
    year: '2nd Year',
    subjects: ['Mathematics', 'Computer Science', 'Physics'],
    strengths: ['Mathematics', 'Computer Science'],
    weaknesses: ['Physics'],
    learningStyle: 'Visual',
    studyGoals: ['Exam Preparation', 'Concept Understanding'],
    matchScore: 95,
    avatar: null,
    bio: 'Love coding and mathematics. Looking for study partners for physics!'
  },
  {
    id: 2,
    name: 'Michael Chen',
    email: 'michael.chen@university.edu',
    university: 'University of Colombo',
    major: 'Engineering',
    year: '3rd Year',
    subjects: ['Physics', 'Mathematics', 'Chemistry'],
    strengths: ['Physics', 'Mathematics'],
    weaknesses: ['Chemistry'],
    learningStyle: 'Kinesthetic',
    studyGoals: ['Assignment Help', 'Project Work'],
    matchScore: 88,
    avatar: null,
    bio: 'Engineering student passionate about physics and practical experiments.'
  },
  {
    id: 3,
    name: 'Emma Williams',
    email: 'emma.w@university.edu',
    university: 'University of Moratuwa',
    major: 'Information Technology',
    year: '2nd Year',
    subjects: ['Computer Science', 'Mathematics', 'English'],
    strengths: ['Computer Science', 'English'],
    weaknesses: ['Mathematics'],
    learningStyle: 'Reading/Writing',
    studyGoals: ['Exam Preparation', 'General Study'],
    matchScore: 82,
    avatar: null,
    bio: 'IT student who loves programming and technical writing.'
  },
  {
    id: 4,
    name: 'David Kumar',
    email: 'david.k@university.edu',
    university: 'University of Peradeniya',
    major: 'Mathematics',
    year: '4th Year',
    subjects: ['Mathematics', 'Physics', 'Computer Science'],
    strengths: ['Mathematics', 'Physics'],
    weaknesses: ['Computer Science'],
    learningStyle: 'Visual',
    studyGoals: ['Concept Understanding', 'Exam Preparation'],
    matchScore: 90,
    avatar: null,
    bio: 'Math enthusiast helping others understand complex concepts.'
  },
  {
    id: 5,
    name: 'Aisha Rahman',
    email: 'aisha.r@university.edu',
    university: 'University of Moratuwa',
    major: 'Computer Engineering',
    year: '2nd Year',
    subjects: ['Computer Science', 'Mathematics', 'Biology'],
    strengths: ['Biology', 'Computer Science'],
    weaknesses: ['Mathematics'],
    learningStyle: 'Auditory',
    studyGoals: ['Assignment Help', 'Concept Understanding'],
    matchScore: 85,
    avatar: null,
    bio: 'Interested in bio-informatics and computational biology.'
  }
];

const MOCK_STUDY_BUDDIES = [
  {
    id: 6,
    name: 'Lisa Anderson',
    email: 'lisa.a@university.edu',
    university: 'University of Moratuwa',
    major: 'Data Science',
    year: '3rd Year',
    subjects: ['Mathematics', 'Computer Science'],
    sharedSubjects: ['Mathematics', 'Computer Science'],
    connectedSince: '2025-12-15',
    sessionsCompleted: 8,
    avatar: null
  },
  {
    id: 7,
    name: 'James Lee',
    email: 'james.l@university.edu',
    university: 'University of Colombo',
    major: 'Software Engineering',
    year: '2nd Year',
    subjects: ['Computer Science', 'Mathematics', 'Physics'],
    sharedSubjects: ['Computer Science', 'Mathematics'],
    connectedSince: '2025-11-20',
    sessionsCompleted: 5,
    avatar: null
  }
];

const MOCK_REQUESTS = {
  incoming: [
    {
      id: 101,
      sender: {
        id: 8,
        name: 'Nina Patel',
        email: 'nina.p@university.edu',
        university: 'University of Moratuwa',
        major: 'Physics',
        subjects: ['Physics', 'Mathematics']
      },
      message: 'Hi! I saw we\'re both studying physics. Would love to collaborate on assignments!',
      createdAt: '2026-01-16T10:30:00',
      status: 'pending'
    },
    {
      id: 102,
      sender: {
        id: 9,
        name: 'Tom Wilson',
        email: 'tom.w@university.edu',
        university: 'University of Peradeniya',
        major: 'Computer Science',
        subjects: ['Computer Science', 'Mathematics']
      },
      message: 'Looking for a study partner for the upcoming CS exam. Interested?',
      createdAt: '2026-01-15T14:20:00',
      status: 'pending'
    }
  ],
  sent: [
    {
      id: 103,
      recipient: {
        id: 10,
        name: 'Rachel Green',
        email: 'rachel.g@university.edu',
        university: 'University of Moratuwa',
        major: 'Biology',
        subjects: ['Biology', 'Chemistry']
      },
      message: 'Would you like to study together for the biology midterm?',
      createdAt: '2026-01-14T09:15:00',
      status: 'pending'
    }
  ]
};

const matchService = {
  getRecommendations: async (filters = {}) => {
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500));
      let filtered = [...MOCK_STUDENTS];
      
      if (filters.subject) {
        filtered = filtered.filter(s => s.subjects.includes(filters.subject));
      }
      if (filters.university) {
        filtered = filtered.filter(s => s.university === filters.university);
      }
      if (filters.learningStyle) {
        filtered = filtered.filter(s => s.learningStyle === filters.learningStyle);
      }
      
      return filtered;
    }
    const params = new URLSearchParams();
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.educationLevel) params.append('education_level', filters.educationLevel);
    if (filters.university) params.append('university', filters.university);
    if (filters.search) params.append('search', filters.search);
    if (filters.minCompatibility) params.append('minCompatibility', filters.minCompatibility);
    if (filters.learningStyle) params.append('learningStyle', filters.learningStyle);
    if (filters.sort) params.append('sort', filters.sort);

    const response = await api.get(`/matches/recommendations/?${params.toString()}`);
    return response.data;
  },

  getBookmarks: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.educationLevel) params.append('education_level', filters.educationLevel);
    if (filters.university) params.append('university', filters.university);
    if (filters.search) params.append('search', filters.search);
    if (filters.minCompatibility) params.append('minCompatibility', filters.minCompatibility);
    if (filters.learningStyle) params.append('learningStyle', filters.learningStyle);
    if (filters.sort) params.append('sort', filters.sort);

    const response = await api.get(`/matches/bookmarks/?${params.toString()}`);
    return response.data.bookmarks || [];
  },

  toggleBookmark: async (userId) => {
    const response = await api.post('/matches/bookmarks/', { userId });
    return response.data;
  },

  sendRequest: async (recipientId, message) => {
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { 
        success: true, 
        message: 'Study buddy request sent successfully!',
        requestId: Date.now()
      };
    }
    const response = await api.post('/matches/', {
      user2: recipientId,
      message: message || 'Hi! Would you like to study together?'
    });
    return response.data;
  },

  getIncomingRequests: async () => {
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 400));
      return MOCK_REQUESTS.incoming;
    }
    const response = await api.get('/matches/incoming_requests/');
    return response.data;
  },

  getSentRequests: async () => {
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 400));
      return MOCK_REQUESTS.sent;
    }
    const response = await api.get('/matches/sent_requests/');
    return response.data;
  },

  acceptRequest: async (requestId) => {
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true, message: 'Request accepted! New study buddy added.' };
    }
    const response = await api.post(`/matches/${requestId}/accept/`);
    return response.data;
  },

  rejectRequest: async (requestId) => {
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true, message: 'Request rejected.' };
    }
    const response = await api.post(`/matches/${requestId}/reject/`);
    return response.data;
  },

  cancelRequest: async (requestId) => {
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true, message: 'Request cancelled.' };
    }
    const response = await api.delete(`/matches/${requestId}/`);
    return response.data;
  },

  getStudyBuddies: async () => {
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 400));
      return MOCK_STUDY_BUDDIES;
    }
    const response = await api.get('/matches/study_buddies/');
    return response.data;
  },

  removeStudyBuddy: async (buddyId) => {
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true, message: 'Study buddy removed.' };
    }
    const response = await api.delete(`/matches/${buddyId}/`);
    return response.data;
  }
};

export default matchService;
