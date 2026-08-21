# Visão geral

## O problema

Configuração espalhada em arquivo `.env` por máquina tem três defeitos que só
aparecem quando o sistema cresce: ninguém sabe qual é o valor corrente em
produção, mudar um valor exige um deploy, e senha em texto puro acaba em backup,
em log e no histórico do git.

Centralizar num serviço resolve os três — e cria um quarto: agora a aplicação
não sobe se o serviço de configuração estiver fora. O Param Manager é desenhado
em torno dessa troca. **O cliente nunca depende de a API estar de pé no instante
da leitura.**

## Os dois artefatos

| | `fast-param-manager` | `param-manager` |
|---|---|---|
| O que é | API HTTP | Biblioteca Python |
| Onde roda | Servidor, em contêiner | Dentro da sua aplicação |
| Distribuição | Imagem / deploy próprio | PyPI — `pip install param-manager` |
| Guarda o quê | MongoDB | TinyDB local, como cópia de sobrevivência |
| Versão | `2.0.0` | `0.4.3` |

Eles são **versionados e liberados de forma independente**. Não existe deploy
atômico dos dois: sempre há uma janela em que um cliente antigo conversa com um
servidor novo. Essa é a restrição que mais molda o desenho do produto, e ela tem
página própria — [Compatibilidade](compatibilidade.md).

Há ainda um terceiro diretório planejado, `front-param-manager`, hoje **vazio**.
Nenhuma linha de código existe, e nada nesta documentação depende dele.

## O que a API faz

- **Guarda parâmetros agrupados por aplicação.** Uma aplicação é um documento no
  Mongo; os parâmetros são um mapa dentro dele.
- **Valida o tipo de cada valor.** São quinze tipos, de `string` a `users`, cada
  um com um validador próprio — inclusive regex compilável, data em formato
  fixo e referência a outro parâmetro que precisa existir.
- **Cifra o que é sensível.** Os tipos `secret`, `user` e `users` nunca são
  gravados em claro.
- **Decide quem escreve o quê.** Administrador faz tudo; usuário comum só
  altera o campo `value` de parâmetros marcados como editáveis.
- **Conta a própria operação.** Todo controller, service e repository abre um
  span do OpenTelemetry e grava métricas.

## O que o cliente faz

- **Resolve um parâmetro pela cadeia mais barata primeiro:** cache do parâmetro,
  cache da aplicação, e só então a rede.
- **Para de bater num servidor doente.** Erro de rede ou HTTP arma um
  *circuit breaker* com janela configurável.
- **Sobrevive à API fora do ar.** Todo parâmetro lido com sucesso é gravado num
  TinyDB local, que vira a fonte quando a rede falha.
- **Decifra os segredos** com a chave de custódia da aplicação, sem que o
  chamador precise saber que havia criptografia no caminho.
- **Isola instâncias.** `ParamManager` é um *multiton*: uma instância por nome,
  cada uma com sua configuração, seu cache e seu arquivo local.

## O que o produto deliberadamente não faz

Vale saber o que **não** procurar aqui:

- **Não negocia versão de cliente.** O servidor não sabe com quem está falando e
  não muda de comportamento por causa disso.
- **Não distribui mudança em tempo real.** Não há *push*, *websocket* nem
  invalidação remota de cache. Um valor alterado chega ao cliente quando o cache
  dele expira.
- **Não protege leitura por padrão.** De fábrica, ler parâmetro é anônimo. Isso
  é configurável em runtime, e a página de
  [autenticação](../api/autenticacao.md) explica por que o default é esse e como
  sair dele com segurança.
- **Não versiona o valor de um parâmetro.** Existe um contador de versão por
  aplicação, usado para detectar escrita concorrente — não é histórico, e não dá
  para voltar atrás.
