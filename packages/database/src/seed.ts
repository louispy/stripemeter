import { db } from './client';
import { organisations } from './schema/organisations';
import { projects } from './schema/projects';
import { apiKeys } from './schema/api-keys';
import { orgMembers } from './schema/roles';
import { randomBytes, createHmac } from 'crypto';
import { simulationScenarios } from './schema/simulations';

async function main() {
  const orgId = cryptoRandomUuid();
  const projectId = cryptoRandomUuid();

  await db.insert(organisations).values({ id: orgId, name: 'Acme Inc', slug: 'acme' }).onConflictDoNothing();
  await db.insert(projects).values({ id: projectId, organisationId: orgId, name: 'Acme Default', slug: 'default' }).onConflictDoNothing();

  // Demo API key generation
  const { apiKey, prefix, last4, secretHash } = generateApiKeyHash('sm_demo');
  await db.insert(apiKeys).values({ organisationId: orgId, projectId, name: 'Default Key', prefix, lastFour: last4, secretHash }).onConflictDoNothing();

  // Demo org member
  await db.insert(orgMembers).values({ organisationId: orgId, userId: cryptoRandomUuid(), role: 'owner' }).onConflictDoNothing();

  // Seed a minimal simulation scenario for the demo project/tenant
  await db.insert(simulationScenarios).values({
    tenantId: projectId,
    name: 'Demo Tiered Pricing',
    description: 'Seeded demo scenario',
    version: '1',
    tags: ['demo'],
    model: { model: 'tiered', currency: 'USD', tiers: [{ upTo: 1000, unitPrice: 0.1 }, { upTo: null, unitPrice: 0.05 }] },
    inputs: {
      customerId: 'demo_customer',
      periodStart: '2024-01-01',
      periodEnd: '2024-01-31',
      usageItems: [
        { metric: 'api_calls', quantity: 3500, priceConfig: { model: 'tiered', currency: 'USD', tiers: [{ upTo: 1000, unitPrice: 0.1 }, { upTo: null, unitPrice: 0.05 }] } },
      ],
      commitments: [],
      credits: [],
      taxRate: 0,
    },
    expected: { total: 260.0, subtotal: 260.0, tax: 0 },
    tolerances: { absolute: 0.01, relative: 0.001 },
    active: true,
    createdBy: 'seed',
    updatedBy: 'seed',
  }).onConflictDoNothing();

  console.log('Seed complete. Demo API key:', apiKey);
}

function cryptoRandomUuid(): string {
  // Simple RFC4122 v4 UUID from Node 18+ crypto
  const buf = randomBytes(16);
  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;
  const hex = buf.toString('hex');
  return (
    hex.substring(0, 8) + '-' +
    hex.substring(8, 12) + '-' +
    hex.substring(12, 16) + '-' +
    hex.substring(16, 20) + '-' +
    hex.substring(20)
  );
}

function generateApiKeyHash(prefixBase: string) {
  const prefix = `${prefixBase}_${randomBytes(3).toString('hex')}`;
  const secret = randomBytes(24).toString('base64url');
  const apiKey = `${prefix}.${secret}`;
  const last4 = secret.slice(-4);
  const secretHash = createHmac('sha256', getKeyDerivationSalt())
    .update(apiKey)
    .digest('base64url');
  return { apiKey, prefix, last4, secretHash };
}

function getKeyDerivationSalt(): string {
  return process.env.API_KEY_SALT || 'dev-api-key-salt';
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });


