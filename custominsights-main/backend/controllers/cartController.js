const Cart = require("../models/Cart");


// ADD TO CART

const addCart = async(req,res)=>{

try{


const existingCart = await Cart.findOne({

userId:req.body.userId,

productId:req.body.productId

});


if(existingCart){


existingCart.quantity += req.body.quantity || 1;
existingCart.saveForLater = false; // Move back to active cart if it was saved for later

await existingCart.save();


return res.json({

success:true,

message:"Cart Updated",

cart:existingCart

});


}



const cart = await Cart.create({

userId:req.body.userId,

productId:req.body.productId,

quantity:req.body.quantity || 1,

saveForLater: req.body.saveForLater || false

});


res.status(201).json({

success:true,

message:"Added to Cart",

cart

});


}

catch(error){

res.status(500).json({

message:error.message

});

}

};




// GET CART

const getCart = async(req,res)=>{

try{


const cart = await Cart.find({

userId:req.params.userId

})
.populate("productId");



res.json({ success: true, items: cart });


}

catch(error){

res.status(500).json({

message:error.message

});

}

};




// REMOVE CART ITEM

const removeCart = async(req,res)=>{

try{

const { id } = req.params;
const { userId, productId } = req.body;

if (id) {
    await Cart.findByIdAndDelete(id);
} else if (userId && productId) {
    await Cart.findOneAndDelete({ userId, productId });
} else {
    return res.status(400).json({ success: false, message: "Invalid parameters" });
}

res.json({

success:true,

message:"Removed from Cart"

});


}

catch(error){

res.status(500).json({

success:false,

message:error.message

});

}


};

// UPDATE QUANTITY
const updateQuantity = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;
        
        const cartItem = await Cart.findByIdAndUpdate(
            id,
            { quantity: Number(quantity) },
            { new: true }
        );
        
        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Cart item not found" });
        }
        
        res.status(200).json({ success: true, message: "Quantity updated", cart: cartItem });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// TOGGLE SAVE FOR LATER
const toggleSaveForLater = async (req, res) => {
    try {
        const { id } = req.params;
        const { saveForLater } = req.body;
        
        const cartItem = await Cart.findByIdAndUpdate(
            id,
            { saveForLater: Boolean(saveForLater) },
            { new: true }
        );
        
        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Cart item not found" });
        }
        
        res.status(200).json({ 
            success: true, 
            message: saveForLater ? "Saved for later" : "Moved to active cart", 
            cart: cartItem 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



module.exports={

addCart,

getCart,

removeCart,

updateQuantity,

toggleSaveForLater

};