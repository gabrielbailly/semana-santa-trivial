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

const QUESTION_TIME = 7;
const MAX_QUESTIONS_PER_ROUND = 12;
const scoresCollection = collection(db, "scores");

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function cleanQuestionText(text) {
  return String(text || "").replace(/\s*\(\d+\)\s*$/, "").trim();
}

function shuffleQuestionOptions(question) {
  const options = question.options.map((text, index) => ({
    text,
    isCorrect: index === question.correctIndex,
  }));

  const shuffled = shuffle(options);

  return {
    ...question,
    options: shuffled.map((item) => item.text),
    correctIndex: shuffled.findIndex((item) => item.isCorrect),
  };
}

function getEarnedWedges(correctByCategory) {
  return Object.fromEntries(
    Object.entries(correctByCategory).map(([cat, hits]) => [cat, hits >= 5])
  );
}

function buildRoundQuestions(allQuestions, difficulty, selectedCategories = []) {
  const used = loadUsedQuestions();

  const categories =
    selectedCategories.length > 0 ? selectedCategories : CATEGORY_ORDER;

  const targetCount =
    selectedCategories.length === 0
      ? 12
      : selectedCategories.length === 1
        ? 6
        : 12;

  const questionsPerCategory =
    selectedCategories.length === 0
      ? 2
      : selectedCategories.length === 1
        ? 6
        : Math.max(1, Math.floor(targetCount / categories.length));

  let selected = categories.flatMap((category) => {
    const pool = allQuestions.filter(
      (q) => Number(q.difficulty) === Number(difficulty) && q.category === category
    );

    let unused = pool.filter((q) => !used.includes(q.id));
    if (unused.length < questionsPerCategory) unused = pool;

    return shuffle(unused).slice(0, questionsPerCategory);
  });

  // quitar duplicadas dentro de la misma partida
  selected = [...new Map(selected.map((q) => [q.id, q])).values()];

  // rellenar si faltan preguntas
  if (selected.length < targetCount) {
    const selectedIds = new Set(selected.map((q) => q.id));

    const fallbackPool = allQuestions.filter((q) => {
      const validDifficulty = Number(q.difficulty) === Number(difficulty);
      const validCategory =
        selectedCategories.length === 0
          ? CATEGORY_ORDER.includes(q.category)
          : selectedCategories.includes(q.category);

      return validDifficulty && validCategory && !selectedIds.has(q.id);
    });

    selected = [
      ...selected,
      ...shuffle(fallbackPool).slice(0, targetCount - selected.length),
    ];
  }

  if (selected.length > targetCount) {
    selected = shuffle(selected).slice(0, targetCount);
  }

  const round = shuffle(selected).map(shuffleQuestionOptions);
  saveUsedQuestions([...used, ...round.map((q) => q.id)]);
  return round;
}

