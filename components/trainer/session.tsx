'use client';
import {createContext,useContext,useEffect,useState,useCallback,useRef,type ReactNode} from 'react';
import type {User} from '@supabase/supabase-js';
import {browserDB,api,configureBrowserDB,type PublicDBConfig} from '@/src/lib/supabase';
import {resultSchema,type Result} from '@/src/lib/schema';
interface State {user:User|null;ready:boolean;configured:boolean;results:Result[];notice:string;record:(r:Result)=>Promise<void>;refresh:()=>Promise<void>}
const Context=createContext<State>({user:null,ready:false,configured:false,results:[],notice:'',record:async()=>{},refresh:async()=>{}});
export function SessionProvider({children,publicConfig=null}:{children:ReactNode;publicConfig?:PublicDBConfig|null}) {
 const configured=!!publicConfig;
 const [user,setUser]=useState<User|null>(null);const [ready,setReady]=useState(false);const [results,setResults]=useState<Result[]>([]);const [notice,setNotice]=useState('');const currentUser=useRef<string|null>(null);
 const refresh=useCallback(async()=>{const owner=currentUser.current;try{const data=await api('/api/progress');if(owner!==currentUser.current)return;setResults(data.results.map((r:unknown)=>resultSchema.parse(r)));setNotice('');}catch{if(owner!==currentUser.current)return;setNotice('Não foi possível carregar o progresso da conta. Os treinos continuam disponíveis.');}},[]);
 useEffect(()=>{configureBrowserDB(publicConfig);const db=browserDB();if(!db){setReady(true);return;}let active=true;
 db.auth.getSession().then(({data})=>{if(active){currentUser.current=data.session?.user.id||null;setUser(data.session?.user||null);setReady(true);}}).catch(()=>{if(active)setReady(true);});
 const {data}=db.auth.onAuthStateChange((_event,session)=>{currentUser.current=session?.user.id||null;setUser(session?.user||null);setReady(true);});
 return()=>{active=false;data.subscription.unsubscribe();};},[publicConfig]);
 useEffect(()=>{setResults([]);setNotice('');if(user)void refresh();},[user,refresh]);
 async function record(r:Result){setResults(old=>[r,...old.filter(x=>x.id!==r.id)]);if(!user){setNotice('Treino concluído nesta visita. Entre em uma conta para salvar os próximos treinos entre dispositivos.');return;}try{await api('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(r)});setNotice('Progresso salvo na sua conta.');}catch{setNotice('Não foi possível salvar este treino na conta. O resultado está disponível apenas nesta visita.');}}
 return <Context.Provider value={{user,ready,configured,results,notice,record,refresh}}>{children}</Context.Provider>;
}
export function useSession(){return useContext(Context);}
