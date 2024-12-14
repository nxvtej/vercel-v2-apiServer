/** @format */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
if (prisma) {
	console.log("Prisma instance in prisma/server");
} else {
	console.log("Prisma instance not found in prisma/server");
}

module.exports = { prisma };
