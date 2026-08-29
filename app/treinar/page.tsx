'use client';
import {Suspense,useState,useEffect} from 'react';
import {useSearchParams} from 'next/navigation';
import {ArrowRight,BookOpen,Clock3} from 'lucide-react';
import {questions} from '@/src/data/questions';
import {topics,questionSchema,type Question} from '@/src/lib/schema';
import {Exercise} from '@/components/trainer/exercise';
import {useSession} from '@/components/trainer/session';
import {api} from '@/src/lib/supabase';
import {Select,SelectTrigger,SelectContent,SelectItem,SelectValue} from '@/components/ui/select';
function Training(){const params=useSearchParams();const [topic,setTopic]=useState(params.get('tema')||'Todos');const [active,setActive]=useState<Question|null>(null);const [series,setSeries]=useState<Question[]>([]);const [saved,setSaved]=useState<Question[]>([]);const [historyError,setHistoryError]=useState('');const {user}=useSession();
 useEffect(()=>{setTopic(params.get('tema')||'Todos');if(params.get('serie')==='1'){const qs=questions.filter(q=>q.topic===(params.get('tema')||'Cinemática')).slice(0,5);setSeries(qs);setActive(qs[0]||null);}},[params]);
 useEffect(()=>{setSaved([]);setHistoryError('');let current=true;if(user)api('/api/analyze').then(data=>{if(current)setSaved(data.questions.map((q:unknown)=>questionSchema.parse(q)));}).catch(()=>{if(current)setHistoryError('As questões da sua conta não carregaram agora. As autorais continuam aqui.');});return()=>{current=false;};},[user]);
 if(active){const index=series.findIndex(q=>q.id===active.id);return <div className="page"><Exercise key={active.id} question={active} seriesLabel={index>=0?`QUESTÃO ${index+1} DE ${series.length}`:undefined} onExit={()=>{setActive(null);setSeries([]);}} onNext={index>=0&&index<series.length-1?()=>setActive(series[index+1]):undefined}/></div>;}
 const visible=[...questions,...saved].filter(q=>topic==='Todos'||q.topic===topic);
 return <div className="page"><div className="eyebrow">ENTENDER · PRATICAR · EVOLUIR</div><h1>Treinar <em>Física</em></h1><p className="page-intro">O raciocínio também se aprende. Escolha uma questão para começar.</p><div className="toolbar"><span className="muted">{visible.length} questões disponíveis · autorais sem uso de IA</span><Select value={topic} onValueChange={setTopic}><SelectTrigger aria-label="Filtrar conteúdo"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Todos">Todos os conteúdos</SelectItem>{topics.map(t=><SelectItem value={t} key={t}>{t}</SelectItem>)}</SelectContent></Select></div>{historyError&&<p className="notice">{historyError}</p>}<div className="question-grid">{visible.map((q,i)=><button className="question-card" key={q.id} onClick={()=>setActive(q)}><div className="section-heading"><span className="question-number">{String(i+1).padStart(2,'0')}</span><span className="pill">{q.difficulty}</span></div><span className="eyebrow">{q.topic}</span><h2>{q.title}</h2><p>{q.statement.slice(0,125)}…</p><div className="question-card-footer"><span><Clock3 size={14}/> ~5 minutos</span><span>{q.source==='autoral'?'Autoral':'Sua questão'} <ArrowRight size={17}/></span></div></button>)}</div><p className="notice"><BookOpen size={17}/> Questões autorais no estilo ENEM, não retiradas de provas oficiais. A resposta só aparece ao avançar pelo raciocínio.</p></div>;
}
export default function Page(){return <Suspense fallback={<div className="page">Carregando treinos…</div>}><Training/></Suspense>;}
