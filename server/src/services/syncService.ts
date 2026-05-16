import { GradeLevel, EnrollmentStatus, SubjectType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { runAtlasSync } from '../lib/atlasSync';
import {
  getAllIntegrationV1Learners,
  getAllIntegrationV1SectionLearners,
  getAllIntegrationV1Sections,
  getEnrollProTeachers,
  resolveEnrollProSchoolYear,
} from '../lib/enrollproClient';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const ENROLLPRO_BASE = (process.env.ENROLLPRO_URL ?? process.env.ENROLLPRO_BASE_URL ?? 'https://dev-jegs.buru-degree.ts.net/api').replace(/\/$/, '');
const ATLAS_BASE = (process.env.ATLAS_URL ?? process.env.ATLAS_BASE_URL ?? 'http://100.88.55.125:5001/api/v1').replace(/\/$/, '');
const DEFAULT_SCHOOL_YEAR = process.env.SYNC_SCHOOL_YEAR ?? process.env.ENROLLPRO_SCHOOL_YEAR_LABEL ?? '2025-2026';
const ATLAS_SCHOOL_ID = Number(process.env.ATLAS_SCHOOL_ID ?? '1');
const ATLAS_SCHOOL_YEAR_ID = Number(process.env.ATLAS_SCHOOL_YEAR_ID ?? '8');

export type SyncResult = {
  synced: number;
  errors: number;
  skipped: number;
};

export type FullSyncResult = {
  timestamp: string;
  schoolYear: string;
  teachers: SyncResult;
  students: SyncResult;
  enrollments: SyncResult;
  assignments: SyncResult;
};

type FetchPayload = Record<string, unknown> | unknown[] | null;

let syncInProgress = false;
let lastSyncResult: FullSyncResult | null = null;

function buildUrl(base: string, path: string): string {
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function toGradeLevel(raw: unknown): GradeLevel {
  const normalized = String(raw ?? '').toLowerCase().replace(/[_.-]+/g, ' ').replace(/\s+/g, ' ').trim();
  switch (normalized) {
    case '7':
    case 'grade 7':
      return GradeLevel.GRADE_7;
    case '8':
    case 'grade 8':
      return GradeLevel.GRADE_8;
    case '9':
    case 'grade 9':
      return GradeLevel.GRADE_9;
    case '10':
    case 'grade 10':
      return GradeLevel.GRADE_10;
    default:
      console.warn(`[sync] Unknown gradeLevel "${String(raw ?? '')}", defaulting to GRADE_7`);
      return GradeLevel.GRADE_7;
  }
}

function toEnrollmentStatus(raw: unknown): EnrollmentStatus {
  const normalized = String(raw ?? '').toUpperCase().trim();
  switch (normalized) {
    case 'PENDING':
      return EnrollmentStatus.PENDING;
    case 'DROPPED':
      return EnrollmentStatus.DROPPED;
    case 'TRANSFERRED':
      return EnrollmentStatus.TRANSFERRED;
    case 'ENROLLED':
    default:
      return EnrollmentStatus.ENROLLED;
  }
}

function toSubjectType(raw: unknown): SubjectType {
  const normalized = String(raw ?? '').toUpperCase().trim().replace(/[\s-]+/g, '_');
  switch (normalized) {
    case 'MAPEH':
      return SubjectType.MAPEH;
    case 'TLE':
      return SubjectType.TLE;
    case 'MATH_SCIENCE':
    case 'MATHSCIENCE':
      return SubjectType.MATH_SCIENCE;
    case 'CORE':
    default:
      return SubjectType.CORE;
  }
}

function asArray(payload: FetchPayload): any[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const candidateKeys = ['data', 'students', 'learners', 'enrollments', 'assignments', 'items', 'records', 'faculty'];
  for (const key of candidateKeys) {
    const value = (payload as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value as any[];
  }

  if (Array.isArray((payload as Record<string, unknown>).gradeLevels)) {
    return (payload as Record<string, unknown>).gradeLevels as any[];
  }

  return [];
}

async function safeFetch(url: string, label: string): Promise<any[] | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      console.error(`[sync] ${label} responded ${response.status} ${response.statusText}`);
      return null;
    }

    const json = (await response.json()) as FetchPayload;
    return asArray(json);
  } catch (error: any) {
    console.error(`[sync] Cannot reach ${label} (${url}): ${error?.message ?? error}`);
    return null;
  }
}

