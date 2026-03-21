import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

const scoresCollection = collection(db, "scores");

export default function AdminPage() {
  const [scores, setScores] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadScores();
  }, []);

  async function loadScores() {
    try {
      setLoading(true);

      const snapshot = await getDocs(scoresCollection);
      const rows = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // ordenar por fecha descendente
      rows.sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dbb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dbb - da;
      });

      setScores(rows);
    } catch (err) {
      console.error("Error cargando registros:", err);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === scores.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(scores.map((s) => s.id)));
    }
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) {
      alert("Selecciona al menos un registro");
      return;
    }

    if (!window.confirm("¿Seguro que quieres borrar los registros seleccionados?")) return;

    try {
      setLoading(true);

      for (const id of selectedIds) {
        await deleteDoc(doc(db, "scores", id));
      }

      setSelectedIds(new Set());
      await loadScores();
    } catch (err) {
      console.error("Error eliminando:", err);
      alert("No se pudieron eliminar algunos registros");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <h1>🛠️ Administración de partidas</h1>

      <div style={{ marginBottom: 16 }}>
        <button onClick={deleteSelected} style={btnDanger}>
          🗑️ Borrar seleccionados ({selectedIds.size})
        </button>

        <button onClick={loadScores} style={btnSecondary}>
          🔄 Recargar
        </button>
      </div>

      {loading && <p>Cargando...</p>}

      <table style={tableStyle}>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={selectedIds.size === scores.length && scores.length > 0}
                onChange={toggleSelectAll}
              />
            </th>
            <th>Nombre</th>
            <th>Puntos</th>
            <th>Quesitos</th>
            <th>Nivel</th>
            <th>Fecha</th>
          </tr>
        </thead>

        <tbody>
          {scores.map((row) => {
            const date = row.createdAt?.toDate
              ? row.createdAt.toDate().toLocaleString()
              : "-";

            return (
              <tr key={row.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.id)}
                    onChange={() => toggleSelect(row.id)}
                  />
                </td>

                <td>{row.name}</td>
                <td>{row.score}</td>
                <td>{row.quesitos}</td>
                <td>{formatLevel(row.nivel)}</td>
                <td>{date}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {scores.length === 0 && !loading && (
        <p style={{ marginTop: 20 }}>No hay registros.</p>
      )}
    </div>
  );
}

// -------- helpers --------

function formatLevel(level) {
  if (level === 1) return "Fácil";
  if (level === 2) return "Medio";
  if (level === 3) return "Difícil";
  return level || "-";
}

// -------- estilos --------

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const btnDanger = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 8,
  marginRight: 10,
  cursor: "pointer",
  fontWeight: 700,
};

const btnSecondary = {
  background: "#e5e7eb",
  border: "none",
  padding: "10px 14px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
};
