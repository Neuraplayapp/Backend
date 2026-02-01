import React, { useState, useEffect } from 'react';
import { checkVideoSupport, logVideoDiagnostics } from '../utils/videoUtils';

const VideoDiagnostics: React.FC = () => {
  const [support, setSupport] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setSupport(checkVideoSupport());
  }, []);

  const runDiagnostics = () => {
    const video = document.createElement('video');
    video.src = '/assets/Videos/neuraplayintrovid1.mp4';
    logVideoDiagnostics(video, '/assets/Videos/neuraplayintrovid1.mp4');
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition-all z-50"
      >
        🎬 Video Diagnostics
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Video Diagnostics</h2>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {support && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Browser Support:</h3>
              <div className="space-y-2 text-sm">
                <div className={`flex justify-between ${support.mp4 ? 'text-green-600' : 'text-red-600'}`}>
                  <span>MP4:</span>
                  <span>{support.mp4 ? '✅ Supported' : '❌ Not Supported'}</span>
                </div>
                <div className={`flex justify-between ${support.webm ? 'text-green-600' : 'text-red-600'}`}>
                  <span>WebM:</span>
                  <span>{support.webm ? '✅ Supported' : '❌ Not Supported'}</span>
                </div>
                <div className={`flex justify-between ${support.ogg ? 'text-green-600' : 'text-red-600'}`}>
                  <span>OGG:</span>
                  <span>{support.ogg ? '✅ Supported' : '❌ Not Supported'}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Browser Info:</h3>
              <div className="text-sm space-y-1">
                <div><strong>User Agent:</strong></div>
                <div className="text-xs bg-gray-100 p-2 rounded break-all">
                  {navigator.userAgent}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Connection Info:</h3>
              <div className="text-sm space-y-1">
                {navigator.connection ? (
                  <>
                    <div><strong>Type:</strong> {navigator.connection.effectiveType}</div>
                    <div><strong>Speed:</strong> {navigator.connection.downlink} Mbps</div>
                    <div><strong>Latency:</strong> {navigator.connection.rtt}ms</div>
                  </>
                ) : (
                  <div className="text-gray-500">Connection info not available</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Troubleshooting:</h3>
              <div className="text-sm space-y-2">
                <div className="bg-yellow-50 p-3 rounded">
                  <strong>If videos don't load:</strong>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li>• Try a different browser (Chrome recommended)</li>
                    <li>• Check your internet connection</li>
                    <li>• Disable ad blockers temporarily</li>
                    <li>• Update your browser</li>
                    <li>• Clear browser cache</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={runDiagnostics}
              className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 transition-all"
            >
              Run Full Diagnostics
            </button>

            <button
              onClick={() => {
                console.log('Video Support:', support);
                console.log('User Agent:', navigator.userAgent);
                console.log('Connection:', navigator.connection);
                alert('Diagnostics logged to console. Press F12 to view.');
              }}
              className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700 transition-all"
            >
              Log to Console
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoDiagnostics; 