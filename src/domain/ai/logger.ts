const AI_DEBUG = true;

export const aiLog = (...args: any[]) => {
  if (AI_DEBUG) console.log("🤖", ...args);
};

export const aiError = (...args: any[]) => {
  console.error("🤖", ...args);
};