async function fetchFirstArray(candidates: Array<[string, string]>): Promise<any[] | null> {
  for (const [url, label] of candidates) {
    const result = await safeFetch(url, label);
    if (result && result.length > 0) return result;
  }
  for (const [url, label] of candidates) {
    const result = await safeFetch(url, label);
    if (result) return result;
  }
  return null;
}

function atlasRequest(path: string, token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(buildUrl(ATLAS_BASE, path));
    const request = fetch;
    void request;
    const lib = parsed.protocol === 'https:' ? require('https') : require('http');
    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        rejectUnauthorized: false,
      },
      (res: any) => {
        let body = '';
        res.on('data', (chunk: any) => {
          body += chunk;
        });
        res.on('end', () => {
          if (!res.statusCode || res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode ?? 0} ${path}: ${body.slice(0, 200)}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error(`JSON parse error from Atlas ${path}`));
          }
        });
      },
    );

    req.on('error', reject);
    req.setTimeout(20_000, () => req.destroy(new Error(`Timeout: ${path}`)));
    req.end();
  });
}

async function ensureSection(params: {
  name: string;
  gradeLevel: GradeLevel;
  schoolYear: string;
  adviserTeacherId?: string | null;
}): Promise<{ id: string; created: boolean }> {
  const adviserId = params.adviserTeacherId
    ? (await prisma.teacher.findUnique({ where: { employeeId: params.adviserTeacherId } }))?.id
    : null;

  const existing = await prisma.section.findFirst({
    where: {
      name: params.name,
      gradeLevel: params.gradeLevel,
      schoolYear: params.schoolYear,
    },
  });

  if (existing) {
    if (adviserId && existing.adviserId !== adviserId) {
      await prisma.section.update({ where: { id: existing.id }, data: { adviserId } });
    }
    return { id: existing.id, created: false };
  }

  const created = await prisma.section.create({
    data: {
      name: params.name,
      gradeLevel: params.gradeLevel,
      schoolYear: params.schoolYear,
      ...(adviserId ? { adviserId } : {}),
    },
  });

  return { id: created.id, created: true };
}

export async function syncTeachersFromEnrollProForSchoolYear(schoolYear: string = DEFAULT_SCHOOL_YEAR): Promise<SyncResult> {
  console.log('[sync] Fetching teachers from EnrollPro...');
  let teachers: any[] | null = null;

  try {
    teachers = await getEnrollProTeachers();
  } catch (error: any) {
    console.error(`[sync] EnrollPro teachers fetch failed: ${error?.message ?? error}`);
  }

  if (!teachers) return { synced: 0, errors: 1, skipped: 0 };

  let synced = 0;
  let errors = 0;
  let skipped = 0;
  const fallbackPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

  for (const teacherRecord of teachers) {
    const employeeId = normalizeText(teacherRecord?.employeeId);
    if (!employeeId) {
      skipped += 1;
      continue;
    }

    try {
      const existingTeacher = await prisma.teacher.findUnique({
        where: { employeeId },
        include: { user: true },
      });

      if (existingTeacher) {
        await prisma.user.update({
          where: { id: existingTeacher.userId },
          data: {
            username: employeeId,
            firstName: teacherRecord?.firstName ?? existingTeacher.user.firstName,
            lastName: teacherRecord?.lastName ?? existingTeacher.user.lastName,
            email: teacherRecord?.email ?? existingTeacher.user.email,
          },
        });

        await prisma.teacher.update({
          where: { employeeId },
          data: {
            specialization: teacherRecord?.specialization ?? existingTeacher.specialization ?? undefined,
          },
        });

        synced += 1;
        continue;
      }

      const user = await prisma.user.create({
        data: {
          username: employeeId,
          password: fallbackPasswordHash,
          role: 'TEACHER',
          firstName: teacherRecord?.firstName ?? null,
          lastName: teacherRecord?.lastName ?? null,
          email: teacherRecord?.email ?? null,
          teacher: {
            create: {
              employeeId,
              specialization: teacherRecord?.specialization ?? null,
            },
          },
        },
        include: { teacher: true },
      });

      if (user.teacher) {
        synced += 1;
      }
    } catch (error: any) {
      errors += 1;
      console.error(`[sync] Teacher upsert failed ${employeeId}: ${error?.message ?? error}`);
    }
  }

  console.log(`[sync] Teachers: ${synced} synced, ${errors} errors, ${skipped} skipped`);
  return { synced, errors, skipped };
}

