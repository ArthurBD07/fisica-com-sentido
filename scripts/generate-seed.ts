import {writeFileSync} from 'node:fs';
import {questions} from '../src/data/questions';
const quote=(s:string)=>"'"+s.replaceAll("'","''")+"'";
const values=questions.map(q=>`(${quote(q.id)},${quote(JSON.stringify(q))}::jsonb,${quote(q.topic)},true)`).join(',\n');
writeFileSync('supabase/migrations/202608280002_questions.sql',`-- Generated from src/data/questions.ts. Authorial ENEM-style questions.\ninsert into public.questions(id,content,topic,is_public) values\n${values}\non conflict(id) do update set content=excluded.content,topic=excluded.topic;\n`);
