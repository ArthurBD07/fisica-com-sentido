-- Execute with Supabase CLI: npx supabase db push
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(id) values(new.id) on conflict do nothing; return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id) select id from auth.users on conflict do nothing;
create table public.questions (
 id uuid primary key, content jsonb not null, topic text not null, is_public boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.user_questions (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 content jsonb not null, content_hash text not null, created_at timestamptz not null default now(),
 unique(user_id,content_hash), unique(id,user_id)
);
create table public.question_analysis (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 content_hash text not null, kind text not null check(kind in ('question','solution')), input_text text,
 result jsonb, status text not null check(status in ('pending','complete','failed')),
 lease_id uuid, lease_until timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,content_hash,kind)
);
create index analysis_user_date on public.question_analysis(user_id,created_at desc);
create index analysis_pending on public.question_analysis(user_id,lease_until) where status='pending';
create table public.daily_ai_usage (
 user_id uuid not null references auth.users(id) on delete cascade, usage_date date not null,
 count integer not null default 0 check(count>=0), updated_at timestamptz not null default now(),
 primary key(user_id,usage_date)
);
create table public.study_sessions (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 question_id uuid not null, created_at timestamptz not null default now(), completed_at timestamptz not null,
 unique(id,user_id)
);
create table public.attempts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null, step integer not null check(step between 0 and 11), category text not null,
 correct boolean not null, hints integer not null check(hints between 0 and 3), revealed boolean not null default false,
 created_at timestamptz not null default now(), foreign key(session_id,user_id) references public.study_sessions(id,user_id) on delete cascade
);
create table public.question_results (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 question_id uuid not null, topic text not null, result jsonb not null,
 created_at timestamptz not null default now(), foreign key(id,user_id) references public.study_sessions(id,user_id) on delete cascade
);
create table public.topic_progress (
 user_id uuid not null references auth.users(id) on delete cascade, topic text not null,
 completed integer not null default 0, updated_at timestamptz not null default now(),primary key(user_id,topic)
);
create table public.uploaded_solutions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 question_id uuid, kind text not null check(kind in ('question','solution')), path text not null unique,
 created_at timestamptz not null default now(), expires_at timestamptz not null default(now()+interval '30 days')
);
create index user_questions_date on public.user_questions(user_id,created_at desc);
create index sessions_user_date on public.study_sessions(user_id,completed_at desc);
create index attempts_user_category on public.attempts(user_id,category);
create index attempts_session on public.attempts(session_id,user_id);
create index results_user_date on public.question_results(user_id,created_at desc);
create index uploads_user_expiry on public.uploaded_solutions(user_id,expires_at);
create index questions_topic on public.questions(topic);
-- Every private table is read-only to the client. Mutations use narrow server RPCs.
alter table public.questions enable row level security;
create policy questions_read on public.questions for select to authenticated using(is_public);
DO $$ DECLARE t text; BEGIN
 foreach t in array array['user_questions','question_analysis','daily_ai_usage','study_sessions','attempts','question_results','topic_progress','uploaded_solutions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy own_read on public.%I for select to authenticated using (user_id = (select auth.uid()))',t) ;
 end loop;
END $$;

