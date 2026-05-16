import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const enrollments = await prisma.enrollment.findMany({
    where: { schoolYear: '2026-2027', status: 'ENROLLED' },
    select: { studentId: true }
  });
  
  const uniqueStudents = new Set(enrollments.map(e => e.studentId));
  console.log('Unique Enrolled Students:', uniqueStudents.size);
}

main().catch(console.error).finally(() => prisma.$disconnect());
