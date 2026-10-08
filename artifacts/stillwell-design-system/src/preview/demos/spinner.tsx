import * as M from '../../components/ui/spinner';
import { Frame } from '../parts';
import { Button } from '../../components/ui/button';

export function SpinnerDemo() {
  return <Frame><div className="flex items-center gap-5"><M.Spinner className="size-4"/><M.Spinner className="size-6 text-primary"/><M.Spinner className="size-8 text-muted-foreground"/></div><Button disabled><M.Spinner/>Loading example</Button><p className="text-xs text-muted-foreground">Visual loading states; animation respects reduced-motion preferences.</p></Frame>;
}
