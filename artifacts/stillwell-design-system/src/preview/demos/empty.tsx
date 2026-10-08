import * as M from '../../components/ui/empty';
import { Frame } from '../parts';
import * as Icon from 'lucide-react';
import { Button } from '../../components/ui/button';

export function EmptyDemo() {
  return <Frame><M.Empty><M.EmptyHeader><M.EmptyMedia variant="icon"><Icon.Leaf/></M.EmptyMedia><M.EmptyTitle>Room for a first step</M.EmptyTitle><M.EmptyDescription>No example items yet. Add something only when you are ready.</M.EmptyDescription></M.EmptyHeader><M.EmptyContent><Button>Example action</Button></M.EmptyContent></M.Empty><M.Empty><M.EmptyHeader><M.EmptyMedia>SW</M.EmptyMedia><M.EmptyTitle>Text-only state</M.EmptyTitle><M.EmptyDescription>A second source media variant.</M.EmptyDescription></M.EmptyHeader></M.Empty></Frame>;
}
