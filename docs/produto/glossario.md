# Glossário

Os termos abaixo têm significado preciso neste produto. Onde o uso comum é
diferente, isso está dito.

Aplicação (*app*)
:   A unidade de agrupamento de parâmetros. No MongoDB é um documento; na API é
    tudo que vem depois de `/parameters/apps/`. Identificada pelo nome, que é
    único. Não tem relação com "aplicação" no sentido de processo em execução —
    vários processos podem ler a mesma aplicação.

Parâmetro
:   Uma entrada nomeada dentro de uma aplicação. Tem `value`, `type` e um
    conjunto de metadados: `description`, `user_editable`, limites de tamanho e
    de valor, e a lista de referências permitidas.

Tipo de parâmetro (`ParamType`)
:   Um dos quinze valores do enum que decide qual validador roda sobre o
    `value`. Ver [Tipos de parâmetro](../api/tipos-de-parametro.md).

Envelope
:   A estrutura em que um valor sensível é gravado: `salt`, `master_key` e
    `crypto_data`. Nunca contém o valor em claro. Ver
    [Envelope criptográfico](../seguranca/envelope.md).

Chave de custódia
:   O segredo da aplicação a partir do qual se deriva a chave que protege a
    `master_key`. No servidor vem de `APP_CUSTODY_KEY`; no cliente, de
    `CHAVE_CUSTODIA_APP` ou `APP_CUSTODY_KEY`.

Multiton
:   O padrão do `ParamManager`: não é uma instância global única, e sim **uma
    instância por `instance_name`**. Duas instâncias com nomes diferentes têm
    configuração, cache e arquivo local independentes. A documentação antiga da
    biblioteca chama isso de *singleton* — está errada.

Instância (`instance_name`)
:   O nome que identifica uma configuração do cliente. Serve como chave do
    multiton, como prefixo das variáveis de ambiente e como nome do diretório e
    do arquivo do TinyDB.

Cache do parâmetro
:   Cache de granularidade fina, chaveado por `app:param`. É o primeiro degrau
    da resolução de leitura.

Cache global do app
:   Cache do mapa inteiro de parâmetros de uma aplicação, preenchido por
    `get_all_params`. É o segundo degrau: um acerto aqui promove o valor ao
    cache do parâmetro.

Circuit breaker (*cooldown*)
:   A janela em que o cliente para de tentar a rede depois de um erro. Armada
    por timeout, erro de conexão, 404 tratado ou qualquer falha inesperada;
    desarmada por uma requisição bem-sucedida ou por `clear_cache` explícito.

Fallback local
:   A leitura a partir do TinyDB quando a API não está disponível. Só devolve o
    que já foi lido com sucesso alguma vez.

`params_version`
:   Contador por aplicação usado para detectar escrita concorrente no servidor.
    **Não é histórico de versões** e não permite voltar a um estado anterior.

`READ_AUTH_MODE`
:   Configuração em runtime que decide se ler parâmetro exige token: `off`,
    `warn` ou `enforce`. Ver [Autenticação](../api/autenticacao.md).

`user_editable`
:   Marca de um parâmetro que autoriza usuário comum a alterar **apenas** o
    campo `value`. Qualquer alteração de metadado continua exigindo
    administrador.

Marcador `integracao`
:   Marca de pytest para o que fala com recurso real — Mongo de verdade no
    servidor, arquivo TinyDB de verdade no cliente. Existe porque os mocks
    mentem em pontos específicos e documentados.
