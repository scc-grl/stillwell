import * as M from '../../components/ui/breadcrumb';
import { Frame } from '../parts';

export function BreadcrumbDemo() {
  return <Frame><M.Breadcrumb><M.BreadcrumbList><M.BreadcrumbItem><M.BreadcrumbLink href="#page=overview">Overview</M.BreadcrumbLink></M.BreadcrumbItem><M.BreadcrumbSeparator/><M.BreadcrumbItem><M.BreadcrumbEllipsis/></M.BreadcrumbItem><M.BreadcrumbSeparator/><M.BreadcrumbItem><M.BreadcrumbLink href="#page=colors-palette">Colors</M.BreadcrumbLink></M.BreadcrumbItem><M.BreadcrumbSeparator/><M.BreadcrumbItem><M.BreadcrumbPage>Current page</M.BreadcrumbPage></M.BreadcrumbItem></M.BreadcrumbList></M.Breadcrumb></Frame>;
}
