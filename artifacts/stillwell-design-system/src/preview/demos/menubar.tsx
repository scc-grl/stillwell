import * as M from '../../components/ui/menubar';
import { Frame } from '../parts';
import * as React from 'react';

export function MenubarDemo() {
  const [checked,setChecked]=React.useState(false);const [view,setView]=React.useState('list');return <Frame><M.Menubar><M.MenubarMenu><M.MenubarTrigger>Actions</M.MenubarTrigger><M.MenubarContent><M.MenubarLabel>Example actions</M.MenubarLabel><M.MenubarGroup><M.MenubarItem>Open<M.MenubarShortcut>↵</M.MenubarShortcut></M.MenubarItem></M.MenubarGroup><M.MenubarSeparator/><M.MenubarCheckboxItem checked={checked} onCheckedChange={setChecked}>Show details</M.MenubarCheckboxItem><M.MenubarRadioGroup value={view} onValueChange={setView}><M.MenubarRadioItem value="list">List</M.MenubarRadioItem><M.MenubarRadioItem value="grid">Grid</M.MenubarRadioItem></M.MenubarRadioGroup><M.MenubarSub><M.MenubarSubTrigger>More</M.MenubarSubTrigger><M.MenubarPortal><M.MenubarSubContent><M.MenubarItem>Supporting action</M.MenubarItem></M.MenubarSubContent></M.MenubarPortal></M.MenubarSub></M.MenubarContent></M.MenubarMenu><M.MenubarMenu><M.MenubarTrigger>Help</M.MenubarTrigger><M.MenubarContent><M.MenubarItem disabled>Unavailable</M.MenubarItem></M.MenubarContent></M.MenubarMenu></M.Menubar></Frame>;
}
