import * as M from '../../components/ui/avatar';
import { Frame } from '../parts';

export function AvatarDemo() {
  return <Frame><div className="flex items-center gap-4"><M.Avatar><M.AvatarImage src={import.meta.env.BASE_URL+'logo.png'} alt="Source mark"/><M.AvatarFallback>SW</M.AvatarFallback></M.Avatar><M.Avatar><M.AvatarFallback>AB</M.AvatarFallback></M.Avatar><M.Avatar className="h-14 w-14"><M.AvatarFallback>SW</M.AvatarFallback></M.Avatar></div><p className="text-sm text-muted-foreground">Loaded image and fallback initials, without account data.</p></Frame>;
}
