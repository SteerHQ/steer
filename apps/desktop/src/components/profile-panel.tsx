import { useAppStore } from "../store/app-store";
import { DocumentLibrary } from "./document-library";
import "./profile-panel.css";

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Floating drawer panel for vacancy and resume management.
 * Anchored to the left side, does not affect the main dialog flow.
 */
export function ProfilePanel({ isOpen, onClose }: ProfilePanelProps) {
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

  const activeVacancy = vacancies.find((v) => v.id === activeVacancyId);
  const activeResume = resumes.find((r) => r.id === activeResumeId);

  return (
    <>
      {isOpen && <div className="profile-drawer-overlay" onClick={onClose} />}
      <div className={`profile-drawer ${isOpen ? "open" : ""}`}>
        <div className="profile-drawer-header">
          <span className="profile-drawer-title">📁 Профиль кандидата</span>
          <button className="profile-drawer-close" onClick={onClose} title="Закрыть">
            ✕
          </button>
        </div>

        <div className="profile-drawer-body">
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

        {activeVacancy && (
          <div className="profile-drawer-active-hint">
            ✓ Активна: <strong>{activeVacancy.name}</strong>
          </div>
        )}
        {activeResume && (
          <div className="profile-drawer-active-hint">
            ✓ Активно: <strong>{activeResume.name}</strong>
          </div>
        )}
      </div>
    </>
  );
}
