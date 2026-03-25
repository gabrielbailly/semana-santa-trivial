import React, { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, getDocs } from "firebase/firestore";
import { db, serverTimestamp } from "./firebase";
import questionsData from "./data/questions.json";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "./config/categories";
import {
  emptyProgress,
  loadProgress,
  resetProgress,
  saveProgress,
  loadUsedQuestions,
  saveUsedQuestions,
  resetUsedQuestions,
} from "./services/progressStorage";

const QUESTION_TIME = 10;
const scoresCollection = collection(db, "scores");

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function cleanQuestionText(text) {
  return String(text || "").replace(/\s*\(\d+\)\s*$/, "").trim();
}

function shuffleQuestionOptions(question) {
  const options = question.options.map((text, i) => ({
    text,
    correct: i === question.correctIndex,
  }));

  const shuffled = shuffle(options);

  return {
    ...question,
    options: shuffled.map((o) => o.text),
    correctIndex: shuffled.findIndex((o) => o.correct),
  };
}

function getEarnedWedges(correctByCategory) {
  return Object.fromEntries(
    Object.entries(correctByCategory).map(([k, v]) => [k, v >= 5])
  );
}

function buildRoundQuestions(all, difficulty, selectedCategories = []) {
  const used = loadUsedQuestions();

  const categories =
    selectedCategories.length > 0 ? selectedCategories : CATEGORY_ORDER;

  const target =
    selectedCategories.length === 1 ? 6 : 12;

  let selected = categories.flatMap((cat) => {
    const pool = all.filter(
      (q) => q.category === cat && Number(q.difficulty) === Number(difficulty)
    );

    let unused = pool.filter((q) => !used.includes(q.id));
    if (unused.length === 0) unused = pool;

    return shuffle(unused).slice(0, 2);
  });

  selected = [...new Map(selected.map((q) => [q.id, q])).values()];
  selected = shuffle(selected).slice(0, target);

  const round = selected.map(shuffleQuestionOptions);
  saveUsedQuestions([...used, ...round.map((q) => q.id)]);

  return round;
}

