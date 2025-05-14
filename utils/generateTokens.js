import jwt from "jsonwebtoken";

export const generateTokens = (user, res) => {
  const id = user._id;
  const accessToken = jwt.sign({ id: id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ id: id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
  res.cookie("accessToken", accessToken, {
    maxAge: 15 * 60 * 1000,
    httpOnly: true,
    secure: false,
    sameSite: "strict",
  });
  res.cookie("refreshToken", refreshToken, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false,
    sameSite: "strict",
  });

  return { accessToken, refreshToken };
};