export async function syncStudentsFromEnrollProForSchoolYear(schoolYear: string = DEFAULT_SCHOOL_YEAR): Promise<SyncResult> {
  console.log('[sync] Fetching students from EnrollPro...');
  const resolvedSY = await resolveEnrollProSchoolYear(schoolYear);
  let students: any[] | null = null;

  try {
    students = await getAllIntegrationV1Learners(resolvedSY.id);
  } catch (error: any) {
    console.error(`[sync] EnrollPro integration v1 learners fetch failed: ${error?.message ?? error}`);
  }

  if (!students || students.length === 0) {
    const fallbackSectionData = await fetchFirstArray([
      [buildUrl(ENROLLPRO_BASE, '/integration/v1/learners'), 'EnrollPro /integration/v1/learners'],
    ]);
    students = fallbackSectionData;
  }

  if (!students) return { synced: 0, errors: 1, skipped: 0 };

  let synced = 0;
  let errors = 0;
  let skipped = 0;

  for (const student of students) {
    const learner = student?.learner ?? student;
    const lrn = normalizeText(learner?.lrn ?? learner?.learner_id ?? learner?.studentId);
    if (!lrn) {
      skipped += 1;
      continue;
    }

    try {
      await prisma.student.upsert({
        where: { lrn },
        update: {
          firstName: normalizeText(learner?.firstName ?? learner?.givenName) || undefined,
          middleName: learner?.middleName ?? undefined,
          lastName: normalizeText(learner?.lastName ?? learner?.surname) || undefined,
          suffix: learner?.suffix ?? learner?.extensionName ?? undefined,
          birthDate: learner?.birthdate || learner?.birthDate ? new Date(String(learner.birthdate ?? learner.birthDate)) : undefined,
          gender: learner?.gender ?? learner?.sex ?? undefined,
          address: learner?.address ?? undefined,
          guardianName: learner?.guardianName ?? learner?.parentGuardianName ?? undefined,
          guardianContact: learner?.guardianContact ?? learner?.parentGuardianContact ?? undefined,
        },
        create: {
          lrn,
          firstName: normalizeText(learner?.firstName ?? learner?.givenName) || 'Unknown',
          middleName: learner?.middleName ?? null,
          lastName: normalizeText(learner?.lastName ?? learner?.surname) || 'Unknown',
          suffix: learner?.suffix ?? learner?.extensionName ?? null,
          birthDate: learner?.birthdate || learner?.birthDate ? new Date(String(learner.birthdate ?? learner.birthDate)) : null,
          gender: learner?.gender ?? learner?.sex ?? null,
          address: learner?.address ?? null,
          guardianName: learner?.guardianName ?? learner?.parentGuardianName ?? null,
          guardianContact: learner?.guardianContact ?? learner?.parentGuardianContact ?? null,
        },
      });
      synced += 1;
    } catch (error: any) {
      errors += 1;
      console.error(`[sync] Student upsert failed LRN ${lrn}: ${error?.message ?? error}`);
    }
  }

  console.log(`[sync] Students: ${synced} synced, ${errors} errors, ${skipped} skipped`);
  return { synced, errors, skipped };
}

