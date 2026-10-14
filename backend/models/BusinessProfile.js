import mongoose from "mongoose";

const businessProfileSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  address: { type: String, default: "" },
  phone: { type: String, default: "" },
  email: { type: String, default: "" },
  taxId: { type: String, default: "" },
  vatRate: { type: Number, default: 0, min: 0, max: 100 },
  currency: { type: String, default: "DT" },
}, { timestamps: true, toJSON: { virtuals: true } });

businessProfileSchema.virtual("id").get(function () { return this._id.toHexString(); });

export default mongoose.model("BusinessProfile", businessProfileSchema);
