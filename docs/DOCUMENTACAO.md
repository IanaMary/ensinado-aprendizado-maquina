# Documentação técnica

A documentação técnica completa (arquitetura, modelo de dados, fluxos, segurança, variáveis de
ambiente, grupos de endpoints e glossário) vive **no repositório do backend**, em
[`docs/DOCUMENTACAO.md`](https://github.com/IanaMary/ensinado-aprendizado-maquina-back/blob/master/docs/DOCUMENTACAO.md).

Este arquivo era uma **cópia byte a byte** dela. Duas cópias do mesmo texto em repositórios
diferentes divergem, e a maior parte do conteúdo (coleções do MongoDB, endpoints, envs do servidor,
allowlist do sandbox) é do backend — mantê-la aqui só criava um segundo lugar para envelhecer.

O que é específico do frontend está em:

- [`README.md`](../README.md) — como rodar, convenções, branches, e a armadilha do
  `<base href="/h2ia/tutor/">` (tela branca no `ng serve`).
- [`PRODUCT.md`](../PRODUCT.md) — público, identidade de marca, princípios de design, acessibilidade.
- [`CHANGELOG.md`](../CHANGELOG.md) — histórico de publicações deste repositório.
