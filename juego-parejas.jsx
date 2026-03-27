import React, { useState } from "react";

const PAIRS = [
  { id: 1, personaje: "Jesus", frase: "Padre, perdonalos" },
  { id: 2, personaje: "Pedro", frase: "Antes de que cante el gallo me negaras" },
  { id: 3, personaje: "Judas Iscariote", frase: "A quien yo de el bocado" },
  { id: 4, personaje: "Poncio Pilato", frase: "Aqui teneis al hombre" },
  {
    id: 5,
    personaje: "El centurion romano",
    frase: "Verdaderamente este era Hijo de Dios",
  },
  { id: 6, personaje: "El buen ladron", frase: "Hoy estaras conmigo en el paraiso" },
  { id: 7, personaje: "El discipulo amado", frase: "Ahi tienes a tu madre" },
  { id: 8, personaje: "Maria Magdalena", frase: "No me retengas" },
  { id: 9, personaje: "Tomas", frase: "Dichosos los que creen sin haber visto" },
  {
    id: 10,
    personaje: "Las mujeres discipulas",
    frase: "Id y decidlo a los discipulos",
  },
  { id: 11, personaje: "Discipulos de Emaus", frase: "Quedaos conmigo" },
  { id: 12, personaje: "Sumo sacerdote", frase: "Tu lo has dicho" },
];

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildCharacters() {
  return shuffle(PAIRS.map((pair) => ({ id: pair.id, text: pair.personaje })));
}

function buildPhrases() {
  return shuffle(PAIRS.map((pair) => ({ id: pair.id, text: pair.frase })));
}

