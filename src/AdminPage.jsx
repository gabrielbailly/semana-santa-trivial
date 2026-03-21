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
      alert("Error al eliminar registros");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="adminShell">
      <style>{`
        * { box-sizing: border-box; }

        body {
          margin: 0;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          background: #fff7ed;
        }

        .adminShell {
          max-width: 1100px;
          margin: 0 auto;
          padding: 24px;
        }

        .card {
          background: white;
          border-radius: 24px;
          padding: 20px;
          box-shadow: 0 16px 40px rgba(0,0,0,.08);
        }

        h1 {
          margin-top: 0;
        }

        .toolbar {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .btn {
          border: none;
          border-radius: 12px;
          padding: 10px 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .btnDanger {
          background: #dc2626;
          color: white;
        }

        .btnSecondary {
          background: #e5e7eb;
        }

        .btn:hover {
          opacity: 0.9;
        }

        .tableWrapper {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }

        th {
          text-align: center;
          padding: 10px;
          background: #f3f4f6;
          font-weight: 700;
          font-size: 0.95rem;
        }
        th:nth-child(2),
        td:nth-child(2) {
        text-align: left;
        }
        td {
          padding: 10px;
          border-bottom: 1px solid #e5e7eb;
        }

        tr:hover {
          background: #fff7ed;
        }

        input[type="checkbox"] {
          transform: scale(1.2);
          cursor: pointer;
        }

        .loading {
          color: #6b7280;
          margin-top: 10px;
        }

        .empty {
          margin-top: 20px;
          color: #6b7280;
        }

        .badge {
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 0.8rem;
          background: #f3f4f6;
        }

        @media (max-width: 700px) {
          th, td {
            font-size: 0.85rem;
            padding: 8px;
          }
        }
      `}</style>

      <div className="card">
        <h1>🛠️ Administración de partidas</h1>

        <div className="toolbar">
          <button className="btn btnDanger" onClick={deleteSelected}>
            🗑️ Borrar seleccionados ({selectedIds.size})
          </button>

          <button className="btn btnSecondary" onClick={loadScores}>
            🔄 Recargar
          </button>
        </div>

        {loading && <div className="loading">Cargando...</div>}

        <div className="tableWrapper">
          <table>
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
                    <td>
                      <span className="badge">
                        {formatLevel(row.nivel)}
                      </span>
                    </td>
                    <td>{date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && scores.length === 0 && (
          <div className="empty">No hay registros.</div>
        )}
      </div>
    </div>
  );
}

function formatLevel(level) {
  if (level === 1) return "Fácil";
  if (level === 2) return "Medio";
  if (level === 3) return "Difícil";
  return "-";
}
