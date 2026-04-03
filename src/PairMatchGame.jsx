import React, { useEffect, useMemo, useRef, useState } from "react";

const GAME_SETS = [
  {
    id: "set1",
    title: "Juego 1",
    pairs: [
      { id: "s1p1", personaje: "Jesús en la cruz", frase: '"Padre, perdónalos, porque no saben lo que hacen"' },
      { id: "s1p2", personaje: "Buen ladrón Dimas", frase: '"Acuérdate de mí cuando llegues a tu Reino"' },
      { id: "s1p3", personaje: "Mal ladrón Gestas", frase: '"Si tú eres el Mesías, sálvate a ti mismo"' },
      { id: "s1p4", personaje: "Pilato ante el pueblo", frase: '"Aquí tenéis al hombre"' },
      { id: "s1p5", personaje: "Centurión del Calvario", frase: '"Verdaderamente este hombre era Hijo de Dios"' },
      { id: "s1p6", personaje: "Tomás apóstol", frase: '"Señor mío y Dios mío"' },
      { id: "s1p7", personaje: "Ángel del sepulcro", frase: '"No está aquí, ha resucitado"' },
      { id: "s1p8", personaje: "María Magdalena en el huerto", frase: '"Se han llevado del sepulcro al Señor"' },
      { id: "s1p9", personaje: "Pedro en el patio", frase: '"No conozco a ese hombre"' },
      { id: "s1p10", personaje: "Caifás sumo sacerdote", frase: '"Ha blasfemado"' },
      { id: "s1p11", personaje: "Judas arrepentido", frase: '"He pecado entregando sangre inocente"' },
      { id: "s1p12", personaje: "Jesús resucitado en el cenáculo", frase: '"La paz con vosotros"' },
      { id: "s1p13", personaje: "Jesús al buen ladrón", frase: '"Hoy estarás conmigo en el paraíso"' },
      { id: "s1p14", personaje: "Jesús a su madre", frase: '"Mujer, ahí tienes a tu hijo"' },
      { id: "s1p15", personaje: "Jesús con sed", frase: '"Tengo sed"' },
      { id: "s1p16", personaje: "Jesús al final", frase: '"Todo está cumplido"' },
      { id: "s1p17", personaje: "Jesús al morir", frase: '"Padre, en tus manos encomiendo mi espíritu"' },
      { id: "s1p18", personaje: "Pilato al lavarse las manos", frase: '"Soy inocente de la sangre de este justo"' },
      { id: "s1p19", personaje: "Pedro en la segunda negación", frase: '"No soy de los suyos"' },
      { id: "s1p20", personaje: "Jesús en el arresto", frase: '"Con un beso entregas al Hijo del Hombre"' },
    ],
  },
  {
    id: "set2",
    title: "Juego 2",
    pairs: [
      { id: "s2p1", personaje: "Jesús ante Pilato", frase: '"Mi reino no es de este mundo"' },
      { id: "s2p2", personaje: "Pilato en el pretorio", frase: '"¿Qué es la verdad?"' },
      { id: "s2p3", personaje: "Caifás en el Sanedrín", frase: '"Es reo de muerte"' },
      { id: "s2p4", personaje: "Soldados del pretorio", frase: '"Salve, rey de los judíos"' },
      { id: "s2p5", personaje: "Judas con los sacerdotes", frase: '"¿Qué me queréis dar y yo os lo entregaré?"' },
      { id: "s2p6", personaje: "Pedro tras la pesca", frase: '"Señor, tú lo sabes todo"' },
      { id: "s2p7", personaje: "Jesús en Getsemaní", frase: '"Velad y orad para no caer en tentación"' },
      { id: "s2p8", personaje: "Jesús en oración", frase: '"Hágase tu voluntad"' },
      { id: "s2p9", personaje: "Ángel a las mujeres", frase: '"¿Por qué buscáis entre los muertos al que vive?"' },
      { id: "s2p10", personaje: "María Magdalena al reconocerle", frase: '"¡Rabbuní!"' },
      { id: "s2p11", personaje: "Jesús resucitado a Magdalena", frase: '"No me retengas"' },
      { id: "s2p12", personaje: "Jesús resucitado en Galilea", frase: '"Id por todo el mundo"' },
      { id: "s2p13", personaje: "Jesús ante Caifás", frase: '"Desde ahora veréis al Hijo del Hombre sentado a la derecha del Poder"' },
      { id: "s2p14", personaje: "Criada del patio a Pedro", frase: '"También tú estabas con Jesús el galileo"' },
      { id: "s2p15", personaje: "Jesús en la cena (mandamiento)", frase: '"Amaos unos a otros como yo os he amado"' },
      { id: "s2p16", personaje: "Buen ladrón arrepentido", frase: '"Nosotros lo hemos merecido, este no ha hecho nada malo"' },
      { id: "s2p17", personaje: "Centurión después de la muerte", frase: '"Realmente este era Hijo de Dios"' },
      { id: "s2p18", personaje: "Pilato sobre Jesús", frase: '"No encuentro culpa en este hombre"' },
      { id: "s2p19", personaje: "Jesús sobre su misión", frase: '"Yo para esto he nacido"' },
      { id: "s2p20", personaje: "Jesús a Pedro en la cena", frase: '"No cantará el gallo antes que me niegues tres veces"' },
    ],
  },
  {
    id: "set3",
    title: "Juego 3",
    pairs: [
      { id: "s3p1", personaje: "Jesús al partir el pan", frase: '"Tomad y comed, esto es mi cuerpo"' },
      { id: "s3p2", personaje: "Jesús al dar el cáliz", frase: '"Tomad y bebed, esta es mi sangre"' },
      { id: "s3p3", personaje: "Jesús en la cena (anuncio)", frase: '"Uno de vosotros me va a entregar"' },
      { id: "s3p4", personaje: "Jesús a Pedro (aviso)", frase: '"Antes que cante el gallo me negarás tres veces"' },
      { id: "s3p5", personaje: "Pedro en la cena", frase: '"Aunque todos te abandonen, yo no"' },
      { id: "s3p6", personaje: "Pilato al título de la cruz", frase: '"Lo escrito, escrito está"' },
      { id: "s3p7", personaje: "Multitud ante Pilato", frase: '"¡Crucifícalo!"' },
      { id: "s3p8", personaje: "Jesús a las mujeres de Jerusalén", frase: '"No lloréis por mí"' },
      { id: "s3p9", personaje: "Jesús en el clamor final", frase: '"Dios mío, Dios mío, ¿por qué me has abandonado?"' },
      { id: "s3p10", personaje: "José de Arimatea a Pilato", frase: '"Dame el cuerpo de Jesús"' },
      { id: "s3p11", personaje: "Ángel en la mañana de Pascua", frase: '"No tengáis miedo"' },
      { id: "s3p12", personaje: "Jesús resucitado a las mujeres", frase: '"Alegraos"' },
      { id: "s3p13", personaje: "Jesús resucitado a Tomás", frase: '"Dichosos los que creen sin haber visto"' },
      { id: "s3p14", personaje: "Pedro en el arresto", frase: '"Señor, ¿herimos con la espada?"' },
      { id: "s3p15", personaje: "Siervo del sumo sacerdote", frase: '"¿No te vi yo en el huerto con él?"' },
      { id: "s3p16", personaje: "Sanedrín de madrugada", frase: '"¿Qué necesidad tenemos ya de testigos?"' },
      { id: "s3p17", personaje: "Pilato a Jesús en el juicio", frase: '"¿No oyes de cuántas cosas te acusan?"' },
      { id: "s3p18", personaje: "Jesús en memoria de la cena", frase: '"Haced esto en memoria mía"' },
      { id: "s3p19", personaje: "Jesús en oración sacerdotal", frase: '"Padre, glorifica a tu Hijo"' },
      { id: "s3p20", personaje: "Jesús al Padre por sus discípulos", frase: '"No ruego solo por ellos, sino también por los que crean"' },
    ],
  },
];

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function validateGameSets(sets) {
  const globalCharacters = new Map();
  const globalPhrases = new Map();

  for (const setItem of sets) {
    const setCharacters = new Set();
    const setPhrases = new Set();

    for (const pair of setItem.pairs) {
      const characterKey = normalizeKey(pair.personaje);
      const phraseKey = normalizeKey(pair.frase);

      if (setCharacters.has(characterKey)) {
        throw new Error(`Personaje repetido en ${setItem.title}: ${pair.personaje}`);
      }
      if (setPhrases.has(phraseKey)) {
        throw new Error(`Frase repetida en ${setItem.title}: ${pair.frase}`);
      }

      if (globalCharacters.has(characterKey)) {
        const previousSet = globalCharacters.get(characterKey);
        throw new Error(`Personaje repetido entre sets (${previousSet} y ${setItem.title}): ${pair.personaje}`);
      }
      if (globalPhrases.has(phraseKey)) {
        const previousSet = globalPhrases.get(phraseKey);
        throw new Error(`Frase repetida entre sets (${previousSet} y ${setItem.title}): ${pair.frase}`);
      }

      setCharacters.add(characterKey);
      setPhrases.add(phraseKey);
      globalCharacters.set(characterKey, setItem.title);
      globalPhrases.set(phraseKey, setItem.title);
    }
  }
}

