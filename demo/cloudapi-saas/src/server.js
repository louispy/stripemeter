const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const StripeMeterClient = require('./stripemeter-client');
const { DEMO_USERS, PRICING_PLANS } = require('./demo-config');

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize StripeMeter client
const stripeMeter = new StripeMeterClient({
  apiUrl: process.env.STRIPEMETER_API_URL || 'http://localhost:3000',
  tenantId: process.env.TENANT_ID || 'demo-tenant-001'
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting (demo purposes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// In-memory dunning state per customer for demo purposes
// States: active -> past_due -> email_sent -> retry_scheduled -> blocked -> recovered
const dunningStateByCustomer = new Map();

function getUserCustomerRef(user) {
  return user?.stripeCustomerId;
}

async function recordDunningEvent(user, stage) {
  try {
    await stripeMeter.track({
      metric: 'billing_event',
      customerRef: getUserCustomerRef(user),
      quantity: 1,
      meta: { type: 'dunning', stage },
    });
  } catch (err) {
    console.error('Failed to record dunning event', stage, err?.message);
  }
}

// Guard requests based on dunning state
const dunningGuard = (req, res, next) => {
  // Always allow Dunning Lab endpoints themselves
  if (req.path && req.path.startsWith('/demo/dunning')) {
    return next();
  }
  const customerRef = getUserCustomerRef(req.user);
  const state = dunningStateByCustomer.get(customerRef)?.state || 'active';

  // Expose current state to clients for demo visibility
  res.setHeader('X-Dunning-State', state);

  if (state === 'blocked') {
    return res.status(402).json({
      error: 'Payment Required',
      message: 'Account is temporarily blocked due to failed payment. Please update payment method.',
      dunning: { state },
    });
  }

  if (state === 'past_due' || state === 'email_sent' || state === 'retry_scheduled') {
    res.setHeader('X-Dunning-Warning', 'true');
  }

  return next();
};

// Demo authentication middleware
const authenticateDemo = (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const user = DEMO_USERS.find(u => u.apiKey === apiKey);
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.user = user;
  next();
};

// Usage tracking middleware
const trackUsage = async (req, res, next) => {
  const startTime = Date.now();
  
  // Track API call
  try {
    await stripeMeter.track({
      metric: 'api_calls',
      customerRef: req.user.stripeCustomerId,
      quantity: 1,
      meta: {
        endpoint: req.path,
        method: req.method,
        user_agent: req.get('User-Agent'),
        plan: req.user.plan
      }
    });
  } catch (error) {
    console.error('Usage tracking error:', error);
    // Don't fail the request if tracking fails
  }

  // Track response time and data
  res.on('finish', async () => {
    const responseTime = Date.now() - startTime;
    const dataProcessed = (req.get('content-length') || 0) + (res.get('content-length') || 0);
    
    try {
      // Track compute time (in milliseconds)
      if (responseTime > 0) {
        await stripeMeter.track({
          metric: 'compute_time',
          customerRef: req.user.stripeCustomerId,
          quantity: responseTime,
          meta: {
            endpoint: req.path,
            response_code: res.statusCode
          }
        });
      }

      // Track data processed (in bytes)
      if (dataProcessed > 0) {
        await stripeMeter.track({
          metric: 'data_processed',
          customerRef: req.user.stripeCustomerId,
          quantity: Math.ceil(dataProcessed / 1024), // Convert to KB
          meta: {
            endpoint: req.path
          }
        });
      }
    } catch (error) {
      console.error('Additional usage tracking error:', error);
    }
  });

  next();
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'CloudAPI Demo',
    timestamp: new Date().toISOString()
  });
});

// Demo API endpoints (require authentication, dunning guard, and track usage)
app.use('/api', authenticateDemo, dunningGuard, trackUsage);

