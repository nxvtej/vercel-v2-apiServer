/** @format */

async function initRedisSubscriber(subscriber, io) {
	console.log("Subscribing to logs:*");
	subscriber.psubscribe("logs:*");
	subscriber.on("pmessage", (pattern, channel, message) => {
		io.to(channel).emit("message", message);
	});
}

module.exports = { initRedisSubscriber };
