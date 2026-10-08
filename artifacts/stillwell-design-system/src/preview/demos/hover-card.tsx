import * as M from '../../components/ui/hover-card';
import { Frame } from '../parts';
import { Button } from '../../components/ui/button';

export function HoverCardDemo() {
  return <Frame><M.HoverCard><M.HoverCardTrigger asChild><Button asChild variant="link"><a href="#page=brand-logo">Stillwell</a></Button></M.HoverCardTrigger><M.HoverCardContent><p className="font-serif text-xl">Care at your pace.</p><p className="mt-2 text-sm text-muted-foreground">Supporting information shown on hover or focus.</p></M.HoverCardContent></M.HoverCard></Frame>;
}
