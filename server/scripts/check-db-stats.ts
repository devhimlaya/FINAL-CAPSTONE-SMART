import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const enrollments = await prisma.enrollment.findMany({
    where: { schoolYear: '2026-2027', status: 'ENROLLED' },
    include: { student: true }
  });
  
  const uniqueStudents = new Map();
  for (const e of enrollments) {
    uniqueStudents.set(e.studentId, e.student);
  }
  
  let male = 0;
  let female = 0;
  for (const student of uniqueStudents.values()) {
    const s = student.gender;
    if (s?.toUpperCase() === 'MALE' || s?.toUpperCase() === 'M') male++;
    else if (s?.toUpperCase() === 'FEMALE' || s?.toUpperCase() === 'F') female++;
  }
  
  console.log(`Total: ${uniqueStudents.size}`);
  console.log(`Male: ${male}`);
  console.log(`Female: ${female}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
