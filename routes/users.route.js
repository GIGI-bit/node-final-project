import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { getUserByUsername } from "../controllers/users.controller.js";

const router = express.Router();

// GET method
router.get("/", (req, res) => {
  res.json({ message: "User data" });
});

// GET method
router.get("/user/:username", getUserByUsername);

// router.get("/me", protectRoute, (req, res) => {
//   const user = req.user;

//   res.status(200).json({ message: "My user data", data: user });
// });

// // POST method
// router.post("/add", (req, res) => {
//   const data = req.body;
//   res.json({ message: "POST request received", data });
// });

// // PUT method
// router.put("/edit/:id", (req, res) => {
//   const { id } = req.params;
//   const data = req.body;
//   res.json({ message: `PUT request to update users ${id}`, data });
// });

// // PATCH method
// router.patch("/patch/:id", (req, res) => {
//   const { id } = req.params;
//   const data = req.body;
//   res.json({ message: `PATCH request to partially update users ${id}`, data });
// });

// DELETE method
router.delete("/delete/:id", (req, res) => {
  const { id } = req.params;
  res.json({ message: `DELETE request to remove users ${id}` });
});

export default router;
