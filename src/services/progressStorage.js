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

export function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
  return structuredClone(emptyProgress);
}
