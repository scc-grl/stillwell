import * as M from '../../components/ui/context-menu';
import { Frame } from '../parts';
import * as React from 'react';

export function ContextMenuDemo() {
  const [checked,setChecked]=React.useState(false);const [view,setView]=React.useState('list');return <Frame><M.ContextMenu><M.ContextMenuTrigger className="flex h-40 items-center justify-center rounded-xl border border-dashed text-sm">Right-click this bounded area</M.ContextMenuTrigger><M.ContextMenuContent><M.ContextMenuLabel>Example actions</M.ContextMenuLabel><M.ContextMenuItem>Open<M.ContextMenuShortcut>↵</M.ContextMenuShortcut></M.ContextMenuItem><M.ContextMenuSeparator/><M.ContextMenuCheckboxItem checked={checked} onCheckedChange={setChecked}>Show details</M.ContextMenuCheckboxItem><M.ContextMenuRadioGroup value={view} onValueChange={setView}><M.ContextMenuRadioItem value="list">List</M.ContextMenuRadioItem><M.ContextMenuRadioItem value="grid">Grid</M.ContextMenuRadioItem></M.ContextMenuRadioGroup><M.ContextMenuSub><M.ContextMenuSubTrigger>More</M.ContextMenuSubTrigger><M.ContextMenuSubContent><M.ContextMenuItem>Supporting action</M.ContextMenuItem></M.ContextMenuSubContent></M.ContextMenuSub><M.ContextMenuItem disabled>Unavailable</M.ContextMenuItem></M.ContextMenuContent></M.ContextMenu></Frame>;
}
