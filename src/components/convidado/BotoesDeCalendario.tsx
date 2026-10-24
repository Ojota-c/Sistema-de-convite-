import type { SistemaProvavel } from '@/lib/bots';

export interface BotoesDeCalendarioProps {
  /** Rota que devolve o arquivo .ics deste convidado. */
  caminhoDoIcs: string;
  linkDoGoogle: string;
  dataPorExtenso: string;
  faixaDeHoras: string;
  local: string | null;
  /** Sistema deduzido do user agent, so para destacar o botao mais provavel. */
  sistema: SistemaProvavel;
}

/**
 * Convite para salvar o evento na agenda.
 *
 * Os dois caminhos aparecem sempre. A deteccao de sistema serve apenas para
 * dar o preenchimento ao botao mais provavel: errar o palpite nao esconde nada
 * de ninguem.
 *
 * O arquivo .ics e servido por uma rota, nao montado como blob no navegador.
 * O Safari do iPhone abre a importacao para a agenda direto a partir da URL,
 * e o Android reconhece o tipo text/calendar do mesmo jeito. Um link com
 * download de blob falharia justamente no iPhone.
 */
export function BotoesDeCalendario({
  caminhoDoIcs,
  linkDoGoogle,
  dataPorExtenso,
  faixaDeHoras,
  local,
  sistema,
}: BotoesDeCalendarioProps) {
  const appleEmDestaque = sistema !== 'android';

  return (
    <div className="mt-9 border-t border-[var(--cor-borda)] pt-7">
      <p className="sobretitulo">Para não esquecer</p>
      <h3 className="titulo-secao mt-2 text-[1.2rem]">
        Quer salvar no seu calendário?
      </h3>

      <p className="mt-2 text-sm text-[var(--cor-tinta-suave)]">
        {dataPorExtenso}, {faixaDeHoras}
        {local ? ` · ${local}` : ''}
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a
          href={caminhoDoIcs}
          className={`botao flex-1 ${appleEmDestaque ? 'botao-principal' : 'botao-contorno'}`}
        >
          Apple, Outlook e outros
        </a>

        <a
          href={linkDoGoogle}
          target="_blank"
          rel="noopener noreferrer"
          className={`botao flex-1 ${appleEmDestaque ? 'botao-contorno' : 'botao-principal'}`}
        >
          Google Agenda
          <span className="apenas-leitor-de-tela">(abre em outra aba)</span>
        </a>
      </div>

      <p className="mt-3 text-xs text-[var(--cor-tinta-suave)]">
        O lembrete chega um dia antes.
      </p>
    </div>
  );
}
