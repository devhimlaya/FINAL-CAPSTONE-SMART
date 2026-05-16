import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const allSections = await prisma.section.findMany({
    where: { schoolYear: '2026-2027' }
  });
  console.log(`Total sections in DB: ${allSections.length}`);
  
  const enrollments = await prisma.enrollment.findMany({
    where: { schoolYear: '2026-2027', status: 'ENROLLED' },
    select: { sectionId: true }
  });
  
  const uniqueSectionsWithStudents = new Set(enrollments.map(e => e.sectionId));
  console.log(`Sections with at least one ENROLLED student: ${uniqueSectionsWithStudents.size}`);
  
  const emptySections = allSections.filter(s => !uniqueSectionsWithStudents.has(s.id));
  if (emptySections.length > 0) {
    console.log('Empty sections (0 enrolled students):');
    emptySections.forEach(s => console.log(` - ${s.name} (Grade ${s.gradeLevel})`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
