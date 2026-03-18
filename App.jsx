import React, { useEffect, useMemo, useRef, useState } from "react";
import { initializeApp } from "firebase/app";
import { addDoc, collection, getDocs, getFirestore } from "firebase/firestore";

const QUESTION_TIME = 7;

const LEVEL_LABELS = {
  facil: "Fácil",
  medio: "Medio",
  dificil: "Difícil",
};

const firebaseConfig = {
   apiKey: "AIzaSyB3HryH0Mg996QV0HUdaxYox4ah5xDnYJM",
  authDomain: "semana-santa-f9967.firebaseapp.com",
  projectId: "semana-santa-f9967",
  storageBucket: "semana-santa-f9967.firebasestorage.app",
  messagingSenderId: "85757700422",
  appId: "1:85757700422:web:7b762e3a9ac9be34c3dd47",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const scoresCollection = collection(db, "scores");

const QUESTIONS = [
  { id: 1, text: "¿Qué celebración aparece en esta escena?", options: ["La Última Cena", "La Resurrección", "La Ascensión", "Pentecostés"], correctAnswer: 0, difficulty: "facil", image: "/images/1.jpg" },
  { id: 2, text: "¿Cuántos discípulos estaban con Jesús en la Última Cena?", options: ["10", "12", "7", "15"], correctAnswer: 1, difficulty: "facil", image: "/images/1.jpg" },
  { id: 3, text: "¿Qué alimento parte Jesús en la Última Cena?", options: ["Pan", "Pescado", "Cordero", "Fruta"], correctAnswer: 0, difficulty: "facil", image: "/images/1.jpg" },
  { id: 4, text: "¿Dónde reza Jesús antes de ser arrestado?", options: ["Monte Tabor", "Huerto de Getsemaní", "Nazaret", "Jerusalén"], correctAnswer: 1, difficulty: "facil", image: "/images/2.jpg" },
  { id: 5, text: "¿Qué hacen los discípulos mientras Jesús reza?", options: ["Hablan", "Duermen", "Comen", "Huyen"], correctAnswer: 1, difficulty: "facil", image: "/images/2.jpg" },
  { id: 6, text: "¿Qué está haciendo Jesús en esta escena?", options: ["Predicando", "Rezando", "Caminando", "Comiendo"], correctAnswer: 1, difficulty: "facil", image: "/images/2.jpg" },
  { id: 7, text: "¿Ante quién comparece Jesús en esta escena?", options: ["Herodes", "Pilato", "Caifás", "Pedro"], correctAnswer: 1, difficulty: "facil", image: "/images/3.jpg" },
  { id: 8, text: "¿Qué autoridad juzga a Jesús?", options: ["Romana", "Griega", "Egipcia", "Persa"], correctAnswer: 0, difficulty: "facil", image: "/images/3.jpg" },
  { id: 9, text: "¿Qué lleva Jesús sobre sus hombros?", options: ["Una cruz", "Una espada", "Una corona", "Un estandarte"], correctAnswer: 0, difficulty: "facil", image: "/images/4.jpg" },
  { id: 10, text: "¿Hacia dónde se dirige Jesús con la cruz?", options: ["Nazaret", "Calvario", "Belén", "Cafarnaúm"], correctAnswer: 1, difficulty: "facil", image: "/images/4.jpg" },
  { id: 11, text: "¿A quién encuentra Jesús en el camino al Calvario según la tradición?", options: ["Su madre", "Juan Bautista", "Herodes", "Un sacerdote"], correctAnswer: 0, difficulty: "facil", image: "/images/5.jpg" },
  { id: 12, text: "¿Cómo se llama este camino tradicionalmente?", options: ["Camino de Santiago", "Vía Crucis", "Camino Real", "Sendero Santo"], correctAnswer: 1, difficulty: "facil", image: "/images/5.jpg" },
  { id: 13, text: "¿Dónde muere Jesús?", options: ["En una cruz", "En un templo", "En una casa", "En un barco"], correctAnswer: 0, difficulty: "facil", image: "/images/6.jpg" },
  { id: 14, text: "¿Cuántas cruces aparecen normalmente en esta escena?", options: ["Dos", "Tres", "Cuatro", "Cinco"], correctAnswer: 1, difficulty: "facil", image: "/images/6.jpg" },
  { id: 15, text: "¿Qué están haciendo con el cuerpo de Jesús?", options: ["Lo están enterrando", "Lo están bajando de la cruz", "Lo están coronando", "Lo están llevando a Roma"], correctAnswer: 1, difficulty: "facil", image: "/images/7.jpg" },
  { id: 16, text: "¿Cómo se llama este momento?", options: ["Descendimiento", "Ascensión", "Bautismo", "Transfiguración"], correctAnswer: 0, difficulty: "facil", image: "/images/7.jpg" },
  { id: 17, text: "¿Dónde colocan el cuerpo de Jesús?", options: ["En una tumba", "En el templo", "En el río", "En una cueva"], correctAnswer: 0, difficulty: "facil", image: "/images/8.jpg" },
  { id: 18, text: "¿Qué cerraba la entrada del sepulcro?", options: ["Una puerta", "Una gran piedra", "Un muro", "Una cortina"], correctAnswer: 1, difficulty: "facil", image: "/images/8.jpg" },
  { id: 19, text: "¿Quién aparece junto al sepulcro vacío?", options: ["Un ángel", "Un soldado", "Pedro", "Pilato"], correctAnswer: 0, difficulty: "facil", image: "/images/9.jpg" },
  { id: 20, text: "¿Quién se encuentra con Jesús resucitado?", options: ["María Magdalena", "María y Marta", "Verónica", "Salomé"], correctAnswer: 0, difficulty: "facil", image: "/images/10.jpg" },

  { id: 21, text: "¿Qué sacramento instituye Jesús en la Última Cena?", options: ["Bautismo", "Eucaristía", "Confirmación", "Matrimonio"], correctAnswer: 1, difficulty: "medio", image: "/images/1.jpg" },
  { id: 22, text: "¿Qué bebida comparte Jesús con sus discípulos?", options: ["Agua", "Vino", "Leche", "Aceite"], correctAnswer: 1, difficulty: "medio", image: "/images/1.jpg" },
  { id: 23, text: "¿Qué fiesta judía celebraban durante esta cena?", options: ["Pentecostés", "Pascua", "Hanukkah", "Yom Kippur"], correctAnswer: 1, difficulty: "medio", image: "/images/1.jpg" },
  { id: 24, text: "¿Qué discípulo acompañan más de cerca a Jesús en Getsemaní?", options: ["Pedro, Santiago y Juan", "Mateo, Tomás y Andrés", "Felipe, Bartolomé y Judas", "Simón, Judas y Mateo"], correctAnswer: 0, difficulty: "medio", image: "/images/2.jpg" },
  { id: 25, text: "¿Qué pidió Jesús al Padre en su oración?", options: ["Poder", "Gloria", "Que se hiciera su voluntad", "Riquezas"], correctAnswer: 2, difficulty: "medio", image: "/images/2.jpg" },
  { id: 26, text: "¿Qué gobernaba Pilato en Judea?", options: ["El ejército", "El imperio romano", "El templo", "La sinagoga"], correctAnswer: 1, difficulty: "medio", image: "/images/3.jpg" },
  { id: 27, text: "¿Qué preso fue liberado en lugar de Jesús?", options: ["Barrabás", "Herodes", "Simón", "Caifás"], correctAnswer: 0, difficulty: "medio", image: "/images/3.jpg" },
  { id: 28, text: "¿Quién ayudó a Jesús a llevar la cruz?", options: ["Simón de Cirene", "Pedro", "Juan", "Andrés"], correctAnswer: 0, difficulty: "medio", image: "/images/4.jpg" },
  { id: 29, text: "¿Qué mujeres lloraban al ver a Jesús?", options: ["Las mujeres de Jerusalén", "Las romanas", "Las fariseas", "Las samaritanas"], correctAnswer: 0, difficulty: "medio", image: "/images/4.jpg" },
  { id: 30, text: "¿Qué mujer secó el rostro de Jesús según la tradición?", options: ["Verónica", "Magdalena", "Salomé", "Marta"], correctAnswer: 0, difficulty: "medio", image: "/images/5.jpg" },
  { id: 31, text: "¿Qué signo se colocó sobre la cruz de Jesús?", options: ["INRI", "XP", "IHS", "ALFA"], correctAnswer: 0, difficulty: "medio", image: "/images/6.jpg" },
  { id: 32, text: "¿Quién estaba junto a Jesús en las otras cruces?", options: ["Dos ladrones", "Dos soldados", "Dos discípulos", "Dos sacerdotes"], correctAnswer: 0, difficulty: "medio", image: "/images/6.jpg" },
  { id: 33, text: "¿Quién pidió el cuerpo de Jesús para enterrarlo?", options: ["José de Arimatea", "Pedro", "Herodes", "Barrabás"], correctAnswer: 0, difficulty: "medio", image: "/images/7.jpg" },
  { id: 34, text: "¿Qué discípulo ayudó también en el entierro?", options: ["Nicodemo", "Mateo", "Tomás", "Felipe"], correctAnswer: 0, difficulty: "medio", image: "/images/7.jpg" },
  { id: 35, text: "¿De qué material estaba excavado el sepulcro?", options: ["Roca", "Madera", "Arena", "Arcilla"], correctAnswer: 0, difficulty: "medio", image: "/images/8.jpg" },
  { id: 36, text: "¿Qué día fue enterrado Jesús?", options: ["Viernes", "Domingo", "Lunes", "Miércoles"], correctAnswer: 0, difficulty: "medio", image: "/images/8.jpg" },
  { id: 37, text: "¿Qué anuncia el ángel en el sepulcro?", options: ["Que Jesús ha resucitado", "Que Jesús dormía", "Que Jesús partió", "Que Jesús regresará luego"], correctAnswer: 0, difficulty: "medio", image: "/images/9.jpg" },
  { id: 38, text: "¿Qué mujeres fueron al sepulcro?", options: ["María Magdalena y otras mujeres", "Solo María", "Las romanas", "Las discípulas"], correctAnswer: 0, difficulty: "medio", image: "/images/9.jpg" },
  { id: 39, text: "¿Qué día ocurrió la resurrección?", options: ["Domingo", "Viernes", "Jueves", "Sábado"], correctAnswer: 0, difficulty: "medio", image: "/images/10.jpg" },
  { id: 40, text: "¿Qué reconoce María Magdalena al ver a Jesús?", options: ["Que está vivo", "Que es un ángel", "Que es Pedro", "Que es un soldado"], correctAnswer: 0, difficulty: "medio", image: "/images/10.jpg" },

  { id: 41, text: "¿Qué gesto de servicio realizó Jesús durante la Última Cena?", options: ["Lavó los pies a los discípulos", "Curó a un enfermo", "Multiplicó panes", "Resucitó a Lázaro"], correctAnswer: 0, difficulty: "dificil", image: "/images/1.jpg" },
  { id: 42, text: "¿Quién traicionó a Jesús?", options: ["Judas Iscariote", "Pedro", "Juan", "Santiago"], correctAnswer: 0, difficulty: "dificil", image: "/images/1.jpg" },
  { id: 43, text: "¿Qué nuevo mandamiento dio Jesús en la Última Cena?", options: ["Amaos unos a otros", "Conquistad el mundo", "Construid templos", "Haced sacrificios"], correctAnswer: 0, difficulty: "dificil", image: "/images/1.jpg" },
  { id: 44, text: "¿Qué discípulo cortó la oreja de un soldado?", options: ["Pedro", "Juan", "Tomás", "Felipe"], correctAnswer: 0, difficulty: "dificil", image: "/images/2.jpg" },
  { id: 45, text: "¿Cómo se llamaba el soldado cuya oreja fue cortada?", options: ["Malco", "Lucas", "Cayo", "Tito"], correctAnswer: 0, difficulty: "dificil", image: "/images/2.jpg" },
  { id: 46, text: "¿Qué pregunta famosa hizo Pilato a Jesús?", options: ["¿Qué es la verdad?", "¿Quién eres?", "¿Dónde naciste?", "¿Quién te envía?"], correctAnswer: 0, difficulty: "dificil", image: "/images/3.jpg" },
  { id: 47, text: "¿Qué gesto hizo Pilato para mostrar que no era responsable?", options: ["Se lavó las manos", "Se arrodilló", "Rasgó sus vestiduras", "Escribió una carta"], correctAnswer: 0, difficulty: "dificil", image: "/images/3.jpg" },
  { id: 48, text: "¿Cuántas caídas de Jesús recuerda la tradición del Vía Crucis?", options: ["Tres", "Dos", "Cinco", "Cuatro"], correctAnswer: 0, difficulty: "dificil", image: "/images/4.jpg" },
  { id: 49, text: "¿Cómo se llama el monte donde fue crucificado Jesús?", options: ["Gólgota", "Tabor", "Carmelo", "Hermón"], correctAnswer: 0, difficulty: "dificil", image: "/images/4.jpg" },
  { id: 50, text: "¿Qué frase dirige Jesús a las mujeres de Jerusalén?", options: ["No lloréis por mí", "Seguidme", "Escuchadme", "Esperad aquí"], correctAnswer: 0, difficulty: "dificil", image: "/images/5.jpg" },
  { id: 51, text: "¿Qué dijo Jesús al buen ladrón?", options: ["Hoy estarás conmigo en el Paraíso", "Te perdono", "Te salvaré", "Ven conmigo"], correctAnswer: 0, difficulty: "dificil", image: "/images/6.jpg" },
  { id: 52, text: "¿Qué palabras finales pronunció Jesús según el evangelio de Juan?", options: ["Todo está cumplido", "Padre ayúdame", "Tengo sed", "Venid a mí"], correctAnswer: 0, difficulty: "dificil", image: "/images/6.jpg" },
  { id: 53, text: "¿Cómo se llama la escena de María con Jesús muerto en brazos?", options: ["La Piedad", "La Gloria", "La Misericordia", "La Esperanza"], correctAnswer: 0, difficulty: "dificil", image: "/images/7.jpg" },
  { id: 54, text: "¿Qué tela envolvió el cuerpo de Jesús?", options: ["Una sábana", "Un manto púrpura", "Un velo", "Una túnica"], correctAnswer: 0, difficulty: "dificil", image: "/images/7.jpg" },
  { id: 55, text: "¿Qué especias llevaron al sepulcro?", options: ["Mirra y áloe", "Canela y miel", "Aceite y sal", "Incienso y vino"], correctAnswer: 0, difficulty: "dificil", image: "/images/8.jpg" },
  { id: 56, text: "¿Qué soldados vigilaban el sepulcro?", options: ["Romanos", "Judíos", "Griegos", "Egipcios"], correctAnswer: 0, difficulty: "dificil", image: "/images/8.jpg" },
  { id: 57, text: "¿Qué dice el ángel a las mujeres?", options: ["No está aquí, ha resucitado", "Está dormido", "Volverá mañana", "Buscad en otro lugar"], correctAnswer: 0, difficulty: "dificil", image: "/images/9.jpg" },
  { id: 58, text: "¿Qué sucede con la piedra del sepulcro?", options: ["Está removida", "Está rota", "Está sellada", "Está enterrada"], correctAnswer: 0, difficulty: "dificil", image: "/images/9.jpg" },
  { id: 59, text: "¿Qué palabra hebrea dice María Magdalena al reconocer a Jesús?", options: ["Rabbuní", "Hosanna", "Amen", "Shalom"], correctAnswer: 0, difficulty: "dificil", image: "/images/10.jpg" },
  { id: 60, text: "¿Qué significa Rabbuní?", options: ["Maestro", "Rey", "Señor", "Padre"], correctAnswer: 0, difficulty: "dificil", image: "/images/10.jpg" },
];

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickTen(level) {
  return shuffle(QUESTIONS.filter((q) => q.difficulty === level)).slice(0, 10);
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

  const beep = (freq, dur = 0.1) => {
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "triangle";
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  };

  return {
    correct: () => beep(640, 0.12),
    error: () => beep(220, 0.14),
    final: () => {
      beep(480, 0.1);
      setTimeout(() => beep(620, 0.14), 120);
    },
    tick: () => beep(900, 0.04),
  };
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [level, setLevel] = useState("facil");
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [presentationMode, setPresentationMode] = useState(false);
  const [flash, setFlash] = useState(null);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [savedScores, setSavedScores] = useState([]);
  const [savingScore, setSavingScore] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const sounds = useGameSounds(soundEnabled);
  const q = questions[current];
  const timerValue = `${(timeLeft / QUESTION_TIME) * 100}%`;

  let timerColor = "#22c55e";
  if (timeLeft <= 4) timerColor = "#f59e0b";
  if (timeLeft <= 2) timerColor = "#ef4444";

  const medal = useMemo(() => {
    if (score >= 9) return "🥇";
    if (score >= 7) return "🥈";
    if (score >= 5) return "🥉";
    return "🎖️";
  }, [score]);

  useEffect(() => {
    async function loadScores() {
      try {
        const snapshot = await getDocs(scoresCollection);
        const rows = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 10);
        setSavedScores(rows);
      } catch (error) {
        console.error("Error cargando puntuaciones:", error);
      }
    }
    loadScores();
  }, []);

  const startGame = (lvl) => {
    setLevel(lvl);
    setQuestions(pickTen(lvl));
    setCurrent(0);
    setSelected(null);
    setLocked(false);
    setScore(0);
    setTimeLeft(QUESTION_TIME);
    setFlash(null);
    setShowSavePanel(false);
    setSaveMessage("");
    setScreen("quiz");
  };

  const finishGame = () => {
    sounds.final();
    setShowSavePanel(true);
    setScreen("results");
  };

  const nextQuestion = () => {
    setFlash(null);
    setSelected(null);
    setLocked(false);

    if (current + 1 >= questions.length) {
      finishGame();
      return;
    }

    setCurrent((prev) => prev + 1);
    setTimeLeft(QUESTION_TIME);
  };

  const answer = (index) => {
    if (!q || locked) return;
    const isCorrect = index === q.correctAnswer;
    setSelected(index);
    setLocked(true);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setFlash("correct");
      sounds.correct();
    } else {
      setFlash("wrong");
      sounds.error();
    }
  };

  const saveScore = async () => {
    const trimmedName = playerName.trim();
    if (!trimmedName) {
      setSaveMessage("Escribe un nombre para guardar la puntuación.");
      return;
    }

    setSavingScore(true);
    setSaveMessage("");

    try {
      const payload = {
        name: trimmedName,
        score: Number(score),
        difficulty: level === "facil" ? "fácil" : level === "medio" ? "medio" : "difícil",
        date: new Date().toISOString(),
      };

      await addDoc(scoresCollection, payload);

      const snapshot = await getDocs(scoresCollection);
      const rows = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);

      setSavedScores(rows);
      setShowSavePanel(false);
      setSaveMessage("Puntuación guardada correctamente.");
    } catch (error) {
      console.error("Error guardando puntuación:", error);
      const message = error?.message || "No se pudo guardar en Firebase.";
      setSaveMessage(`No se pudo guardar en Firebase. ${message}`);
    } finally {
      setSavingScore(false);
    }
  };

  useEffect(() => {
    if (screen !== "quiz" || !q || locked) return undefined;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setLocked(true);
          setFlash("wrong");
          sounds.error();
          return 0;
        }
        if (prev <= 3) sounds.tick();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, current, locked, q]);

  return (
    <div className={`appShell ${flash || ""}`}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; background: #fff7ed; }
        button, input { font: inherit; }
        .appShell { min-height: 100vh; padding: 16px; transition: background .25s ease; background: #fff7ed; }
        .appShell.correct { background: #ecfdf5; }
        .appShell.wrong { background: #fef2f2; }

        .topbar {
          max-width: 1100px;
          margin: 0 auto 14px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .toolBtn, .levelBtn, .actionBtn, .nextBtn, .saveBtn {
          border: none;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 700;
        }

        .toolBtn {
          background: white;
          padding: 12px 16px;
          box-shadow: 0 6px 18px rgba(0,0,0,.08);
        }

        .hero {
          max-width: 900px;
          margin: 24px auto;
          text-align: center;
        }

        .heroCard {
          overflow: hidden;
          border-radius: 22px;
          box-shadow: 0 14px 34px rgba(0,0,0,.18);
        }

        .heroCard img {
          width: 100%;
          display: block;
        }

        .levels {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 22px;
        }

        .levelBtn {
          background: white;
          padding: 22px;
          box-shadow: 0 10px 24px rgba(0,0,0,.08);
        }

        .levelTitle {
          display: block;
          font-size: 1.35rem;
        }

        .quiz {
          max-width: 1120px;
          margin: 18px auto;
          background: white;
          border-radius: 24px;
          padding: 20px;
          box-shadow: 0 16px 40px rgba(0,0,0,.08);
        }

        .quiz.present {
          max-width: 1280px;
          padding: 28px;
        }

        .metaRow {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .metaGroup {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .pill {
          background: #f3f4f6;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: .95rem;
          font-weight: 700;
        }

        .topStatus {
          display: grid;
          grid-template-columns: minmax(0,1fr) auto;
          gap: 12px;
          align-items: end;
          margin: 0 0 16px;
        }

        .questionTimeBlock {
          display: grid;
          gap: 8px;
        }

        .questionTimeRow {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .questionCount {
          font-weight: 700;
          color: #374151;
          white-space: nowrap;
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

        .simpleNextWrap {
          display: flex;
          justify-content: flex-end;
          align-items: end;
          min-width: 160px;
        }

        .simpleNextPlaceholder {
          min-width: 160px;
          height: 52px;
        }

        .quizGrid {
          display: grid;
          grid-template-columns: 1.05fr .95fr;
          gap: 22px;
          align-items: start;
        }

        .quiz.present .quizGrid {
          grid-template-columns: 1fr;
        }

        .questionImage {
          width: 100%;
          border-radius: 18px;
          display: block;
          background: #f3f4f6;
          object-fit: cover;
          max-height: 520px;
        }

        .quiz.present .questionImage {
          max-height: 46vh;
        }

        .questionPanel h2 {
          margin: 6px 0 18px;
          font-size: clamp(1.45rem, 2.5vw, 2.6rem);
          line-height: 1.15;
        }

        .quiz.present .questionPanel h2 {
          font-size: clamp(2rem, 4vw, 3.6rem);
        }

        .options {
          display: grid;
          gap: 12px;
        }

        .quiz.present .options {
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .optionBtn {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 18px;
          padding: 16px 18px;
          display: flex;
          gap: 14px;
          align-items: center;
          text-align: left;
          cursor: pointer;
        }

        .optionBtn:hover {
          border-color: #f59e0b;
          background: #fffbeb;
        }

        .optionBtn:disabled {
          opacity: .88;
          cursor: default;
        }

        .optionBtn.correctAnswer {
          border-color: #22c55e;
          background: #ecfdf5;
        }

        .optionBtn.wrongAnswer {
          border-color: #ef4444;
          background: #fef2f2;
        }

        .quiz.present .optionBtn {
          min-height: 92px;
          font-size: 1.25rem;
          padding: 20px;
        }

        .optionKey {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          background: #f3f4f6;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          flex: 0 0 auto;
        }

        .quiz.present .optionKey {
          width: 56px;
          height: 56px;
          font-size: 1.4rem;
        }

        .feedbackPanel {
          margin-top: 18px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          padding: 16px;
          border-radius: 18px;
          background: #f9fafb;
        }

        .nextBtn, .saveBtn, .actionBtn {
          background: linear-gradient(135deg, #f59e0b, #ea580c);
          color: white;
          padding: 14px 18px;
        }

        .results {
          max-width: 900px;
          margin: 34px auto;
          text-align: center;
          background: white;
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 16px 40px rgba(0,0,0,.08);
        }

        .results h1 {
          font-size: 4rem;
          margin: 0;
        }

        .results h2 {
          font-size: 2.2rem;
          margin: 8px 0;
        }

        .results p {
          color: #6b7280;
        }

        .actions {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .saveCard, .scoresCard {
          max-width: 520px;
          margin: 18px auto 0;
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
          .levels, .quizGrid, .quiz.present .options {
            grid-template-columns: 1fr;
          }

          .topStatus {
            grid-template-columns: 1fr;
            align-items: stretch;
          }

          .questionTimeRow {
            align-items: stretch;
          }

          .simpleNextWrap, .simpleNextPlaceholder {
            min-width: 0;
            width: 100%;
          }

          .quiz.present .optionBtn {
            min-height: unset;
            font-size: 1.05rem;
          }
        }
      `}</style>

      <div className="topbar">
        <button className="toolBtn" onClick={() => setSoundEnabled((v) => !v)}>
          {soundEnabled ? "🔊 Sonido" : "🔇 Silencio"}
        </button>
        <button className="toolBtn" onClick={() => setPresentationMode((v) => !v)}>
          {presentationMode ? "🖥️ Modo normal" : "🎥 Modo presentación"}
        </button>
      </div>

      {screen === "home" && (
        <div className="hero">
          <div className="heroCard">
            <img src="/images/portada.png" alt="Portada Semana Santa" />
          </div>

          <div className="levels">
            {Object.entries(LEVEL_LABELS).map(([key, label]) => (
              <button key={key} className="levelBtn" onClick={() => startGame(key)}>
                <span className="levelTitle">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {screen === "quiz" && q && (
        <div className={`quiz ${presentationMode ? "present" : ""}`}>
          <div className="metaRow">
            <div className="metaGroup">
              <span className="pill">Nivel {LEVEL_LABELS[level]}</span>
            </div>
            <div className="metaGroup">
              <span className="pill">Puntuación {score}</span>
            </div>
          </div>

          <div className="topStatus">
            <div className="questionTimeBlock">
              <div className="questionTimeRow">
                <span className="questionCount">
                  Pregunta {current + 1} / {questions.length}
                </span>

                <div className="timeBarTrack">
                  <div
                    className="timeBarFill"
                    style={{
                      width: timerValue,
                      background: timerColor,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="simpleNextWrap">
              {locked ? (
                <button className="nextBtn" onClick={nextQuestion}>
                  {current + 1 >= questions.length ? "Ver resultado" : "Siguiente"}
                </button>
              ) : (
                <div className="simpleNextPlaceholder" />
              )}
            </div>
          </div>

          <div className="quizGrid">
            <div>
              <img className="questionImage" src={q.image} alt={q.text} />
            </div>

            <div className="questionPanel">
              <h2>{q.text}</h2>
              <div className="options">
                {q.options.map((option, index) => {
                  const isCorrectOption = locked && index === q.correctAnswer;
                  const isWrongSelected = locked && selected === index && index !== q.correctAnswer;
                  const className = `optionBtn${isCorrectOption ? " correctAnswer" : ""}${isWrongSelected ? " wrongAnswer" : ""}`;

                  return (
                    <button
                      key={index}
                      className={className}
                      onClick={() => answer(index)}
                      disabled={locked}
                    >
                      <span className="optionKey">{String.fromCharCode(65 + index)}</span>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {locked && (
            <div className="feedbackPanel">
              <div>
                {selected === null
                  ? `⌛ Tiempo agotado. La respuesta correcta es: ${q.options[q.correctAnswer]}`
                  : selected === q.correctAnswer
                    ? "✅ ¡Correcta!"
                    : `❌ La respuesta correcta es: ${q.options[q.correctAnswer]}`}
              </div>
            </div>
          )}
        </div>
      )}

      {screen === "results" && (
        <div className="results">
          <h1>{medal}</h1>
          <h2>{score}/10</h2>
          <p>
            {score >= 9
              ? "¡Excelente!"
              : score >= 7
                ? "Muy buen resultado"
                : score >= 5
                  ? "Buen trabajo"
                  : "Puedes volver a intentarlo"}
          </p>

          {showSavePanel && (
            <div className="saveCard">
              <div style={{ fontWeight: 800 }}>Guardar puntuación</div>
              <div style={{ color: "#6b7280", marginTop: 6 }}>
                Escribe el nombre del jugador para guardar los puntos en Firebase.
              </div>
              <div className="saveRow">
                <input
                  className="saveInput"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Nombre del jugador"
                />
                <button className="saveBtn" onClick={saveScore} disabled={savingScore}>
                  {savingScore ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          )}

          {saveMessage && <p>{saveMessage}</p>}

          <div className="scoresCard">
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Últimas puntuaciones</div>
            {savedScores.length === 0 ? (
              <div style={{ color: "#6b7280" }}>Todavía no hay puntuaciones guardadas.</div>
            ) : (
              savedScores.map((entry) => (
                <div key={entry.id} className="scoreItem">
                  <span>
                    <strong>{entry.name}</strong> · {entry.difficulty || LEVEL_LABELS[entry.level] || entry.level}
                  </span>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span>{entry.score}/10</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="actions">
            <button className="actionBtn" onClick={() => startGame(level)}>
              Jugar otra vez
            </button>
            <button className="actionBtn" onClick={() => setScreen("home")}>
              Cambiar nivel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
