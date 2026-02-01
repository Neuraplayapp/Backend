// Video utility functions for better compatibility and error handling

export const checkVideoSupport = () => {
  const video = document.createElement('video');
  
  // Check if MP4 is supported
  const mp4Supported = video.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
  const webmSupported = video.canPlayType('video/webm; codecs="vp8, vorbis"');
  const oggSupported = video.canPlayType('video/ogg; codecs="theora, vorbis"');
  
  return {
    mp4: mp4Supported !== '',
    webm: webmSupported !== '',
    ogg: oggSupported !== '',
    mp4Support: mp4Supported,
    webmSupport: webmSupported,
    oggSupport: oggSupported
  };
};

export const getOptimalVideoFormat = () => {
  const support = checkVideoSupport();
  
  // Priority order: WebM (smaller), MP4 (universal), OGG (fallback)
  if (support.webm) return 'webm';
  if (support.mp4) return 'mp4';
  if (support.ogg) return 'ogg';
  return 'mp4'; // Default fallback
};

export const createVideoFallback = (container: HTMLElement, videoSrc: string) => {
  const fallbackHTML = `
    <div class="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center cursor-pointer">
      <div class="text-center text-white">
        <div class="text-6xl mb-4">🎬</div>
        <h3 class="text-xl font-bold mb-2">Video Unavailable</h3>
        <p class="text-sm opacity-80 mb-4">This video cannot be played on your device</p>
        <div class="text-xs opacity-60 text-left max-w-xs">
          <p class="font-semibold mb-2">Possible solutions:</p>
          <ul class="space-y-1">
            <li>• Try a different browser (Chrome, Firefox, Safari)</li>
            <li>• Check your internet connection</li>
            <li>• Disable ad blockers temporarily</li>
            <li>• Update your browser to the latest version</li>
          </ul>
        </div>
        <button class="mt-4 px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all">
          Try Again
        </button>
      </div>
    </div>
  `;
  
  container.innerHTML = fallbackHTML;
  
  // Add retry functionality
  const retryButton = container.querySelector('button');
  if (retryButton) {
    retryButton.addEventListener('click', () => {
      location.reload();
    });
  }
};

export const optimizeVideoForDevice = (videoElement: HTMLVideoElement) => {
  // Set optimal attributes based on device capabilities
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isSlowConnection = navigator.connection?.effectiveType === 'slow-2g' || navigator.connection?.effectiveType === '2g';
  
  if (isMobile) {
    videoElement.setAttribute('playsinline', 'true');
    videoElement.setAttribute('webkit-playsinline', 'true');
  }
  
  if (isSlowConnection) {
    videoElement.setAttribute('preload', 'none');
  } else {
    videoElement.setAttribute('preload', 'metadata');
  }
  
  // Add additional compatibility attributes
  videoElement.setAttribute('crossorigin', 'anonymous');
  videoElement.setAttribute('muted', 'false');
  videoElement.setAttribute('loop', 'false');
};

export const logVideoDiagnostics = (videoElement: HTMLVideoElement, videoSrc: string) => {
  const diagnostics = {
    userAgent: navigator.userAgent,
    videoSrc,
    videoWidth: videoElement.videoWidth,
    videoHeight: videoElement.videoHeight,
    duration: videoElement.duration,
    readyState: videoElement.readyState,
    networkState: videoElement.networkState,
    error: videoElement.error,
    support: checkVideoSupport(),
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt
    } : null
  };
  
  console.log('Video Diagnostics:', diagnostics);
  return diagnostics;
};

// New functions for video optimization

export const getConnectionQuality = () => {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection) {
    return 'unknown';
  }
  
  const { effectiveType, downlink } = connection;
  
  if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 1) {
    return 'slow';
  } else if (effectiveType === '3g' || downlink < 5) {
    return 'medium';
  } else {
    return 'fast';
  }
};

