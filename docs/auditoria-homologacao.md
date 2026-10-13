# Auditoria de homologação — Qualific.Estetic

Base: `homologacao-geral`, commit `a5dcd2cb736f55f9967f36f83c02b55429497a68`.
Produção preservada: `main` em `023a399e4ac4a0086543ae6e331afd1e892eda06`.

## Correções implementadas

- Cotação preservada ao escolher a data, com horários invalidados quando os parâmetros mudam.
- Agenda antiga usa as funções v2 que consideram a pausa operacional.
- Cancelamento de solicitações elegíveis na área conectada do cliente.
- Recuperação de senha com tratamento do retorno de autenticação.
- Atendimento embutido normalizado como objeto ou lista, conforme o retorno do PostgREST.
- Validação de placa, ano, quilometragem e fotos JPEG/PNG/WebP até 10 MB.
- Formulários de atendimento limpos ao trocar de veículo; erros visíveis nos diálogos.
- Diálogos com foco, Escape, rótulo de fechamento e navegação por teclado.
- Pacotes restritos a ADMIN/MANAGER; verificação de perfil antes de carregar as áreas internas.
- Recebimentos calculados pela data efetiva do pagamento no fuso de São Paulo.
- Históricos de gestão paginados; falhas não apresentam totais parciais como completos.
- Logotipo local, foco visível, compatibilidade de CSS e bloqueio de indexação das rotas de homologação.
- Dependências fixadas, lockfile e validação contínua com testes, tipos, build e navegador.

## Evidências

- Oito testes automatizados de regressão passaram.
- TypeScript e build Next.js passaram.
- Desktop 1440 px e celular 390 px: seis rotas responderam 200, sem erro de execução, imagens quebradas ou excesso horizontal.
- Navegador com respostas de teste interceptadas: acesso de CUSTOMER negado em pacotes, gestão e operação; cotação/data/horários/agendamento; iniciar/pronto/entregar com atendimento como objeto e KM zero; recuperação de senha. Esses testes não gravam no Supabase e não comprovam gravação real.
- Supabase real, consultas somente de leitura: visitantes enxergam zero clientes, veículos, agendamentos e pagamentos; identidade sem perfil não tem acesso de equipe ou gestão.
- Funções de agendamento, cancelamento, reagendamento, orçamento, operação e aprovação de pacotes não permitem execução por `anon`.
- Armazenamento `attendance-photos` é privado, limitado a 10 MB e JPEG/PNG/WebP.

## Bloqueios para produção

1. `bookings_customer_insert/update` permitem escrita direta do cliente, contornando a validação das funções de agenda. Remover essas políticas em um ambiente isolado e validar as funções antes de aplicar a correção em produção.
2. Funções de início, finalização e entrega precisam validar transições no banco. A interface já exige vistoria, mas isso não substitui o controle no banco.
3. Pagamentos usam política `is_staff()`, mais ampla que a restrição ADMIN/MANAGER da gestão. A correção proposta restringe o acesso financeiro no banco.
4. Reagendamento antigo não atualiza a ocupação do box e não usa a duração histórica/pausa da agenda v2. A correção SQL está preparada, mas a interface de reagendamento não foi habilitada contra essa função antiga.
5. Não há banco de desenvolvimento Supabase. Gravações reais com contas de cliente, recepção, profissional e gestor ainda precisam de validação isolada. Não foram criados clientes, pagamentos ou atendimentos fictícios no banco real.
6. Recuperação/cadastro por e-mail dependem da configuração de URLs autorizadas e do envio de e-mails no Supabase. O retorno foi validado com interceptação; o envio real ainda não foi executado.
7. O cadastro exige aceitação de Termos e Política de Privacidade, mas o repositório não contém documentos aprovados nem identificação legal suficiente para redigi-los sem inventar informações.
8. O advisor informa proteção contra senhas vazadas desabilitada. Avaliar a configuração/plano antes da liberação.

O arquivo `docs/sql/release-candidate.sql` é uma proposta de correção; não foi aplicado nem certificado em um banco isolado. Nenhuma alteração persistente foi feita no Supabase de produção. Manter o PR em rascunho até resolver esses bloqueios e obter a validação final do usuário.

Referências: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
