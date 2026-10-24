# Checklist de teste em celular real

Faça este roteiro **antes de enviar os convites de verdade**. Ele existe porque
três coisas não dá para verificar bem no computador: a prévia do link no
WhatsApp, o arquivo de calendário no iPhone e o comportamento real do registro
de abertura.

Separe cerca de 25 minutos, um iPhone e um Android. Não tendo os dois à mão,
peça para alguém da família abrir um link de teste.

---

## Antes de começar

- [ ] O site está publicado na Vercel e abre pelo endereço público.
- [ ] `NEXT_PUBLIC_SITE_URL` está com o endereço final e houve redeploy depois
      disso.
- [ ] As três migrations foram aplicadas no projeto certo do Supabase.
- [ ] A imagem do convite está salva na aba Convite.
- [ ] Data, horário e local estão preenchidos e salvos.
- [ ] Você criou **dois convidados de teste**, com nomes como
      "Teste iPhone" e "Teste Android".

> Apague os convidados de teste no fim. Enquanto existirem, eles entram nas
> contas do painel.

---

## Parte 1 — Prévia no WhatsApp

Feita uma vez, em qualquer um dos aparelhos.

- [ ] Na aba Convidados, toque em **WhatsApp** no convidado de teste.
- [ ] O WhatsApp abre com a mensagem já escrita.
- [ ] O nome do convidado aparece certo no texto.
- [ ] A data e o local aparecem certos.
- [ ] Envie a mensagem para você mesmo (conversa com o próprio número).
- [ ] **A prévia mostra a imagem do convite**, não um retângulo cinza.
- [ ] A prévia mostra o título do evento.
- [ ] A prévia mostra a data e o local na descrição.

**Se a imagem não aparecer:** o WhatsApp guarda a prévia em cache por bastante
tempo. Acrescente `?v=2` ao fim do link e envie de novo. Se aparecer agora, era
cache, e os convidados verão a imagem normalmente.

---

## Parte 2 — Registro de abertura

Esta é a parte mais fácil de errar e a mais importante de conferir.

- [ ] Com a mensagem já enviada mas **sem tocar no link**, abra o painel no
      computador, na aba Acompanhamento.
- [ ] O convidado de teste aparece como **"Não abriu"**.

> Se ele já aparecer como "Abriu" sem ninguém ter tocado no link, a prévia do
> WhatsApp está sendo contada como abertura. Isso não deve acontecer.

- [ ] Agora toque no link no celular e espere a página carregar.
- [ ] Volte ao painel no computador e atualize (ou só volte para a aba, que ele
      se atualiza sozinho).
- [ ] O convidado agora aparece como **"Abriu, sem confirmar"**.
- [ ] A data e a hora da abertura estão corretas, no horário de Brasília.

---

## Parte 3 — iPhone (Safari)

### A página do convite

- [ ] A imagem do convite aparece inteira, sem corte estranho.
- [ ] O título está legível e não quebra feio.
- [ ] Data, horário e local aparecem corretos.
- [ ] As cores combinam com a imagem enviada.
- [ ] **O texto tem contraste suficiente**, legível no sol.
- [ ] Nada rola para os lados: a página só rola para baixo.
- [ ] Se tiver um iPhone pequeno (SE ou mini), confira que nada estourou.

### O formulário

- [ ] O campo "Seu nome" já vem preenchido com o nome cadastrado.
- [ ] Dá para apagar e digitar outro nome.
- [ ] **Ao tocar no campo, a tela não dá zoom sozinha.**
- [ ] Toque em "Adicionar acompanhante": um campo novo surge com animação
      suave e **o cursor vai direto para ele**.
- [ ] Adicione até o limite. O botão some e aparece um aviso explicando.
- [ ] Remova um acompanhante pelo botão de menos. O campo certo some.
- [ ] Todos os botões são fáceis de acertar com o dedo.

### A confirmação

- [ ] Toque em "Confirmar presença".
- [ ] O botão mostra "Registrando..." enquanto envia.
- [ ] Aparece a celebração com os papeizinhos caindo.
- [ ] Aparece "Presença confirmada!" e a lista de quem vai.
- [ ] No painel, o convidado agora está como **"Confirmado"**, com os
      acompanhantes listados e o total de pessoas certo.

### O calendário (a parte mais sensível no iPhone)

