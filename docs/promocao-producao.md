# Plano de promoção segura

## Candidato validado

- Código: branch `homologacao-geral`; commit `b1646f20a90cf01ad577b30f7ecee8cd7b2776db`.
- Preview: https://qualific-estetic-fpdbjxc8y-lucviscard-5269.vercel.app
- Deployment: `dpl_DgHEGiaA4mNmhHxjKV9oj21gvPNw`, READY.
- Sete rotas verificadas em 1440 e 390 px: HTTP 200, sem erros de execução, imagens quebradas ou excesso horizontal.
- Oito testes de domínio e seis cenários de navegador passaram na build final. Os testes autenticados interceptam respostas e não comprovam gravações reais.

## Estado preservado

- `main`: `023a399e4ac4a0086543ae6e331afd1e892eda06`.
- Deployment de produção consultado: `dpl_9TzxCn3ewdv4CFM42xv9h2NhqSNB`, READY/PROMOTED.
- PR #1 permanece em rascunho, sem mesclagem e sem promoção.
- Nenhuma mudança persistente no banco de produção.

## Condições para liberação

1. Disponibilizar banco isolado Supabase. A consulta de preço de uma branch retornou UNAVAILABLE; nenhum recurso pago foi criado.
2. Aplicar `sql/release-candidate.sql` nesse banco e testar, com contas isoladas, acesso anônimo, cliente, recepção, profissional e gestão. Incluir duas reservas concorrentes, pausa, bloqueio, cancelamento, reagendamento, vistoria/fotos, estados inválidos, entrega e pagamentos.
3. Confirmar que escrita direta de agendamentos pelo cliente e acesso financeiro de perfis operacionais são negados pelo banco.
4. Validar envio e retorno de cadastro/recuperação por e-mail, URLs autorizadas e expiração dos links.
5. Completar documentos legais e aprovar composição/preços/liberação dos pacotes. Não usar propostas como dados aprovados.
6. Confirmar os checks do GitHub, revisar o diff completo do PR e obter validação final explícita do usuário.

## Execução após aprovação

1. Registrar o deployment ativo e exportar definições atuais das funções, permissões e políticas afetadas. Conferir backup e procedimento de restauração Supabase.
2. Aplicar apenas a migração previamente validada, em transação, com observação das restrições e compatibilidade da versão antiga. Abortá-la se qualquer verificação falhar.
3. Mesclar o PR aprovado na `main` e acompanhar o deployment até READY. Não executar promoção antes da aprovação final.
4. Verificar domínio, autenticação e permissões na produção. Monitorar erros e não criar dados comerciais fictícios.
5. Se houver falha, restaurar o deployment registrado. Mudanças de banco exigem o roteiro reverso baseado nas definições exportadas; rollback do site não reverte SQL.

Os bloqueios detalhados estão em `auditoria-homologacao.md`. Este documento prepara a liberação, mas não autoriza nem confirma produção.
