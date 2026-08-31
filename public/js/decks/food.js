/* 食物牌組（32 種日常食物） */
window.DECKS = window.DECKS || {};

(function () {
  'use strict';

  var foods = [
    ['漢堡', '🍔'], ['披薩', '🍕'], ['壽司', '🍣'], ['飯糰', '🍙'],
    ['拉麵', '🍜'], ['墨西哥捲', '🌯'], ['三明治', '🥪'], ['熱狗', '🌭'],
    ['薯條', '🍟'], ['牛排', '🥩'], ['烤雞', '🍗'], ['荷包蛋', '🍳'],
    ['起司', '🧀'], ['吐司', '🍞'], ['可頌', '🥐'], ['水餃', '🥟'],
    ['熱湯', '🥣'], ['沙拉', '🥗'], ['咖哩飯', '🍛'], ['便當', '🍱'],
    ['爆米花', '🍿'], ['蛋糕', '🍰'], ['杯子蛋糕', '🧁'], ['甜甜圈', '🍩'],
    ['餅乾', '🍪'], ['巧克力', '🍫'], ['糖果', '🍬'], ['冰淇淋', '🍦'],
    ['刨冰', '🍧'], ['咖啡', '☕'], ['牛奶', '🥛'], ['果汁', '🧃']
  ];
  var colors = ['#FFF1D6', '#FFE1E8', '#E3F6E8', '#DFF3FF', '#F0E7FF', '#FFF7C7', '#FFE8D6', '#E4F7F4'];

  function icon(food, index) {
    var label = food[0];
    var emoji = food[1];
    var bg = colors[index % colors.length];
    return {
      id: 'food' + (index + 1),
      label: label,
      svg: '<rect x="5" y="5" width="90" height="90" rx="22" fill="' + bg + '"/>' +
        '<ellipse cx="50" cy="76" rx="34" ry="9" fill="#5B4636" opacity="0.13"/>' +
        '<text x="50" y="49" text-anchor="middle" dominant-baseline="central" font-size="53" ' +
        'font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">' + emoji + '</text>' +
        '<rect x="18" y="82" width="64" height="10" rx="5" fill="#FFFFFF" opacity="0.72"/>' +
        '<text x="50" y="87" text-anchor="middle" dominant-baseline="central" font-size="7.5" ' +
        'font-weight="800" font-family="Yuanti TC, PingFang TC, Microsoft JhengHei, sans-serif" fill="#5B4636">' + label + '</text>'
    };
  }

  window.DECKS.food = {
    id: 'food',
    name: '食物',
    icon: '🍱',
    bg: '#FFFDF7',
    icons: foods.map(icon)
  };
})();
