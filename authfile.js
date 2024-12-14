/** @format */

const { prisma } = require("./prisma/server.js");
const jwt = require("jsonwebtoken");
const express = require("express");
const router = express.Router();
const JWT_SECRET = "secret";
const { authMiddleWare } = require("./middleware/authWare.js");
const { mailCheckerMiddleware } = require("./middleware/mailWare.js");
router.use(express.json());

router.post("/signup", mailCheckerMiddleware, async (req, res) => {
	const { email, password } = req.body;
	try {
		const user = await prisma.user.create({
			data: {
				email,
				password,
			},
		});
	} catch (error) {
		console.log("error in signup", error);
	}
	const payload = {
		email,
	};

	const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });

	res.json({ token });
});

router.get("/enter", authMiddleWare, (req, res) => {
	res.json({
		message: "You are in the protected route",
	});
});

router.get("/hello", (req, res) => {
	res.json({
		message: "Hello World",
	});
});

module.exports = { router };
