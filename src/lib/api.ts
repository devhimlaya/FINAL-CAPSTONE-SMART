import axios from "axios";

const API_URL = "/api";

// Export server URL for constructing upload URLs
export const SERVER_URL = "";

// Create axios instance with auth header
const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  username: string;
  role: "TEACHER" | "ADMIN" | "REGISTRAR";
  firstName?: string;
  lastName?: string;
}

export interface Teacher {
  id: string;
  userId: string;
  employeeId: string;
  specialization?: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

export interface Student {
  id: string;
  lrn: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  gender?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  type: string;
  writtenWorkWeight: number;
  perfTaskWeight: number;
  quarterlyAssessWeight: number;
}

export interface Section {
  id: string;
  name: string;
  gradeLevel: string;
  schoolYear: string;
  adviser?: string;
  enrollments?: {
    student: Student;
  }[];
  _count?: {
    enrollments: number;
  };
}

export interface ClassAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  sectionId: string;
  schoolYear: string;
  teachingMinutes?: number | null;
  subject: Subject;
  section: Section;
  // ECR sync tracking
  ecrLastSyncedAt?: string | null;
  ecrFileName?: string | null;
}

export interface ScoreItem {
  name: string;
  score: number;
  maxScore: number;
  description?: string;
  date?: string;
}

export interface Grade {
  id: string;
  studentId: string;
  classAssignmentId: string;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  writtenWorkScores: ScoreItem[] | null;
  perfTaskScores: ScoreItem[] | null;
  quarterlyAssessScore: number | null;
  quarterlyAssessMax: number | null;
  writtenWorkPS: number | null;
  perfTaskPS: number | null;
  quarterlyAssessPS: number | null;
  initialGrade: number | null;
  quarterlyGrade: number | null;
  qualitativeDescriptor?: string | null;
  remarks?: string;
}

export interface ClassRecord {
  student: Student;
  grades: Grade[];
}

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ token: string; user: User; message: string }>("/auth/login", {
      username,
      password,
    }),
  me: () => api.get<User>("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

// Grades API
export const gradesApi = {
  getDashboard: () =>
    api.get<{
      teacher: Teacher & { name: string };
      stats: {
        totalClasses: number;
        totalStudents: number;
        subjects: string[];
      };
      classAssignments: ClassAssignment[];
    }>("/grades/dashboard"),

  getDashboardStats: () =>
    api.get<{
      classStats: {
        id: string;
        subjectName: string;
        sectionName: string;
        gradeLevel: string;
        totalStudents: number;
        gradedCount: number;
        avgGrade: number | null;
        passingRate: number;
        studentsAtRisk: { id: string; name: string; grade: number; class: string }[];
        honorsStudents: { id: string; name: string; grade: number; honor: string }[];
        withHonorsStudents: { id: string; name: string; grade: number; honor: string }[];
      }[];
      summary: {
        totalClasses: number;
        totalStudents: number;
        totalGraded: number;
        gradeSubmissionRate: number;
        overallPassingRate: number;
        studentsAtRisk: { id: string; name: string; grade: number; class: string }[];
        studentsAtRiskCount: number;
      };
    }>("/grades/dashboard-stats"),

  getMyClasses: () => api.get<ClassAssignment[]>("/grades/my-classes"),

  getClassRecord: (classAssignmentId: string, quarter?: string) =>
    api.get<{
      classAssignment: ClassAssignment;
      classRecord: ClassRecord[];
      effectiveWeights?: {
        ww: number;
        pt: number;
        qa: number;
        source: "subject" | "generic-fallback";
        hasExactEcrTemplate: boolean;
      };
    }>(`/grades/class-record/${classAssignmentId}`, {
      params: quarter ? { quarter } : {},
    }),

  saveGrade: (data: {
    studentId: string;
    classAssignmentId: string;
    quarter: string;
    writtenWorkScores?: ScoreItem[];
    perfTaskScores?: ScoreItem[];
    quarterlyAssessScore?: number;
    quarterlyAssessMax?: number;
    qualitativeDescriptor?: string;
  }) => api.post<Grade>("/grades/grade", data),

  deleteGrade: (gradeId: string) => api.delete(`/grades/grade/${gradeId}`),

  getMasteryDistribution: (gradeLevel?: string, sectionId?: string) =>
    api.get<{
      distribution: {
        outstanding: number;
        verySatisfactory: number;
        satisfactory: number;
        fairlySatisfactory: number;
        didNotMeet: number;
      };
      totalStudents: number;
      filters: {
        gradeLevels: string[];
        sections: { id: string; name: string; gradeLevel: string }[];
      };
    }>("/grades/mastery-distribution", {
      params: { gradeLevel, sectionId },
    }),

  // ECR (E-Class Record) Import
  getEcrStatus: (classAssignmentId: string) =>
    api.get<{
      hasSynced: boolean;
      ecrLastSyncedAt: string | null;
      ecrFileName: string | null;
    }>(`/grades/ecr/status/${classAssignmentId}`),

  previewEcr: (classAssignmentId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('classAssignmentId', classAssignmentId);
    return api.post<{
      fileName: string;
      metadata: {
        gradeSection?: string;
        teacher?: string;
        subject?: string;
      };
      quarters: {
        quarter: string;
        maxScores: {
          writtenWork: number[];
          perfTask: number[];
          quarterlyAssess: number;
        };
        students: {
          name: string;
          writtenWorkScores: number[];
          writtenWorkTotal: number;
          writtenWorkPS: number;
          perfTaskScores: number[];
          perfTaskTotal: number;
          perfTaskPS: number;
          quarterlyAssessScore: number;
          quarterlyAssessPS: number;
          initialGrade: number;
          quarterlyGrade: number;
          matchedStudentId: string | null;
          matchedStudent: Student | null;
        }[];
      }[];
      stats: {
        totalStudents: number;
        matchedStudents: number;
        unmatchedStudents: number;
      };
      classAssignment: {
        id: string;
        subject: string;
        section: string;
        ecrLastSyncedAt: string | null;
        ecrFileName: string | null;
      };
    }>("/grades/ecr/preview", formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  importEcr: (classAssignmentId: string, file: File, selectedQuarters?: string[]) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('classAssignmentId', classAssignmentId);
    if (selectedQuarters) {
      formData.append('selectedQuarters', JSON.stringify(selectedQuarters));
    }
    return api.post<{
      success: boolean;
      importedGrades: number;
      skippedStudents: number;
      quartersImported: string[];
      ecrLastSyncedAt: string;
      ecrFileName: string;
    }>("/grades/ecr/import", formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Advisory API
export interface AdvisoryStudent {
  id: string;
  lrn: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  gender?: string;
  birthDate?: string;
  address?: string;
  guardianName?: string;
  guardianContact?: string;
  rank?: number;
}

export interface AdvisorySubject {
  id: string;
  code: string;
  name: string;
  type: string;
  teacher: string;
}

export interface AdvisoryData {
  hasAdvisory: boolean;
  message?: string;
  teacher: {
    id: string;
    name: string;
    employeeId: string;
  };
  section?: {
    id: string;
    name: string;
    gradeLevel: string;
    schoolYear: string;
  };
  students?: AdvisoryStudent[];
  stats?: {
    totalStudents: number;
    maleCount: number;
    femaleCount: number;
  };
  subjects?: AdvisorySubject[];
}

export interface QuarterGrade {
  writtenWorkPS: number | null;
  perfTaskPS: number | null;
  quarterlyAssessPS: number | null;
  initialGrade: number | null;
  quarterlyGrade: number | null;
  qualitativeDescriptor?: string | null;
}

export interface SubjectGrade {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  subjectType: string;
  teacher: string;
  grades: {
    Q1: QuarterGrade | null;
    Q2: QuarterGrade | null;
    Q3: QuarterGrade | null;
    Q4: QuarterGrade | null;
  };
  finalGrade: number | null;
  remarks: string | null;
}

export interface StudentGradeProfile {
  student: {
    id: string;
    lrn: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    suffix?: string;
    gender?: string;
    birthDate?: string;
    address?: string;
    guardianName?: string;
    guardianContact?: string;
  };
  enrollment: {
    sectionName: string;
    gradeLevel: string;
    schoolYear: string;
    status: string;
  };
  subjectGrades: SubjectGrade[];
  summary: {
    generalAverage: number | null;
    honors: string | null;
    promotionStatus: string | null;
    totalSubjects: number;
    completedSubjects: number;
  };
}

export interface AdvisorySummary {
  hasAdvisory: boolean;
  section?: {
    id: string;
    name: string;
    gradeLevel: string;
    schoolYear: string;
  };
  rankings?: {
    studentId: string;
    name: string;
    lrn: string;
    gender?: string;
    average: number | null;
    gradedSubjects: number;
    totalSubjects: number;
    rank: number | null;
    honors: string | null;
  }[];
  stats?: {
    totalStudents: number;
    gradedStudents: number;
    withHonors: number;
    passingRate: number;
  };
}

export const advisoryApi = {
  getMyAdvisory: () => api.get<AdvisoryData>("/advisory/my-advisory"),
  syncFromEnrollPro: () => api.post("/advisory/sync"),


  getStudentGrades: (studentId: string, schoolYear?: string) =>
    api.get<StudentGradeProfile>(`/advisory/student/${studentId}/grades`, {
      params: schoolYear ? { schoolYear } : {},
    }),

  getAdvisorySummary: () => api.get<AdvisorySummary>("/advisory/summary"),
};

// Registrar API Types
export interface RegistrarDashboard {
  totalStudents: number;
  totalSections: number;
  totalTeachers: number;
  enrolledThisYear: number;
  recentEnrollments: {
    id: string;
    name: string;
    lrn: string;
    section: string;
    gradeLevel: string;
    enrolledAt: string;
  }[];
  sectionStats: {
    sectionId: string;
    sectionName: string;
    gradeLevel: string;
    studentCount: number;
    maleCount: number;
    femaleCount: number;
  }[];
}

export interface SchoolYear {
  id: string;
  year: string;
  isCurrent: boolean;
}

export interface RegistrarStudent {
  id: string;
  lrn: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  gender?: string;
  birthDate?: string;
  address?: string;
  guardianName?: string;
  guardianContact?: string;
  enrollments: {
    id: string;
    sectionId: string;
    schoolYear: string;
    status: string;
    section: {
      name: string;
      gradeLevel: string;
    };
  }[];
}

export interface SF8Data {
  section: {
    id: string;
    name: string;
    gradeLevel: string;
    schoolYear: string;
    adviser?: string;
  };
  students: {
    id: string;
    lrn: string;
    name: string;
    gender: string;
    birthDate?: string;
    subjectGrades: {
      subjectCode: string;
      subjectName: string;
      Q1?: number;
      Q2?: number;
      Q3?: number;
      Q4?: number;
      final?: number;
      remarks?: string;
    }[];
    generalAverage?: number;
    honors?: string;
    promotionStatus?: string;
  }[];
}

export interface SF9Data {
  student: {
    id: string;
    lrn: string;
    name: string;
    gender: string;
    birthDate?: string;
    address?: string;
    section: string;
    gradeLevel: string;
    schoolYear: string;
    adviser?: string;
  };
  subjectGrades: {
    subjectCode: string;
    subjectName: string;
    Q1?: number;
    Q2?: number;
    Q3?: number;
    Q4?: number;
    final?: number;
    remarks?: string;
  }[];
  attendance: {
    Q1?: { present: number; absent: number; tardy: number };
    Q2?: { present: number; absent: number; tardy: number };
    Q3?: { present: number; absent: number; tardy: number };
    Q4?: { present: number; absent: number; tardy: number };
  };
  values: {
    mpiDescription: string;
    Q1?: string;
    Q2?: string;
    Q3?: string;
    Q4?: string;
  }[];
  generalAverage?: number;
  honors?: string;
  promotionStatus?: string;
}

export interface SF10Data {
  student: {
    id: string;
    lrn: string;
    name: string;
    gender: string;
    birthDate?: string;
    address?: string;
    guardianName?: string;
    guardianContact?: string;
  };
  schoolRecords: {
    schoolYear: string;
    gradeLevel: string;
    section: string;
    school?: string;
    subjectGrades: {
      subjectCode: string;
      subjectName: string;
      Q1?: number;
      Q2?: number;
      Q3?: number;
      Q4?: number;
      final?: number;
      remarks?: string;
    }[];
    generalAverage?: number;
    honors?: string;
    promotionStatus?: string;
  }[];
}

export const registrarApi = {
  getDashboard: () => api.get<RegistrarDashboard>("/registrar/dashboard"),

  getSchoolYears: () => api.get<{ schoolYears: string[] }>("/registrar/school-years"),

  getStudents: (params?: { schoolYear?: string; gradeLevel?: string; sectionId?: string; search?: string }) =>
    api.get<{ students: RegistrarStudent[]; sections: Section[]; stats: any }>("/registrar/students", { params }),

  getStudent: (studentId: string) =>
    api.get<{ student: RegistrarStudent }>(`/registrar/student/${studentId}`),

  getSF8: (sectionId: string, schoolYear: string) =>
    api.get<SF8Data>("/registrar/forms/sf8", { params: { sectionId, schoolYear } }),

  getSF9: (studentId: string, schoolYear: string) =>
    api.get<SF9Data>(`/registrar/forms/sf9/${studentId}`, { params: { schoolYear } }),

  getSF10: (studentId: string) =>
    api.get<SF10Data>(`/registrar/forms/sf10/${studentId}`),

  getSections: (params?: { schoolYear?: string; gradeLevel?: string }) =>
    api.get<Section[]>("/registrar/sections", { params }),
};

// ============================================
// ADMIN API
// ============================================

export interface AdminDashboardStats {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  studentCountSchoolYear?: string | null;
  totalAdmins: number;
  totalRegistrars: number;
  activeUsers: number;
  todayLogins: number;
}

export interface AdminAuditLog {
  id: string;
  action: "create" | "update" | "delete" | "login" | "logout" | "config";
  user: string;
  userRole: string;
  target: string;
  targetType: string;
  details: string;
  ipAddress?: string;
  severity: "info" | "warning" | "critical";
  timestamp: string;
  date: string;
  createdAt?: string;
}

export interface AdminDashboard {
  stats: AdminDashboardStats;
  recentLogs: AdminAuditLog[];
  systemStatus: {
    database: string;
    lastBackup: string;
    uptime: string;
  };
  settings?: {
    schoolName: string;
    currentSchoolYear: string;
    currentQuarter: string;
  };
}

export interface AdminUser {
  id: string;
  username: string;
  role: "TEACHER" | "ADMIN" | "REGISTRAR";
  firstName?: string;
  lastName?: string;
  email?: string;
  status: string;
  lastActive: string;
  createdAt: string;
  teacher?: {
    employeeId: string;
    specialization?: string;
  };
}

export interface AuditLogResponse {
  logs: AdminAuditLog[];
  total: number;
  counts: {
    total: number;
    creates: number;
    updates: number;
    deletes: number;
    logins: number;
    critical: number;
  };
}

export interface SystemSettings {
  id: string;
  schoolName: string;
  schoolId: string;
  division: string;
  region: string;
  address?: string;
  contactNumber?: string;
  email?: string;
  currentSchoolYear: string;
  currentQuarter: string;
  // Academic calendar dates
  q1StartDate?: string;
  q1EndDate?: string;
  q2StartDate?: string;
  q2EndDate?: string;
  q3StartDate?: string;
  q3EndDate?: string;
  q4StartDate?: string;
  q4EndDate?: string;
  autoAdvanceQuarter?: boolean;
  // Theming
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordMinLength: number;
  requireSpecialChar: boolean;
  lastEnrollProSync?: string;
}

export interface GradingConfig {
  id: string;
  subjectType: string;
  writtenWorkWeight: number;
  performanceTaskWeight: number;
  quarterlyAssessWeight: number;
  isDepEdDefault: boolean;
}

export const adminApi = {
  // Dashboard
  getDashboard: () => api.get<AdminDashboard>("/admin/dashboard"),

  // User Management
  getUsers: (params?: { search?: string; role?: string; status?: string }) =>
    api.get<{ users: AdminUser[] }>("/admin/users", { params }),

  createUser: (data: {
    username: string;
    password: string;
    role: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    employeeId?: string;
    specialization?: string;
  }) => api.post<{ message: string; user: AdminUser }>("/admin/users", data),

  updateUser: (
    id: string,
    data: {
      username?: string;
      password?: string;
      role?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      employeeId?: string;
      specialization?: string;
    }
  ) => api.put<{ message: string; user: AdminUser }>(`/admin/users/${id}`, data),

  deleteUser: (id: string) => api.delete<{ message: string }>(`/admin/users/${id}`),

  // Audit Logs
  getLogs: (params?: { action?: string; severity?: string; search?: string; limit?: number; offset?: number }) =>
    api.get<AuditLogResponse>("/admin/logs", { params }),

  exportLogs: () => api.get("/admin/logs/export", { responseType: "blob" }),

  // System Settings
  getSettings: () => api.get<{ settings: SystemSettings }>("/admin/settings"),

  updateSettings: (data: Partial<SystemSettings>) =>
    api.put<{ message: string; settings: SystemSettings }>("/admin/settings", data),

  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append("logo", file);
    return api.post<{ message: string; logoUrl: string }>("/admin/settings/logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  updateColors: (colors: { primaryColor: string; secondaryColor: string; accentColor: string }) =>
    api.put<{ message: string; colors: { primaryColor: string; secondaryColor: string; accentColor: string } }>(
      "/admin/settings/colors",
      colors
    ),

  syncFromEnrollPro: () =>
    api.post<{ message: string; settings: SystemSettings }>("/admin/settings/sync-enrollpro", {}),

  // Grading Config
  getGradingConfig: () => api.get<{ configs: GradingConfig[] }>("/admin/grading-config"),

  updateGradingConfig: (
    subjectType: string,
    data: { writtenWorkWeight: number; performanceTaskWeight: number; quarterlyAssessWeight: number }
  ) => api.put<{ message: string; config: GradingConfig }>(`/admin/grading-config/${subjectType}`, data),

  resetGradingConfig: () => api.post<{ message: string; configs: GradingConfig[] }>("/admin/grading-config/reset"),

  // Class Assignments (Teaching Load)
  getClassAssignmentOptions: (schoolYear?: string) =>
    api.get<{ teachers: any[]; subjects: any[]; sections: any[] }>("/admin/class-assignments/options", {
      params: schoolYear ? { schoolYear } : {},
    }),

  getClassAssignments: (schoolYear?: string) =>
    api.get<{
      assignments: any[];
      workloadSummary?: Array<{
        teacherId: string;
        teacherName: string;
        sectionId: string;
        sectionName: string;
        gradeLevel: string;
        hgMinutes: number;
        advisoryRoleMinutes: number;
        otherSubjectMinutes: number;
        totalMinutes: number;
      }>;
    }>("/admin/class-assignments", {
      params: schoolYear ? { schoolYear } : {},
    }),

  createClassAssignment: (data: { teacherId: string; subjectId: string; sectionId: string; schoolYear: string }) =>
    api.post<{ message: string; assignment: any }>("/admin/class-assignments", data),

  deleteClassAssignment: (id: string) =>
    api.delete<{ message: string }>(`/admin/class-assignments/${id}`),
};

export default api;