- [ ] Aparece "Quer salvar no seu calendário?" com os dois botões.
- [ ] O botão **"Apple, Outlook e outros" está em destaque** (preenchido).
- [ ] Toque nele.
- [ ] **O iPhone abre a tela de adicionar à agenda.**
- [ ] O título do evento está certo.
- [ ] **A data e o horário estão certos**, sem diferença de fuso.
- [ ] O local aparece preenchido.
- [ ] Adicione o evento e confira no app Calendário.
- [ ] Abra o evento salvo e confirme que **há um alerta para 1 dia antes**.

> Se o arquivo não abrir, veja se você está no Safari. O navegador interno do
> WhatsApp às vezes trava downloads. Toque nos três pontos e em "Abrir no
> Safari".

- [ ] Toque em "Google Agenda". Abre em outra aba, com título, data e local já
      preenchidos.

### A volta

- [ ] Feche e abra o link de novo.
- [ ] A página mostra direto o estado confirmado, **sem a celebração**.
- [ ] Toque em "Mudar meu nome ou meus acompanhantes".
- [ ] O formulário volta já preenchido com o que foi respondido.
- [ ] Mude um acompanhante e confirme de novo.
- [ ] No painel, a lista reflete a mudança e **não duplicou ninguém**.

---

## Parte 4 — Android (Chrome)

- [ ] A página do convite aparece igual à do iPhone.
- [ ] O formulário funciona do mesmo jeito.
- [ ] **O botão "Google Agenda" está em destaque** neste aparelho.
- [ ] Toque em "Google Agenda": abre com título, data e local preenchidos.
- [ ] Salve e confira no app Google Agenda.
- [ ] Volte e toque em "Apple, Outlook e outros".
- [ ] O arquivo `.ics` baixa e **abre em algum app de calendário** ao tocar.
- [ ] A data e o horário estão certos.

---

## Parte 5 — Recusar o convite

- [ ] Abra o link do segundo convidado de teste.
- [ ] Toque em "Não vou poder ir".
- [ ] Aparece a mensagem de resposta registrada, sem celebração.
- [ ] No painel, ele aparece como **"Não vai poder ir"**.
- [ ] Ele **não** entra na conta de pessoas confirmadas.
- [ ] Abra o link de novo e toque em "Mudei de ideia, quero confirmar".
- [ ] Confirme. No painel ele passa para "Confirmado" e **sai** da contagem de
      recusas.

---

## Parte 6 — Acessibilidade e movimento

- [ ] No iPhone, ligue **Ajustes > Acessibilidade > Movimento > Reduzir
      Movimento**.
- [ ] Abra o link e confirme presença.
- [ ] **Não aparece a chuva de papel**, e a confirmação continua clara em texto.
- [ ] Desligue a opção de novo.
- [ ] Navegue pela página só com Tab, no computador: todo campo e todo botão
      recebe um contorno de foco visível.
- [ ] Aumente a fonte do sistema para o máximo e confira que nada some.

---

## Parte 7 — Links errados e limites

- [ ] Abra o link de um convidado e apague os últimos caracteres do endereço.
- [ ] Aparece a página "Convite não encontrado", bem desenhada, **sem revelar
      nada do evento**.
- [ ] Abra o endereço raiz do site, sem `/c/`.
- [ ] A página não mostra título, data, local nem quantidade de convidados.
- [ ] Abra `/admin` em uma janela anônima: vai direto para a tela de senha.
- [ ] Digite uma senha errada: a mensagem é "Senha incorreta", sem pistas.

---

## Parte 8 — O painel

- [ ] Os números do topo batem com a lista.
- [ ] "Pessoas" conta convidados **mais** acompanhantes.
- [ ] Filtre por cada status e confira que a lista corresponde.
- [ ] Busque por um nome com acento, digitando **sem** acento: ele aparece.
- [ ] Busque pelo nome de um acompanhante: o convidado dele aparece.
- [ ] Clique em **Exportar CSV** e abra o arquivo.
- [ ] Os acentos aparecem corretos (não `JoÃ£o`).
- [ ] Os nomes, status e acompanhantes estão certos.
- [ ] Abra o painel no celular: os convidados viram fichas legíveis, sem
      rolagem lateral.

---

## Para fechar

- [ ] Apague os convidados de teste.
- [ ] Confira que os números voltaram a zero.
- [ ] Rode `npm run verificar` uma última vez.
- [ ] Leia a [seção 11 do README](README.md#11-atenção-o-supabase-gratuito-hiberna)
      sobre a hibernação do Supabase e decida como vai evitá-la.

Pronto para enviar.
