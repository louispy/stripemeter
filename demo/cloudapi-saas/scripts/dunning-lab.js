/*
 Dunning Lab: end-to-end demo of failed payment lifecycle
 Stages: past_due -> email_sent -> retry_scheduled -> blocked -> recovered
*/

const axios = require('axios');

const API_BASE_URL = process.env.CLOUDAPI_URL || 'http://localhost:4000';
const DEMO_KEYS = {
  alice: 'demo_free_alice_12345',
  bob: 'demo_pro_bob_67890',
  carol: 'demo_ent_carol_abcdef',
};

function arg(name, def) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return def;
}

async function call(path, method = 'GET', apiKey, data) {
  const res = await axios({
    method,
    url: API_BASE_URL + path,
    data,
    validateStatus: () => true,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });
  return res;
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const user = arg('user', 'alice');
  const speed = Number(arg('speed', '1')); // seconds per stage
  const apiKey = DEMO_KEYS[user];
  if (!apiKey) {
    console.error(`Unknown user ${user}. Use one of: ${Object.keys(DEMO_KEYS).join(', ')}`);
    process.exit(1);
  }

  console.log(`Using demo user: ${user}`);
  console.log(`Stage cadence: ${speed}s per transition`);

  // Baseline: a normal API call should succeed
  let res = await call('/api/data/123', 'GET', apiKey);
  if (res.status !== 200) {
    console.error(`Baseline API call failed: ${res.status}`);
    process.exit(1);
  }
  console.log(' Baseline API call OK');

  // Start dunning
  res = await call('/api/demo/dunning/start', 'POST', apiKey, { speedSeconds: speed });
  if (res.status !== 200) {
    console.error(`Failed to start dunning: ${res.status}`);
    process.exit(1);
  }
  console.log('Dunning started');

  // Poll through stages and exercise behavior
  const expected = ['past_due', 'email_sent', 'retry_scheduled', 'blocked'];
  let observed = [];
  const deadline = Date.now() + speed * 1000 * 60; // generous

  while (Date.now() < deadline && observed.length < expected.length) {
    const s = await call('/api/demo/dunning/status', 'GET', apiKey);
    if (s.status !== 200) {
      console.error(`Failed to fetch status: ${s.status}`);
      process.exit(1);
    }
    const state = s.data.state;
    if (observed[observed.length - 1] !== state && expected.includes(state)) {
      observed.push(state);
      console.log(`State → ${state}`);

      // Make an API call at each stage to see headers/behavior
      const api = await call('/api/data/abc', 'GET', apiKey);
      if (state === 'blocked') {
        if (api.status !== 402) {
          console.error(`Expected 402 when blocked, got ${api.status}`);
          process.exit(1);
        }
        console.log('Blocked state enforced (402 Payment Required)');
      } else {
        if (api.status !== 200) {
          console.error(`Expected 200 before block, got ${api.status}`);
          process.exit(1);
        }
        if (!api.headers['x-dunning-warning'] && (state === 'past_due' || state === 'email_sent' || state === 'retry_scheduled')) {
          console.error('Expected X-Dunning-Warning header before block');
          process.exit(1);
        }
        console.log('Warning header present and request allowed');
      }
    }
    await wait(250);
  }

  // Ensure we reached blocked
  if (observed[observed.length - 1] !== 'blocked') {
    console.error(`Did not reach blocked state. Observed: ${observed.join(' -> ')}`);
    process.exit(1);
  }

  // Resolve
  const r = await call('/api/demo/dunning/resolve', 'POST', apiKey, {});
  if (r.status !== 200) {
    console.error(`Failed to resolve: ${r.status}`);
    process.exit(1);
  }
  console.log('Resolved to recovered');

  // Call should succeed now
  res = await call('/api/data/xyz', 'GET', apiKey);
  if (res.status !== 200) {
    console.error(`Expected 200 after recovery, got ${res.status}`);
    process.exit(1);
  }
  console.log(' Post-recovery API call OK');

  console.log('\nDunning Lab verified successfully');
}

run().catch((e) => {
  console.error('Dunning Lab failed:', e.message);
  process.exit(1);
});


