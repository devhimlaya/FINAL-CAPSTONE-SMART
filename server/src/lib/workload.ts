import { prisma } from './prisma';
import { WorkloadType } from '@prisma/client';

const DEFAULT_ADVISORY_EQUIVALENT_MINUTES = 60;

export function getAdvisoryEquivalentMinutes(): number {
  const raw = process.env.ADVISORY_EQUIVALENT_MINUTES ?? String(DEFAULT_ADVISORY_EQUIVALENT_MINUTES);
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ADVISORY_EQUIVALENT_MINUTES;
}

export async function syncAdvisoryWorkloadEntry(params: {
  teacherId: string | null | undefined;
  sectionId: string;
  schoolYear: string;
}): Promise<void> {
  const { teacherId, sectionId, schoolYear } = params;

  if (!teacherId) {
    await prisma.workloadEntry.deleteMany({
      where: {
        sectionId,
        schoolYear,
        type: WorkloadType.ADVISORY_ROLE,
      },
    });
    return;
  }

  const minutes = getAdvisoryEquivalentMinutes();
  await prisma.workloadEntry.upsert({
    where: {
      teacherId_sectionId_schoolYear_type: {
        teacherId,
        sectionId,
        schoolYear,
        type: WorkloadType.ADVISORY_ROLE,
      },
    },
    update: { minutes },
    create: {
      teacherId,
      sectionId,
      schoolYear,
      type: WorkloadType.ADVISORY_ROLE,
      minutes,
    },
  });
}
