'use client';

import { useEffect, useRef } from 'react';

/**
 * Registra que o convidado abriu o convite.
 *
 * Este e o ponto central do rastreamento, e ele e client-side de proposito.
 *
 * O WhatsApp, o Telegram e os buscadores buscam a pagina sozinhos para montar
 * a previa do link. Se a abertura fosse registrada durante a renderizacao no
 * servidor, todo convite apareceria como "aberto" assim que a mensagem fosse
 * enviada, e o painel inteiro perderia o sentido.
 *
 * Nenhum desses robos executa JavaScript. Ao disparar o registro de dentro de
 * um efeito, depois que a pagina montou no navegador de uma pessoa de verdade,
 * a previa passa batida. A rota ainda confere o user agent como segunda camada.
 */
export function RegistroDeAbertura({ token }: { token: string }) {
  const jaRegistrou = useRef(false);

  useEffect(() => {
    // O modo estrito do React executa o efeito duas vezes em desenvolvimento.
    // A referencia sobrevive entre as duas, entao sai um registro so.
    if (jaRegistrou.current) return;
    jaRegistrou.current = true;

    // keepalive mantem a requisicao viva mesmo se a pessoa sair da pagina
    // no mesmo instante. Falhar aqui nao pode atrapalhar nada, por isso o
    // erro e silencioso: o convite continua funcionando.
    void fetch(`/c/${encodeURIComponent(token)}/abertura`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
      keepalive: true,
    }).catch(() => {
      /* registro de abertura e informativo, nunca bloqueia o convidado */
    });
  }, [token]);

  return null;
}
