// models/Product.js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },
    barcode:       { type: String, required: true, trim: true, unique: true },
    description:   { type: String, default: "" },
    price:         { type: Number, required: true, min: 0 },
    salePrice:     { type: Number, default: null },
    purchasePrice: { type: Number, default: null },
    image:         { type: String, default: "" },
    category:      { type: String, default: "" },
    stock:         { type: Number, default: 0, min: 0 },
    rating:        { type: Number, default: 4.5, min: 0, max: 5 },
  },
  { toJSON: { virtuals: true } }
);

// Expose _id as id (same pattern as Order)
productSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

export default mongoose.model("Product", productSchema);
