// models/Review.js
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    userId:    { type: String, required: true },
    userName:  { type: String, required: true },
    rating:    { type: Number, required: true, min: 1, max: 5 },
    comment:   { type: String, default: "" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

reviewSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

export default mongoose.model("Review", reviewSchema);