export async function syncEnrollmentsFromEnrollProForSchoolYear(schoolYear: string = DEFAULT_SCHOOL_YEAR): Promise<SyncResult> {
  console.log('[sync] Fetching enrollments from EnrollPro...');
  const resolvedSY = await resolveEnrollProSchoolYear(schoolYear);
  let sections: any[] = [];
  try {
    sections = await getAllIntegrationV1Sections(resolvedSY.id);
  } catch (error: any) {
    console.error(`[sync] EnrollPro sections fetch failed: ${error?.message ?? error}`);
  }

  if (sections.length === 0) {
    sections = await getAllIntegrationV1Sections();
  }

  if (!sections) return { synced: 0, errors: 1, skipped: 0 };

  let synced = 0;
  let errors = 0;
  let skipped = 0;

  for (const section of sections) {
    const sectionName = normalizeText(section?.name);
    const gradeLevelRaw = section?.gradeLevel?.name ?? section?.gradeLevelName ?? section?.gradeLevel;
    const adviserTeacherId = section?.advisingTeacher?.id ?? null;
    const sectionGradeLevel = toGradeLevel(gradeLevelRaw);

    if (!sectionName) {
      skipped += 1;
      continue;
    }

    try {
      const { id: sectionId } = await ensureSection({
        name: sectionName,
        gradeLevel: sectionGradeLevel,
        schoolYear: resolvedSY.yearLabel,
        adviserTeacherId: adviserTeacherId ? String(adviserTeacherId) : null,
      });

      const learners = await getAllIntegrationV1SectionLearners(Number(section?.id));
      for (const record of learners) {
        const learner = record?.learner ?? record;
        const lrn = normalizeText(learner?.lrn);
        if (!lrn) {
          skipped += 1;
          continue;
        }

        const student = await prisma.student.upsert({
          where: { lrn },
          update: {
            firstName: normalizeText(learner?.firstName) || undefined,
            middleName: learner?.middleName ?? undefined,
            lastName: normalizeText(learner?.lastName) || undefined,
            suffix: learner?.extensionName ?? undefined,
            birthDate: learner?.birthdate ? new Date(String(learner.birthdate)) : undefined,
            gender: learner?.sex ?? learner?.gender ?? undefined,
          },
          create: {
            lrn,
            firstName: normalizeText(learner?.firstName) || 'Unknown',
            middleName: learner?.middleName ?? null,
            lastName: normalizeText(learner?.lastName) || 'Unknown',
            suffix: learner?.extensionName ?? null,
            birthDate: learner?.birthdate ? new Date(String(learner.birthdate)) : null,
            gender: learner?.sex ?? learner?.gender ?? null,
          },
        });

        await prisma.enrollment.upsert({
          where: {
            studentId_sectionId_schoolYear: {
              studentId: student.id,
              sectionId,
              schoolYear: resolvedSY.yearLabel,
            },
          },
          update: { status: EnrollmentStatus.ENROLLED },
          create: {
            studentId: student.id,
            sectionId,
            schoolYear: resolvedSY.yearLabel,
            status: EnrollmentStatus.ENROLLED,
          },
        });

        synced += 1;
      }
    } catch (error: any) {
      errors += 1;
      console.error(`[sync] Enrollment sync failed for section ${sectionName}: ${error?.message ?? error}`);
    }
  }

  console.log(`[sync] Enrollments: ${synced} synced, ${errors} errors, ${skipped} skipped`);
  return { synced, errors, skipped };
}

async function fetchAtlasFacultyList(): Promise<any[]> {
  const token = process.env.ATLAS_SYSTEM_TOKEN;
  if (!token) throw new Error('ATLAS_SYSTEM_TOKEN not set in environment');

  const faculty = await atlasRequest(`/faculty?schoolId=${ATLAS_SCHOOL_ID}`, token);
  return faculty?.faculty ?? faculty?.data ?? [];
}

async function fetchAtlasAssignmentsForFaculty(facultyId: number): Promise<any[]> {
  const token = process.env.ATLAS_SYSTEM_TOKEN;
  if (!token) throw new Error('ATLAS_SYSTEM_TOKEN not set in environment');

  const detail = await atlasRequest(`/faculty-assignments/${facultyId}?schoolYearId=${ATLAS_SCHOOL_YEAR_ID}`, token);
  return detail?.assignments ?? detail?.data ?? detail ?? [];
}

function extractFlatAssignments(payload: any[]): Array<{
  employeeId?: string | number;
  subjectCode?: string;
  subjectName?: string;
  subjectType?: string;
  sectionName?: string;
  gradeLevel?: string;
  schoolYear?: string;
  sectionId?: number;
  subject?: { code?: string; name?: string; type?: string };
  sections?: Array<{ id?: number; name?: string }>;
}> {
  return payload.filter(Boolean).map((item) => ({
    employeeId: item?.employeeId ?? item?.facultyId ?? item?.teacherEmployeeId ?? item?.teacher?.employeeId,
    subjectCode: item?.subjectCode ?? item?.subject?.code,
    subjectName: item?.subjectName ?? item?.subject?.name,
    subjectType: item?.subjectType ?? item?.subject?.type,
    sectionName: item?.sectionName ?? item?.section?.name,
    gradeLevel: item?.gradeLevel ?? item?.section?.gradeLevel ?? item?.sectionGradeLevel,
    schoolYear: item?.schoolYear,
    sectionId: item?.sectionId ?? item?.section?.id,
    subject: item?.subject,
    sections: item?.sections,
  }));
}