function useGameSounds(enabled) {
  const ctxRef = useRef(null);

  const getCtx = () => {
    if (!enabled || typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctxRef.current) ctxRef.current = new AudioCtx();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };

  const beep = (freq, dur = 0.1, type = "triangle") => {
    const ctx = getCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = freq;
    osc.type = type;
    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);

    osc.start();
    osc.stop(ctx.currentTime + dur);
  };

  return {
    correct: () => {
      beep(700, 0.1);
      setTimeout(() => beep(900, 0.1), 100);
    },
    error: () => beep(220, 0.18, "sawtooth"),
    final: () => {
      beep(500, 0.12);
      setTimeout(() => beep(700, 0.12), 120);
      setTimeout(() => beep(900, 0.16), 240);
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
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [progress, setProgress] = useState(emptyProgress);
  const [hasProgress, setHasProgress] = useState(false);

  const [playerName, setPlayerName] = useState("");
  const [savedScores, setSavedScores] = useState([]);
  const [saveMessage, setSaveMessage] = useState("");

  const sounds = useGameSounds(soundEnabled);
  const q = questions[current];

  useEffect(() => {
    const stored = loadProgress();
    setProgress(stored);
    setHasProgress(stored.totalScore > 0 || (stored.history?.length ?? 0) > 0);
  }, []);

  useEffect(() => {
    loadScores();
  }, []);

  async function loadScores() {
    try {
      const snap = await getDocs(scoresCollection);
      const rows = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSavedScores(rows);
    } catch (error) {
      console.error("Error cargando puntuaciones:", error);
    }
  }

  const ranking = useMemo(() => {
    return [...savedScores]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 10);
  }, [savedScores]);

  const wedges = useMemo(
    () => getEarnedWedges(progress.correctByCategory || {}),
    [progress.correctByCategory]
  );

  const timerWidth = `${(timeLeft / QUESTION_TIME) * 100}%`;
  let timerColor = "#22c55e";
  if (timeLeft <= 4) timerColor = "#f59e0b";
  if (timeLeft <= 2) timerColor = "#ef4444";

  function startGame(keepProgress) {
    const next = keepProgress ? loadProgress() : resetProgress();
    if (!keepProgress) resetUsedQuestions();

    setProgress(next);
    setHasProgress(next.totalScore > 0 || (next.history?.length ?? 0) > 0);

    setQuestions(
      buildRoundQuestions(questionsData.questions, difficulty, selectedCategories)
    );
    setCurrent(0);
    setSelected(null);
    setLocked(false);
    setTimeLeft(QUESTION_TIME);
    setScreen("quiz");
  }

  function answer(index) {
    if (locked || !q) return;

    const ok = index === q.correctIndex;
    setSelected(index);
    setLocked(true);

    if (ok) sounds.correct();
    else sounds.error();

    const next = {
      ...progress,
      totalScore: (progress.totalScore || 0) + (ok ? 1 : 0),
      correctByCategory: {
        ...progress.correctByCategory,
        [q.category]: (progress.correctByCategory?.[q.category] || 0) + (ok ? 1 : 0),
      },
    };

    next.wedges = getEarnedWedges(next.correctByCategory);

    setProgress(next);
    saveProgress(next);
    setHasProgress(true);
  }

  function nextQuestion() {
    if (current + 1 >= questions.length) {
      sounds.final();
      setScreen("summary");
      return;
    }
    setCurrent((prev) => prev + 1);
    setSelected(null);
    setLocked(false);
    setTimeLeft(QUESTION_TIME);
  }

  async function saveScore() {
    const trimmedName = playerName.trim();
    if (!trimmedName) {
      setSaveMessage("Introduce un nombre");
      return;
    }

    try {
      const quesitos = Object.values(progress.wedges || {}).filter(Boolean).length;

      await addDoc(scoresCollection, {
        name: trimmedName,
        score: Number(progress.totalScore || 0),
        nivel: Number(difficulty),
        quesitos,
        createdAt: serverTimestamp(),
      });

      setSaveMessage("Partida guardada");
      await loadScores();
    } catch (error) {
      console.error("Error guardando:", error);
      setSaveMessage("No se pudo guardar la partida");
    }
  }

  useEffect(() => {
    if (screen !== "quiz" || locked || !q) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setLocked(true);
          sounds.error();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, locked, current, q]);

  return (
    <div className="appShell">
      <style>{`
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          background: #fff7ed;
        }

        button, input, select {
          font: inherit;
        }

        .appShell {
          max-width: 1100px;
          margin: 0 auto;
          padding: 20px;
        }

        .card {
          background: white;
          border-radius: 24px;
          padding: 20px;
          box-shadow: 0 16px 40px rgba(0,0,0,.08);
        }

        .heroImage {
          width: 100%;
          max-height: 300px;
          object-fit: contain;
          border-radius: 18px;
          display: block;
          background: white;
        }

        .section {
          margin-top: 20px;
        }

        .label {
          display: block;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .selectField {
          width: 100%;
          max-width: 320px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid #d1d5db;
          background: white;
        }

        .btnRow {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .btn {
          border: none;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 700;
          padding: 14px 18px;
        }

        .btnPrimary {
          background: linear-gradient(135deg, #f59e0b, #ea580c);
          color: white;
        }

        .btnGhost {
          background: white;
          border: 1px solid #e5e7eb;
        }

        .soundBtn {
          margin-bottom: 14px;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .chip {
          background: #f3f4f6;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: .92rem;
        }

        .rankingCard, .saveCard {
          margin-top: 18px;
          text-align: left;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 16px;
        }

        .scoreItem {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .scoreItem:last-child {
          border-bottom: none;
        }

        .quizTop {
          display: grid;
          grid-template-columns: minmax(0,1fr) auto;
          gap: 12px;
          align-items: center;
          margin-bottom: 16px;
        }

        .questionRow {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .timeBarTrack {
          flex: 1;
          min-width: 180px;
          height: 10px;
          background: #e5e7eb;
          border-radius: 999px;
          overflow: hidden;
        }

        .timeBarFill {
          height: 100%;
          transition: width .25s linear, background .25s ease;
          border-radius: 999px;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          align-items: start;
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

        .summaryGrid {
          display: grid;
          gap: 10px;
        }

        .saveRow {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .saveInput {
          flex: 1;
          min-width: 220px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid #d1d5db;
          background: white;
        }

        @media (max-width: 900px) {
          .grid {
            grid-template-columns: 1fr;
          }

          .quizTop {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <button
        className="btn btnGhost soundBtn"
        onClick={() => setSoundEnabled((v) => !v)}
      >
        {soundEnabled ? "🔊 Sonido" : "🔇 Silencio"}
      </button>

      {screen === "home" && (
        <div className="card">
          <img src="/images/portada.png" alt="Portada" className="heroImage" />

          <div className="section">
            <label className="label">Nivel</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="selectField"
            >
              <option value={1}>Fácil</option>
              <option value={2}>Medio</option>
              <option value={3}>Difícil</option>
            </select>
          </div>

          <div className="section">
            <label className="label">Categorías</label>
            <select
              multiple
              value={selectedCategories}
              onChange={(e) =>
                setSelectedCategories(
                  Array.from(e.target.selectedOptions, (option) => option.value)
                )
              }
              className="selectField"
              style={{ minHeight: 150 }}
            >
              {CATEGORY_ORDER.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_CONFIG[category].icon} {CATEGORY_CONFIG[category].label}
                </option>
              ))}
            </select>
            <div style={{ color: "#6b7280", fontSize: ".9rem", marginTop: 6 }}>
              Si no eliges ninguna, se jugará con todas.
            </div>
          </div>

          <div className="btnRow">
            {!hasProgress ? (
              <button className="btn btnPrimary" onClick={() => startGame(false)}>
                Jugar
              </button>
            ) : (
              <>
                <button className="btn btnPrimary" onClick={() => startGame(true)}>
                  Continuar partida
                </button>
                <button className="btn btnGhost" onClick={() => startGame(false)}>
                  Nueva partida
                </button>
              </>
            )}
          </div>

          <div className="section">
            <strong>Quesitos:</strong>
            <div className="chips">
              {CATEGORY_ORDER.map((key) => (
                <span className="chip" key={key}>
                  {wedges[key] ? "🧩" : "◻️"} {CATEGORY_CONFIG[key].icon} {CATEGORY_CONFIG[key].label}
                </span>
              ))}
            </div>
          </div>

          <div className="rankingCard">
            <div style={{ fontWeight: 800, marginBottom: 10 }}>🏆 Top 10</div>
            {ranking.length === 0 ? (
              <div style={{ color: "#6b7280" }}>Todavía no hay partidas guardadas.</div>
            ) : (
              ranking.map((entry, index) => (
                <div key={entry.id} className="scoreItem">
                  <span>
                    {index === 0 ? "🥇 " : index === 1 ? "🥈 " : index === 2 ? "🥉 " : `${index + 1}. `}
                    <strong>{entry.name}</strong>
                  </span>
                  <span>
                      {entry.score ?? 0} ptos. · {entry.quesitos ?? 0} 🧩 <br/>
                     <small style={{ color: "#6b7280" }}>
                     {entry.createdAt?.toDate
                      ? entry.createdAt.toDate().toLocaleDateString()
                      : ""}
                     </small>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {screen === "quiz" && q && (
        <div className="card">
          <div className="quizTop">
            <div className="questionRow">
              <strong>
                Pregunta {current + 1} / {questions.length}
              </strong>
              <div className="timeBarTrack">
                <div
                  className="timeBarFill"
                  style={{ width: timerWidth, background: timerColor }}
                />
              </div>
            </div>

            {locked ? (
              <button className="btn btnPrimary" onClick={nextQuestion}>
                {current + 1 >= questions.length ? "Ver resumen" : "Siguiente"}
              </button>
            ) : (
              <div />
            )}
          </div>

          <div className="chips">
            <span className="chip">
              {CATEGORY_CONFIG[q.category].icon} {CATEGORY_CONFIG[q.category].label}
            </span>
            <span className="chip">Nivel {q.difficulty}</span>
            <span className="chip">Puntuación total {progress.totalScore || 0}</span>
          </div>

          <div className="grid" style={{ marginTop: 16 }}>
            <img
              src={`/images/${q.image}.jpg`}
              alt={cleanQuestionText(q.question)}
              className="questionImage"
            />

            <div>
              <h2 className="questionTitle">{cleanQuestionText(q.question)}</h2>

              <div className="options">
                {q.options.map((opt, index) => {
                  let className = "option";
                  if (locked && index === q.correctIndex) className += " correct";
                  if (locked && selected === index && index !== q.correctIndex) className += " wrong";

                  return (
                    <button
                      key={index}
                      className={className}
                      onClick={() => answer(index)}
                      disabled={locked}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {screen === "summary" && (
        <div className="card">
          <h2>Resumen</h2>
          <p><strong>Puntuación total:</strong> {progress.totalScore || 0}</p>

          <h3>Aciertos por categoría</h3>
          <div className="summaryGrid">
            {CATEGORY_ORDER.map((key) => (
              <div key={key}>
                {CATEGORY_CONFIG[key].icon} {CATEGORY_CONFIG[key].label}:{" "}
                {progress.correctByCategory?.[key] || 0}
                {progress.wedges?.[key] ? " · 🧩" : ""}
              </div>
            ))}
          </div>

          <div className="saveCard">
            <div style={{ fontWeight: 800 }}>Guardar partida</div>
            <div style={{ color: "#6b7280", marginTop: 6 }}>
              Guarda tu puntuación en el Top 10.
            </div>

            <div className="saveRow">
              <input
                className="saveInput"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Nombre del jugador"
              />
              <button className="btn btnPrimary" onClick={saveScore}>
                Guardar
              </button>
            </div>

            {saveMessage && <div style={{ marginTop: 10 }}>{saveMessage}</div>}
          </div>

          <div className="btnRow">
            <button className="btn btnPrimary" onClick={() => setScreen("home")}>
              Inicio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
