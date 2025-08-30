/*
 Mixed Cadence Scenario
 - Simulates a subscription containing:
   1) Monthly base plan (fixed recurring)
   2) Annual add-on (fixed recurring)
   3) Metered usage item (monthly) for api_calls
 - Demonstrates mid-cycle change (upgrade base plan) and usage accrual
 - Computes expected charges (approx) and prints a concise report
 - Optionally attempts to send usage events to StripeMeter (best-effort)
*/

const path = require('path');
const { formatISO, addDays, startOfDay, differenceInCalendarDays } = require('date-fns');

// Best-effort demo client; if not available/running, we continue locally
let StripeMeterClient;
try {
  StripeMeterClient = require('../src/stripemeter-client');
} catch (_) {
  StripeMeterClient = class { async track() {} async getProjection() { return {}; } };
}

const { DEMO_USERS } = require('../src/demo-config');

function arg(name, def) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return def;
}

function daysBetween(a, b) {
  return Math.max(0, differenceInCalendarDays(b, a));
}

function prorate(amount, numDays, totalDays) {
  if (totalDays <= 0) return 0;
  return (amount * numDays) / totalDays;
}

async function maybeTrack(stripeMeter, customerRef, ts, quantity) {
  try {
    await stripeMeter.track({
      metric: 'api_calls',
      customerRef,
      quantity,
      ts,
      meta: { scenario: 'mixed_cadence' },
    });
  } catch (_) {
    // Ignore; demo backend may not be running
  }
}

async function run() {
  const userKey = arg('user', 'alice');
  const start = arg('start', formatISO(startOfDay(new Date())));
  const days = Number(arg('days', '20'));
  const dailyCalls = Number(arg('dailyCalls', '500'));

  const userMap = Object.fromEntries(DEMO_USERS.map((u) => [u.name.split(' ')[0].toLowerCase(), u]));
  const user = userMap[userKey] || DEMO_USERS[0];
  const customerRef = user.stripeCustomerId;

  const stripeMeter = new StripeMeterClient({
    apiUrl: process.env.STRIPEMETER_API_URL || 'http://localhost:3000',
    tenantId: process.env.TENANT_ID || 'demo-tenant-001',
  });

  // Item definitions (in cents)
  const monthlyBaseBeforeUpgrade = 2900; // $29
  const monthlyBaseAfterUpgrade = 5900;  // $59
  const annualAddon = 19900;             // $199
  const monthlyIncludedApiCalls = 10000;
  const overagePerCallCents = 1;         // $0.01

  const startDate = new Date(start);
  const endDate = addDays(startDate, days);
  const daysTotal = daysBetween(startDate, endDate);

  // Scenario timeline
  const addonAttachDay = 10;  // attach annual add-on on day 10
  const upgradeDay = 15;      // upgrade base on day 15

  let totalApiCalls = 0;
  for (let d = 0; d < daysTotal; d++) {
    const when = addDays(startDate, d);
    const ts = formatISO(when);
    totalApiCalls += dailyCalls;
    await maybeTrack(stripeMeter, customerRef, ts, dailyCalls);
  }

  // Fixed recurring calculations (approx, day-level proration)
  const monthlyDays = daysTotal; // we consider the simulated window as a month-like period
  const beforeUpgradeDays = Math.max(0, Math.min(upgradeDay, daysTotal));
  const afterUpgradeDays = Math.max(0, daysTotal - beforeUpgradeDays);

  const baseProratedBefore = prorate(monthlyBaseBeforeUpgrade, beforeUpgradeDays, monthlyDays);
  const baseProratedAfter = prorate(monthlyBaseAfterUpgrade, afterUpgradeDays, monthlyDays);

  // Annual add-on proration for the simulated window
  // Assume year = 365 days; we only bill for portion within the window after attach day
  const annualDays = 365;
  const addonActiveDays = Math.max(0, daysTotal - addonAttachDay);
  const addonProrated = prorate(annualAddon, addonActiveDays, annualDays);

  // Metered usage overage
  const overageCalls = Math.max(0, totalApiCalls - monthlyIncludedApiCalls);
  const meteredCents = overageCalls * overagePerCallCents;

  const totalCents = Math.round(baseProratedBefore + baseProratedAfter + addonProrated + meteredCents);

  // Report
  console.log('\n=== Mixed Cadence Scenario Report ===');
  console.log(`User: ${user.name} (${customerRef})`);
  console.log(`Window: ${formatISO(startDate)} -> ${formatISO(endDate)} (${daysTotal} days)`);
  console.log(`Timeline: day ${addonAttachDay} attach annual add-on; day ${upgradeDay} upgrade base.`);
  console.log('');
  console.log('Fixed items (prorated cents):');
  console.log(`- Base before upgrade:  $${(baseProratedBefore / 100).toFixed(2)} (${beforeUpgradeDays}/${monthlyDays} days of $${(monthlyBaseBeforeUpgrade/100).toFixed(2)})`);
  console.log(`- Base after upgrade:   $${(baseProratedAfter / 100).toFixed(2)} (${afterUpgradeDays}/${monthlyDays} days of $${(monthlyBaseAfterUpgrade/100).toFixed(2)})`);
  console.log(`- Annual add-on:        $${(addonProrated / 100).toFixed(2)} (${addonActiveDays}/365 days of $${(annualAddon/100).toFixed(2)})`);
  console.log('');
  console.log('Metered item:');
  console.log(`- API calls: ${totalApiCalls} total; included ${monthlyIncludedApiCalls}; overage ${overageCalls} @ $0.01 = $${(meteredCents/100).toFixed(2)}`);
  console.log('');
  console.log(`Total (approx): $${(totalCents / 100).toFixed(2)}`);
  console.log('====================================\n');
}

run().catch((e) => {
  console.error('Mixed-cadence scenario failed:', e);
  process.exit(1);
});


