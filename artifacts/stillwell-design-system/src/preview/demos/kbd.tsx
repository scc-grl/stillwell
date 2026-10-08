import * as M from '../../components/ui/kbd';
import { Frame } from '../parts';

export function KbdDemo() {
  return <Frame><p className="flex items-center gap-3 text-sm">A single key <M.Kbd>Esc</M.Kbd></p><p className="flex items-center gap-3 text-sm">A chord <M.KbdGroup><M.Kbd>⌘</M.Kbd><span>+</span><M.Kbd>K</M.Kbd></M.KbdGroup></p></Frame>;
}
