/*
 * Ações da página: "Salvar em PDF" abre a caixa de impressão do
 * navegador, que é quem gera o PDF. A folha @media print recorta a
 * navegação, então o arquivo sai só com o conteúdo.
 *
 * O listener é delegado no document porque o Material troca o conteúdo
 * sem recarregar a página quando a navegação instantânea está ligada;
 * ligar direto no botão perderia o vínculo na segunda página.
 */
document.addEventListener('click', function (evento) {
  var botao = evento.target.closest('[data-doc-print]');
  if (!botao) {
    return;
  }
  evento.preventDefault();
  window.print();
});