// Get user info and current usage
app.get('/api/user', async (req, res) => {
  try {
    const usage = await stripeMeter.getUsage(req.user.stripeCustomerId);
    const projection = await stripeMeter.getProjection(req.user.stripeCustomerId);
    
    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        plan: req.user.plan,
        stripeCustomerId: req.user.stripeCustomerId
      },
      usage,
      projection,
      plan: PRICING_PLANS[req.user.plan]
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Simulate different types of API operations

// Simple data retrieval
app.get('/api/data/:id', async (req, res) => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
  
  res.json({
    id: req.params.id,
    data: `Sample data for ID ${req.params.id}`,
    timestamp: new Date().toISOString(),
    processing_time: Math.random() * 100 + 50
  });
});

// Data processing endpoint (higher compute cost)
app.post('/api/process', async (req, res) => {
  const { data, operation = 'transform' } = req.body;
  
  // Simulate heavier processing
  const processingTime = Math.random() * 500 + 200;
  await new Promise(resolve => setTimeout(resolve, processingTime));
  
  res.json({
    operation,
    input_size: JSON.stringify(data).length,
    output: `Processed: ${JSON.stringify(data)}`,
    processing_time: processingTime,
    timestamp: new Date().toISOString()
  });
});

// Bulk operations endpoint
app.post('/api/bulk', async (req, res) => {
  const { items = [], operation = 'bulk_process' } = req.body;
  const count = items.length || 1;
  
  // Track bulk operation as multiple API calls
  try {
    if (count > 1) {
      await stripeMeter.track({
        metric: 'api_calls',
        customerRef: req.user.stripeCustomerId,
        quantity: count - 1, // -1 because the main call is already tracked
        meta: {
          endpoint: '/api/bulk',
          operation: 'bulk_additional_calls',
          bulk_size: count
        }
      });
    }
  } catch (error) {
    console.error('Bulk usage tracking error:', error);
  }
  
  // Simulate processing time proportional to items
  const processingTime = count * (Math.random() * 50 + 25);
  await new Promise(resolve => setTimeout(resolve, Math.min(processingTime, 2000)));
  
  res.json({
    operation,
    items_processed: count,
    processing_time: processingTime,
    results: items.map((item, index) => ({
      id: index,
      input: item,
      output: `Processed: ${JSON.stringify(item)}`
    })),
    timestamp: new Date().toISOString()
  });
});

// Analytics endpoint (premium feature)
app.get('/api/analytics', async (req, res) => {
  if (req.user.plan === 'free') {
    return res.status(403).json({ 
      error: 'Analytics requires Pro or Enterprise plan',
      upgrade_url: '/upgrade'
    });
  }
  
  // Simulate analytics processing
  await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100));
  
  res.json({
    analytics: {
      total_requests: Math.floor(Math.random() * 10000) + 1000,
      avg_response_time: Math.random() * 200 + 50,
      error_rate: Math.random() * 0.05,
      top_endpoints: [
        { endpoint: '/api/data', requests: Math.floor(Math.random() * 5000) + 500 },
        { endpoint: '/api/process', requests: Math.floor(Math.random() * 2000) + 200 },
        { endpoint: '/api/bulk', requests: Math.floor(Math.random() * 1000) + 100 }
      ]
    },
    timestamp: new Date().toISOString()
  });
});

// Usage simulation endpoint (for demo purposes)
app.post('/api/demo/simulate-usage', async (req, res) => {
  const { pattern = 'steady', duration = 60, intensity = 'medium' } = req.body;
  
  res.json({
    message: 'Usage simulation started',
    pattern,
    duration,
    intensity,
    estimated_calls: intensity === 'low' ? duration : intensity === 'medium' ? duration * 2 : duration * 5
  });
  
  // Run simulation in background
  simulateUsage(req.user, pattern, duration, intensity);
});

