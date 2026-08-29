# Física com Sentido

Treinador de interpretação para Física do ENEM. Primeiro entender, depois calcular.

## O QUE JÁ FUNCIONA

- 10 questões autorais, em 5 temas; 5 de Cinemática para o treino inicial.
- Dez passos por questão, seleção de dados, tradução, unidades, representação, fórmula e cálculo.
- Três dicas progressivas e resolução somente do passo atual.
- Treino sem IA, correção local, diagnóstico e recomendação por regras.
- Modo visitante: resultados apenas enquanto a página está aberta. **Não é armazenamento permanente.**
- Integração de conta, progresso e histórico pelo Supabase, quando configurado.
- Foto da questão e foto opcional da resolução, quando a IA for habilitada e permitida.

**Não está validado em contas reais:** cadastro/login por email, projeto Supabase remoto, Gemini real e deploy Vercel. Nenhuma credencial foi fornecida. Não chame o sistema de pronto para produção antes de testar a lista no fim deste arquivo.

## COMO RODAR LOCALMENTE

1. Instale o [Node.js LTS](https://nodejs.org/) (22.13 ou superior).
2. Extraia o projeto e abra a pasta no VS Code.
3. No menu **Terminal → Novo terminal**, execute:

```bash
npm ci
npm run dev:next
```

4. Abra `http://localhost:3000` no navegador.
5. Você já pode fazer os treinos sem configurar nada.
6. Para conectar as contas, copie `.env.example` para um novo arquivo chamado `.env.local`. Não publique esse arquivo.
7. Depois de alterar variáveis, pare o terminal com Ctrl+C e execute `npm run dev:next` novamente.

O pacote de entrega para Vercel também oferece `npm run dev`, `npm run build` e `npm start` com Next.js padrão. No checkout de desenvolvimento dentro do ChatGPT existem scripts de hospedagem auxiliares; `build:vercel` é sempre o build Next.js da aplicação. A entrega Vercel não precisa de Vinext, Cloudflare, Workers, D1 ou R2.

## COMO CRIAR O SUPABASE

**PRECISO QUE VOCÊ FAÇA ISSO**

1. Entre em [supabase.com/dashboard](https://supabase.com/dashboard).
2. Crie uma conta e uma organização no plano **Free**. Não escolha Pro nem informe cartão.
3. Clique em **New project**, dê o nome `fisica-com-sentido` e crie uma senha forte para o banco. Guarde-a em local seguro, fora do código.
4. Espere o projeto ficar disponível.
5. Nas configurações do projeto, procure **API / API Keys** (os nomes podem mudar).
6. Copie a **Project URL** para `NEXT_PUBLIC_SUPABASE_URL` em `.env.local`.
7. Copie a chave pública **anon** para `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
8. Copie a chave **service_role** para `SUPABASE_SERVICE_ROLE_KEY`, apenas em `.env.local` e nas variáveis privadas da Vercel.
9. Não envie nenhuma chave privada no chat ou em prints.

**Por que a service_role é necessária?** Ela executa operações restritas no servidor: reserva atômica da cota, conclusão do cache, progresso e uploads. Usuários não podem chamar essas funções diretamente para aumentar o próprio limite. A identidade é validada antes de qualquer operação; leituras usam o token do usuário e RLS. A service_role ignora RLS, então fica exclusivamente em arquivos protegidos por `server-only`.

## COMO EXECUTAR AS MIGRATIONS

Migration é um arquivo que cria as tabelas e regras automaticamente. Você não precisa montar tabelas uma a uma.

No terminal da pasta do projeto:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

- O primeiro comando abre o login do Supabase.
- Substitua `SEU_PROJECT_REF` pelo **Reference ID** das configurações do projeto.
- Quando solicitado, digite a senha do banco que você criou. Não coloque a senha no comando, no código ou em prints.
- Confirme a aplicação das duas migrations.
- Não precisa de Docker para conectar e aplicar migrations no projeto hospedado.
- A primeira migration cria as 10 tabelas, RLS, índices, funções e bucket privado.
- A segunda cadastra as 10 questões autorais.
- Não altere migrations já aplicadas: crie uma nova para futuras mudanças.

As questões locais continuam disponíveis mesmo se o Supabase estiver pausado. O banco contém uma cópia para uso e evolução futura; a aplicação usa o arquivo local como catálogo estável.

### Configurar a autenticação

1. No Supabase, abra **Authentication → Providers → Email** e mantenha email/senha.
2. Em **URL Configuration**, configure `http://localhost:3000` enquanto desenvolve. Após publicar, use seu endereço `https://SEU-PROJETO.vercel.app` como Site URL e adicione as URLs permitidas.
3. Em `/conta`, crie uma conta e confirme o email quando solicitado.
4. O serviço padrão de emails do Supabase é limitado e pode restringir destinatários; se a confirmação não chegar, verifique as restrições do painel. Para este MVP estritamente pessoal, uma alternativa gratuita é criar as contas manualmente em **Authentication → Users → Add user**, marcar confirmação e **desabilitar novos cadastros**. Não desligue confirmação para liberar inscrições públicas indiscriminadamente.
5. Depois de criar as contas pessoais, recomendamos desabilitar novos cadastros. Isso reduz abuso das cotas gratuitas.
6. O MVP não implementa recuperação de senha por email. O proprietário pode redefinir uma senha no painel do Supabase. Não guarde senhas em tabelas próprias.

## COMO CONFIGURAR O GEMINI

**A IA vem DESLIGADA. Não é necessária para treinar.**

Antes de configurar, leia os [termos atuais](https://ai.google.dev/gemini-api/terms), a [tabela de preços](https://ai.google.dev/gemini-api/docs/pricing) e os [limites](https://ai.google.dev/gemini-api/docs/rate-limits).

Os termos consultados em 28/08/2026 exigem 18 anos e restringem aplicações acessadas por menores. Também estabelecem restrições sobre a finalidade do serviço (desenvolvimento profissional/comercial e uso como consumidor) e região. Portanto, **não estamos afirmando que este MVP pessoal é automaticamente elegível**. Se a estudante for menor ou o uso não for permitido, mantenha `AI_ENABLED=false`. Não publique a integração Gemini para um público geral de candidatos ao ENEM, que pode incluir menores. O consentimento na interface não substitui a elegibilidade e não resolve essas restrições.

Se o uso for permitido:

1. Entre em [Google AI Studio](https://aistudio.google.com/).
2. Crie uma chave em um projeto **sem conta de faturamento vinculada**.
3. Não clique em **Set up billing**, **Upgrade**, **Paid tier** ou ativação de teste pago.
4. Verifique se `gemini-3.6-flash` possui cota gratuita disponível na sua conta. Não há troca automática de modelo.
5. Cole a chave em `GEMINI_API_KEY` no `.env.local` e no painel privado da Vercel.
6. Somente após verificar os termos e a ausência de billing, defina `GEMINI_FREE_TIER_CONFIRMED=true` e `AI_ENABLED=true`.
7. Se a API exigir billing ou deixar de oferecer cota gratuita, não ative. Use os treinos locais.

No plano gratuito, textos e imagens podem ser usados pelo Google para melhorar seus produtos. Remova nomes, rostos e dados pessoais. O aplicativo informa isso antes do envio. A exclusão do nosso Storage não controla a retenção pelo Google.

A IA pode errar física, transcrição e matemática. Validamos o formato e a estrutura pedagógica, não prometemos validação matemática automática. Não use o feedback como diagnóstico infalível.

## COMO PUBLICAR NA VERCEL

**PRECISO QUE VOCÊ FAÇA ISSO**

1. Entre no [GitHub](https://github.com/) e crie um repositório privado gratuito.
2. Envie os arquivos do pacote Vercel. Nunca envie `.env.local`, `node_modules` ou `.next`.
3. Entre em [vercel.com](https://vercel.com/) com sua conta GitHub.
4. Escolha sua conta pessoal no plano **Hobby**. Não inicie avaliação Pro.
5. Clique em **Add New → Project** e importe o repositório.
6. Mantenha o framework **Next.js**. O `vercel.json` já configura o build.
7. Em **Environment Variables**, cadastre as variáveis do `.env.example`.
8. Deixe a IA desligada inicialmente. Você pode publicar sem Supabase e configurar depois.
9. Clique em **Deploy** e use o domínio gratuito `*.vercel.app`.
10. Atualize o Site URL e as URLs permitidas no Supabase.
11. Abra o site no celular e execute a lista de verificação abaixo.

Não tenho acesso à sua conta Vercel nem às chaves externas. Preparar o projeto não equivale a publicá-lo ou validar as contas reais.

## COMO ADICIONAR VARIÁVEIS DE AMBIENTE

Local: arquivo `.env.local`, na mesma pasta de `package.json`.
Vercel: **Project → Settings → Environment Variables**. Após editar, faça um **Redeploy**.

| Variável | Exposta ao navegador? | Finalidade |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Sim | Endereço do projeto |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Sim | Chave pública, protegida por RLS |
| SUPABASE_SERVICE_ROLE_KEY | Não | Funções protegidas no servidor |
| GEMINI_API_KEY | Não | Acesso à IA |
| GEMINI_MODEL | Não | Modelo explicitamente autorizado |
| AI_ENABLED | Não | Interruptor geral, `false` por padrão |
| GEMINI_FREE_TIER_CONFIRMED | Não | Confirmação manual de projeto gratuito; não verifica billing automaticamente |
| DAILY_AI_LIMIT | Não | Padrão 10; inteiro de 1 a 100 |
| MAX_IMAGE_SIZE_MB | Não | Teto de 2 MB após compressão |

Nunca coloque `NEXT_PUBLIC_` antes de chaves privadas. Não precisa de Redis, filas, banco adicional, serviço de monitoramento ou domínio pago.

## COMO NÃO GERAR CUSTOS

1. Mantenha **Vercel Hobby**, para uso pessoal e não comercial.
2. Mantenha a organização do **Supabase Free**.
3. Não vincule billing ao projeto do **Gemini**. Não confunda créditos de teste de conta paga com free tier.
4. Não adicione cartão, não ative upgrade automático e não migre para planos pagos ao atingir uma cota.
5. Quando uma cota acabar, espere sua renovação ou reduza o uso. A aplicação não compra créditos e não faz fallback pago.
6. Se a IA falhar, continue nas questões autorais. Se o Supabase falhar, o treino fica disponível, mas login, histórico remoto e gravação podem ficar indisponíveis.
7. Se o limite da própria Vercel for atingido, o site inteiro pode ficar temporariamente indisponível. Não é possível garantir disponibilidade contínua em um plano gratuito.
8. O Supabase pode pausar projetos gratuitos por baixa atividade; reative manualmente no painel. Não criamos tráfego artificial para evitar pausa.

**O código não consegue consultar ou impedir uma mudança de plano feita no painel das suas contas.** A garantia contra cobrança depende de mantê-las gratuitas e sem billing. Limites internos ajudam a economizar cota, mas não são um bloqueio de faturamento do provedor.

Fontes oficiais: [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Supabase Free](https://supabase.com/pricing), [pausa do Supabase](https://supabase.com/docs/guides/platform/free-project-pausing), [Gemini billing](https://ai.google.dev/gemini-api/docs/billing).

## COMO FUNCIONA A PROTEÇÃO DE IA

`src/services/ai/costGuard.ts` + funções SQL `reserve_ai` e `finish_ai`:

- Identidade validada no servidor com `getUser`, nunca com um ID enviado pelo cliente.
- Cota por usuário e dia UTC. Renova à meia-noite UTC (21h em Brasília).
- Transação com advisory lock por usuário: somente uma análise simultânea, mesmo em instâncias diferentes.
- Contagem incrementada **antes** da chamada; falhas também consomem uma tentativa. Sem reembolso que pudesse permitir abuso.
- Cache privado por usuário, hash SHA-256, tipo e versão de formato; o mesmo conteúdo retorna sem consumir nova análise.
- Texto normalizado; fotos deduplicam quando os bytes enviados são iguais. Outra foto da mesma questão pode ter hash diferente. A revisão na lista reutiliza a análise sem IA.
- Reserva com token único e validade de 90 s. Resposta atrasada não libera uma reserva mais nova.
- Nenhuma repetição automática da chamada à IA (zero retries).
- Timeout externo de 35 s; corpo de envio limitado; prompt do usuário até 6.000 caracteres; saída limitada.
- Se Supabase/cache/limite falhar, IA bloqueada. Não há modo que ignora a proteção.
- API key enviada em cabeçalho privado; não aparece na URL, no bundle, no Git ou nos logs da aplicação.

## IMAGENS E LIMPEZA

- Entrada: JPG, PNG, WEBP, até 5 MB, redimensionada para até 1.600 pixels e até 2 MB. O backend valida assinatura MIME e tamanho real.
- Por padrão, o arquivo não é salvo no Supabase Storage; é transmitido diretamente ao provedor durante a análise.
- Guardar é opcional, em bucket privado. Até 20 arquivos por conta; cada um pode ser excluído em `/conta`.
- Metadados vencem após 30 dias. A remoção física é oportunista: na próxima visita à lista ou no próximo upload. **Não existe tarefa agendada e não prometemos exclusão exata no 30º dia se a conta ficar inativa.**
- Para apagar tudo imediatamente, use a lista de imagens ou o painel do Supabase. Análises estruturadas ficam para revisão até a exclusão da conta pelo proprietário.
- Excluir a imagem não apaga o progresso nem desfaz dados já enviados ao Google.

## ESTRUTURA

```text
app/                     Páginas e rotas API Next.js
components/trainer/      Interface, treino, conta e uploads
components/ui/           Primitivos acessíveis usados pela interface
src/data/                Questões autorais e geração das etapas
src/lib/                 Schemas, progresso, Supabase e validação
src/services/ai/          Provider e costGuard
supabase/migrations/     Banco, RLS, proteção e questões iniciais
tests/                   Testes de questões, banco e IA simulada
```

A aplicação usa sessões Supabase no navegador e envia o token Bearer às rotas do mesmo site. Não precisa de middleware de autenticação ou cache SSR. Operações privadas verificam a sessão no servidor. O catálogo é público para permitir treino visitante.

## TESTES E CRITÉRIO DE PRONTO

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run build:vercel
```

Testes automatizados usam PGlite (PostgreSQL local em WebAssembly, **somente teste**, não outro banco em produção) para executar as migrations, RLS, limites, cache, reserva vencida e progresso idempotente. O provedor é simulado para testar falhas sem gastar cota. Isso não substitui um teste com Supabase hospedado.

### Verificação manual obrigatória após configurar

- [ ] Criar conta, confirmar email, entrar, sair e entrar novamente.
- [ ] Concluir uma questão e encontrar o resultado após atualizar e em outro dispositivo.
- [ ] Entrar em outra conta e verificar que não vê o histórico ou uploads da primeira.
- [ ] Desligar `AI_ENABLED`: treino, dicas, correção e desempenho continuam funcionando.
- [ ] Se elegível para Gemini, enviar uma questão legível e conferir transcrição, física e alternativas.
- [ ] Reenviar exatamente o mesmo texto: receber cache e não aumentar o uso.
- [ ] Definir `DAILY_AI_LIMIT=1` e reenviar conteúdo diferente após uma análise: receber bloqueio. O primeiro envio pode ser bloqueado se a conta já usou IA hoje.
- [ ] Enviar duas análises simultâneas: uma fica bloqueada enquanto a outra está pendente.
- [ ] Enviar resolução manuscrita; conferir feedback sem exigir foto para continuar.
- [ ] Guardar e excluir uma imagem; confirmar remoção no bucket privado.
- [ ] Testar em celular: câmera, seleção, dicas, botão de continuar e teclado.
- [ ] Confirmar os três planos gratuitos e ausência de billing no Gemini.

**Limites do MVP:** sem recuperação automática de progresso visitante, sem sincronização offline, sem garantia de disponibilidade dos planos gratuitos, sem validação matemática infalível da IA. Estatísticas consideram até os 1.000 treinos mais recentes carregados na conta; questões pessoais listam as 100 mais recentes.
