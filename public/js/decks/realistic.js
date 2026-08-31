/* 百科式牌面圖示：使用專案內建的 Noto Emoji SVG，避免遊戲執行時依賴外部網路。 */
(function (w) {
  'use strict';

  // 依牌面 id 對應圖示，避免新增牌面或調整順序時整組圖示錯位。
  // 「-」代表沒有語意精準的 Noto Emoji，沿用牌組內獨立的 SVG 圖示。
  var assetsById = {
    animals: {
      cat: '1f408', dog: '1f415', rabbit: '1f407', bear: '1f43b', panda: '1f43c', fox: '1f98a',
      pig: '1f416', cow: '1f404', sheep: '1f411', monkey: '1f412', lion: '1f981', tiger: '1f42f',
      elephant: '1f418', giraffe: '1f992', zebra: '1f993', hippo: '1f99b', koala: '1f428', deer: '1f98c',
      squirrel: '1f43f', hedgehog: '1f994', frog: '1f438', penguin: '1f427', owl: '1f989', chick: '1f423',
      duck: '1f986', whale: '1f40b', dolphin: '1f42c', octopus: '1f419', crab: '1f980', turtle: '1f422',
      snail: '1f40c', bee: '1f41d'
    },
    vehicles: {
      car: '1f697', taxi: '1f695', bus: '1f68c', schoolbus: '-', truck: '1f69a', van: '-',
      police: '1f693', firetruck: '1f692', ambulance: '1f691', tractor: '1f69c', excavator: '-', crane: '-',
      cementmixer: '-', garbagetruck: '-', bicycle: '-', motorbike: '1f3cd', scooter: '1f6f5', skateboard: '1f6f9',
      train: '1f686', steamtrain: '1f682', tram: '1f68a', subway: '1f687', hsr: '1f684', airplane: '2708',
      helicopter: '1f681', rocket: '1f680', ufo: '1f6f8', balloon: '1f388', sailboat: '26f5', ship: '1f6a2',
      submarine: '-', cablecar: '1f6a0'
    },
    fruits: {
      apple: '1f34e', pear: '1f350', banana: '1f34c', orange: '1f34a', grape: '1f347', strawberry: '1f353',
      watermelon: '1f349', peach: '1f351', cherry: '1f352', pineapple: '1f34d', lemon: '1f34b', kiwi: '1f95d',
      mango: '1f96d', blueberry: '1fad0', avocado: '1f951', coconut: '1f965', papaya: '-', persimmon: '-',
      carrot: '1f955', tomato: '1f345', broccoli: '1f966', corn: '1f33d', pumpkin: '1f383', eggplant: '1f346',
      potato: '1f954', onion: '1f9c5', mushroom: '1f344', pepper: '1f336', cucumber: '1f952', cabbage: '1f96c',
      peas: '1fadb', radish: '-'
    },
    characters: {
      robot: '1f916', alien: '1f47d', astronaut: '1f9d1_200d_1f680', superhero: '1f9b8', ninja: '1f977',
      pirate: '-', king: '-', queen: '-', prince: '-', princess: '-', wizard: '1f9d9', witch: '1f9d9_200d_2640',
      fairy: '1f9da', elf: '1f9dd', dragon: '1f409', unicorn: '1f984', dino: '1f996', ghost: '1f47b',
      pumpkinman: '1f383', snowman: '2603', diver: '1f93f', firefighter: '1f9d1_200d_1f692',
      doctor: '1f9d1_200d_1f52c', nurse: '1f9d1_200d_2695', chef: '-', farmer: '1f9d1_200d_1f33e',
      clown: '1f921', vampire: '1f9db', mummy: '1f9df', mermaid: '1f9dc', angel: '1f47c', slime: '-'
    },
    stationery: {
      pencil: '270f', pen: '1f58a', fountainpen: '1f58b', brush: '1f58c', paintbrush: '-', crayon: '1f58d',
      marker: '-', highlighter: '-', chalk: '-', eraser: '-', sharpener: '-', ruler: '1f4d0', triangle: '1f4cf',
      protractor: '-', compass: '1f9ed', scissors: '2702', cutter: '-', glue: '-', tape: '-', stapler: '-',
      clip: '1f4ce', pushpin: '1f4cc', notebook: '1f4d3', book: '1f4d6', folder: '1f4c1', stickynote: '1f4dd',
      envelope: '2709', calculator: '-', pencilcase: '-', backpack: '1f392', palette: '1f3a8', globe: '1f30e'
    },
    food: {
      food1: '1f354', food2: '1f355', food3: '1f363', food4: '1f359', food5: '1f35c', food6: '1f32f',
      food7: '1f96a', food8: '1f32d', food9: '1f35f', food10: '1f969', food11: '1f357', food12: '1f373',
      food13: '1f9c0', food14: '1f35e', food15: '1f950', food16: '1f95f', food17: '1f372', food18: '1f957',
      food19: '1f35b', food20: '1f371', food21: '1f37f', food22: '1f370', food23: '1f9c1', food24: '1f369',
      food25: '1f36a', food26: '1f36b', food27: '1f36c', food28: '1f366', food29: '1f367', food30: '2615',
      food31: '1f95b', food32: '1f9c3'
    }
  };
  var codepoints = {};
  Object.keys(assetsById).forEach(function (deckId) {
    var deck = w.DECKS[deckId];
    codepoints[deckId] = deck && deck.icons
      ? deck.icons.map(function (icon) { return assetsById[deckId][icon.id] || '-'; })
      : [];
  });
  w.REALISTIC_CODEPOINTS = codepoints;

  Object.keys(codepoints).forEach(function (deckId) {
    var deck = w.DECKS[deckId];
    if (!deck || !deck.icons) return;
    codepoints[deckId].forEach(function (code, index) {
      if (code === '-' || !deck.icons[index]) return;
      deck.icons[index].svg = '<image href="assets/noto/emoji_u' + code + '.svg" x="4" y="4" width="92" height="92" preserveAspectRatio="xMidYMid meet"/>';
    });
  });
})(window);
