#!/usr/bin/env node

// Test runner for User Service
// This script provides a unified interface to run different types of tests

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIGS = {
  unit: {
    description: 'Unit tests',
    pattern: 'src/tests/**/*.test.js',
    exclude: ['integration', 'performance', 'security'],
    timeout: 10000,
    coverage: true,
    env: {
      NODE_ENV: 'test',
      RUN_INTEGRATION_TESTS: 'false',
      RUN_PERFORMANCE_TESTS: 'false',
      RUN_SECURITY_TESTS: 'false'
    }
  },
  integration: {
    description: 'Integration tests',
    pattern: 'src/tests/integration/**/*.test.js',
    timeout: 30000,
    coverage: true,
    env: {
      NODE_ENV: 'test',
      RUN_INTEGRATION_TESTS: 'true',
      RUN_PERFORMANCE_TESTS: 'false',
      RUN_SECURITY_TESTS: 'false'
    },
    setup: ['database', 'redis']
  },
  performance: {
    description: 'Performance tests',
    pattern: 'src/tests/performance/**/*.test.js',
    timeout: 120000,
    coverage: false,
    env: {
      NODE_ENV: 'test',
      RUN_INTEGRATION_TESTS: 'false',
      RUN_PERFORMANCE_TESTS: 'true',
      RUN_SECURITY_TESTS: 'false',
      PERF_CONCURRENT_USERS: '10',
      PERF_TEST_DURATION: '30000',
      PERF_MAX_RESPONSE_TIME: '1000'
    },
    setup: ['database', 'redis']
  },
  security: {
    description: 'Security tests',
    pattern: 'src/tests/security/**/*.test.js',
    timeout: 60000,
    coverage: false,
    env: {
      NODE_ENV: 'test',
      RUN_INTEGRATION_TESTS: 'false',
      RUN_PERFORMANCE_TESTS: 'false',
      RUN_SECURITY_TESTS: 'true'
    },
    setup: ['database', 'redis']
  },
  all: {
    description: 'All tests',
    pattern: 'src/tests/**/*.test.js',
    timeout: 180000,
    coverage: true,
    env: {
      NODE_ENV: 'test',
      RUN_INTEGRATION_TESTS: 'true',
      RUN_PERFORMANCE_TESTS: 'true',
      RUN_SECURITY_TESTS: 'true'
    },
    setup: ['database', 'redis']
  }
};

// CLI argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    type: 'unit',
    watch: false,
    verbose: false,
    coverage: null,
    bail: false,
    parallel: false,
    updateSnapshots: false,
    silent: false,
    setupOnly: false,
    teardownOnly: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--type':
      case '-t':
        options.type = args[++i];
        break;
      case '--watch':
      case '-w':
        options.watch = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--coverage':
      case '-c':
        options.coverage = true;
        break;
      case '--no-coverage':
        options.coverage = false;
        break;
      case '--bail':
      case '-b':
        options.bail = true;
        break;
      case '--parallel':
      case '-p':
        options.parallel = true;
        break;
      case '--update-snapshots':
      case '-u':
        options.updateSnapshots = true;
        break;
      case '--silent':
      case '-s':
        options.silent = true;
        break;
      case '--setup-only':
        options.setupOnly = true;
        break;
      case '--teardown-only':
        options.teardownOnly = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        } else {
          options.type = arg;
        }
    }
  }

  return options;
}

