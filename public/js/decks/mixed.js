/* 混合所有牌組，保留固定順序供線上玩家共用索引。 */
(function (w) {
  var ids = ['animals', 'vehicles', 'fruits', 'characters', 'stationery', 'food', 'flags', 'numbers', 'phonetics', 'sports'];
  var icons = [], seen = Object.create(null);
  ids.forEach(function (id) {
    w.DECKS[id].icons.forEach(function (icon) {
      if (seen[icon.svg]) return;
      seen[icon.svg] = true;
      icons.push(icon);
    });
  });
  w.DECKS.mixed = { id: 'mixed', name: '混合', bg: '#fff', icons: icons };
})(window);
