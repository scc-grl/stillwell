import * as M from '../../components/ui/sheet';
import { Frame } from '../parts';
import { Button } from '../../components/ui/button';

export function SheetDemo() {
  return <Frame><div className="flex flex-wrap gap-3">{(['left','right','top','bottom'] as const).map(side=><M.Sheet key={side}><M.SheetTrigger asChild><Button variant="outline">Open {side}</Button></M.SheetTrigger><M.SheetContent side={side}><M.SheetHeader><M.SheetTitle>A supporting panel</M.SheetTitle><M.SheetDescription>Source sheet behavior, including keyboard dismissal.</M.SheetDescription></M.SheetHeader><M.SheetFooter><M.SheetClose asChild><Button>Close</Button></M.SheetClose></M.SheetFooter></M.SheetContent></M.Sheet>)}</div></Frame>;
}
