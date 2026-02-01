// Minimal shim to avoid importing react-plotly.js in production builds.
// If something still imports 'react-plotly.js', it will render nothing.
import React from 'react';
const Noop: React.FC<any> = () => null;
export default Noop;

