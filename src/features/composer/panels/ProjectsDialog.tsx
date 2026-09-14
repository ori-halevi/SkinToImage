import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buttonPrimary, buttonSecondary, useAnimatedDialog } from '../../../ui/controls';
import { deleteProject, listProjects, saveProject } from '../storage';
import { useComposer } from '../store';
import { CANVAS_PRESET_IDS, type CanvasPresetId, type Project } from '../types';

export function ProjectsDialog({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { requestClose, dialogProps } = useAnimatedDialog(onClose);
  const current = useComposer((s) => s.project);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [preset, setPreset] = useState<CanvasPresetId>('youtube');

  useEffect(() => {
    let cancelled = false;
    // Save the open project first so the list shows its latest state.
    const open = useComposer.getState().project;
    void (open ? saveProject(open) : Promise.resolve())
      .then(listProjects)
      .then((list) => !cancelled && setProjects(list));
    return () => {
      cancelled = true;
    };
  }, []);

  const open = (project: Project) => {
    useComposer.getState().openProject(project);
    requestClose();
  };

  const create = () => {
    useComposer.getState().newProject(t('composer.untitled'), preset);
    requestClose();
  };

  const remove = async (project: Project) => {
    if (!window.confirm(t('composer.confirmDelete', { name: project.name }))) return;
    await deleteProject(project.id);
    const list = await listProjects();
    setProjects(list);
    if (current?.id === project.id) {
      if (list[0]) useComposer.getState().openProject(list[0]);
      else useComposer.getState().newProject(t('composer.untitled'));
    }
  };

  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <dialog {...dialogProps} aria-label={t('composer.projects')} className="animated-dialog m-auto w-[min(94vw,760px)] rounded-xl border border-edge bg-panel p-0 text-slate-100">
      <div className="flex items-center gap-2 border-b border-edge px-4 py-3">
        <h2 className="me-auto text-lg font-semibold">{t('composer.projects')}</h2>
        <button onClick={requestClose} className="rounded px-2 py-1 text-slate-400 hover:text-white" aria-label={t('dialog.close')}>
          ✕
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-edge p-4">
        <select aria-label={t('composer.canvasSize')} value={preset} onChange={(e) => setPreset(e.target.value as CanvasPresetId)} className="rounded-md border border-edge bg-ink px-2 py-1.5 text-sm">
          {CANVAS_PRESET_IDS.map((id) => (
            <option key={id} value={id}>
              {t(`composer.presets.${id}`)}
            </option>
          ))}
        </select>
        <button onClick={create} className={`${buttonPrimary} py-1.5 text-sm`}>
          {t('composer.newProject')}
        </button>
      </div>

      <ul className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3">
        {projects === null && <li className="text-sm text-slate-400">{t('dialog.rendering')}</li>}
        {projects?.map((project) => (
          <li key={project.id} className={`overflow-hidden rounded-lg border-2 bg-ink ${project.id === current?.id ? 'border-grass' : 'border-edge'}`}>
            <button onClick={() => open(project)} className="block w-full text-start" aria-label={t('composer.openNamed', { name: project.name })}>
              <div className="checker flex aspect-video items-center justify-center">
                {project.thumbnail ? <img src={project.thumbnail} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-2xl text-slate-500">▣</span>}
              </div>
              <div className="px-2 pt-1.5 text-sm font-medium">{project.name}</div>
              <div className="px-2 pb-1 text-xs text-slate-500">
                {project.width}×{project.height} · {date.format(project.updatedAt)}
              </div>
            </button>
            <div className="flex justify-end px-2 pb-2">
              <button onClick={() => void remove(project)} className={`${buttonSecondary} px-2 py-0.5 text-xs text-red-300`}>
                {t('composer.delete')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
