export const CATEGORIES = ["Fitness", "Home", "Finance", "Work", "Rose", "Skills", "Other"];

export const PRIORITY_COLORS = {
  Low: "#00fff0",
  Medium: "#ffe066",
  High: "#ff355e"
};

export const DEFAULT_CONFIG = {
  xpPreset: "Default",
  scale: "Linear",
  bossTarget: 300,
  weights: { priority: { Low: 1, Medium: 2, High: 3 }, estHour: 1, streak: 0.5 }
};

export const CSV_TO_APP_CATEGORY = {
  "Training": "Fitness",
  "Home": "Home",
  "Work": "Work",
  "Finance": "Finance",
  "Skills": "Skills",
  "Rose Foundation": "Rose",
  "Unknown": "Other"
};
