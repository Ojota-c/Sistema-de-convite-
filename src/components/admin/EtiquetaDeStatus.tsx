import { ROTULOS_DE_STATUS, type StatusConvidado } from '@/types/dominio';

const CLASSES: Record<StatusConvidado, string> = {
  confirmado: 'etiqueta-confirmado',
  recusado: 'etiqueta-recusado',
  'sem-resposta': 'etiqueta-sem-resposta',
  'nao-abriu': 'etiqueta-nao-abriu',
};

/**
 * Etiqueta de status.
 *
 * Cada status carrega cor e tambem forma do marcador: circulo cheio para
 * confirmado, losango para recusa, quadrado para pendente, circulo vazado
 * para quem nao abriu. Quem nao distingue matizes continua lendo a diferenca.
 */
export function EtiquetaDeStatus({ status }: { status: StatusConvidado }) {
  return (
    <span className={`etiqueta ${CLASSES[status]}`}>{ROTULOS_DE_STATUS[status]}</span>
  );
}
