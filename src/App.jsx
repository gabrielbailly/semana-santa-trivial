import React, { useEffect, useMemo, useState } from "react";
import questionsData from "./data/questions.json";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "./config/categories";
import { buildRoundQuestions, getEarnedWedges } from "./utils/gameLogic";
import {
  emptyProgress,
  loadProgress,
  saveProgress,
  resetProgress,
} from "./services/progressStorage";

const QUESTION_TIME = 7;

export default function App() {
  const [screen, setScreen] = useState("home");
  const [difficulty, setDifficulty] = useState(1);
  const [roundQuestions, setRoundQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);

  const [progress, setProgress] = useState(emptyProgress);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const currentQuestion = roundQuestions[currentIndex];
  const timerWidth = `${(timeLeft / QUESTION_TIME) * 100}%`;

  let timerColor = "#22c55e";
  if (timeLeft <= 4) timerColor = "#f59e0b";
  if (timeLeft <= 2) timerColor = "#ef4444";

  const wedges = useMemo(
    () => getEarnedWedges(progress.correctByCategory),
    [progress.correctByCategory]
  );

  const startRound = (difficultyValue, keepProgress = true) => {
    const nextProgress = keepProgress ? loadProgress() : resetProgress();
    setProgress(nextProgress);
    setDifficulty(difficultyValue);
    setRoundQuestions(buildRoundQuestions(questionsData.questions, difficultyValue));
    setCurrentIndex(0);
    setSelected(null);
    setLocked(false);
    setTimeLeft(QUESTION_TIME);
    setScreen("quiz");
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
          category,
          difficulty: currentQuestion.difficulty,
          correct: isCorrect,
          at: new Date().toISOString(),
        },
        ...progress.history,
      ].slice(0, 40),
    };

    nextProgress.wedges = getEarnedWedges(nextProgress.correctByCategory);

    setProgress(nextProgress);
    saveProgress(nextProgress);
  };

  const answer = (index) => {
    if (locked || !currentQuestion) return;
    const ok = index === currentQuestion.correctIndex;
    setSelected(index);
    setLocked(true);
    applyAnswer(ok);
  };

  const nextQuestion = () => {
    if (currentIndex + 1 >= roundQuestions.length) {
      setScreen("summary");
      return;
    }
    setCurrentIndex((v) => v + 1);
    setSelected(null);
    setLocked(false);
    setTimeLeft(QUESTION_TIME);
  };

  useEffect(() => {
    if (screen !== "quiz" || locked || !currentQuestion) return;

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setLocked(true);
          applyAnswer(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, locked, currentIndex, currentQuestion]);

  return (
    <div className="app">
      <style>{`
        body { margin: 0; font-family: system-ui; background: #fff7ed; }
        .app { max-width: 1100px; margin: 0 auto; padding: 20px; }
        .card { background: white; border-radius: 22px; padding: 20px; box-shadow: 0 16px 40px rgba(0,0,0,.08); }
        .levels { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-top: 18px; }
        .btn { border: none; border-radius: 14px; padding: 14px 18px; font-weight: 700; cursor: pointer; }
        .btnPrimary { background: linear-gradient(135deg,#f59e0b,#ea580c); color: white; }
        .btnGhost { background: white; border: 1px solid #e5e7eb; }
        .questionTop { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; margin-bottom: 16px; }
        .questionRow { display: flex; align-items: center; gap: 12px; }
        .timeBarTrack { flex: 1; height: 10px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
        .timeBarFill { height: 100%; transition: width .25s linear, background .25s ease; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .options { display: grid; gap: 10px; }
        .option { border: 2px solid #e5e7eb; border-radius: 14px; padding: 14px; background: white; cursor: pointer; text-align: left; }
        .option.correct { background: #ecfdf5; border-color: #22c55e; }
        .option.wrong { background: #fef2f2; border-color: #ef4444; }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .chip { background: #f3f4f6; border-radius: 999px; padding: 6px 10px; font-size: .9rem; }
        .wedge { font-size: 1.5rem; }
        .summaryGrid { display: grid; gap: 10px; }
        @media (max-width: 900px) {
          .levels, .grid { grid-template-columns: 1fr; }
          .questionTop { grid-template-columns: 1fr; }
        }
      `}</style>

      {screen === "home" && (
        <div className="card">
          <img src="/images/portada.png" alt="" style={{ width: "100%", borderRadius: 18 }} />
          <div className="chips">
            {CATEGORY_ORDER.map((key) => (
              <span className="chip" key={key}>
                {CATEGORY_CONFIG[key].icon} {CATEGORY_CONFIG[key].label}
              </span>
            ))}
          </div>

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
                  <span className="wedge">{wedges[key] ? "🧩" : "◻️"}</span> {CATEGORY_CONFIG[key].icon}
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
              <strong>Pregunta {currentIndex + 1} / 12</strong>
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
              {CATEGORY_CONFIG[currentQuestion.category].icon} {CATEGORY_CONFIG[currentQuestion.category].label}
            </span>
            <span className="chip">Nivel {currentQuestion.difficulty}</span>
            <span className="chip">Puntuación total {progress.totalScore}</span>
          </div>

          <div className="grid" style={{ marginTop: 16 }}>
            <img
              src={`/images/${currentQuestion.image}.jpg`}
              alt=""
              style={{ width: "100%", borderRadius: 18, objectFit: "cover" }}
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
                {CATEGORY_CONFIG[key].icon} {CATEGORY_CONFIG[key].label}: {progress.correctByCategory[key]} aciertos
                {progress.wedges?.[key] ? " · 🧩 Quesito conseguido" : ""}
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: 18 }}>Historial básico</h3>
          <div className="summaryGrid">
            {progress.history.slice(0, 12).map((item) => (
              <div key={`${item.id}-${item.at}`}>
                {CATEGORY_CONFIG[item.category].icon} {CATEGORY_CONFIG[item.category].label} ·
                {" "}nivel {item.difficulty} ·
                {" "}{item.correct ? "✅" : "❌"}
              </div>
            ))}
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
