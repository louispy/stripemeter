#!/usr/bin/env node

/**
 * Simple API test script without database dependencies
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

async function testAPI() {
  try {
    console.log('🧪 Testing Stripemeter API...\n');

    // Test health endpoint
    console.log('1. Testing health endpoint...');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/health`);
      console.log('✅ Health check:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
    }

    // Test API documentation
    console.log('\n2. Testing API documentation...');
    try {
      const docsResponse = await axios.get(`${API_BASE_URL}/docs/json`);
      console.log('✅ API docs available, endpoints:', Object.keys(docsResponse.data.paths || {}).length);
    } catch (error) {
      console.log('❌ API docs failed:', error.message);
    }

    // Test event ingestion (will fail without DB, but tests endpoint)
    console.log('\n3. Testing event ingestion endpoint...');
    try {
      const eventResponse = await axios.post(`${API_BASE_URL}/v1/events/ingest`, {
        events: [{
          tenantId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
          metric: 'api_calls',
          customerRef: 'cus_TEST001',
          quantity: 100,
          ts: new Date().toISOString(),
          meta: { test: true }
        }]
      });
      console.log('✅ Event ingestion response:', eventResponse.data);
    } catch (error) {
      if (error.response) {
        console.log('⚠️  Event ingestion failed (expected without DB):', error.response.status, error.response.statusText);
      } else {
        console.log('❌ Event ingestion failed:', error.message);
      }
    }

    console.log('\n🎉 API test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  testAPI();
}

export { testAPI };
