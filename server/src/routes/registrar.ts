import { Router, Request, Response } from "express";
import { GradeLevel, Quarter } from "@prisma/client";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import templateService from "../services/templateService";
import * as XLSX from "xlsx";

const router = Router();

// Get registrar dashboard stats
router.get("/dashboard", authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user || user.role !== "REGISTRAR") {
      res.status(403).json({ message: "Access denied. Registrar only." });
      return;
    }

    // Get current school year
    const currentSchoolYear = process.env.CURRENT_SCHOOL_YEAR ?? "2026-2027";

    // Get all sections for current school year
    const sections = await prisma.section.findMany({
      where: { schoolYear: currentSchoolYear },
      include: {
        _count: {
          select: { enrollments: true }
        },
        adviser: {
          include: {
            user: true
          }
        }
      }
    });

    // Get total students enrolled
    const totalStudents = await prisma.enrollment.count({
      where: { 
        schoolYear: currentSchoolYear,
        status: "ENROLLED"
      }
    });

    // Get students by grade level
    const studentsByGrade = await prisma.enrollment.groupBy({
      by: ['sectionId'],
      where: { 
        schoolYear: currentSchoolYear,
        status: "ENROLLED"
      },
      _count: true
    });

    // Map section IDs to grade levels
    const sectionMap = new Map(sections.map(s => [s.id, s.gradeLevel]));
    const gradeStats: Record<string, number> = {
      GRADE_7: 0,
      GRADE_8: 0,
      GRADE_9: 0,
      GRADE_10: 0
    };
    
    studentsByGrace(studentsByGrade, sectionMap, gradeStats);

    // Get section summary
    const sectionSummary = sections.map(section => ({
      id: section.id,
      name: section.name,
      gradeLevel: section.gradeLevel,
      studentCount: section._count.enrollments,
      adviser: section.adviser ? `${section.adviser.user.firstName} ${section.adviser.user.lastName}` : null
    }));

    res.json({
      currentSchoolYear,
      stats: {
        totalStudents,
        totalSections: sections.length,
        gradeStats
      },
      sections: sectionSummary
    });
  } catch (error) {
    console.error("Error fetching registrar dashboard:", error);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
});

function studentsByGrace(
  studentsByGrade: { sectionId: string; _count: number }[],
  sectionMap: Map<string, GradeLevel>,
  gradeStats: Record<string, number>
) {
  studentsByGrade.forEach(item => {
    const gradeLevel = sectionMap.get(item.sectionId);
    if (gradeLevel && gradeStats[gradeLevel] !== undefined) {
      gradeStats[gradeLevel] += item._count;
    }
  });
}

// Get available school years
router.get("/school-years", authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user || user.role !== "REGISTRAR") {
      res.status(403).json({ message: "Access denied. Registrar only." });
      return;
    }

    // Get unique school years from sections
    const sections = await prisma.section.findMany({
      select: { schoolYear: true },
      distinct: ['schoolYear'],
      orderBy: { schoolYear: 'desc' }
    });

    const schoolYears = sections.map(s => s.schoolYear);

    // Add current and historical years if not present
    const allYears = new Set(schoolYears);
    allYears.add("2026-2027");
    allYears.add("2025-2026");
    allYears.add("2024-2025");

    res.json({
      schoolYears: Array.from(allYears).sort().reverse()
    });
  } catch (error) {
    console.error("Error fetching school years:", error);
    res.status(500).json({ message: "Failed to fetch school years" });
  }
});

