#!/bin/bash
# Copia as variaveis de ambiente para a area de transferencia, no formato que
# a Netlify aceita colar de uma vez.
#
# A NEXT_PUBLIC_SITE_URL sai de fora de proposito: ela so e conhecida depois
# do primeiro deploy, e voce a cadastra separado.
#
# Uso:  bash copiar-variaveis.sh
cd "$(dirname "$0")" || exit 1
grep -E '^(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_STORAGE_BUCKET|ADMIN_PASSWORD|ADMIN_SESSION_SECRET)=' .env.local | pbcopy
echo "Copiado. Sao 5 variaveis, prontas para colar na Netlify."
echo "Depois do deploy, cadastre a sexta a mao:"
echo "  NEXT_PUBLIC_SITE_URL=https://SEU-SITE.netlify.app"
