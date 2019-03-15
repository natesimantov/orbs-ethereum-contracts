
const GUARDIAN_DEPOSIT = '0.1';
const MIN_BALANCE_GUARDIAN = '0.5';
const MIN_BALANCE = '0.4';
const BALANCE_BUFFER = '0.4';

module.exports.MIN_BALANCE_FEES = MIN_BALANCE;
module.exports.MIN_BALANCE_DEPOSIT = MIN_BALANCE_GUARDIAN;

module.exports.getWeiDeposit = function (web3) {
    return web3.utils.toWei(GUARDIAN_DEPOSIT, "ether");
};

module.exports.verifyEtherBalance = async function (web3, targetAccount, minBalanceEther, bankAccount) {
    const bufferBn = web3.utils.toBN(web3.utils.toWei(BALANCE_BUFFER, "ether"));
    const minBalanceBn = web3.utils.toBN(web3.utils.toWei(minBalanceEther, "ether"));

    const initial = await web3.eth.getBalance(targetAccount);
    const initialBn = web3.utils.toBN(initial);
    if (initialBn.gte(minBalanceBn)) {
        console.error(`verified balance for ${targetAccount} is at least ${minBalanceEther} (has ${initial} wei)`);
        return;
    }

    const diff = minBalanceBn.add(bufferBn).sub(initialBn).toString();
    console.error(`transferring ${diff} wei to ${targetAccount} to reach balance of ${minBalanceBn.add(bufferBn).toString()} wei`);

    await web3.eth.sendTransaction({to:targetAccount, from:bankAccount, value:diff});
    console.error(`new balance: ${await web3.eth.getBalance(targetAccount)}`);
};