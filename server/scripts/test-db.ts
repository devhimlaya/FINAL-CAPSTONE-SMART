import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const count = await prisma.enrollment.count({
    where: { schoolYear: '2026-2027', status: 'ENROLLED' }
  });
  console.log('Enrolled count:', count);
  
  const allEnrollments = await prisma.enrollment.findMany({
    where: { schoolYear: '2026-2027', status: 'ENROLLED' },
    select: { studentId: true }
  });
  
  const uniqueStudents = new Set(allEnrollments.map(e => e.studentId));
  console.log('Unique students:', uniqueStudents.size);
  console.log('Difference:', count - uniqueStudents.size);
}

main().catch(console.error).finally(() => prisma.$disconnect());
