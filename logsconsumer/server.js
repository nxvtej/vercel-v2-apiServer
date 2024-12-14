/** @format */

const { v4: uuidv4 } = require("uuid");
async function initRedisSubscriber(subscriber, io) {
	console.log("Subscribing to logs:*");
	subscriber.psubscribe("logs:*");
	subscriber.on("pmessage", (pattern, channel, message) => {
		io.to(channel).emit("message", message);
	});
}

async function kafkaConsumer(consumers, client) {
	await consumers.connect();
	await consumers.subscribe({ topic: "container-logs" });

	await consumers.run({
		autoCommit: false,

		eachBatch: async function ({
			batch,
			heartbeat,
			commitOffsetsIfNecessary,
			resolveOffset,
		}) {
			const messages = batch.messages;
			console.log(`Recv. ${messages.length} messages..`);
			for (const message of messages) {
				if (!message.value) continue;
				const stringMessage = message.value.toString();
				const { PROJECT_ID, DEPLOYEMENT_ID, log } = JSON.parse(stringMessage);
				console.log({ log, DEPLOYEMENT_ID });
				try {
					const { query_id } = await client.insert({
						table: "log_events",
						values: [
							{ event_id: uuidv4(), deployment_id: DEPLOYEMENT_ID, log },
						],
						format: "JSONEachRow",
					});
					console.log(query_id);
					resolveOffset(message.offset);
					await commitOffsetsIfNecessary(message.offset);
					await heartbeat();
				} catch (err) {
					console.log(err);
				}
			}
		},
	});
}

module.exports = { initRedisSubscriber, kafkaConsumer };
