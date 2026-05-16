import 'dotenv/config';
import { getIntegrationV1LearnersPage, getAllIntegrationV1Learners } from '../src/lib/enrollproClient';

async function main() {
  const page1 = await getIntegrationV1LearnersPage(55, 1, 1);
  console.log('Page 1 Meta:', page1.meta);
  
  const all = await getAllIntegrationV1Learners(55);
  console.log('All learners count:', all.length);
  
  // Check for duplicates in 'all'
  const uniqueLearners = new Set(all.map(x => x.learner?.lrn));
  console.log('Unique learners in all:', uniqueLearners.size);
  console.log('Duplicates in all:', all.length - uniqueLearners.size);
}

main().catch(console.error);
