import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticateToken, AuthRequest, authorizeRoles } from "../middleware/auth";
import type { Attendance, Student, Section, Enrollment } from "@prisma/client";
import * as XLSX from "xlsx";
import templateService from "../services/templateService";

const router = Router();

// Type definitions
type AttendanceWithStudent = Attendance & { student: Student };
type SectionWithDetails = Section & { 
  enrollments: Array<Enrollment & { student: Student }> 
};

// Get attendance for a section on a specific date
router.get(
  "/section/:sectionId",
  authenticateToken,
  authorizeRoles("TEACHER", "ADMIN", "REGISTRAR"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const sectionId = String(req.params.sectionId);
      const { date } = req.query;

      if (!date || typeof date !== "string") {
        res.status(400).json({ message: "Date parameter is required" });
        return;
      }

      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);

      // Get all students in the section
      const section = await prisma.section.findUnique({
        where: { id: sectionId },
        include: {
          enrollments: {
            where: { status: "ENROLLED" },
            include: { student: true },
            orderBy: { student: { lastName: "asc" } },
          },
        },
      });

      if (!section) {
        res.status(404).json({ message: "Section not found" });
        return;
      }

      // Get attendance records for this date
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          sectionId,
          date: targetDate,
        },
        include: { student: true },
      });

      // Map attendance to students (default PRESENT if no record)
      const attendanceData = section.enrollments.map((enrollment: any) => {
        const record = attendanceRecords.find(
          (a: any) => a.studentId === enrollment.student.id
        );
        return {
          studentId: enrollment.student.id,
          lrn: enrollment.student.lrn,
          firstName: enrollment.student.firstName,
          middleName: enrollment.student.middleName,
          lastName: enrollment.student.lastName,
          status: record?.status || "PRESENT",
          remarks: record?.remarks || null,
          attendanceId: record?.id || null,
        };
      });

      res.json({
        success: true,
        data: {
          section: {
            id: section.id,
            name: section.name,
            gradeLevel: section.gradeLevel,
          },
          date: targetDate.toISOString().split("T")[0],
          attendance: attendanceData,
        },
      });
    } catch (error: any) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "Failed to fetch attendance", error: error.message });
    }
  }
);

// Save/update attendance for multiple students
router.post(
  "/bulk",
  authenticateToken,
  authorizeRoles("TEACHER", "ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { sectionId, date, attendance } = req.body;

      if (!sectionId || !date || !Array.isArray(attendance)) {
        res.status(400).json({ message: "Invalid request body" });
        return;
      }

      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);

      // Get teacher info for recordedBy
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user?.id },
      });

      // Upsert attendance records
      const operations = attendance.map((record: any) =>
        prisma.attendance.upsert({
          where: {
            studentId_sectionId_date: {
              studentId: record.studentId,
              sectionId: sectionId,
              date: targetDate,
            },
          },
          update: {
            status: record.status,
            remarks: record.remarks || null,
            recordedBy: teacher?.id || req.user?.id,
          },
          create: {
            studentId: record.studentId,
            sectionId: sectionId,
            date: targetDate,
            status: record.status,
            remarks: record.remarks || null,
            recordedBy: teacher?.id || req.user?.id,
          },
        })
      );

      await prisma.$transaction(operations);

      res.json({
        success: true,
        message: "Attendance saved successfully",
      });
    } catch (error: any) {
      console.error("Error saving attendance:", error);
      res.status(500).json({ message: "Failed to save attendance", error: error.message });
    }
  }
);

// Get attendance summary for a section (date range)
router.get(
  "/summary/:sectionId",
  authenticateToken,
  authorizeRoles("TEACHER", "ADMIN", "REGISTRAR"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const sectionId = String(req.params.sectionId);
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate || typeof startDate !== "string" || typeof endDate !== "string") {
        res.status(400).json({ message: "Start date and end date are required" });
        return;
      }

      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // Get all attendance records in the date range
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          sectionId,
          date: {
            gte: start,
            lte: end,
          },
        },
        include: { student: true },
        orderBy: { date: "asc" },
      });

      // Group by student
      const studentSummary = attendanceRecords.reduce((acc: any, record: any) => {
        const key = record.studentId;
        if (!acc[key]) {
          acc[key] = {
            studentId: record.studentId,
            lrn: record.student.lrn,
            firstName: record.student.firstName,
            middleName: record.student.middleName,
            lastName: record.student.lastName,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            total: 0,
          };
        }
        acc[key][record.status.toLowerCase()]++;
        acc[key].total++;
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          sectionId,
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
          summary: Object.values(studentSummary),
        },
      });
    } catch (error: any) {
      console.error("Error fetching attendance summary:", error);
      res.status(500).json({ message: "Failed to fetch summary", error: error.message });
    }
  }
);

