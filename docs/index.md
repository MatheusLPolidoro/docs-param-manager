# Param Manager

<div class="pm-heroi" markdown>
<div class="pm-marca" data-pm-logo markdown>
<div class="pm-marca__cartaz" markdown>
<!-- Sintaxe Markdown, e não <img>: o mkdocs reescreve o caminho relativo
     de imagem em Markdown para cada página, e o build em inglês fica em
     /en/. Um src fixo em HTML apontaria para /en/assets/, que não existe
     — os assets ficam só na raiz do site.

     Este é o cartaz: o quadro final da animação, parado. É o que aparece
     enquanto os 17 MB do desenho não chegam — sem ele a área ficaria
     vazia e o texto saltaria de lugar na hora em que chegassem — e é o
     que fica para sempre para quem pediu menos movimento ao sistema. -->
![Marca do Param Manager: o logotipo por extenso](assets/marca-animada.svg)
</div>
<svg id="LogoAnimation" class="pm-marca__tela" viewBox="219 280 1482 519" aria-hidden="true" hidden></svg>
</div>
<div class="pm-heroi__texto" markdown>

## Parâmetros centralizados, com segredo cifrado e leitura que não cai

O Param Manager tira a configuração de dentro do `.env` de cada máquina e a
coloca num único lugar, versionado e auditável — sem que a aplicação passe a
depender de a rede estar de pé no instante da leitura.

<div class="pm-selos" markdown>
<!-- Selos servidos pelo img.shields.io. São a única coisa neste site que
     depende de rede externa para *aparecer*: sem internet o navegador mostra o
     texto alternativo de cada um, que diz a mesma coisa em palavras.

     O selo de versões suportadas é estático, e não o `pypi/pyversions` que o
     site do `param-manager` usa, por dois motivos. Lá ele aponta para o
     `fastapi` — herança de um copiar e colar, então mostra as versões de outro
     pacote. E apontá-lo para o `param-manager` sai pior ainda: o pacote
     publicado não declara classificadores de versão, e o selo renderiza a
     palavra "missing". O piso e o teto vêm do `requires-python` da lib
     (`>=3.10,<=3.14`); mexeu ali, mexa aqui. -->
[![PyPI - Version](https://img.shields.io/pypi/v/param-manager)](https://pypi.org/project/param-manager/)
![Python](https://img.shields.io/badge/language-Python-blue?logo=python)
![Cobertura de Testes](https://img.shields.io/badge/cobertura-90%25-brightgreen?logo=pytest)
[![Supported Python versions](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12%20%7C%203.13%20%7C%203.14-34D058?logo=python&logoColor=white)](https://pypi.org/project/param-manager/)
</div>

</div>
</div>

O produto são **dois artefatos entregues separadamente** e um contrato entre
eles:

<ul class="pm-cartoes">
<li><a class="pm-cartao" href="api/">
  <span class="pm-cartao__titulo">fast-param-manager — a API</span>
  <span class="pm-cartao__desc">Servidor FastAPI sobre MongoDB, autenticado por Keycloak. Guarda os parâmetros, valida o tipo de cada um, cifra os sensíveis e decide quem pode escrever o quê.</span>
</a></li>
<li><a class="pm-cartao" href="cliente/">
  <span class="pm-cartao__titulo">param-manager — o cliente</span>
  <span class="pm-cartao__desc">Biblioteca Python publicada no PyPI. Lê os parâmetros, mantém cache em memória, decifra os segredos e continua respondendo com dado local quando a API não responde.</span>
</a></li>
<li><a class="pm-cartao" href="seguranca/envelope/">
  <span class="pm-cartao__titulo">O envelope criptográfico</span>
  <span class="pm-cartao__desc">O formato em que um segredo é gravado. É contrato congelado: os dois lados implementam a mesma coisa em repositórios que são liberados em datas diferentes.</span>
</a></li>
</ul>

## Por onde começar

| Se você quer… | Vá para |
|---|---|
| Entender o produto antes do código | [Visão geral](produto/visao-geral.md) |
| Ver como uma requisição atravessa o sistema | [Arquitetura](produto/arquitetura.md) |
| Subir a API na sua máquina | [Instalação e execução](api/instalacao.md) |
| Consumir os parâmetros de uma aplicação Python | [Uso do cliente](cliente/uso.md) |
| Saber o que pode quebrar quem já está em produção | [Compatibilidade](produto/compatibilidade.md) |
| Guardar senha ou credencial num parâmetro | [Envelope criptográfico](seguranca/envelope.md) |

## O que esta documentação assume

Que você vai ler o código quando a resposta importar de verdade. Todas as
páginas aqui foram escritas conferindo a implementação, e onde o comportamento
é surpreendente isso está dito na página em vez de escondido. Quando houver
divergência entre o que está escrito aqui e o que o código faz, **o código está
certo** — e a página está com defeito, o que é um problema a ser reportado.

!!! note "Cada página pode ser levada embora"

    O botão **Baixar .md** entrega o arquivo Markdown original, exatamente como
    está no repositório. O **Salvar em PDF** abre a caixa de impressão do
    navegador com uma folha de estilo que remove a navegação — o que sai é só o
    conteúdo. Os dois estão na barra superior de toda página, junto do seletor
    de fonte, e a documentação inteira existe em português e inglês.
