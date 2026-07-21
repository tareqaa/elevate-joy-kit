/* ============================================================
   FAQ PAGE — wires the accordion open/close behavior for the
   Q&A section (content itself is static HTML on the page).
   ============================================================ */

function initFaqPage(){
  document.querySelectorAll('.faq-accordion .fhead').forEach(head => {
    head.addEventListener('click', () => head.parentElement.classList.toggle('open'));
  });
}

document.addEventListener('DOMContentLoaded', initFaqPage);
