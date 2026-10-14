import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  contact: { type: String, default: "" },
  phone: { type: String, default: "" },
  email: { type: String, default: "" },
  address: { type: String, default: "" },
  taxId: { type: String, default: "" },
  notes: { type: String, default: "" },
}, { timestamps: true, toJSON: { virtuals: true } });

supplierSchema.virtual("id").get(function () { return this._id.toHexString(); });

export default mongoose.model("Supplier", supplierSchema);
