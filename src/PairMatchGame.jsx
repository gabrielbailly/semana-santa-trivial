import React, { useMemo, useState } from "react";

const BASE_PAIRS = [
  { id: "p1", personaje: "Jesus", frase: "Padre, perdonalos" },
  { id: "p2", personaje: "Judas", frase: "Traiciona a Jesus con un beso" },
  { id: "p3", personaje: "Pedro", frase: "Nego a Jesus tres veces" },
  { id: "p4", personaje: "Pilato", frase: "Se lavo las manos" },
  { id: "p5", personaje: "Buen ladron", frase: "Acuerdate de mi en tu Reino" },
  { id: "p6", personaje: "Maria Magdalena", frase: "Ve el sepulcro vacio" },
  { id: "p7", personaje: "Tomas", frase: "Duda hasta ver las llagas" },
  { id: "p8", personaje: "Jose de Arimatea", frase: "Pide el cuerpo de Jesus" },
  { id: "p9", personaje: "Simon de Cirene", frase: "Ayuda a llevar la cruz" },
  { id: "p10", personaje: "Centurion", frase: "Reconoce a Jesus como Hijo de Dios" },
  { id: "p11", personaje: "Angel", frase: "No esta aqui, ha resucitado" },
  { id: "p12", personaje: "Jesus resucitado", frase: "La paz con vosotros" },
];

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function PairMatchGame({ onBack }) {
  const [round, setRound] = useState(0);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedPhrase, setSelectedPhrase] = useState(null);
  const [matchedIds, setMatchedIds] = useState([]);
  const [message, setMessage] = useState("");
  const [moves, setMoves] = useState(0);

  const shuffledCharacters = useMemo(
    () => shuffle(BASE_PAIRS.map((pair) => ({ id: pair.id, label: pair.personaje }))),
    [round]
  );

  const shuffledPhrases = useMemo(
    () => shuffle(BASE_PAIRS.map((pair) => ({ id: pair.id, label: pair.frase }))),
    [round]
  );

  const completed = matchedIds.length === BASE_PAIRS.length;

  function resetGame() {
    setRound((value) => value + 1);
    setSelectedCharacter(null);
    setSelectedPhrase(null);
    setMatchedIds([]);
    setMessage("");
    setMoves(0);
  }

  function tryMatch(nextCharacter, nextPhrase) {
    if (!nextCharacter || !nextPhrase) return;

    setMoves((value) => value + 1);

    if (nextCharacter.id === nextPhrase.id) {
      if (!matchedIds.includes(nextCharacter.id)) {
        setMatchedIds((prev) => [...prev, nextCharacter.id]);
      }
      setMessage("Muy bien. Esa pareja es correcta.");
      setSelectedCharacter(null);
      setSelectedPhrase(null);
    } else {
      setMessage("No coinciden. Prueba otra vez.");
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
        }

        .pairPill {
          background: #f3f4f6;
          border-radius: 999px;
          padding: 6px 10px;
          font-weight: 700;
          font-size: .9rem;
        }

        .pairHelp {
          color: #6b7280;
          margin: 0 0 14px;
        }

        .pairGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .pairCol {
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 16px;
          padding: 12px;
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
          .pairGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="pairTop">
        <h2 className="pairTitle">Unir parejas: personaje y frase</h2>
        <div className="pairMeta">
          <span className="pairPill">Aciertos: {matchedIds.length}/{BASE_PAIRS.length}</span>
          <span className="pairPill">Intentos: {moves}</span>
        </div>
      </div>

      <p className="pairHelp">
        Toca un personaje y luego la frase correcta. Si aciertas, la pareja queda en verde.
      </p>

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
                {item.label}
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
    </div>
  );
}
