#!/usr/bin/env node

/**
 * Usage Simulator for CloudAPI Demo
 * 
 * This script simulates realistic API usage patterns to demonstrate
 * StripeMeter's real-time tracking and cost calculation capabilities.
 */

const axios = require('axios');
const { DEMO_USERS, SIMULATION_PATTERNS } = require('../src/demo-config');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

class UsageSimulator {
  constructor() {
    this.isRunning = false;
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      errors: 0,
      startTime: null
    };
  }

  async simulateUser(user, pattern = 'steady', durationMinutes = 5, intensity = 'medium') {
    console.log(`🚀 Starting ${pattern} simulation for ${user.name} (${user.plan})`);
    console.log(`   Duration: ${durationMinutes} minutes, Intensity: ${intensity}`);
    
    this.isRunning = true;
    this.stats.startTime = new Date();
    
    const endTime = Date.now() + (durationMinutes * 60 * 1000);
    const callsPerMinute = this.getCallsPerMinute(intensity);
    
    while (Date.now() < endTime && this.isRunning) {
      try {
        await this.makeSimulatedCall(user, pattern);
        this.stats.successfulCalls++;
        
        // Calculate delay based on pattern and intensity
        const delay = this.getDelay(pattern, callsPerMinute);
        await this.sleep(delay);
        
      } catch (error) {
        console.error(`❌ Error for ${user.name}:`, error.message);
        this.stats.errors++;
        await this.sleep(5000); // Wait 5s before retrying
      }
      
      this.stats.totalCalls++;
      
      // Log progress every 50 calls
      if (this.stats.totalCalls % 50 === 0) {
        this.logProgress();
      }
    }
    
    this.isRunning = false;
    this.logFinalStats(user);
  }

  async makeSimulatedCall(user, pattern) {
    const endpoints = [
      { path: '/api/data/' + Math.floor(Math.random() * 1000), method: 'GET', weight: 0.5 },
      { path: '/api/process', method: 'POST', weight: 0.3 },
      { path: '/api/bulk', method: 'POST', weight: 0.15 },
      { path: '/api/analytics', method: 'GET', weight: 0.05 }
    ];
    
    // Select endpoint based on weights
    const endpoint = this.selectWeightedEndpoint(endpoints);
    
    const options = {
      method: endpoint.method,
      url: API_BASE_URL + endpoint.path,
      headers: {
        'X-API-Key': user.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    };
    
    // Add request body for POST requests
    if (endpoint.method === 'POST') {
      if (endpoint.path === '/api/process') {
        options.data = {
          data: this.generateSampleData(),
          operation: 'simulate_' + pattern
        };
      } else if (endpoint.path === '/api/bulk') {
        const itemCount = Math.floor(Math.random() * 10) + 1;
        options.data = {
          items: Array.from({length: itemCount}, (_, i) => ({
            id: i,
            data: `simulated_item_${i}_${Date.now()}`
          })),
          operation: 'bulk_simulate'
        };
      }
    }
    
    const response = await axios(options);
    return response.data;
  }

  selectWeightedEndpoint(endpoints) {
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (const endpoint of endpoints) {
      cumulativeWeight += endpoint.weight;
      if (random <= cumulativeWeight) {
        return endpoint;
      }
    }
    
    return endpoints[0]; // Fallback
  }

  generateSampleData() {
    const samples = [
      { type: 'user_event', action: 'login', userId: Math.floor(Math.random() * 10000) },
      { type: 'api_request', endpoint: '/data', params: { limit: 10 } },
      { type: 'file_upload', size: Math.floor(Math.random() * 1000000), format: 'json' },
      { type: 'data_transform', input_rows: Math.floor(Math.random() * 1000) + 1 }
    ];
    
    return samples[Math.floor(Math.random() * samples.length)];
  }

  getCallsPerMinute(intensity) {
    switch (intensity) {
      case 'low': return 10;
      case 'medium': return 30;
      case 'high': return 60;
      case 'extreme': return 120;
      default: return 30;
    }
  }

  getDelay(pattern, callsPerMinute) {
    const baseDelay = (60 * 1000) / callsPerMinute; // Base delay in ms
    
    switch (pattern) {
      case 'steady':
        return baseDelay + (Math.random() * 1000 - 500); // ±500ms variation
        
      case 'burst':
        // 20% chance of burst (very fast), 80% chance of quiet period
        return Math.random() < 0.2 ? baseDelay * 0.1 : baseDelay * 3;
        
      case 'random':
        return Math.random() * baseDelay * 3; // 0 to 3x base delay
        
      case 'peak':
        // Simulate business hours (higher frequency during certain times)
        const hour = new Date().getHours();
        const isPeakHour = hour >= 9 && hour <= 17;
        return isPeakHour ? baseDelay * 0.7 : baseDelay * 1.5;
        
      default:
        return baseDelay;
    }
  }

  logProgress() {
    const elapsed = (Date.now() - this.stats.startTime.getTime()) / 1000;
    const rate = this.stats.totalCalls / (elapsed / 60); // calls per minute
    
    console.log(`📊 Progress: ${this.stats.totalCalls} calls (${this.stats.successfulCalls} success, ${this.stats.errors} errors) - ${rate.toFixed(1)} calls/min`);
  }

  logFinalStats(user) {
    const elapsed = (Date.now() - this.stats.startTime.getTime()) / 1000;
    const rate = this.stats.totalCalls / (elapsed / 60);
    
    console.log(`\n✅ Simulation completed for ${user.name}`);
    console.log(`   Total calls: ${this.stats.totalCalls}`);
    console.log(`   Successful: ${this.stats.successfulCalls}`);
    console.log(`   Errors: ${this.stats.errors}`);
    console.log(`   Duration: ${elapsed.toFixed(1)}s`);
    console.log(`   Average rate: ${rate.toFixed(1)} calls/min`);
    console.log(`   Success rate: ${((this.stats.successfulCalls / this.stats.totalCalls) * 100).toFixed(1)}%`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    console.log('🛑 Stopping simulation...');
    this.isRunning = false;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
🎭 CloudAPI Usage Simulator

Usage: node usage-simulator.js [options]

Options:
  --user <name>      User to simulate (alice, bob, carol) [default: alice]
  --pattern <type>   Usage pattern (steady, burst, random, peak) [default: steady]
  --duration <min>   Duration in minutes [default: 5]
  --intensity <lvl>  Intensity level (low, medium, high, extreme) [default: medium]
  --all-users        Simulate all users simultaneously
  --help             Show this help message

Examples:
  node usage-simulator.js --user bob --pattern burst --duration 10
  node usage-simulator.js --all-users --pattern steady --duration 5
  node usage-simulator.js --user carol --pattern random --intensity high
`);
    return;
  }

  const config = {
    user: args.includes('--user') ? args[args.indexOf('--user') + 1] : 'alice',
    pattern: args.includes('--pattern') ? args[args.indexOf('--pattern') + 1] : 'steady',
    duration: args.includes('--duration') ? parseInt(args[args.indexOf('--duration') + 1]) : 5,
    intensity: args.includes('--intensity') ? args[args.indexOf('--intensity') + 1] : 'medium',
    allUsers: args.includes('--all-users')
  };

  // Validate pattern
  if (!Object.keys(SIMULATION_PATTERNS).includes(config.pattern)) {
    console.error(`❌ Invalid pattern: ${config.pattern}`);
    console.error(`   Available patterns: ${Object.keys(SIMULATION_PATTERNS).join(', ')}`);
    return;
  }

  const simulator = new UsageSimulator();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    simulator.stop();
    setTimeout(() => process.exit(0), 2000);
  });

  try {
    if (config.allUsers) {
      console.log('🎭 Starting simulation for all demo users...\n');
      
      // Run simulations in parallel
      const promises = DEMO_USERS.map(user => {
        const userSimulator = new UsageSimulator();
        return userSimulator.simulateUser(user, config.pattern, config.duration, config.intensity);
      });
      
      await Promise.all(promises);
      
    } else {
      // Find the specified user
      const userMap = {
        'alice': DEMO_USERS[0],
        'bob': DEMO_USERS[1], 
        'carol': DEMO_USERS[2]
      };
      
      const user = userMap[config.user];
      if (!user) {
        console.error(`❌ Invalid user: ${config.user}`);
        console.error(`   Available users: ${Object.keys(userMap).join(', ')}`);
        return;
      }
      
      await simulator.simulateUser(user, config.pattern, config.duration, config.intensity);
    }
    
    console.log('\n🎉 All simulations completed successfully!');
    
  } catch (error) {
    console.error('💥 Simulation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = UsageSimulator;
