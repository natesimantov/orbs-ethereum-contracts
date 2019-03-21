
const {Driver, RE} = require('./driver');
const {assertResolve, assertReject} = require('./assertExtensions');

contract('OrbsGuardians', accounts => {
    let driver;

    beforeEach(() => {
        driver = new Driver();
    });

    describe('is not payable', () => {
        it('rejects payments', async () => {
            await driver.deployGuardians();
            await assertReject(web3.eth.sendTransaction({
                to: driver.OrbsGuardians.address,
                from: accounts[0],
                value: 1
            }), "expected payment to fail");
            assert(await web3.eth.getBalance(accounts[0]) >= 1, "expected main account to have wei");
        });
    });

    describe('when calling the register() function', () => {
        it('should reflect registration in calls to: getGuardianData(), isGuardian(), getGuardians(), getRegistrationBlockNumber()', async () => {
            await driver.deployGuardians();

            await assertReject(driver.OrbsGuardians.getGuardianData(accounts[1]), "expected getting data before registration to fail");
            assert.isNotOk(await driver.OrbsGuardians.isGuardian(accounts[1]), "expected isGuardian to return false before registration");
            assert.deepEqual(await driver.OrbsGuardians.getGuardians(0, 10), [], "expected an empty guardian list before registration");

            const regRes = await driver.OrbsGuardians.register("some name", "some website", {from: accounts[1], value: driver.registrationDeposit});

            const retrievedData = await driver.OrbsGuardians.getGuardianData(accounts[1]);
            assert.equal(retrievedData.name, "some name", "expected correct name to be returned");
            assert.equal(retrievedData.website, "some website", "expected correct website to be returned");
            assert.equal(retrievedData[0], retrievedData.name, "expected name to be returned as first argument");
            assert.equal(retrievedData[1], retrievedData.website, "expected website to be returned as second argument");

            assert.isOk(await driver.OrbsGuardians.isGuardian(accounts[1]), "expected isGuardian to return true after registration");

            const retrievedGuardianList = await driver.OrbsGuardians.getGuardians(0, 10);
            assert.deepEqual(retrievedGuardianList, [accounts[1]], "expected list with the registered account address");

            const regBlk = await driver.OrbsGuardians.getRegistrationBlockNumber(accounts[1]);
            const blockNumber = regRes.receipt.blockNumber;
            assert.equal(regBlk.registeredOn.toNumber(), blockNumber);
            assert.equal(regBlk.lastUpdatedOn.toNumber(), blockNumber);
            assert.equal(regBlk.registeredOn.toNumber(), regBlk[0].toNumber());
            assert.equal(regBlk.lastUpdatedOn.toNumber(), regBlk[1].toNumber());
        });

        it('should reject empty data entries', async () => {
            await driver.deployGuardians();

            await assertReject(driver.OrbsGuardians.register("", "some website", {from: accounts[1], value: driver.registrationDeposit}), "expected empty name to fail registration");
            await assertReject(driver.OrbsGuardians.register(undefined, "some website", {from: accounts[1], value: driver.registrationDeposit}), "expected undefined name to fail registration");

            await assertReject(driver.OrbsGuardians.register("some name", "", {from: accounts[1], value: driver.registrationDeposit}), "expected empty website to fail registration");
            await assertReject(driver.OrbsGuardians.register("some name", undefined, {from: accounts[1], value: driver.registrationDeposit}), "expected undefined website to fail registration");
        });

        it('should require an exact deposit', async () => {
            await driver.deployGuardians();

            const name = "name";
            const url = "url";
            const insufficientDeposit = web3.utils.toBN(driver.registrationDeposit)
                .sub(web3.utils.toBN(1))
                .toString();
            const excessiveDeposit = web3.utils.toBN(driver.registrationDeposit)
                .add(web3.utils.toBN(1))
                .toString();

            await assertReject(driver.OrbsGuardians.register(
                name,
                url,
                {from: accounts[1], value: insufficientDeposit}
            ), "expected an insufficient deposit to fail registration");

            await assertReject(driver.OrbsGuardians.register(
                name,
                url,
                {from: accounts[1], value: excessiveDeposit}
            ), "expected an excessive deposit to fail registration");

            await assertReject(driver.OrbsGuardians.register(
                name,
                url,
                {from: accounts[1]}
            ), "expected no deposit to fail registration");
        });

        it('should deduct deposit from registering account and keep it', async () => {
            await driver.deployGuardians();

            const name = "name";
            const url = "url";

            // verify contract has nothing
            const contractBalanceBefore = await web3.eth.getBalance(driver.OrbsGuardians.address);
            assert.equal(
                contractBalanceBefore,
                '0',
                `expected contract to have no balance (found ${contractBalanceBefore})`
            );

            const accountBalanceBeforeReg = await web3.eth.getBalance(accounts[1]);
            const gasPrice = await web3.eth.getGasPrice(); // the current going price

            // register and deposit
            const result = await assertResolve(driver.OrbsGuardians.register(
                name,
                url,
                {from: accounts[1], value: driver.registrationDeposit, gasPrice: gasPrice}
            ), "expected an exact deposit to succeed registration");

            // verify the contract kept all the deposit
            assert.equal(
                await web3.eth.getBalance(driver.OrbsGuardians.address),
                driver.registrationDeposit,
                "expected contract to hold deposit"
            );

            // Verify we transferred the deposit from the sender account
            const txCost = result.receipt.gasUsed * gasPrice;
            const accountBalanceAfterReg = await web3.eth.getBalance(accounts[1]);
            const accountBalanceDifference = web3.utils.toBN(accountBalanceBeforeReg)
                .sub(web3.utils.toBN(accountBalanceAfterReg))
                .sub(web3.utils.toBN(txCost))
                .toString();
            assert.equal(
                accountBalanceDifference,
                driver.registrationDeposit,
                "expected deposit to be deducted from balance"
            )
        });

        it('should reject non EOAs', async () => {
            await driver.deployGuardians();

            const name = "name";
            const url = "url";

            const GuardianRegisteringContract = artifacts.require('GuardianRegisteringContract');
            await assertReject(GuardianRegisteringContract.new(
                driver.OrbsGuardians.address,
                name,
                url,
                {value: driver.registrationDeposit}
            ), "expected registration from contract constructor to fail");

            const eoaGuardianAddr = accounts[1];
            await assertResolve(driver.OrbsGuardians.register(
                name,
                url,
                {from:eoaGuardianAddr, value: driver.registrationDeposit}
            ), "expected registration to succeed when sent from EOA");
            assert(await driver.OrbsGuardians.isGuardian(eoaGuardianAddr))
        });

        describe('twice for the same guardian', () => {
            it('fails to override existing records, if a second deposit is sent', async () => {
                await driver.deployGuardians();

                const depositOptions = {
                    from: accounts[1],
                    value: driver.registrationDeposit
                };
                await driver.OrbsGuardians.register("some name", "some website", depositOptions);
                const p = driver.OrbsGuardians.register("other name", "other website", depositOptions);
                await assertReject(p, "expected a second deposit to be rejected");
            });

            it('override existing records, with no additional deposit', async () => {
                await driver.deployGuardians();

                await driver.OrbsGuardians.register("some name", "some website", {from: accounts[1], value: driver.registrationDeposit});
                await driver.OrbsGuardians.update("other name", "other website", {from: accounts[1]});

                const guardData = await driver.OrbsGuardians.getGuardianData(accounts[1]);
                assert.equal(guardData.name, "other name", "expected name to be overridden");
                assert.equal(guardData.website, "other website", "expected website to be overridden");
            });

            it('returns correct block heights after a successful override', async () => {
                await driver.deployGuardians();

                const regRes1 = await driver.OrbsGuardians.register("some name", "some website", {from: accounts[1], value: driver.registrationDeposit});
                const regRes2 = await driver.OrbsGuardians.update("other name", "other website", {from: accounts[1]});

                const regBlck = await driver.OrbsGuardians.getRegistrationBlockNumber(accounts[1]);
                const registrationHeight = regRes1.receipt.blockNumber;
                const updateHeight = regRes2.receipt.blockNumber;
                assert(registrationHeight < updateHeight, "expected registration block height to be less than updating block height");
                assert.equal(regBlck.registeredOn.toNumber(), registrationHeight);
                assert.equal(regBlck.lastUpdatedOn.toNumber(), updateHeight);
                assert.equal(regBlck.registeredOn.toNumber(), regBlck[0].toNumber());
                assert.equal(regBlck.lastUpdatedOn.toNumber(), regBlck[1].toNumber());
            });
        });
    });

    describe('when calling the getGuardianData() function', () => {
        it('should fail for unknown guardian addresses', async () => {
            await driver.deployGuardians();

            await driver.OrbsGuardians.register("some name", "some website", {from: accounts[1], value: driver.registrationDeposit}); // register one guardian

            await assertReject(driver.OrbsGuardians.getGuardianData(accounts[2]), "expected getting data for unknown guardian address to fail");
        });
    });

    describe('when fetching all Guardians', () => {
        [
            "getGuardians",
            "getGuardiansBytes20"
        ].forEach((guardiansGetterFunctionName) => {

            context(`with ${guardiansGetterFunctionName}()`, async () => {
                let functionUnderTest;
                beforeEach(async () => {
                    await driver.deployGuardians();
                    functionUnderTest = driver.OrbsGuardians[guardiansGetterFunctionName];
                });

                it('returns an empty array if offset is out of range', async () => {
                    const empty1 = await functionUnderTest(0, 10);
                    assert.deepEqual(empty1, [], "expected an empty array before anyone registered");

                    // register one guardian
                    await driver.OrbsGuardians.register("some name", "some website", {
                        from: accounts[1],
                        value: driver.registrationDeposit
                    });

                    const empty2 = await functionUnderTest(1, 10); // first unavailable offset
                    assert.deepEqual(empty2, [], "expected an empty array when requested unavailable offset");

                    const empty3 = await functionUnderTest(100, 10); // far unavailable offset
                    assert.deepEqual(empty3, [], "expected an empty array when requested unavailable offset");
                });

                it('should return the requested page', async () => {
                    await driver.OrbsGuardians.register("some name", "some website", {
                        from: accounts[1],
                        value: driver.registrationDeposit
                    });
                    await driver.OrbsGuardians.register("some name", "some website", {
                        from: accounts[2],
                        value: driver.registrationDeposit
                    });
                    await driver.OrbsGuardians.register("some name", "some website", {
                        from: accounts[3],
                        value: driver.registrationDeposit
                    });

                    const fullList = await functionUnderTest(0, 10);
                    assert.deepEqual(fullList.map(a => web3.utils.toChecksumAddress(a)), [accounts[1], accounts[2], accounts[3]], "expected three elements");

                    const lastTwo = await functionUnderTest(1, 10);
                    assert.deepEqual(lastTwo.map(a => web3.utils.toChecksumAddress(a)), [accounts[2], accounts[3]], "expected last two elements");

                    const lastOne = await functionUnderTest(2, 10);
                    assert.deepEqual(lastOne.map(a => web3.utils.toChecksumAddress(a)), [accounts[3]], "expected last element");

                    const firstTwo = await functionUnderTest(0, 2);
                    assert.deepEqual(firstTwo.map(a => web3.utils.toChecksumAddress(a)), [accounts[1], accounts[2]], "expected first two elements");

                    const firstOne = await functionUnderTest(0, 1);
                    assert.deepEqual(firstOne.map(a => web3.utils.toChecksumAddress(a)), [accounts[1]], "expected first element");

                    const middle = await functionUnderTest(1, 1);
                    assert.deepEqual(middle.map(a => web3.utils.toChecksumAddress(a)), [accounts[2]], "expected middle element");

                    const empty = await functionUnderTest(1, 0);
                    assert.deepEqual(empty, [], "expected empty list");
                });
            });
        });
    });

    describe('when calling the leave() function', () => {
        it('should fail if sender is not a guardian, and succeed if it is', async () => {
            await driver.deployGuardians();
            await assertReject(driver.OrbsGuardians.leave(), "expected leave to fail if not registered");

            await driver.OrbsGuardians.register("some name", "some website", {from: accounts[1], value: driver.registrationDeposit});
            await driver.OrbsGuardians.register("some name", "some website", {from: accounts[2], value: driver.registrationDeposit});
            await driver.OrbsGuardians.register("some name", "some website", {from: accounts[3], value: driver.registrationDeposit});

            await driver.OrbsGuardians.leave({from: accounts[1]});

            const remainingTwo = await driver.OrbsGuardians.getGuardians(0, 10);
            assert.deepEqual(remainingTwo, [accounts[3], accounts[2]], "expected three elements");

            await driver.OrbsGuardians.leave({from: accounts[2]});

            const remainingOne = await driver.OrbsGuardians.getGuardians(0, 10);
            assert.deepEqual(remainingOne, [accounts[3]], "expected three elements");

            await driver.OrbsGuardians.leave({from: accounts[3]});

            const noneLeft = await driver.OrbsGuardians.getGuardians(0, 10);
            assert.deepEqual(noneLeft, [], "expected an empty list after everyone left");
        });

        it('should refund registration deposit', async () => {
            await driver.deployGuardians();

            await driver.OrbsGuardians.register("some name", "some website", {from: accounts[1], value: driver.registrationDeposit});

            const gasPrice = await web3.eth.getGasPrice(); // the current going price
            const accountBalanceBeforeLeave = await web3.eth.getBalance(accounts[1]);

            // leave
            const result = await assertResolve(driver.OrbsGuardians.leave({
                from: accounts[1],
                gasPrice: gasPrice
            }), "expected an exact deposit to succeed registration");

            const txCost = result.receipt.gasUsed * gasPrice;
            const accountBalanceAfterLeave = await web3.eth.getBalance(accounts[1]);

            const balanceDifference = web3.utils.toBN(accountBalanceAfterLeave)
                .sub(web3.utils.toBN(accountBalanceBeforeLeave))
                .add(web3.utils.toBN(txCost))
                .toString();

            assert.equal(
                balanceDifference,
                driver.registrationDeposit,
                `expected deposit to be returned to account balance (refunded ${balanceDifference})`
            );

            const contractBalanceAfter = await web3.eth.getBalance(driver.OrbsGuardians.address);
            assert.equal(
                contractBalanceAfter,
                '0',
                "expected contract to have no balance left after refund"
            );
        });
    });

    describe('when calling the reviewRegistration() function', () => {
        it('should return the same as getGuardianData(from)', async () => {
            await driver.deployGuardians();

            await assertReject(driver.OrbsGuardians.reviewRegistration({from: accounts[1]}), "expected review registration to fail before registration");

            await driver.OrbsGuardians.register("some name", "some website", {from: accounts[1], value: driver.registrationDeposit});

            const getterData = await driver.OrbsGuardians.getGuardianData(accounts[1]);
            const reviewData = await driver.OrbsGuardians.reviewRegistration({from: accounts[1]});

            assert.deepEqual(getterData, reviewData, "expected ")
        });
    });
});
