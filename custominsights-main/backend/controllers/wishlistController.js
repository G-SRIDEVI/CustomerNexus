const Wishlist = require("../models/Wishlist");


// ADD TO WISHLIST

const addWishlist = async(req,res)=>{

try{

const wishlist = await Wishlist.create({

userId:req.body.userId,

productId:req.body.productId

});


res.status(201).json({

success:true,

message:"Added to Wishlist",

wishlist

});


}
catch(error){

res.status(500).json({

message:error.message

});

}

};




// GET USER WISHLIST

const getWishlist = async(req,res)=>{

try{


const wishlist = await Wishlist.find({

userId:req.params.userId

})
.populate("productId");



res.json({ success: true, items: wishlist });


}
catch(error){

res.status(500).json({

message:error.message

});

}


};




// REMOVE FROM WISHLIST


const removeWishlist = async(req,res)=>{

try{


await Wishlist.findByIdAndDelete(
req.params.id
);


res.json({

success:true,

message:"Removed from Wishlist"

});


}
catch(error){

res.status(500).json({

message:error.message

});

}


};



module.exports={

addWishlist,

getWishlist,

removeWishlist

};