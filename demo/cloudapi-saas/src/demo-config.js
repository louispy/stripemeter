// Demo configuration for CloudAPI showcase

const DEMO_USERS = [
  {
    id: 'user-001',
    name: 'Alice Johnson',
    email: 'alice@startup.com',
    plan: 'free',
    apiKey: 'demo_free_alice_12345',
    stripeCustomerId: 'cus_demo_alice'
  },
  {
    id: 'user-002', 
    name: 'Bob Smith',
    email: 'bob@company.com',
    plan: 'pro',
    apiKey: 'demo_pro_bob_67890',
    stripeCustomerId: 'cus_demo_bob'
  },
  {
    id: 'user-003',
    name: 'Carol Enterprise',
    email: 'carol@enterprise.com', 
    plan: 'enterprise',
    apiKey: 'demo_ent_carol_abcdef',
    stripeCustomerId: 'cus_demo_carol'
  }
];

const PRICING_PLANS = {
  free: {
    name: 'Free Plan',
    price: 0,
    currency: 'usd',
    limits: {
      api_calls: 1000,
      data_processed: 100, // MB
      compute_time: 60000, // 1 minute in milliseconds
      storage: 100 // MB
    },
    features: [
      'Up to 1,000 API calls/month',
      'Basic support',
      'Community access'
    ],
    pricing: {
      api_calls: { included: 1000, overage: 0.02 },
      data_processed: { included: 100, overage: 0.10 }, // per MB
      compute_time: { included: 60000, overage: 0.001 }, // per second
      storage: { included: 100, overage: 0.05 } // per MB
    }
  },
  
  pro: {
    name: 'Pro Plan',
    price: 2900, // $29.00 in cents
    currency: 'usd',
    limits: {
      api_calls: 10000,
      data_processed: 1000, // MB  
      compute_time: 600000, // 10 minutes
      storage: 1000 // MB
    },
    features: [
      'Up to 10,000 API calls/month',
      'Priority support',
      'Advanced analytics',
      'Usage alerts'
    ],
    pricing: {
      api_calls: { included: 10000, overage: 0.01 },
      data_processed: { included: 1000, overage: 0.08 },
      compute_time: { included: 600000, overage: 0.0008 },
      storage: { included: 1000, overage: 0.04 }
    }
  },
  
  enterprise: {
    name: 'Enterprise Plan',
    price: 29900, // $299.00 in cents
    currency: 'usd', 
    limits: {
      api_calls: 100000,
      data_processed: 10000, // MB
      compute_time: 3600000, // 1 hour
      storage: 10000 // MB
    },
    features: [
      'Up to 100,000 API calls/month',
      'Dedicated support',
      'Custom integrations',
      'Advanced security',
      'SLA guarantee'
    ],
    pricing: {
      api_calls: { 
        included: 100000, 
        tiers: [
          { upTo: 500000, unitAmount: 0.008 },
          { upTo: 1000000, unitAmount: 0.006 },
          { upTo: null, unitAmount: 0.004 }
        ]
      },
      data_processed: { 
        included: 10000, 
        tiers: [
          { upTo: 50000, unitAmount: 0.06 },
          { upTo: 100000, unitAmount: 0.04 },
          { upTo: null, unitAmount: 0.03 }
        ]
      },
      compute_time: { included: 3600000, overage: 0.0005 },
      storage: { included: 10000, overage: 0.02 }
    }
  }
};

// Sample API endpoints for demo
const DEMO_ENDPOINTS = [
  {
    path: '/api/data/:id',
    method: 'GET',
    description: 'Retrieve data by ID',
    avgResponseTime: 75,
    avgDataSize: 512
  },
  {
    path: '/api/process',
    method: 'POST', 
    description: 'Process data transformation',
    avgResponseTime: 350,
    avgDataSize: 1024
  },
  {
    path: '/api/bulk',
    method: 'POST',
    description: 'Bulk operations',
    avgResponseTime: 1200,
    avgDataSize: 4096
  },
  {
    path: '/api/analytics',
    method: 'GET',
    description: 'Usage analytics (Pro+)',
    avgResponseTime: 200,
    avgDataSize: 2048
  }
];

// Usage simulation patterns
const SIMULATION_PATTERNS = {
  steady: {
    name: 'Steady Traffic',
    description: 'Consistent API calls over time',
    variability: 0.2
  },
  burst: {
    name: 'Burst Traffic', 
    description: 'Periods of high activity followed by quiet periods',
    variability: 0.8
  },
  random: {
    name: 'Random Traffic',
    description: 'Unpredictable usage patterns',
    variability: 1.0
  },
  peak: {
    name: 'Peak Hours',
    description: 'Higher usage during business hours',
    variability: 0.4
  }
};

module.exports = {
  DEMO_USERS,
  PRICING_PLANS,
  DEMO_ENDPOINTS,
  SIMULATION_PATTERNS
};
