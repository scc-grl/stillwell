import * as M from '../../components/ui/field';
import { Frame } from '../parts';
import { Input } from '../../components/ui/input';
import { Checkbox } from '../../components/ui/checkbox';

export function FieldDemo() {
  return <Frame><M.FieldSet><M.FieldLegend>Related fields</M.FieldLegend><M.FieldDescription>Clear grouping and supporting context.</M.FieldDescription><M.FieldGroup><M.Field><M.FieldLabel htmlFor="field-name">Name this space</M.FieldLabel><Input id="field-name" placeholder="Optional title"/><M.FieldDescription>Leave blank if you like.</M.FieldDescription></M.Field><M.FieldSeparator>Or</M.FieldSeparator><M.Field orientation="horizontal"><Checkbox id="field-choice"/><M.FieldContent><M.FieldLabel htmlFor="field-choice">A supporting choice</M.FieldLabel><M.FieldDescription>Horizontal composition</M.FieldDescription></M.FieldContent></M.Field><M.Field data-invalid><M.FieldLabel htmlFor="field-invalid">Review state</M.FieldLabel><Input id="field-invalid" aria-invalid="true"/><M.FieldError errors={[{message:'Example validation message'}]}/></M.Field><M.Field orientation="responsive"><M.FieldContent><M.FieldTitle>Responsive arrangement</M.FieldTitle><M.FieldDescription>Adapts to available room.</M.FieldDescription></M.FieldContent><Input aria-label="Responsive example"/></M.Field></M.FieldGroup></M.FieldSet></Frame>;
}
