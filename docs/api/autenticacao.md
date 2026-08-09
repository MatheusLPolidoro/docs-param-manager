# Autenticação e autorização

## Como o token é validado

A identidade vem do Keycloak. O middleware `middlewares/keycloak_auth.py` valida
o JWT com `PyJWKClient` e `algorithms=['RS256']` — ou seja, busca a chave
pública do realm e verifica a assinatura. O servidor não emite token próprio;
ele apenas confere o que o Keycloak assinou.

Três dependências saem daí, e os nomes importam porque a suíte de testes os
substitui um a um:

`get_current_user`
:   Exige token válido. Falha com `401` se não houver.

`get_current_user_optional`
:   Resolve o usuário se houver token; devolve `None` em vez de falhar.

`require_admin`
:   Exige token válido **e** papel de administrador.

## Os papéis

São dois, e a diferença entre eles é estreita e precisa:

**admin**
:   Pode tudo: criar e apagar aplicação, criar e apagar parâmetro, alterar
    qualquer campo de qualquer parâmetro, e mudar a configuração em runtime.

**user**
:   Pode alterar **apenas o campo `value`** de parâmetros marcados com
    `user_editable=True`. Qualquer outra coisa é `403`.

O que faz valer é `AppService._validate_permission`, que **diffa os campos
restritos de metadado**. A pergunta que ele responde não é "o usuário mexeu no
valor?", e sim "o usuário mexeu em algo além do valor?".

## `READ_AUTH_MODE`

De fábrica, **ler parâmetro é anônimo**. Isso não é descuido: é o comportamento
histórico, e o servidor não negocia versão de cliente — apertar o controle de um
dia para o outro derrubaria toda frota que ainda não manda token.

O modo é resolvido pelo `RuntimeConfigService`, que dá precedência ao valor
gravado no banco (alterável por administrador **sem redeploy**) e cai para o
`.env` quando não há sobrescrita.

| Modo | O que faz |
|---|---|
| `off` | Comportamento histórico. Leitura anônima liberada, sem custo de resolução |
| `warn` | Continua liberando, mas **conta e loga** cada leitura sem token |
| `enforce` | Passa a exigir token. Sem token, `401` |

### O critério de promoção

O `warn` existe para produzir uma medição, e não para avisar alguém. Ele
alimenta a métrica de leituras anônimas.

!!! tip "Só promova para `enforce` com a métrica zerada"

    Enquanto `anonymous_reads_total` não estiver zerado no ambiente, existe
    consumidor sem token — e ligar o `enforce` vai derrubá-lo.

### Token inválido não conta como leitura anônima

Uma sutileza que parece detalhe e não é. No modo `warn`, quando chega uma
requisição **com** `Authorization` que não resolve — token expirado, audiência
errada — ela é contabilizada como **falha de autenticação**, não como leitura
anônima.

Se as duas coisas fossem contadas juntas, uma frota com token momentaneamente
expirado manteria o contador de anônimos acima de zero para sempre, e o portão
nunca poderia ser promovido. O sinal que decide a promoção ficaria corrompido
pelo ruído.

## `USER_EDITABLE_ENFORCEMENT`

O mesmo padrão de virada em duas etapas, aplicado à autorização de escrita.

`legacy` (default)
:   O diff é calculado contra o payload inteiro, **com os defaults do schema
    preenchidos**. Consequência: um usuário comum recebe `403` mesmo editando um
    parâmetro `user_editable`, porque os defaults entram no diff como se fossem
    alteração deliberada.

`explicit`
:   O diff considera só os campos que o cliente enviou de fato, e preserva os
    metadados já gravados. É o comportamento que se quer.

A promoção depende da adoção do cliente **0.4.3**, que passou a omitir
`user_editable` do payload quando o chamador não informa. O 0.4.2 envia
`user_editable=False` explicitamente — sob `explicit`, isso vira tentativa de
alterar metadado e volta a dar `403`.

## Rotas de autenticação

| Rota | Corpo | Devolve |
|---|---|---|
| `POST /auth/token` | `username` e `password` como **form** | O token do Keycloak |
| `POST /auth/refresh` | `refresh_token` como **form** | Token renovado |
| `GET /auth/userinfo` | — (token no header) | Dados do usuário autenticado |

Os dois primeiros usam `application/x-www-form-urlencoded`, não JSON.

## O que está congelado no OpenAPI

`tests/test_openapi_contrato.py` congela o `securitySchemes` e o bloco `security`
de cada rota. É o que transforma "o schema publicado não mudou" de argumento em
verificação. **Não apague esse teste ao mexer nas dependências de
autenticação** — ele é a única barreira automatizada que existe nessa área.

## Risco aberto

!!! danger "Segredos do Keycloak comprometidos"

    Um `client_secret` real esteve em `README.md` e outros sete em exports de
    realm versionados. Todos foram removidos da árvore de trabalho, mas
    **permanecem no histórico publicado** — apagar um arquivo não apaga o
    commit.

    Só a rotação no Keycloak encerra a exposição. Reescrever o histórico não é
    solução: o repositório já foi publicado, então `filter-repo` invalidaria
    todos os clones e não recuperaria nada.
