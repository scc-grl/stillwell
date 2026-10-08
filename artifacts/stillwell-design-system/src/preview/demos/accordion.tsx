import * as M from '../../components/ui/accordion';
import { Frame } from '../parts';

export function AccordionDemo() {
  return <Frame><M.Accordion type="single" collapsible><M.AccordionItem value="first"><M.AccordionTrigger>One thing at a time</M.AccordionTrigger><M.AccordionContent>Single-open behavior with keyboard navigation.</M.AccordionContent></M.AccordionItem><M.AccordionItem value="second"><M.AccordionTrigger>A supporting detail</M.AccordionTrigger><M.AccordionContent>A second optional section.</M.AccordionContent></M.AccordionItem><M.AccordionItem value="disabled" disabled><M.AccordionTrigger>Unavailable</M.AccordionTrigger><M.AccordionContent>Not available.</M.AccordionContent></M.AccordionItem></M.Accordion><M.Accordion type="multiple" defaultValue={['multi-a']}><M.AccordionItem value="multi-a"><M.AccordionTrigger>Multiple-open example</M.AccordionTrigger><M.AccordionContent>Several sections can stay open.</M.AccordionContent></M.AccordionItem><M.AccordionItem value="multi-b"><M.AccordionTrigger>Another section</M.AccordionTrigger><M.AccordionContent>Independent content.</M.AccordionContent></M.AccordionItem></M.Accordion></Frame>;
}
