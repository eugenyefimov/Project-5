// Health check script for Docker container
// Used by Docker HEALTHCHECK instruction

const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 8000,
  path: '/health',
  method: 'GET',
  timeout: 2000
};

const healthCheck = http.request(options, (res) => {
  console.log(`HEALTHCHECK: Status ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

healthCheck.on('error', (err) => {
  console.error('HEALTHCHECK: Error', err.message);
  process.exit(1);
});

healthCheck.on('timeout', () => {
  console.error('HEALTHCHECK: Timeout');
  healthCheck.destroy();
  process.exit(1);
});

healthCheck.end();
