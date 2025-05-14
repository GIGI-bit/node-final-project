import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required!"],
    trim: true,
    unique: [true, "This username is taken."],
  },
  password: {
    type: String,
    required: true,
    minLength: [8, "Password must be 8 characters long!"],
  },
});

export const User = mongoose.model("User", userSchema);
