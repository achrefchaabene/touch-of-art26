import mongoose from "mongoose";

const purchaseItemSchema = new mongoose.Schema({
  productId: String,
  name: String,
  quantity: { type: Number, min: 1 },
  unitCost: { type: Number, min: 0 },
}, { _id: false });

const purchaseSchema = new mongoose.Schema({
  supplier: { type: String, default: "" },
  reference: { type: String, default: "" },
  date: { type: Date, default: Date.now },
  items: { type: [purchaseItemSchema], default: [] },
  total: { type: Number, default: 0 },
  notes: { type: String, default: "" },
}, { timestamps: true, toJSON: { virtuals: true } });

purchaseSchema.virtual("id").get(function () { return this._id.toHexString(); });

export default mongoose.model("Purchase", purchaseSchema);
