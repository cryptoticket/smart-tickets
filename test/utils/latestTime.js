// Returns the time of the last mined block in seconds
module.exports = async function latestTime() {
    const b = await web3.eth.getBlock('latest');
    return b.timestamp;
};
