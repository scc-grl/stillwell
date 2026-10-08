import * as M from '../../components/ui/toast';
import { Frame } from '../parts';
import * as React from 'react';
import { Button } from '../../components/ui/button';
import { useToast } from '../../hooks/use-toast';
import { Toaster } from '../../components/ui/toaster';

export function ToastDemo() {
  const [open,setOpen]=React.useState(false); const {toast}=useToast(); return <Frame><div className="flex flex-wrap gap-3"><Button onClick={()=>toast({title:'Example notification',description:'Preview only. Nothing saved.'})}>Hook notification</Button><Button variant="outline" onClick={()=>setOpen(true)}>Action notification</Button></div><Toaster/><M.ToastProvider><M.Toast open={open} onOpenChange={setOpen}><div><M.ToastTitle>An example action</M.ToastTitle><M.ToastDescription>This notification has an explicit action and close control.</M.ToastDescription></div><M.ToastAction altText="Undo example" onClick={()=>setOpen(false)}>Undo</M.ToastAction><M.ToastClose/></M.Toast><M.ToastViewport/></M.ToastProvider></Frame>;
}
