import 'dotenv/config';
import { getAllIntegrationV1Learners } from '../src/lib/enrollproClient';

async function main() {
  const all = await getAllIntegrationV1Learners(55);
  
  const statusCounts: Record<string, number> = {};
  for (const row of all) {
    const status = row.status || 'UNKNOWN';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }
  
  console.log('Status breakdown:', statusCounts);
}

main().catch(console.error);
