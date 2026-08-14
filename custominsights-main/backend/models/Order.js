const mongoose = require("mongoose");


const orderSchema = new mongoose.Schema({

    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },


    products:[
        {
            productId:{
                type:mongoose.Schema.Types.ObjectId,
                ref:"Product"
            },

            productName:String,

            quantity:Number,

            price:Number
        }
    ],


    totalAmount:{
        type:Number,
        required:true
    },


    paymentMethod:{
        type:String,
        default:"COD"
    },


    paymentStatus:{
        type:String,
        default:"Pending"
    },


    orderStatus:{
        type:String,
        default:"Processing"
    },


    orderDate:{
        type:Date,
        default:Date.now
    }


});


module.exports = mongoose.model(
    "Order",
    orderSchema
);