const BigNumber = web3.BigNumber;

const StableToken = artifacts.require('StableToken');

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

contract('StableToken', (accounts) => {
    const creator = accounts[0];
    const acc1 = accounts[1];
    const acc2 = accounts[2];
    const acc3 = accounts[3];
    const acc4 = accounts[4];

    beforeEach(async function () {
        const burnable = true;
        const pausable = true;
        this.token = await StableToken.new('StableToken', 'CTUSDT', 'USD', burnable, pausable);
    });

    describe('(unit tests)', () => {
        describe('initialized contract', () => {
            it('should allow mints, burns and transfers', async function () {
                await this.token.mint(acc1, 100, { from: creator }).should.be.fulfilled;
                await this.token.mint(acc2, 200, { from: creator }).should.be.fulfilled;
                await this.token.burnFor(acc2, 100, { from: creator }).should.be.fulfilled;
                await this.token.transfer(acc2, 50, { from: acc1 }).should.be.fulfilled;

                let balance1 = await this.token.balanceOf(acc1);
                let balance2 = await this.token.balanceOf(acc2);
                assert.equal(balance1.toNumber(), 50);
                assert.equal(balance2.toNumber(), 150);
            });
        });

        describe('enableTransfers()', () => {
            it('should fail if called by non-owner', async function () {
                const te = await this.token.transfersEnabled();
                assert.equal(te, true);
                await this.token.enableTransfers(false, { from: acc1 }).should.be.rejectedWith('revert');
                const te2 = await this.token.transfersEnabled();
                assert.equal(te2, true);
            });

            it('should block transfers', async function () {
                const te = await this.token.transfersEnabled();
                assert.equal(te, true);
                await this.token.enableTransfers(false, { from: creator }).should.be.fulfilled;
                const te2 = await this.token.transfersEnabled();
                assert.equal(te2, false);

                await this.token.mint(acc1, 100, { from: creator }).should.be.fulfilled;
                await this.token.transfer(acc2, 50, { from: acc1 }).should.be.rejectedWith('revert');

                let balance1 = await this.token.balanceOf(acc1);
                let balance2 = await this.token.balanceOf(acc2);
                assert.equal(balance1.toNumber(), 100);
                assert.equal(balance2.toNumber(), 0);
            });
        });

        describe('Ownable.transferOwnership()', () => {
            it('should fail if called by non-owner', async function () {
                await this.token.transferOwnership(acc2, { from: acc1 }).should.be.rejectedWith('revert');
            });

            it('should change the ownership', async function () {
                await this.token.transferOwnership(acc2, { from: creator }).should.be.fulfilled;
                await this.token.transferOwnership(acc2, { from: creator }).should.be.rejectedWith('revert');
            });
        });

        describe('Pausable.pause()', () => {
            it('should fail if called by non-owner', async function () {
                await this.token.pause({ from: acc1 }).should.be.rejectedWith('revert');
            });

            it('should fail if token is non-pausable', async () => {
                const burnable = true;
                const pausable = false;
                let token2 = await StableToken.new('StableToken', 'CTUSDT', 'USD', burnable, pausable);
                await token2.pause({ from: creator }).should.be.rejectedWith('revert');
            });

            it('should block mint, burn and transfer', async function () {
                await this.token.mint(acc1, 100, { from: creator }).should.be.fulfilled;
                await this.token.pause({ from: creator }).should.be.fulfilled;

                await this.token.mint(acc2, 200, { from: creator }).should.be.rejectedWith('revert');
                await this.token.burnFor(acc2, 100, { from: creator }).should.be.rejectedWith('revert');
                await this.token.transfer(acc2, 5, { from: acc1 }).should.be.rejectedWith('revert');
            });
        });

        describe('Pausable.unpause()', () => {
            it('should fail if called by non-owner', async function () {
                await this.token.unpause({ from: acc1 }).should.be.rejectedWith('revert');
            });

            it('should fail if not paused already', async function () {
                await this.token.unpause({ from: creator }).should.be.rejectedWith('revert');
            });

            it('should fail if token is non-pausable', async () => {
                const burnable = true;
                const pausable = false;
                let token2 = await StableToken.new('StableToken', 'CTUSDT', 'USD', burnable, pausable);
                await token2.unpause({ from: creator }).should.be.rejectedWith('revert');
            });

            it('should unpause the minting and burning', async function () {
                await this.token.pause({ from: creator }).should.be.fulfilled;
                await this.token.unpause({ from: creator }).should.be.fulfilled;

                await this.token.mint(acc2, 200, { from: creator }).should.be.fulfilled;
                await this.token.burnFor(acc2, 100, { from: creator }).should.be.fulfilled;
                await this.token.transfer(acc1, 5, { from: acc2 }).should.be.fulfilled;
            });
        });

        describe('MintableToken.mint()', () => {
            it('should fail if called by non-owner', async function () {
                await this.token.mint(acc2, 100, { from: acc1 }).should.be.rejectedWith('revert');
            });

            it('should fail if token is paused', async function () {
                await this.token.pause({ from: creator }).should.be.fulfilled;
                await this.token.mint(acc2, 100, { from: creator }).should.be.rejectedWith('revert');
            });

            it('should be callable by owner', async function () {
                await this.token.mint(acc2, 100, { from: creator }).should.be.fulfilled;
            });
        });

        // finishMinting was removed from the OpenZeppelin 2.0
        /*
        describe('MintableToken.finishMinting()', function () {
            it('should fail if called by non-owner', async function () {
                await this.token.finishMinting({ from: acc1 }).should.be.rejectedWith('revert');
            });

            it('should not allow minting after', async function () {
                await this.token.finishMinting({ from: creator }).should.be.fulfilled;
                await this.token.mint(acc2, 100, { from: creator}).should.be.rejectedWith('revert');
            });
        });
        */

        describe('BurnableToken.burn()', () => {
            it('should fail if called by non-owner', async function () {
                await this.token.burn(100, { from: acc1 }).should.be.rejectedWith('revert');
            });

            it('should fail if token is not burnable', async () => {
                const burnable = true;
                const pausable = false;
                let token2 = await StableToken.new('StableToken', 'CTUSDT', 'USD', burnable, pausable);

                await token2.mint(acc2, 100, { from: creator }).should.be.fulfilled;
                await token2.burn(100, { from: creator }).should.be.rejectedWith('revert');
            });

            it('should fail called by owner too', async function () {
                await this.token.mint(acc2, 100, { from: creator }).should.be.fulfilled;
                await this.token.burn(100, { from: creator }).should.be.rejectedWith('revert');
                await this.token.burn(100, { from: acc2 }).should.be.rejectedWith('revert');
            });
        });

        describe('BurnableToken.burnFor()', () => {
            beforeEach(async () => {
                const burnable = true;
                const pausable = true;
                token2 = await StableToken.new('StableToken', 'CTUSDT', 'USD', burnable, pausable);
                await token2.mint(acc2, 200, { from: creator }).should.be.fulfilled;
            });

            it('should fail if called by non-owner', async () => {
                await token2.burnFor(acc2, 100, { from: acc1 }).should.be.rejectedWith('revert');
                let balance1 = await token2.balanceOf(acc2);
                assert.equal(balance1.toNumber(), 200);
            });

            it('should fail if token is paused', async () => {
                await token2.pause({ from: creator }).should.be.fulfilled;
                await token2.burnFor(acc2, 100, { from: creator }).should.be.rejectedWith('revert');
                const balance1 = await token2.balanceOf(acc2);
                assert.equal(balance1.toNumber(), 200);
            });

            it('should fail if token is not burnable', async () => {
                const burnable = false;
                const pausable = true;
                let token3 = await StableToken.new('StableToken', 'CTUSDT', 'USD', burnable, pausable);

                await token3.mint(acc2, 200, { from: creator }).should.be.fulfilled;
                await token3.burnFor(acc2, 100, { from: creator }).should.be.rejectedWith('revert');
            });

            it('should succeed if called by owner', async () => {
                await token2.burnFor(acc2, 100, { from: creator }).should.be.fulfilled;
                const balance2 = await token2.balanceOf(acc2);
                assert.equal(balance2.toNumber(), 100);
            });
        });

        describe('ERC20.transfer()', () => {
            it('should fail if balance is ZERO', async function () {
                await this.token.transfer(acc2, 1, { from: acc1 }).should.be.rejectedWith('revert');
            });

            it('should succeed if balance is non-ZERO', async function () {
                await this.token.mint(acc1, 100, { from: creator }).should.be.fulfilled;
                await this.token.transfer(acc2, 1, { from: acc1 }).should.be.fulfilled;

                const balance1 = await this.token.balanceOf(acc1);
                const balance2 = await this.token.balanceOf(acc2);
                assert.equal(balance1.toNumber(), 99);
                assert.equal(balance2.toNumber(), 1);
            });
        });

        describe('ERC20.transferFrom()', () => {
            // TODO:
            //
        });

        describe('balanceOfInCents()', () => {
            beforeEach(async function () {
                await this.token.mint(acc2, 1000000, { from: creator }).should.be.fulfilled;
                await this.token.mint(acc3, 10000, { from: creator }).should.be.fulfilled;
                await this.token.mint(acc4, 1000, { from: creator }).should.be.fulfilled;
            });

            it('should return correct number for acc1', async function () {
                const b1 = await this.token.balanceOfInCents(acc1, { from: acc1 }).should.be.fulfilled;
                assert.equal(b1.toNumber(), 0);
            });

            it('should return correct number for acc2', async function () {
                const b2 = await this.token.balanceOfInCents(acc2, { from: acc1 }).should.be.fulfilled;
                assert.equal(b2.toNumber(), 1000000);
            });

            it('should return correct number for acc3', async function () {
                const b3 = await this.token.balanceOfInCents(acc3, { from: acc1 }).should.be.fulfilled;
                assert.equal(b3.toNumber(), 10000);
            });

            it('should return correct number for acc4', async function () {
                const b4 = await this.token.balanceOfInCents(acc4, { from: acc1 }).should.be.fulfilled;
                assert.equal(b4.toNumber(), 1000);
            });
        });
    });
});
