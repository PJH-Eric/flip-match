/* 注音符號牌組：完整收錄 37 個常用注音符號，以彩色 SVG 呈現。 */
window.DECKS = window.DECKS || {};

(function (w) {
  'use strict';

  var symbols = [
    'ㄅ', 'ㄆ', 'ㄇ', 'ㄈ', 'ㄉ', 'ㄊ', 'ㄋ', 'ㄌ', 'ㄍ', 'ㄎ', 'ㄏ',
    'ㄐ', 'ㄑ', 'ㄒ', 'ㄓ', 'ㄔ', 'ㄕ', 'ㄖ', 'ㄗ', 'ㄘ', 'ㄙ',
    'ㄚ', 'ㄛ', 'ㄜ', 'ㄝ', 'ㄞ', 'ㄟ', 'ㄠ', 'ㄡ', 'ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ', 'ㄧ', 'ㄨ', 'ㄩ'
  ];
  var colors = [
    ['#FF8FAB', '#D85B7A'], ['#7DD3C7', '#45A99C'], ['#8FB9FF', '#527FCB'],
    ['#FFD166', '#D6A528'], ['#C6A0FF', '#8F6CC9'], ['#FFAA7A', '#D5794B']
  ];

  function icon(symbol, index) {
    var color = colors[index % colors.length];
    return {
      id: 'phonetic-' + index,
      label: symbol,
      svg: '<rect x="9" y="15" width="82" height="74" rx="18" fill="' + color[1] + '"/>' +
        '<rect x="9" y="9" width="82" height="74" rx="18" fill="' + color[0] + '"/>' +
        '<rect x="17" y="16" width="66" height="25" rx="12" fill="#FFFFFF" opacity="0.34"/>' +
        '<circle cx="22" cy="72" r="4" fill="#FFFFFF" opacity="0.55"/><circle cx="78" cy="72" r="4" fill="#FFFFFF" opacity="0.55"/>' +
        '<text x="50" y="51" text-anchor="middle" dominant-baseline="central" font-size="50" font-weight="900" ' +
        'font-family="Noto Sans TC, Microsoft JhengHei, Arial, sans-serif" style="paint-order:stroke;stroke:#5B4636;stroke-width:7px;stroke-linejoin:round" fill="#FFFFFF">' + symbol + '</text>'
    };
  }

  w.DECKS.phonetics = {
    id: 'phonetics',
    name: '注音符號',
    icon: 'ㄅ',
    bg: '#FFF3E8',
    icons: symbols.map(icon)
  };
})(window);