// Display help
function showHelp() {
  console.log(`
User Service Test Runner
`);
  console.log('Usage: node test-runner.js [options] [test-type]\n');
  
  console.log('Test Types:');
  Object.entries(TEST_CONFIGS).forEach(([type, config]) => {
    console.log(`  ${type.padEnd(12)} ${config.description}`);
  });
  
  console.log('\nOptions:');
  console.log('  -t, --type <type>        Test type to run (default: unit)');
  console.log('  -w, --watch              Watch mode');
  console.log('  -v, --verbose            Verbose output');
  console.log('  -c, --coverage           Enable coverage');
  console.log('  --no-coverage            Disable coverage');
  console.log('  -b, --bail               Stop on first failure');
  console.log('  -p, --parallel           Run tests in parallel');
  console.log('  -u, --update-snapshots   Update snapshots');
  console.log('  -s, --silent             Silent mode');
  console.log('  --setup-only             Only run setup');
  console.log('  --teardown-only          Only run teardown');
  console.log('  -h, --help               Show help');
  
  console.log('\nExamples:');
  console.log('  node test-runner.js unit');
  console.log('  node test-runner.js --type integration --coverage');
  console.log('  node test-runner.js performance --verbose');
  console.log('  node test-runner.js --watch --type unit');
  console.log('');
}

// Setup test environment
async function setupEnvironment(config) {
  console.log('🔧 Setting up test environment...');
  
  // Create necessary directories
  const dirs = ['test-results', 'coverage', 'logs/test'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
  
  // Setup database if required
  if (config.setup && config.setup.includes('database')) {
    console.log('🗄️ Setting up test database...');
    await setupDatabase();
  }
  
  // Setup Redis if required
  if (config.setup && config.setup.includes('redis')) {
    console.log('🔴 Setting up test Redis...');
    await setupRedis();
  }
  
  console.log('✅ Environment setup completed');
}

// Setup test database
async function setupDatabase() {
  try {
    // Check if Docker is available
    await runCommand('docker', ['--version'], { silent: true });
    
    // Check if PostgreSQL container is running
    const { stdout } = await runCommand('docker', ['ps', '--filter', 'name=postgres-test', '--format', '{{.Names}}'], { silent: true });
    
    if (!stdout.includes('postgres-test')) {
      console.log('🐳 Starting PostgreSQL test container...');
      await runCommand('docker', [
        'run', '-d',
        '--name', 'postgres-test',
        '-e', 'POSTGRES_DB=project5_test',
        '-e', 'POSTGRES_USER=postgres',
        '-e', 'POSTGRES_PASSWORD=password',
        '-p', '5432:5432',
        'postgres:13-alpine'
      ]);
      
      // Wait for database to be ready
      console.log('⏳ Waiting for database to be ready...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } catch (error) {
    console.warn('⚠️ Could not setup Docker PostgreSQL, using existing database');
  }
}

// Setup test Redis
async function setupRedis() {
  try {
    // Check if Docker is available
    await runCommand('docker', ['--version'], { silent: true });
    
    // Check if Redis container is running
    const { stdout } = await runCommand('docker', ['ps', '--filter', 'name=redis-test', '--format', '{{.Names}}'], { silent: true });
    
    if (!stdout.includes('redis-test')) {
      console.log('🐳 Starting Redis test container...');
      await runCommand('docker', [
        'run', '-d',
        '--name', 'redis-test',
        '-p', '6379:6379',
        'redis:6-alpine'
      ]);
      
      // Wait for Redis to be ready
      console.log('⏳ Waiting for Redis to be ready...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.warn('⚠️ Could not setup Docker Redis, using existing Redis');
  }
}

// Teardown test environment
async function teardownEnvironment() {
  console.log('🧹 Tearing down test environment...');
  
  try {
    // Stop test containers
    await runCommand('docker', ['stop', 'postgres-test'], { silent: true }).catch(() => {});
    await runCommand('docker', ['stop', 'redis-test'], { silent: true }).catch(() => {});
    await runCommand('docker', ['rm', 'postgres-test'], { silent: true }).catch(() => {});
    await runCommand('docker', ['rm', 'redis-test'], { silent: true }).catch(() => {});
  } catch (error) {
    console.warn('⚠️ Could not teardown Docker containers');
  }
  
  console.log('✅ Teardown completed');
}

// Run command with promise
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.silent ? 'pipe' : 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, ...options.env }
    });
    
    let stdout = '';
    let stderr = '';
    
    if (options.silent) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
    
    child.on('error', reject);
  });
}

