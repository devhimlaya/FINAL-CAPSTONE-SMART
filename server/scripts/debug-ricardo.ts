
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

import { 
  getIntegrationV1ActiveSchoolYear, 
  getIntegrationV1Faculty,
} from '../src/lib/enrollproClient';

const connectionString = process.env.DATABASE_URL!;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) } as any);

async function main() {
  try {
    const activeSY = await getIntegrationV1ActiveSchoolYear();
    console.log(`Active SY: ${activeSY.yearLabel} (ID: ${activeSY.id})`);

    const faculty = await getIntegrationV1Faculty(activeSY.id);
    console.log(`Total Faculty: ${faculty.length}`);

    console.log("\nSearching for Ricardo Villanueva (3520452)...");
    const matches = faculty.filter(f => 
      f.fullName.toLowerCase().includes("ricardo") || 
      f.fullName.toLowerCase().includes("villanueva") ||
      f.fullName.toLowerCase().includes("villanueve") ||
      f.employeeId === "3520452"
    );

    if (matches.length > 0) {
      matches.forEach(m => {
        console.log(`Match Found: ${m.fullName} (EmpID: ${m.employeeId}) | Adviser: ${m.isClassAdviser} | Section: ${m.advisorySectionName}`);
      });
    } else {
      console.log("No matches found in active SY.");
      console.log("\nFirst 10 faculty members in EnrollPro:");
      faculty.slice(0, 10).forEach(f => console.log(` - ${f.fullName} (${f.employeeId})`));
    }

    // Try SY 8 (which was used in fetch-enrollpro.mjs)
    console.log("\nChecking SY ID 8 (2025-2026?)...");
    const faculty8 = await getIntegrationV1Faculty(8);
    const matches8 = faculty8.filter(f => 
      f.fullName.toLowerCase().includes("ricardo") || 
      f.fullName.toLowerCase().includes("villanueva") ||
      f.employeeId === "3520452"
    );
    if (matches8.length > 0) {
      matches8.forEach(m => {
        console.log(`Match Found in SY 8: ${m.fullName} (EmpID: ${m.employeeId}) | Adviser: ${m.isClassAdviser} | Section: ${m.advisorySectionName}`);
      });
    } else {
      console.log("No matches found in SY 8.");
    }

  } catch (err: any) {
    console.error(`Error: ${err.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
