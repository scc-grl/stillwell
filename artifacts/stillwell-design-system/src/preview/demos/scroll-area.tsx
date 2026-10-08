import * as M from '../../components/ui/scroll-area';
import { Frame } from '../parts';

export function ScrollAreaDemo() {
  return <Frame><M.ScrollArea className="h-48 w-full max-w-sm rounded-xl border"><div className="space-y-3 p-4">{Array.from({length:12},(_,i)=><p key={i} className="border-b pb-3 text-sm">Example item {i+1}</p>)}</div></M.ScrollArea><M.ScrollArea className="w-full max-w-sm rounded-xl border"><div className="flex w-max gap-5 p-4">{['First section','Second section','Third section','Fourth section'].map(text=><span key={text} className="whitespace-nowrap text-sm">{text}</span>)}</div><M.ScrollBar orientation="horizontal"/></M.ScrollArea></Frame>;
}
