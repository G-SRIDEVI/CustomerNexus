const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

// Get personalized recommendations for a user or product context
const getRecommendations = async (req, res) => {
  try {
    const { userId, productId } = req.query;
    const limitNum = parseInt(req.query.limit, 10) || 4;

    // 1. Calculate overall top selling products in the database as ranking baseline
    const allOrders = await Order.find();
    const productSalesCount = {};
    const coOccurrenceMap = {};

    allOrders.forEach(order => {
      const pIdsInOrder = [];
      order.products.forEach(p => {
        if (p.productId) {
          const pIdStr = p.productId.toString();
          productSalesCount[pIdStr] = (productSalesCount[pIdStr] || 0) + p.quantity;
          pIdsInOrder.push(pIdStr);
        }
      });

      // Track Frequently Bought Together co-occurrences
      for (let i = 0; i < pIdsInOrder.length; i++) {
        for (let j = i + 1; j < pIdsInOrder.length; j++) {
          const idA = pIdsInOrder[i];
          const idB = pIdsInOrder[j];

          if (!coOccurrenceMap[idA]) coOccurrenceMap[idA] = {};
          if (!coOccurrenceMap[idB]) coOccurrenceMap[idB] = {};

          coOccurrenceMap[idA][idB] = (coOccurrenceMap[idA][idB] || 0) + 1;
          coOccurrenceMap[idB][idA] = (coOccurrenceMap[idB][idA] || 0) + 1;
        }
      }
    });

    const allProducts = await Product.find();
    const rankedGlobalProducts = allProducts
      .map(prod => ({
        product: prod,
        salesCount: productSalesCount[prod._id.toString()] || 0
      }))
      .sort((a, b) => b.salesCount - a.salesCount);

    // If productId is provided (Product Details Context: Frequently Bought Together)
    if (productId && !userId) {
      const relatedIds = coOccurrenceMap[productId.toString()] || {};
      const sortedRelated = Object.keys(relatedIds).sort((a, b) => relatedIds[b] - relatedIds[a]);

      let fbtProducts = [];
      if (sortedRelated.length > 0) {
        fbtProducts = allProducts.filter(p => sortedRelated.includes(p._id.toString()));
      }

      // Fill with same category products if needed
      const sourceProd = allProducts.find(p => p._id.toString() === productId.toString());
      if (fbtProducts.length < limitNum && sourceProd) {
        const sameCategory = allProducts.filter(
          p => p.category === sourceProd.category && p._id.toString() !== productId.toString()
        );
        sameCategory.forEach(p => {
          if (!fbtProducts.some(fp => fp._id.toString() === p._id.toString())) {
            fbtProducts.push(p);
          }
        });
      }

      // Fill with top sellers if still needed
      if (fbtProducts.length < limitNum) {
        rankedGlobalProducts.forEach(item => {
          if (
            item.product._id.toString() !== productId.toString() &&
            !fbtProducts.some(fp => fp._id.toString() === item.product._id.toString())
          ) {
            fbtProducts.push(item.product);
          }
        });
      }

      return res.json({
        success: true,
        products: fbtProducts.slice(0, limitNum),
        type: "frequently_bought_together"
      });
    }

    // If no userId is provided, return global top sellers
    if (!userId) {
      const globalRecs = rankedGlobalProducts.slice(0, limitNum).map(item => item.product);
      return res.json({ success: true, products: globalRecs, type: "global_popular" });
    }

    // 2. Fetch User to extract profile interest parameters
    const user = await User.findById(userId);
    if (!user) {
      const globalRecs = rankedGlobalProducts.slice(0, limitNum).map(item => item.product);
      return res.json({ success: true, products: globalRecs, type: "global_popular" });
    }

    // Find all products in user's cart, wishlist, and past orders
    const cartProductIds = (user.cart || []).map(item => item.productId.toString());
    const wishlistProductIds = (user.wishlist || []).map(id => id.toString());

    const userOrders = await Order.find({ userId });
    const purchasedProductIds = [];
    userOrders.forEach(order => {
      order.products.forEach(p => {
        if (p.productId) {
          purchasedProductIds.push(p.productId.toString());
        }
      });
    });

    // Excluded IDs (do not suggest what user already owns or has in cart/wishlist)
    const excludedIds = new Set([...cartProductIds, ...wishlistProductIds, ...purchasedProductIds]);

    // Find categories the user has interacted with
    const interactedProductIds = [...cartProductIds, ...wishlistProductIds, ...purchasedProductIds];
    const interactedProducts = await Product.find({ _id: { $in: interactedProductIds } });
    const userCategories = [...new Set(interactedProducts.map(p => p.category))];

    let personalizedRecs = [];

    if (userCategories.length > 0) {
      // Filter global ranked products matching user's categories and not excluded
      personalizedRecs = rankedGlobalProducts
        .filter(item => {
          const isSameCategory = userCategories.includes(item.product.category);
          const isNotExcluded = !excludedIds.has(item.product._id.toString());
          return isSameCategory && isNotExcluded;
        })
        .map(item => item.product);
    }

    // 3. Fill in with global top sellers if we don't have enough personalized recommendations
    if (personalizedRecs.length < limitNum) {
      const remainingCount = limitNum - personalizedRecs.length;
      const fillProducts = rankedGlobalProducts
        .filter(item => {
          const isNotAlreadyRecommended = !personalizedRecs.some(
            p => p._id.toString() === item.product._id.toString()
          );
          const isNotExcluded = !excludedIds.has(item.product._id.toString());
          return isNotAlreadyRecommended && isNotExcluded;
        })
        .slice(0, remainingCount)
        .map(item => item.product);

      personalizedRecs = [...personalizedRecs, ...fillProducts];
    }

    // If still less than limit, fill with remaining global products to avoid blank UI
    if (personalizedRecs.length < limitNum) {
      const remainingCount = limitNum - personalizedRecs.length;
      const absoluteFill = rankedGlobalProducts
        .filter(item => {
          return !personalizedRecs.some(
            p => p._id.toString() === item.product._id.toString()
          );
        })
        .slice(0, remainingCount)
        .map(item => item.product);

      personalizedRecs = [...personalizedRecs, ...absoluteFill];
    }

    res.json({
      success: true,
      products: personalizedRecs.slice(0, limitNum),
      type: userCategories.length > 0 ? "personalized" : "global_popular_fallback"
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getRecommendations
};
