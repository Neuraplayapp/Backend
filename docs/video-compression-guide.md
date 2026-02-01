# Video Compression Guide for NeuraPlay

## Current Video Files Analysis
Your current videos are quite large:
- `Neuraplayintroduction.mp4`: 51MB
- `neuraplayintrovid4.mp4`: 27MB  
- `neuraplayintrovid3.mp4`: 16MB
- `neuraplayintrovid2.mp4`: 15MB
- `neuraplayintrovid1.mp4`: 3.9MB

## Recommended Compression Settings

### For Fast Connections (5+ Mbps)
```bash
# High quality (1080p) - ~10MB target
ffmpeg -i input.mp4 -c:v libx264 -crf 18 -preset slow -c:a aac -b:a 160k -movflags +faststart output_1080p.mp4

# Medium quality (720p) - ~5MB target  
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k -movflags +faststart output_720p.mp4

# Low quality (480p) - ~2MB target
ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset fast -c:a aac -b:a 96k -movflags +faststart output_480p.mp4
```

### For Slow Connections (1-5 Mbps)
```bash
# Medium quality (720p) - ~3MB target
ffmpeg -i input.mp4 -c:v libx264 -crf 25 -preset medium -c:a aac -b:a 96k -movflags +faststart output_720p.mp4

# Low quality (480p) - ~1.5MB target
ffmpeg -i input.mp4 -c:v libx264 -crf 30 -preset fast -c:a aac -b:a 64k -movflags +faststart output_480p.mp4
```

## Batch Compression Script

Create a file called `compress-videos.bat` (Windows) or `compress-videos.sh` (Mac/Linux):

### Windows (compress-videos.bat)
```batch
@echo off
echo Starting video compression...

REM Create compressed versions directory
mkdir compressed-videos 2>nul

REM Compress each video with multiple quality levels
for %%f in (public\assets\Videos\*.mp4) do (
    echo Compressing %%f...
    
    REM High quality (1080p)
    ffmpeg -i "%%f" -c:v libx264 -crf 18 -preset slow -c:a aac -b:a 160k -movflags +faststart "compressed-videos\%%~nf_1080p.mp4"
    
    REM Medium quality (720p)
    ffmpeg -i "%%f" -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k -movflags +faststart "compressed-videos\%%~nf_720p.mp4"
    
    REM Low quality (480p)
    ffmpeg -i "%%f" -c:v libx264 -crf 28 -preset fast -c:a aac -b:a 96k -movflags +faststart "compressed-videos\%%~nf_480p.mp4"
)

echo Compression complete! Check the compressed-videos folder.
pause
```

### Mac/Linux (compress-videos.sh)
```bash
#!/bin/bash
echo "Starting video compression..."

# Create compressed versions directory
mkdir -p compressed-videos

# Compress each video with multiple quality levels
for file in public/assets/Videos/*.mp4; do
    if [ -f "$file" ]; then
        filename=$(basename "$file" .mp4)
        echo "Compressing $filename..."
        
        # High quality (1080p)
        ffmpeg -i "$file" -c:v libx264 -crf 18 -preset slow -c:a aac -b:a 160k -movflags +faststart "compressed-videos/${filename}_1080p.mp4"
        
        # Medium quality (720p)
        ffmpeg -i "$file" -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k -movflags +faststart "compressed-videos/${filename}_720p.mp4"
        
        # Low quality (480p)
        ffmpeg -i "$file" -c:v libx264 -crf 28 -preset fast -c:a aac -b:a 96k -movflags +faststart "compressed-videos/${filename}_480p.mp4"
    fi
done

echo "Compression complete! Check the compressed-videos folder."
```

## How to Use the Optimized Video Player

### Option 1: Use with Quality Variants
```tsx
import VideoPlayer from './components/VideoPlayer';

// With different quality versions
<VideoPlayer 
  src="/assets/Videos/neuraplayintrovid1_720p.mp4"
  qualityVariants={{
    high: "/assets/Videos/neuraplayintrovid1_1080p.mp4",
    medium: "/assets/Videos/neuraplayintrovid1_720p.mp4", 
    low: "/assets/Videos/neuraplayintrovid1_480p.mp4"
  }}
/>
```

### Option 2: Use with Single Optimized File
```tsx
// With a single compressed file
<VideoPlayer src="/assets/Videos/neuraplayintrovid1_720p.mp4" />
```

## Expected Results

After compression, your videos should be:
- **High quality (1080p)**: ~10-15MB (vs current 51MB)
- **Medium quality (720p)**: ~5-8MB (vs current 27MB)  
- **Low quality (480p)**: ~2-3MB (vs current 16MB)

## Installation Requirements

1. **Install FFmpeg**:
   - Windows: Download from https://ffmpeg.org/download.html
   - Mac: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`

2. **Run the compression script**:
   - Windows: Double-click `compress-videos.bat`
   - Mac/Linux: `chmod +x compress-videos.sh && ./compress-videos.sh`

## Benefits of the New Video Player

1. **Automatic Quality Detection**: Detects user's connection speed
2. **Progressive Loading**: Shows loading progress percentage
3. **Automatic Retry**: Tries lower quality if high quality fails
4. **Mobile Optimization**: Optimizes for mobile devices
5. **Connection Info Display**: Shows current connection and quality settings

## Testing Different Connection Speeds

You can test the adaptive quality by:
1. Using browser dev tools to simulate slow connections
2. Using mobile hotspot with limited bandwidth
3. Using network throttling tools

The video player will automatically adjust quality based on:
- Connection type (2G, 3G, 4G, WiFi)
- Download speed (Mbps)
- Device type (mobile vs desktop) 