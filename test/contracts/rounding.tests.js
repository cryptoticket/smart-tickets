const BigNumber = web3.BigNumber;

const Rounding = artifacts.require('Rounding');

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

contract('Event', (accounts) => {
    const ct = accounts[3];

    beforeEach(async function () {
        this.r = await Rounding.new({ from: ct });
    });

    describe('(unit tests)', () => {
        describe('Rounding contract', () => {
            beforeEach(async () => {

            });

            describe('unitsToCents', () => {
                it('should return correct result', async function () {
                    // 0.49 cents -> 0 cents
                    // 0.5 cents -> 0 cents
                    // 0.51 cents -> 1 cents

                    // 1.49 cents -> 1 cents
                    // 1.5 cents -> 2 cents
                    // 1.51 cents -> 2 cents

                    // 2.49 cents -> 2 cents
                    // 2.5 cents -> 2 cents
                    // 2.51 cents -> 3 cents
                    assert.equal(await this.r.unitsToCents(49), 0);
                    assert.equal(await this.r.unitsToCents(50), 0);
                    assert.equal(await this.r.unitsToCents(51), 1);

                    assert.equal(await this.r.unitsToCents(149), 1);
                    assert.equal(await this.r.unitsToCents(150), 2);
                    assert.equal(await this.r.unitsToCents(151), 2);

                    assert.equal(await this.r.unitsToCents(249), 2);
                    assert.equal(await this.r.unitsToCents(250), 2);
                    assert.equal(await this.r.unitsToCents(251), 3);

                    // 24.9 cents -> 25 cents
                    // 25.0 cents -> 25 cents
                    // 25.1 cents -> 25 cents
                    // 25.15 cents -> 25 cents
                    assert.equal(await this.r.unitsToCents(2490), 25);
                    assert.equal(await this.r.unitsToCents(2500), 25);
                    assert.equal(await this.r.unitsToCents(2510), 25);
                    assert.equal(await this.r.unitsToCents(2515), 25);

                    // 5000 cents -> 5000 cents
                    assert.equal(await this.r.unitsToCents(500000), 5000);

                    // 100.86 cents -> 101
                    assert.equal(await this.r.unitsToCents(10086), 101);
                });
            });
        });
    });
});
