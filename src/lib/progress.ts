import { topics, type Result, type Category } from './schema';
export function summarize(results:Result[]) {
 const total=results.length;
 const completed=new Set(results.map(r=>r.questionId)).size;
 const firstFinal=results.map(r=>r.attempts.find(a=>a.step===Math.max(...r.attempts.map(x=>x.step))));
 const correct=firstFinal.filter(a=>a?.correct && !a.revealed).length;
 const hints=results.reduce((sum,r)=>sum+[...new Set(r.attempts.map(a=>a.step))].reduce((n,step)=>n+Math.max(0,...r.attempts.filter(a=>a.step===step).map(a=>a.hints)),0),0);
 const noHints=results.filter(r=>r.attempts.every(a=>a.hints===0&&!a.revealed)).length;
 const errors:Partial<Record<Category,number>>={};
 results.forEach(r=>r.attempts.filter(a=>!a.correct || a.revealed).forEach(a=>{errors[a.category]=(errors[a.category]||0)+1;}));
 const difficulty=Object.entries(errors).sort((a,b)=>b[1]-a[1]);
 const byTopic=topics.map(topic=>{const rs=results.filter(r=>r.topic===topic);const steps=rs.flatMap(r=>r.attempts);const mistakes=steps.filter(a=>!a.correct||a.revealed).length;return {topic,count:rs.length,mistakes,rate:steps.length?mistakes/steps.length:0};});
 const weakest=[...byTopic].filter(t=>t.count>0).sort((a,b)=>b.rate-a.rate)[0];
 return {total,completed,correct,accuracy:total?Math.round(correct/total*100):0,noHints,averageHints:total?hints/total:0,difficulty,byTopic,recommendedTopic:weakest?.topic||'Cinemática',focus:difficulty[0]?.[0]||'interpretação do comando'};
}
