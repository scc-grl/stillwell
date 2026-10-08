import * as M from '../../components/ui/collapsible';
import { Frame } from '../parts';
import * as React from 'react';
import { Button } from '../../components/ui/button';

export function CollapsibleDemo() {
  const [open,setOpen]=React.useState(false);return <Frame><M.Collapsible open={open} onOpenChange={setOpen}><M.CollapsibleTrigger asChild><Button variant="outline">{open?'Hide details':'Show details'}</Button></M.CollapsibleTrigger><M.CollapsibleContent className="pt-4 text-sm">Optional supporting details, controlled by the original primitive.</M.CollapsibleContent></M.Collapsible></Frame>;
}
