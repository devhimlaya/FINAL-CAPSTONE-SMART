
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL!;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) } as any);

async function main() {
  const teachers = await prisma.teacher.findMany({
    take: 10,
    include: { user: true }
  });
  console.log("SMART DB Teachers:");
  teachers.forEach(t => {
    console.log(` - ${t.user.firstName} ${t.user.lastName} (EmpID: ${t.employeeId})`);
  });
  await prisma.$disconnect();
}
main();
