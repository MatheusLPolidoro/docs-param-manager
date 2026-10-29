# Param Manager

<div class="pm-heroi" markdown>
<div class="pm-marca" data-pm-logo markdown>
<div class="pm-marca__cartaz" markdown>
<!-- Markdown syntax rather than <img>: mkdocs rewrites relative image
     paths in Markdown per page, and the English build lives under /en/.
     A hard-coded HTML src would point at /en/assets/, which does not
     exist — assets live only at the site root.

     This is the poster: the finished frame of the animation, still. It is
     what shows while the drawing's 17 MB have not arrived — without it the
     area would sit empty and the text would jump when they did — and what
     stays for good for anyone who asked the system for less motion. -->
![Param Manager wordmark](assets/marca-animada.svg)
</div>
<svg id="LogoAnimation" class="pm-marca__tela" viewBox="219 280 1482 519" aria-hidden="true" hidden></svg>
</div>
<div class="pm-heroi__texto" markdown>

## Centralized parameters, encrypted secrets, and reads that don't go down

Param Manager takes configuration out of the `.env` file on every machine and
puts it in one versioned, auditable place — without making your application
depend on the network being up at the moment it reads.

<div class="pm-selos" markdown>
<!-- Badges served by img.shields.io. They are the only thing on this site that
     depends on the outside network to *appear*: with no internet the browser
     shows each one's alternative text, which says the same thing in words.

     The supported-versions badge is static rather than the `pypi/pyversions`
     one the `param-manager` site uses, for two reasons. There it points at
     `fastapi` — left over from a copy and paste, so it shows another package's
     versions. And pointing it at `param-manager` is worse still: the published
     package declares no version classifiers, so the badge renders the word
     "missing". The floor and ceiling come from the library's `requires-python`
     (`>=3.10`, no ceiling); change that, change this. -->
[![PyPI - Version](https://img.shields.io/pypi/v/param-manager)](https://pypi.org/project/param-manager/)
![Python](https://img.shields.io/badge/language-Python-blue?logo=python)
![Test coverage](https://img.shields.io/badge/coverage-90%25-brightgreen?logo=pytest)
[![Supported Python versions](https://img.shields.io/badge/python-3.10%2B-34D058?logo=python&logoColor=white)](https://pypi.org/project/param-manager/)
</div>

</div>
</div>

The product is **two artifacts shipped separately** and a contract between them:

<ul class="pm-cartoes">
<li><a class="pm-cartao" href="api/">
  <span class="pm-cartao__titulo">fast-param-manager — the API</span>
  <span class="pm-cartao__desc">A FastAPI server on MongoDB, authenticated through Keycloak. It stores parameters, validates each one's type, encrypts the sensitive ones and decides who may write what.</span>
</a></li>
<li><a class="pm-cartao" href="cliente/">
  <span class="pm-cartao__titulo">param-manager — the client</span>
  <span class="pm-cartao__desc">A Python library published on PyPI. It reads parameters, keeps an in-memory cache, decrypts secrets and keeps answering from local data when the API does not respond.</span>
</a></li>
<li><a class="pm-cartao" href="seguranca/envelope/">
  <span class="pm-cartao__titulo">The cryptographic envelope</span>
  <span class="pm-cartao__desc">The format a secret is stored in. It is a frozen contract: both sides implement the same thing, in repositories released on different dates.</span>
</a></li>
</ul>

## Where to start

| If you want to… | Go to |
|---|---|
| Understand the product before the code | [Overview](produto/visao-geral.md) |
| See how a request crosses the system | [Architecture](produto/arquitetura.md) |
| Run the API on your machine | [Install and run](api/instalacao.md) |
| Consume parameters from a Python application | [Client usage](cliente/uso.md) |
| Know what can break whoever is already in production | [Compatibility](produto/compatibilidade.md) |
| Store a password or credential in a parameter | [Cryptographic envelope](seguranca/envelope.md) |

## What this documentation assumes

That you will read the code when the answer really matters. Every page here was
written against the implementation, and where the behaviour is surprising that
is stated on the page rather than hidden. When this site and the code disagree,
**the code is right** — and the page has a defect, which is worth reporting.

!!! note "Every page can be taken with you"

    The **Download .md** button hands you the original Markdown file, exactly as
    it sits in the repository. **Save as PDF** opens the browser print dialog
    with a stylesheet that strips the navigation — what comes out is the content
    alone. Both sit in the top bar of every page, next to the font selector, and
    the whole documentation exists in Portuguese and English.
