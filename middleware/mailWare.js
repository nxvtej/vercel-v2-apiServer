/** @format */
const { prisma } = require("../prisma/server");
const { createUserSchema } = require("../schema/userSchema");

if (!prisma) console.log("Prisma instance not found");

const mailCheckerMiddleware = async (req, res, next) => {
	const body = req.body;
	const safeParse = createUserSchema.safeParse(body);

	if (safeParse.error) {
		return res.status(400).json({
			status: "error",
			message: "Invalid data or email taken",
		});
	}

	const { email } = safeParse.data;
	const user = await prisma.user.findUnique({
		where: {
			email,
		},
	});

	if (user) {
		return res.status(400).json({
			status: "error",
			message: "Email taken",
		});
	}
	next();
};

module.exports = { mailCheckerMiddleware };
