# Convite de chá de bebê com confirmação de presença

Sistema de convite digital para **um** evento. Cada pessoa convidada recebe um
link próprio, abre o convite no celular, confirma presença, diz quem vai levar
e salva a data na agenda. Quem organiza acompanha tudo por um painel protegido
por senha.

Roda inteiro no plano gratuito da Vercel e do Supabase. Sem custo de
infraestrutura.

---

## Índice

1. [O que o sistema faz](#1-o-que-o-sistema-faz)
2. [Como ele funciona por dentro](#2-como-ele-funciona-por-dentro)
3. [Antes de começar](#3-antes-de-começar)
4. [Passo a passo: criar o projeto no Supabase](#4-passo-a-passo-criar-o-projeto-no-supabase)
5. [Passo a passo: aplicar as migrations](#5-passo-a-passo-aplicar-as-migrations)
6. [Passo a passo: conferir o bucket da imagem](#6-passo-a-passo-conferir-o-bucket-da-imagem)
7. [Passo a passo: pegar as chaves](#7-passo-a-passo-pegar-as-chaves)
8. [Passo a passo: rodar na sua máquina](#8-passo-a-passo-rodar-na-sua-máquina)
9. [Passo a passo: usar o sistema](#9-passo-a-passo-usar-o-sistema)
10. [Passo a passo: publicar na Vercel](#10-passo-a-passo-publicar-na-vercel)
11. [Atenção: o Supabase gratuito hiberna](#11-atenção-o-supabase-gratuito-hiberna)
12. [Estrutura do projeto](#12-estrutura-do-projeto)
13. [Comandos](#13-comandos)
14. [Decisões de segurança](#14-decisões-de-segurança)
15. [Teste em celular real](#15-teste-em-celular-real)
16. [Problemas comuns](#16-problemas-comuns)

---

## 1. O que o sistema faz

### Para quem é convidado

Abre o link que chegou no WhatsApp e vê o convite em destaque, com a imagem que
você enviou, a data, o horário e o local. Logo abaixo, um formulário curto:

- o nome já vem preenchido, mas dá para corrigir;
- um botão adiciona acompanhantes, um campo por pessoa, até o limite que você
  definir;
- um botão confirma a presença, e um link discreto avisa que não vai dar.

Depois de confirmar, aparece uma pequena celebração e a pergunta "quer salvar no
seu calendário?", com um botão para Apple, Outlook e afins (arquivo `.ics`) e
outro para o Google Agenda. Os dois sempre aparecem; o mais provável para o
aparelho da pessoa é que ganha destaque.

Quem voltar ao link depois vê o que já respondeu, e pode mexer na lista de
acompanhantes.

### Para quem organiza

Painel em `/admin`, protegido por senha, com três telas:

- **Convite** — envia a imagem, preenche os dados da festa e escreve a mensagem
  que acompanha o link.
- **Convidados** — cadastra pessoas uma a uma ou colando uma lista inteira, e
  oferece, para cada uma, os botões de copiar link, copiar mensagem e mandar
  no WhatsApp.
- **Acompanhamento** — números no topo e a lista completa com o status de cada
  pessoa, com filtros, busca e exportação em CSV.

---

## 2. Como ele funciona por dentro

| Peça | Escolha | Por quê |
| --- | --- | --- |
| Aplicação | Next.js 16, App Router, TypeScript estrito | Server Actions evitam uma camada de API escrita à mão |
| Banco | Supabase (Postgres) | Plano gratuito generoso para o tamanho de uma festa |
| Imagem | Supabase Storage, bucket privado | Servida por uma rota própria, sem URL pública |
| Estilo | Tailwind CSS 4 com tokens próprios | Sem biblioteca de componentes, visual autoral |
| Testes | Vitest | 304 testes no núcleo de regras |

Três decisões merecem explicação, porque não são óbvias.

**O banco só é tocado pelo servidor.** O Supabase é acessado com a chave
`service_role`, que nunca sai do servidor. Todas as tabelas têm RLS ligada e
nenhuma política criada, o que significa que as chaves públicas não enxergam
absolutamente nada. Não existe cliente Supabase no navegador.

**A abertura do convite é registrada pelo navegador, nunca pelo servidor.** O
WhatsApp busca o link sozinho para montar a prévia da mensagem. Se a abertura
fosse marcada durante a renderização, todo convite apareceria como lido assim
que fosse enviado. Por isso o registro parte de um `fetch` disparado depois que
a página monta no aparelho de uma pessoa de verdade. Robô de prévia não executa
JavaScript, então ele passa batido. Como reforço, a rota também rejeita user
agents conhecidos de robô e chamadas vindas de outro site.

**As cores do convite saem da sua imagem, mas o contraste é garantido.** Ao
enviar a imagem, o navegador lê os pixels, descobre as cores dominantes e as
converte para OKLCH, um espaço de cor em que mexer na luminosidade não estraga
o tom. A luminosidade é então empurrada até o texto atingir o contraste exigido
pela WCAG, nível AA para textos secundários e AAA para o texto principal. Uma
foto clarinha demais nunca deixa o convite ilegível.

---

## 3. Antes de começar

Você precisa de:

- **Node.js 20.9 ou mais novo.** Confira com `node --version`. Se precisar
  instalar, pegue a versão LTS em [nodejs.org](https://nodejs.org).
- **Conta no Supabase** — [supabase.com](https://supabase.com), plano gratuito.
- **Conta na Vercel** — [vercel.com](https://vercel.com), plano Hobby.
- **Conta no GitHub**, para a Vercel buscar o código.

Todos os comandos deste guia funcionam igual no macOS, no Linux, no WSL 2 e no
PowerShell do Windows. Onde houver diferença, ela está indicada.

---

## 4. Passo a passo: criar o projeto no Supabase

1. Entre em [supabase.com/dashboard](https://supabase.com/dashboard) e clique
   em **New project**.
2. Escolha a organização, dê um nome ao projeto (por exemplo `cha-de-bebe`) e
   defina uma senha para o banco.
   **Guarde essa senha**, ainda que o sistema não vá usá-la.
3. Em **Region**, escolha a mais perto dos convidados. Para o Brasil,
   `South America (São Paulo)`.
4. Confirme que o plano é **Free** e clique em **Create new project**.
5. Espere de um a dois minutos até o projeto terminar de subir.

---

## 5. Passo a passo: aplicar as migrations

As três migrations ficam em `supabase/migrations/` e são aplicadas pelo editor
de SQL do painel. Rode **na ordem**. Os scripts podem ser executados mais de uma
vez sem estragar nada.

1. No painel do Supabase, clique em **SQL Editor** na barra lateral.
2. Clique em **New query**.
3. Abra o arquivo `supabase/migrations/0001_esquema.sql` deste repositório,
   copie o conteúdo inteiro e cole no editor.
4. Clique em **Run** (ou pressione `Ctrl+Enter`, `Cmd+Enter` no Mac).
   Deve aparecer `Success. No rows returned`.
5. Repita com `supabase/migrations/0002_funcoes.sql`.
6. Repita com `supabase/migrations/0003_storage.sql`.

### Como saber se deu certo

Ainda no SQL Editor, rode:

```sql
select table_name, row_security
  from information_schema.tables t
  join pg_class c on c.relname = t.table_name
 where table_schema = 'public'
 order by table_name;
```

Devem aparecer quatro tabelas, `companions`, `event`, `guests` e `rate_limits`,
todas com a segurança de linha ligada. E:

```sql
select count(*) from public.event;
```

Deve devolver `1`: a linha única do evento, criada pela migration.

---

## 6. Passo a passo: conferir o bucket da imagem

A migration `0003_storage.sql` já cria o bucket. Confira:

1. Clique em **Storage** na barra lateral.
2. Deve existir um bucket chamado **convite**.
3. Clique nele e confirme que ele **não** está marcado como público. O cadeado
   fechado é o certo.

Se o bucket não apareceu, crie à mão: **New bucket**, nome `convite`, deixe
**Public bucket** desligado, limite de 5 MB e tipos `image/jpeg`, `image/png`,
`image/webp`.

> O bucket é privado de propósito. A imagem chega ao convidado por uma rota do
> próprio site, que lê o arquivo no servidor. A prévia do WhatsApp continua
> funcionando, e nenhuma URL do Supabase é exposta.

---

## 7. Passo a passo: pegar as chaves

1. No painel do Supabase, clique na engrenagem de **Project Settings**.
2. Vá em **API Keys** (em projetos mais antigos o menu se chama **API**).
3. Você precisa de dois valores:
   - **Project URL** — algo como `https://abcdefghijklmnop.supabase.co`.
     Pode estar em **Data API** ou no topo da própria página de API.
   - **service_role** — clique em **Reveal** para ver. É uma sequência longa.

> A chave `service_role` dá acesso total ao banco, ignorando toda a segurança de
> linha. Ela só pode viver no servidor. Nunca cole esse valor em um arquivo que
> vá para o Git, em uma mensagem ou em qualquer lugar público. Se achar que ela
> vazou, volte nesta tela e gere outra.

---

## 8. Passo a passo: rodar na sua máquina

### 8.1 Baixar e instalar

```bash
git clone <url-do-seu-repositorio>
cd Sistema-de-convite-
npm install
```

### 8.2 Criar o arquivo de variáveis

No macOS, Linux ou WSL:

```bash
cp .env.example .env.local
```

No PowerShell do Windows:

```powershell
Copy-Item .env.example .env.local
```

### 8.3 Preencher o arquivo

Abra `.env.local` no editor e preencha:

```bash
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_SERVICE_ROLE_KEY=cole-aqui-a-chave-service-role
SUPABASE_STORAGE_BUCKET=convite
ADMIN_PASSWORD=a-senha-que-voce-vai-usar-no-painel
ADMIN_SESSION_SECRET=cole-aqui-um-segredo-longo
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Para gerar o `ADMIN_SESSION_SECRET`, no macOS, Linux ou WSL:

```bash
openssl rand -base64 48
```

No PowerShell do Windows:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

O arquivo `.env.local` já está no `.gitignore` e não vai para o Git.

### 8.4 Subir o servidor

```bash
npm run dev
```

Abra [http://localhost:3000/admin](http://localhost:3000/admin) e entre com a
senha que você colocou em `ADMIN_PASSWORD`.

---

## 9. Passo a passo: usar o sistema

1. **Entre no painel** em `/admin`.
2. **Aba Convite.** Envie a imagem do convite. Ela é reduzida e comprimida no
   próprio navegador antes de subir, e as cores dela viram o tema da página do
   convidado. Logo abaixo da imagem aparecem as cores encontradas.
3. Ainda na aba Convite, preencha título, data, horário, local e observações.
   Os horários são sempre no fuso de Brasília, não importa onde você esteja.
4. Escreva a mensagem que acompanha o link. Use os marcadores `{nome}`,
   `{evento}`, `{data}`, `{local}` e `{link}`: eles são trocados pelos dados de
   cada pessoa na hora do envio. A prévia logo abaixo mostra como a mensagem vai
   chegar. Clique em **Salvar convite**.
5. **Aba Convidados.** Adicione as pessoas. Com uma lista pronta, clique em
   "Tenho uma lista pronta para colar" e cole um nome por linha. Nomes repetidos
   entram uma vez só.
6. Para cada pessoa, use **WhatsApp** para abrir a conversa com a mensagem
   pronta, ou **Copiar mensagem** para colar onde quiser. Com telefone
   cadastrado, o WhatsApp já abre direto na conversa certa.
7. **Aba Acompanhamento.** Veja quem abriu, quem confirmou e quantas pessoas
   são no total. Os dados se atualizam sozinhos quando você volta para a aba do
   navegador. O botão **Exportar CSV** baixa a lista inteira.

---

## 10. Passo a passo: publicar na Vercel

### 10.1 Subir o código para o GitHub

```bash
git add .
git commit -m "Sistema de convite com confirmação de presença"
git push
```

### 10.2 Importar na Vercel

1. Entre em [vercel.com/new](https://vercel.com/new).
2. Escolha o repositório e clique em **Import**.
3. A Vercel reconhece o Next.js sozinho. Não mude nada em Build Command nem em
   Output Directory.
4. **Antes de clicar em Deploy**, abra a seção **Environment Variables**.

### 10.3 Cadastrar as variáveis

Adicione uma por uma, marcando os três ambientes (Production, Preview e
Development):

| Nome | Valor |
| --- | --- |
| `SUPABASE_URL` | a Project URL do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | a chave service_role |
| `SUPABASE_STORAGE_BUCKET` | `convite` |
| `ADMIN_PASSWORD` | a senha do painel |
| `ADMIN_SESSION_SECRET` | o segredo longo que você gerou |

Deixe `NEXT_PUBLIC_SITE_URL` de fora **neste primeiro deploy**: o sistema usa o
endereço do próprio deploy enquanto ela não existir.

### 10.4 Publicar e fixar o endereço

1. Clique em **Deploy** e espere terminar.
2. Anote o endereço que a Vercel deu, algo como
   `https://cha-de-bebe.vercel.app`.
3. Volte em **Settings > Environment Variables** e adicione:

   | Nome | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | `https://cha-de-bebe.vercel.app` |

   Sem barra no final.

4. Vá em **Deployments**, abra o mais recente e clique em **Redeploy**.

Esse último passo importa: os links enviados aos convidados e a imagem da prévia
do WhatsApp são montados a partir dessa variável. Fixá-la garante que os links
não mudem a cada novo deploy.

### 10.5 Se for usar domínio próprio

Configure o domínio em **Settings > Domains**, depois atualize
`NEXT_PUBLIC_SITE_URL` para o novo endereço e faça o redeploy. Faça isso
**antes** de enviar os convites: links já enviados continuam apontando para o
endereço antigo.

---

## 11. Atenção: o Supabase gratuito hiberna

Projetos no plano gratuito do Supabase são pausados após **7 dias sem nenhuma
requisição**. Um projeto pausado precisa ser religado à mão no painel, e isso
leva alguns minutos.

É um risco real aqui: você monta o convite, envia tudo em março, a festa é em
maio, e no meio do caminho o banco hiberna. Quem abrir o link nesse intervalo vê
erro.

Três formas de evitar, da mais simples à mais robusta:

1. **Abra o painel uma vez por semana.** Entrar em `/admin` já conta como
   atividade. É o suficiente, e é grátis.
2. **Crie um monitor gratuito** em um serviço como o UptimeRobot, apontando
   para a raiz do seu site a cada 12 horas. A raiz não expõe nada do evento.
3. **Suba para o plano pago do Supabase** no mês do evento, se a festa for
   grande o bastante para justificar.

Confira o status em **Project Settings > General** no painel do Supabase.

---

## 12. Estrutura do projeto

```
.
├── supabase/migrations/        SQL aplicado no painel do Supabase
│   ├── 0001_esquema.sql        tabelas, índices, triggers e RLS
│   ├── 0002_funcoes.sql        funções chamadas por RPC
│   └── 0003_storage.sql        bucket privado da imagem
│
├── src/
│   ├── app/
│   │   ├── page.tsx            raiz neutra, não revela o evento
│   │   ├── c/[token]/          tudo que o convidado vê
│   │   │   ├── page.tsx        o convite
│   │   │   ├── acoes.ts        confirmar e recusar
│   │   │   ├── abertura/       registro de abertura (POST do navegador)
│   │   │   ├── imagem/         imagem servida do bucket privado
│   │   │   └── convite.ics/    arquivo de calendário
│   │   └── admin/              painel protegido
│   │       ├── entrar/         login
│   │       ├── (protegido)/    telas que exigem sessão
│   │       ├── acoes.ts        ações administrativas
│   │       └── exportar/       download do CSV
│   │
│   ├── components/             componentes de convidado e de painel
│   │
│   ├── lib/                    regras puras, sem banco e sem rede
│   │   ├── ics.ts              geração do arquivo de calendário
│   │   ├── calendario.ts       link do Google Agenda
│   │   ├── paleta.ts           cores em OKLCH e contraste WCAG
│   │   ├── datas.ts            fuso de São Paulo e formatação
│   │   ├── painel.ts           contas, filtros e CSV
│   │   ├── token.ts            geração do token do convidado
│   │   ├── validacao.ts        schemas zod de toda entrada
│   │   ├── visao.ts            montagem de mensagens e links
│   │   └── whatsapp.ts         modelo de mensagem e wa.me
│   │
│   ├── server/                 acesso ao banco, só no servidor
│   │   ├── ambiente.ts         variáveis validadas
│   │   ├── supabase.ts         cliente com service role
│   │   ├── sessao.ts           cookie assinado do organizador
│   │   ├── limite.ts           rate limit no Postgres
│   │   ├── evento.ts           leitura e escrita do evento
│   │   └── convidados.ts       convidados e acompanhantes
│   │
│   └── proxy.ts                redireciona /admin sem sessão
│
└── tests/                      304 testes unitários
```

Os módulos de `src/lib/` não importam nada de banco nem de rede, e por isso são
testados sem precisar subir infraestrutura. Os de `src/server/` importam
`server-only`: se algum componente de cliente tentar usá-los, o build quebra na
hora, antes de qualquer chave vazar.

---

## 13. Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | sobe o servidor de desenvolvimento em `localhost:3000` |
| `npm run build` | gera a versão de produção |
| `npm run start` | roda a versão de produção já construída |
| `npm run lint` | checa o estilo e as regras do React |
| `npm run typecheck` | checa os tipos sem gerar arquivos |
| `npm run test` | roda os testes uma vez |
| `npm run test:watch` | roda os testes e fica observando as mudanças |
| `npm run verificar` | lint, tipos, testes e build, nessa ordem |

Rode `npm run verificar` antes de cada deploy.

---

## 14. Decisões de segurança

- **Nenhuma chave secreta chega ao navegador.** A única variável com prefixo
  `NEXT_PUBLIC_` é o endereço do site, que é público por natureza.
- **RLS ligada em todas as tabelas, sem nenhuma política.** As chaves públicas
  do Supabase não leem nem escrevem nada. As funções de RPC têm o `execute`
  revogado de `public`, `anon` e `authenticated`.
- **Token de 16 caracteres sorteado com `crypto.randomBytes`**, sobre um
  alfabeto de 32 símbolos, o que dá 80 bits de entropia. Não tem relação com a
  ordem de cadastro e não dá para adivinhar.
- **Nenhum convidado vê dados de outro.** Cada página carrega só a linha achada
  pelo próprio token.
- **Painel protegido em três camadas.** O `proxy.ts` redireciona, o layout das
  páginas protegidas confere a sessão, e cada ação administrativa confere de
  novo por conta própria. Uma Server Action pode ser chamada sem passar por
  navegação nenhuma, então ela nunca confia na barreira anterior.
- **Senha comparada em tempo constante**, por digest SHA-256, de modo que a
  duração da resposta não conte nada sobre a senha certa.
- **Cookie de sessão** `httpOnly`, `sameSite=lax`, `secure` em produção,
  assinado com HMAC SHA-256 e válido por 12 horas.
- **Rate limit no Postgres**, e não em memória, porque cada requisição na Vercel
  pode cair em uma instância diferente. Vale para o login, a confirmação e o
  registro de abertura.
- **Toda entrada passa por zod**, com limite de tamanho, remoção de caracteres
  de controle e recusa dos sinais `<` e `>`.
- **O CSV neutraliza fórmulas.** Um nome começando com `=`, `+`, `-` ou `@`
  ganha um apóstrofo na frente, para não virar código executável ao abrir a
  planilha no Excel.
- **Confirmação idempotente e transacional.** Confirmar duas vezes não duplica
  nada, e a troca dos acompanhantes acontece dentro de uma transação do
  Postgres, com a linha do convidado travada.

---

## 15. Teste em celular real

Antes de enviar os convites de verdade, siga o
**[CHECKLIST-DE-TESTE.md](CHECKLIST-DE-TESTE.md)**. Ele cobre a prévia no
WhatsApp, o registro de abertura, a confirmação e o salvamento na agenda, no
iPhone e no Android.

Vale o tempo: a prévia do WhatsApp e o arquivo de calendário são exatamente as
duas coisas que não dá para verificar bem no computador.

---

## 16. Problemas comuns

**"Configuração de ambiente incompleta" ao abrir qualquer página**
Falta alguma variável. A mensagem diz qual. Em desenvolvimento, confira o
`.env.local` e reinicie o `npm run dev`; variáveis novas só valem depois de
reiniciar. Na Vercel, confira em Settings > Environment Variables e faça um
redeploy.

**A prévia do WhatsApp não mostra a imagem**
O WhatsApp guarda a prévia em cache por bastante tempo. Para forçar uma nova,
acrescente `?v=2` ao fim do link ao testar. Confira também se
`NEXT_PUBLIC_SITE_URL` está com o endereço público correto e se existe uma
imagem salva na aba Convite.

**Todo mundo aparece como "não abriu", mesmo tendo aberto**
Veja se não há bloqueador de scripts no aparelho. O registro depende de uma
chamada feita pelo navegador. Se a pessoa só viu a prévia na conversa, sem tocar
no link, o certo é aparecer como não aberto.

**O arquivo .ics não abre no iPhone**
Confira se abriu pelo Safari. O WhatsApp tem um navegador interno que às vezes
trava downloads. Tocando nos três pontos e em "Abrir no Safari" resolve.

**"relation public.event does not exist"**
As migrations não foram aplicadas, ou foram aplicadas em outro projeto do
Supabase. Volte ao [passo 5](#5-passo-a-passo-aplicar-as-migrations).

**O site demora muito e depois dá erro, semanas depois do deploy**
O projeto do Supabase provavelmente hibernou. Veja a
[seção 11](#11-atenção-o-supabase-gratuito-hiberna).
