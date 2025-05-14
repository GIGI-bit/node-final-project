import { User } from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateTokens } from "../utils/generateTokens.js";

export const login = async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username: username });
  if (!user) {
    console.log("User not found, registering...");
    await register(req, res);

    console.log("Registration complete. Please restart the app.");
    return process.exit(0);
  }

  const isPasswordCorrect = await bcryptjs.compare(password, user.password);

  if (!isPasswordCorrect) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid password" });
  }

  const { accessToken, refreshToken } = generateTokens(user, res);

  res.json({ accessToken, refreshToken });
};

export const register = async (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = await bcryptjs.hash(password, 10);

  const newUser = new User({
    username: username,
    password: hashedPassword,
  });

  await newUser.save();

  const { accessToken, refreshToken } = generateTokens(newUser, res);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    accessToken,
    refreshToken,
  });
};

export const logout = async (req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res
      .status(401)
      .json({ success: false, message: "No refresh token provided" });
  }

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid refresh token" });
    }

    const id = user._id;

    const newAccessToken = jwt.sign(
      { id: user.id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );
    res.cookie("accessToken", newAccessToken, {
      maxAge: 15 * 60 * 1000,
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });

    res.json({ accessToken: newAccessToken });
  });
};

export const getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
