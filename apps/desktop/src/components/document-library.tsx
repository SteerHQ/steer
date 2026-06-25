import { useEffect, useRef, useState } from "react";
import "./document-library.css";

export interface DocItem {
  id: string;
  name: string;
  content: string;
  updatedAt: number;
}

interface DocumentLibraryProps {
  /** Иконка раздела, напр. "📋" */
  icon: string;
  /** Название раздела во множественном числе, напр. "Вакансии" */
  title: string;
  /** Подпись для единичного элемента в кнопках, напр. "вакансию" */
  itemLabelAccusative: string;
  items: DocItem[];
  activeId: string | null;
  namePlaceholder: string;
  contentPlaceholder: string;
  emptyHint: string;
  onAdd: (name: string, content: string) => string;
  onUpdate: (id: string, patch: { name?: string; content?: string }) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string | null) => void;
}

/**
 * Универсальная «библиотека» именованных текстовых документов
 * (вакансии, резюме). Карточный список с выбором активного в один клик,
 * инлайн-редактор и удаление.
 */
export function DocumentLibrary({
  icon,
  title,
  itemLabelAccusative,
  items,
  activeId,
  namePlaceholder,
  contentPlaceholder,
  emptyHint,
  onAdd,
  onUpdate,
  onDelete,
  onSelect,
}: DocumentLibraryProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftContent, setDraftContent] = useState("");

  const editing = items.find((i) => i.id === editingId) ?? null;
  const justCreatedRef = useRef(false);

  // Синхронизируем черновик при смене редактируемого документа
  useEffect(() => {
    if (editing) {
      setDraftName(editing.name);
      setDraftContent(editing.content);
    }
  }, [editingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = () => {
    const id = onAdd(`${title} ${items.length + 1}`, "");
    justCreatedRef.current = true;
    setEditingId(id);
  };

  const saveDraft = () => {
    if (!editingId) return;
    onUpdate(editingId, { name: draftName, content: draftContent });
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    if (editingId === id) setEditingId(null);
  };

  const previewText = (text: string) => {
    const trimmed = text.trim().replace(/\s+/g, " ");
    if (!trimmed) return "пусто — нажмите «Изменить», чтобы вставить текст";
    return trimmed.length > 90 ? `${trimmed.slice(0, 90)}…` : trimmed;
  };

  return (
    <div className="doc-library">
      <div className="doc-library-header">
        <span className="doc-library-title">
          <span className="doc-library-icon">{icon}</span>
          {title}
          <span className="doc-library-count">{items.length}</span>
        </span>
        <button
          className="doc-btn doc-btn-add"
          onClick={handleCreate}
          title={`Добавить ${itemLabelAccusative}`}
        >
          + Добавить
        </button>
      </div>

      {items.length === 0 ? (
        <p className="doc-empty-hint">{emptyHint}</p>
      ) : (
        <ul className="doc-list">
          {items.map((item) => {
            const isActive = item.id === activeId;
            const isEditing = item.id === editingId;
            return (
              <li
                key={item.id}
                className={`doc-card${isActive ? " doc-card-active" : ""}`}
              >
                <div
                  className="doc-card-main"
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(isActive ? null : item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(isActive ? null : item.id);
                    }
                  }}
                >
                  <span className="doc-card-radio">{isActive ? "●" : "○"}</span>
                  <span className="doc-card-info">
                    <span className="doc-card-name">{item.name}</span>
                    <span className="doc-card-preview">
                      {previewText(item.content)}
                    </span>
                  </span>
                </div>
                <div className="doc-card-actions">
                  <button
                    className="doc-icon-btn"
                    title="Изменить"
                    onClick={() => setEditingId(isEditing ? null : item.id)}
                  >
                    ✏️
                  </button>
                  <button
                    className="doc-icon-btn doc-icon-btn-danger"
                    title="Удалить"
                    onClick={() => handleDelete(item.id)}
                  >
                    🗑️
                  </button>
                </div>

                {isEditing && (
                  <div className="doc-editor">
                    <input
                      className="doc-name-input"
                      type="text"
                      placeholder={namePlaceholder}
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onBlur={saveDraft}
                    />
                    <textarea
                      className="doc-textarea"
                      placeholder={contentPlaceholder}
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      onBlur={saveDraft}
                      rows={8}
                    />
                    <div className="doc-editor-actions">
                      <button
                        className="doc-btn doc-btn-save"
                        onClick={() => {
                          saveDraft();
                          if (!activeId) onSelect(item.id);
                          setEditingId(null);
                        }}
                      >
                        Готово
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
