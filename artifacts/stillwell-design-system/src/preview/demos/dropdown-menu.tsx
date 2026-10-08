import * as M from '../../components/ui/dropdown-menu';
import { Frame } from '../parts';
import * as React from 'react';
import * as Icon from 'lucide-react';
import { Button } from '../../components/ui/button';

export function DropdownMenuDemo() {
  const [checked,setChecked]=React.useState(true);const [view,setView]=React.useState('list');return <Frame><M.DropdownMenu><M.DropdownMenuTrigger asChild><Button variant="outline">Example actions <Icon.ChevronDown/></Button></M.DropdownMenuTrigger><M.DropdownMenuContent><M.DropdownMenuLabel>Choose an action</M.DropdownMenuLabel><M.DropdownMenuGroup><M.DropdownMenuItem>Open<M.DropdownMenuShortcut>↵</M.DropdownMenuShortcut></M.DropdownMenuItem></M.DropdownMenuGroup><M.DropdownMenuSeparator/><M.DropdownMenuCheckboxItem checked={checked} onCheckedChange={setChecked}>Show details</M.DropdownMenuCheckboxItem><M.DropdownMenuRadioGroup value={view} onValueChange={setView}><M.DropdownMenuRadioItem value="list">List</M.DropdownMenuRadioItem><M.DropdownMenuRadioItem value="grid">Grid</M.DropdownMenuRadioItem></M.DropdownMenuRadioGroup><M.DropdownMenuSub><M.DropdownMenuSubTrigger>More</M.DropdownMenuSubTrigger><M.DropdownMenuPortal><M.DropdownMenuSubContent><M.DropdownMenuItem>Supporting action</M.DropdownMenuItem></M.DropdownMenuSubContent></M.DropdownMenuPortal></M.DropdownMenuSub><M.DropdownMenuItem disabled>Unavailable</M.DropdownMenuItem></M.DropdownMenuContent></M.DropdownMenu></Frame>;
}
