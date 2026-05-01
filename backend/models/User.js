// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: {
    type: String,
    default: "user"
  },
  resetToken:       { type: String, default: null },
  resetTokenExpiry: { type: Date,   default: null },
});

export default mongoose.model("User", userSchema);