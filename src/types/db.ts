/**
 * Tipos das tabelas e funcoes do Postgres.
 *
 * Escritos a mao e mantidos em par com os arquivos de supabase/migrations.
 * Os nomes de coluna ficam em ingles, como no banco; a traducao para o
 * vocabulario do dominio acontece em src/server.
 *
 * Importante: as linhas sao declaradas com `type`, nunca com `interface`.
 * O TypeScript so da indice implicito a um alias de tipo objeto, entao uma
 * interface nao satisfaz o `Record<string, unknown>` que o supabase-js exige,
 * e o cliente silenciosamente perderia toda a tipagem.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [chave: string]: Json | undefined }
  | Json[];

export type EventoRow = {
  id: number;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  location_name: string | null;
  location_address: string | null;
  notes: string | null;
  invite_message: string | null;
  image_path: string | null;
  image_mime: string | null;
  image_width: number | null;
  image_height: number | null;
  palette: Json | null;
  max_companions: number;
  timezone: string;
  updated_at: string;
};

export type ConvidadoRow = {
  id: string;
  name: string;
  phone: string | null;
  token: string;
  first_opened_at: string | null;
  last_opened_at: string | null;
  open_count: number;
  confirmed_at: string | null;
  declined_at: string | null;
  /** Qual arte do convite esta pessoa recebe. Nulo cai na imagem do evento. */
  variant_code: string | null;
  created_at: string;
  updated_at: string;
};

export type VarianteRow = {
  code: string;
  descricao: string;
  posicao: number;
  image_path: string | null;
  image_mime: string | null;
  image_width: number | null;
  image_height: number | null;
  palette: Json | null;
  updated_at: string;
};

export type AcompanhanteRow = {
  id: string;
  guest_id: string;
  name: string;
  position: number;
  created_at: string;
};

export type RateLimitRow = {
  bucket: string;
  contador: number;
  inicio_janela: string;
};

/** Resposta das funcoes RPC que devolvem jsonb com a marca de sucesso. */
export type RespostaRpc = {
  ok: boolean;
  erro?: string;
  [chave: string]: Json | undefined;
};

export type Database = {
  public: {
    Tables: {
      event: {
        Row: EventoRow;
        Insert: Partial<EventoRow>;
        Update: Partial<EventoRow>;
        Relationships: [];
      };
      guests: {
        Row: ConvidadoRow;
        Insert: Partial<ConvidadoRow> & Pick<ConvidadoRow, 'name' | 'token'>;
        Update: Partial<ConvidadoRow>;
        Relationships: [
          {
            foreignKeyName: 'guests_variant_code_fkey';
            columns: ['variant_code'];
            isOneToOne: false;
            referencedRelation: 'invite_variants';
            referencedColumns: ['code'];
          },
        ];
      };
      companions: {
        Row: AcompanhanteRow;
        Insert: Partial<AcompanhanteRow> & Pick<AcompanhanteRow, 'guest_id' | 'name'>;
        Update: Partial<AcompanhanteRow>;
        Relationships: [
          {
            foreignKeyName: 'companions_guest_id_fkey';
            columns: ['guest_id'];
            isOneToOne: false;
            referencedRelation: 'guests';
            referencedColumns: ['id'];
          },
        ];
      };
      invite_variants: {
        Row: VarianteRow;
        Insert: Partial<VarianteRow> & Pick<VarianteRow, 'code' | 'descricao'>;
        Update: Partial<VarianteRow>;
        Relationships: [];
      };
      rate_limits: {
        Row: RateLimitRow;
        Insert: Partial<RateLimitRow> & Pick<RateLimitRow, 'bucket'>;
        Update: Partial<RateLimitRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      registrar_abertura: {
        Args: { p_token: string };
        Returns: Json;
      };
      confirmar_presenca: {
        Args: { p_token: string; p_nome: string; p_acompanhantes: string[] };
        Returns: Json;
      };
      recusar_convite: {
        Args: { p_token: string; p_nome: string };
        Returns: Json;
      };
      rl_consumir: {
        Args: { p_bucket: string; p_limite: number; p_janela_segundos: number };
        Returns: boolean;
      };
    };
  };
};
