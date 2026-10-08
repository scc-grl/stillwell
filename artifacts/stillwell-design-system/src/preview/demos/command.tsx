import * as M from '../../components/ui/command';
import { Frame } from '../parts';
import * as React from 'react';
import { Button } from '../../components/ui/button';
import { DialogTitle, DialogDescription } from '../../components/ui/dialog';

export function CommandDemo() {
  const [open,setOpen]=React.useState(false);const [selected,setSelected]=React.useState('None');return <Frame><M.Command className="rounded-xl border"><M.CommandInput placeholder="Search these examples…"/><M.CommandList><M.CommandEmpty>No matches.</M.CommandEmpty><M.CommandGroup heading="Foundations">{['Brand','Colors','Fonts'].map(name=><M.CommandItem key={name} onSelect={()=>setSelected(name)}>{name}<M.CommandShortcut>↵</M.CommandShortcut></M.CommandItem>)}</M.CommandGroup><M.CommandSeparator/><M.CommandGroup heading="Unavailable"><M.CommandItem disabled>Not available</M.CommandItem></M.CommandGroup></M.CommandList></M.Command><p role="status" className="text-xs text-muted-foreground">Selected: {selected}</p><Button variant="outline" onClick={()=>setOpen(true)}>Open command dialog</Button><M.CommandDialog open={open} onOpenChange={setOpen}><DialogTitle className="sr-only">Search examples</DialogTitle><DialogDescription className="sr-only">Choose a preview item.</DialogDescription><M.CommandInput placeholder="Search…"/><M.CommandList><M.CommandEmpty>No matches.</M.CommandEmpty><M.CommandItem onSelect={()=>setOpen(false)}>Close this example</M.CommandItem></M.CommandList></M.CommandDialog></Frame>;
}
