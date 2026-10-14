import mongoose from "mongoose";

const documentItemSchema = new mongoose.Schema({
  productId: String,
  name: String,
  quantity: { type: Number, min: 1 },
  unitPrice: { type: Number, min: 0 },
}, { _id: false });

const salesDocumentSchema = new mongoose.Schema({
  type: { type: String, enum: ["quote", "invoice"], required: true },
  number: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, default: "" },
  customerPhone: { type: String, default: "" },
  customerAddress: { type: String, default: "" },
  date: { type: Date, default: Date.now },
  validUntil: Date,
  items: { type: [documentItemSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  vatRate: { type: Number, default: 0 },
  vatAmount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: { type: String, default: "draft" },
  notes: { type: String, default: "" },
}, { timestamps: true, toJSON: { virtuals: true } });

salesDocumentSchema.virtual("id").get(function () { return this._id.toHexString(); });

export default mongoose.model("SalesDocument", salesDocumentSchema);