// Get students by school year
router.get("/students", authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user || user.role !== "REGISTRAR") {
      res.status(403).json({ message: "Access denied. Registrar only." });
      return;
    }

    const { schoolYear, gradeLevel, sectionId, search } = req.query;
    const currentSchoolYear = (schoolYear as string) || "2026-2027";

    // Build where clause for enrollments
    const enrollmentWhere: any = {
      schoolYear: currentSchoolYear,
      status: "ENROLLED"
    };

    if (sectionId && sectionId !== "all") {
      enrollmentWhere.sectionId = sectionId;
    }

    // Get enrollments with student and section data
    const enrollments = await prisma.enrollment.findMany({
      where: enrollmentWhere,
      include: {
        student: true,
        section: {
          include: {
            adviser: {
              include: { user: true }
            }
          }
        }
      },
      orderBy: [
        { student: { lastName: 'asc' } },
        { student: { firstName: 'asc' } }
      ]
    });

    // Filter by grade level if specified
    let filteredEnrollments = enrollments;
    if (gradeLevel && gradeLevel !== "all") {
      filteredEnrollments = enrollments.filter(e => e.section.gradeLevel === gradeLevel);
    }

    // Filter by search query
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredEnrollments = filteredEnrollments.filter(e => {
        const fullName = `${e.student.lastName} ${e.student.firstName} ${e.student.middleName || ""}`.toLowerCase();
        return fullName.includes(searchLower) || e.student.lrn.includes(searchLower);
      });
    }

    // Transform data
    const students = filteredEnrollments.map(e => ({
      id: e.student.id,
      lrn: e.student.lrn,
      firstName: e.student.firstName,
      middleName: e.student.middleName,
      lastName: e.student.lastName,
      suffix: e.student.suffix,
      gender: e.student.gender,
      birthDate: e.student.birthDate,
      address: e.student.address,
      guardianName: e.student.guardianName,
      guardianContact: e.student.guardianContact,
      gradeLevel: e.section.gradeLevel,
      sectionId: e.section.id,
      sectionName: e.section.name,
      schoolYear: e.schoolYear,
      status: e.status,
      adviser: e.section.adviser ? `${e.section.adviser.user.firstName} ${e.section.adviser.user.lastName}` : null
    }));

    // Get sections for filter
    const sections = await prisma.section.findMany({
      where: { schoolYear: currentSchoolYear },
      select: {
        id: true,
        name: true,
        gradeLevel: true
      },
      orderBy: [
        { gradeLevel: 'asc' },
        { name: 'asc' }
      ]
    });

    // Stats
    const stats = {
      total: students.length,
      byGrade: {
        GRADE_7: students.filter(s => s.gradeLevel === "GRADE_7").length,
        GRADE_8: students.filter(s => s.gradeLevel === "GRADE_8").length,
        GRADE_9: students.filter(s => s.gradeLevel === "GRADE_9").length,
        GRADE_10: students.filter(s => s.gradeLevel === "GRADE_10").length
      },
      byGender: {
        male: students.filter(s => s.gender?.toLowerCase() === "male").length,
        female: students.filter(s => s.gender?.toLowerCase() === "female").length
      }
    };

    res.json({
      students,
      sections,
      stats,
      schoolYear: currentSchoolYear
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

// Get single student details
router.get("/student/:studentId", authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user || user.role !== "REGISTRAR") {
      res.status(403).json({ message: "Access denied. Registrar only." });
      return;
    }

    const studentId = req.params.studentId as string;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: {
            section: true
          },
          orderBy: { schoolYear: 'desc' }
        }
      }
    });

    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    res.json({ student });
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({ message: "Failed to fetch student" });
  }
});

