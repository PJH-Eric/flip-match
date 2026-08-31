/* 百科式牌面圖示：使用專案內建的 Noto Emoji SVG，避免遊戲執行時依賴外部網路。 */
(function (w) {
  'use strict';

  var codepoints = {
    animals: '1f408 1f415 1f407 1f43b 1f43c 1f98a 1f416 1f404 1f411 1f412 1f981 1f42f 1f418 1f992 1f993 1f99b 1f428 1f98c 1f43f 1f994 1f438 1f427 1f989 1f423 1f986 1f40b 1f42c 1f419 1f980 1f422 1f40c 1f41d'.split(' '),
    vehicles: '1f697 1f695 1f68c 1f68e 1f69a 1f69b 1f693 1f692 1f691 1f69c 1f6a7 1f3d7 1f3d7 1f69c 1f6a7 1f6b2 1f3cd 1f6f5 1f6f9 1f686 1f682 1f68a 1f687 1f684 2708 1f681 1f680 1f6f8 1f388 26f5 1f6a2 1f6a0'.split(' '),
    fruits: '1f34e 1f350 1f34c 1f34a 1f347 1f353 1f349 1f351 1f352 1f34d 1f34b 1f95d 1f96d 1fad0 1f951 1f965 1f34e 1f34e 1f955 1f345 1f966 1f33d 1f383 1f346 1f954 1f9c5 1f344 1f336 1f952 1f96c 1fadb 1f955'.split(' '),
    characters: '1f916 1f47d 1f9d1_200d_1f680 1f9b8 1f977 1f9d1_200d_1f3a8 1f451 1f478 1f934 1f478 1f9d9 1f9d9_200d_2640 1f9da 1f9dd 1f409 1f984 1f996 1f47b 1f383 2603 1f93f 1f9d1_200d_1f692 1f9d1_200d_1f52c 1f9d1_200d_2695 1f9d1_200d_2695 1f9d1_200d_1f373 1f9d1_200d_1f33e 1f921 1f9db 1f9df 1f9dc 1f47c 1f9d1'.split(' '),
    stationery: '270f 1f58a 1f58b 1f58c 1f3a8 1f58d 1f58a 1f58a 1f4dd 1f9fd 1f4cf 1f4d0 1f9ed 2702 - 1f9f4 1f4ce 1f4ce 1f4cc 1f4d3 1f4d6 1f4c1 1f4dd 2709 - 1f4bc 1f392 1f3a8 1f30e 1f4ca 1f4c4 1f4cc'.split(' '),
    food: '1f354 1f355 1f363 1f359 1f35c 1f32f 1f96a 1f32d 1f35f 1f969 1f357 1f373 1f9c0 1f35e 1f950 1f95f 1f372 1f957 1f35b 1f371 1f37f 1f370 1f9c1 1f369 1f36a 1f36b 1f36c 1f366 1f367 2615 1f95b 1f9c3'.split(' ')
  };

  Object.keys(codepoints).forEach(function (deckId) {
    var deck = w.DECKS[deckId];
    if (!deck || !deck.icons) return;
    codepoints[deckId].forEach(function (code, index) {
      if (code === '-' || !deck.icons[index]) return;
      deck.icons[index].svg = '<image href="assets/noto/emoji_u' + code + '.svg" x="4" y="4" width="92" height="92" preserveAspectRatio="xMidYMid meet"/>';
    });
  });
})(window);
