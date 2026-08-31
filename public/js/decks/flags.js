/* 各國國旗牌組：使用內建 SVG，牌面名稱由 game.js 顯示在旗幟下方。 */
window.DECKS = window.DECKS || {};

(function (w) {
  'use strict';

  var border = '<rect x="5" y="18" width="90" height="58" rx="5" fill="none" stroke="#5B4636" stroke-width="3"/>';
  var white = '#FFFDF8';

  function flag(background, details) {
    return '<rect x="5" y="18" width="90" height="58" rx="5" fill="' + background + '"/>' + details + border;
  }

  function horizontal(colors) {
    var h = 58 / colors.length;
    return colors.map(function (color, i) {
      return '<rect x="5" y="' + (18 + i * h) + '" width="90" height="' + h + '" fill="' + color + '"/>';
    }).join('');
  }

  function vertical(colors) {
    var width = 90 / colors.length;
    return colors.map(function (color, i) {
      return '<rect x="' + (5 + i * width) + '" y="18" width="' + width + '" height="58" fill="' + color + '"/>';
    }).join('');
  }

  function star(cx, cy, radius, color) {
    var points = [];
    for (var i = 0; i < 10; i++) {
      var angle = -Math.PI / 2 + i * Math.PI / 5;
      var r = i % 2 ? radius * .4 : radius;
      points.push((cx + Math.cos(angle) * r).toFixed(1) + ',' + (cy + Math.sin(angle) * r).toFixed(1));
    }
    return '<polygon points="' + points.join(' ') + '" fill="' + color + '"/>';
  }

  function sun(cx, cy, color) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="11" fill="' + color + '"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="#DE2910"/>';
  }

  function cross(background, crossColor, centerColor) {
    return flag(background,
      '<rect x="43" y="18" width="14" height="58" fill="' + crossColor + '"/>' +
      '<rect x="5" y="40" width="90" height="14" fill="' + crossColor + '"/>' +
      (centerColor ? '<rect x="47" y="18" width="6" height="58" fill="' + centerColor + '"/><rect x="5" y="44" width="90" height="6" fill="' + centerColor + '"/>' : ''));
  }

  w.DECKS.flags = {
    id: 'flags',
    name: '各國國旗',
    icon: '🏳️',
    bg: '#F1F7FF',
    icons: [
      { id: 'taiwan', label: '台灣', svg: flag('#DE2910', '<rect x="5" y="18" width="38" height="29" fill="#000095"/>' + star(24, 32, 12, white)) },
      { id: 'japan', label: '日本', svg: flag(white, '<circle cx="50" cy="47" r="18" fill="#BC002D"/>') },
      { id: 'south-korea', label: '韓國', svg: flag(white, '<path d="M50 29 A18 18 0 0 1 50 65 A9 9 0 0 0 50 47 A9 9 0 0 1 50 29Z" fill="#CD2E3A"/><path d="M50 47 A9 9 0 0 0 50 65 A18 18 0 0 0 50 29 A9 9 0 0 1 50 47Z" fill="#0047A0"/>' +
        '<path d="M22 31l12 5M20 36l12 5M78 59l-12-5M80 54l-12-5" stroke="#111" stroke-width="3"/>' +
        '<path d="M22 59l12-5M20 54l12-5M78 31l-12 5M80 36l-12 5" stroke="#111" stroke-width="3"/>') },
      { id: 'china', label: '中國', svg: flag('#DE2910', star(24, 33, 11, '#FFDE00') + star(43, 25, 3, '#FFDE00') + star(49, 34, 3, '#FFDE00') + star(47, 44, 3, '#FFDE00') + star(38, 51, 3, '#FFDE00')) },
      { id: 'mongolia', label: '蒙古', svg: flag('#C4272F', '<rect x="35" y="18" width="30" height="58" fill="#015197"/><circle cx="19" cy="47" r="10" fill="#FFD700"/><path d="M19 38v18M12 47h14" stroke="#C4272F" stroke-width="2"/><circle cx="19" cy="42" r="2" fill="#C4272F"/>') },
      { id: 'india', label: '印度', svg: flag(white, horizontal(['#FF9933', white, '#138808']) + '<circle cx="50" cy="47" r="10" fill="none" stroke="#000080" stroke-width="2"/><circle cx="50" cy="47" r="3" fill="#000080"/>' + '<path d="M50 37v20M40 47h20M43 40l14 14M57 40L43 54" stroke="#000080" stroke-width="1.5"/>') },
      { id: 'singapore', label: '新加坡', svg: flag(white, '<rect x="5" y="18" width="90" height="29" fill="#EF3340"/><circle cx="29" cy="32" r="10" fill="#FFF"/><circle cx="33" cy="30" r="9" fill="#EF3340"/>' + star(43, 25, 3, white) + star(47, 32, 3, white) + star(44, 40, 3, white)) },
      { id: 'thailand', label: '泰國', svg: flag('#A51931', horizontal(['#A51931', white, '#2D2A4A', '#2D2A4A', white, '#A51931'])) },
      { id: 'vietnam', label: '越南', svg: flag('#DA251D', star(50, 47, 18, '#FFCD00')) },
      { id: 'philippines', label: '菲律賓', svg: flag('#0038A8', '<rect x="5" y="47" width="90" height="29" fill="#CE1126"/><polygon points="5,18 5,76 58,47" fill="#FFF"/>' + sun(22, 47, '#FCD116') + star(12, 29, 4, '#FCD116') + star(12, 65, 4, '#FCD116') + star(64, 47, 4, '#FCD116')) },
      { id: 'indonesia', label: '印尼', svg: flag(white, horizontal(['#CE1126', white])) },
      { id: 'malaysia', label: '馬來西亞', svg: flag('#CC0001', horizontal(['#CC0001', white, '#CC0001', white, '#CC0001', white, '#CC0001', white, '#CC0001', white, '#CC0001', white, '#CC0001']) + '<rect x="5" y="18" width="42" height="29" fill="#010066"/><circle cx="25" cy="32" r="10" fill="#FFCC00"/><circle cx="30" cy="29" r="9" fill="#010066"/>' + star(38, 32, 6, '#FFCC00')) },
      { id: 'australia', label: '澳洲', svg: flag('#00008B', '<rect x="5" y="18" width="42" height="29" fill="#012169"/><path d="M5 18l42 29M47 18L5 47" stroke="#FFF" stroke-width="7"/><path d="M5 18l42 29M47 18L5 47" stroke="#C8102E" stroke-width="3"/>' + star(74, 57, 7, white) + star(82, 31, 4, white) + star(88, 47, 4, white) + star(72, 37, 4, white)) },
      { id: 'new-zealand', label: '紐西蘭', svg: flag('#00247D', '<rect x="5" y="18" width="42" height="29" fill="#012169"/><path d="M5 18l42 29M47 18L5 47" stroke="#FFF" stroke-width="7"/><path d="M5 18l42 29M47 18L5 47" stroke="#C8102E" stroke-width="3"/>' + star(70, 35, 5, '#CC142B') + star(82, 48, 5, '#CC142B') + star(74, 61, 5, '#CC142B')) },
      { id: 'united-states', label: '美國', svg: flag(white, horizontal(['#B22234', white, '#B22234', white, '#B22234', white, '#B22234', white, '#B22234', white, '#B22234', white, '#B22234']) + '<rect x="5" y="18" width="43" height="31" fill="#3C3B6E"/>' + star(14, 25, 2.5, white) + star(24, 25, 2.5, white) + star(34, 25, 2.5, white) + star(19, 34, 2.5, white) + star(29, 34, 2.5, white) + star(39, 34, 2.5, white) + star(14, 43, 2.5, white) + star(24, 43, 2.5, white) + star(34, 43, 2.5, white)) },
      { id: 'canada', label: '加拿大', svg: flag(white, '<rect x="5" y="18" width="25" height="58" fill="#D80621"/><rect x="70" y="18" width="25" height="58" fill="#D80621"/><path d="M50 27l4 10 9-5-4 10 9 4-11 3 2 12-9-7-9 7 2-12-11-3 9-4-4-10 9 5z" fill="#D80621"/>') },
      { id: 'mexico', label: '墨西哥', svg: flag(white, vertical(['#006847', white, '#CE1126']) + '<circle cx="50" cy="47" r="8" fill="#8C6B3E"/><path d="M44 50q6-14 12 0q-6 6-12 0z" fill="#2D7D46"/>') },
      { id: 'brazil', label: '巴西', svg: flag('#009B3A', '<polygon points="50,22 84,47 50,72 16,47" fill="#FFDF00"/><circle cx="50" cy="47" r="15" fill="#002776"/><path d="M37 43q13-8 26 1" fill="none" stroke="#FFF" stroke-width="3"/>') },
      { id: 'argentina', label: '阿根廷', svg: flag(white, horizontal(['#74ACDF', white, '#74ACDF']) + sun(50, 47, '#F6B40E')) },
      { id: 'united-kingdom', label: '英國', svg: cross('#012169', white, '#C8102E') },
      { id: 'france', label: '法國', svg: flag(white, vertical(['#0055A4', white, '#EF4135'])) },
      { id: 'germany', label: '德國', svg: flag(white, horizontal(['#000', '#DD0000', '#FFCE00'])) },
      { id: 'italy', label: '義大利', svg: flag(white, vertical(['#009246', white, '#CE2B37'])) },
      { id: 'spain', label: '西班牙', svg: flag('#FFC400', horizontal(['#AA151B', '#FFC400', '#AA151B']) + '<rect x="30" y="39" width="10" height="16" fill="#C60B1E"/>') },
      { id: 'portugal', label: '葡萄牙', svg: flag('#FF0000', '<rect x="5" y="18" width="36" height="58" fill="#046A38"/><circle cx="41" cy="47" r="12" fill="#FFCC29"/><circle cx="41" cy="47" r="7" fill="#DA291C"/>') },
      { id: 'netherlands', label: '荷蘭', svg: flag(white, horizontal(['#AE1C28', white, '#21468B'])) },
      { id: 'switzerland', label: '瑞士', svg: flag('#D52B1E', '<rect x="43" y="29" width="14" height="36" fill="#FFF"/><rect x="31" y="40" width="38" height="14" fill="#FFF"/>') },
      { id: 'sweden', label: '瑞典', svg: flag('#006AA7', '<rect x="29" y="18" width="11" height="58" fill="#FECC00"/><rect x="5" y="40" width="90" height="11" fill="#FECC00"/>') },
      { id: 'norway', label: '挪威', svg: flag('#BA0C2F', '<rect x="29" y="18" width="18" height="58" fill="#FFF"/><rect x="5" y="39" width="90" height="18" fill="#FFF"/><rect x="35" y="18" width="7" height="58" fill="#00205B"/><rect x="5" y="45" width="90" height="7" fill="#00205B"/>') },
      { id: 'finland', label: '芬蘭', svg: flag(white, '<rect x="29" y="18" width="13" height="58" fill="#003580"/><rect x="5" y="40" width="90" height="14" fill="#003580"/>') },
      { id: 'south-africa', label: '南非', svg: flag('#007A4D', '<path d="M5 18h90v58H5z" fill="#007A4D"/><path d="M5 18l42 29L5 76h22l40-29-40-29z" fill="#FFB81C"/><path d="M5 18l42 29L5 76h12l40-29-40-29z" fill="#FFF"/><path d="M5 18l42 29L5 76h9l40-29L14 18z" fill="#DE3831"/><path d="M5 18v58l42-29z" fill="#000"/><path d="M5 18v58l27-29z" fill="#FFB81C"/>') },
      { id: 'egypt', label: '埃及', svg: flag(white, horizontal(['#CE1126', white, '#000']) + '<circle cx="50" cy="47" r="8" fill="#C09300"/><path d="M44 43h12v8H44z" fill="#FFF"/>') }
    ]
  };
})(window);
