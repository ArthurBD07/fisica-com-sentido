import { z } from 'zod';
export const topics = ['Cinemática', 'Dinâmica', 'Trabalho e Energia', 'Eletricidade', 'Termologia'] as const;
export const categories = ['interpretação do comando', 'identificação de dados', 'interpretação do fenômeno', 'conversão de unidade', 'escolha de fórmula', 'cálculo', 'distração'] as const;
const text = z.string().min(1).max(1600);
export const stepSchema = z.object({
  title: text, prompt: text, category: z.enum(categories),
  kind: z.enum(['single', 'multiple', 'visual']),
  options: z.array(text).min(2).max(7), correct: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  hints: z.tuple([text, text, text]), explanation: text,
}).superRefine((s,ctx) => {
  if(s.correct.some(i=>i>=s.options.length) || new Set(s.correct).size!==s.correct.length || (s.kind!=='multiple' && s.correct.length!==1)) ctx.addIssue({code:'custom',message:'Índices de resposta inválidos'});
});
export const questionSchema = z.object({
  id: z.string().uuid(), title: text, topic: z.enum(topics), difficulty: z.enum(['Fácil','Média','Difícil']),
  statement: z.string().min(30).max(6000), steps: z.array(stepSchema).min(9).max(12),
  diagram: z.array(z.string().min(1).max(100)).min(2).max(5),
  source: z.enum(['autoral','ia']),
});
export type Question = z.infer<typeof questionSchema>;
export type Step = z.infer<typeof stepSchema>;
export type Category = typeof categories[number];
export const attemptSchema = z.object({step: z.number().int().min(0).max(11), category:z.enum(categories), correct:z.boolean(), hints:z.number().int().min(0).max(3), revealed:z.boolean()});
export const resultSchema = z.object({id:z.string().uuid(),questionId:z.string().uuid(),title:text,topic:z.enum(topics),completedAt:z.string().datetime(),attempts:z.array(attemptSchema).min(1).max(300)});
export type Result = z.infer<typeof resultSchema>;
export const solutionSchema = z.object({readable:z.boolean(),category:z.enum([...categories,'dado copiado incorretamente','raciocínio correto com erro final','sem erro identificado']),feedback:text,nextStep:text,uncertainty:text});
export type SolutionFeedback = z.infer<typeof solutionSchema>;
export function isCorrect(step:Step, selection:number[]) { return selection.length===step.correct.length && step.correct.every(i=>selection.includes(i)); }
