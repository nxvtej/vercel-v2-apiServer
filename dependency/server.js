/** @format */
const { createClient } = require("@clickhouse/client");
const { generateSlug } = require("random-word-slugs");
const { ECSClient } = require("@aws-sdk/client-ecs");
const { Kafka } = require("kafkajs");
const { Server } = require("socket.io");
const { createRunTaskCommand } = require("../command/server");
const { kafkaConsumer } = require("../logsconsumer/server");
const {
	mailCheckerMiddleware,
	createUserSchema,
} = require("../middleware/mailWare");
require("dotenv").config();

module.exports = {
	mailCheckerMiddleware,
	createUserSchema,
	createClient,
	generateSlug,
	ECSClient,
	Kafka,
	Server,
	createRunTaskCommand,
	kafkaConsumer,
};
