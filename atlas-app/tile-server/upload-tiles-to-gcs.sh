#!/bin/bash

# Script to upload high-zoom tiles to Google Cloud Storage
# This allows us to keep the Docker image small while still serving all tiles

set -e

# Configuration
BUCKET_NAME=${1:-"your-tile-bucket"}
PROJECT_ID=${2:-"your-project-id"}

echo "🚀 Uploading high-zoom tiles to Google Cloud Storage..."
echo "Bucket: $BUCKET_NAME"
echo "Project: $PROJECT_ID"

# Check if gsutil is available
if ! command -v gsutil &> /dev/null; then
    echo "❌ gsutil is not installed. Please install Google Cloud SDK first."
    exit 1
fi

# Create bucket if it doesn't exist
echo "📦 Creating bucket if it doesn't exist..."
gsutil mb -p $PROJECT_ID gs://$BUCKET_NAME/ 2>/dev/null || echo "Bucket already exists"

# Upload high-zoom tiles (7-14) to Cloud Storage
echo "📤 Uploading high-zoom tiles (zoom levels 7-14)..."

# Upload each layer's high-zoom tiles
for layer in "Water Stress" "Riverine flood risk" "Coastal flood risk"; do
    echo "Uploading $layer high-zoom tiles..."
    
    # Upload zoom levels 7-14
    for zoom in 7 8 9 10 11 12 13 14; do
        if [ -d "layers/$layer/$layer/$zoom" ]; then
            echo "  Uploading zoom level $zoom..."
            gsutil -m cp -r "layers/$layer/$layer/$zoom" "gs://$BUCKET_NAME/tiles/$layer/$layer/"
        fi
    done
done

echo "✅ High-zoom tiles uploaded successfully!"
echo ""
echo "Next steps:"
echo "1. Update your tile server to serve from Cloud Storage for high-zoom levels"
echo "2. Deploy the optimized container (now much smaller)"
echo "3. Test the deployment"