alter table public.profiles enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id = (select auth.uid()));
-- Only the server role can reserve budget. Client cannot pass a higher limit or reset counts.
create function public.reserve_ai(p_user uuid,p_hash text,p_kind text,p_limit integer,p_text text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cached public.question_analysis; used integer; token uuid:=gen_random_uuid(); day date:=(now() at time zone 'UTC')::date;
begin
 if p_limit<1 or p_limit>100 or p_kind not in ('question','solution') or length(p_hash)<>64 or length(p_text)>9000 then raise exception 'invalid_guard_input'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into cached from public.question_analysis where user_id=p_user and content_hash=p_hash and kind=p_kind;
 if found and cached.status='complete' and cached.result is not null then return jsonb_build_object('status','cached','result',cached.result); end if;
 if exists(select 1 from public.question_analysis where user_id=p_user and status='pending' and lease_until>now()) then return jsonb_build_object('status','busy'); end if;
 insert into public.daily_ai_usage(user_id,usage_date,count) values(p_user,day,0) on conflict do nothing;
 select count into used from public.daily_ai_usage where user_id=p_user and usage_date=day for update;
 if used>=p_limit then return jsonb_build_object('status','limited'); end if;
 update public.daily_ai_usage set count=count+1,updated_at=now() where user_id=p_user and usage_date=day;
 insert into public.question_analysis(user_id,content_hash,kind,input_text,status,lease_id,lease_until)
 values(p_user,p_hash,p_kind,p_text,'pending',token,now()+interval '90 seconds')
 on conflict(user_id,content_hash,kind) do update set status='pending',lease_id=token,lease_until=now()+interval '90 seconds',updated_at=now();
 return jsonb_build_object('status','reserved','lease',token);
end; $$;
create function public.finish_ai(p_user uuid,p_hash text,p_kind text,p_lease uuid,p_result jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.question_analysis set status=case when p_result is null then 'failed' else 'complete' end,
 result=p_result,lease_until=null,lease_id=null,updated_at=now()
 where user_id=p_user and content_hash=p_hash and kind=p_kind and lease_id=p_lease and status='pending';
 if not found then return false; end if;
 if p_result is not null and p_kind='question' then
 insert into public.user_questions(id,user_id,content,content_hash) values((p_result->>'id')::uuid,p_user,p_result,p_hash)
 on conflict(user_id,content_hash) do update set content=excluded.content;
 end if;
 return true;
end; $$;
-- A single transaction records the session, attempts, result and topic counter.
create function public.save_result(p_user uuid,p_result jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare item jsonb; session uuid:=(p_result->>'id')::uuid;
begin
 insert into public.study_sessions(id,user_id,question_id,completed_at) values(session,p_user,(p_result->>'questionId')::uuid,(p_result->>'completedAt')::timestamptz) on conflict do nothing;
 if not found then
 if not exists(select 1 from public.study_sessions where id=session and user_id=p_user) then raise exception 'not_owner'; end if;
 return false;
 end if;
 for item in select * from jsonb_array_elements(p_result->'attempts') loop
 insert into public.attempts(user_id,session_id,step,category,correct,hints,revealed) values(p_user,session,(item->>'step')::integer,item->>'category',(item->>'correct')::boolean,(item->>'hints')::integer,(item->>'revealed')::boolean);
 end loop;
 insert into public.question_results(id,user_id,question_id,topic,result) values(session,p_user,(p_result->>'questionId')::uuid,p_result->>'topic',p_result);
 insert into public.topic_progress(user_id,topic,completed) values(p_user,p_result->>'topic',1) on conflict(user_id,topic) do update set completed=public.topic_progress.completed+1,updated_at=now();
 return true;
end; $$;
revoke all on function public.reserve_ai(uuid,text,text,integer,text) from public, anon, authenticated;
revoke all on function public.finish_ai(uuid,text,text,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.save_result(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.reserve_ai(uuid,text,text,integer,text) to service_role;
grant execute on function public.finish_ai(uuid,text,text,uuid,jsonb) to service_role;
grant execute on function public.save_result(uuid,jsonb) to service_role;
revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles,public.questions,public.user_questions,public.question_analysis,public.daily_ai_usage,public.study_sessions,public.attempts,public.question_results,public.topic_progress,public.uploaded_solutions to authenticated;
grant all on all tables in schema public to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('study-uploads','study-uploads',false,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
-- Direct uploads are disabled. The server checks limits and ownership first.
create policy own_upload_read on storage.objects for select to authenticated using(bucket_id='study-uploads' and (storage.foldername(name))[1]=(select auth.uid())::text);
