const BigNumber = web3.BigNumber;

const SimpleBillingProcessor2 = artifacts.require('SimpleBillingProcessor2');
const TokenMint = artifacts.require('TokenMint');
const StableToken = artifacts.require('StableToken');

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

contract('SimpleBillingProcessor2', (accounts) => {
    const creator = accounts[0];
    const acc1 = accounts[1];
    const acc2 = accounts[2];
    const acc3 = accounts[3];
    const acc4 = accounts[4];
    const acc5 = accounts[5];
    const acc6 = accounts[6];

    beforeEach(async function () {
        this.mint = await TokenMint.new('Crypto.Tickets');
        this.billing = await SimpleBillingProcessor2.new(acc1, this.mint.address);
    });

    describe('(unit tests)', () => {
        describe('initialized contract', () => {
            it('should return correct getContractVersion()', async function () {
                const version = await this.billing.getContractVersion().should.be.fulfilled;
                assert.equal(version, 'SimpleBillingProcessor2');
            });

            it('should return getEventsCount', async function () {
                const c = await this.billing.getEventsCount().should.be.fulfilled;
                assert.equal(c.toNumber(), 0);
            });
        });

        describe('registerEventContract', () => {
            it('should fail if called by non-owner', async function () {
                await this.billing.registerEventContract(acc2, { from: acc1 }).should.be.rejectedWith('revert');
            });

            it('should add new event', async function () {
                // add acc2 as an event contract ...
                await this.billing.registerEventContract(acc2, { from: creator }).should.be.fulfilled;
                const ier = await this.billing.isEventRegistered(acc2);
                assert.equal(ier, true);

                const c = await this.billing.getEventsCount().should.be.fulfilled;
                assert.equal(c.toNumber(), 1);

                const ret = await this.billing.getEventAtIndex2(0).should.be.fulfilled;
                assert.equal(ret[0], acc2);
            });
        });

        describe('registerEventContract', () => {
            it('should fail if called by non-owner', async function () {
                await this.billing.registerEventContract(acc2, { from: acc1 }).should.be.rejectedWith('revert');
            });

            it('should add new event', async function () {
                // add acc2 as an event contract ...
                await this.billing.registerEventContract(acc2, { from: creator }).should.be.fulfilled;
                const ier = await this.billing.isEventRegistered(acc2);
                assert.equal(ier, true);

                const c = await this.billing.getEventsCount().should.be.fulfilled;
                assert.equal(c.toNumber(), 1);
            });

            it('should add new event and return default rules', async function () {
                // add acc2 as an event contract ...
                await this.billing.registerEventContract(acc2, { from: creator }).should.be.fulfilled;
                const ier = await this.billing.isEventRegistered(acc2);
                assert.equal(ier, true);

                const ret = await this.billing.getEventAtIndex2(0).should.be.fulfilled;
                assert.equal(ret[0], acc2);
                assert.equal(ret[1], 230000);
                assert.equal(ret[2], 500000);
                assert.equal(ret[3], 100000);
            });
        });

        describe('registerEventContractCustomRules2', () => {
            it('should fail if called by non-owner', async function () {
                await this.billing.registerEventContractCustomRules2(acc2, 500000, 1000000, 0, { from: acc1 }).should.be.rejectedWith('revert');
            });

            it('should not add event with bad orgGets', async function () {
                // add acc2 as an event contract ...
                const totalFee = 1000000;
                const orgGets = 1100000;
                const refGets = 100000;
                await this.billing.registerEventContractCustomRules2(acc2, totalFee, orgGets, refGets, { from: creator }).should.be.rejectedWith('revert');
                const ier = await this.billing.isEventRegistered(acc2);
                assert.equal(ier, false);

                const c = await this.billing.getEventsCount().should.be.fulfilled;
                assert.equal(c.toNumber(), 0);
            });

            it('should add new event even if totalFee is more than 100%', async function () {
                // add acc2 as an event contract ...
                const totalFee = 1100000;
                const orgGets = 200000;
                const refGets = 100000;
                await this.billing.registerEventContractCustomRules2(acc2, totalFee, orgGets, refGets, { from: creator }).should.be.fulfilled;
                const ier = await this.billing.isEventRegistered(acc2);
                assert.equal(ier, true);

                const c = await this.billing.getEventsCount().should.be.fulfilled;
                assert.equal(c.toNumber(), 1);
            });

            it('should add new event', async function () {
                // add acc2 as an event contract ...
                const totalFee = 500000;
                const orgGets = 200000;
                const refGets = 100000;
                await this.billing.registerEventContractCustomRules2(acc2, totalFee, orgGets, refGets, { from: creator }).should.be.fulfilled;
                const ier = await this.billing.isEventRegistered(acc2);
                assert.equal(ier, true);

                const c = await this.billing.getEventsCount().should.be.fulfilled;
                assert.equal(c.toNumber(), 1);
            });

            it('should add new event and return correct params', async function () {
                const totalFee = 500000;
                const orgGets = 200000;
                const refGets = 100000;
                await this.billing.registerEventContractCustomRules2(acc2, totalFee, orgGets, refGets, { from: creator }).should.be.fulfilled;

                const ret = await this.billing.getEventAtIndex2(0).should.be.fulfilled;
                assert.equal(ret[0], acc2);
                assert.equal(ret[1], 500000);
                assert.equal(ret[2], 200000);
                assert.equal(ret[3], 100000);
            });

            it('should not allow ref to get more than org', async function () {
                const totalFee = 500000;
                const orgGets = 200000;
                const refGets = 300000;
                await this.billing.registerEventContractCustomRules2(acc2, totalFee, orgGets, refGets, { from: creator }).should.be.rejectedWith('revert');
            });
        });

        describe('updateEventContractCustomRules2', () => {
            beforeEach(async function () {
                const totalFee = 500000;
                const orgGets = 200000;
                const refGets = 100000;
                await this.billing.registerEventContractCustomRules2(acc2, totalFee, orgGets, refGets, { from: creator }).should.be.fulfilled;
            });

            it('should fail if called by non-owner', async function () {
                await this.billing.updateEventContractCustomRules2(acc2, 500000, 1000000, 100000, { from: acc1 }).should.be.rejectedWith('revert');
            });

            it('should fail if no such event by non-owner', async function () {
                await this.billing.updateEventContractCustomRules2(acc3, 500000, 1000000, 100000, { from: creator }).should.be.rejectedWith('revert');
            });

            it('should not update params if orgGets > 100%', async function () {
                // add acc2 as an event contract ...
                const totalFee = 1000000;
                const orgGets = 1100000;
                const refGets = 100000;
                await this.billing.updateEventContractCustomRules2(acc2, totalFee, orgGets, refGets, { from: creator }).should.be.rejectedWith('revert');
            });

            it('should update params even if totalFee is more than 100%', async function () {
                // add acc2 as an event contract ...
                const totalFee = 1100000;
                const orgGets = 200000;
                const refGets = 100000;
                await this.billing.updateEventContractCustomRules2(acc2, totalFee, orgGets, refGets, { from: creator }).should.be.fulfilled;
                const ier = await this.billing.isEventRegistered(acc2);
                assert.equal(ier, true);

                const c = await this.billing.getEventsCount().should.be.fulfilled;
                assert.equal(c.toNumber(), 1);

                const ret = await this.billing.getEventAtIndex2(0).should.be.fulfilled;
                assert.equal(ret[0], acc2);
                assert.equal(ret[1], 1100000);
                assert.equal(ret[2], 200000);
                assert.equal(ret[3], 100000);

                const ret2 = await this.billing.getEventContractRules2(acc2).should.be.fulfilled;
                assert.equal(ret2[0], 1100000);
                assert.equal(ret2[1], 200000);
                assert.equal(ret2[2], 100000);
            });

            it('should update params', async function () {
                // add acc2 as an event contract ...
                const totalFee = 600000;
                const orgGets = 250000;
                const refGets = 250000;
                await this.billing.updateEventContractCustomRules2(acc2, totalFee, orgGets, refGets, { from: creator }).should.be.fulfilled;
                const ier = await this.billing.isEventRegistered(acc2);
                assert.equal(ier, true);

                const c = await this.billing.getEventsCount().should.be.fulfilled;
                assert.equal(c.toNumber(), 1);

                const ret = await this.billing.getEventAtIndex2(0).should.be.fulfilled;
                assert.equal(ret[0], acc2);
                assert.equal(ret[1], 600000);
                assert.equal(ret[2], 250000);
                assert.equal(ret[3], 250000);
            });

            it('should not allow to update if ref gets more than org', async function () {
                // add acc2 as an event contract ...
                const totalFee = 600000;
                const orgGets = 250000;
                const refGets = 350000;
                await this.billing.updateEventContractCustomRules2(acc2, totalFee, orgGets, refGets, { from: creator }).should.be.rejectedWith('revert');
            });
        });

        describe('isEventRegistered', () => {
            it('should return false if event was never added', async function () {
                const ier = await this.billing.isEventRegistered(acc2);
                assert.equal(ier, false);
            });

            it('should return true if event was added before', async function () {
                // add acc2 as an event contract ...
                const totalFee = 500000;
                const orgGets = 700000;
                const refGets = 100000;
                await this.billing.registerEventContractCustomRules2(acc2, totalFee, orgGets, refGets, { from: creator });

                const ier = await this.billing.isEventRegistered(acc2);
                assert.equal(ier, true);
            });
        });

        describe('getEventsCount', () => {
            it('should return 0 if event was never added', async function () {
                const c = await this.billing.getEventsCount().should.be.fulfilled;
                assert.equal(c.toNumber(), 0);
            });

            it('should return 1 if one event was added before', async function () {
                // add acc2 as an event contract ...
                const totalFee = 500000;
                const orgGets = 700000;
                const refGets = 100000;
                await this.billing.registerEventContractCustomRules2(acc2, totalFee, orgGets, refGets, { from: creator });

                const c = await this.billing.getEventsCount().should.be.fulfilled;
                assert.equal(c.toNumber(), 1);
            });

            it('should return 2 if two event was added before', async function () {
                // 1 - add acc2 as an event contract ...
                const totalFee = 500000;
                const orgGets = 700000;
                const refGets = 100000;
                await this.billing.registerEventContractCustomRules2(acc2, totalFee, orgGets, refGets, { from: creator });

                // 2 - add acc3 as an event contract ...
                const totalFee2 = 400000;
                const orgGets2 = 800000;
                const refGets2 = 100000;
                await this.billing.registerEventContractCustomRules2(acc3, totalFee2, orgGets2, refGets2, { from: creator });

                const c2 = await this.billing.getEventsCount().should.be.fulfilled;
                assert.equal(c2.toNumber(), 2);
            });
        });

        describe('getEventAtIndex2', () => {
            it('should throw if index is bad', async function () {
                await this.billing.getEventAtIndex2(0).should.be.rejectedWith('revert');
            });

            it('should return correct event if index is OK', async function () {
                // add acc2 as an event contract ...
                await this.billing.registerEventContract(acc2, { from: creator }).should.be.fulfilled;
                const ier = await this.billing.isEventRegistered(acc2);
                assert.equal(ier, true);

                const ret = await this.billing.getEventAtIndex2(0).should.be.fulfilled;
                assert.equal(ret[0], acc2);
            });
        });

        describe('calculateFinalPrice', () => {
            it('should revert if no event was added before', async function () {
                // $10.00
                // $30.00
                const ticketUnused = web3.utils.fromAscii('');
                await this.billing.calculateFinalPrice(ticketUnused, 1000, 3000).should.be.rejectedWith('revert');
            });

            it('should revert if called not from event', async function () {
                await this.billing.registerEventContract(acc2, { from: creator }).should.be.fulfilled;

                // $10.00
                // $30.00
                const ticketUnused = web3.utils.fromAscii('');
                await this.billing.calculateFinalPrice(ticketUnused, 1000, 3000, { from: creator }).should.be.rejectedWith('revert');
            });

            it('should return correct values 1 if default event was added', async function () {
                await this.billing.registerEventContract(acc2, { from: creator }).should.be.fulfilled;

                // should be called from EVENT!
                // $10.00
                // $30.00
                const ticketUnused = web3.utils.fromAscii('');
                const val = await this.billing.calculateFinalPrice(ticketUnused, 1000, 3000, { from: acc2 }).should.be.fulfilled;
                assert.equal(val.toNumber(), 3690);
            });

            it('should return correct values 2 if default event was added', async function () {
                await this.billing.registerEventContract(acc2, { from: creator }).should.be.fulfilled;

                // should be called from EVENT!
                // $10.00
                // $10.00
                const ticketUnused = web3.utils.fromAscii('');
                const val = await this.billing.calculateFinalPrice(ticketUnused, 1000, 1000, { from: acc2 }).should.be.fulfilled;
                assert.equal(val.toNumber(), 1230);
            });

            it('should return correct values 3 if default event was added', async function () {
                await this.billing.registerEventContract(acc2, { from: creator }).should.be.fulfilled;

                // should be called from EVENT!
                // $10.00
                // $5.00
                const ticketUnused = web3.utils.fromAscii('');
                const val = await this.billing.calculateFinalPrice(ticketUnused, 1000, 5000, { from: acc2 }).should.be.fulfilled;
                assert.equal(val.toNumber(), 6150);
            });
        });

        describe('onAllocate', () => {
            beforeEach(async function () {
                // 1 - add event
                await this.billing.registerEventContract(acc2, { from: creator }).should.be.fulfilled;

                // 2 - add currency to mint
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;

                // 3 - add billing as minter
                await this.mint.addMinter(0, this.billing.address, { from: creator }).should.be.fulfilled;

                const tokenAddress = await this.mint.getTokenAddress(0);
                this.st = await StableToken.at(tokenAddress);
            });

            it('should revert if called not from event', async function () {
                const ticketUnused = web3.utils.fromAscii('');
                const buyer = acc3;
                const org = acc4;
                const price = 1000; // $10.00

                await this.billing.onAllocate(ticketUnused, this.st.address, buyer, org, price,
                    { from: creator }).should.be.rejectedWith('revert');
            });

            it('should not allocate any tokens', async function () {
                const ticketUnused = web3.utils.fromAscii('');
                const buyer = acc3;
                const org = acc4;
                const price = 1000; // $10.00

                await this.billing.onAllocate(ticketUnused, this.st.address, buyer, org, price,
                    { from: acc2 }).should.be.fulfilled;

                // should not allocate 10 USD to organizer
                const b1 = await this.st.balanceOf(org);
                assert.equal(b1.toNumber(), 0);

                // should update stats
                const s = await this.billing.getStats(acc2).should.be.fulfilled;
                assert.equal(s.sold.toNumber(), 1000);
                assert.equal(s.soldCount.toNumber(), 1);

                assert.equal(s.resold.toNumber(), 0);
                assert.equal(s.resoldCount.toNumber(), 0);

                assert.equal(s.refunded.toNumber(), 0);
                assert.equal(s.refundedCount.toNumber(), 0);
            });

            // TODO: should be rejected if wrong currency
        });

        describe('onTransfer', () => {
            beforeEach(async function () {
                // 1 - add event
                await this.billing.registerEventContract(acc2, { from: creator }).should.be.fulfilled;

                // 2 - add currency to mint
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;

                // 3 - add billing as minter
                await this.mint.addMinter(0, this.billing.address, { from: creator }).should.be.fulfilled;

                const tokenAddress = await this.mint.getTokenAddress(0);
                this.st = await StableToken.at(tokenAddress);
            });

            it('should do nothing', async function () {
                const ticketUnused = web3.utils.fromAscii('');
                const owner = acc3;
                const to = acc1;
                const org = acc4;

                await this.billing.onTransfer(ticketUnused, this.st.address, owner, to, org,
                    { from: acc2 }).should.be.fulfilled;
            });
        });

        describe('onRedeem', () => {
            beforeEach(async function () {
                // 1 - add event
                await this.billing.registerEventContract(acc2, { from: creator }).should.be.fulfilled;

                // 2 - add currency to mint
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;

                // 3 - add billing as minter
                await this.mint.addMinter(0, this.billing.address, { from: creator }).should.be.fulfilled;

                const tokenAddress = await this.mint.getTokenAddress(0);
                this.st = await StableToken.at(tokenAddress);
            });

            it('should do nothing', async function () {
                const ticketUnused = web3.utils.fromAscii('');
                const owner = acc3;
                const org = acc4;

                await this.billing.onRedeem(ticketUnused, this.st.address, owner, org,
                    { from: acc2 }).should.be.fulfilled;
            });
        });

        describe('onSell2', () => {
            beforeEach(async function () {
                // 1 - add event
                await this.billing.registerEventContract(acc2, { from: creator }).should.be.fulfilled;

                // 2 - add currency to mint
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;

                // 3 - add billing as minter
                await this.mint.addMinter(0, this.billing.address, { from: creator }).should.be.fulfilled;
                await this.mint.addMinter(0, creator, { from: creator }).should.be.fulfilled;

                const tokenAddress = await this.mint.getTokenAddress(0);
                this.st = await StableToken.at(tokenAddress);

                // 4 - allocate
                const ticketUnused = web3.utils.fromAscii('');
                const buyer = acc3;
                const org = acc4;
                const price = 2000; // $20.00

                await this.billing.onAllocate(ticketUnused, this.st.address, buyer, org, price,
                    { from: acc2 }).should.be.fulfilled;
            });

            it('should revert if called not from event', async function () {
                const ticketUnused = web3.utils.fromAscii('');
                const owner = acc3;
                const to = acc1;
                const org = acc4;
                const ref = acc5;

                const firstPrice = 1000;// $10.00
                const lastPrice = 1000; // $10.00
                const newPrice = 3000; // $30.00

                await this.billing.onSell2(ticketUnused, this.st.address, owner, to, org, ref,
                    firstPrice, lastPrice, newPrice, false, { from: acc3 }).should.be.rejectedWith('revert');
            });

            it('should sell ticket from acc3 to acc1 (first price==last price)', async function () {
                const ticketUnused = web3.utils.fromAscii('');
                const owner = acc3;
                const buyer = acc5;
                const org = acc4;
                const ref = acc6;

                const firstPrice = 1000;// $10.00
                const lastPrice = 1000; // $10.00
                const newPrice = 3000; // $30.00

                const bOrg1 = await this.st.balanceOf(org);
                const bOwner1 = await this.st.balanceOf(owner);
                const bBuyer1 = await this.st.balanceOf(buyer);
                const bCryptoTickets1 = await this.st.balanceOf(acc1);
                const bRef1 = await this.st.balanceOf(ref);

                await this.billing.onSell2(ticketUnused, this.st.address, owner, buyer, org, ref,
                    firstPrice, lastPrice, newPrice, false, { from: acc2 }).should.be.fulfilled;

                // org earns 40% of the markup = $8
                const bOrg = await this.st.balanceOf(org);
                assert.equal(bOrg - bOrg1, 800);

                // ref get 10% = $2
                const bRef = await this.st.balanceOf(ref);
                assert.equal(bRef - bRef1, 200);

                // seller earns $20
                const bOwner = await this.st.balanceOf(owner);
                assert.equal(bOwner - bOwner1, 2000);

                const bBuyer = await this.st.balanceOf(buyer);
                assert.equal(bBuyer - bBuyer1, 0);

                // $6.90
                const bCryptoTickets = await this.st.balanceOf(acc1);
                assert.equal(bCryptoTickets - bCryptoTickets1, 690);

                // should update stats
                const s = await this.billing.getStats(acc2).should.be.fulfilled;
                assert.equal(s.sold.toNumber(), 2000);
                assert.equal(s.soldCount.toNumber(), 1);

                assert.equal(s.resold.toNumber(), 1000);
                assert.equal(s.resoldCount.toNumber(), 1);

                assert.equal(s.refunded.toNumber(), 0);
                assert.equal(s.refundedCount.toNumber(), 0);
            });

            it('should sell ticket from acc3 to acc1 (first price!=last price)', async function () {
                const ticketUnused = web3.utils.fromAscii('');
                const owner = acc3;
                const buyer = acc5;
                const org = acc4;
                const ref = acc6;

                const firstPrice = 0;// $0.00
                const lastPrice = 1000; // $10.00
                const newPrice = 3000; // $30.00

                const bOrg1 = await this.st.balanceOf(org);
                const bOwner1 = await this.st.balanceOf(owner);
                const bBuyer1 = await this.st.balanceOf(buyer);
                const bCryptoTickets1 = await this.st.balanceOf(acc1);

                await this.billing.onSell2(ticketUnused, this.st.address, owner, buyer, org, ref,
                    firstPrice, lastPrice, newPrice, false, { from: acc2 }).should.be.fulfilled;

                // org earns 40% of the markup = $8
                const bOrg = await this.st.balanceOf(org);
                assert.equal(bOrg - bOrg1, 800);

                // seller earns $20
                const bOwner = await this.st.balanceOf(owner);
                assert.equal(bOwner - bOwner1, 2000);

                const bBuyer = await this.st.balanceOf(buyer);
                assert.equal(bBuyer - bBuyer1, 0);

                // $6.90
                const bCryptoTickets = await this.st.balanceOf(acc1);
                assert.equal(bCryptoTickets - bCryptoTickets1, 690);
            });

            it('should fail if selling ticket from acc3 to acc1 (from balance) if balance is 0', async function () {
                const ticketUnused = web3.utils.fromAscii('');
                const owner = acc3;
                const buyer = acc5;
                const org = acc4;

                const lastPrice = 1000; // $10.00
                const newPrice = 3000; // $30.00

                // DO NOT MINT here!
                // await this.mint.mint(0, buyer, finalPrice, {from: creator});

                await this.billing.onSell2(ticketUnused, this.st.address, owner, buyer, org, acc5,
                    lastPrice, lastPrice, newPrice, true, { from: acc2 }).should.be.rejectedWith('revert');
            });

            it('should sell ticket from acc3 to acc1 (from balance, first price==last price)', async function () {
                const ticketUnused = web3.utils.fromAscii('');
                const owner = acc3;
                const buyer = acc5;
                const org = acc4;
                const ref = acc6;

                const firstPrice = 0; // $0.00
                const lastPrice = 1000; // $10.00
                const newPrice = 3000; // $30.00
                const finalPrice = 3690;

                // mint some tokens to 'buyer'
                await this.mint.mint(0, buyer, finalPrice, { from: creator });

                const bOrg1 = await this.st.balanceOf(org);
                const bOwner1 = await this.st.balanceOf(owner);
                const bBuyer1 = await this.st.balanceOf(buyer);
                const bCryptoTickets1 = await this.st.balanceOf(acc1);

                await this.billing.onSell2(ticketUnused, this.st.address, owner, buyer, org, ref,
                    firstPrice, lastPrice, newPrice, true, { from: acc2 }).should.be.fulfilled;

                // org earns 40% of the markup = $8
                const bOrg = await this.st.balanceOf(org);
                assert.equal(bOrg - bOrg1, 800);

                // seller earns $20
                const bOwner = await this.st.balanceOf(owner);
                assert.equal(bOwner - bOwner1, 2000);

                const bBuyer = await this.st.balanceOf(buyer);
                assert.equal(bBuyer1 - bBuyer, finalPrice);

                // $6.90
                const bCryptoTickets = await this.st.balanceOf(acc1);
                assert.equal(bCryptoTickets - bCryptoTickets1, 690);
            });

            it('should round everything correctly', async function () {
                const ticketUnused = web3.utils.fromAscii('');
                const owner = acc3;
                const buyer = acc5;
                const org = acc4;
                const ref = acc6;

                const lastPrice = 100; // 100 cents
                const newPrice = 300; // 300 cents

                const bOrg1 = await this.st.balanceOf(org);
                const bOwner1 = await this.st.balanceOf(owner);
                const bBuyer1 = await this.st.balanceOf(buyer);
                const bCryptoTickets1 = await this.st.balanceOf(acc1);

                await this.billing.onSell2(ticketUnused, this.st.address, owner, buyer, org, ref,
                    lastPrice, lastPrice, newPrice, false, { from: acc2 }).should.be.fulfilled;

                const bOrg = await this.st.balanceOf(org);
                const bOrgDiff = bOrg - bOrg1;
                assert.equal(bOrgDiff, 80);

                const bOwner = await this.st.balanceOf(owner);
                const bOwnerDiff = bOwner - bOwner1;
                assert.equal(bOwnerDiff, 200);

                const bBuyer = await this.st.balanceOf(buyer);
                const bBuyerDiff = bBuyer - bBuyer1;
                assert.equal(bBuyerDiff, 0);

                const bCryptoTickets = await this.st.balanceOf(acc1);
                const bCryptoDiff = bCryptoTickets - bCryptoTickets1;
                // $0.69
                assert.equal(bCryptoDiff, 69);
            });

            it('should round everything correctly 2', async function () {
                const ticketUnused = web3.utils.fromAscii('');
                const owner = acc3;
                const buyer = acc5;
                const org = acc4;
                const ref = acc6;

                const lastPrice = 10; // 10 cents
                const newPrice = 30; // 30 cents

                const bOrg1 = await this.st.balanceOf(org);
                const bOwner1 = await this.st.balanceOf(owner);
                const bBuyer1 = await this.st.balanceOf(buyer);
                const bCryptoTickets1 = await this.st.balanceOf(acc1);

                await this.billing.onSell2(ticketUnused, this.st.address, owner, buyer, org, ref,
                    lastPrice, lastPrice, newPrice, false, { from: acc2 }).should.be.fulfilled;

                const bOrg = await this.st.balanceOf(org);
                const bOrgDiff = bOrg - bOrg1;
                assert.equal(bOrgDiff, 8);

                const bOwner = await this.st.balanceOf(owner);
                const bOwnerDiff = bOwner - bOwner1;
                assert.equal(bOwnerDiff, 20);

                const bBuyer = await this.st.balanceOf(buyer);
                const bBuyerDiff = bBuyer - bBuyer1;
                assert.equal(bBuyerDiff, 0);

                const bCryptoTickets = await this.st.balanceOf(acc1);
                const bCryptoDiff = bCryptoTickets - bCryptoTickets1;
                // 6.7
                // 7 cents -> ROUNDING HERE!!!!
                assert.equal(bCryptoDiff, 7);
            });
        });

        describe('getStats', () => {
            beforeEach(async () => {

            });

            it('should return empty stats', async function () {
                // 1 - add event
                const fakeEventContract = acc2;
                await this.billing.registerEventContract(fakeEventContract, { from: creator }).should.be.fulfilled;

                // 2 - add currency to mint
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;

                // 3 - add billing as minter
                await this.mint.addMinter(0, this.billing.address, { from: creator }).should.be.fulfilled;

                // 4 - get stats
                const s = await this.billing.getStats(fakeEventContract).should.be.fulfilled;
                assert.equal(s.sold.toNumber(), 0);
                assert.equal(s.soldCount.toNumber(), 0);

                assert.equal(s.resold.toNumber(), 0);
                assert.equal(s.resoldCount.toNumber(), 0);

                assert.equal(s.refunded.toNumber(), 0);
                assert.equal(s.refundedCount.toNumber(), 0);
            });

            it('should return correct stats after single ticket is sold', async function () {
                // 1 - add event
                const fakeEventContract = acc2;
                await this.billing.registerEventContract(fakeEventContract, { from: creator }).should.be.fulfilled;

                // 2 - add currency to mint
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;

                // 3 - add billing as minter
                await this.mint.addMinter(0, this.billing.address, { from: creator }).should.be.fulfilled;
                await this.mint.addMinter(0, creator, { from: creator }).should.be.fulfilled;
                const tokenAddress = await this.mint.getTokenAddress(0);
                this.st = await StableToken.at(tokenAddress);

                // 4 - allocate
                const ticketUnused = web3.utils.fromAscii('');
                const buyer = acc3;
                const org = acc4;
                const price = 2000; // $20.00

                await this.billing.onAllocate(ticketUnused, this.st.address, buyer, org, price,
                    { from: fakeEventContract }).should.be.fulfilled;

                let firstPrice = 2000;// $20.00
                let lastPrice = 2000; // $20.00
                let newPrice = 3000; // $30.00

                // 5 - sell
                await this.billing.onSell2(ticketUnused, this.st.address, buyer, org, org, acc5,
                    firstPrice, lastPrice, newPrice, false, { from: fakeEventContract }).should.be.fulfilled;

                let s = await this.billing.getStats(acc2).should.be.fulfilled;
                assert.equal(s.sold.toNumber(), 2000);
                assert.equal(s.soldCount.toNumber(), 1);

                assert.equal(s.resold.toNumber(), 2000);
                assert.equal(s.resoldCount.toNumber(), 1);

                assert.equal(s.refunded.toNumber(), 0);
                assert.equal(s.refundedCount.toNumber(), 0);

                // 6 - sell again
                firstPrice = 2000;// $20.00
                lastPrice = 3000; // $30.00
                newPrice = 4000; // $40.00

                await this.billing.onSell2(ticketUnused, this.st.address, org, buyer, org, acc5,
                    firstPrice, lastPrice, newPrice, false, { from: fakeEventContract }).should.be.fulfilled;

                s = await this.billing.getStats(acc2).should.be.fulfilled;
                assert.equal(s.sold.toNumber(), 2000);
                assert.equal(s.soldCount.toNumber(), 1);

                assert.equal(s.resold.toNumber(), 5000);
                assert.equal(s.resoldCount.toNumber(), 2);

                assert.equal(s.refunded.toNumber(), 0);
                assert.equal(s.refundedCount.toNumber(), 0);
            });
        });
    });
});