// Get attendance for a specific student (date range)
router.get(
  "/student/:studentId",
  authenticateToken,
  authorizeRoles("TEACHER", "ADMIN", "REGISTRAR"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { studentId } = req.params;
      const { startDate, endDate, sectionId } = req.query;

      const whereClause: any = { studentId };

      if (sectionId && typeof sectionId === "string") {
        whereClause.sectionId = sectionId;
      }

      if (startDate && endDate && typeof startDate === "string" && typeof endDate === "string") {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.date = { gte: start, lte: end };
      }

      const records = await prisma.attendance.findMany({
        where: whereClause,
        include: { section: true },
        orderBy: { date: "desc" },
      });

      // Calculate summary
      const summary = {
        present: records.filter((r) => r.status === "PRESENT").length,
        absent: records.filter((r) => r.status === "ABSENT").length,
        late: records.filter((r) => r.status === "LATE").length,
        excused: records.filter((r) => r.status === "EXCUSED").length,
        total: records.length,
      };

      res.json({
        success: true,
        data: {
          records,
          summary,
        },
      });
    } catch (error: any) {
      console.error("Error fetching student attendance:", error);
      res.status(500).json({ message: "Failed to fetch attendance", error: error.message });
    }
  }
);

// Export attendance to Excel (SF2 Format - Daily Attendance)
router.get(
  "/export/:sectionId",
  authenticateToken,
  authorizeRoles("TEACHER", "ADMIN", "REGISTRAR"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const sectionId = String(req.params.sectionId);
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate || typeof startDate !== "string" || typeof endDate !== "string") {
        res.status(400).json({ message: "Start date and end date are required" });
        return;
      }

      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // Get section details
      const section = await prisma.section.findUnique({
        where: { id: sectionId },
        include: {
          enrollments: {
            where: { status: "ENROLLED" },
            include: { student: true },
            orderBy: { student: { lastName: "asc" } },
          },
        },
      });

      if (!section) {
        res.status(404).json({ message: "Section not found" });
        return;
      }

      // Get all attendance records for the date range
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          sectionId,
          date: { gte: start, lte: end },
        },
        orderBy: { date: "asc" },
      });

      // Get unique dates
      const dates = Array.from(new Set(attendanceRecords.map((r) => r.date.toISOString().split("T")[0]))).sort();

      // Fetch school settings
      const schoolSettings = await (prisma as any).systemSettings.findUnique({
        where: { id: 'main' },
        select: { schoolName: true, schoolId: true, division: true, region: true }
      });

      // Check if SF2 template exists
      const template = await prisma.excelTemplate.findFirst({
        where: { formType: "SF2", isActive: true },
        orderBy: { updatedAt: "desc" }
      });

      let buffer: Buffer;

      if (template) {
        // USE TEMPLATE SYSTEM
        console.log("Using SF2 template for attendance export");

        // Prepare template data
        const students = section.enrollments.map((enrollment: any, index: number) => {
          const student = enrollment.student;
          const studentAttendance = attendanceRecords.filter((r: any) => r.studentId === student.id);

          // Create attendance map by date
          const attendanceByDate = new Map();
          studentAttendance.forEach((record) => {
            const dateKey = record.date.toISOString().split("T")[0];
            attendanceByDate.set(dateKey, record.status);
          });

          // Count statuses
          const present = studentAttendance.filter((r) => r.status === "PRESENT").length;
          const absent = studentAttendance.filter((r) => r.status === "ABSENT").length;
          const late = studentAttendance.filter((r) => r.status === "LATE").length;
          const excused = studentAttendance.filter((r) => r.status === "EXCUSED").length;
          const total = dates.length;
          const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(1) : "0.0";

          // Build date columns dynamically
          const dateColumns: any = {};
          dates.forEach((date) => {
            const status = attendanceByDate.get(date);
            dateColumns[date] = status === "PRESENT" ? "P" : status === "ABSENT" ? "A" : status === "LATE" ? "L" : status === "EXCUSED" ? "E" : "";
          });

          return {
            INDEX: index + 1,
            LRN: student.lrn,
            LAST_NAME: student.lastName,
            FIRST_NAME: student.firstName,
            MIDDLE_NAME: student.middleName || "",
            ...dateColumns, // Dynamic date columns
            PRESENT: present,
            ABSENT: absent,
            LATE: late,
            EXCUSED: excused,
            TOTAL: total,
            ATTENDANCE_RATE: `${attendanceRate}%`,
          };
        });

        const templateData = {
          SCHOOL_NAME: schoolSettings?.schoolName || '',
          SCHOOL_ID: schoolSettings?.schoolId || '',
          DIVISION: schoolSettings?.division || '',
          REGION: schoolSettings?.region || '',
          SECTION_NAME: section.name,
          GRADE_LEVEL: section.gradeLevel.replace("_", " "),
          SCHOOL_YEAR: section.schoolYear,
          START_DATE: startDate,
          END_DATE: endDate,
          DATE_RANGE: `${startDate} to ${endDate}`,
          STUDENTS: students,
        };

        // Fill template
        buffer = await templateService.fillTemplate(template.filePath, templateData, {
          targetSheetName: template.sheetName || undefined,
          keepOnlyTargetSheet: Boolean(template.sheetName)
        });
      } else {
        // FALLBACK TO HARDCODED FORMAT
        console.log("No SF2 template found, using hardcoded format");

        // Prepare Excel data
        const worksheetData: any[] = [
          ["DAILY ATTENDANCE RECORD (SF2)"],
          [],
          [`Section: ${section.name}`, `Grade Level: ${section.gradeLevel.replace("_", " ")}`],
          [`School Year: ${section.schoolYear}`, `Period: ${startDate} to ${endDate}`],
          [],
          ["No.", "LRN", "Last Name", "First Name", "Middle Name", ...dates, "Present", "Absent", "Late", "Excused", "Total", "Attendance %"],
        ];

        // Add student rows
        section.enrollments.forEach((enrollment: any, index: number) => {
          const student = enrollment.student;
          const studentAttendance = attendanceRecords.filter((r: any) => r.studentId === student.id);

          // Create attendance map by date
          const attendanceByDate = new Map();
          studentAttendance.forEach((record) => {
            const dateKey = record.date.toISOString().split("T")[0];
            attendanceByDate.set(dateKey, record.status);
          });

          // Count statuses
          const present = studentAttendance.filter((r) => r.status === "PRESENT").length;
          const absent = studentAttendance.filter((r) => r.status === "ABSENT").length;
          const late = studentAttendance.filter((r) => r.status === "LATE").length;
          const excused = studentAttendance.filter((r) => r.status === "EXCUSED").length;
          const total = dates.length;
          const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(1) : "0.0";

          // Build row with attendance marks per date
          const row = [
            index + 1,
            student.lrn,
            student.lastName,
            student.firstName,
            student.middleName || "",
            ...dates.map((date) => {
              const status = attendanceByDate.get(date);
              return status === "PRESENT" ? "P" : status === "ABSENT" ? "A" : status === "LATE" ? "L" : status === "EXCUSED" ? "E" : "";
            }),
            present,
            absent,
            late,
            excused,
            total,
            `${attendanceRate}%`,
          ];

          worksheetData.push(row);
        });

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

        // Set column widths
        const columnWidths = [
          { wch: 5 },  // No
          { wch: 15 }, // LRN
          { wch: 15 }, // Last Name
          { wch: 15 }, // First Name
          { wch: 15 }, // Middle Name
          ...dates.map(() => ({ wch: 5 })), // Dates
          { wch: 8 },  // Present
          { wch: 8 },  // Absent
          { wch: 8 },  // Late
          { wch: 8 },  // Excused
          { wch: 8 },  // Total
          { wch: 12 }, // Attendance %
        ];
        worksheet["!cols"] = columnWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

        // Generate buffer
        buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
      }

      // Set response headers
      res.setHeader("Content-Disposition", `attachment; filename="Attendance_${section.name}_${startDate}_to_${endDate}.xlsx"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      // Send buffer
      res.send(buffer);
    } catch (error: any) {
      console.error("Error exporting attendance:", error);
      res.status(500).json({ message: "Failed to export attendance", error: error.message });
    }
  }
);

export default router;
