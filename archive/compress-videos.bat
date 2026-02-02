@echo off
echo ========================================
echo NeuraPlay Video Compression Tool
echo ========================================
echo.

REM Check if ffmpeg is installed
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: FFmpeg is not installed or not in PATH
    echo Please install FFmpeg from https://ffmpeg.org/download.html
    echo.
    pause
    exit /b 1
)

echo FFmpeg found! Starting compression...
echo.

REM Create compressed versions directory
if not exist "compressed-videos" (
    mkdir "compressed-videos"
    echo Created compressed-videos directory
)

echo Starting video compression...
echo This will create multiple quality versions of each video.
echo.

REM Compress each video with multiple quality levels
for %%f in (public\assets\Videos\*.mp4) do (
    echo ========================================
    echo Compressing: %%~nxf
    echo ========================================
    
    REM High quality (1080p) - ~10-15MB target
    echo Creating high quality version (1080p)...
    ffmpeg -i "%%f" -c:v libx264 -crf 18 -preset slow -c:a aac -b:a 160k -movflags +faststart "compressed-videos\%%~nf_1080p.mp4" -y
    
    REM Medium quality (720p) - ~5-8MB target  
    echo Creating medium quality version (720p)...
    ffmpeg -i "%%f" -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k -movflags +faststart "compressed-videos\%%~nf_720p.mp4" -y
    
    REM Low quality (480p) - ~2-3MB target
    echo Creating low quality version (480p)...
    ffmpeg -i "%%f" -c:v libx264 -crf 28 -preset fast -c:a aac -b:a 96k -movflags +faststart "compressed-videos\%%~nf_480p.mp4" -y
    
    echo Completed: %%~nxf
    echo.
)

echo ========================================
echo Compression complete!
echo ========================================
echo.
echo Compressed videos are in the 'compressed-videos' folder:
echo.

REM List the compressed files
dir /b compressed-videos\*.mp4

echo.
echo Next steps:
echo 1. Review the compressed files in the 'compressed-videos' folder
echo 2. Replace original videos with compressed versions
echo 3. Update your video player components to use the new optimized VideoPlayer
echo.
echo The new VideoPlayer will automatically:
echo - Detect user connection speed
echo - Choose appropriate quality
echo - Show loading progress
echo - Retry with lower quality if needed
echo.
pause 