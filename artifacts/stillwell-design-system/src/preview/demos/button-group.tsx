import * as M from '../../components/ui/button-group';
import { Frame } from '../parts';
import { Button } from '../../components/ui/button';

export function ButtonGroupDemo() {
  return <Frame><M.ButtonGroup><Button variant="outline">First</Button><M.ButtonGroupSeparator/><Button variant="outline">Second</Button><M.ButtonGroupText>Preview</M.ButtonGroupText></M.ButtonGroup><M.ButtonGroup orientation="vertical"><Button variant="outline">Top</Button><Button variant="outline">Bottom</Button></M.ButtonGroup></Frame>;
}
