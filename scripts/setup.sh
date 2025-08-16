#!/bin/bash

# StripeMeter Setup Script
# This script sets up the development environment for StripeMeter

set -e

echo "🚀 Setting up StripeMeter development environment..."

# Check prerequisites
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    fi
}

echo "📋 Checking prerequisites..."
check_command node
check_command pnpm
check_command docker
check_command docker-compose

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version 20 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ All prerequisites met!"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Setup environment file
if [ ! -f .env ]; then
    echo "🔧 Creating .env file..."
    cat > .env << EOF
# Database
DATABASE_URL=postgresql://stripemeter:stripemeter_dev@localhost:5432/stripemeter
REDIS_URL=redis://localhost:6379

# Stripe (Replace with your keys)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key

# API Configuration
API_PORT=3000
API_HOST=0.0.0.0
API_CORS_ORIGIN=http://localhost:3001,http://localhost:3002

# Worker Configuration
WORKER_CONCURRENCY=5
AGGREGATION_INTERVAL_MS=5000
STRIPE_WRITER_INTERVAL_MS=10000
RECONCILIATION_INTERVAL_MS=3600000

# Security
JWT_SECRET=dev-jwt-secret-$(openssl rand -hex 16)
ENCRYPTION_KEY=$(openssl rand -hex 16)

# Monitoring
LOG_LEVEL=debug
SENTRY_DSN=
PROMETHEUS_PORT=9090

# Environment
NODE_ENV=development
EOF
    echo "⚠️  Please update .env with your Stripe API keys"
else
    echo "✅ .env file already exists"
fi

# Start Docker services
echo "🐳 Starting Docker services..."
docker compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if PostgreSQL is ready
until docker compose exec -T postgres pg_isready -U stripemeter > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done
echo "✅ PostgreSQL is ready"

# Check if Redis is ready
until docker compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    echo "Waiting for Redis..."
    sleep 2
done
echo "✅ Redis is ready"

# Build packages
echo "🔨 Building packages..."
pnpm build

# Run database migrations
echo "🗄️ Running database migrations..."
cd packages/database
pnpm generate
pnpm migrate
cd ../..

echo "✨ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "1. Update .env with your Stripe API keys"
echo "2. Run 'pnpm dev' to start the development servers"
echo "3. Visit http://localhost:3000/docs for API documentation"
echo ""
echo "🎉 Happy coding!"