// Get SF9 (Report Card) data for a student
router.get("/forms/sf9/:studentId", authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user || user.role !== "REGISTRAR") {
      res.status(403).json({ message: "Access denied. Registrar only." });
      return;
    }

    const studentId = req.params.studentId as string;
    const { schoolYear } = req.query;
    const currentSchoolYear = (schoolYear as string) || "2024-2025";

    // Get student data
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    // Get enrollment for school year
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: studentId,
        schoolYear: currentSchoolYear
      },
      include: {
        section: {
          include: {
            adviser: {
              include: { user: true }
            }
          }
        }
      }
    });

    if (!enrollment) {
      res.status(404).json({ message: "Student not enrolled for this school year" });
      return;
    }

    // Get all grades for this student in this school year
    const grades = await prisma.grade.findMany({
      where: {
        studentId: studentId,
        classAssignment: {
          sectionId: enrollment.sectionId,
          schoolYear: currentSchoolYear
        }
      },
      include: {
        classAssignment: {
          include: {
            subject: true,
            teacher: {
              include: { user: true }
            }
          }
        }
      }
    });

    // Organize grades by subject
    const subjectGrades: Record<string, any> = {};
    grades.forEach((grade: any) => {
      const subjectId = grade.classAssignment.subject.id;
      if (!subjectGrades[subjectId]) {
        subjectGrades[subjectId] = {
          subjectCode: grade.classAssignment.subject.code,
          subjectName: grade.classAssignment.subject.name,
          teacher: `${grade.classAssignment.teacher.user.firstName} ${grade.classAssignment.teacher.user.lastName}`,
          Q1: null,
          Q2: null,
          Q3: null,
          Q4: null,
          finalGrade: null
        };
      }
      subjectGrades[subjectId][grade.quarter] = grade.quarterlyGrade;
    });

    // Calculate final grades
    Object.values(subjectGrades).forEach((subject: any) => {
      const quarters = [subject.Q1, subject.Q2, subject.Q3, subject.Q4].filter((q: number | null) => q !== null);
      if (quarters.length > 0) {
        subject.finalGrade = Math.round(quarters.reduce((a: number, b: number) => a + b, 0) / quarters.length);
      }
    });

    // Calculate general average
    const allFinals = Object.values(subjectGrades).map((s: any) => s.finalGrade).filter((g: number | null) => g !== null);
    const generalAverage = allFinals.length > 0 
      ? Math.round(allFinals.reduce((a: number, b: number) => a + b, 0) / allFinals.length)
      : null;

    res.json({
      student: {
        id: student.id,
        lrn: student.lrn,
        name: `${student.lastName}, ${student.firstName} ${student.middleName || ""} ${student.suffix || ""}`.trim(),
        gender: student.gender,
        birthDate: student.birthDate,
        section: enrollment.section.name,
        gradeLevel: enrollment.section.gradeLevel,
        schoolYear: enrollment.schoolYear,
        adviser: enrollment.section.adviser 
          ? `${enrollment.section.adviser.user.firstName} ${enrollment.section.adviser.user.lastName}`
          : null
      },
      subjectGrades: Object.values(subjectGrades).map((s: any) => ({
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
        Q1: s.Q1,
        Q2: s.Q2,
        Q3: s.Q3,
        Q4: s.Q4,
        final: s.finalGrade,
        remarks: s.finalGrade ? (s.finalGrade >= 75 ? "Passed" : "Failed") : null
      })),
      attendance: {},
      values: [],
      generalAverage,
      honors: generalAverage ? (generalAverage >= 98 ? "With Highest Honors" : generalAverage >= 95 ? "With High Honors" : generalAverage >= 90 ? "With Honors" : null) : null,
      promotionStatus: generalAverage ? (Object.values(subjectGrades).every((s: any) => !s.finalGrade || s.finalGrade >= 75) ? "Promoted" : "Retained") : null
    });
  } catch (error) {
    console.error("Error fetching SF9 data:", error);
    res.status(500).json({ message: "Failed to fetch SF9 data" });
  }
});

