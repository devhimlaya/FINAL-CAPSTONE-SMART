import 'dotenv/config';
import { getEnrollProApplications } from '../src/lib/enrollproClient';

async function main() {
  console.log('Checking EnrollPro Applications with limit 2500...');
  try {
    const data = await getEnrollProApplications({ limit: 2500 });
    console.log('Successfully reached EnrollPro.');
    console.log('Applications returned:', data.applications?.length ?? data.data?.length ?? data.items?.length ?? 0);
    console.log('Total Applications (from meta):', data.meta?.total ?? data.total ?? 'Unknown');
  } catch (err: any) {
    console.error('Error reaching EnrollPro:', err.message);
  }
}

main().catch(console.error);
