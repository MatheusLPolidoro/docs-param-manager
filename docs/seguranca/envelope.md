# Envelope criptográfico

Parâmetros dos tipos `secret`, `user` e `users` nunca são gravados em claro. Eles
são guardados num **envelope** de duas camadas.

!!! danger "Este formato é contrato congelado"

    O servidor cifra em `security/crypto_utils.py`; o cliente decifra em
    `ParamManager._descriptografar_param`. São **duas implementações
    duplicadas, em repositórios liberados em datas diferentes**.

    Mudar um lado sozinho falha em silêncio: o cliente apenas registra um erro
    no log e devolve `None`. Não há exceção, não há alarme, e o valor
    simplesmente vira `None` na aplicação de quem consome.

## O formato

```json
{
  "salt": "<hex>",
  "master_key":  { "iv": "<hex>", "tag": "<hex>", "data": "<hex>" },
  "crypto_data": { "iv": "<hex>", "tag": "<hex>", "data": "<hex>" }
}
```

Duas camadas:

1. Uma **chave de custódia**, derivada do segredo da aplicação, protege a
   `master_key`.
2. A `master_key` protege o dado real, em `crypto_data`.

## Os parâmetros congelados

Mudar qualquer um destes invalida **todo segredo já gravado** e **todo cliente já
publicado no PyPI**:

| Item | Valor |
|---|---|
| Derivação | `PBKDF2(custody_key, salt, dkLen=32, count=100_000, hmac_hash_module=SHA256)` |
| Cifra | AES-GCM |
| IV | 12 bytes, aleatório |
| Autenticação | `tag` do GCM |
| Serialização | Tudo em hexadecimal |

## A chave de custódia

| Lado | Variável | Default |
|---|---|---|
| Servidor | `APP_CUSTODY_KEY`, via `settings` | `dev-chave-custodia-app` |
| Cliente | `CHAVE_CUSTODIA_APP` **ou** `APP_CUSTODY_KEY` | *(nenhum)* |

!!! warning "O default de desenvolvimento não é segredo"

    `dev-chave-custodia-app` está no código-fonte público. Um ambiente que suba
    sem trocar `APP_CUSTODY_KEY` tem os segredos cifrados com uma chave que
    qualquer pessoa conhece — o que é equivalente a não cifrar.

## A tolerância legada

O parser do cliente aceita a chave `dado` como sinônimo de `data`, herança de um
formato anterior.

**Mantenha esse fallback** ao mexer no parser. Removê-lo quebra qualquer valor
gravado antes da renomeação, que continua no banco e não tem migração.

## O round-trip

O envelope volta ao servidor sempre que um cliente lê e regrava um parâmetro. Por
isso os validadores aceitam as duas formas:

- `secret` aceita `str` (valor em claro entrando) **ou** `dict` (envelope
  voltando). No caso do `dict`, confere que `salt`, `master_key` e `crypto_data`
  estão todos presentes.
- No tipo `user`, o campo `password` aceita `str` **ou** `dict` pelo mesmo
  motivo.

Rejeitar o `dict` pareceria mais rigoroso e quebraria a ida e volta.

## Onde o TLS entra

O valor em claro **viaja pela rede** na gravação: quem cifra é o servidor, não o
cliente. Sem HTTPS, o segredo está exposto no caminho, e o envelope protege
apenas o que está em repouso no banco.

Some a isso o escopo parcial do `verify_ssl` no cliente — que governa só as
leituras — e a conclusão prática é uma só: **use HTTPS com cadeia válida**. Ver
[Configuração do cliente](../cliente/configuracao.md#verify_ssl-tem-escopo-parcial).

## Limitação conhecida e deliberada

No ramo `users` do `AppService._encrypt_value`, **um único salt e uma única
`master_key` servem a todos os usuários do parâmetro**, e o mesmo dicionário
`encrypted_master_key` é apontado por todos os envelopes.

Isto é sabido e está fora de escopo por decisão explícita: existe um desenho em
andamento para granularidade mais fina, com **uma master key por parâmetro**.
Não "corrija" isso pontualmente — a mudança precisa ser desenhada inteira, junto
com a migração dos dados já gravados.

## Auditoria já aplicada

O módulo `security/crypto_utils.py` passou por revisão dedicada e as correções
foram aplicadas: saíram o salt em nível de módulo, o `config.json` que era
escrito no diretório de trabalho, e o par morto `store_credentials` /
`recover_password` que os usava.

## Se a decifragem falhar

O sintoma é sempre o mesmo — `None` no lugar do valor, e um erro no log. As
causas prováveis, em ordem:

1. Chave de custódia diferente entre cliente e servidor.
2. Envelope incompleto, por gravação feita à mão fora da API.
3. Versões de cliente e servidor com implementações divergentes do envelope — o
   que só acontece se o contrato tiver sido mudado de um lado só.

Comece pela primeira: é de longe a mais comum.
