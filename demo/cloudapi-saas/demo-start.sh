#!/bin/bash

# CloudAPI Demo Startup Script
# This script starts all components needed for the StripeMeter demo

echo "🚀 Starting CloudAPI Demo - StripeMeter Showcase"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the demo/cloudapi-saas directory"
    exit 1
fi

# Check if StripeMeter is running
echo "📡 Checking StripeMeter backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ StripeMeter backend is running"
else
    echo "⚠️  StripeMeter backend not detected at http://localhost:3000"
    echo "   Please start StripeMeter first:"
    echo "   cd ../../ && docker compose up -d && pnpm dev"
    echo ""
    echo "   Or continue anyway to see the demo with mock data..."
    read -p "   Continue with mock data? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create .env from example if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
fi

# Start the demo server in background
echo "🖥️  Starting CloudAPI demo server..."
npm run dev &
DEMO_PID=$!

# Wait for demo server to start
echo "⏳ Waiting for demo server to start..."
sleep 3

# Check if demo server is running
if curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo "✅ CloudAPI demo server is running"
else
    echo "❌ Failed to start demo server"
    kill $DEMO_PID 2>/dev/null
    exit 1
fi

# Start customer dashboard
echo "🎛️  Starting customer dashboard..."
cd customer-dashboard
python3 -m http.server 3001 > /dev/null 2>&1 &
DASHBOARD_PID=$!
cd ..

# Wait for dashboard to start
sleep 2

echo ""
echo "🎉 Demo is ready! Open these URLs:"
echo "=================================="
echo "📊 Customer Dashboard:  http://localhost:3001"
echo "🔧 CloudAPI Server:     http://localhost:4000"
echo "📡 StripeMeter Admin:    http://localhost:3000 (if running)"
echo ""
echo "🔑 Demo API Keys:"
echo "=================="
echo "Alice (Free):       demo_free_alice_12345"
echo "Bob (Pro):          demo_pro_bob_67890" 
echo "Carol (Enterprise): demo_ent_carol_abcdef"
echo ""
echo "🎮 Try these demo scenarios:"
echo "============================"
echo "1. Open the Customer Dashboard and switch between users"
echo "2. Click API endpoints to make calls and watch usage update"
echo "3. Try the usage simulators (Steady, Burst, Random)"
echo "4. Watch real-time cost calculations and billing transparency"
echo ""
echo "💡 Pro tip: Open browser dev tools to see API calls in action!"
echo ""
echo "Press Ctrl+C to stop all demo services..."

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping demo services..."
    kill $DEMO_PID 2>/dev/null
    kill $DASHBOARD_PID 2>/dev/null
    echo "✅ Demo stopped. Thank you for trying StripeMeter!"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep script running
wait