export default function JuegoParejasPersonajesFrases() {
  const [characters, setCharacters] = useState(() => buildCharacters());
  const [phrases, setPhrases] = useState(() => buildPhrases());
  const [matchedIds, setMatchedIds] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [hoverPhraseId, setHoverPhraseId] = useState(null);
  const [wrongPhraseId, setWrongPhraseId] = useState(null);
  const [moves, setMoves] = useState(0);
  const [errors, setErrors] = useState(0);

  const completado = matchedIds.length === PAIRS.length;

  const playTone = (kind) => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (kind === "ok") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1175, ctx.currentTime + 0.12);
    } else {
      osc.type = "square";
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.14);
    }

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);

    osc.start();
    osc.stop(ctx.currentTime + 0.16);
    osc.onended = () => ctx.close();
  };

  const resetGame = () => {
    setCharacters(buildCharacters());
    setPhrases(buildPhrases());
    setMatchedIds([]);
    setDraggingId(null);
    setHoverPhraseId(null);
    setWrongPhraseId(null);
    setMoves(0);
    setErrors(0);
  };

  const onDropPhrase = (phraseId) => {
    if (draggingId == null || completado) return;
    if (matchedIds.includes(phraseId) || matchedIds.includes(draggingId)) return;

    setMoves((m) => m + 1);

    if (draggingId === phraseId) {
      setMatchedIds((prev) => [...prev, phraseId]);
      playTone("ok");
    } else {
      setErrors((e) => e + 1);
      setWrongPhraseId(phraseId);
      playTone("error");
      window.setTimeout(() => setWrongPhraseId(null), 450);
    }

    setHoverPhraseId(null);
    setDraggingId(null);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Juego de Parejas: Personajes y Frases</h1>
        <p style={styles.subtitle}>
          Une cada personaje con la frase correspondiente, usando preguntas de las
          categorias "personajes" y "frases".
        </p>
        <div style={styles.stats}>
          <span>Movimientos: {moves}</span>
          <span>Intentos fallidos: {errors}</span>
          <span>
            Aciertos: {matchedIds.length} / {PAIRS.length}
          </span>
        </div>
      </div>

      <div style={styles.columns}>
        <section style={styles.column}>
          <h2 style={styles.columnTitle}>Personajes</h2>
          {characters.map((character) => {
            const isMatched = matchedIds.includes(character.id);
            return (
              <div
                key={`character-${character.id}`}
                draggable={!isMatched}
                onDragStart={() => setDraggingId(character.id)}
                onDragEnd={() => {
                  setDraggingId(null);
                  setHoverPhraseId(null);
                }}
                style={{
                  ...styles.card,
                  ...(isMatched ? styles.cardMatched : null),
                  ...(draggingId === character.id ? styles.cardDragging : null),
                }}
                aria-label={`Personaje ${character.text}`}
              >
                <span style={styles.cardText}>{character.text}</span>
              </div>
            );
          })}
        </section>

        <section style={styles.column}>
          <h2 style={styles.columnTitle}>Frases</h2>
          {phrases.map((phrase) => {
            const isMatched = matchedIds.includes(phrase.id);
            return (
              <div
                key={`phrase-${phrase.id}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!isMatched) setHoverPhraseId(phrase.id);
                }}
                onDragLeave={() => setHoverPhraseId(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  onDropPhrase(phrase.id);
                }}
                style={{
                  ...styles.card,
                  ...(hoverPhraseId === phrase.id ? styles.cardHover : null),
                  ...(wrongPhraseId === phrase.id ? styles.cardWrong : null),
                  ...(isMatched ? styles.cardMatched : null),
                }}
                aria-label={`Frase ${phrase.text}`}
              >
                <span style={styles.cardText}>{phrase.text}</span>
              </div>
            );
          })}
        </section>
      </div>

      <div style={styles.footer}>
        {completado ? (
          <p style={styles.winMessage}>
            Excelente. Completaste el juego en {moves} movimientos.
          </p>
        ) : (
          <p style={styles.help}>Arrastra un personaje y sueltalo sobre su frase.</p>
        )}

        <button type="button" onClick={resetGame} style={styles.resetBtn}>
          Reiniciar
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "24px",
    color: "#1f2a37",
    background:
      "radial-gradient(circle at 20% 20%, #ffe9c6 0%, #f9f3e8 35%, #e8efe6 100%)",
    fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
  },
  header: {
    maxWidth: "1000px",
    margin: "0 auto 16px",
  },
  title: {
    margin: "0 0 8px",
    fontSize: "clamp(1.4rem, 2.6vw, 2rem)",
  },
  subtitle: {
    margin: "0 0 12px",
    lineHeight: 1.4,
  },
  stats: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    fontWeight: 600,
  },
  columns: {
    maxWidth: "1000px",
    margin: "0 auto",
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
  },
  column: {
    flex: "1 1 320px",
  },
  columnTitle: {
    margin: "0 0 10px",
    fontSize: "1.05rem",
  },
  card: {
    minHeight: "0",
    marginBottom: "6px",
    border: "2px solid #9ab09a",
    borderRadius: "10px",
    padding: "6px 8px",
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    cursor: "pointer",
    background: "#ffffffd9",
    textAlign: "left",
    transition: "transform .12s ease, box-shadow .2s ease",
    boxShadow: "0 5px 14px rgba(0,0,0,.08)",
  },
  cardDragging: {
    opacity: 0.55,
  },
  cardHover: {
    borderColor: "#4f7d5c",
    transform: "translateY(-2px)",
    boxShadow: "0 8px 18px rgba(40, 106, 61, .22)",
  },
  cardWrong: {
    borderColor: "#b54747",
    background: "#fde8e8",
  },
  cardMatched: {
    background: "#def5e5",
    borderColor: "#32784b",
  },
  cardText: {
    fontSize: "1.03rem",
    lineHeight: 1.22,
    fontWeight: 700,
  },
  footer: {
    maxWidth: "1000px",
    margin: "18px auto 0",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },
  help: {
    margin: 0,
    fontSize: "0.95rem",
  },
  winMessage: {
    margin: 0,
    fontWeight: 700,
    color: "#1f693f",
  },
  resetBtn: {
    border: "none",
    borderRadius: "10px",
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
    color: "#fff",
    background: "#2f5f3d",
  },
};
