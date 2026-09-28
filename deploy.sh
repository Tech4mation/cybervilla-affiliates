#!/bin/bash

# Deployment script for cybervilla-affiliates (Next.js frontend)
# Run this on the server: 102.209.224.36

set -e

echo "=== Deploying cybervilla-affiliates (Frontend) ==="

# Configuration
APP_DIR="/home/odooaffiliate/cybervilla-affiliates"
SERVICE_NAME="cybervilla-frontend"
NODE_VERSION="20"

# Create app directory if it doesn't exist
sudo mkdir -p $APP_DIR
sudo chown odooaffiliate:odooaffiliate $APP_DIR

# Copy files (you'll need to upload the code first)
echo "Make sure code is uploaded to $APP_DIR"

# Navigate to app directory
cd $APP_DIR

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Check if .env.local exists, if not create from example
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local from .env.example"
    cp .env.example .env.local
    echo "IMPORTANT: Update NEXT_PUBLIC_API_URL in $APP_DIR/.env.local to point to your backend"
    echo "Example: NEXT_PUBLIC_API_URL=http://your-domain.com/api"
fi

# Build the application
echo "Building Next.js application..."
npm run build

# Stop existing PM2 process if running
pm2 stop $SERVICE_NAME 2>/dev/null || true
pm2 delete $SERVICE_NAME 2>/dev/null || true

# Start with PM2
echo "Starting application with PM2..."
pm2 start npm --name $SERVICE_NAME -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot (if not already done)
pm2 startup | tail -n 1

echo "=== Frontend deployment complete ==="
echo "Frontend running on port 3000"
echo "Check status: pm2 status"
echo "View logs: pm2 logs $SERVICE_NAME"
