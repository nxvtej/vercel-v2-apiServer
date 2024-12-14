/** @format */
const z = require("zod");
const createUserSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
});

module.exports = { createUserSchema };
