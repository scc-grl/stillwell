import * as M from '../../components/ui/form';
import { Frame } from '../parts';
import * as React from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useForm } from 'react-hook-form';

export function FormDemo() {
  const form=useForm<{name:string}>({defaultValues:{name:''}});const [message,setMessage]=React.useState('');return <Frame><M.Form {...form}><form onSubmit={form.handleSubmit(()=>setMessage('Preview submitted. Nothing was stored.'))} className="space-y-5"><M.FormField control={form.control} name="name" rules={{required:'Enter a name for this example.'}} render={({field})=><M.FormItem><M.FormLabel>Example name</M.FormLabel><M.FormControl><Input placeholder="Name this space" {...field}/></M.FormControl><M.FormDescription>A local form-validation example.</M.FormDescription><M.FormMessage/></M.FormItem>}/><Button type="submit">Try validation</Button><p role="status" className="text-xs text-muted-foreground">{message}</p></form></M.Form></Frame>;
}
