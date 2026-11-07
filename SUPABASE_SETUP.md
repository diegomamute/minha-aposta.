# Minha Aposta — integração API-Football

O painel exibe partidas por data, jogos ao vivo e classificação. A chave do fornecedor é mantida somente em uma Supabase Edge Function, nunca no JavaScript público.

## Configuração
1. Criar um projeto Supabase separado chamado Minha Aposta. Não reutilizar o projeto do Diarista Fácil.
2. Implantar `supabase/functions/football-data/index.ts` como Edge Function `football-data`.
3. Desativar JWT verification para a função pública (ela só permite GET e endpoints de leitura aprovados).
4. Em Edge Functions → Secrets, cadastrar `API_FOOTBALL_KEY` com a chave privada.
5. Em `app.js`, preencher `API_URL` com `https://SEU-PROJETO.supabase.co/functions/v1/football-data`.

A função faz cache de 5 minutos. O plano gratuito do fornecedor tem cota limitada; evite atualizar a tela continuamente. A disponibilidade de placares ao vivo e classificação depende da cobertura da competição.

Portal exclusivamente informativo: não aceita apostas, depósitos ou pagamentos.
