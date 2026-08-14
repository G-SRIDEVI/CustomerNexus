const Transaction = require("../models/Transaction");




// CREATE TRANSACTION

const createTransaction = async(req,res)=>{


try{


const transaction =
await Transaction.create({

userId:req.body.userId,

orderId:req.body.orderId,

amount:req.body.amount,

paymentMethod:req.body.paymentMethod,

paymentStatus:"Success"

});



res.status(201).json({

success:true,

message:"Transaction Successful",

transaction

});


}

catch(error){


res.status(500).json({

message:error.message

});


}


};





// GET USER TRANSACTIONS


const getTransactions = async(req,res)=>{


try{


const transactions =
await Transaction.find({

userId:req.params.userId

})
.sort({
date:-1
});



res.json(transactions);



}

catch(error){


res.status(500).json({

message:error.message

});


}


};





module.exports={

createTransaction,

getTransactions

};