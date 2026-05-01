// models/Order.js
import mongoose from "mongoose";

const shippingSchema = new mongoose.Schema({
  firstName: String,
  lastName:  String,
  phone:     String,
  address:   String,
}, { _id: false });

const historyEntrySchema = new mongoose.Schema({
  status: String,
  date:   { type: String, default: () => new Date().toLocaleDateString("fr-FR") },
  time:   { type: String, default: () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) },
  note:   { type: String, default: "" },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId:    String,
  userName:  String,
  userEmail: String,
  shipping:  shippingSchema,
  items:     Array,   // [{ product: {...}, quantity: Number }]
  total:     Number,
  status: {
    type:    String,
    default: "pending",
  },
  history:   { type: [historyEntrySchema], default: [] },
  date: {
    type:    String,
    default: () => new Date().toLocaleDateString("fr-FR"),
  },
}, { toJSON: { virtuals: true } });

// Expose _id as id
orderSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

export default mongoose.model("Order", orderSchema);