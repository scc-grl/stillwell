import * as M from '../../components/ui/separator';
import { Frame } from '../parts';

export function SeparatorDemo() {
  return <Frame><p className="text-sm">A section boundary</p><M.Separator/><div className="flex h-8 items-center gap-4 text-sm"><span>One</span><M.Separator orientation="vertical"/><span>Two</span></div></Frame>;
}
