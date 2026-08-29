import { createClient, type SupabaseClient } from '@supabase/supabase-js';
let client:SupabaseClient|null=null;
export type PublicDBConfig = {url:string;anonKey:string};
let runtimeConfig:PublicDBConfig|null=null;
export function configureBrowserDB(config:PublicDBConfig|null){
 if(runtimeConfig?.url!==config?.url||runtimeConfig?.anonKey!==config?.anonKey)client=null;
 runtimeConfig=config;
}
export function browserDB() {
 const url=runtimeConfig?.url||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=runtimeConfig?.anonKey||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key) return null;
 if(!client) client=createClient(url,key,{global:{fetch:(url,init)=>fetch(url,{...init,signal:init?.signal||AbortSignal.timeout(12000)})}});
 return client;
}
export async function authHeaders() {
 const db=browserDB();
 if(!db) throw new Error('O modo com conta ainda não está configurado. Os treinos autorais continuam disponíveis.');
 const {data,error}=await db.auth.getSession();
 if(error || !data.session) throw new Error('Entre na sua conta para usar este recurso.');
 return {Authorization:`Bearer ${data.session.access_token}`};
}
export async function api(path:string,init:RequestInit={}) {
 const response=await fetch(path,{...init,headers:{...await authHeaders(),...init.headers},signal:AbortSignal.timeout(55000)});
 const data=await response.json().catch(()=>({error:'Não foi possível concluir agora. Tente novamente mais tarde.'}));
 if(!response.ok) throw new Error(data.error||'Serviço temporariamente indisponível.');
 return data;
}
