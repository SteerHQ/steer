import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/app-store";
import "./resume-manager.css";

/**
 * Управление резюме: создание, выбор активного, редактирование и удаление.
 * Активное резюме подставляется в системный промпт при генерации ответов.
 */
export function ResumeManager() {
  const {
    resumes,
    activeResumeId,
    addResume,
    updateResume,
    deleteResume,
    setActiveResume,
  } = useAppStore();

  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftContent, setDraftContent] = useState("");

  const activeResume = resumes.find((r) => r.id === activeResumeId);
  const editing = resumes.find((r) => r.id === editingId);

  // Синхронизируем черновик при смене редактируемого резюме
  useEffect(() => {
    if (editing) {
      setDraftName(editing.name);
      setDraftContent(editing.content);
    }
  }, [editingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const justCreatedRef = useRef(false);

  const handleCreate = () => {
    const id = addResume(`Резюме ${resumes.length + 1}`, "");
    justCreatedRef.current = true;
    setEditingId(id);
    setExpanded(true);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setActiveResume(value || null);
  };

  const handleEditToggle = () => {
    if (editingId) {
      setEditingId(null);
    } else if (activeResume) {
      setEditingId(activeResume.id);
    }
  };

  const saveDraft = () => {
    if (!editingId) return;
    updateResume(editingId, { name: draftName, content: draftContent });
  };

  const handleDelete = () => {
    if (!editingId) return;
    deleteResume(editingId);
    setEditingId(null);
  };

  return (
    <div className="resume-section">
      <button className="resume-toggle" onClick={() => setExpanded(!expanded)}>
        <span>📄 Резюме</span>
        <span className="resume-active-name">
          {activeResume ? activeResume.name : "не выбрано"}
        </span>
        {activeResume && <span className="resume-indicator">●</span>}
        <span className="mode-arrow">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="resume-body">
          <div className="resume-select-row">
            <select
              className="resume-select"
              value={activeResumeId ?? ""}
              onChange={handleSelect}
            >
              <option value="">— Без резюме —</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <button
              className="resume-btn resume-btn-add"
              onClick={handleCreate}
              title="Добавить новое резюме"
            >
              + Новое
            </button>
          </div>

          {activeResume && (
            <button
              className="resume-btn resume-btn-edit"
              onClick={handleEditToggle}
            >
              {editingId ? "Свернуть редактор" : "✏️ Редактировать"}
            </button>
          )}

          {editing && (
            <div className="resume-editor">
              <input
                className="resume-name-input"
                type="text"
                placeholder="Название резюме (напр. Senior Backend)"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={saveDraft}
              />
              <textarea
                className="resume-textarea"
                placeholder="Вставьте текст резюме: опыт, проекты, технологии, достижения. Ассистент будет отвечать от вашего лица на основе этих данных..."
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                onBlur={saveDraft}
                rows={8}
              />
              <div className="resume-editor-actions">
                <button
                  className="resume-btn resume-btn-delete"
                  onClick={handleDelete}
                >
                  🗑️ Удалить
                </button>
                <button
                  className="resume-btn resume-btn-save"
                  onClick={() => {
                    saveDraft();
                    setEditingId(null);
                  }}
                >
                  Готово
                </button>
              </div>
            </div>
          )}

          {resumes.length === 0 && (
            <p className="resume-empty-hint">
              Пока нет ни одного резюме. Создайте первое, чтобы ассистент
              отвечал на основе вашего опыта.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
