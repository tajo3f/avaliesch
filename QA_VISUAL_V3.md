# Relatório de QA — v3.0.0

**Causa comprovada no código:** classes premium presentes no JS e ausentes do CSS. A correção anterior incorporou o arquivo CSS no build, mas não adicionou as classes que faltavam. Esta versão corrige essa lacuna.

| Etapa | Resultado |
|---|---|
| 12 QR Codes decodificados | 12/12 aprovados; domínio canônico correto |
| Testes automáticos de estrutura | 18/18 aprovados |
| Compilação | Aprovada |
| Sintaxe dos arquivos JS | Aprovada |
| Sintaxe CSS | Aprovada, sem erros no parser |
| Previews Chromium desktop e mobile | 6/6 sem overflow horizontal |
| Confirmação da URL Vercel publicada | Não realizada; requer novo deployment |
| Login Supabase e envio real | Não realizado; requer acesso em produção |
| Cobertura 100% ponta a ponta | Não reivindicada |
