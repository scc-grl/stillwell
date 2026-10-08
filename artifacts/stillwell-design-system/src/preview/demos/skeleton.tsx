import * as M from '../../components/ui/skeleton';
import { Frame } from '../parts';

export function SkeletonDemo() {
  return <Frame><div aria-label="Example loading placeholder" className="flex items-center gap-4"><M.Skeleton className="h-12 w-12 rounded-full"/><div className="flex-1 space-y-3"><M.Skeleton className="h-4 w-2/3"/><M.Skeleton className="h-4 w-full"/></div></div><p className="text-sm text-muted-foreground">Loading appearance only; motion respects reduced-motion preferences.</p></Frame>;
}
