import * as M from '../../components/ui/aspect-ratio';
import { Frame } from '../parts';

export function AspectRatioDemo() {
  return <Frame><div className="max-w-lg"><M.AspectRatio ratio={16/9} className="flex items-center justify-center rounded-xl bg-secondary text-secondary-foreground"><p className="font-serif text-3xl">16 : 9</p></M.AspectRatio></div><div className="max-w-xs"><M.AspectRatio ratio={1} className="flex items-center justify-center rounded-xl bg-accent text-accent-foreground">1 : 1</M.AspectRatio></div></Frame>;
}
