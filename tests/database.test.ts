import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {questions} from '../src/data/questions';
const u1='00000000-0000-4000-8000-000000000001',u2='00000000-0000-4000-8000-000000000002';
async function setup(){const db=new PGlite();await db.exec(`create schema auth; create schema storage; create role anon; create role authenticated; create role service_role bypassrls; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema public,auth,storage to authenticated,anon,service_role; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(id uuid,name text,bucket_id text); alter table storage.objects enable row level security; create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;`);await db.exec(readFileSync('supabase/migrations/202608280001_initial.sql','utf8'));await db.exec(readFileSync('supabase/migrations/202608280002_questions.sql','utf8'));await db.query('insert into auth.users(id) values($1),($2)',[u1,u2]);return db;}
test('migrations, RLS, atomic quota, cache and isolated progress',async()=>{const db=await setup();try{
 const reserve=async(user:string,hash:string,limit=2)=>{const {rows}=await db.query<{r:{status:string;lease:string;result?:unknown}}>('select public.reserve_ai($1,$2,\'question\',$3,\'text\') as r',[user,hash,limit]);return rows[0].r;};
 const a=await reserve(u1,'a'.repeat(64));assert.equal(a.status,'reserved');
 assert.equal((await reserve(u1,'b'.repeat(64))).status,'busy');
 assert.equal((await reserve(u2,'a'.repeat(64))).status,'reserved');
 assert.equal((await db.query<{count:number}>('select count from public.daily_ai_usage where user_id=$1',[u1])).rows[0].count,1);
 await db.query('select public.finish_ai($1,$2,\'question\',$3,$4)',[u1,'a'.repeat(64),a.lease,JSON.stringify({...questions[0],source:'ia'})]);
 assert.equal((await reserve(u1,'a'.repeat(64))).status,'cached');
 const b=await reserve(u1,'b'.repeat(64));assert.equal(b.status,'reserved');
 // Stale completion must not release a newer lease.
 const stale=await db.query<{ok:boolean}>('select public.finish_ai($1,$2,\'question\',$3,null) as ok',[u1,'b'.repeat(64),a.lease]);assert.equal(stale.rows[0].ok,false);
 await db.query('select public.finish_ai($1,$2,\'question\',$3,null)',[u1,'b'.repeat(64),b.lease]);
 assert.equal((await reserve(u1,'c'.repeat(64))).status,'limited');
 assert.equal((await reserve(u1,'a'.repeat(64))).status,'cached');
 // Authenticated users can read only their own usage and cannot reserve, mutate counts or read other accounts.
 await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${u1}',false);`);
 assert.equal((await db.query('select * from public.questions')).rows.length,10);
 assert.equal((await db.query('select * from public.daily_ai_usage')).rows.length,1);
 await assert.rejects(()=>db.query('update public.daily_ai_usage set count=0'));
 await assert.rejects(()=>reserve(u1,'z'.repeat(64),100));
 await db.exec(`select set_config('request.jwt.claim.sub','${u2}',false);`);
 assert.equal((await db.query('select * from public.user_questions')).rows.length,0);
 await db.exec('reset role');
 const q=questions[0];const result={id:crypto.randomUUID(),questionId:q.id,title:q.title,topic:q.topic,completedAt:new Date().toISOString(),attempts:q.steps.map((s,step)=>({step,category:s.category,correct:true,hints:0,revealed:false}))};
 await db.query('select public.save_result($1,$2)',[u1,JSON.stringify(result)]);await db.query('select public.save_result($1,$2)',[u1,JSON.stringify(result)]);
 assert.equal((await db.query('select * from public.question_results')).rows.length,1);assert.equal((await db.query('select * from public.attempts')).rows.length,10);assert.equal((await db.query<{completed:number}>('select completed from public.topic_progress')).rows[0].completed,1);
 await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${u2}',false);`);assert.equal((await db.query('select * from public.question_results')).rows.length,0);assert.equal((await db.query('select * from public.attempts')).rows.length,0);
 await db.exec('reset role');
 // Expired lock recovers without refunding consumed quota.
 await db.query("update public.question_analysis set lease_until=now()-interval '1 second' where user_id=$1",[u2]);assert.equal((await reserve(u2,'d'.repeat(64))).status,'reserved');
}finally{await db.close();}});