// Build Jest command
function buildJestCommand(config, options) {
  const jestArgs = [];
  
  // Test pattern
  if (config.exclude) {
    // Exclude patterns for unit tests
    config.exclude.forEach(pattern => {
      jestArgs.push('--testPathIgnorePatterns', `.*/${pattern}/.*`);
    });
  } else {
    jestArgs.push('--testPathPattern', config.pattern);
  }
  
  // Coverage
  const enableCoverage = options.coverage !== null ? options.coverage : config.coverage;
  if (enableCoverage) {
    jestArgs.push('--coverage');
    jestArgs.push('--coverageDirectory', 'coverage');
  }
  
  // Other options
  if (options.watch) jestArgs.push('--watch');
  if (options.verbose) jestArgs.push('--verbose');
  if (options.bail) jestArgs.push('--bail');
  if (options.parallel) jestArgs.push('--runInBand');
  if (options.updateSnapshots) jestArgs.push('--updateSnapshot');
  if (options.silent) jestArgs.push('--silent');
  
  // Timeout
  jestArgs.push('--testTimeout', config.timeout.toString());
  
  // Force exit
  jestArgs.push('--forceExit');
  
  // Detect open handles
  jestArgs.push('--detectOpenHandles');
  
  return jestArgs;
}

// Run tests
async function runTests(config, options) {
  console.log(`🧪 Running ${config.description}...`);
  
  const jestArgs = buildJestCommand(config, options);
  const env = { ...process.env, ...config.env };
  
  // Set test start time for performance tracking
  env.TEST_START_TIME = new Date().toISOString();
  
  try {
    await runCommand('npx', ['jest', ...jestArgs], { env });
    console.log(`✅ ${config.description} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${config.description} failed:`, error.message);
    return false;
  }
}

// Generate test report
function generateTestReport() {
  console.log('📊 Generating test report...');
  
  const reportData = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    },
    results: {}
  };
  
  // Read Jest results if available
  try {
    const jestResults = fs.readFileSync('test-results/jest-results.json', 'utf8');
    reportData.jest = JSON.parse(jestResults);
  } catch (error) {
    console.warn('⚠️ Could not read Jest results');
  }
  
  // Read coverage results if available
  try {
    const coverageResults = fs.readFileSync('coverage/coverage-summary.json', 'utf8');
    reportData.coverage = JSON.parse(coverageResults);
  } catch (error) {
    console.warn('⚠️ Could not read coverage results');
  }
  
  // Save report
  try {
    fs.writeFileSync('test-results/test-report.json', JSON.stringify(reportData, null, 2));
    console.log('📄 Test report saved to test-results/test-report.json');
  } catch (error) {
    console.error('❌ Failed to save test report:', error.message);
  }
}

// Main function
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    return;
  }
  
  const config = TEST_CONFIGS[options.type];
  if (!config) {
    console.error(`❌ Unknown test type: ${options.type}`);
    console.log('Available types:', Object.keys(TEST_CONFIGS).join(', '));
    process.exit(1);
  }
  
  console.log(`🚀 Starting ${config.description}...`);
  console.log(`📋 Configuration:`, {
    type: options.type,
    pattern: config.pattern,
    timeout: config.timeout,
    coverage: options.coverage !== null ? options.coverage : config.coverage
  });
  
  try {
    // Setup only
    if (options.setupOnly) {
      await setupEnvironment(config);
      console.log('✅ Setup completed');
      return;
    }
    
    // Teardown only
    if (options.teardownOnly) {
      await teardownEnvironment();
      console.log('✅ Teardown completed');
      return;
    }
    
    // Full test run
    await setupEnvironment(config);
    
    const success = await runTests(config, options);
    
    if (!options.watch) {
      generateTestReport();
      await teardownEnvironment();
    }
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    if (!options.watch) {
      await teardownEnvironment();
    }
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  await teardownEnvironment();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...');
  await teardownEnvironment();
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  TEST_CONFIGS,
  parseArgs,
  setupEnvironment,
  teardownEnvironment,
  runTests,
  generateTestReport
};