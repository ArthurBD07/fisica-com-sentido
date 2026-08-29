import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GeminiProvider} from '../src/services/ai/provider';
import {questions} from '../src/data/questions';
const input={kind:'question' as const,text:'Uma questão completa de física',consent:true as const,keepImage:false};
test('provider: disabled means zero fetch; 429 and malformed output fail without retry',async()=>{const originalFetch=globalThis.fetch;const originalEnv={...process.env};let calls=0;const provider=new GeminiProvider();try{
 process.env.GEMINI_API_KEY='unit-test-not-a-real-key';process.env.AI_ENABLED='false';process.env.GEMINI_FREE_TIER_CONFIRMED='true';
 globalThis.fetch=async()=>{calls++;return Response.json({},{status:429});};
 await assert.rejects(()=>provider.analyze(input),/ainda não estão ativadas/);assert.equal(calls,0);
 process.env.AI_ENABLED='true';await assert.rejects(()=>provider.analyze(input),/cota gratuita/);assert.equal(calls,1);
 globalThis.fetch=async()=>{calls++;return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'invalid json'}]}}]});};
 await assert.rejects(()=>provider.analyze(input),/incompleta/);assert.equal(calls,2);
 globalThis.fetch=async()=>{calls++;return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(questions[0])}]}}]});};
 const result=await provider.analyze(input);assert.ok('steps' in result);assert.equal(calls,3);
}finally{globalThis.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in originalEnv))delete process.env[key];Object.assign(process.env,originalEnv);}});
test('API without configuration fails gracefully instead of exposing an exception',async()=>{const {GET}=await import('../app/api/progress/route');const old=process.env.NEXT_PUBLIC_SUPABASE_URL;delete process.env.NEXT_PUBLIC_SUPABASE_URL;try{const response=await GET(new Request('http://localhost/api/progress'));assert.equal(response.status,503);const body=await response.json();assert.match(body.error,/treinos autorais/);assert.equal(response.headers.get('Cache-Control'),'no-store');}finally{if(old)process.env.NEXT_PUBLIC_SUPABASE_URL=old;}});