validateGameSets(GAME_SETS);

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function useGameSounds(enabled = true) {
  const ctxRef = useRef(null);

  const getCtx = () => {
    if (!enabled || typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctxRef.current) ctxRef.current = new AudioCtx();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };

  const beep = (freq, dur = 0.12, type = "triangle") => {
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
      setTimeout(() => beep(920, 0.1), 90);
    },
    error: () => beep(220, 0.16, "sawtooth"),
    final: () => {
      beep(500, 0.12);
      setTimeout(() => beep(700, 0.12), 120);
      setTimeout(() => beep(900, 0.16), 240);
    },
  };
}

export default function PairMatchGame({ onBack }) {
  const [selectedSetId, setSelectedSetId] = useState(null);
  const [round, setRound] = useState(0);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedPhrase, setSelectedPhrase] = useState(null);
  const [matchedIds, setMatchedIds] = useState([]);
  const [message, setMessage] = useState("");
  const [moves, setMoves] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const sounds = useGameSounds(soundEnabled);
  const finishedRef = useRef(false);

  const activeSet = useMemo(
    () => GAME_SETS.find((setItem) => setItem.id === selectedSetId) || null,
    [selectedSetId]
  );

  const activePairs = activeSet?.pairs || [];

  const shuffledCharacters = useMemo(
    () => shuffle(activePairs.map((pair) => ({ id: pair.id, label: pair.personaje }))),
    [round, activePairs]
  );

  const shuffledPhrases = useMemo(
    () => shuffle(activePairs.map((pair) => ({ id: pair.id, label: pair.frase }))),
    [round, activePairs]
  );

  const completed = activePairs.length > 0 && matchedIds.length === activePairs.length;

  useEffect(() => {
    if (completed && !finishedRef.current) {
      sounds.final();
      finishedRef.current = true;
    }
    if (!completed && finishedRef.current) {
      finishedRef.current = false;
    }
  }, [completed, sounds]);

  function selectSet(nextSetId) {
    setSelectedSetId(nextSetId);
    setRound(0);
    setSelectedCharacter(null);
    setSelectedPhrase(null);
    setMatchedIds([]);
    setMessage("");
    setMoves(0);
    finishedRef.current = false;
  }

  function resetGame() {
    setRound((value) => value + 1);
    setSelectedCharacter(null);
    setSelectedPhrase(null);
    setMatchedIds([]);
    setMessage("");
    setMoves(0);
    finishedRef.current = false;
  }

  function tryMatch(nextCharacter, nextPhrase) {
    if (!nextCharacter || !nextPhrase) return;

    setMoves((value) => value + 1);

    if (nextCharacter.id === nextPhrase.id) {
      if (!matchedIds.includes(nextCharacter.id)) {
        setMatchedIds((prev) => [...prev, nextCharacter.id]);
      }
      setMessage("Muy bien. Esa pareja es correcta.");
      sounds.correct();
      setSelectedCharacter(null);
      setSelectedPhrase(null);
    } else {
      setMessage("No coinciden. Prueba otra vez.");
      sounds.error();
      setTimeout(() => {
        setSelectedCharacter(null);
        setSelectedPhrase(null);
      }, 380);
    }
  }

  function handleCharacterClick(item) {
    if (matchedIds.includes(item.id)) return;
    if (selectedCharacter?.id === item.id) {
      setSelectedCharacter(null);
      return;
    }

    const nextCharacter = item;
    setSelectedCharacter(nextCharacter);
    tryMatch(nextCharacter, selectedPhrase);
  }

  function handlePhraseClick(item) {
    if (matchedIds.includes(item.id)) return;
    if (selectedPhrase?.id === item.id) {
      setSelectedPhrase(null);
      return;
    }

    const nextPhrase = item;
    setSelectedPhrase(nextPhrase);
    tryMatch(selectedCharacter, nextPhrase);
  }

  return (
    <div className="pairGameCard">
      <style>{`
        .pairGameCard {
          max-width: 1080px;
          margin: 18px auto;
          background: white;
          border-radius: 24px;
          padding: 18px;
          box-shadow: 0 16px 40px rgba(0,0,0,.08);
        }

        .pairTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .pairTitle {
          margin: 0;
          font-size: 1.35rem;
        }

        .pairMeta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .pairPill {
          background: #f3f4f6;
          border-radius: 999px;
          padding: 6px 10px;
          font-weight: 700;
          font-size: .9rem;
        }

        .soundToggle {
          border: 1px solid #d1d5db;
          border-radius: 999px;
          background: white;
          padding: 6px 10px;
          cursor: pointer;
          font-weight: 700;
          font-size: .9rem;
        }

        .setPicker {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }

        .setBtn {
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #f59e0b, #ea580c);
          color: white;
          font-weight: 800;
          padding: 14px;
          cursor: pointer;
        }

        .setBtn.active {
          outline: 3px solid #fdba74;
          outline-offset: 1px;
        }

        .pairHelp {
          color: #6b7280;
          margin: 0 0 14px;
        }

        .pairGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 14px;
        }

        .pairCol {
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 16px;
          padding: 12px;
          max-height: 62vh;
          overflow: auto;
        }

        .pairCol h3 {
          margin: 0 0 10px;
        }

        .pairBtn {
          width: 100%;
          text-align: left;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          background: white;
          padding: 10px 12px;
          margin-bottom: 8px;
          cursor: pointer;
          font-weight: 600;
        }

        .pairBtn.selected {
          border-color: #f59e0b;
          background: #fffbeb;
        }

        .pairBtn.matched {
          border-color: #22c55e;
          background: #ecfdf5;
          color: #166534;
          cursor: default;
        }

        .pairPhraseText {
          font-style: italic;
        }

        .pairBottom {
          margin-top: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .pairMsg {
          color: #374151;
          font-weight: 700;
          min-height: 24px;
        }

        .pairActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .pairActionBtn {
          border: none;
          border-radius: 12px;
          padding: 10px 14px;
          cursor: pointer;
          font-weight: 700;
          background: #111827;
          color: white;
        }

        .pairActionBtn.secondary {
          background: white;
          color: #111827;
          border: 1px solid #d1d5db;
        }

        @media (max-width: 860px) {
          .pairGameCard {
            padding: 12px;
          }

          .pairGrid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 8px;
          }

          .pairCol {
            padding: 8px;
            max-height: 58vh;
          }

          .pairCol h3 {
            font-size: .95rem;
          }

          .pairBtn {
            padding: 9px 8px;
            font-size: .88rem;
            line-height: 1.2;
          }

          .pairHelp {
            font-size: .9rem;
            margin-bottom: 10px;
          }

          .pairTitle {
            font-size: 1.08rem;
          }
        }
      `}</style>

      <div className="pairTop">
        <h2 className="pairTitle">Unir parejas: personaje y frase</h2>
        <div className="pairMeta">
          {activeSet && <span className="pairPill">Aciertos: {matchedIds.length}/{activePairs.length}</span>}
          {activeSet && <span className="pairPill">Intentos: {moves}</span>}
          <button className="soundToggle" onClick={() => setSoundEnabled((v) => !v)}>
            {soundEnabled ? "🔊 Sonido" : "🔇 Silencio"}
          </button>
          <button className="pairActionBtn secondary" onClick={onBack}>Volver al inicio</button>
        </div>
      </div>

      <p className="pairHelp">
        {activeSet
          ? "Toca un personaje y luego la frase correcta. Si aciertas, la pareja queda en verde."
          : "Elige un set para empezar. La partida se abrirá en esta misma pantalla."}
      </p>

      <div className="setPicker">
        {GAME_SETS.map((setItem) => (
          <button
            key={setItem.id}
            className={`setBtn${activeSet?.id === setItem.id ? " active" : ""}`}
            onClick={() => selectSet(setItem.id)}
          >
            {setItem.title} ({setItem.pairs.length} parejas)
          </button>
        ))}
      </div>

      {activeSet && (
        <>
          <div className="pairGrid">
            <div className="pairCol">
              <h3>Personajes</h3>
              {shuffledCharacters.map((item) => {
                const isSelected = selectedCharacter?.id === item.id;
                const isMatched = matchedIds.includes(item.id);
                return (
                  <button
                    key={`c-${item.id}`}
                    className={`pairBtn${isSelected ? " selected" : ""}${isMatched ? " matched" : ""}`}
                    onClick={() => handleCharacterClick(item)}
                    disabled={isMatched}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="pairCol">
              <h3>Frases</h3>
              {shuffledPhrases.map((item) => {
                const isSelected = selectedPhrase?.id === item.id;
                const isMatched = matchedIds.includes(item.id);
                return (
                  <button
                    key={`p-${item.id}`}
                    className={`pairBtn${isSelected ? " selected" : ""}${isMatched ? " matched" : ""}`}
                    onClick={() => handlePhraseClick(item)}
                    disabled={isMatched}
                  >
                    <span className="pairPhraseText">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pairBottom">
            <div className="pairMsg">
              {completed ? "Juego completado. Muy bien!" : message}
            </div>

            <div className="pairActions">
              <button className="pairActionBtn secondary" onClick={onBack}>Volver al inicio</button>
              <button className="pairActionBtn" onClick={resetGame}>Mezclar de nuevo</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
