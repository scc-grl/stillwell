import * as M from '../../components/ui/resizable';
import { Frame } from '../parts';

export function ResizableDemo() {
  return <Frame><M.ResizablePanelGroup direction="horizontal" className="min-h-52 max-w-full rounded-xl border"><M.ResizablePanel defaultSize={40} minSize={20}><div className="flex h-52 items-center justify-center text-sm">First panel</div></M.ResizablePanel><M.ResizableHandle withHandle/><M.ResizablePanel defaultSize={60} minSize={20}><div className="flex h-52 items-center justify-center text-sm">Second panel</div></M.ResizablePanel></M.ResizablePanelGroup><p className="text-xs text-muted-foreground">Bounded resizing and keyboard support from the source runtime.</p></Frame>;
}
