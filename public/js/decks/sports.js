/* 運動牌組（32 種運動類型） */
window.DECKS = window.DECKS || {};

(function () {
  'use strict';

  var sports = [
    ['足球', '⚽'], ['籃球', '🏀'], ['棒球', '⚾'], ['壘球', '🥎'],
    ['網球', '🎾'], ['羽球', '🏸'], ['桌球', '🏓'], ['排球', '🏐'],
    ['手球', '🤾'], ['橄欖球', '🏉'], ['曲棍球', '🏑'], ['高爾夫', '⛳'],
    ['保齡球', '🎳'], ['撞球', '🎱'], ['射箭', '🏹'], ['擊劍', '🤺'],
    ['拳擊', '🥊'], ['柔道', '🥋'], ['跆拳道', '🥋'], ['摔角', '🤼'],
    ['空手道', '🥷'], ['游泳', '🏊'], ['跳水', '🤿'], ['水球', '🤽'],
    ['田徑', '🏃'], ['馬拉松', '🚴'], ['體操', '🤸'], ['滑雪', '⛷️'],
    ['滑冰', '⛸️'], ['冰球', '🏒'], ['攀岩', '🧗'], ['衝浪', '🏄']
  ];
  var colors = ['#DFF3FF', '#FFF1D6', '#FFE1E8', '#E3F6E8', '#F0E7FF', '#FFF7C7', '#FFE8D6', '#E4F7F4'];

  function icon(sport, index) {
    var color = colors[index % colors.length];
    return {
      id: 'sport' + (index + 1),
      label: sport[0],
      svg: '<rect x="5" y="5" width="90" height="90" rx="22" fill="' + color + '"/>' +
        '<ellipse cx="50" cy="78" rx="34" ry="8" fill="#5B4636" opacity="0.13"/>' +
        '<circle cx="50" cy="47" r="31" fill="#FFFFFF" opacity="0.5"/>' +
        '<text x="50" y="49" text-anchor="middle" dominant-baseline="central" font-size="51" ' +
        'font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">' + sport[1] + '</text>'
    };
  }

  window.DECKS.sports = {
    id: 'sports',
    name: '運動',
    icon: '🏅',
    bg: '#F3F8FF',
    icons: sports.map(icon)
  };
})();
