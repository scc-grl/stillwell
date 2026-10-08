import * as M from '../../components/ui/pagination';
import { Frame } from '../parts';
import * as React from 'react';

export function PaginationDemo() {
  const [page,setPage]=React.useState(1);return <Frame><M.Pagination><M.PaginationContent><M.PaginationItem><M.PaginationPrevious href="#" onClick={e=>{e.preventDefault();setPage(Math.max(1,page-1))}}/></M.PaginationItem>{[1,2,3].map(n=><M.PaginationItem key={n}><M.PaginationLink href="#" isActive={page===n} onClick={e=>{e.preventDefault();setPage(n)}}>{n}</M.PaginationLink></M.PaginationItem>)}<M.PaginationItem><M.PaginationEllipsis/></M.PaginationItem><M.PaginationItem><M.PaginationNext href="#" onClick={e=>{e.preventDefault();setPage(Math.min(3,page+1))}}/></M.PaginationItem></M.PaginationContent></M.Pagination><p role="status" className="text-xs text-muted-foreground">Example page {page} of 3</p></Frame>;
}
