# Compatibilidade

Esta é a página mais importante do site para quem vai **mudar** alguma coisa.

O cliente e a API são publicados separadamente. O cliente vive no PyPI, é
instalado por terceiros e atualizado quando eles quiserem — talvez nunca. O
servidor não pergunta com quem está falando. Disso decorre uma regra com **três
faces**, e satisfazer uma não é satisfazer a regra.

## 1. O contrato HTTP

Nada pode:

- rejeitar um payload que hoje é aceito;
- alterar o formato de uma resposta de sucesso;
- introduzir um novo código de status numa rota existente;
- remover um label de métrica que algum painel consome;
- alterar o esquema de segurança publicado no OpenAPI.

## 2. Os clientes que já estão em produção

O cliente compara o status **exatamente**:

```python
if res.status_code != HTTPStatus.OK:
    raise Exception(...)
```

Isso tem uma consequência que costuma pegar as pessoas de surpresa: **devolver
`201` onde antes vinha `200` quebra a frota**, embora `201` seja "mais correto".
Uma mudança de sucesso também é uma quebra.

!!! danger "O corolário prático"

    Não existe mudança de resposta segura só porque a semântica melhorou. A
    pergunta certa não é "esta resposta está mais certa?", e sim "algum cliente
    de qualquer versão já publicada consegue notar a diferença?".

## 3. Os dados que já estão gravados

Parâmetro já salvo tem que continuar decifrando e continuar sendo gravável.

- O envelope criptográfico é contrato congelado entre dois artefatos liberados
  em datas diferentes — ver [Envelope criptográfico](../seguranca/envelope.md).
- Documento gravado antes de um campo novo existir **não pode passar a dar
  erro**. No Mongo um filtro por `null` casa com campo ausente, e é isso que
  torna possível migrar preguiçosamente, sem script de migração.

## O que não é contrato

Um caminho que hoje termina em exceção não tratada ou em falha silenciosa **não
é contrato**. Ninguém consegue depender de um processo que morre. Corrigir um
crash não quebra compatibilidade, mesmo que mude o que o cliente observa.

## Isto não é verificado por CI

Vale dizer com todas as letras: **nenhum teste automatizado garante o que está
nesta página.**

O que existe é `tests/test_openapi_contrato.py`, que congela apenas o
`securitySchemes` e o bloco `security` de cada rota. Ele não congela as rotas
em si, nem os métodos, nem os status de sucesso, nem o formato das respostas. E
nenhum job cruza os dois repositórios.

A regra é sustentada por revisão, não por teste. Ela importa mais do que nunca
imediatamente antes de uma liberação coordenada dos dois lados.

## Ordem de liberação

Quando uma mudança precisa acontecer nos dois lados, a ordem é sempre a mesma:

1. **Servidor primeiro, inerte.** Toda mudança de comportamento observável entra
   atrás de uma configuração cujo default **reproduz o estado atual**. O
   servidor novo se comporta exatamente como o antigo.
2. **Cliente depois.** Publicado no PyPI, adotado no ritmo de quem consome.
3. **A virada por último**, quando a telemetria mostrar que não há mais cliente
   antigo — e só então.

Dois exemplos reais desse padrão estão documentados:
[`READ_AUTH_MODE`](../api/autenticacao.md#read_auth_mode) e
[`USER_EDITABLE_ENFORCEMENT`](../api/autenticacao.md#user_editable_enforcement).
Nos dois casos o default é o comportamento histórico, e a promoção depende de
uma medição, não de uma data.
