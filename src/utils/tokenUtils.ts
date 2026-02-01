export const approximateTokenCount = (text: string): number => {
  if (!text) return 0;
  // very rough: split on whitespace and punctuation
  const words = text.trim().split(/\s+/g);
  return Math.ceil(words.length * 0.75);
};

export const getContextWindowForModel = (model: string): number => {
  if (!model) return 4096;
  if (model.includes('120b') || model.includes('8k') || model.includes('8192')) return 8192;
  return 4096;
};
