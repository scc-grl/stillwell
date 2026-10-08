import * as M from '../../components/ui/sonner';
import { Frame } from '../parts';
import { Button } from '../../components/ui/button';
import { toast as sonnerToast } from 'sonner';

export function SonnerDemo() {
  return <Frame><div className="flex flex-wrap gap-3"><Button onClick={()=>sonnerToast('Example notification',{description:'Preview only. Nothing stored.'})}>Default</Button><Button variant="outline" onClick={()=>sonnerToast.success('Example success')}>Success</Button><Button variant="outline" onClick={()=>sonnerToast.error('Example review state')}>Error</Button><Button variant="outline" onClick={()=>sonnerToast('Example action',{action:{label:'Undo',onClick:()=>sonnerToast.dismiss()}})}>With action</Button></div><M.Toaster/></Frame>;
}
