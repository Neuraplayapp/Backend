import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';

// Use the globally loaded GSAP from CDN
declare const gsap: any;
declare const ScrollTrigger: any;

interface Props {
  sources: string[];
}

export const SequentialVideoScrubber: React.FC<Props> = ({ sources }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<HTMLVideoElement[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let loadedCount = 0;
    const checkReadyState = () => {
      loadedCount++;
      if (loadedCount === sources.length) {
        setIsReady(true);
      }
    };
    videoRefs.current.forEach((video) => {
      if (video.readyState >= 1) {
        checkReadyState();
      } else {
        video.addEventListener('loadedmetadata', checkReadyState);
      }
    });
    return () => {
      videoRefs.current.forEach((video) => {
        video.removeEventListener('loadedmetadata', checkReadyState);
      });
    };
  }, [sources]);

  useLayoutEffect(() => {
    if (!isReady || !containerRef.current) return;
    const ctx = gsap.context(() => {
      const videos = videoRefs.current;
      const masterTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: `+=${videos.length * 2000}`,
          scrub: 1,
          pin: true,
        },
      });
      videos.forEach((video, index) => {
        masterTimeline.to(video, { currentTime: video.duration });
        if (index < videos.length - 1) {
          masterTimeline.to(video, { opacity: 0 }, '+=0.1');
          masterTimeline.to(videos[index + 1], { opacity: 1 }, '<');
        }
      });
    }, containerRef);
    return () => ctx.revert();
  }, [isReady]);

  return (
    <section ref={containerRef} className="h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-5xl h-[75vh] relative">
        {sources.map((src, index) => (
          <video
            key={src}
            ref={(el) => (videoRefs.current[index] = el!)}
            src={src}
            muted
            playsInline
            preload="metadata"
            className={`absolute top-0 left-0 w-full h-full object-cover ${index === 0 ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
      </div>
    </section>
  );
}; 