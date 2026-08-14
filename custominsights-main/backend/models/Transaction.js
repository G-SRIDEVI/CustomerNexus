const mongoose = require("mongoose");


const transactionSchema = new mongoose.Schema({


    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },


    orderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Order",
        required:true
    },


    amount:{
        type:Number,
        required:true
    },


    paymentMethod:{
        type:String,
        required:true
    },


    paymentStatus:{
        type:String,
        default:"Success"
    },


    transactionId:{
        type:String,
        default:function(){

            return "TXN"+Date.now();

        }
    },


    date:{
        type:Date,
        default:Date.now
    }


});


module.exports = mongoose.model(
"Transaction",
transactionSchema
);