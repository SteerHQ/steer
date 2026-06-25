import { useState } from "react";
import { useAppStore } from "../store/app-store";
import { DocumentLibrary } from "./document-library";
import "./profile-panel.css";

/**
 * Единая панель «Профиль кандидата»: библиотеки сохранённых вакансий и резюме.
 * Активная вакансия и активное резюме подставляются в системный промпт.
 */
export function ProfilePanel() {
  const {
    vacancies,
    activeVacancyId,
    addVacancy,
    updateVacancy,
    deleteVacancy,
    setActiveVacancy,
    resumes,
    activeResumeId,
    addResume,
    updateResume,
    deleteResume,
    setActiveResume,
  } = useAppStore();

  const [expanded, setExpanded] = useState(false);

  const activeVacancy = vacancies.find((v) => v.id === activeVacancyId);
  const activeResume = resumes.find((r) => r.id === activeResumeId);

  return (
    <div className="profile-panel">
      <button
        className="profile-toggle"
        onClick={() => setExpanded(!expanded)}
        title="Вакансии и резюме"
      >
        <span className="profile-toggle-icon">📁</span>
        <span className="profile-toggle-label">Профиль кандидата</span>
        <span className="profile-toggle-summary">
          <span
            className={`profile-chip${activeVacancy ? " profile-chip-on" : ""}`}
          >
            📋 {activeVacancy ? activeVacancy.name : "вакансия не выбрана"}
          </span>
          <span
            className={`profile-chip${activeResume ? " profile-chip-on" : ""}`}
          >
            📄 {activeResume ? activeResume.name : "резюме не выбрано"}
          </span>
        </span>
        <span className="profile-toggle-arrow">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="profile-body">
          <DocumentLibrary
            icon="📋"
            title="Вакансии"
            itemLabelAccusative="вакансию"
            items={vacancies}
            activeId={activeVacancyId}
            namePlaceholder="Название, напр. Senior Backend в Acme"
            contentPlaceholder="Вставьте текст вакансии — ассистент будет учитывать требования при ответах..."
            emptyHint="Пока нет сохранённых вакансий. Добавьте первую, чтобы ассистент учитывал её требования."
            onAdd={addVacancy}
            onUpdate={updateVacancy}
            onDelete={deleteVacancy}
            onSelect={setActiveVacancy}
          />

          <div className="profile-divider" />

          <DocumentLibrary
            icon="📄"
            title="Резюме"
            itemLabelAccusative="резюме"
            items={resumes}
            activeId={activeResumeId}
            namePlaceholder="Название, напр. Senior Backend (Node.js)"
            contentPlaceholder="Вставьте текст резюме: опыт, проекты, технологии, достижения. Ассистент будет отвечать от вашего лица на основе этих данных..."
            emptyHint="Пока нет ни одного резюме. Создайте первое, чтобы ассистент отвечал на основе вашего опыта."
            onAdd={addResume}
            onUpdate={updateResume}
            onDelete={deleteResume}
            onSelect={setActiveResume}
          />
        </div>
      )}
    </div>
  );
}
