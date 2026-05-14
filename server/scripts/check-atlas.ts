
import * as dotenv from 'dotenv';
import path from 'path';
import http from 'http';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const ATLAS_BASE = 'http://100.88.55.125:5001/api/v1';
const ATLAS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN5c3RlbS1hcGlAYXRsYXMubG9jYWwiLCJyb2xlIjoiU1lTVEVNX0FETUlOIiwidXNlcklkIjpudWxsLCJpYXQiOjE3Nzg0Nzg4NDMsImV4cCI6NDkzNDIzODg0M30.VTB3uv8FEB9VbY0W2mUz0Y5q9fn5WaC02sGJ2jodH08';

function httpGet(url: string, headers: Record<string,string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(url, { headers }, (res: any) => {
      let body = '';
      res.on('data', (c: any) => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error(body.substring(0,200))); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const atlasAuth = { Authorization: `Bearer ${ATLAS_TOKEN}` };
  try {
    console.log("Checking ATLAS for Ricardo Villanueva...");
    const facultyData = await httpGet(`${ATLAS_BASE}/faculty?schoolId=1`, atlasAuth);
    const faculty = facultyData.faculty ?? [];
    
    const ricardo = faculty.find((f: any) => 
      f.firstName?.toLowerCase().includes("ricardo") && 
      f.lastName?.toLowerCase().includes("villanueva")
    );

    if (ricardo) {
      console.log(`✅ Found in ATLAS: ${ricardo.firstName} ${ricardo.lastName} (ID: ${ricardo.id})`);
      console.log(`   - Email: ${ricardo.contactInfo}`);
      
      // Check assignments
      const detail = await httpGet(`${ATLAS_BASE}/faculty-assignments/${ricardo.id}?schoolYearId=8`, atlasAuth);
      console.log(`   - Assignments in SY 8: ${JSON.stringify(detail.assignments, null, 2)}`);
    } else {
      console.log("❌ Not found in ATLAS (schoolId=1).");
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
