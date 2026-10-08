import { lazy, type ComponentType } from 'react';
import { OverviewPage, BrandPage, ColorsPage, FontsPage, LayoutPage, ContentPage } from './foundations';
export type PreviewEntry = { id: string; name: string; description: string; Page: ComponentType };
export type NavGroup = { name: string; entries: PreviewEntry[] };
export const DESIGN_SYSTEM = { title: 'Stillwell Design System', description: 'A reusable visual language drawn from Stillwell Recovery, with live components and source-based design guidance.' } as const;
export const OVERVIEW_ENTRY: PreviewEntry = { id: 'overview', name: 'Overview', description: 'Foundations and five-component pilot', Page: OverviewPage };
const ButtonDemo = lazy(() => import('./demos/button').then(m => ({ default: m.ButtonDemo })));
const CardDemo = lazy(() => import('./demos/card').then(m => ({ default: m.CardDemo })));
const InputDemo = lazy(() => import('./demos/input').then(m => ({ default: m.InputDemo })));
const TextareaDemo = lazy(() => import('./demos/textarea').then(m => ({ default: m.TextareaDemo })));
const CheckboxDemo = lazy(() => import('./demos/checkbox').then(m => ({ default: m.CheckboxDemo })));
export const NAV_GROUPS: NavGroup[] = [
 { name: 'Brand', entries: [{id:'brand-logo',name:'Logo',description:'Retained original mark',Page:BrandPage}] },
 { name: 'Colors', entries: [{id:'colors-palette',name:'Palette & semantic roles',description:'Light and dark token colors',Page:ColorsPage}] },
 { name: 'Fonts', entries: [{id:'fonts-type',name:'Families & type scale',description:'Fraunces and DM Sans',Page:FontsPage}] },
 { name: 'Layout', entries: [{id:'layout-spacing',name:'Spacing & surfaces',description:'Radius, spacing, responsiveness and motion',Page:LayoutPage}] },
 { name: 'Actions', entries: [{id:'button',name:'Buttons',description:'Variants, sizes and states',Page:ButtonDemo}] },
 { name: 'Forms & inputs', entries: [{id:'input',name:'Inputs',description:'Text, date, invalid and disabled states',Page:InputDemo},{id:'textarea',name:'Text areas',description:'Optional reflections and native behavior',Page:TextareaDemo},{id:'checkbox',name:'Checkboxes',description:'Controlled, unchecked, checked and disabled states',Page:CheckboxDemo}] },
 { name: 'Surfaces', entries: [{id:'card',name:'Cards',description:'Header, content and footer composition',Page:CardDemo}] },
 { name: 'Content', entries: [{id:'content-voice',name:'Voice & tone',description:'Source conventions for calm, optional language',Page:ContentPage}] }
];
export const ALL_ENTRIES = [OVERVIEW_ENTRY, ...NAV_GROUPS.flatMap(group => group.entries)];
if (new Set(ALL_ENTRIES.map(entry => entry.id)).size !== ALL_ENTRIES.length) throw new Error('Duplicate design-system navigation id');
