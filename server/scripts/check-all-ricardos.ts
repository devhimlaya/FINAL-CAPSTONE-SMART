
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL!;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) } as any);

async function main() {
  const ricardos = await prisma.teacher.findMany({
    where: {
      user: { firstName: { contains: "Ricardo", mode: "insensitive" } }
    },
    include: { user: true, advisorySections: true }
  });
  console.log(`Found ${ricardos.length} Ricardos:`);
  ricardos.forEach(r => {
    console.log(` - ${r.user.firstName} ${r.user.lastName} (EmpID: ${r.employeeId})`);
    r.advisorySections.forEach(s => console.log(`   Advisory: ${s.name} (${s.schoolYear})`));
  });
  await prisma.$disconnect();
}
main();
