import React from 'react';

export const FullscreenPopper = ({ videoSrc, children }: { videoSrc: string; children: React.ReactNode }) => {
    return (
        <div className="grid h-full w-full items-center gap-8 p-8 md:grid-cols-2 lg:gap-16">
            <div className="relative flex h-full max-h-[70vh] w-full items-center justify-center">
                <video src={videoSrc} playsInline autoPlay muted loop className="h-auto w-full max-h-full rounded-2xl shadow-2xl" />
            </div>
            <div className="text-left">
                {children}
            </div>
        </div>
    );
}; 