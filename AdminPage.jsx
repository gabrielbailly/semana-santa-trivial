import React, { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { collection, deleteDoc, doc, getDocs, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB3HryH0Mg996QV0HUdaxYox4ah5xDnYJM",
  authDomain: "semana-santa-f9967.firebaseapp.com",
  projectId: "semana-santa-f9967",
  storageBucket: "semana-santa-f9967.firebasestorage.app",
  messagingSenderId: "85757700422",
  appId: "1:85757700422:web:7b762e3a9ac9be34c3dd47"
};

const ADMIN_PASSWORD = "Gbailly26$";

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const scoresCollection = collection(db, "scores");

export default function AdminPage() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const loadScores = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(scoresCollection);
      const rows = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setScores(rows);
    } catch (error) {
      console.error("Error cargando registros:", error);
      setMessage("No se pudieron cargar los registros.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScores();
  }, []);

  const unlockAdmin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setAdminUnlocked(true);
      setMessage("Modo administrador activado.");
      setAdminPassword("");
    } else {
      setAdminUnlocked(false);
      setMessage("Contraseña incorrecta.");
    }
  };

  const deleteScore = async (id) => {
    if (!adminUnlocked) return;

    try {
      setDeletingId(id);
      await deleteDoc(doc(db, "scores", id));
      setScores((prev) => prev.filter((entry) => entry.id !== id));
      setMessage("Registro eliminado.");
    } catch (error) {
      console.error("Error eliminando registro:", error);
      setMessage("No se pudo eliminar el registro.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="adminPageShell">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; background: #fff7ed; }
        button, input { font: inherit; }

        .adminPageShell {
          min-height: 100vh;
          padding: 20px;
          background: #fff7ed;
        }

        .adminPage {
          max-width: 980px;
          margin: 0 auto;
          background: white;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 16px 40px rgba(0,0,0,.08);
        }

        .adminTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .adminTop h1 {
          margin: 0;
          font-size: 2rem;
        }

        .muted {
          color: #6b7280;
        }

        .toolBtn, .dangerBtn, .primaryBtn {
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
        }

        .toolBtn {
          background: white;
          padding: 12px 16px;
          border: 1px solid #d1d5db;
        }

        .primaryBtn {
          background: linear-gradient(135deg, #f59e0b, #ea580c);
          color: white;
          padding: 12px 16px;
        }

        .dangerBtn {
          background: #dc2626;
          color: white;
          padding: 10px 12px;
        }

        .card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 16px;
          margin-bottom: 18px;
        }

        .row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .input {
          flex: 1;
          min-width: 240px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid #d1d5db;
          background: white;
        }

        .list {
          display: grid;
          gap: 10px;
        }

        .item {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: center;
          padding: 14px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .item:last-child {
          border-bottom: none;
        }

        .itemMain {
          min-width: 0;
        }

        .itemTitle {
          font-weight: 700;
        }

        .itemMeta {
          margin-top: 4px;
          color: #6b7280;
          font-size: .92rem;
          word-break: break-word;
        }

        .itemRight {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .scoreBadge {
          background: #f3f4f6;
          border-radius: 999px;
          padding: 8px 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .ok {
          color: #166534;
        }

        .error {
          color: #b91c1c;
        }

        @media (max-width: 700px) {
          .item {
            flex-direction: column;
            align-items: flex-start;
          }

          .itemRight {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>

      <div className="adminPage">
        <div className="adminTop">
          <div>
            <h1>Administración</h1>
            <div className="muted">Panel para ver y borrar registros de Firebase</div>
          </div>

          <button
            className="toolBtn"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Volver al juego
          </button>
        </div>

        {!adminUnlocked ? (
          <div className="card">
            <div style={{ fontWeight: 800 }}>Acceso administrador</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Introduce la contraseña para habilitar el borrado de registros.
            </div>

            <div className="row">
              <input
                className="input"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Contraseña de administrador"
              />
              <button className="primaryBtn" onClick={unlockAdmin}>
                Entrar
              </button>
            </div>

            {message && (
              <div
                className={adminUnlocked ? "ok" : "error"}
                style={{ marginTop: 12, fontWeight: 600 }}
              >
                {message}
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            <div style={{ fontWeight: 800 }}>Modo administrador activado</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Ya puedes borrar registros.
            </div>

            <div className="row">
              <button className="toolBtn" onClick={loadScores}>
                Recargar registros
              </button>
            </div>

            {message && (
              <div className="ok" style={{ marginTop: 12, fontWeight: 600 }}>
                {message}
              </div>
            )}
          </div>
        )}

        <div className="card">
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Registros guardados</div>

          {loading ? (
            <div className="muted">Cargando…</div>
          ) : scores.length === 0 ? (
            <div className="muted">No hay registros en la base de datos.</div>
          ) : (
            <div className="list">
              {scores.map((entry) => (
                <div key={entry.id} className="item">
                  <div className="itemMain">
                    <div className="itemTitle">
                      {entry.name} · {entry.difficulty}
                    </div>
                    <div className="itemMeta">
                      {entry.date || "Sin fecha"}
                    </div>
                  </div>

                  <div className="itemRight">
                    <div className="scoreBadge">{entry.score}/10</div>

                    {adminUnlocked && (
                      <button
                        className="dangerBtn"
                        onClick={() => deleteScore(entry.id)}
                        disabled={deletingId === entry.id}
                      >
                        {deletingId === entry.id ? "Borrando..." : "Borrar"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
