/* Independent, progressively enhanced game galleries. Links remain useful without JS. */
(function () {
  'use strict';
  function setup(selector, modalId, imageId, counterId, kind) {
    var openers = Array.from(document.querySelectorAll(selector));
    var modal = document.getElementById(modalId);
    var image = document.getElementById(imageId);
    if (!openers.length || !modal || !image) return;
    var index = 0;
    var previousFocus;
    var previousOverflow;
    var active = false;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', kind === 'screenshot' ? 'Screenshot viewer' : 'Community artwork viewer');
    modal.setAttribute('tabindex', '-1');
    var close = modal.querySelector('.lightbox-close');
    if (!close) {
      close = document.createElement('button');
      close.type = 'button';
      close.className = 'lightbox-close';
      close.setAttribute('aria-label', 'Close artwork viewer');
      close.textContent = '×';
      modal.appendChild(close);
    }
    function show() {
      var thumbnail = openers[index].querySelector('img');
      image.src = thumbnail.src;
      image.alt = thumbnail.alt;
      if (counterId) document.getElementById(counterId).textContent = (index + 1) + ' / ' + openers.length;
    }
    function cycle(direction) {
      index = (index + direction + openers.length) % openers.length;
      show();
    }
    function hide() {
      if (!active) return;
      active = false;
      modal.classList.remove('active');
      if (kind === 'art') modal.style.display = 'none';
      document.body.style.overflow = previousOverflow;
      if (previousFocus && previousFocus.isConnected) previousFocus.focus();
    }
    openers.forEach(function (opener, number) {
      opener.addEventListener('click', function (event) {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        previousFocus = opener;
        previousOverflow = document.body.style.overflow;
        index = number;
        show();
        active = true;
        modal.classList.add('active');
        if (kind === 'art') modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        close.focus();
      });
    });
    close.addEventListener('click', hide);
    modal.addEventListener('click', function (event) {
      if (event.target === modal || event.target.classList.contains('lightbox-backdrop')) hide();
    });
    var prev = modal.querySelector('.lightbox-prev');
    var next = modal.querySelector('.lightbox-next');
    if (prev) prev.addEventListener('click', function () { cycle(-1); });
    if (next) next.addEventListener('click', function () { cycle(1); });
    modal.addEventListener('keydown', function (event) {
      if (!active) return;
      if (event.key === 'Escape') { event.preventDefault(); hide(); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); cycle(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); cycle(1); }
      if (event.key === 'Tab') {
        var controls = Array.from(modal.querySelectorAll('button, [href], [tabindex="0"]'));
        var first = controls[0];
        var last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }
  setup('.game-screenshot-item', 'screenshotLightbox', 'lightboxImg', 'lightboxCounter', 'screenshot');
  setup('.gallery-image-link', 'lightbox', 'lightbox-img', null, 'art');
}());
