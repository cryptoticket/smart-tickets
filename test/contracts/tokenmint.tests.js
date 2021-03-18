const BigNumber = web3.BigNumber;

const TokenMint = artifacts.require('TokenMint');
const StableToken = artifacts.require('StableToken');

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

contract('TokenMint', (accounts) => {
    const creator = accounts[0];
    const acc1 = accounts[1];
    const acc2 = accounts[2];
    const acc3 = accounts[3];

    beforeEach(async function () {
        this.mint = await TokenMint.new('Crypto.Tickets');
    });

    describe('(unit tests)', () => {
        describe('initialized contract', () => {
            it('should return correct controlledBy', async function () {
                const cb = await this.mint.controlledBy().should.be.fulfilled;
                assert.equal(cb, 'Crypto.Tickets');
            });

            it('should return correct currencies count', async function () {
                const cc = await this.mint.getCurrenciesCount();
                assert.equal(cc.toNumber(), 0);
            });
        });

        describe('getMintersCount', () => {
            it('should fail if no currency was added', async function () {
                await this.mint.getMintersCount(0).should.be.rejectedWith('revert');
            });
        });

        describe('addCurrency', () => {
            it('should fail if called by non-owner', async function () {
                await this.mint.addCurrency('CTUSDT', 'USD', { from: acc1 }).should.be.rejectedWith('revert');
            });

            it('should add new currency', async function () {
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;
                const cc = await this.mint.getCurrenciesCount();
                assert.equal(cc.toNumber(), 1);
            });
        });

        describe('addMinter', () => {
            it('should fail if called by non-owner', async function () {
                await this.mint.addMinter(0, acc2, { from: acc1 }).should.be.rejectedWith('revert');
            });

            it('should fail if no currency added ', async function () {
                await this.mint.addMinter(0, acc2, { from: creator }).should.be.rejectedWith('revert');
            });

            it('should add new minter', async function () {
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;

                const cc = await this.mint.getMintersCount(0);
                assert.equal(cc.toNumber(), 0);

                await this.mint.addMinter(0, acc2, { from: creator }).should.be.fulfilled;

                const cc2 = await this.mint.getMintersCount(0);
                assert.equal(cc2.toNumber(), 1);
            });

            it('should add 2 minters to one currency', async function () {
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;

                const cc = await this.mint.getMintersCount(0);
                assert.equal(cc.toNumber(), 0);

                await this.mint.addMinter(0, acc2, { from: creator }).should.be.fulfilled;
                await this.mint.addMinter(0, acc3, { from: creator }).should.be.fulfilled;
                const cc2 = await this.mint.getMintersCount(0);
                assert.equal(cc2.toNumber(), 2);

                const b = await this.mint.isMinter(0, acc2);
                const b2 = await this.mint.isMinter(0, acc3);
                assert.equal(b, 1);
                assert.equal(b2, 1);

                const a1 = await this.mint.getMinterAt(0, 0);
                assert.equal(a1, acc2);
                const a2 = await this.mint.getMinterAt(0, 1);
                assert.equal(a2, acc3);
            });

            it('should add 1 minter to one currency, and 1 minter to other', async function () {
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;
                await this.mint.addCurrency('CTEURT', 'EUR', { from: creator }).should.be.fulfilled;

                const cc = await this.mint.getMintersCount(0);
                assert.equal(cc.toNumber(), 0);
                const cc1 = await this.mint.getMintersCount(1);
                assert.equal(cc1.toNumber(), 0);

                await this.mint.addMinter(0, acc2, { from: creator }).should.be.fulfilled;
                await this.mint.addMinter(1, acc3, { from: creator }).should.be.fulfilled;
                const cc2 = await this.mint.getMintersCount(0);
                assert.equal(cc2.toNumber(), 1);
                const cc3 = await this.mint.getMintersCount(1);
                assert.equal(cc3.toNumber(), 1);

                const b = await this.mint.isMinter(0, acc2);
                const b2 = await this.mint.isMinter(0, acc3);
                assert.equal(b, 1);
                assert.equal(b2, 0);
                const b3 = await this.mint.isMinter(1, acc3);
                assert.equal(b3, 1);

                const a1 = await this.mint.getMinterAt(0, 0);
                assert.equal(a1, acc2);
                const a2 = await this.mint.getMinterAt(1, 0);
                assert.equal(a2, acc3);
            });
        });

        describe('removeMinter', () => {
            it('should fail if called by non-owner', async function () {
                const minterIndex = 0;
                await this.mint.removeMinter(0, minterIndex, { from: acc1 }).should.be.rejectedWith('revert');
            });

            it('should fail if no currency added', async function () {
                const minterIndex = 0;
                await this.mint.removeMinter(0, minterIndex, { from: creator }).should.be.rejectedWith('revert');
            });

            it('should fail if no minter was added', async function () {
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;
                const minterIndex = 0;
                await this.mint.removeMinter(0, minterIndex, { from: creator }).should.be.rejectedWith('revert');
            });

            it('should remove minter', async function () {
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;
                await this.mint.addMinter(0, acc2, { from: creator }).should.be.fulfilled;
                const minterIndex = 0;
                await this.mint.removeMinter(0, minterIndex, { from: creator }).should.be.fulfilled;
            });
        });


        describe('mint', () => {
            beforeEach(async function () {
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;
                await this.mint.addMinter(0, acc1, { from: creator }).should.be.fulfilled;
            });

            it('should fail if called by non-minter (event if creator)', async function () {
                await this.mint.mint(0, acc1, 100, { from: creator }).should.be.rejectedWith('revert');
            });

            it('should fail if called by non-minter', async function () {
                await this.mint.mint(0, acc1, 100, { from: acc2 }).should.be.rejectedWith('revert');
            });

            it('should fail if currency index is bad', async function () {
                await this.mint.mint(1, acc1, 100, { from: acc1 }).should.be.rejectedWith('revert');
            });

            it('should mint and update history if called by minter', async function () {
                // mint me some tokens
                await this.mint.mint(0, acc1, 100, { from: acc1 }).should.be.fulfilled;

                // check history
                let ret = await this.mint.getMinterHistoryAtIndex(0, acc1);
                assert.equal(ret[0].toNumber(), 100);
                assert.equal(ret[1].toNumber(), 0);

                // check balance
                const tokenAddress = await this.mint.getTokenAddress(0);
                const st = await StableToken.at(tokenAddress);
                const balance = await st.balanceOf(acc1);
                assert.equal(balance.toNumber(), 100);
            });
        });

        describe('burn', () => {
            beforeEach(async function () {
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;
                // acc1 is a miner
                await this.mint.addMinter(0, acc1, { from: creator }).should.be.fulfilled;
                // acc2 wants some tokens
                await this.mint.mint(0, acc2, 100, { from: acc1 }).should.be.fulfilled;
            });

            it('should fail if called by non-minter (event if creator)', async function () {
                await this.mint.burnFor(0, acc2, 50, { from: creator }).should.be.rejectedWith('revert');
            });

            it('should fail if called by non-minter', async function () {
                await this.mint.burnFor(0, acc2, 50, { from: acc3 }).should.be.rejectedWith('revert');
            });

            it('should fail if currency index is bad', async function () {
                await this.mint.burnFor(1, acc2, 50, { from: acc1 }).should.be.rejectedWith('revert');
            });

            it('should burn and update history if called by minter', async function () {
                // burn it!
                await this.mint.burnFor(0, acc2, 50, { from: acc1 }).should.be.fulfilled;

                // check history
                let ret = await this.mint.getMinterHistoryAtIndex(0, acc1);
                assert.equal(ret[0].toNumber(), 100);
                assert.equal(ret[1].toNumber(), 50);
            });
        });

        describe('getCurrencyInfo', () => {
            beforeEach(async function () {
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;
                await this.mint.addMinter(0, acc1, { from: creator }).should.be.fulfilled;
            });

            it('should fail if index is incorrect', async function () {
                await this.mint.getCurrencyInfo(1).should.be.rejectedWith('revert');
            });

            it('should return correct currency and symbol', async function () {
                const ret = await this.mint.getCurrencyInfo(0).should.be.fulfilled;
                assert.equal(ret[0], 'CTUSDT');
                assert.equal(ret[1], 'USD');
            });
        });

        // TODO: test history.calls
    });
});
