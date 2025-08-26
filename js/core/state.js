import { deepClone } from './utils.js';
import { DEFAULT_CONFIG } from './config.js';

export const LS_KEY = "neon_tasks_v07";

export let ACTIVITY = [];

export const STATE = loadState();

function loadState() {
  let s;
  try { s = JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { s = {}; }
  const state = {
    tasks: s.tasks || [],
    characters: s.characters || {},
    config: s.config || deepClone(DEFAULT_CONFIG),
    power: s.power || 0,
    calendarCursor: s.calendarCursor || new Date().toISOString().slice(0, 7),
    seedVersion: s.seedVersion || 0,
    meta: s.meta || { installedAt: Date.now(), completedCount: 0 },
    activity: s.activity || []
  };
  ACTIVITY = state.activity;
  return state;
}

export function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(STATE));
}
