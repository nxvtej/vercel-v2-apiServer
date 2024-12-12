/** @format */

const { RunTaskCommand } = require("@aws-sdk/client-ecs");

function createRunTaskCommand(config, gitUrl, project) {
	return new RunTaskCommand({
		cluster: config.CLUSTER,
		taskDefinition: config.TASK,
		count: 1,
		launchType: "FARGATE",
		networkConfiguration: {
			awsvpcConfiguration: {
				subnets: [config.SUBNET1, config.SUBNET2, config.SUBNET3],
				securityGroups: [config.SECURITY_GROUP],
				assignPublicIp: "ENABLED",
			},
		},
		overrides: {
			containerOverrides: [
				{
					name: "builder-image",
					environment: [
						{
							name: "GIT_REPOSITORY__URL",
							value: gitUrl,
						},
						{
							name: "PROJECT_ID",
							value: project,
						},
					],
				},
			],
		},
	});
}

module.exports = { createRunTaskCommand };