function useGameSounds(enabled) {
  const ctxRef = useRef(null);

  const beep = (freq) => {
    if (!enabled) return;
    const ctx =
      ctxRef.current ||
      new (window.AudioContext || window.webkitAudioContext)();
    ctxRef.current = ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.value = 0.05;
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };

  return {
    correct: () => beep(800),
    error: () => beep(200),
    final: () => {
      beep(400);
      setTimeout(() => beep(700), 120);
    },
  };
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [difficulty, setDifficulty] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState([]);

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);

  const [progress, setProgress] = useState(emptyProgress);
  const [hasProgress, setHasProgress] = useState(false);

  const [currentPlayer, setCurrentPlayer] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isContinuing, setIsContinuing] = useState(false);

  const [savedScores, setSavedScores] = useState([]);
  const [saveMessage, setSaveMessage] = useState("");

  const sounds = useGameSounds(true);
  const q = questions[current];

  useEffect(() => {
    const stored = loadProgress();
    setProgress(stored);

    const savedName = localStorage.getItem("playerName") || "";
    setCurrentPlayer(savedName);

    setHasProgress(stored.totalScore > 0);
    loadScores();
  }, []);

  async function loadScores() {
    const snap = await getDocs(scoresCollection);
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setSavedScores(rows);
  }

  const ranking = useMemo(() => {
    return [...savedScores]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [savedScores]);

  const wedges = useMemo(
    () => getEarnedWedges(progress.correctByCategory || {}),
    [progress]
  );

  function startGame(keep) {
    const next = keep ? loadProgress() : resetProgress();

    if (!keep) {
      resetUsedQuestions();
      setCurrentPlayer("");
    }

    setIsContinuing(keep);
    setProgress(next);

    setQuestions(
      buildRoundQuestions(
        questionsData.questions,
        difficulty,
        selectedCategories
      )
    );

    setCurrent(0);
    setSelected(null);
    setLocked(false);
    setTimeLeft(QUESTION_TIME);
    setScreen("quiz");
  }

  function answer(index) {
    if (locked) return;

    const ok = index === q.correctIndex;
    setSelected(index);
    setLocked(true);

    ok ? sounds.correct() : sounds.error();

    const next = {
      ...progress,
      totalScore: progress.totalScore + (ok ? 1 : 0),
      correctByCategory: {
        ...progress.correctByCategory,
        [q.category]:
          (progress.correctByCategory[q.category] || 0) + (ok ? 1 : 0),
      },
    };

    next.wedges = getEarnedWedges(next.correctByCategory);
    setProgress(next);
    saveProgress(next);
  }

  function nextQuestion() {
    if (current + 1 >= questions.length) {
      sounds.final();
      setScreen("summary");
      return;
    }

    setCurrent(current + 1);
    setSelected(null);
    setLocked(false);
    setTimeLeft(QUESTION_TIME);
  }

  async function saveScore() {
    let name = currentPlayer;

    if (!isContinuing) {
      const trimmed = playerName.trim();
      if (!trimmed) return setSaveMessage("Introduce un nombre");
      name = trimmed;
      localStorage.setItem("playerName", name);
      setCurrentPlayer(name);
    }

    const quesitos = Object.values(progress.wedges).filter(Boolean).length;

    await addDoc(scoresCollection, {
      name,
      score: progress.totalScore,
      nivel: difficulty,
      quesitos,
      createdAt: serverTimestamp(),
    });

    setSaveMessage("Partida guardada");
    loadScores();
  }

  useEffect(() => {
    if (screen !== "quiz" || locked) return;

    const i = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setLocked(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(i);
  }, [screen, locked]);

  const timerWidth = `${(timeLeft / QUESTION_TIME) * 100}%`;

  return (
    <div className="appShell">
      <style>{`
* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  background: #fff7ed;
}

.appShell {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px;
}

/* CARDS */
.card {
  background: white;
  border-radius: 24px;
  padding: 22px;
  box-shadow: 0 16px 40px rgba(0,0,0,.08);
}

/* PORTADA */
.heroImage {
  width: 100%;
  max-height: 240px;
  object-fit: contain;
  border-radius: 18px;
  display: block;
}

/* CONTROLES */
.controls {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 22px;
  flex-wrap: wrap;
}

.select {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #d1d5db;
  min-width: 200px;
}

/* BOTONES */
.btn {
  border: none;
  border-radius: 14px;
  cursor: pointer;
  font-weight: 700;
  padding: 14px 18px;
  transition: all .2s ease;
}

.btnPrimary {
  background: linear-gradient(135deg, #f59e0b, #ea580c);
  color: white;
}

.btnGhost {
  background: white;
  border: 1px solid #e5e7eb;
}

.btn:hover {
  transform: translateY(-1px);
  opacity: 0.95;
}

/* JUGADOR */
.playerCard {
  background: #fef3c7;
  padding: 12px;
  border-radius: 14px;
  margin-top: 14px;
  text-align: center;
  font-weight: 600;
}

/* QUESITOS */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 12px;
}

.chip {
  background: #f3f4f6;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: .92rem;
}

/* QUIZ */
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 20px;
}

.questionImage {
  width: 100%;
  border-radius: 18px;
  object-fit: cover;
  display: block;
  background: #f3f4f6;
}

.questionTitle {
  margin: 0 0 14px 0;
  font-size: clamp(1.4rem, 2.6vw, 2.4rem);
  line-height: 1.15;
}

/* RESPUESTAS */
.options {
  display: grid;
  gap: 10px;
}

.option {
  border: 2px solid #e5e7eb;
  border-radius: 14px;
  padding: 14px;
  background: white;
  cursor: pointer;
  text-align: left;
  transition: all .2s ease;
}

.option:hover {
  background: #fffbeb;
  border-color: #f59e0b;
}

.option.correct {
  background: #ecfdf5;
  border-color: #22c55e;
}

.option.wrong {
  background: #fef2f2;
  border-color: #ef4444;
}

/* BARRA TIEMPO */
.timeBarTrack {
  height: 10px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
  margin-top: 8px;
}

.timeBarFill {
  height: 100%;
  transition: width .25s linear, background .25s ease;
  border-radius: 999px;
}

/* TOP 10 */
.rankingCard {
  margin-top: 20px;
  background: #f9fafb;
  border-radius: 16px;
  padding: 14px;
  border: 1px solid #e5e7eb;
}

.scoreItem {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

.scoreItem:last-child {
  border-bottom: none;
}

/* SUMMARY */
.saveInput {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #ccc;
  margin-top: 10px;
  width: 100%;
}

/* RESPONSIVE */
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .controls {
    flex-direction: column;
    align-items: center;
  }
}
`}</style>

      {screen === "home" && (
        <div className="card">
          <img src="/images/portada.png" className="heroImage" />

          {currentPlayer && (
            <div className="playerCard">
              {currentPlayer} · {progress.totalScore} pts ·{" "}
              {Object.values(progress.wedges).filter(Boolean).length} 🧩
            </div>
          )}

          <div className="controls">
            <select
              className="select"
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
            >
              <option value={1}>Fácil</option>
              <option value={2}>Medio</option>
              <option value={3}>Difícil</option>
            </select>

            <select
              multiple
              className="select"
              value={selectedCategories}
              onChange={(e) =>
                setSelectedCategories(
                  Array.from(e.target.selectedOptions, (o) => o.value)
                )
              }
            >
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_CONFIG[c].label}
                </option>
              ))}
            </select>
          </div>

          <div className="chips">
            {CATEGORY_ORDER.map((c) => (
              <span key={c} className="chip">
                {progress.wedges[c] ? "🧩" : "◻️"}
              </span>
            ))}
          </div>

          <div style={{ marginTop: 20 }}>
            {!hasProgress ? (
              <button className="btn btnPrimary" onClick={() => startGame(false)}>
                Jugar
              </button>
            ) : (
              <>
                <button className="btn btnPrimary" onClick={() => startGame(true)}>
                  Continuar
                </button>
                <button className="btn btnGhost" onClick={() => startGame(false)}>
                  Nueva
                </button>
              </>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <strong>Top 10</strong>
            {ranking.map((r, i) => (
              <div key={r.id}>
                {i + 1}. {r.name} · {r.score}
              </div>
            ))}
          </div>
        </div>
      )}

      {screen === "quiz" && q && (
        <div className="card">
          <div>
            Pregunta {current + 1}/{questions.length}
            <div className="timeBarTrack">
              <div className="timeBarFill" style={{ width: timerWidth }} />
            </div>
          </div>

          <div className="grid">
            <img src={`/images/${q.image}.jpg`} className="questionImage" />

            <div>
              <h2>{cleanQuestionText(q.question)}</h2>

              {q.options.map((o, i) => {
                let cls = "option";
                if (locked && i === q.correctIndex) cls += " correct";
                if (locked && selected === i && i !== q.correctIndex)
                  cls += " wrong";

                return (
                  <div
                    key={i}
                    className={cls}
                    onClick={() => answer(i)}
                  >
                    {o}
                  </div>
                );
              })}
            </div>
          </div>

          {locked && (
            <button className="btn btnPrimary" onClick={nextQuestion}>
              Siguiente
            </button>
          )}
        </div>
      )}

      {screen === "summary" && (
        <div className="card">
          <h2>Puntuación: {progress.totalScore}</h2>

          {!isContinuing && (
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Nombre"
            />
          )}

          <button className="btn btnPrimary" onClick={saveScore}>
            Guardar
          </button>

          {saveMessage}

          <button className="btn btnGhost" onClick={() => setScreen("home")}>
            Inicio
          </button>
        </div>
      )}
    </div>
  );
}
