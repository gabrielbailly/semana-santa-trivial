const STORAGE_KEY = "semana_santa_2026_progress";

export const emptyProgress = {
  totalScore: 0,
  correctByCategory: {
    personajes: 0,
    lugares: 0,
    frases: 0,
    liturgia: 0,
    objetos: 0,
    piedad_tradiciones: 0,
  },
  wedges: {
    personajes: false,
    lugares: false,
    frases: false,
    liturgia: false,
    objetos: false,
    piedad_tradiciones: false,
  },
  history: [],
};

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(emptyProgress);

    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(emptyProgress),
      ...parsed,
      correctByCategory: {
        ...structuredClone(emptyProgress).correctByCategory,
        ...(parsed.correctByCategory || {}),
      },
      wedges: {
        ...structuredClone(emptyProgress).wedges,
        ...(parsed.wedges || {}),
      },
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return structuredClone(emptyProgress);
  }
}

export function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}
const USED_QUESTIONS_KEY = "ss2026_used_questions";

export function loadUsedQuestions() {
  try {
    return JSON.parse(localStorage.getItem(USED_QUESTIONS_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveUsedQuestions(ids) {
  localStorage.setItem(USED_QUESTIONS_KEY, JSON.stringify(ids));
}

export function resetUsedQuestions() {
  localStorage.removeItem(USED_QUESTIONS_KEY);
}
export function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
  return structuredClone(emptyProgress);
}
