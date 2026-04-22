// Shared client-side study presence helpers.
// Multiple study sources (Pomodoro, Study Cycle Player, etc.) write the
// currently active study session to sessionStorage so that other in-app
// features (e.g. Study Group presence panel) can read a unified view.

const KEY = "current_study_subject";

export interface CurrentStudyInfo {
  /** Source/kind of study session, e.g. "pomodoro" or "cycle" */
  source: "pomodoro" | "cycle";
  /** Human-friendly subject/discipline name, e.g. "Matemática" */
  subject: string;
  /** Epoch ms when this session started */
  startedAt: number;
}

export function setCurrentStudyInfo(info: CurrentStudyInfo) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(info));
  } catch {
    // ignore storage errors
  }
}

export function clearCurrentStudyInfo() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function getCurrentStudyInfo(): CurrentStudyInfo | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CurrentStudyInfo;
    if (!parsed?.subject || !parsed?.startedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}
