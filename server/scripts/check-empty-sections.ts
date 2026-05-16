import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const allSections = await prisma.section.findMany({
    where: { schoolYear: '2026-2027' },
    include: {
      _count: {
        select: {
          enrollments: true,
          classAssignments: true,
          attendance: true,
          workloadEntries: true
        }
      }
    }
  });
  
  const enrollments = await prisma.enrollment.findMany({
    where: { schoolYear: '2026-2027', status: 'ENROLLED' },
    select: { sectionId: true }
  });
  
  const uniqueSectionsWithStudents = new Set(enrollments.map(e => e.sectionId));
  const emptySections = allSections.filter(s => !uniqueSectionsWithStudents.has(s.id));
  
  for (const s of emptySections) {
    console.log(`- ${s.name} (Grade ${s.gradeLevel})`);
    console.log(`  Counts: enrollments=${s._count.enrollments}, classAssignments=${s._count.classAssignments}, attendance=${s._count.attendance}, workloadEntries=${s._count.workloadEntries}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