export const getRecommendedVideoSettings = () => {
  const connectionQuality = getConnectionQuality();
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  const settings = {
    resolution: '720p',
    bitrate: '1000k',
    format: 'mp4',
    codec: 'h264',
    preload: 'metadata' as 'none' | 'metadata' | 'auto'
  };
  
  switch (connectionQuality) {
    case 'slow':
      settings.resolution = '480p';
      settings.bitrate = '500k';
      settings.preload = 'none';
      break;
    case 'medium':
      settings.resolution = '720p';
      settings.bitrate = '1000k';
      settings.preload = 'metadata';
      break;
    case 'fast':
      settings.resolution = '1080p';
      settings.bitrate = '2000k';
      settings.preload = 'metadata';
      break;
  }
  
  if (isMobile) {
    settings.resolution = settings.resolution === '1080p' ? '720p' : settings.resolution;
    settings.bitrate = settings.bitrate === '2000k' ? '1000k' : settings.bitrate;
  }
  
  return settings;
};

export const getVideoCompressionRecommendations = () => {
  const connectionQuality = getConnectionQuality();
  
  const recommendations = {
    targetFileSize: '5MB',
    maxBitrate: '1000k',
    resolution: '720p',
    format: 'mp4',
    codec: 'h264',
    audioCodec: 'aac',
    audioBitrate: '128k',
    keyframeInterval: '2s',
    crf: 23
  };
  
  switch (connectionQuality) {
    case 'slow':
      recommendations.targetFileSize = '2MB';
      recommendations.maxBitrate = '500k';
      recommendations.resolution = '480p';
      recommendations.crf = 28;
      recommendations.audioBitrate = '96k';
      break;
    case 'medium':
      recommendations.targetFileSize = '5MB';
      recommendations.maxBitrate = '1000k';
      recommendations.resolution = '720p';
      recommendations.crf = 23;
      recommendations.audioBitrate = '128k';
      break;
    case 'fast':
      recommendations.targetFileSize = '10MB';
      recommendations.maxBitrate = '2000k';
      recommendations.resolution = '1080p';
      recommendations.crf = 18;
      recommendations.audioBitrate = '160k';
      break;
  }
  
  return recommendations;
};

export const createAdaptiveVideoSources = (baseVideoPath: string) => {
  // Generate different quality variants for adaptive streaming
  const videoName = baseVideoPath.split('/').pop()?.split('.')[0];
  const extension = baseVideoPath.split('.').pop();
  
  return {
    high: `/assets/Videos/${videoName}_1080p.${extension}`,
    medium: `/assets/Videos/${videoName}_720p.${extension}`,
    low: `/assets/Videos/${videoName}_480p.${extension}`
  };
};

export const estimateVideoLoadTime = (fileSizeMB: number, connectionSpeedMbps: number = 5) => {
  // Rough estimation of video load time
  const fileSizeBits = fileSizeMB * 8 * 1024 * 1024; // Convert MB to bits
  const loadTimeSeconds = fileSizeBits / (connectionSpeedMbps * 1024 * 1024); // Convert Mbps to bps
  
  return Math.round(loadTimeSeconds);
}; 

/**
 * Convert base64 string to binary data (browser-compatible)
 * This replaces Buffer.from() which is not available in browsers
 */
export function base64ToBinary(base64: string): Uint8Array {
  try {
    // Decode base64 to binary string
    const binaryString = atob(base64);
    
    // Convert binary string to Uint8Array
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes;
  } catch (error) {
    console.error('Error converting base64 to binary:', error);
    throw new Error('Failed to convert base64 to binary data');
  }
} 

/**
 * Test function to verify base64ToBinary works correctly
 * This can be called from the browser console for testing
 */
export function testBase64ToBinary(): void {
  try {
    // Test with a simple base64 string
    const testBase64 = 'SGVsbG8gV29ybGQ='; // "Hello World" in base64
    const result = base64ToBinary(testBase64);
    
    console.log('Test base64ToBinary:');
    console.log('Input base64:', testBase64);
    console.log('Output Uint8Array length:', result.length);
    console.log('First few bytes:', result.slice(0, 5));
    
    // Convert back to string to verify
    const decodedString = new TextDecoder().decode(result);
    console.log('Decoded string:', decodedString);
    
    if (decodedString === 'Hello World') {
      console.log('✅ base64ToBinary test passed!');
    } else {
      console.log('❌ base64ToBinary test failed!');
    }
  } catch (error) {
    console.error('❌ base64ToBinary test error:', error);
  }
} 