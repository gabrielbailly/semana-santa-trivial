import { CATEGORY_ORDER } from "../config/categories";

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildRoundQuestions(allQuestions, difficulty) {
  const perCategory = CATEGORY_ORDER.flatMap((category) => {
    const pool = allQuestions.filter(
      (q) => q.category === category && q.difficulty === difficulty
    );
    return shuffle(pool).slice(0, 2);
  });

  return shuffle(perCategory); // 6 categorías x 2 = 12
}

export function getEarnedWedges(correctByCategory) {
  return Object.fromEntries(
    Object.entries(correctByCategory).map(([category, hits]) => [
      category,
      hits >= 5,
    ])
  );
}