export async function syncClassAssignmentsFromAtlasForSchoolYear(schoolYear: string = DEFAULT_SCHOOL_YEAR): Promise<SyncResult> {
  console.log('[sync] Fetching class assignments from Atlas...');
  const resolvedSY = await resolveEnrollProSchoolYear(schoolYear);
  const atlasToken = process.env.ATLAS_SYSTEM_TOKEN;
  if (!atlasToken) {
    console.error('[sync] ATLAS_SYSTEM_TOKEN not set in environment');
    return { synced: 0, errors: 1, skipped: 0 };
  }

  let atlasFaculty: any[] = [];
  try {
    const facultyResult = await atlasRequest(`/faculty?schoolId=${ATLAS_SCHOOL_ID}`, atlasToken);
    atlasFaculty = facultyResult?.faculty ?? facultyResult?.data ?? [];
  } catch (error: any) {
    console.error(`[sync] Atlas faculty fetch failed: ${error?.message ?? error}`);
    return { synced: 0, errors: 1, skipped: 0 };
  }

  const flattened: Array<{
    employeeId?: string | number;
    subjectCode?: string;
    subjectName?: string;
    subjectType?: string;
    sectionName?: string;
    gradeLevel?: string;
    schoolYear?: string;
  }> = [];

  for (const faculty of atlasFaculty) {
    const facultyId = Number(faculty?.id);
    if (!Number.isFinite(facultyId)) continue;

    try {
      const detail = await atlasRequest(`/faculty-assignments/${facultyId}?schoolYearId=${ATLAS_SCHOOL_YEAR_ID}`, atlasToken);
      const assignments = detail?.assignments ?? detail?.data ?? detail ?? [];
      const items = Array.isArray(assignments) ? assignments : [];

      for (const assignment of items) {
        if (assignment?.subjectCode || assignment?.sectionId) {
          const epSection = assignment?.sectionId ? (await getAllIntegrationV1Sections(resolvedSY.id)).find((section) => Number(section.id) === Number(assignment.sectionId)) : null;
          if (!epSection) continue;
          flattened.push({
            employeeId: faculty?.externalId ?? faculty?.employeeId ?? faculty?.contactInfo,
            subjectCode: assignment?.subjectCode ?? assignment?.subject?.code,
            subjectName: assignment?.subjectName ?? assignment?.subject?.name,
            subjectType: assignment?.subjectType ?? assignment?.subject?.type,
            sectionName: epSection.name,
            gradeLevel: epSection.gradeLevel?.name ?? epSection.gradeLevelName,
            schoolYear: resolvedSY.yearLabel,
          });
          continue;
        }

        const sections = Array.isArray(assignment?.sections) ? assignment.sections : [];
        for (const section of sections) {
          flattened.push({
            employeeId: faculty?.externalId ?? faculty?.employeeId ?? faculty?.contactInfo,
            subjectCode: assignment?.subject?.code ?? assignment?.subjectCode,
            subjectName: assignment?.subject?.name ?? assignment?.subjectName,
            subjectType: assignment?.subject?.type ?? assignment?.subjectType,
            sectionName: section?.name,
            gradeLevel: section?.gradeLevelName ?? assignment?.gradeLevel,
            schoolYear: resolvedSY.yearLabel,
          });
        }
      }
    } catch (error: any) {
      console.error(`[sync] Atlas assignments fetch failed for faculty ${facultyId}: ${error?.message ?? error}`);
    }
  }

  const records = extractFlatAssignments(flattened);

  let synced = 0;
  let errors = 0;
  let skipped = 0;

  for (const assignment of records) {
    const teacherKey = normalizeText(assignment?.employeeId);
    const subjectCode = normalizeText(assignment?.subjectCode);
    const subjectName = normalizeText(assignment?.subjectName) || subjectCode;
    const sectionName = normalizeText(assignment?.sectionName);
    const gradeLevelRaw = assignment?.gradeLevel;
    const schoolYearValue = normalizeText(assignment?.schoolYear ?? schoolYear);

    if (!teacherKey || !subjectCode || !sectionName) {
      skipped += 1;
      continue;
    }

    try {
      const teacher = await prisma.teacher.findFirst({ where: { employeeId: teacherKey } });

      if (!teacher) {
        console.warn(`[sync] Teacher employeeId ${teacherKey} not in SMART — create teacher account first`);
        errors += 1;
        continue;
      }

      const subject = await prisma.subject.upsert({
        where: { code: subjectCode },
        update: {
          name: subjectName,
          type: toSubjectType(assignment?.subjectType),
        },
        create: {
          code: subjectCode,
          name: subjectName,
          type: toSubjectType(assignment?.subjectType),
        },
      });

      const { id: sectionId } = await ensureSection({
        name: sectionName,
        gradeLevel: toGradeLevel(gradeLevelRaw),
        schoolYear: schoolYearValue,
      });

      await prisma.classAssignment.upsert({
        where: {
          teacherId_subjectId_sectionId_schoolYear: {
            teacherId: teacher.id,
            subjectId: subject.id,
            sectionId,
            schoolYear: schoolYearValue,
          },
        },
        update: {},
        create: {
          teacherId: teacher.id,
          subjectId: subject.id,
          sectionId,
          schoolYear: schoolYearValue,
          teachingMinutes: null,
        },
      });

      synced += 1;
    } catch (error: any) {
      errors += 1;
      console.error(`[sync] ClassAssignment upsert failed for ${teacherKey}/${subjectCode}/${sectionName}: ${error?.message ?? error}`);
    }
  }

  console.log(`[sync] ClassAssignments: ${synced} synced, ${errors} errors, ${skipped} skipped`);
  return { synced, errors, skipped };
}

