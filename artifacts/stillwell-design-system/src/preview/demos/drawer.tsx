import * as M from '../../components/ui/drawer';
import { Frame } from '../parts';
import { Button } from '../../components/ui/button';

export function DrawerDemo() {
  return <Frame><M.Drawer><M.DrawerTrigger asChild><Button variant="outline">Open drawer</Button></M.DrawerTrigger><M.DrawerContent><M.DrawerHeader><M.DrawerTitle>A supporting drawer</M.DrawerTitle><M.DrawerDescription>Original drag and dismiss behavior. No data is stored.</M.DrawerDescription></M.DrawerHeader><M.DrawerFooter><M.DrawerClose asChild><Button variant="outline">Close</Button></M.DrawerClose></M.DrawerFooter></M.DrawerContent></M.Drawer></Frame>;
}
