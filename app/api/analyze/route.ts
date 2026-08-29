import {identity,adminDB,AppError,failure,boundedJSON} from '@/src/lib/server';
import {requestSchema,imageBytes,contentHash} from '@/src/services/ai/validation';
import {reserve,finish} from '@/src/services/ai/costGuard';
import {aiProvider} from '@/src/services/ai/provider';
import {questions} from '@/src/data/questions';
import {questionSchema,solutionSchema,type Question} from '@/src/lib/schema';
import {storeUpload} from '@/src/lib/uploads';
export const runtime='nodejs';
export const maxDuration=60;
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const {db}=await identity(request);const {data,error}=await db.from('user_questions').select('content').order('created_at',{ascending:false}).limit(100);if(error)throw new AppError('Não foi possível carregar suas questões.');return Response.json({questions:data.map(q=>q.content)},{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
export async function POST(request:Request){let reservation:{user:string;hash:string;kind:string;lease:string}|undefined;let settled=false;
 try{const {user,db}=await identity(request);const parsed=requestSchema.safeParse(await boundedJSON(request));if(!parsed.success)throw new AppError('Confira o enunciado, o arquivo e o consentimento antes de enviar.',400);const input=parsed.data;
 const normalized=input.text.normalize('NFC').replace(/\s+/g,' ').trim();
 if(input.kind==='question'&&!input.image){const known=questions.find(q=>q.statement.normalize('NFC').replace(/\s+/g,' ').trim()===normalized);if(known)return Response.json({result:known,cached:true},{headers:{'Cache-Control':'no-store'}});}
 let bytes:Buffer|undefined;try{if(input.image)bytes=imageBytes(input.image,Number(process.env.MAX_IMAGE_SIZE_MB||2));}catch(e){throw new AppError(e instanceof Error?e.message:'Imagem inválida.',400);}
 let context:Question|undefined;if(input.kind==='solution'){context=questions.find(q=>q.id===input.questionId);if(!context){const {data}=await db.from('user_questions').select('content').eq('id',input.questionId).single();if(data)context=questionSchema.parse(data.content);}if(!context)throw new AppError('A questão da resolução não foi encontrada na sua conta.',404);}
 const hash=contentHash(input,bytes);
 // Cache remains usable with AI disabled; ownership enforced by RLS.
 const {data:cached,error:cacheError}=await db.from('question_analysis').select('result').eq('content_hash',hash).eq('kind',input.kind).eq('status','complete').maybeSingle();if(cacheError)throw new AppError('Não foi possível verificar o cache. Por segurança, não chamamos a IA.');
 if(cached){const result=(input.kind==='question'?questionSchema:solutionSchema).parse(cached.result);return Response.json({result,cached:true,storageMessage:input.keepImage?'Análise reutilizada. Para evitar duplicação, a imagem não foi guardada novamente.':undefined});}
 if(process.env.AI_ENABLED!=='true'||process.env.GEMINI_FREE_TIER_CONFIRMED!=='true'||!process.env.GEMINI_API_KEY)throw new AppError('As análises por IA ainda não estão ativadas. Continue com as questões autorais.');
 const admin=adminDB();const ticket=await reserve(admin,user.id,hash,input.kind,input.text);if(ticket.status==='cached')return Response.json({result:(input.kind==='question'?questionSchema:solutionSchema).parse(ticket.result),cached:true});if(!ticket.lease)throw new AppError('Não foi possível reservar a análise.');reservation={user:user.id,hash,kind:input.kind,lease:ticket.lease};
 const result=await aiProvider.analyze(input,context);await finish(admin,user.id,hash,input.kind,ticket.lease,result);settled=true;
 let storageMessage:string|undefined;if(bytes&&input.keepImage){try{storageMessage=await storeUpload(admin,user.id,bytes,input.image!.mime,input.kind,input.kind==='question'?(result as Question).id:input.questionId);}catch{storageMessage='Análise salva. A imagem não pôde ser guardada.';}}
 return Response.json({result,cached:false,storageMessage},{headers:{'Cache-Control':'no-store'}});
 }catch(e){if(reservation&&!settled){try{await finish(adminDB(),reservation.user,reservation.hash,reservation.kind,reservation.lease,null);}catch{/* The lease expires after 90 seconds; never reset a newer reservation. */}}return failure(e);}
}