export async function runFullSync(schoolYear: string = DEFAULT_SCHOOL_YEAR): Promise<FullSyncResult> {
  if (syncInProgress) {
    console.log('[sync] Full sync already running, skipping.');
    return lastSyncResult ?? {
      timestamp: new Date().toISOString(),
      schoolYear,
      teachers: { synced: 0, errors: 0, skipped: 0 },
      students: { synced: 0, errors: 0, skipped: 0 },
      enrollments: { synced: 0, errors: 0, skipped: 0 },
      assignments: { synced: 0, errors: 0, skipped: 0 },
    };
  }

  syncInProgress = true;

  try {
    console.log(`\n[sync] ===== Full sync started ${new Date().toISOString()} =====`);
    const teachers = await syncTeachersFromEnrollProForSchoolYear(schoolYear);
    const students = await syncStudentsFromEnrollProForSchoolYear(schoolYear);
    const enrollments = await syncEnrollmentsFromEnrollProForSchoolYear(schoolYear);
    // Delegate Atlas assignment sync to the dedicated atlasSync module which handles
    // externalId → employeeId resolution, published-schedule fallback, and stale deletes.
    const atlasResult = await runAtlasSync();
    const assignments: SyncResult = {
      synced: atlasResult?.created ?? 0,
      errors: atlasResult?.errors?.length ?? 0,
      skipped: 0,
    };

    lastSyncResult = {
      timestamp: new Date().toISOString(),
      schoolYear,
      teachers,
      students,
      enrollments,
      assignments,
    };

    console.log('[sync] ===== Full sync complete =====\n');
    return lastSyncResult;
  } finally {
    syncInProgress = false;
  }
}

export function getLastSyncResult(): FullSyncResult | null {
  return lastSyncResult;
}

export function isSyncRunning(): boolean {
  return syncInProgress;
}

export async function checkSyncConnectivity(): Promise<{
  enrollpro: { name: string; url: string; online: boolean; httpStatus: number | null };
  atlas: { name: string; url: string; online: boolean; httpStatus: number | null };
}> {
  async function ping(url: string, name: string) {
    try {
      const response = await fetch(buildUrl(url, '/health'), { signal: AbortSignal.timeout(5_000) });
      return { name, url, online: response.ok, httpStatus: response.status };
    } catch {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
        return { name, url, online: response.ok, httpStatus: response.status };
      } catch {
        return { name, url, online: false, httpStatus: null };
      }
    }
  }

  const [enrollpro, atlas] = await Promise.all([
    ping(buildUrl(ENROLLPRO_BASE, '/integration/v1/health'), 'EnrollPro (dev-jegs)'),
    ping(buildUrl(ATLAS_BASE, '/health'), 'Atlas (njgrm)'),
  ]);

  return { enrollpro, atlas };
}
