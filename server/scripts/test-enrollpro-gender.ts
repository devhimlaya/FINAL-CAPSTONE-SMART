import 'dotenv/config';
import { getAllIntegrationV1Learners } from '../src/lib/enrollproClient';

async function main() {
  const all = await getAllIntegrationV1Learners(55);
  
  let male = 0;
  let female = 0;
  let unknown = 0;
  
  for (const row of all) {
    const s = row.learner?.sex ?? row.learner?.gender ?? row.sex ?? row.gender;
    if (s?.toUpperCase() === 'MALE' || s?.toUpperCase() === 'M') male++;
    else if (s?.toUpperCase() === 'FEMALE' || s?.toUpperCase() === 'F') female++;
    else unknown++;
  }
  
  console.log(`Total: ${all.length}`);
  console.log(`Male: ${male}`);
  console.log(`Female: ${female}`);
  console.log(`Unknown: ${unknown}`);
}

main().catch(console.error);