// Get SF10 (Permanent Record) data for a student
router.get("/forms/sf10/:studentId", authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user || user.role !== "REGISTRAR") {
      res.status(403).json({ message: "Access denied. Registrar only." });
      return;
    }

    const studentId = req.params.studentId as string;

    // Get student data with enrollments
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: {
            section: {
              include: {
                adviser: {
                  include: { user: true }
                }
              }
            }
          },
          orderBy: { schoolYear: 'asc' }
        }
      }
    });

    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    // Get all grades for this student across all school years
    const grades = await prisma.grade.findMany({
      where: { studentId: studentId },
      include: {
        classAssignment: {
          include: {
            subject: true,
            section: true,
            teacher: {
              include: { user: true }
            }
          }
        }
      }
    });

    // Organize by school year
    const academicHistory: Record<string, any> = {};
    
    student.enrollments.forEach((enrollment: any) => {
      const sy = enrollment.schoolYear;
      if (!academicHistory[sy]) {
        academicHistory[sy] = {
          schoolYear: sy,
          gradeLevel: enrollment.section.gradeLevel,
          section: enrollment.section.name,
          subjects: {}
        };
      }
    });

    grades.forEach((grade: any) => {
      const sy = grade.classAssignment.schoolYear;
      if (!academicHistory[sy]) {
        academicHistory[sy] = {
          schoolYear: sy,
          gradeLevel: grade.classAssignment.section.gradeLevel,
          section: grade.classAssignment.section.name,
          subjects: {}
        };
      }

      const subjectId = grade.classAssignment.subject.id;
      if (!academicHistory[sy].subjects[subjectId]) {
        academicHistory[sy].subjects[subjectId] = {
          subjectCode: grade.classAssignment.subject.code,
          subjectName: grade.classAssignment.subject.name,
          Q1: null,
          Q2: null,
          Q3: null,
          Q4: null,
          finalGrade: null
        };
      }
      // Store quarterly grade
      if (grade.quarter === 'Q1') academicHistory[sy].subjects[subjectId].Q1 = grade.quarterlyGrade;
      if (grade.quarter === 'Q2') academicHistory[sy].subjects[subjectId].Q2 = grade.quarterlyGrade;
      if (grade.quarter === 'Q3') academicHistory[sy].subjects[subjectId].Q3 = grade.quarterlyGrade;
      if (grade.quarter === 'Q4') academicHistory[sy].subjects[subjectId].Q4 = grade.quarterlyGrade;
    });

    // Calculate final grades for each school year
    const schoolRecords = Object.values(academicHistory).map((year: any) => {
      const subjectGrades = Object.values(year.subjects).map((subject: any) => {
        const quarters = [subject.Q1, subject.Q2, subject.Q3, subject.Q4].filter((q: number | null) => q !== null);
        const finalGrade = quarters.length > 0 
          ? Math.round(quarters.reduce((a: number, b: number) => a + b, 0) / quarters.length)
          : null;
        return {
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          Q1: subject.Q1,
          Q2: subject.Q2,
          Q3: subject.Q3,
          Q4: subject.Q4,
          final: finalGrade,
          remarks: finalGrade ? (finalGrade >= 75 ? "Passed" : "Failed") : null
        };
      });

      // Calculate general average
      const allFinals = subjectGrades.map((s: any) => s.final).filter((g: number | null) => g !== null) as number[];
      const generalAverage = allFinals.length > 0 
        ? Math.round(allFinals.reduce((a: number, b: number) => a + b, 0) / allFinals.length)
        : null;

      return {
        schoolYear: year.schoolYear,
        gradeLevel: year.gradeLevel,
        section: year.section,
        subjectGrades,
        generalAverage,
        honors: generalAverage ? (generalAverage >= 98 ? "With Highest Honors" : generalAverage >= 95 ? "With High Honors" : generalAverage >= 90 ? "With Honors" : null) : null,
        promotionStatus: generalAverage ? (subjectGrades.every((s: any) => !s.final || s.final >= 75) ? "Promoted" : "Retained") : null
      };
    });

    res.json({
      student: {
        id: student.id,
        lrn: student.lrn,
        name: `${student.lastName}, ${student.firstName} ${student.middleName || ""} ${student.suffix || ""}`.trim(),
        gender: student.gender,
        birthDate: student.birthDate,
        address: student.address,
        guardianName: student.guardianName,
        guardianContact: student.guardianContact
      },
      schoolRecords: schoolRecords.sort((a, b) => a.schoolYear.localeCompare(b.schoolYear))
    });
  } catch (error) {
    console.error("Error fetching SF10 data:", error);
    res.status(500).json({ message: "Failed to fetch SF10 data" });
  }
});

