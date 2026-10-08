import * as M from '../../components/ui/badge';
import { Frame } from '../parts';

export function BadgeDemo() {
  return <Frame><div className="flex flex-wrap gap-3"><M.Badge>Default</M.Badge><M.Badge variant="secondary">Secondary</M.Badge><M.Badge variant="outline">Outline</M.Badge><M.Badge variant="destructive">Needs review</M.Badge></div></Frame>;
}
