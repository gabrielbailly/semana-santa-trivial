import React, { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "./firebase";
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
const MAX_QUESTIONS = 12;

const scoresCollection = collection(db, "scores");

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

function buildQuestions(difficulty, selectedCategories) {
  const used = loadUsedQuestions();

  const cats =
    selectedCategories.length > 0 ? selectedCategories : CATEGORY_ORDER;

  const target = selectedCategories.length === 1 ? 6 : 12;

  let pool = questionsData.questions.filter(
    (q) =>
      q.difficulty === difficulty &&
      (selectedCategories.length === 0 || cats.includes(q.category))
  );

  let unused = pool.filter((q) => !used.includes(q.id));
  if (unused.length < target) unused = pool;

  let selected = shuffle(unused).slice(0, target);

  // eliminar duplicados
  const unique = [...new Map(selected.map((q) => [q.id, q])).values()];

  saveUsedQuestions([...used, ...unique.map((q) => q.id)]);

  return unique.map((q) => {
    const options = q.options.map((o, i) => ({
      text: o,
      correct: i === q.correctIndex,
    }));
    const shuffled = shuffle(options);

    return {
      ...q,
      options: shuffled.map((o) => o.text),
      correctIndex: shuffled.findIndex((o) => o.correct),
    };
  });
}

function useSounds(enabled) {
  const ctxRef = useRef(null);

  const beep = (f) => {
    if (!enabled) return;
    const ctx =
      ctxRef.current ||
      new (window.AudioContext || window.webkitAudioContext)();
    ctxRef.current = ctx;

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.value = 0.1;
    o.start();
    o.stop(ctx.currentTime + 0.1);
  };

  return {
    ok: () => beep(700),
    ko: () => beep(200),
    end: () => {
      beep(500);
      setTimeout(() => beep(800), 100);
    },
  };
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [difficulty, setDifficulty] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [time, setTime] = useState(QUESTION_TIME);
  const [progress, setProgress] = useState(emptyProgress);
  const [hasProgress, setHasProgress] = useState(false);
  const [name, setName] = useState("");
  const [ranking, setRanking] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const sounds = useSounds(true);
  const q = questions[i];

  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
    setHasProgress(p.history.length > 0);
  }, []);

  useEffect(() => {
    const load = async () => {
      const qy = query(scoresCollection, orderBy("score", "desc"), limit(10));
      const snap = await getDocs(qy);
      setRanking(snap.docs.map((d) => d.data()));
    };
    load();
  }, []);

  const start = (keep) => {
    const p = keep ? loadProgress() : resetProgress();
    if (!keep) resetUsedQuestions();

    setProgress(p);
    setQuestions(buildQuestions(difficulty, selectedCategories));
    setI(0);
    setLocked(false);
    setSelected(null);
    setTime(QUESTION_TIME);
    setScreen("quiz");
  };

  const answer = (idx) => {
    if (locked) return;

    const ok = idx === q.correctIndex;
    setSelected(idx);
    setLocked(true);

    ok ? sounds.ok() : sounds.ko();

    const next = {
      ...progress,
      totalScore: progress.totalScore + (ok ? 1 : 0),
    };

    setProgress(next);
    saveProgress(next);
  };

  const next = () => {
    if (i + 1 >= questions.length) {
      sounds.end();
      setScreen("end");
      return;
    }
    setI(i + 1);
    setLocked(false);
    setSelected(null);
    setTime(QUESTION_TIME);
  };

  const save = async () => {
    if (!name.trim()) return setMsg("Escribe un nombre");

    setSaving(true);

    try {
      await addDoc(scoresCollection, {
        name,
        score: progress.totalScore,
        difficulty,
        createdAt: new Date().toISOString(), // ✅ FIX FECHA
      });

      setMsg("Guardado ✔");
    } catch (e) {
      setMsg("Error al guardar");
    }

    setSaving(false);
  };

  useEffect(() => {
    if (screen !== "quiz" || locked) return;

    const t = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          setLocked(true);
          sounds.ko();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [screen, i, locked]);

  const width = `${(time / QUESTION_TIME) * 100}%`;

  let color = "#22c55e";
  if (time <= 4) color = "#f59e0b";
  if (time <= 2) color = "#ef4444";

  return (
    <div style={{ padding: 20 }}>
      {screen === "home" && (
        <>
          <img
            src="/images/portada.png"
            style={{ width: "100%", maxHeight: 260, objectFit: "contain" }}
          />

          <select onChange={(e) => setDifficulty(Number(e.target.value))}>
            <option value={1}>Fácil</option>
            <option value={2}>Medio</option>
            <option value={3}>Difícil</option>
          </select>

          <div style={{ marginTop: 20 }}>
            {!hasProgress ? (
              <button onClick={() => start(false)}>Jugar</button>
            ) : (
              <>
                <button onClick={() => start(true)}>Continuar partida</button>
                <button onClick={() => start(false)}>Nueva partida</button>
              </>
            )}
          </div>

          <h3>Ranking Top 10</h3>
          {ranking.map((r, idx) => (
            <div key={idx}>
              {idx + 1}. {r.name} - {r.score}
            </div>
          ))}
        </>
      )}

      {screen === "quiz" && q && (
        <>
          <div>
            Pregunta {i + 1}/{questions.length}
            <div style={{ height: 8, background: "#ddd" }}>
              <div style={{ width, height: 8, background: color }} />
            </div>
          </div>

          <img src={`/images/${q.image}.jpg`} width="100%" />

          <h2>{q.question}</h2>

          {q.options.map((o, idx) => (
            <button
              key={idx}
              onClick={() => answer(idx)}
              disabled={locked}
              style={{
                display: "block",
                margin: 5,
                background:
                  locked && idx === q.correctIndex
                    ? "#22c55e"
                    : locked && idx === selected
                    ? "#ef4444"
                    : "white",
              }}
            >
              {o}
            </button>
          ))}

          {locked && <button onClick={next}>Siguiente</button>}
        </>
      )}

      {screen === "end" && (
        <>
          <h1>{progress.totalScore}</h1>

          <h3>Guardar partida</h3>
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <button onClick={save} disabled={saving}>
            Guardar
          </button>

          <p>{msg}</p>

          <button onClick={() => setScreen("home")}>Inicio</button>
        </>
      )}
    </div>
  );
}