// Get SF8 (Class Record) data
router.get("/forms/sf8", authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user || user.role !== "REGISTRAR") {
      res.status(403).json({ message: "Access denied. Registrar only." });
      return;
    }

    const { schoolYear, sectionId } = req.query;
    const currentSchoolYear = (schoolYear as string) || "2026-2027";

    // Get all sections for school year
    const sections = await prisma.section.findMany({
      where: { schoolYear: currentSchoolYear },
      include: {
        adviser: {
          include: { user: true }
        },
        _count: {
          select: { enrollments: true }
        }
      },
      orderBy: [
        { gradeLevel: 'asc' },
        { name: 'asc' }
      ]
    });

    // If section is specified, get detailed class record
    if (sectionId && sectionId !== "all") {
      const section = sections.find(s => s.id === sectionId);
      if (!section) {
        res.status(404).json({ message: "Section not found" });
        return;
      }

      // Get all enrollments in this section
      const enrollments = await prisma.enrollment.findMany({
        where: {
          sectionId: sectionId as string,
          schoolYear: currentSchoolYear,
          status: "ENROLLED"
        },
        include: {
          student: true
        },
        orderBy: [
          { student: { lastName: 'asc' } },
          { student: { firstName: 'asc' } }
        ]
      });

      // Get all class assignments for this section
      const classAssignments = await prisma.classAssignment.findMany({
        where: {
          sectionId: sectionId as string,
          schoolYear: currentSchoolYear
        },
        include: {
          subject: true,
          teacher: {
            include: { user: true }
          }
        }
      });

      // Get all grades for students in this section
      const studentIds = enrollments.map(e => e.studentId);
      const grades = await prisma.grade.findMany({
        where: {
          studentId: { in: studentIds },
          classAssignment: {
            sectionId: sectionId as string,
            schoolYear: currentSchoolYear
          }
        }
      });

      // Organize data
      const students = enrollments.map(e => {
        const studentGrades: Record<string, any> = {};
        
        classAssignments.forEach(ca => {
          const subjectGrades = grades.filter(g => 
            g.studentId === e.studentId && g.classAssignmentId === ca.id
          );
          
          studentGrades[ca.subject.code] = {
            Q1: subjectGrades.find(g => g.quarter === "Q1")?.quarterlyGrade || null,
            Q2: subjectGrades.find(g => g.quarter === "Q2")?.quarterlyGrade || null,
            Q3: subjectGrades.find(g => g.quarter === "Q3")?.quarterlyGrade || null,
            Q4: subjectGrades.find(g => g.quarter === "Q4")?.quarterlyGrade || null
          };
        });

        return {
          id: e.student.id,
          lrn: e.student.lrn,
          firstName: e.student.firstName,
          middleName: e.student.middleName,
          lastName: e.student.lastName,
          gender: e.student.gender,
          grades: studentGrades
        };
      });

      const subjects = classAssignments.map(ca => ({
        code: ca.subject.code,
        name: ca.subject.name,
        teacher: `${ca.teacher.user.firstName} ${ca.teacher.user.lastName}`
      }));

      res.json({
        section: {
          id: section.id,
          name: section.name,
          gradeLevel: section.gradeLevel,
          schoolYear: currentSchoolYear,
          adviser: section.adviser 
            ? `${section.adviser.user.firstName} ${section.adviser.user.lastName}`
            : null,
          studentCount: section._count.enrollments
        },
        subjects,
        students
      });
      return;
    }

    // Return list of sections if no specific section requested
    res.json({
      sections: sections.map(s => ({
        id: s.id,
        name: s.name,
        gradeLevel: s.gradeLevel,
        studentCount: s._count.enrollments,
        adviser: s.adviser 
          ? `${s.adviser.user.firstName} ${s.adviser.user.lastName}`
          : null
      })),
      schoolYear: currentSchoolYear
    });
  } catch (error) {
    console.error("Error fetching SF8 data:", error);
    res.status(500).json({ message: "Failed to fetch SF8 data" });
  }
});

// Get sections list
router.get("/sections", authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user || user.role !== "REGISTRAR") {
      res.status(403).json({ message: "Access denied. Registrar only." });
      return;
    }

    const { schoolYear, gradeLevel } = req.query;
    const currentSchoolYear = (schoolYear as string) || "2024-2025";

    const whereClause: any = { schoolYear: currentSchoolYear };
    if (gradeLevel && gradeLevel !== "all") {
      whereClause.gradeLevel = gradeLevel;
    }

    const sections = await prisma.section.findMany({
      where: whereClause,
      include: {
        adviser: {
          include: { user: true }
        },
        _count: {
          select: { enrollments: true }
        }
      },
      orderBy: [
        { gradeLevel: 'asc' },
        { name: 'asc' }
      ]
    });

    res.json(sections.map(s => ({
      id: s.id,
      name: s.name,
      gradeLevel: s.gradeLevel,
      schoolYear: s.schoolYear,
      adviser: s.adviser 
        ? `${s.adviser.user.firstName} ${s.adviser.user.lastName}`
        : null,
      _count: s._count
    })));
  } catch (error) {
    console.error("Error fetching sections:", error);
    res.status(500).json({ message: "Failed to fetch sections" });
  }
});

