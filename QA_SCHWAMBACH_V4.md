# Relatório de qualidade — Schwambach Avaliesch v4.0

**Status:** preparado para novo deploy e homologação em produção (não homologado na produção).

| Teste | Resultado | Ambiente |
| --- | --- | --- |
| Compilação `npm run build` | APROVADO | Local |
| Verificações estáticas | 18/18 | Local |
| Contratos de interface + invariantes | 15 + 6 aprovados | Inspeção de código |
| Integração de API: login, CADASTROS, CRUD, turnos, status, avaliações, métricas, CSV, logout | 18/18 | Fetch Supabase simulado |
| Decodificação dos QR Codes oficiais de caixa-01 a caixa-12 | 12/12 | OpenCV local |
| E2E em navegador real | NÃO CONCLUÍDO | Bloqueio administrativo do navegador de testes |
| Login e gravação no banco Supabase real | NÃO EXECUTADO | Necessária sessão de teste autorizada |
| Edge Function `invite-user` em produção | NÃO VERIFICADA | Exige deploy separado |
| Domínio oficial atualizado com v4 | NÃO VERIFICADO | Exige push + novo deployment Vercel |

### Correções

- Eliminada a série fictícia no dashboard (antiga `history:[4.45,...]`).
- Série diária SQL agregada por empresa e fuso horário, sem expor dados entre empresas.
- Atualização manual e polling automático; redução de cache para 15 segundos.
- UI lateral premium em azul profundo, identidade Schwambach, destaque de navegação e estado operacional.
- Cadastro e edição de funcionários e pontos, alternância ativo/inativo e bloqueio de desativação com turno ativo.
- Bloqueio claro de novos pontos ao alcançar o limite cadastrado.
- Botões de avaliações, ocorrências, turnos, imprimir, exportar CSV, convites e gestão conectados às respectivas operações.
- Verificação de registros realmente retornados pela API nas operações POST/PATCH.
- Correção do domínio de convite para a página `/nova-senha` do site oficial.
- Removido frontend legado inativo com valores fixos de demonstração.

### Observação de uso e privacidade

As avaliações individuais podem ser influenciadas por questões de movimento, horários, escala e amostra reduzida. Utilize as métricas com contexto e evite decisões disciplinares automatizadas baseadas somente em notas. O histórico de atendimento pode conter comentários escritos por clientes; restrinja o acesso aos perfis autorizados.
