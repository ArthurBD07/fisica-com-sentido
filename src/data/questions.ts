import { type Question, type Step } from '../lib/schema';
import raw from './questions.json';

type Blueprint = {title:string;topic:Question['topic'];statement:string;goal:string[];data:string[];relevant:number[];dataExplain:string;translation:string[];units:string[];unitExplain:string;phenomenon:string[];concept:string;diagram:string[];formulas:string[];substitution:string[];calculation:string[];answers:string[];explain:string};
function single(title:string,prompt:string,category:Step['category'],options:string[], explanation:string,hints:[string,string,string],answer=0):Step {
  // Rotate options: the correct formula is never automatically the first item.
  const shift=title==='Qual fórmula faz sentido?'?2:1;
  const rotated=options.map((_,i)=>options[(i+shift)%options.length]);
  return {title,prompt,category,kind:'single',options:rotated,correct:[(answer-shift+options.length)%options.length],explanation,hints};
}
export const questions:Question[]=(raw as Blueprint[]).map((q,i)=>({
 id:`a1000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,title:q.title,topic:q.topic,difficulty:i%3===2?'Difícil':'Média',source:'autoral',statement:q.statement,diagram:q.diagram,
 steps:[
 single('O que a questão quer?','Antes de procurar números, identifique o objetivo.','interpretação do comando',q.goal,`O objetivo é ${q.goal[0].toLowerCase()}.`,['Releia a última frase do enunciado.','Separe o que já foi informado daquilo que precisa ser descoberto.',`Procure a alternativa que pede ${q.goal[0].toLowerCase()}.`]),
 {title:'Quais dados importam?',prompt:'Selecione todos os dados necessários para resolver. Pode haver mais de um.',category:'identificação de dados',kind:'multiple',options:q.data,correct:q.relevant,explanation:q.dataExplain,hints:['Compare cada informação com o objetivo da questão.','O contexto pode trazer números que não entram na conta.',`Você precisa de ${q.relevant.map(n=>q.data[n]).join(' e ')}.`]},
 single('Traduzindo o enunciado','Qual tradução representa melhor a situação?','interpretação do fenômeno',q.translation,q.translation[0],['Repare nas palavras que descrevem o comportamento físico.','Uma expressão cotidiana pode representar uma condição física.',q.translation[0]]),
 single('Preciso converter unidades?','Escolha como preparar as unidades antes da conta.','conversão de unidade',q.units,q.unitExplain,['Veja em qual unidade a resposta foi pedida.','Confira se tempo, distância e demais grandezas usam unidades compatíveis.',q.unitExplain]),
 single('Qual fenômeno e conceito?','O que explica fisicamente esta situação?','interpretação do fenômeno',q.phenomenon,q.concept,['Descreva mentalmente o que muda e o que permanece constante.','Relacione esse comportamento com uma lei física.',q.concept]),
 {title:'Vamos visualizar',prompt:'Observe o esquema. Ele representa as informações do enunciado, sem escala.',category:'interpretação do fenômeno',kind:'visual',options:['Observei o esquema','Vou reler o enunciado'],correct:[0],hints:['Leia o esquema da esquerda para a direita.','Associe cada rótulo a uma informação da questão.',q.diagram.join(' → ')],explanation:'O esquema ajuda a organizar a situação antes de escolher uma equação.'},
 single('Qual fórmula faz sentido?','Escolha a relação que conecta os dados ao que foi pedido.','escolha de fórmula',q.formulas,`A relação adequada é ${q.formulas[0]}. ${q.concept}`,['Procure a grandeza desconhecida nas fórmulas.','A fórmula deve conter os dados que você tem.',`Use ${q.formulas[0]}.`]),
 single('Cálculo: substituindo os dados','Como ficam os valores na relação escolhida?','cálculo',q.substitution,`A substituição correta é ${q.substitution[0]}.`,['Use apenas os dados selecionados, nas unidades corretas.','Substitua cada símbolo por seu valor, sem trocar a ordem.',q.substitution[0]]),
 single('Calcule e interprete o resultado','Qual cálculo completa a substituição anterior e o que esse valor representa nesta questão?','cálculo',q.calculation,`Neste passo: ${q.calculation[0]}.`,['Retome a expressão montada no passo anterior.','Calcule respeitando a ordem das operações e identifique a grandeza obtida.',q.calculation[0]]),
 single('Agora, qual é a resposta?','Escolha a alternativa e confira se ela responde ao que foi pedido.','cálculo',q.answers,q.explain,['Volte ao objetivo que identificamos no primeiro passo.','Confira o valor, a unidade e se o resultado é plausível.',q.explain]),
 ]
}));
