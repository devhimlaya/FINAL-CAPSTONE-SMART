
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { 
  getIntegrationV1ActiveSchoolYear, 
  getIntegrationV1Faculty, 
  getIntegrationV1Sections,
  getEnrollProSchoolYears
} from '../src/lib/enrollproClient';

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
  console.error("❌ DATABASE_URL is not set in .env");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
} as any);

async function main() {
  const teacherFirstName = "Ricardo";
  const teacherLastName = "Villanueva";
  const typoLastName = "Villanueve";
  const fullName = `${teacherFirstName} ${teacherLastName}`;

  console.log(`\n🔍 Checking status for: ${fullName} (and variations)\n`);

  // --- 1. Check SMART Local DB ---
  console.log('--- SMART Local Database ---');
  const smartTeacher = await prisma.teacher.findFirst({
    where: {
      user: {
        firstName: { contains: teacherFirstName, mode: 'insensitive' },
        OR: [
          { lastName: { contains: teacherLastName, mode: 'insensitive' } },
          { lastName: { contains: typoLastName, mode: 'insensitive' } }
        ]
      }
    },
    include: {
      user: true,
      advisorySections: true
    }
  });

  let employeeId = "";
  if (!smartTeacher) {
    console.log(`❌ Teacher "${fullName}" not found in SMART database.`);
  } else {
    employeeId = smartTeacher.employeeId || "";
    console.log(`✅ Found in SMART DB: ${smartTeacher.user.firstName} ${smartTeacher.user.lastName} (ID: ${smartTeacher.id}, EmpID: ${employeeId})`);
    if (smartTeacher.advisorySections.length > 0) {
      smartTeacher.advisorySections.forEach(s => {
        console.log(`   - Advisory: ${s.name} [${s.gradeLevel}] (${s.schoolYear})`);
      });
    } else {
      console.log(`   - No advisories assigned in SMART.`);
    }
  }

  // --- 2. Check EnrollPro API ---
  console.log('\n--- EnrollPro Integration API ---');
  try {
    const activeSY = await getIntegrationV1ActiveSchoolYear();
    console.log(`Active School Year (Integration): ${activeSY.yearLabel} (ID: ${activeSY.id})`);

    const allSYs = await getEnrollProSchoolYears();
    console.log(`Available School Years: ${allSYs.map(sy => `${sy.yearLabel}(${sy.id})`).join(', ')}`);

    const faculty = await getIntegrationV1Faculty(activeSY.id);
    console.log(`Faculty count in active SY: ${faculty.length}`);
    if (faculty.length > 0) {
      console.log(`Sample faculty: ${faculty.slice(0, 3).map(f => f.fullName).join(', ')}`);
    }

    const ricardo = faculty.find(f => 
      f.firstName.toLowerCase().includes(teacherFirstName.toLowerCase()) && 
      (f.lastName.toLowerCase().includes(teacherLastName.toLowerCase()) || f.lastName.toLowerCase().includes(typoLastName.toLowerCase()))
    );

    if (ricardo) {
      console.log(`✅ Found in EnrollPro for active SY: ${ricardo.fullName} (EmpID: ${ricardo.employeeId})`);
      console.log(`   - Is Class Adviser: ${ricardo.isClassAdviser}`);
      console.log(`   - Advisory Section: ${ricardo.advisorySectionName ?? 'None'}`);
    } else {
      console.log(`❌ Teacher not found in EnrollPro faculty list for active SY (${activeSY.yearLabel}).`);
    }

    // Try ALL school years
    console.log('\nChecking ALL school years in EnrollPro...');
    for (const sy of allSYs) {
       try {
         const fac = await getIntegrationV1Faculty(sy.id);
         const found = fac.find(f => 
           (f.firstName.toLowerCase().includes(teacherFirstName.toLowerCase()) && 
            (f.lastName.toLowerCase().includes(teacherLastName.toLowerCase()) || f.lastName.toLowerCase().includes(typoLastName.toLowerCase()))) ||
           (employeeId && f.employeeId === employeeId)
         );
         if (found) {
           console.log(`✅ Found in SY ${sy.yearLabel} (ID: ${sy.id}): ${found.fullName} (IsAdviser: ${found.isClassAdviser}, Section: ${found.advisorySectionName ?? 'None'})`);
         }
       } catch { /* ignore */ }
    }

    // Check sections directly too
    const sections = await getIntegrationV1Sections(activeSY.id);
    const ricardoAdvisory = sections.find(s => 
      s.advisingTeacher?.firstName?.toLowerCase().includes(teacherFirstName.toLowerCase()) &&
      s.advisingTeacher?.lastName?.toLowerCase().includes(teacherLastName.toLowerCase())
    );

    if (ricardoAdvisory) {
      console.log(`✅ Found Advisory in Sections list: ${ricardoAdvisory.name} [${ricardoAdvisory.gradeLevel?.name}]`);
    }

  } catch (err: any) {
    console.error(`❌ Error checking EnrollPro: ${err.message}`);
  }

  console.log('\n--------------------------\n');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
