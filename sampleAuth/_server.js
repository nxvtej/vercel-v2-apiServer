/** @format */

const statemap = new Map();

function setStateForNewUser(userId) {
	statemap.set(userId);
}

function getStateForUser(userId) {
	return statemap.get(userId);
}

module.exports = {
	setStateForNewUser,
	getStateForUser,
};
