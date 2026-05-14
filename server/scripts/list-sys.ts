
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

import { 
  getEnrollProSchoolYears,
  getIntegrationV1ActiveSchoolYear
} from '../src/lib/enrollproClient';

async function main() {
  try {
    const active = await getIntegrationV1ActiveSchoolYear();
    console.log("Active (Integration):", active);

    const all = await getEnrollProSchoolYears();
    console.log("All School Years:", JSON.stringify(all, null, 2));
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
