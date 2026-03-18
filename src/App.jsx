import React, { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import questionsData from "./data/questions.json";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "./config/categories";
import {
  emptyProgress,
  loadProgress,
  resetProgress,
  saveProgress,
} from "./services/progressStorage";

const QUESTION_TIME = 7;
const QUESTIONS_PER_CATEGORY = 2;
const TOTAL_QUESTIONS = CATEGORY_ORDER.length * QUESTIONS_PER_CATEGORY;

const scoresCollection = collection(db, "scores");

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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
    Object.entries(correctByCategory).map(([category, hits]) => [
      category,
      hits >= 5,
    ])
  );
}

import { loadUsedQuestions, saveUsedQuestions } from "../services/progressStorage";

export function buildRoundQuestions(allQuestions, difficulty) {
  const used = loadUsedQuestions();

  const perCategory = CATEGORY_ORDER.flatMap((category) => {
    let pool = allQuestions.filter(
      (q) => q.category === category && q.difficulty === difficulty
    );

    // quitar usadas
    let unused = pool.filter((q) => !used.includes(q.id));

    // si no hay suficientes, reiniciar esa categoría
    if (unused.length < 2) {
      unused = pool;
    }

    return shuffle(unused).slice(0, 2);
  });

  const selected = shuffle(perCategory);

  // guardar como usadas
  const newUsed = [...used, ...selected.map((q) => q.id)];
  saveUsedQuestions(newUsed);

  return selected.map(shuffleQuestionOptions);
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
      beep(640, 0.12);
      setTimeout(() => beep(820, 0.1), 90);
    },
    error: () => beep(220, 0.16, "sawtooth"),
    final: () => {
      beep(520, 0.12);
      setTimeout(() => beep(660, 0.12), 120);
      setTimeout(() => beep(880, 0.18), 240);
    },
  };
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [difficulty, setDifficulty] = useState(1);
  const [roundQuestions, setRoundQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [progress, setProgress] = useState(emptyProgress);
  const [playerName, setPlayerName] = useState("");
  const [savedScores, setSavedScores] = useState([]);
  const [savingScore, setSavingScore] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const sounds = useGameSounds(soundEnabled);
  const currentQuestion = roundQuestions[currentIndex];

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  useEffect(() => {
    async function loadScores() {
      try {
        const snapshot = await getDocs(scoresCollection);
        const rows = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort(
            (a, b) =>
              new Date(b.createdAt || b.date || 0) -
              new Date(a.createdAt || a.date || 0)
          )
          .slice(0, 10);
        setSavedScores(rows);
      } catch (error) {
        console.error("Error cargando puntuaciones:", error);
      }
    }

    loadScores();
  }, []);

  const timerWidth = `${(timeLeft / QUESTION_TIME) * 100}%`;

  let timerColor = "#22c55e";
  if (timeLeft <= 4) timerColor = "#f59e0b";
  if (timeLeft <= 2) timerColor = "#ef4444";

  const wedges = useMemo(
    () => getEarnedWedges(progress.correctByCategory),
    [progress.correctByCategory]
  );

  const roundCorrect = useMemo(() => {
    return roundQuestions.reduce((acc, q) => {
      const hit = progress.history.find(
        (h) => h.roundQuestionId === q.id && h.roundAt === q._roundAt
      );
      return acc + (hit?.correct ? 1 : 0);
    }, 0);
  }, [roundQuestions, progress.history]);

  const startRound = (difficultyValue, keepProgress) => {
    const nextProgress = keepProgress ? loadProgress() : resetProgress();
    setProgress(nextProgress);
    setDifficulty(difficultyValue);

    const roundAt = new Date().toISOString();
    const prepared = buildRoundQuestions(questionsData.questions, difficultyValue).map(
      (q) => ({ ...q, _roundAt: roundAt })
    );

    setRoundQuestions(prepared);
    setCurrentIndex(0);
    setSelected(null);
    setLocked(false);
    setTimeLeft(QUESTION_TIME);
    setSaveMessage("");
    setScreen("quiz");
  };

  const finishGame = () => {
    sounds.final();
    setScreen("summary");
  };

  const applyAnswer = (isCorrect) => {
    if (!currentQuestion) return;

    const category = currentQuestion.category;

    const nextProgress = {
      ...progress,
      totalScore: progress.totalScore + (isCorrect ? 1 : 0),
      correctByCategory: {
        ...progress.correctByCategory,
        [category]: progress.correctByCategory[category] + (isCorrect ? 1 : 0),
      },
      history: [
        {
          id: currentQuestion.id,
          roundQuestionId: currentQuestion.id,
          roundAt: currentQuestion._roundAt,
          category,
          difficulty: currentQuestion.difficulty,
          correct: isCorrect,
          at: new Date().toISOString(),
        },
        ...progress.history,
      ].slice(0, 100),
    };

    nextProgress.wedges = getEarnedWedges(nextProgress.correctByCategory);

    setProgress(nextProgress);
    saveProgress(nextProgress);
  };

  const answer = (index) => {
    if (locked || !currentQuestion) return;

    const isCorrect = index === currentQuestion.correctIndex;

    setSelected(index);
    setLocked(true);

    if (isCorrect) {
      sounds.correct();
    } else {
      sounds.error();
    }

    applyAnswer(isCorrect);
  };

  const nextQuestion = () => {
    setSelected(null);
    setLocked(false);

    if (currentIndex + 1 >= roundQuestions.length) {
      finishGame();
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setTimeLeft(QUESTION_TIME);
  };

const saveMatchToFirebase = async () => {
  const trimmedName = playerName.trim();

  if (!trimmedName) {
    setSaveMessage("Escribe un nombre para guardar la partida.");
    return;
  }

  setSavingScore(true);
  setSaveMessage("");

  try {
    const normalizedHistory = (progress.history || []).slice(0, 100).map((item) => ({
      id: Number(item.id),
      roundQuestionId: Number(item.roundQuestionId ?? item.id),
      roundAt: String(item.roundAt ?? item.at ?? new Date().toISOString()),
      category: String(item.category),
      difficulty:
        typeof item.difficulty === "number"
          ? item.difficulty
          : item.difficulty === "facil"
            ? 1
            : item.difficulty === "medio"
              ? 2
              : item.difficulty === "dificil"
                ? 3
                : Number(difficulty),
      correct: Boolean(item.correct),
      at: String(item.at ?? new Date().toISOString()),
    }));

    const payload = {
      name: trimmedName,
      score: Number(progress.totalScore || 0),
      difficulty: Number(difficulty),
      totalQuestions: 12,
      roundScore: Number(
        roundQuestions.reduce((acc, q) => {
          const hit = normalizedHistory.find(
            (h) => h.roundQuestionId === q.id && h.roundAt === q._roundAt
          );
          return acc + (hit?.correct ? 1 : 0);
        }, 0)
      ),
      correctByCategory: {
        personajes: Number(progress.correctByCategory?.personajes || 0),
        lugares: Number(progress.correctByCategory?.lugares || 0),
        frases: Number(progress.correctByCategory?.frases || 0),
        liturgia: Number(progress.correctByCategory?.liturgia || 0),
        objetos: Number(progress.correctByCategory?.objetos || 0),
        piedad_tradiciones: Number(progress.correctByCategory?.piedad_tradiciones || 0),
      },
      wedges: {
        personajes: Boolean(progress.wedges?.personajes),
        lugares: Boolean(progress.wedges?.lugares),
        frases: Boolean(progress.wedges?.frases),
        liturgia: Boolean(progress.wedges?.liturgia),
        objetos: Boolean(progress.wedges?.objetos),
        piedad_tradiciones: Boolean(progress.wedges?.piedad_tradiciones),
      },
      history: normalizedHistory,
      createdAt: new Date().toISOString(),
    };

    await addDoc(scoresCollection, payload);

    const snapshot = await getDocs(scoresCollection);
    const rows = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.date || 0) -
          new Date(a.createdAt || a.date || 0)
      )
      .slice(0, 10);

    setSavedScores(rows);
    setSaveMessage("Partida guardada correctamente.");
  } catch (error) {
    console.error("Error guardando partida:", error);
    setSaveMessage(`No se pudo guardar la partida en Firebase. ${error?.message || ""}`);
  } finally {
    setSavingScore(false);
  }
};

  useEffect(() => {
    if (screen !== "quiz" || locked || !currentQuestion) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setLocked(true);
          sounds.error();
          applyAnswer(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, locked, currentIndex, currentQuestion]);

  return (
    <div className="appShell">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; background: #fff7ed; }
        button, input { font: inherit; }

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

        .topbar {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-bottom: 12px;
          flex-wrap: wrap;
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

        .heroImage {
          width: 100%;
          border-radius: 18px;
          display: block;
        }

        .levels {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 18px;
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

        .wedge {
          font-size: 1.2rem;
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

        .saveCard, .scoresCard {
          margin-top: 18px;
          text-align: left;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 16px;
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

        @media (max-width: 900px) {
          .levels, .grid {
            grid-template-columns: 1fr;
          }

          .questionTop {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="topbar">
        <button className="btn btnGhost" onClick={() => setSoundEnabled((v) => !v)}>
          {soundEnabled ? "🔊 Sonido" : "🔇 Silencio"}
        </button>
      </div>

      {screen === "home" && (
        <div className="card">
          <img src="/images/portada.png" alt="Portada" className="heroImage" />

          <h2>Elige dificultad</h2>

          <div className="levels">
            <button className="btn btnPrimary" onClick={() => startRound(1, true)}>Fácil</button>
            <button className="btn btnPrimary" onClick={() => startRound(2, true)}>Medio</button>
            <button className="btn btnPrimary" onClick={() => startRound(3, true)}>Difícil</button>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <button className="btn btnGhost" onClick={() => startRound(1, true)}>
              Continuar progreso
            </button>
            <button className="btn btnGhost" onClick={() => startRound(1, false)}>
              Empezar de cero
            </button>
          </div>

          <div style={{ marginTop: 18 }}>
            <strong>Quesitos:</strong>
            <div className="chips">
              {CATEGORY_ORDER.map((key) => (
                <span className="chip" key={key}>
                  <span className="wedge">{wedges[key] ? "🧩" : "◻️"}</span> {CATEGORY_CONFIG[key].icon} {CATEGORY_CONFIG[key].label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {screen === "quiz" && currentQuestion && (
        <div className="card">
          <div className="questionTop">
            <div className="questionRow">
              <strong>Pregunta {currentIndex + 1} / {TOTAL_QUESTIONS}</strong>
              <div className="timeBarTrack">
                <div
                  className="timeBarFill"
                  style={{ width: timerWidth, background: timerColor }}
                />
              </div>
            </div>

            {locked ? (
              <button className="btn btnPrimary" onClick={nextQuestion}>
                {currentIndex + 1 >= roundQuestions.length ? "Ver resumen" : "Siguiente"}
              </button>
            ) : (
              <div />
            )}
          </div>

          <div className="chips">
            <span className="chip">
              {CATEGORY_CONFIG[currentQuestion.category].icon}{" "}
              {CATEGORY_CONFIG[currentQuestion.category].label}
            </span>
            <span className="chip">Nivel {currentQuestion.difficulty}</span>
            <span className="chip">Puntuación total {progress.totalScore}</span>
          </div>

          <div className="grid" style={{ marginTop: 16 }}>
            <img
              src={`/images/${currentQuestion.image}.jpg`}
              alt={currentQuestion.question}
              className="questionImage"
            />

            <div>
              <h2>{currentQuestion.question}</h2>
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
          <h2>Resumen de progreso</h2>

          <p><strong>Puntuación total:</strong> {progress.totalScore}</p>

          <h3>Aciertos por categoría</h3>
          <div className="summaryGrid">
            {CATEGORY_ORDER.map((key) => (
              <div key={key}>
                {CATEGORY_CONFIG[key].icon} {CATEGORY_CONFIG[key].label}:{" "}
                {progress.correctByCategory[key]} aciertos
                {progress.wedges?.[key] ? " · 🧩 Quesito conseguido" : ""}
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: 18 }}>Historial básico</h3>
          <div className="summaryGrid">
            {progress.history.slice(0, 12).map((item) => (
              <div key={`${item.id}-${item.at}`}>
                {CATEGORY_CONFIG[item.category].icon} {CATEGORY_CONFIG[item.category].label} ·
                {" "}nivel {item.difficulty} · {item.correct ? "✅" : "❌"}
              </div>
            ))}
          </div>

          <div className="saveCard">
            <div style={{ fontWeight: 800 }}>Guardar partida en Firebase</div>
            <div style={{ color: "#6b7280", marginTop: 6 }}>
              Guarda puntuación total, aciertos por categoría, quesitos e historial básico.
            </div>
            <div className="saveRow">
              <input
                className="saveInput"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Nombre del jugador"
              />
              <button className="btn btnPrimary" onClick={saveMatchToFirebase} disabled={savingScore}>
                {savingScore ? "Guardando..." : "Guardar"}
              </button>
            </div>
            {saveMessage && <div style={{ marginTop: 10 }}>{saveMessage}</div>}
          </div>

          <div className="scoresCard">
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Últimas partidas</div>
            {savedScores.length === 0 ? (
              <div style={{ color: "#6b7280" }}>Todavía no hay partidas guardadas.</div>
            ) : (
              savedScores.map((entry) => (
                <div key={entry.id} className="scoreItem">
                  <span>
                    <strong>{entry.name}</strong> · dificultad {entry.difficulty}
                  </span>
                  <span>{entry.roundScore ?? entry.score} pts</span>
                </div>
              ))
            )}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
            <button className="btn btnPrimary" onClick={() => setScreen("home")}>
              Volver al inicio
            </button>
            <button className="btn btnGhost" onClick={() => startRound(difficulty, true)}>
              Jugar otra partida
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
