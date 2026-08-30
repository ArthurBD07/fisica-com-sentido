import {test} from 'node:test';
import assert from 'node:assert/strict';
import {questions} from '../src/data/questions';
import {questionSchema,isCorrect,type Result} from '../src/lib/schema';
import {summarize} from '../src/lib/progress';
import {contentHash,dailyLimit,imageBytes,requestSchema} from '../src/services/ai/validation';
const input={kind:'question' as const,text:'  Uma   questão ',consent:true as const,keepImage:false};
test('10 questões avançadas, 5 temas, fórmula não é primeira opção',()=>{assert.equal(questions.length,10);assert.equal(new Set(questions.map(q=>q.topic)).size,5);for(const topic of new Set(questions.map(q=>q.topic)))assert.equal(questions.filter(q=>q.topic===topic).length,2);for(const q of questions){assert.ok(questionSchema.safeParse(q).success,q.title);assert.notEqual(q.difficulty,'Fácil');assert.equal(q.steps.length,10);assert.notEqual(q.steps[6].correct[0],0);assert.notEqual(q.steps[8].prompt,'Efetue a operação. Qual resultado intermediário faz sentido?');for(const step of q.steps){assert.ok(isCorrect(step,step.correct));assert.equal(isCorrect(step,[]),false);}}});
test('dados: exige exatamente todas as opções corretas',()=>{const step=questions[0].steps[1];assert.equal(isCorrect(step,step.correct.slice(0,-1)),false);assert.equal(isCorrect(step,[...step.correct,6]),false);assert.equal(isCorrect(step,[...step.correct].reverse()),true);});
test('limite configurável falha fechado',()=>{assert.equal(dailyLimit(undefined),10);assert.equal(dailyLimit('3'),3);for(const bad of ['0','-1','abc','Infinity','101','2.5'])assert.throws(()=>dailyLimit(bad));});
test('cache normaliza espaços, separa usuário no banco e resolução no hash',()=>{assert.equal(contentHash(input),contentHash({...input,text:'Uma questão'}));assert.notEqual(contentHash(input),contentHash({...input,text:'Outra questão'}));assert.notEqual(contentHash(input),contentHash({...input,kind:'solution',questionId:questions[0].id}));});
test('uploads: MIME falso, tamanho e consentimento são rejeitados',()=>{assert.throws(()=>imageBytes({mime:'image/jpeg',data:Buffer.from('not-a-valid-jpeg-image').toString('base64')}));assert.throws(()=>imageBytes({mime:'image/jpeg',data:Buffer.alloc(3*1024*1024).toString('base64')}));assert.equal(requestSchema.safeParse({...input,consent:false}).success,false);assert.equal(requestSchema.safeParse({...input,text:'x'.repeat(6001)}).success,false);assert.equal(requestSchema.safeParse({...input,kind:'solution'}).success,false);});
test('estatísticas e recomendações não dependem de IA; primeira tentativa conta',()=>{const q=questions[0];const result:Result={id:crypto.randomUUID(),questionId:q.id,title:q.title,topic:q.topic,completedAt:new Date().toISOString(),attempts:q.steps.map((s,i)=>({step:i,category:s.category,correct:true,hints:0,revealed:false}))};result.attempts.splice(9,0,{step:9,category:'cálculo',correct:false,hints:1,revealed:false});const s=summarize([result]);assert.equal(s.completed,1);assert.equal(s.accuracy,0);assert.equal(s.noHints,0);assert.equal(s.averageHints,1);assert.equal(s.recommendedTopic,'Cinemática');assert.equal(s.focus,'cálculo');assert.equal(summarize([]).recommendedTopic,'Cinemática');});

test('runtime public configuration excludes private secrets and rejects service_role',async()=>{
 const {publicSupabaseConfig}=await import('../src/lib/public-config');
 const jwt=(role:string)=>'header.'+Buffer.from(JSON.stringify({role})).toString('base64url')+'.signature';
 const env={NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:jwt('anon'),SUPABASE_SERVICE_ROLE_KEY:'private-test-secret'};
 assert.deepEqual(publicSupabaseConfig(env),{url:env.NEXT_PUBLIC_SUPABASE_URL,anonKey:env.NEXT_PUBLIC_SUPABASE_ANON_KEY});
 assert.equal(publicSupabaseConfig({...env,NEXT_PUBLIC_SUPABASE_ANON_KEY:jwt('service_role')}),null);
 assert.equal(publicSupabaseConfig({}),null);
 assert.equal(JSON.stringify(publicSupabaseConfig(env)).includes('private-test-secret'),false);
});
