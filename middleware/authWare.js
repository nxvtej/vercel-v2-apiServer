/** @format */
require("dotenv").config();
const authMiddleWare = (req, res, next) => {
	const authHeader = req.headers.authorization;

	// Check if the Authorization header exists and starts with "Bearer"
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({
			message: "Unauthorized 1",
		});
	}

	const token = authHeader.split(" ")[1]; // Extract the token
	console.log("Token Received:", token);

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token
		console.log("Decoded Token:", decoded); // Optional: Log the decoded token
		next(); // Proceed to the next middleware or route handler
	} catch (error) {
		console.error("JWT Error:", error.message);
		return res.status(401).json({
			message: "Unauthorized 2",
		});
	}
};

module.exports = { authMiddleWare };
