import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const enrollments = await prisma.enrollment.findMany({
    where: { schoolYear: '2026-2027', status: 'ENROLLED' },
    select: { id: true, studentId: true, sectionId: true, student: { select: { lrn: true } } }
  });
  
  const studentCounts: Record<string, number> = {};
  for (const e of enrollments) {
    studentCounts[e.studentId] = (studentCounts[e.studentId] || 0) + 1;
  }
  
  let duplicates = 0;
  for (const [studentId, count] of Object.entries(studentCounts)) {
    if (count > 1) {
      duplicates++;
      // console.log(`Student ${studentId} has ${count} active enrollments`);
    }
  }
  
  console.log(`Total active enrollments: ${enrollments.length}`);
  console.log(`Unique students: ${Object.keys(studentCounts).length}`);
  console.log(`Students with multiple active enrollments: ${duplicates}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
