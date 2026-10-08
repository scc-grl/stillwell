import type { AnchorHTMLAttributes } from 'react';
export type SymptomEntry={name:'headache'|'dizziness'|'focus'|'fatigue'|'sleep'|'light_sound'|'mood';severity:number};
export type RecoveryPreferences={supportMode:'self_guided'|'clinician_supported';priorities:('food_hydration'|'movement'|'meditation'|'pacing')[]};
export type RecoveryLogInput={date:string;symptoms:SymptomEntry[];dietStatus:'done'|'not_done'|'not_planned';dietNote:string;exerciseStatus:'done'|'not_done'|'not_planned';exerciseNote:string;meditationStatus:'done'|'not_done'|'not_planned';meditationMinutes:number;meditationNote:string;note:string};
export type RecoveryLog=RecoveryLogInput & {createdAt:string;updatedAt:string};
export type RecoveryState={profile:RecoveryPreferences|null;logs:RecoveryLog[]};
const state:RecoveryState={profile:{supportMode:'self_guided',priorities:['food_hydration','movement']},logs:[]};
const client={setQueryData<T>(_key:unknown,_value:T|((old:T|undefined)=>T|undefined)){},clear(){}};
const disabledMutate=(_input:unknown,_options?:unknown)=>{};
function mutation<T>(){return {mutate:disabledMutate as (input:unknown,options?:{onSuccess?:(value:T)=>void;onError?:()=>void})=>void,isPending:false,isError:false};}
export function useGetRecovery(_options?:unknown){return {data:state,isLoading:false,isError:false,refetch:()=>Promise.resolve()};}
export function getGetRecoveryQueryKey(){return ['isolated-layout-reference'];}
export function useQueryClient(){return client;}
export function useStartRecovery(){return mutation<RecoveryState>();}
export function useUpdateRecoveryProfile(){return mutation<RecoveryPreferences>();}
export function useSaveRecoveryLog(){return mutation<RecoveryLog>();}
export function useDeleteRecoveryLog(){return mutation<void>();}
export function useUser(){return {user:{id:'isolated-reference',firstName:'Alex'}};}
export function useClerk(){return {signOut:async(_options?:unknown)=>{}};}
export function useLocation():[string,(path:string)=>void]{return ['/',()=>{}];}
export function Link(props:AnchorHTMLAttributes<HTMLAnchorElement>){return <a {...props} onClick={e=>e.preventDefault()}/>;}
