import * as M from '../../components/ui/popover';
import { Frame } from '../parts';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export function PopoverDemo() {
  return <Frame><M.Popover><M.PopoverAnchor asChild><span className="mr-3 text-sm">A little context</span></M.PopoverAnchor><M.PopoverTrigger asChild><Button variant="outline">Open popover</Button></M.PopoverTrigger><M.PopoverContent><label className="space-y-2 text-sm">Example title<Input placeholder="Optional name"/></label></M.PopoverContent></M.Popover></Frame>;
}
