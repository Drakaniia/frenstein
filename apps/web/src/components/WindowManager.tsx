import type { ReactNode } from 'react';

import { BirthdayApp } from '@/apps/Birthday/BirthdayApp';
import { ExplorerApp } from '@/apps/Explorer/ExplorerApp';
import { HeartsApp } from '@/apps/Hearts/HeartsApp';
import { HelpApp } from '@/apps/Help/HelpApp';
import { MusicApp } from '@/apps/Music/MusicApp';
import { NotepadApp } from '@/apps/Notepad/NotepadApp';
import { PhotoViewer } from '@/apps/Photos/PhotoViewer';
import { PhotosApp } from '@/apps/Photos/PhotosApp';
import { ControlPanelApp } from '@/apps/Settings/ControlPanelApp';
import { TrashApp } from '@/apps/Trash/TrashApp';
import { useOs } from '@/os/OsProvider';
import type { AppId, WindowState } from '@/os/types';
import { Window } from './Window';

const RENDERERS: Record<AppId, (win: WindowState) => ReactNode> = {
  mycomputer: (win) => <ExplorerApp win={win} home={[]} />,
  mydocuments: (win) => <ExplorerApp win={win} home={['drive-c', 'documents']} />,
  photos: (win) => <PhotosApp win={win} />,
  viewer: (win) => <PhotoViewer win={win} />,
  music: (win) => <MusicApp win={win} />,
  notepad: (win) => <NotepadApp win={win} />,
  hearts: (win) => <HeartsApp win={win} />,
  birthday: (win) => <BirthdayApp win={win} />,
  trash: (win) => <TrashApp win={win} />,
  settings: (win) => <ControlPanelApp win={win} />,
  help: (win) => <HelpApp win={win} />,
  screensaver: () => null,
  about: () => null,
  run: () => null,
};

/**
 * The window layer. Minimized windows stay mounted (hidden), so the music
 * keeps playing and a half-written note survives; the layer is its own
 * stacking context, so no window can ever cover the taskbar.
 */
export function WindowManager() {
  const { state } = useOs();
  return (
    <div className="window-layer" style={{ zIndex: 'var(--z-windows)' }}>
      {state.windows.map((win) => (
        <Window key={win.id} win={win} active={state.activeId === win.id}>
          {RENDERERS[win.appId](win)}
        </Window>
      ))}
    </div>
  );
}
