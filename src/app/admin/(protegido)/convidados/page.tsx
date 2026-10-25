import { redirect } from 'next/navigation';

/**
 * A lista de convidados mora na pagina inicial do painel, /admin, que e a
 * aba Convidados. Este endereco antigo so leva ate la.
 */
export default function PaginaDeConvidados() {
  redirect('/admin');
}
