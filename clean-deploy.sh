#!/bin/bash

# Clean Deployment Script - Removes all bolt.new and StackBlitz associations

echo "🧹 Cleaning bolt.new and StackBlitz associations..."

# Remove bolt directories and files
rm -rf .bolt/
rm -rf .netlify/
rm -f bolt.config.*
rm -f stackblitz.config.*

# Clean build artifacts
rm -rf dist/
rm -rf node_modules/

# Reinstall dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Deploy to Netlify
echo "🚀 Deploying to Netlify..."
netlify deploy --prod

echo "✅ Clean deployment complete!"
echo "🎉 All bolt.new and StackBlitz associations removed" 