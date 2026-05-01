// models/Category.js
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  { name: { type: String, required: true, unique: true, trim: true } },
  { toJSON: { virtuals: true } }
);

categorySchema.virtual("id").get(function () {
  return this._id.toHexString();
});

export default mongoose.model("Category", categorySchema);

