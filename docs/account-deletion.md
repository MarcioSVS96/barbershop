# Exclusão de contas no admin master

## Problema e correção

O fluxo anterior apagava `barbershop_members` antes de chamar `auth.admin.deleteUser`. Uma falha no Auth deixava a conta de acesso existente, mas invisível na lista de perfis, que consulta apenas os vínculos. Excluir uma barbearia também podia remover os vínculos sem excluir as respectivas contas de acesso.

A exclusão agora verifica a autorização de admin master na server action e valida o alvo, a confirmação e o vínculo esperado. Protege a própria conta e todos os admin masters. Contas com acessos em outras barbearias são bloqueadas para evitar efeitos fora do vínculo selecionado.

Antes da exclusão, a função interna `prepare_account_deletion` confere novamente o admin master e o escopo da operação. Os arquivos de `barbershop-assets` enviados pela conta são preservados e passam à administração do admin master. Arquivos de outros buckets bloqueiam a operação para revisão.

A chamada administrativa `deleteUser(id, false)` ocorre antes da remoção dos vínculos. Falhas preservam os vínculos e aparecem no diálogo. Somente depois do sucesso no Auth é feita a limpeza do vínculo exato. Se essa limpeza falhar, a confirmação pode ser repetida para concluir uma exclusão de Auth já realizada.

O cadastro de barbearia não pode ser excluído enquanto tiver contas vinculadas. A ação de edição do componente legado `ProfileRow` foi corrigida: antes apontava para uma função de exclusão; agora chama `updateBarbershopUser`.

## Contas antigas

Em **Admin Master → Perfis → Contas sem vínculo**, o sistema lista usuários do Auth sem vínculo em qualquer barbearia. Todos os admin masters ficam excluídos dessa lista. O levantamento falha de forma segura se as consultas de vínculos, usuários ou administradores não puderem ser concluídas. A listagem do Auth é paginada.

A conta precisa ser selecionada e confirmada individualmente. Não há limpeza automática nem pressuposto de que contas sem vínculo sejam contas de teste. Os registros de profissionais, atendimentos e pagamentos são preservados: esta operação exclui acesso, não o histórico comercial da barbearia.

## Banco e configuração

- `SUPABASE_SERVICE_ROLE_KEY` deve existir apenas no servidor, no mesmo projeto de `NEXT_PUBLIC_SUPABASE_URL`.
- A relação real `barbershop_members.user_id → auth.users.id` foi conferida e já utiliza `ON DELETE CASCADE`. Não foi necessário alterar essa FK.
- O Supabase impede exclusão de usuários proprietários de objetos no Storage. A função em `scripts/007_prepare_account_deletion.sql` transfere apenas a propriedade dos assets da barbearia ao admin master que confirmou a exclusão. Os arquivos, nomes e URLs são preservados. Não há exclusão automática de arquivos.
- Triggers e outras referências ao Auth também podem impedir a exclusão. Não se deve remover constraints nem apagar tabelas indiscriminadamente.
- `scripts/006_audit_account_deletion.sql` contém apenas consultas para identificar dependências, triggers, contas sem vínculo e objetos de Storage associados. Não é uma migração e não modifica dados.

Referências oficiais:
- https://supabase.com/docs/guides/auth/managing-user-data
- https://supabase.com/docs/reference/javascript/auth-admin-deleteuser

## Verificação

`npm run test:accounts` executa testes com o SDK real do Supabase e um serviço HTTP inteiramente simulado: falha de Auth sem perda de vínculo, exclusão definitiva na ordem correta, contas sem vínculo, alteração de vínculo após carregar a página, proteção de admin master, contas compartilhadas, repetição após limpeza parcial e paginação. Não há credenciais nem operações em produção nesses testes.

A função foi aplicada no banco pela integração Supabase. Ela usa `SECURITY INVOKER`, `search_path` vazio e as permissões que o `service_role` já possui, sem elevar privilégios. `PUBLIC`, `anon` e `authenticated` não têm permissão de execução. O actor também precisa estar em `master_admins`; a própria conta e outros masters são protegidos.

`tests/account-deletion-database-check.sql` executou a função instalada com um UUID aleatório sem arquivos nem vínculos: transferiu zero objetos e confirmou as permissões. A consulta de estado confirmou que as quantidades de contas, vínculos, masters e objetos permaneceram iguais. O advisor não apontou problemas na função nova.

Os testes locais passaram no Node 24, além de TypeScript e build de produção. Não foi executada exclusão de uma conta real nem transferência de um arquivo real durante a validação. Os logs de Auth disponíveis nas últimas 24 horas não continham falhas de exclusão para comprovar o motivo de cada caso histórico. Nenhuma conta ou arquivo de produção foi apagado por este trabalho.
