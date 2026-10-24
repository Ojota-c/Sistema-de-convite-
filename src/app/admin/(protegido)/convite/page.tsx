import { FormularioDoEvento } from '@/components/admin/FormularioDoEvento';
import { UploadDoConvite } from '@/components/admin/UploadDoConvite';
import { utcParaHoraLocal } from '@/lib/datas';
import { textoDaDataDoEvento, textoDoLocalDoEvento } from '@/lib/visao';
import { urlBase } from '@/server/ambiente';
import { listarConvidados } from '@/server/convidados';
import { buscarEvento } from '@/server/evento';
import { exigirAdmin } from '@/server/sessao';

export const dynamic = 'force-dynamic';

/**
 * Edicao do convite: a imagem, os dados do evento e a mensagem de envio.
 *
 * A previa da imagem aponta para a rota de um convidado real, quando existe
 * algum, porque e assim que o arquivo e servido de verdade. Sem convidados,
 * a previa fica so com a imagem recem-escolhida, ainda local.
 */
export default async function PaginaDoConvite() {
  await exigirAdmin();

  const [evento, convidados] = await Promise.all([buscarEvento(), listarConvidados()]);

  const primeiroToken = convidados[0]?.token ?? null;
  const imagemAtual =
    evento.caminhoDaImagem && primeiroToken ? `/c/${primeiroToken}/imagem` : null;

  const exemploDeLink = `${urlBase()}/c/${primeiroToken ?? 'exemplo'}`;

  return (
    <div className="space-y-12">
      <section aria-labelledby="titulo-imagem">
        <h1 id="titulo-imagem" className="titulo-secao">
          O convite
        </h1>
        <p className="mt-2 text-sm text-[var(--cor-tinta-suave)]">
          A imagem aparece no topo da página do convidado e também na prévia do
          link no WhatsApp.
        </p>

        <div className="painel-caixa mt-5 px-5 py-5">
          <UploadDoConvite imagemAtual={imagemAtual} tituloDoEvento={evento.titulo} />
          {evento.caminhoDaImagem && !primeiroToken ? (
            <p className="mt-4 text-xs text-[var(--cor-tinta-suave)]">
              Há uma imagem salva. Ela aparece aqui assim que existir ao menos um
              convidado cadastrado, porque a imagem é servida pelo link pessoal.
            </p>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="titulo-dados">
        <h2 id="titulo-dados" className="titulo-secao">
          Dados da festa
        </h2>

        <div className="painel-caixa mt-5 px-5 py-6">
          <FormularioDoEvento
            titulo={evento.titulo}
            inicio={evento.inicio ? utcParaHoraLocal(evento.inicio, evento.fuso) : ''}
            fim={evento.fim ? utcParaHoraLocal(evento.fim, evento.fuso) : ''}
            localNome={evento.localNome ?? ''}
            localEndereco={evento.localEndereco ?? ''}
            observacoes={evento.observacoes ?? ''}
            mensagemConvite={evento.mensagemConvite ?? ''}
            maxAcompanhantes={evento.maxAcompanhantes}
            dataPorExtenso={textoDaDataDoEvento(evento)}
            localCompleto={textoDoLocalDoEvento(evento)}
            exemploDeLink={exemploDeLink}
          />
        </div>
      </section>
    </div>
  );
}
