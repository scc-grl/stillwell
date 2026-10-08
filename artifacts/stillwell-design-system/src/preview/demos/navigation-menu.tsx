import * as M from '../../components/ui/navigation-menu';
import { Frame } from '../parts';

export function NavigationMenuDemo() {
  return <Frame><M.NavigationMenu><M.NavigationMenuList><M.NavigationMenuItem><M.NavigationMenuTrigger>Foundations</M.NavigationMenuTrigger><M.NavigationMenuContent><div className="grid w-64 gap-3 p-4"><M.NavigationMenuLink asChild><a href="#page=colors-palette">Colors</a></M.NavigationMenuLink><M.NavigationMenuLink asChild><a href="#page=fonts-type">Typography</a></M.NavigationMenuLink></div></M.NavigationMenuContent></M.NavigationMenuItem><M.NavigationMenuItem><M.NavigationMenuLink className={M.navigationMenuTriggerStyle()} href="#page=overview">Overview</M.NavigationMenuLink></M.NavigationMenuItem></M.NavigationMenuList></M.NavigationMenu></Frame>;
}