// Export SF1 - School Register (Student Master List)
router.get("/export/sf1/:sectionId", authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user || (user.role !== "REGISTRAR" && user.role !== "ADMIN")) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    const rawSectionId = req.params.sectionId;
    const sectionId = Array.isArray(rawSectionId) ? rawSectionId[0] : rawSectionId;

    if (!sectionId) {
      res.status(400).json({ message: "Section ID is required" });
      return;
    }

    // Get section with enrolled students
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        enrollments: {
          where: { status: "ENROLLED" },
          include: { 
            student: true 
          },
          orderBy: { 
            student: { lastName: "asc" } 
          }
        },
        adviser: {
          include: {
            user: true
          }
        }
      }
    }) as any;

    if (!section) {
      res.status(404).json({ message: "Section not found" });
      return;
    }

    // Fetch school settings
    const schoolSettings = await (prisma as any).systemSettings.findUnique({
      where: { id: 'main' },
      select: { schoolName: true, schoolId: true, division: true, region: true }
    });

    // Check if SF1 template exists
    const template = await (prisma as any).excelTemplate.findFirst({
      where: { formType: "SF1", isActive: true },
      orderBy: { updatedAt: "desc" }
    });

    let buffer: Buffer;

    if (template) {
      // USE TEMPLATE SYSTEM
      console.log("Using SF1 template for school register export");

      const students = section.enrollments.map((enrollment: any, index: number) => ({
        INDEX: index + 1,
        LRN: enrollment.student.lrn,
        LAST_NAME: enrollment.student.lastName,
        FIRST_NAME: enrollment.student.firstName,
        MIDDLE_NAME: enrollment.student.middleName || "",
        SUFFIX: enrollment.student.suffix || "",
        BIRTH_DATE: enrollment.student.birthDate 
          ? new Date(enrollment.student.birthDate).toLocaleDateString('en-US') 
          : "",
        GENDER: enrollment.student.gender || "",
        ADDRESS: enrollment.student.address || "",
        GUARDIAN_NAME: enrollment.student.guardianName || "",
        GUARDIAN_CONTACT: enrollment.student.guardianContact || "",
      }));

      const templateData = {
        SCHOOL_NAME: schoolSettings?.schoolName || '',
        SCHOOL_ID: schoolSettings?.schoolId || '',
        DIVISION: schoolSettings?.division || '',
        REGION: schoolSettings?.region || '',
        SECTION_NAME: section.name,
        GRADE_LEVEL: section.gradeLevel.replace("_", " "),
        SCHOOL_YEAR: section.schoolYear,
        ADVISER: section.adviser 
          ? `${section.adviser.user.firstName} ${section.adviser.user.lastName}`
          : "Not Assigned",
        TOTAL_STUDENTS: students.length,
        STUDENTS: students,
        DATE_GENERATED: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      };

      buffer = await templateService.fillTemplate(template.filePath, templateData, {
        targetSheetName: template.sheetName || undefined,
        keepOnlyTargetSheet: Boolean(template.sheetName)
      });
    } else {
      // FALLBACK TO HARDCODED FORMAT
      console.log("No SF1 template found, using hardcoded format");

      const worksheetData: any[] = [
        ["SCHOOL FORM 1 - SCHOOL REGISTER"],
        [],
        [`Section: ${section.name}`, `Grade Level: ${section.gradeLevel.replace("_", " ")}`],
        [`School Year: ${section.schoolYear}`, `Adviser: ${section.adviser ? `${section.adviser.user.firstName} ${section.adviser.user.lastName}` : "Not Assigned"}`],
        [],
        ["No.", "LRN", "Last Name", "First Name", "Middle Name", "Suffix", "Birth Date", "Gender", "Address", "Guardian Name", "Guardian Contact"],
      ];

      section.enrollments.forEach((enrollment: any, index: number) => {
        const student = enrollment.student;
        worksheetData.push([
          index + 1,
          student.lrn,
          student.lastName,
          student.firstName,
          student.middleName || "",
          student.suffix || "",
          student.birthDate ? new Date(student.birthDate).toLocaleDateString('en-US') : "",
          student.gender || "",
          student.address || "",
          student.guardianName || "",
          student.guardianContact || "",
        ]);
      });

      worksheetData.push([]);
      worksheetData.push([`Total Students: ${section.enrollments.length}`]);

      // Create workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Set column widths
      worksheet["!cols"] = [
        { wch: 5 },  // No
        { wch: 15 }, // LRN
        { wch: 15 }, // Last Name
        { wch: 15 }, // First Name
        { wch: 15 }, // Middle Name
        { wch: 8 },  // Suffix
        { wch: 12 }, // Birth Date
        { wch: 10 }, // Gender
        { wch: 30 }, // Address
        { wch: 20 }, // Guardian Name
        { wch: 15 }, // Guardian Contact
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "School Register");

      buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    }

    // Set response headers
    res.setHeader("Content-Disposition", `attachment; filename="SF1_School_Register_${section.name}_${section.schoolYear}.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    res.send(buffer);
  } catch (error: any) {
    console.error("Error exporting SF1:", error);
    res.status(500).json({ message: "Failed to export school register", error: error.message });
  }
});

export default router;