// Dunning Lab endpoints (for demo purposes)
app.post('/api/demo/dunning/start', async (req, res) => {
  const { speedSeconds = 3 } = req.body || {};
  const user = req.user;
  const customerRef = getUserCustomerRef(user);

  // Initialize state machine
  const now = new Date();
  const state = {
    state: 'past_due',
    history: [{ state: 'past_due', at: now.toISOString() }],
    startedAt: now.toISOString(),
    speedSeconds,
  };
  dunningStateByCustomer.set(customerRef, state);
  await recordDunningEvent(user, 'past_due');

  // Schedule email notification
  setTimeout(async () => {
    const s = dunningStateByCustomer.get(customerRef);
    if (!s || s.state === 'recovered') return;
    s.state = 'email_sent';
    s.history.push({ state: 'email_sent', at: new Date().toISOString() });
    await recordDunningEvent(user, 'email_sent');
  }, speedSeconds * 1000);

  // Schedule retry
  setTimeout(async () => {
    const s = dunningStateByCustomer.get(customerRef);
    if (!s || s.state === 'recovered') return;
    s.state = 'retry_scheduled';
    s.history.push({ state: 'retry_scheduled', at: new Date().toISOString() });
    await recordDunningEvent(user, 'retry_scheduled');
  }, speedSeconds * 2000);

  // Schedule block (hard cap) after failed retry
  setTimeout(async () => {
    const s = dunningStateByCustomer.get(customerRef);
    if (!s || s.state === 'recovered') return;
    s.state = 'blocked';
    s.history.push({ state: 'blocked', at: new Date().toISOString() });
    await recordDunningEvent(user, 'blocked');
  }, speedSeconds * 3000);

  res.json({
    message: 'Dunning scenario started',
    customerRef,
    speedSeconds,
    nextStages: ['email_sent', 'retry_scheduled', 'blocked'],
  });
});

app.post('/api/demo/dunning/resolve', async (req, res) => {
  const user = req.user;
  const customerRef = getUserCustomerRef(user);
  const s = dunningStateByCustomer.get(customerRef);
  const now = new Date();
  if (!s) {
    dunningStateByCustomer.set(customerRef, {
      state: 'recovered',
      history: [{ state: 'recovered', at: now.toISOString() }],
      startedAt: now.toISOString(),
      speedSeconds: 0,
    });
  } else {
    s.state = 'recovered';
    s.history.push({ state: 'recovered', at: now.toISOString() });
  }
  await recordDunningEvent(user, 'recovered');
  res.json({ message: 'Account recovered', customerRef });
});

app.get('/api/demo/dunning/status', (req, res) => {
  const customerRef = getUserCustomerRef(req.user);
  const s = dunningStateByCustomer.get(customerRef) || { state: 'active', history: [] };
  res.json({ customerRef, ...s });
});

// Background usage simulation
async function simulateUsage(user, pattern, duration, intensity) {
  const callsPerSecond = intensity === 'low' ? 1 : intensity === 'medium' ? 2 : 5;
  const totalCalls = duration * callsPerSecond;
  
  console.log(`Starting ${pattern} usage simulation for ${user.name}: ${totalCalls} calls over ${duration}s`);
  
  for (let i = 0; i < totalCalls; i++) {
    try {
      await stripeMeter.track({
        metric: 'api_calls',
        customerRef: user.stripeCustomerId,
        quantity: 1,
        meta: {
          endpoint: '/api/simulated',
          pattern,
          simulation: true,
          batch: Math.floor(i / callsPerSecond)
        }
      });
      
      // Vary delay based on pattern
      let delay = 1000 / callsPerSecond;
      if (pattern === 'burst') {
        delay = i % 10 < 3 ? 100 : 2000; // 3 quick calls, then pause
      } else if (pattern === 'random') {
        delay = Math.random() * 2000 + 500;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      console.error('Simulation tracking error:', error);
    }
  }
  
  console.log(`Completed usage simulation for ${user.name}`);
}

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 CloudAPI Demo Server running on http://localhost:${PORT}`);
  console.log(`📊 StripeMeter API: ${process.env.STRIPEMETER_API_URL || 'http://localhost:3000'}`);
  console.log(`🏢 Tenant ID: ${process.env.TENANT_ID || 'demo-tenant-001'}`);
  console.log(`\n📖 API Documentation:`);
  console.log(`   GET  /health                    - Health check`);
  console.log(`   GET  /api/user                  - User info & usage`);
  console.log(`   GET  /api/data/:id              - Get data by ID`);
  console.log(`   POST /api/process               - Process data`);
  console.log(`   POST /api/bulk                  - Bulk operations`);
  console.log(`   GET  /api/analytics             - Analytics (Pro+)`);
  console.log(`   POST /api/demo/simulate-usage   - Simulate usage`);
  console.log(`\n🔑 Demo API Keys:`);
  DEMO_USERS.forEach(user => {
    console.log(`   ${user.name} (${user.plan}): ${user.apiKey}`);
  });
});
