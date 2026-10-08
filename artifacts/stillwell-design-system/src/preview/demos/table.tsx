import * as M from '../../components/ui/table';
import { Frame } from '../parts';

export function TableDemo() {
  return <Frame><M.Table><M.TableCaption>Illustrative items, not user records.</M.TableCaption><M.TableHeader><M.TableRow><M.TableHead>Example item</M.TableHead><M.TableHead>State</M.TableHead></M.TableRow></M.TableHeader><M.TableBody><M.TableRow><M.TableCell>A small reflection</M.TableCell><M.TableCell>Draft</M.TableCell></M.TableRow><M.TableRow data-state="selected"><M.TableCell>A quiet space</M.TableCell><M.TableCell>Selected</M.TableCell></M.TableRow></M.TableBody><M.TableFooter><M.TableRow><M.TableCell colSpan={2}>Two example items</M.TableCell></M.TableRow></M.TableFooter></M.Table></Frame>;
}
