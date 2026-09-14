import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '../../../app/route';
import { getCamera } from '../../../data/cameras';
import { POSES } from '../../../data/poses';
import { SCENES } from '../../../data/scenes';
import { useActiveSkin, useStudio } from '../../../store/studio';
import { buttonPrimary, buttonSecondary, useAnimatedDialog } from '../../../ui/controls';
import type { Skin } from '../../skins/types';
import { shotName, useShotContext } from '../../studio/Gallery';
import { addShotsToEditor } from '../../studio/editorBridge';
import { buildShot, shotKey, type ShotContext, type ShotRef } from '../../studio/shots';
import { useRenderUrl } from '../../studio/useRenderUrl';

const THUMB_SIZE = 384;

/** Picker thumbnails match what gets added: transparent and tightly cropped. */
const editorSettings = (ctx: ShotContext): ShotContext => ({ ...ctx, settings: { ...ctx.settings, background: { type: 'transparent' }, frame: 'fit' } });

export function CharacterPicker({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const skin = useActiveSkin();
  const { requestClose, dialogProps } = useAnimatedDialog(onClose);

  return (
    <dialog {...dialogProps} aria-label={t('composer.addCharacter')} className="animated-dialog m-auto w-[min(94vw,900px)] rounded-xl border border-edge bg-panel p-0 text-slate-100">
      <div className="flex items-center gap-2 border-b border-edge px-4 py-3">
        <h2 className="me-auto text-lg font-semibold">{t('composer.addCharacter')}</h2>
        <button onClick={requestClose} className="rounded px-2 py-1 text-slate-400 hover:text-white" aria-label={t('dialog.close')}>
          ✕
        </button>
      </div>
      {skin ? (
        <PickerGrid skin={skin} onPicked={requestClose} />
      ) : (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-slate-300">{t('composer.noSkins')}</p>
          <button onClick={() => navigate('studio')} className={buttonPrimary}>
            {t('composer.goToGenerator')}
          </button>
        </div>
      )}
    </dialog>
  );
}

function PickerGrid({ skin, onPicked }: { skin: Skin; onPicked: () => void }) {
  const { t } = useTranslation();
  const ctx = editorSettings(useShotContext(skin));
  const cameraId = useStudio((s) => s.cameraId);
  const [mode, setMode] = useState<'pose' | 'scene'>('pose');
  const [busy, setBusy] = useState<string | null>(null);

  const shots: ShotRef[] =
    mode === 'pose'
      ? POSES.map((p) => ({ kind: 'pose', id: p.id, cameraId: getCamera(cameraId).id }))
      : SCENES.map((s) => ({ kind: 'scene', id: s.id, cameraId: getCamera(cameraId).id }));

  const pick = async (shot: ShotRef) => {
    setBusy(shotKey(shot));
    try {
      await addShotsToEditor([shot], ctx, t);
      onPicked();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex max-h-[70vh] flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        {(['pose', 'scene'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} className={`${mode === m ? buttonPrimary : buttonSecondary} py-1 text-sm`}>
            {t(m === 'pose' ? 'gallery.posesTab' : 'gallery.scenesTab')}
          </button>
        ))}
        <span className="ms-auto text-xs text-slate-400">{t('composer.pickerHint')}</span>
      </div>
      <ul className="grid grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
        {shots.map((shot) => (
          <li key={shotKey(shot)}>
            <PickerCard shot={shot} ctx={ctx} busy={busy === shotKey(shot)} disabled={!!busy} onPick={() => void pick(shot)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PickerCard({ shot, ctx, busy, disabled, onPick }: { shot: ShotRef; ctx: ShotContext; busy: boolean; disabled: boolean; onPick: () => void }) {
  const { t } = useTranslation();
  const { url } = useRenderUrl(buildShot(shot, ctx, THUMB_SIZE));
  const name = shotName(t, shot);
  return (
    <button
      onClick={onPick}
      disabled={disabled}
      aria-label={t('composer.addNamed', { name })}
      className="flex w-full flex-col overflow-hidden rounded-lg border-2 border-edge bg-ink text-start transition-colors hover:border-grass disabled:opacity-60"
    >
      <div className="checker flex aspect-square items-center justify-center p-2">
        {busy ? <span className="text-xs text-slate-300">{t('dialog.rendering')}</span> : url && <img src={url} alt="" className="fade-in max-h-full max-w-full object-contain" />}
      </div>
      <span className="truncate px-2 py-1 text-xs">{name}</span>
    </button>
  );
}
