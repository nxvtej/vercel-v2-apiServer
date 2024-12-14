/** @format */
const {
	createClient,
	generateSlug,
	ECSClient,
	Kafka,
	Server,
	createRunTaskCommand,
	kafkaConsumer,
} = require("./dependency/server");

const express = require("express");
const http = require("http");
const { z } = require("zod");
const fs = require("fs");
const path = require("path");
const PORT = process.env.PORT || 3000;
const { router } = require("./authfile.js");

console.log(require("fs").readdirSync("./"));

const {
	AWS_ACCESS_KEY_ID,
	AWS_SECRET_ACCESS_KEY,
	AWS_CLUSTER,
	AWS_TASK_DEFINITION,
	AWS_SUBNET1,
	AWS_SUBNET2,
	AWS_SUBNET3,
	AWS_SECURITY_GROUP,
	KAFKA_CONSUMER,
	KAFKA_BROKER_SASL,
	CLICK_HOURSE_CLIENT_URL,
	CLICK_HOURSE_CLIENT_PASSWORD,
} = process.env;

const app = express();
const { prisma } = require("./prisma/server.js");

const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: "*",
	},
});

const client = createClient({
	url: CLICK_HOURSE_CLIENT_URL,
	database: "default",
	username: "avnadmin",
	password: CLICK_HOURSE_CLIENT_PASSWORD,
});
io.on("connection", (socket) => {
	console.log("Client connected running socket.io");
	socket.on("subscribe", (channel) => {
		socket.join(channel);
		socket.emit("message", `joined to ${channel}`);
	});
});

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

const kafka = new Kafka({
	clientId: `api-server`,
	brokers: [KAFKA_CONSUMER],
	ssl: {
		ca: fs.readFileSync(path.join(__dirname, "kafka.pem"), "utf-8"),
	},
	sasl: {
		mechanism: "plain",
		username: "avnadmin",
		password: KAFKA_BROKER_SASL,
	},
});

const consumers = kafka.consumer({ groupId: "api-server-logs-consumer" });

app.use(express.json());

app.use("/v1", router);

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

	return res.json({ status: "success", data: { project } });
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
			project: {
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
		status: "queued",
		data: {
			deploymentId: deploymentId,
		},
	});
});

app.get("/logs/:id", async (req, res) => {
	const id = req.params.id;
	console.log({ id });
	const logs = await client.query({
		query: `SELECT event_id, deployment_id, log, timestamp from log_events where deployment_id = {deployment_id:String}`,
		query_params: {
			deployment_id: id,
		},
		format: "JSONEachRow",
	});

	const rawlogs = await logs.json();
	// console.log({ logs });
	res.json({ status: "success", data: rawlogs });
});

server.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
	// initRedisSubscriber(subscriber, io);
	// kafkaConsumer(consumers, client);
});
