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
const scoresCollection = collection(db, "scores");

// ---------- helpers ----------
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getEarnedWedges(correctByCategory) {
  return Object.fromEntries(
    Object.entries(correctByCategory).map(([k, v]) => [k, v >= 5])
  );
}

function buildRoundQuestions(all, difficulty, selectedCategories) {
  const used = loadUsedQuestions();

  const categories =
    selectedCategories.length > 0 ? selectedCategories : CATEGORY_ORDER;

  const target =
    selectedCategories.length === 0
      ? 12
      : selectedCategories.length === 1
      ? 6
      : 12;

  let selected = categories.flatMap((cat) => {
    const pool = all.filter(
      (q) => q.category === cat && Number(q.difficulty) === Number(difficulty)
    );

    let unused = pool.filter((q) => !used.includes(q.id));
    if (unused.length < 2) unused = pool;

    return shuffle(unused).slice(0, 2);
  });

  selected = [...new Map(selected.map((q) => [q.id, q])).values()];

  const round = shuffle(selected).slice(0, target);

  saveUsedQuestions([...used, ...round.map((q) => q.id)]);

  return round;
}

// ---------- sonidos ----------
function useGameSounds(enabled) {
  const beep = (freq) => {
    if (!enabled) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };

  return {
    correct: () => beep(800),
    error: () => beep(200),
    final: () => {
      beep(400);
      setTimeout(() => beep(600), 120);
      setTimeout(() => beep(900), 240);
    },
  };
}

// ---------- APP ----------
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
  const [playerName, setPlayerName] = useState("");
  const [scores, setScores] = useState([]);

  const sounds = useGameSounds(true);
  const q = questions[current];

  // ---------- cargar ranking ----------
  useEffect(() => {
    loadScores();
  }, []);

  async function loadScores() {
    const snap = await getDocs(scoresCollection);
    setScores(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  const ranking = useMemo(
    () => [...scores].sort((a, b) => b.score - a.score).slice(0, 10),
    [scores]
  );

  // ---------- UI helpers ----------
  const timerWidth = `${(timeLeft / QUESTION_TIME) * 100}%`;
  let timerColor =
    timeLeft > 4 ? "#22c55e" : timeLeft > 2 ? "#f59e0b" : "#ef4444";

  // ---------- game ----------
  function startGame(reset) {
    if (reset) resetUsedQuestions();

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

  function answer(i) {
    if (locked) return;

    const ok = i === q.correctIndex;

    setSelected(i);
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
    const quesitos = Object.values(progress.wedges || {}).filter(Boolean).length;

    await addDoc(scoresCollection, {
      name: playerName,
      score: progress.totalScore,
      nivel: difficulty,
      quesitos,
      createdAt: serverTimestamp(),
    });

    loadScores();
  }

  // ---------- timer ----------
  useEffect(() => {
    if (screen !== "quiz" || locked) return;

    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setLocked(true);
          sounds.error();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [screen, locked, current]);

  return (
    <div className="app">
      <style>{`
        * { box-sizing: border-box; }

        body {
          margin: 0;
          font-family: system-ui, sans-serif;
          background: #fff7ed;
        }

        .app {
          max-width: 1000px;
          margin: auto;
          padding: 20px;
        }

        .card {
          background: white;
          padding: 20px;
          border-radius: 20px;
          box-shadow: 0 12px 30px rgba(0,0,0,.08);
        }

        img {
          border-radius: 16px;
        }

        /* ---------- selectors ---------- */

        .selectorsRow {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 16px;
          margin-top: 20px;
        }

        select {
          padding: 10px;
          border-radius: 10px;
          border: 1px solid #ddd;
        }

        /* ---------- chips ---------- */

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .chip {
          padding: 8px 12px;
          border-radius: 999px;
          border: 2px solid #e5e7eb;
          cursor: pointer;
          transition: all .2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .chip:hover {
          background: #fffbeb;
          border-color: #f59e0b;
        }

        .chip.active {
          background: linear-gradient(135deg, #f59e0b, #ea580c);
          color: white;
          border: none;
        }

        /* ---------- buttons ---------- */

        button {
          border: none;
          border-radius: 12px;
          padding: 12px 14px;
          font-weight: 700;
          cursor: pointer;
          background: #f59e0b;
          color: white;
        }

        button:hover {
          opacity: 0.9;
        }

        /* ---------- timer ---------- */

        .timeBar {
          height: 8px;
          background: #e5e7eb;
          border-radius: 10px;
          overflow: hidden;
          margin-top: 6px;
        }

        .timeFill {
          height: 100%;
          transition: width .25s linear, background .25s;
        }

        /* ---------- ranking ---------- */

        .rankingItem {
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }

        .rankingItem:last-child {
          border-bottom: none;
        }

        /* ---------- responsive ---------- */

        @media (max-width: 700px) {
          .selectorsRow {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* HOME */}
      {screen === "home" && (
        <div className="card">
          <img src="/images/portada.png" style={{ width: "100%", maxHeight: 260, objectFit: "contain" }} />

          <div className="selectorsRow">
            <select onChange={(e) => setDifficulty(Number(e.target.value))}>
              <option value={1}>Fácil</option>
              <option value={2}>Medio</option>
              <option value={3}>Difícil</option>
            </select>

            <div className="chips">
              {CATEGORY_ORDER.map((c) => {
                const active = selectedCategories.includes(c);
                return (
                  <div
                    key={c}
                    className={`chip ${active ? "active" : ""}`}
                    onClick={() =>
                      setSelectedCategories((prev) =>
                        active ? prev.filter((x) => x !== c) : [...prev, c]
                      )
                    }
                  >
                    {CATEGORY_CONFIG[c].icon} {CATEGORY_CONFIG[c].label}
                  </div>
                );
              })}
            </div>
          </div>

          <button style={{ marginTop: 16 }} onClick={() => startGame(true)}>
            Jugar
          </button>

          <h3 style={{ marginTop: 20 }}>🏆 Top 10</h3>
          {ranking.map((r, i) => (
            <div key={r.id} className="rankingItem">
              {i + 1}. {r.name} — {r.score} pts ({r.quesitos} 🧩)
              <br />
              <small>
                {r.createdAt?.toDate?.().toLocaleDateString() || ""}
              </small>
            </div>
          ))}
        </div>
      )}

      {/* QUIZ */}
      {screen === "quiz" && q && (
        <div className="card">
          <strong>
            Pregunta {current + 1} / {questions.length}
          </strong>

          <div className="timeBar">
            <div
              className="timeFill"
              style={{ width: timerWidth, background: timerColor }}
            />
          </div>

          <img src={`/images/${q.image}.jpg`} width="100%" />

          <h2>{q.question}</h2>

          {q.options.map((o, i) => (
            <button key={i} onClick={() => answer(i)} disabled={locked}>
              {o}
            </button>
          ))}

          {locked && (
            <button style={{ marginTop: 10 }} onClick={nextQuestion}>
              Siguiente
            </button>
          )}
        </div>
      )}

      {/* SUMMARY */}
      {screen === "summary" && (
        <div className="card">
          <h2>{progress.totalScore} puntos</h2>

          <input
            placeholder="Nombre"
            onChange={(e) => setPlayerName(e.target.value)}
          />

          <button onClick={saveScore}>Guardar partida</button>

          <button onClick={() => setScreen("home")}>Inicio</button>
        </div>
      )}
    </div>
  );
}
