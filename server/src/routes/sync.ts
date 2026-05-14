import { Router, Response } from 'express';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';
import {
  runUnifiedSync,
  getUnifiedSyncStatus,
  isUnifiedSyncRunning,
  getLastUnifiedSyncResult,
  triggerImmediateSync,
} from '../lib/syncCoordinator';
import {
  syncTeachersFromEnrollProForSchoolYear,
  syncStudentsFromEnrollProForSchoolYear,
  syncEnrollmentsFromEnrollProForSchoolYear,
  checkSyncConnectivity,
} from '../services/syncService';
import { runAtlasSync } from '../lib/atlasSync';
import { prisma } from '../lib/prisma';

const router = Router();

function requireAdmin(req: AuthRequest, res: Response, next: () => void): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ message: 'Access denied. Admin only.' });
    return;
  }

  next();
}

// POST /api/sync/all — Full unified sync (EnrollPro → Atlas → Branding)
router.post('/all', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (isUnifiedSyncRunning()) {
      res.json({ message: 'Sync already in progress', running: true });
      return;
    }
    const result = await runUnifiedSync({ source: 'admin-manual', forceBranding: true });
    res.json({ message: 'Full sync complete', result });
  } catch (error: any) {
    res.status(500).json({ message: 'Sync failed', error: error?.message ?? String(error) });
  }
});

// GET /api/sync/status — Comprehensive sync status
router.get('/status', authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [studentCount, enrollmentCount, sectionCount, assignmentCount] = await Promise.all([
      prisma.student.count(),
      prisma.enrollment.count(),
      prisma.section.count(),
      prisma.classAssignment.count(),
    ]);

    res.json({
      syncStatus: getUnifiedSyncStatus(),
      liveCounts: { studentCount, enrollmentCount, sectionCount, assignmentCount },
      sources: {
        enrollpro: process.env.ENROLLPRO_URL || process.env.ENROLLPRO_BASE_URL || 'https://dev-jegs.buru-degree.ts.net/api',
        atlas: process.env.ATLAS_URL || process.env.ATLAS_BASE_URL || 'http://100.88.55.125:5001/api/v1',
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch status', error: error?.message ?? String(error) });
  }
});

// GET /api/sync/ping — Check if EnrollPro and Atlas are reachable
router.get('/ping', authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await checkSyncConnectivity();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Ping failed', error: error?.message ?? String(error) });
  }
});

// POST /api/sync/enrollpro — Sync teachers + students + enrollments from EnrollPro only
router.post('/enrollpro', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const schoolYear = (req.query.schoolYear as string) || undefined;
    const teachers = await syncTeachersFromEnrollProForSchoolYear(schoolYear);
    const students = await syncStudentsFromEnrollProForSchoolYear(schoolYear);
    const enrollments = await syncEnrollmentsFromEnrollProForSchoolYear(schoolYear);
    res.json({
      message: 'EnrollPro sync complete',
      result: {
        timestamp: new Date().toISOString(),
        schoolYear: schoolYear ?? process.env.ENROLLPRO_SCHOOL_YEAR_LABEL ?? process.env.SYNC_SCHOOL_YEAR ?? '2025-2026',
        teachers,
        students,
        enrollments,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'EnrollPro sync failed', error: error?.message ?? String(error) });
  }
});

// POST /api/sync/atlas — Sync class assignments from Atlas only
router.post('/atlas', authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await runAtlasSync();
    res.json({ message: 'Atlas sync complete', result });
  } catch (error: any) {
    res.status(500).json({ message: 'Atlas sync failed', error: error?.message ?? String(error) });
  }
});

export default router;