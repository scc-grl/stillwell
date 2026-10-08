import * as M from '../../components/ui/dialog';
import { Frame } from '../parts';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export function DialogDemo() {
  return <Frame><M.Dialog><M.DialogTrigger asChild><Button>Open dialog</Button></M.DialogTrigger><M.DialogContent><M.DialogHeader><M.DialogTitle>A quiet pause</M.DialogTitle><M.DialogDescription>Example overlay. No information is stored.</M.DialogDescription></M.DialogHeader><Input aria-label="Example title" placeholder="Name this space"/><M.DialogFooter><M.DialogClose asChild><Button variant="outline">Close</Button></M.DialogClose></M.DialogFooter></M.DialogContent></M.Dialog></Frame>;
}
