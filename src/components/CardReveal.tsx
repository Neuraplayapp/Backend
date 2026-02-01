import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  videoSrc: string;
  children: React.ReactNode;
}

export const CardReveal: React.FC<Props> = ({ videoSrc, children }) => {
  return (
    <motion.div
      className="py-16 px-4"
      initial={{ opacity: 0, y: 200 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 20,
        duration: 0.8,
      }}
    >
      <div className="container mx-auto max-w-6xl grid md:grid-cols-2 gap-8 items-center bg-white p-8 rounded-3xl shadow-2xl border-2 border-purple-200">
        <div className="rounded-2xl overflow-hidden">
          <video
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            controls
            className="w-full h-full object-cover"
          />
        </div>
        <div className="text-left">
          {children}
        </div>
      </div>
    </motion.div>
  );
}; 