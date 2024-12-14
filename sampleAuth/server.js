/** @format */

const jwt = require("jsonwebtoken");
const JWT_SECRET = "secret";

function setUser(email) {
	const payload = {
		email,
	};

	return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

function getUser(token) {
	if (!token) {
		return null;
	}
	return jwt.verify(token, JWT_SECRET);
}

module.exports = {
	setUser,
	getUser,
};
