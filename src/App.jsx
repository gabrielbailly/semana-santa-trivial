import React, { useEffect, useMemo, useState } from "react";
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

function buildRoundQuestions(allQuestions, difficulty) {
  const used = loadUsedQuestions();

  let selected = CATEGORY_ORDER.flatMap((category) => {
    const pool = allQuestions.filter(
      (q) => Number(q.difficulty) === Number(difficulty) && q.category === category
    );

    let unused = pool.filter((q) => !used.includes(q.id));
    if (unused.length < 2) unused = pool;

    return shuffle(unused).slice(0, 2);
  });

  selected = [...new Map(selected.map((q) => [q.id, q])).values()];
  const round = shuffle(selected).map(shuffleQuestionOptions);

  saveUsedQuestions([...used, ...round.map((q) => q.id)]);
  return round;
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [difficulty, setDifficulty] = useState(1);
  const [roundQuestions, setRoundQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);

  const [progress, setProgress] = useState(emptyProgress);
  const [hasProgress, setHasProgress] = useState(false);

  const [playerName, setPlayerName] = useState("");
  const [savedScores, setSavedScores] = useState([]);
  const [saveMessage, setSaveMessage] = useState("");

  const currentQuestion = roundQuestions[current];

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
      const snapshot = await getDocs(scoresCollection);
      const rows = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSavedScores(rows);
    } catch (error) {
      console.error("Error cargando puntuaciones:", error);
    }
  }

  const rankingTop10 = useMemo(() => {
    return [...savedScores]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 10);
  }, [savedScores]);

  const wedges = useMemo(() => {
    return getEarnedWedges(progress.correctByCategory || {});
  }, [progress.correctByCategory]);

  const timerWidth = `${(timeLeft / QUESTION_TIME) * 100}%`;

  let timerColor = "#22c55e";
  if (timeLeft <= 4) timerColor = "#f59e0b";
  if (timeLeft <= 2) timerColor = "#ef4444";

  function startGame(keepProgress) {
    const next = keepProgress ? loadProgress() : resetProgress();
    if (!keepProgress) resetUsedQuestions();

    setProgress(next);
    setHasProgress(next.totalScore > 0 || (next.history?.length ?? 0) > 0);
    setRoundQuestions(buildRoundQuestions(questionsData.questions, difficulty));
    setCurrent(0);
    setSelected(null);
    setLocked(false);
    setTimeLeft(QUESTION_TIME);
    setScreen("quiz");
  }

  function answer(index) {
    if (locked || !currentQuestion) return;

    const ok = index === currentQuestion.correctIndex;
    setSelected(index);
    setLocked(true);

    const next = {
      ...progress,
      totalScore: (progress.totalScore || 0) + (ok ? 1 : 0),
      correctByCategory: {
        ...progress.correctByCategory,
        [currentQuestion.category]:
          (progress.correctByCategory?.[currentQuestion.category] || 0) + (ok ? 1 : 0),
      },
    };

    next.wedges = getEarnedWedges(next.correctByCategory);
    setProgress(next);
    saveProgress(next);
    setHasProgress(true);
  }

  function nextQuestion() {
    if (current + 1 >= roundQuestions.length) {
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
    if (screen !== "quiz" || locked || !currentQuestion) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setLocked(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, locked, current, currentQuestion]);

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
          max-height: 280px;
          object-fit: contain;
          border-radius: 18px;
          display: block;
          background: white;
        }

        .section {
          margin-top: 20px;
        }

        .selectField {
          width: 100%;
          max-width: 280px;
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

        .questionTop {
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

        .rankBadge {
          min-width: 2.2rem;
          display: inline-block;
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

        .summaryGrid {
          display: grid;
          gap: 10px;
        }

        @media (max-width: 900px) {
          .grid {
            grid-template-columns: 1fr;
          }

          .questionTop {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {screen === "home" && (
        <div className="card">
          <img src="/images/portada.png" alt="Portada" className="heroImage" />

          <div className="section">
            <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
              Nivel
            </label>
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
            {rankingTop10.length === 0 ? (
              <div style={{ color: "#6b7280" }}>Todavía no hay partidas guardadas.</div>
            ) : (
              rankingTop10.map((entry, idx) => (
                <div key={entry.id} className="scoreItem">
                  <span>
                    <span className="rankBadge">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`}
                    </span>
                    <strong>{entry.name}</strong>
                  </span>
                  <span>
                    {entry.score ?? 0} · {entry.quesitos ?? 0} 🧩
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {screen === "quiz" && currentQuestion && (
        <div className="card">
          <div className="questionTop">
            <div className="questionRow">
              <strong>
                Pregunta {current + 1} / {roundQuestions.length}
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
                {current + 1 >= roundQuestions.length ? "Ver resumen" : "Siguiente"}
              </button>
            ) : (
              <div />
            )}
          </div>

          <div className="chips">
            <span className="chip">
              {CATEGORY_CONFIG[currentQuestion.category].icon} {CATEGORY_CONFIG[currentQuestion.category].label}
            </span>
            <span className="chip">Nivel {currentQuestion.difficulty}</span>
            <span className="chip">Puntuación total {progress.totalScore || 0}</span>
          </div>

          <div className="grid" style={{ marginTop: 16 }}>
            <img
              src={`/images/${currentQuestion.image}.jpg`}
              alt={cleanQuestionText(currentQuestion.question)}
              className="questionImage"
            />

            <div>
              <h2 className="questionTitle">
                {cleanQuestionText(currentQuestion.question)}
              </h2>

              <div className="options">
                {currentQuestion.options.map((opt, idx) => {
                  let className = "option";
                  if (locked && idx === currentQuestion.correctIndex) className += " correct";
                  if (locked && selected === idx && idx !== currentQuestion.correctIndex) className += " wrong";

                  return (
                    <button
                      key={idx}
                      className={className}
                      onClick={() => answer(idx)}
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
