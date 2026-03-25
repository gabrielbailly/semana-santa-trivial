import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db, serverTimestamp } from "./firebase";

const scoresCollection = collection(db, "scores");
const homeSettingsDoc = doc(db, "appConfig", "home");
const HOME_SETTINGS_LOCAL_KEY = "trivial_home_settings";

export default function AdminPage() {
  const [scores, setScores] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filterScore, setFilterScore] = useState("");
  const [filterScoreOp, setFilterScoreOp] = useState(">=");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  const [lastUpdateAt, setLastUpdateAt] = useState("");
  const [homeMessage, setHomeMessage] = useState("");
  const [settingsStatus, setSettingsStatus] = useState("");

  useEffect(() => {
    loadScores();
    loadHomeSettings();
  }, []);

  async function loadHomeSettings() {
    try {
      const snap = await getDoc(homeSettingsDoc);
      if (!snap.exists()) {
        const cached =
          typeof window !== "undefined"
            ? window.localStorage.getItem(HOME_SETTINGS_LOCAL_KEY)
            : "";

        if (!cached) return;

        const parsed = JSON.parse(cached);
        setLastUpdateAt(String(parsed.lastUpdateAt || ""));
        setHomeMessage(String(parsed.homeMessage || ""));
        return;
      }

      const data = snap.data();
      setLastUpdateAt(String(data.lastUpdateAt || ""));
      setHomeMessage(String(data.homeMessage || ""));
    } catch (err) {
      console.error("Error cargando ajustes de portada:", err);

      try {
        const cached =
          typeof window !== "undefined"
            ? window.localStorage.getItem(HOME_SETTINGS_LOCAL_KEY)
            : "";

        if (!cached) return;

        const parsed = JSON.parse(cached);
        setLastUpdateAt(String(parsed.lastUpdateAt || ""));
        setHomeMessage(String(parsed.homeMessage || ""));
      } catch (localErr) {
        console.error("Error cargando ajustes locales:", localErr);
      }
    }
  }

  async function saveHomeSettings() {
    try {
      setLoading(true);
      setSettingsStatus("");

      await setDoc(
        homeSettingsDoc,
        {
          lastUpdateAt: lastUpdateAt || "",
          homeMessage: homeMessage.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSettingsStatus("Cambios guardados correctamente.");
    } catch (err) {
      console.error("Error guardando ajustes de portada:", err);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          HOME_SETTINGS_LOCAL_KEY,
          JSON.stringify({
            lastUpdateAt: lastUpdateAt || "",
            homeMessage: homeMessage.trim(),
          })
        );
      }

      if (err?.code === "permission-denied") {
        setSettingsStatus(
          "Sin permisos para guardar en Firebase. Se ha guardado solo en este dispositivo."
        );
      } else {
        setSettingsStatus(
          "No se pudo guardar en Firebase. Se ha guardado solo en este dispositivo."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadScores() {
    try {
      setLoading(true);

      const snapshot = await getDocs(scoresCollection);
      const rows = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setScores(rows);
    } catch (err) {
      console.error("Error cargando registros:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredAndSortedScores = useMemo(() => {
    let data = [...scores];

    if (filterScore !== "") {
      const scoreValue = Number(filterScore);

      if (!Number.isNaN(scoreValue)) {
        data = data.filter((s) => {
          const points = Number(s.score || 0);

          switch (filterScoreOp) {
            case ">":
              return points > scoreValue;
            case "<":
              return points < scoreValue;
            case "=":
              return points === scoreValue;
            case "<=":
              return points <= scoreValue;
            case ">=":
            default:
              return points >= scoreValue;
          }
        });
      }
    }

    data.sort((a, b) => {
      let valA;
      let valB;

      if (sortBy === "createdAt") {
        valA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        valB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      } else if (sortBy === "name") {
        valA = String(a.name || "").toLowerCase();
        valB = String(b.name || "").toLowerCase();
      } else {
        valA = Number(a[sortBy] || 0);
        valB = Number(b[sortBy] || 0);
      }

      if (typeof valA === "string" && typeof valB === "string") {
        return sortDir === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return sortDir === "asc" ? valA - valB : valB - valA;
    });

    return data;
  }, [scores, filterScore, filterScoreOp, sortBy, sortDir]);

  function toggleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAllVisible() {
    const visibleIds = filteredAndSortedScores.map((s) => s.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])]);
    }
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) {
      alert("Selecciona al menos un registro");
      return;
    }

    if (
      !window.confirm(
        `¿Seguro que quieres borrar ${selectedIds.length} registro(s)?`
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      for (const id of selectedIds) {
        await deleteDoc(doc(db, "scores", id));
      }

      setSelectedIds([]);
      await loadScores();
    } catch (err) {
      console.error("Error eliminando registros:", err);
      alert("No se pudieron eliminar algunos registros.");
    } finally {
      setLoading(false);
    }
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function formatLevel(level) {
    if (level === 1) return "Fácil";
    if (level === 2) return "Medio";
    if (level === 3) return "Difícil";
    return "-";
  }

  const allVisibleSelected =
    filteredAndSortedScores.length > 0 &&
    filteredAndSortedScores.every((row) => selectedIds.includes(row.id));

  function setCurrentDateTime() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");

    const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    setLastUpdateAt(formatted);
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
          max-width: 1180px;
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
          margin: 0 0 16px;
        }

        .toolbar {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr auto auto auto;
          gap: 12px;
          align-items: end;
          margin-bottom: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .homeSettingsCard {
          background: #fffbeb;
          border: 1px solid #fed7aa;
          border-radius: 16px;
          padding: 14px;
          margin-bottom: 16px;
        }

        .homeSettingsGrid {
          display: grid;
          grid-template-columns: 1fr 2fr auto;
          gap: 12px;
          align-items: start;
        }

        .hint {
          font-size: 0.85rem;
          color: #6b7280;
          margin-top: 6px;
        }

        .miniBtn {
          margin-top: 6px;
          align-self: flex-start;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 10px;
          padding: 6px 10px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          color: #374151;
        }

        .miniBtn:hover {
          background: #f9fafb;
        }

        textarea {
          min-height: 42px;
          max-height: 120px;
          resize: vertical;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid #d1d5db;
          background: white;
          font: inherit;
        }

        .settingsStatus {
          margin-top: 8px;
          color: #374151;
          font-size: 0.92rem;
        }

        .label {
          font-size: 0.9rem;
          font-weight: 700;
          color: #374151;
        }

        input, select, button {
          font: inherit;
        }

        input, select {
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid #d1d5db;
          background: white;
        }

        .filterRow {
          display: flex;
          gap: 8px;
        }

        .filterOp {
          max-width: 90px;
        }

        .btn {
          border: none;
          border-radius: 12px;
          padding: 10px 14px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity .2s ease, transform .2s ease;
          white-space: nowrap;
        }

        .btn:hover {
          opacity: 0.92;
          transform: translateY(-1px);
        }

        .btnDanger {
          background: #dc2626;
          color: white;
        }

        .btnSecondary {
          background: #e5e7eb;
          color: #111827;
        }

        .btnGhost {
          background: white;
          border: 1px solid #d1d5db;
          color: #111827;
        }

        .statusRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 12px;
          color: #6b7280;
          font-size: 0.95rem;
        }

        .tableWrapper {
          overflow-x: auto;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 860px;
        }

        th, td {
          text-align: center;
        }

        th:nth-child(2),
        td:nth-child(2) {
          text-align: left;
        }

        td:nth-child(2) {
          padding-left: 16px;
        }

        th {
          padding: 12px 10px;
          background: #f3f4f6;
          font-weight: 700;
          font-size: 0.95rem;
          border-bottom: 1px solid #e5e7eb;
        }

        td {
          padding: 12px 10px;
          border-bottom: 1px solid #e5e7eb;
          vertical-align: middle;
        }

        tr:last-child td {
          border-bottom: none;
        }

        tbody tr:hover {
          background: #fff7ed;
        }

        .adminRowSelected {
          background: #fef3c7;
        }

        .adminRowSelected:hover {
          background: #fde68a;
        }

        input[type="checkbox"] {
          transform: scale(1.15);
          cursor: pointer;
        }

        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.82rem;
          font-weight: 700;
          background: #f3f4f6;
        }

        .badge.easy {
          background: #dcfce7;
          color: #166534;
        }

        .badge.medium {
          background: #fef3c7;
          color: #92400e;
        }

        .badge.hard {
          background: #fee2e2;
          color: #991b1b;
        }

        .loading {
          color: #6b7280;
          margin-top: 10px;
        }

        .empty {
          padding: 20px 0;
          color: #6b7280;
        }

        @media (max-width: 980px) {
          .toolbar {
            grid-template-columns: 1fr 1fr;
          }

          .homeSettingsGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .toolbar {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="card">
        <h1>🛠️ Administración de partidas</h1>

        <div className="homeSettingsCard">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            Ajustes de portada
          </div>

          <div className="homeSettingsGrid">
            <div className="field">
              <label className="label">Fecha y hora de actualización</label>
              <input
                type="datetime-local"
                value={lastUpdateAt}
                onChange={(e) => setLastUpdateAt(e.target.value)}
              />
              <button className="miniBtn" onClick={setCurrentDateTime}>
                Usar fecha/hora actual
              </button>
            </div>

            <div className="field">
              <label className="label">Mensaje en portada</label>
              <textarea
                value={homeMessage}
                onChange={(e) => setHomeMessage(e.target.value)}
                placeholder="Ej: ¡Nuevas preguntas añadidas!"
              />
            </div>

            <button className="btn btnSecondary" onClick={saveHomeSettings}>
              Guardar portada
            </button>
          </div>

          <div className="hint">
            Este mensaje y fecha se mostrarán en la página de inicio del juego.
          </div>

          {settingsStatus && <div className="settingsStatus">{settingsStatus}</div>}
        </div>

        <div className="toolbar">
          <div className="field">
            <label className="label">Filtrar por puntos</label>
            <div className="filterRow">
              <select
                className="filterOp"
                value={filterScoreOp}
                onChange={(e) => setFilterScoreOp(e.target.value)}
              >
                <option value=">=">{">="}</option>
                <option value="<=">{"<="}</option>
                <option value=">">{">"}</option>
                <option value="<">{"<"}</option>
                <option value="=">{"="}</option>
              </select>

              <input
                type="number"
                min="0"
                value={filterScore}
                onChange={(e) => setFilterScore(e.target.value)}
                placeholder="Ej. 8"
              />
            </div>
          </div>

          <div className="field">
            <label className="label">Ordenar por</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="score">Puntos</option>
              <option value="quesitos">Quesitos</option>
              <option value="createdAt">Fecha</option>
              <option value="name">Nombre</option>
            </select>
          </div>

          <div className="field">
            <label className="label">Dirección</label>
            <select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>
          </div>

          <button className="btn btnSecondary" onClick={loadScores}>
            🔄 Recargar
          </button>

          <button className="btn btnGhost" onClick={clearSelection}>
            Limpiar selección
          </button>

          <button className="btn btnDanger" onClick={deleteSelected}>
            🗑️ Borrar seleccionados
          </button>
        </div>

        <div className="statusRow">
          <span>Mostrando {filteredAndSortedScores.length} registro(s)</span>
          <span>Seleccionados: {selectedIds.length}</span>
        </div>

        {loading && <div className="loading">Cargando...</div>}

        <div className="tableWrapper">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
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
              {filteredAndSortedScores.map((entry) => {
                const selectedRow = selectedIds.includes(entry.id);

                return (
                  <tr
                    key={entry.id}
                    className={selectedRow ? "adminRowSelected" : ""}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedRow}
                        onChange={() => toggleSelect(entry.id)}
                      />
                    </td>

                    <td>{entry.name || "-"}</td>
                    <td>{entry.score ?? 0}</td>
                    <td>{entry.quesitos ?? 0}</td>

                    <td>
                      <span
                        className={`badge ${
                          entry.nivel === 1
                            ? "easy"
                            : entry.nivel === 2
                              ? "medium"
                              : entry.nivel === 3
                                ? "hard"
                                : ""
                        }`}
                      >
                        {formatLevel(entry.nivel)}
                      </span>
                    </td>

                    <td>
                      {entry.createdAt?.toDate
                        ? entry.createdAt.toDate().toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && filteredAndSortedScores.length === 0 && (
          <div className="empty">No hay registros para mostrar.</div>
        )}
      </div>
    </div>
  );
}
