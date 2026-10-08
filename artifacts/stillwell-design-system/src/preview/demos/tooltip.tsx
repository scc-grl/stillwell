import * as M from '../../components/ui/tooltip';
import { Frame } from '../parts';
import { Button } from '../../components/ui/button';

export function TooltipDemo() {
  return <Frame><M.TooltipProvider delayDuration={200}><M.Tooltip><M.TooltipTrigger asChild><Button variant="outline">Hover or focus</Button></M.TooltipTrigger><M.TooltipContent>A little supporting context.</M.TooltipContent></M.Tooltip></M.TooltipProvider></Frame>;
}
