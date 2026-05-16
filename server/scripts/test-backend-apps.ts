import 'dotenv/config';
import http from 'http';

async function testBackend() {
  const token = process.env.TEST_REGISTRAR_TOKEN; // I might not have this
  if (!token) {
    console.log('No TEST_REGISTRAR_TOKEN found in .env. Skipping backend test.');
    return;
  }

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/registrar/applications?limit=500',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (d) => body += d);
    res.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('Backend Response Meta:', data.meta);
        console.log('Applications count:', data.applications?.length);
      } catch (e) {
        console.log('Error parsing response:', body);
      }
    });
  });
  req.on('error', (e) => console.error(e));
  req.end();
}

testBackend();
