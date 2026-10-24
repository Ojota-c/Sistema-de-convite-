import { GerenciarConvidados } from '@/components/admin/GerenciarConvidados';
import { montarLinhas } from '@/lib/visao';
import { urlBase } from '@/server/ambiente';
import { listarConvidados } from '@/server/convidados';
import { buscarEvento } from '@/server/evento';
import { exigirAdmin } from '@/server/sessao';
import { listarVariantes } from '@/server/variantes';

export const dynamic = 'force-dynamic';

/**
 * Cadastro dos convidados e envio dos links.
 *
 * A mensagem de cada pessoa ja sai montada do servidor, com o nome e o link
 * dela no lugar dos marcadores, pronta para copiar ou mandar no WhatsApp.
 */
export default async function PaginaDeConvidados() {
  await exigirAdmin();

  const [convidados, evento, variantes] = await Promise.all([
    listarConvidados(),
    buscarEvento(),
    listarVariantes(),
  ]);
  const linhas = montarLinhas(convidados, evento, urlBase());

  return (
    <GerenciarConvidados
      linhas={linhas}
      variantes={variantes}
      linhaDoLink={evento.linhaDoLink}
    />
  );
}
