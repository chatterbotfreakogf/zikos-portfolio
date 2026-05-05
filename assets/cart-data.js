/* ============================================================
   cart-data.js — themenneutrale Demo-Daten für den Smart-Cart
   ============================================================ */

window.zzCartData = (() => {
  "use strict";

  const items = {
    basis: {
      id: "basis",
      name: "Item · Basis",
      meta: "Standardvariante",
      price: 35.00,
      glyph: "sphere"
    },
    zubehoer: {
      id: "zubehoer",
      name: "Item · Zubehör",
      meta: "Komplementär zur Basis",
      price: 12.00,
      glyph: "disc"
    },
    premium: {
      id: "premium",
      name: "Item · Premium",
      meta: "Premiumvariante",
      price: 58.00,
      glyph: "cube"
    },
    ergaenzung: {
      id: "ergaenzung",
      name: "Item · Ergänzung",
      meta: "Häufig gekauft",
      price: 9.00,
      glyph: "ring"
    }
  };

  // Komplementäre Cross-Sells (z. B. Schuh → Putzmittel)
  const crossSell = {
    basis: ["zubehoer"],
    zubehoer: ["ergaenzung"],
    premium: ["zubehoer"],
    ergaenzung: []
  };

  const bundles = [
    {
      id: "starter",
      name: "Starter-Set",
      requires: ["basis", "zubehoer", "premium"],
      discount: 0.15,
      glyph: "stack"
    }
  ];

  const bundleCrossSell = {
    starter: ["ergaenzung"]
  };

  const freeShippingThreshold = 80.00;

  return { items, crossSell, bundles, bundleCrossSell, freeShippingThreshold };
})();
