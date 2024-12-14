/** @format */

const express = require("express");
const http = require("http");
const app = express();
const PORT = 9000;
const z = require("zod");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

require("dotenv").config();
console.log(require("fs").readdirSync("./"));
console.log("REDIS_HOST:", process.env.REDIS_HOST);

const {
	AWS_ACCESS_KEY_ID,
	AWS_SECRET_ACCESS_KEY,
	AWS_CLUSTER,
	AWS_TASK_DEFINITION,
	AWS_SUBNET1,
	AWS_SUBNET2,
	AWS_SUBNET3,
	AWS_SECURITY_GROUP,
} = process.env;

const Redis = require("ioredis");
const { Server } = require("socket.io");

const REDISHOST = process.env.REDIS_HOST;
const subscriber = new Redis(REDISHOST);

subscriber.on("connect", () => console.log("Connected to Redis"));
subscriber.on("error", (err) => console.error("Redis error:", err));

const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: "*",
	},
});
io.on("connection", (socket) => {
	console.log("Client connected running socket.io");
	socket.on("subscribe", (channel) => {
		socket.join(channel);
		socket.emit("message", `joined to ${channel}`);
	});
});

const { generateSlug } = require("random-word-slugs");
const { ECSClient } = require("@aws-sdk/client-ecs");
const { initRedisSubscriber } = require("./redis/server");
const { createRunTaskCommand } = require("./command/server");

const ecsClient = new ECSClient({
	region: "ap-south-1",
	credentials: {
		accessKeyId: AWS_ACCESS_KEY_ID,
		secretAccessKey: AWS_SECRET_ACCESS_KEY,
	},
});

const config = {
	CLUSTER: AWS_CLUSTER,
	TASK: AWS_TASK_DEFINITION,
};

app.use(express.json());

app.post("/project", async (req, res) => {
	const schema = z.object({
		gitUrl: z.string().url(),
		name: z.string(),
	});
	const safeParse = schema.safeParse(req.body);
	if (safeParse.error) {
		return res.status(400).json({
			status: "error",
			message: safeParse.error.errors,
		});
	}

	const { name, gitUrl } = safeParse.data;
	const project = await prisma.project.create({
		data: {
			name,
			gitUrl,
			subDomain: generateSlug(2),
		},
	});
});

app.post("/deploy", async (req, res) => {
	const schema = z.object({
		projectId: z.string(),
	});
	const safeParse = schema.safeParse(req.body);
	if (safeParse.error) {
		return res.status(400).json({
			status: "error",
			message: safeParse.error.errors,
		});
	}
	const { projectId } = safeParse.data;
	const project = await prisma.project.findUnique({
		where: {
			id: projectId,
		},
	});

	if (!project) {
		return res.status(404).json({
			status: "error",
			message: "Project not found",
		});
	}

	// check if their is no running task
	// check if the project is not already running

	const deployment = await prisma.deployment.create({
		data: {
			projectId: {
				connect: {
					id: projectId,
				},
			},
			status: "QUEUED",
		},
	});

	const deploymentId = deployment.id;
	const command = createRunTaskCommand(
		{
			CLUSTER: config.CLUSTER,
			TASK: config.TASK,
			SUBNET1: AWS_SUBNET1,
			SUBNET2: AWS_SUBNET2,
			SUBNET3: AWS_SUBNET3,
			SECURITY_GROUP: AWS_SECURITY_GROUP,
		},
		project.gitUrl,
		projectId,
		deploymentId
	);

	await ecsClient.send(command);
	res.json({
		status: "success",
		data: {
			project,
			gitUrl,
			url: `http://${project}.localhost:8000/`,
		},
	});
});

server.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
	initRedisSubscriber(subscriber, io);
});
