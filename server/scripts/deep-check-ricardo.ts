
import * as dotenv from 'dotenv';
import path from 'path';
import https from 'https';
import http from 'http';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const ENROLLPRO_BASE = process.env.ENROLLPRO_BASE_URL ?? 'https://dev-jegs.buru-degree.ts.net/api';

function fetchJSON(
  url: string,
  options?: { method?: string; body?: string; headers?: Record<string, string> }
): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const bodyBuf = options?.body ? Buffer.from(options.body) : undefined;
    const reqOptions: any = {
      hostname: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port) : parsed.protocol === 'https:' ? 443 : 80,
      path: parsed.pathname + parsed.search,
      method: options?.method ?? 'GET',
      rejectUnauthorized: false,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyBuf ? { 'Content-Length': String(bodyBuf.length) } : {}),
        ...(options?.headers ?? {}),
      },
    };
    const req = (lib as any).request(reqOptions, (res: any) => {
      let body = '';
      res.on('data', (c: any) => (body += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
    });
    req.on('error', (err: Error) => reject(err));
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

async function main() {
  try {
    const accountName = process.env.ENROLLPRO_ACCOUNT_NAME;
    const password = process.env.ENROLLPRO_PASSWORD;
    
    console.log("Authenticating with EnrollPro...");
    const login = await fetchJSON(`${ENROLLPRO_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ accountName, password }),
    });

    if (!login.token) {
      console.error("Login failed:", login);
      return;
    }

    const auth = { Authorization: `Bearer ${login.token}` };
    console.log("Authentication successful.\n");

    // 1. Check /teachers
    console.log("Fetching all teachers from /teachers...");
    const teachersResp = await fetchJSON(`${ENROLLPRO_BASE}/teachers`, { headers: auth });
    const teachers = teachersResp.teachers || [];
    console.log(`Found ${teachers.length} teachers.\n`);

    const targetEmpId = "3520452";
    const ricardoTeacher = teachers.find((t: any) => 
      t.employeeId === targetEmpId || 
      (t.firstName?.toLowerCase().includes("ricardo") && t.lastName?.toLowerCase().includes("villanueva"))
    );

    if (ricardoTeacher) {
      console.log(`✅ Teacher Found in /teachers:`);
      console.log(JSON.stringify(ricardoTeacher, null, 2));
    } else {
      console.log(`❌ Teacher "Ricardo Villanueva" (${targetEmpId}) NOT found in /teachers.`);
    }

    // 2. Check /sections
    console.log("\nFetching all sections from /sections...");
    const sectionsResp = await fetchJSON(`${ENROLLPRO_BASE}/sections`, { headers: auth });
    const gradeLevels = sectionsResp.gradeLevels || [];
    const allSections = gradeLevels.flatMap((gl: any) => (gl.sections || []).map((s: any) => ({ ...s, gradeLevelName: gl.gradeLevelName })));
    console.log(`Found ${allSections.length} sections.`);

    const ricardoAdvisory = allSections.find((s: any) => 
      s.advisingTeacher?.id === ricardoTeacher?.id ||
      (s.advisingTeacher?.name?.toLowerCase().includes("ricardo") && s.advisingTeacher?.name?.toLowerCase().includes("villanueva"))
    );

    if (ricardoAdvisory) {
      console.log(`✅ Advisory Found in /sections:`);
      console.log(`   Section: ${ricardoAdvisory.name} (${ricardoAdvisory.gradeLevelName})`);
      console.log(`   Adviser: ${ricardoAdvisory.advisingTeacher?.name} (ID: ${ricardoAdvisory.advisingTeacher?.id})`);
    } else {
      console.log(`❌ No advisory found for him in /sections.`);
      
      console.log("\nSearching for ANY section with a Ricardo as adviser...");
      const otherRicardos = allSections.filter((s: any) => s.advisingTeacher?.name?.toLowerCase().includes("ricardo"));
      otherRicardos.forEach((s: any) => {
        console.log(` - Section: ${s.name} | Adviser: ${s.advisingTeacher?.name}`);
      });
    }

    // 3. Search for the specific employee ID in ALL sections even if name doesn't match
    if (ricardoTeacher) {
        const byId = allSections.find((s: any) => s.advisingTeacher?.id === ricardoTeacher.id);
        if (byId) {
            console.log(`✅ Found by Teacher ID match: ${byId.name}`);
        }
    }

  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
