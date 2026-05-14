
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

import { 
  getIntegrationV1ActiveSchoolYear, 
  getIntegrationV1Sections,
} from '../src/lib/enrollproClient';

async function main() {
  try {
    const activeSY = await getIntegrationV1ActiveSchoolYear();
    const sections = await getIntegrationV1Sections(activeSY.id);
    
    console.log(`Checking all ${sections.length} sections in EnrollPro (SY ${activeSY.yearLabel}) for Ricardo Villanueva...`);
    const matches = sections.filter(s => 
      s.advisingTeacher?.firstName?.toLowerCase().includes("ricardo") && 
      (s.advisingTeacher?.lastName?.toLowerCase().includes("villanueva") || s.advisingTeacher?.lastName?.toLowerCase().includes("villanueve"))
    );

    if (matches.length > 0) {
      matches.forEach(m => {
        console.log(` - Section: ${m.name} [${m.gradeLevel?.name}] | Adviser: ${m.advisingTeacher.firstName} ${m.advisingTeacher.lastName}`);
      });
    } else {
      console.log("No section found with him as adviser.");
      
      // Check for ANY Ricardo as adviser
      const allRicardos = sections.filter(s => s.advisingTeacher?.firstName?.toLowerCase().includes("ricardo"));
      if (allRicardos.length > 0) {
        console.log("\nOther Ricardos found as advisers:");
        allRicardos.forEach(m => {
           console.log(` - Section: ${m.name} | Adviser: ${m.advisingTeacher.firstName} ${m.advisingTeacher.lastName}`);
        });
      }
    }

  } catch (err: any) {
    console.error(`Error: ${err.message}`);
  }
}

main();
