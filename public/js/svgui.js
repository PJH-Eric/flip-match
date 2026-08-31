/* ===== svgui.js — 立體 SVG 按鈕、標題、牌背、背景裝飾 ===== */
(function (w) {
  'use strict';
  var INK = '#5B4636';

  var PALETTE = {
    pink:  ['#FFB5C5', '#E0879D'],
    mint:  ['#A8E6CF', '#76C3A5'],
    sky:   ['#A8D8F0', '#76B2D2'],
    lemon: ['#FFE08A', '#E2BA55'],
    lilac: ['#D5C2F0', '#AC96D6'],
    cream: ['#FFEFD8', '#E3CAA5'],
    gray:  ['#E8E2DA', '#C8BEB2']
  };

  /* ---- 立體按鈕：依元素實際尺寸即時產生 SVG 背景（不會被拉扁） ---- */
  function paint(el) {
    var wpx = el.offsetWidth, hpx = el.offsetHeight;
    if (!wpx || !hpx) return;
    var cs = getComputedStyle(el);
    var d = parseFloat(cs.getPropertyValue('--d')) || 8;
    var key = el.getAttribute('data-color') || 'cream';
    var c = PALETTE[key] || PALETTE.cream;
    var faceH = hpx - d - 4;
    if (faceH < 10) return;
    var r = Math.min(22, faceH / 2.2);
    var svg = el.querySelector('.b3-svg');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'b3-svg');
      el.insertBefore(svg, el.firstChild);
    }
    svg.setAttribute('viewBox', '0 0 ' + wpx + ' ' + hpx);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML =
      '<rect x="2" y="' + (2 + d) + '" width="' + (wpx - 4) + '" height="' + faceH + '" rx="' + r + '" fill="' + c[1] + '" stroke="' + INK + '" stroke-width="3"/>' +
      '<g class="b3-face">' +
      '<rect x="2" y="2" width="' + (wpx - 4) + '" height="' + faceH + '" rx="' + r + '" fill="' + c[0] + '" stroke="' + INK + '" stroke-width="3"/>' +
      '<rect x="' + (r * 0.55 + 4) + '" y="7" width="' + Math.max(4, wpx - 8 - r * 1.1) + '" height="' + Math.max(4, faceH * 0.38) + '" rx="' + (r * 0.55) + '" fill="#FFFFFF" opacity="0.42"/>' +
      '</g>';
  }

  var ro = w.ResizeObserver ? new ResizeObserver(function (list) {
    for (var i = 0; i < list.length; i++) paint(list[i].target);
  }) : null;

  function decorate(el) {
    if (el.dataset.b3) return;
    el.dataset.b3 = '1';
    var lbl = document.createElement('span');
    lbl.className = 'b3-lbl';
    lbl.innerHTML = el.innerHTML;
    el.innerHTML = '';
    el.appendChild(lbl);
    paint(el);
    if (ro) ro.observe(el); else w.addEventListener('resize', function () { paint(el); });

    var press = function () { if (!el.disabled) el.classList.add('press'); };
    var release = function () { el.classList.remove('press'); };
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointerleave', release);
    el.addEventListener('pointercancel', release);
  }

  function decorateAll(root) {
    var list = (root || document).querySelectorAll('.btn3d');
    for (var i = 0; i < list.length; i++) decorate(list[i]);
  }

  function setLabel(el, html) {
    var lbl = el.querySelector('.b3-lbl');
    if (lbl) lbl.innerHTML = html; else el.innerHTML = html;
  }
  function setColor(el, key) {
    el.setAttribute('data-color', key);
    paint(el);
  }

  /* ---- 牌背圖樣 ---- */
  function cardBack() {
    return '<svg viewBox="0 0 100 140" preserveAspectRatio="none">' +
      '<rect x="0" y="0" width="100" height="140" fill="#FFB5C5"/>' +
      '<rect x="9" y="9" width="82" height="122" rx="12" fill="#FF9FB4" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="7 6" opacity="0.9"/>' +
      '<circle cx="50" cy="70" r="26" fill="#FFE3EA"/>' +
      '<path d="M50 84 C30 70 34 52 44 52 C49 52 50 57 50 57 C50 57 51 52 56 52 C66 52 70 70 50 84 Z" fill="#FF7FA0"/>' +
      '<circle cx="24" cy="26" r="5" fill="#FFE3EA" opacity="0.85"/>' +
      '<circle cx="76" cy="26" r="5" fill="#FFE3EA" opacity="0.85"/>' +
      '<circle cx="24" cy="114" r="5" fill="#FFE3EA" opacity="0.85"/>' +
      '<circle cx="76" cy="114" r="5" fill="#FFE3EA" opacity="0.85"/>' +
      '</svg>';
  }

  /* ---- 標題 LOGO ---- */
  function logo() {
    return '<svg viewBox="0 0 540 190">' +
      '<g transform="translate(14 42) rotate(-13)">' +
        '<rect x="0" y="0" width="72" height="98" rx="14" fill="#A8D8F0" stroke="#5B4636" stroke-width="5"/>' +
        '<circle cx="26" cy="42" r="6" fill="#5B4636"/><circle cx="50" cy="42" r="6" fill="#5B4636"/>' +
        '<path d="M26 62 Q38 74 50 62" fill="none" stroke="#5B4636" stroke-width="5" stroke-linecap="round"/>' +
        '<ellipse cx="16" cy="56" rx="7" ry="4.5" fill="#FFAFC5" opacity="0.8"/>' +
        '<ellipse cx="60" cy="56" rx="7" ry="4.5" fill="#FFAFC5" opacity="0.8"/>' +
      '</g>' +
      '<g transform="translate(452 40) rotate(12)">' +
        '<rect x="0" y="0" width="72" height="98" rx="14" fill="#FFE08A" stroke="#5B4636" stroke-width="5"/>' +
        '<circle cx="24" cy="44" r="6" fill="#5B4636"/><circle cx="48" cy="44" r="6" fill="#5B4636"/>' +
        '<path d="M24 64 Q36 76 48 64" fill="none" stroke="#5B4636" stroke-width="5" stroke-linecap="round"/>' +
        '<ellipse cx="14" cy="58" rx="7" ry="4.5" fill="#FFAFC5" opacity="0.8"/>' +
        '<ellipse cx="58" cy="58" rx="7" ry="4.5" fill="#FFAFC5" opacity="0.8"/>' +
      '</g>' +
      '<text x="270" y="84" text-anchor="middle" font-size="56" font-weight="900" letter-spacing="4" ' +
        'style="paint-order:stroke;stroke:#5B4636;stroke-width:14px;stroke-linejoin:round" fill="#FFB5C5" ' +
        'font-family="Yuanti TC, PingFang TC, Microsoft JhengHei, Noto Sans TC, sans-serif">翻牌配對碰</text>' +
      '<text x="270" y="84" text-anchor="middle" font-size="56" font-weight="900" letter-spacing="4" fill="#FFF6C9" ' +
        'font-family="Yuanti TC, PingFang TC, Microsoft JhengHei, Noto Sans TC, sans-serif">翻牌配對碰</text>' +
      '<text x="270" y="126" text-anchor="middle" font-size="21" font-weight="800" letter-spacing="8" fill="#8A7261" ' +
        'font-family="Yuanti TC, PingFang TC, Microsoft JhengHei, Noto Sans TC, sans-serif">記憶力大挑戰</text>' +
      '<path d="M150 150 h240" stroke="#FFB5C5" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.7"/>' +
      '</svg>';
  }

  /* ---- 背景漂浮裝飾 ---- */
  function bgDeco(host) {
    var cols = ['#FFC9D8', '#BFE9DA', '#BFDDF2', '#FFE9AE', '#E0D2F5'];
    var html = '';
    for (var i = 0; i < 16; i++) {
      var s = 26 + Math.random() * 78;
      html += '<span style="width:' + s.toFixed(0) + 'px;height:' + s.toFixed(0) + 'px;left:' +
        (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) + '%;background:' +
        cols[i % cols.length] + ';animation-duration:' + (6 + Math.random() * 7).toFixed(1) +
        's;animation-delay:-' + (Math.random() * 6).toFixed(1) + 's;opacity:' + (0.18 + Math.random() * 0.22).toFixed(2) + '"></span>';
    }
    host.innerHTML = html;
  }

  w.UI = {
    decorate: decorate, decorateAll: decorateAll, paint: paint,
    setLabel: setLabel, setColor: setColor,
    cardBack: cardBack, logo: logo, bgDeco: bgDeco, PALETTE: PALETTE
  };
})(window);
