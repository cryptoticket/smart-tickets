const BigNumber = web3.BigNumber;

const SimpleBillingProcessor3 = artifacts.require('SimpleBillingProcessor3');
const TokenMint = artifacts.require('TokenMint');
const StableToken = artifacts.require('StableToken');

const Event3RefundMock1 = artifacts.require('Event3RefundMock1');

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

contract('SimpleBillingProcessor3', (accounts) => {
    const creator = accounts[0];
    const acc1 = accounts[1];
    const acc2 = accounts[2];
    const acc3 = accounts[3];
    const acc4 = accounts[4];
    const acc5 = accounts[5];
    const acc6 = accounts[6];

    beforeEach(async function () {
        this.mint = await TokenMint.new('Crypto.Tickets');
        this.billing = await SimpleBillingProcessor3.new(acc1, this.mint.address);
    });

    describe('(funct tests)', () => {
        describe('initialized contract', () => {
            it('should return correct getContractVersion()', async function () {
                const version = await this.billing.getContractVersion().should.be.fulfilled;
                assert.equal(version, 'SimpleBillingProcessor3');
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

                // org earns 40% of the markup = $8 (but in the escrow)
                const bOrg = await this.st.balanceOf(org);
                assert.equal(bOrg - bOrg1, 0);
                const balanceEscrowOrg = await this.billing.getEscrowBalance(acc2, org);
                assert.equal(balanceEscrowOrg.toNumber(), 800);

                // ref get 10% = $2 (but in the escrow)
                const bRef = await this.st.balanceOf(ref);
                assert.equal(bRef - bRef1, 0);
                const balanceEscrowRef = await this.billing.getEscrowBalance(acc2, ref);
                assert.equal(balanceEscrowRef.toNumber(), 200);

                // seller earns $10 (plus 50% of markup = $10 in the escrow)
                const bOwner = await this.st.balanceOf(owner);
                assert.equal(bOwner - bOwner1, 1000);
                const balanceEscrowOwner = await this.billing.getEscrowBalance(acc2, owner);
                assert.equal(balanceEscrowOwner.toNumber(), 1000);

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

                // org earns 40% of the markup = $8 (in escrow)
                const bOrg = await this.st.balanceOf(org);
                assert.equal(bOrg - bOrg1, 0);
                const balanceEscrowOrg = await this.billing.getEscrowBalance(acc2, org);
                assert.equal(balanceEscrowOrg.toNumber(), 800);

                // seller earns $10 + $10 in escrow
                const bOwner = await this.st.balanceOf(owner);
                assert.equal(bOwner - bOwner1, 1000);
                const balanceEscrowOwner = await this.billing.getEscrowBalance(acc2, owner);
                assert.equal(balanceEscrowOwner.toNumber(), 1000);

                const bBuyer = await this.st.balanceOf(buyer);
                assert.equal(bBuyer - bBuyer1, 0);

                // $6.90
                const bCryptoTickets = await this.st.balanceOf(acc1);
                assert.equal(bCryptoTickets - bCryptoTickets1, 690);
            });

            it('should NOT FAIL if selling ticket from acc3 to acc1 (from balance) if balance is 0', async function () {
                const ticketUnused = web3.utils.fromAscii('');
                const owner = acc3;
                const buyer = acc5;
                const org = acc4;

                const lastPrice = 1000; // $10.00
                const newPrice = 3000; // $30.00

                // DO NOT MINT here!
                // await this.mint.mint(0, buyer, finalPrice, {from: creator});

                await this.billing.onSell2(ticketUnused, this.st.address, owner, buyer, org, acc5,
                    lastPrice, lastPrice, newPrice, true, { from: acc2 }).should.be.fulfilled;
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
                assert.equal(bOrgDiff, 0);
                const balanceEscrowOrg = await this.billing.getEscrowBalance(acc2, org);
                assert.equal(balanceEscrowOrg.toNumber(), 80);

                const bOwner = await this.st.balanceOf(owner);
                const bOwnerDiff = bOwner - bOwner1;
                assert.equal(bOwnerDiff, 100);
                const balanceEscrowOwner = await this.billing.getEscrowBalance(acc2, owner);
                assert.equal(balanceEscrowOwner.toNumber(), 100);

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
                assert.equal(bOrgDiff, 0);
                const balanceEscrowOrg = await this.billing.getEscrowBalance(acc2, org);
                assert.equal(balanceEscrowOrg.toNumber(), 8);

                const bOwner = await this.st.balanceOf(owner);
                const bOwnerDiff = bOwner - bOwner1;
                assert.equal(bOwnerDiff, 10);

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

        describe('onBuy', () => {
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
                const to = acc1;

                const lastPrice = 1000; // $10.00
                const newPrice = 3000; // $30.00

                await this.billing.onBuy(ticketUnused, this.st.address, to,
                    lastPrice, newPrice, { from: acc3 }).should.be.rejectedWith('revert');
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

                await this.billing.onBuy(ticketUnused, this.st.address, buyer,
                    lastPrice, newPrice, { from: acc2 }).should.be.fulfilled;

                // org earns 40% of the markup = $8 (in the escrow)
                const bOrg = await this.st.balanceOf(org);
                assert.equal(bOrg - bOrg1, 0);
                const balanceEscrowOrg = await this.billing.getEscrowBalance(acc2, org);
                assert.equal(balanceEscrowOrg.toNumber(), 800);

                // seller earns $10 + $10
                const bOwner = await this.st.balanceOf(owner);
                assert.equal(bOwner - bOwner1, 1000);
                const balanceEscrowOwner = await this.billing.getEscrowBalance(acc2, owner);
                assert.equal(balanceEscrowOwner.toNumber(), 1000);

                const bBuyer = await this.st.balanceOf(buyer);
                assert.equal(bBuyer1 - bBuyer, finalPrice);

                // $6.90
                const bCryptoTickets = await this.st.balanceOf(acc1);
                assert.equal(bCryptoTickets - bCryptoTickets1, 690);
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

        describe('getEscrowBalance', () => {
            beforeEach(async function () {
                this.eventMock = await Event3RefundMock1.new({ from: creator });

                // 1 - add event
                await this.billing.registerEventContract(this.eventMock.address, { from: creator }).should.be.fulfilled;

                // 2 - add currency to mint
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;

                // 3 - add billing as minter
                await this.mint.addMinter(0, creator, { from: creator }).should.be.fulfilled;
                await this.mint.addMinter(0, this.billing.address, { from: creator }).should.be.fulfilled;

                const tokenAddress = await this.mint.getTokenAddress(0);
                this.st = await StableToken.at(tokenAddress);

                // 4 - allocate
                const ticketUnused = web3.utils.fromAscii('');
                const seller = acc2;
                const org = acc4;
                const price = 1000;// $10.00

                // dont forget to update mock
                await this.eventMock.mockFirstLastPrice(1000, 1000);

                await this.eventMock.callAllocateFromWithin(
                    this.billing.address, ticketUnused, this.st.address, seller, org, price, { from: creator }
                ).should.be.fulfilled;
            });

            it('should return proper escrow values for org, buyer, etc after 1 sale', async function () {
                const seller = acc2;
                const buyer = acc3;
                const org = acc4;
                const ticketUnused = web3.utils.fromAscii('');

                // 1 - mint money to buyer
                const price = 2000;
                const add = 2460; // including CT fee
                await this.mint.mint(0, buyer, add, { from: creator }).should.be.fulfilled;

                // 2 - ticket is resold for $20.00
                // this will call onSell2 without ref
                await this.eventMock.callSellFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    seller,
                    buyer,
                    org,
                    1000,
                    1000,
                    price,
                    true, // burn from buyer
                    { from: creator }
                ).should.be.fulfilled;

                await this.eventMock.callBuyFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer,
                    1000,
                    price,
                    { from: creator }
                ).should.be.fulfilled;

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(1000, price);

                // 3 - check balances
                //   Seller gets last price immediately = $10
                const balanceSeller = await this.st.balanceOf(seller);
                assert.equal(balanceSeller.toNumber(), 1000);

                const balanceBuyer = await this.st.balanceOf(buyer);
                assert.equal(balanceBuyer.toNumber(), 0);

                const balanceOrg = await this.st.balanceOf(org);
                assert.equal(balanceOrg.toNumber(), 0);

                // 4 - check escrows
                // see escrow rules here - https://hackmd.io/FNE791I7SpWlmsMzA1UB9A?view
                //   Seller gets 50% of markup = $5 (escrow on our side)
                //   Organizer gets 50% of a markup = $5 (escrow on our side)
                const balanceEscrowSeller = await this.billing.getEscrowBalance(this.eventMock.address, seller);
                assert.equal(balanceEscrowSeller.toNumber(), 500);

                const balanceEscrowBuyer = await this.billing.getEscrowBalance(this.eventMock.address, buyer);
                assert.equal(balanceEscrowBuyer.toNumber(), 0);

                const balanceEscrowOrg = await this.billing.getEscrowBalance(this.eventMock.address, org);
                assert.equal(balanceEscrowOrg.toNumber(), 500);
            });

            it('should return proper escrow values for org, buyer, etc after 2 sales', async function () {
                // ////////// 1  - first sale (same as in test above)
                // 1 - ticket is resold for $40.00
                const seller = acc2;
                const buyer = acc3;
                const buyer2 = acc5;
                const org = acc4;
                const ticketUnused = web3.utils.fromAscii('');

                // 2 - mint money to buyer
                const firstPrice = 1000;
                const lastPrice = 1000; // during allocate lastPrice is set to firstPrice
                const price = 2000;
                const add = 2460; // including CT fee
                await this.mint.mint(0, buyer, add, { from: creator }).should.be.fulfilled;

                // 3 - ticket is resold for $20.00
                // this will call onSell2 without ref
                await this.eventMock.callSellFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    seller,
                    buyer,
                    org,
                    firstPrice,
                    lastPrice,
                    price,
                    true, // burn from buyer
                    { from: creator }
                ).should.be.fulfilled;

                await this.eventMock.callBuyFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer,
                    lastPrice,
                    price,
                    { from: creator }
                ).should.be.fulfilled;

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(1000, price);

                // ////////// 2  - second sale

                // 1 - mint money to buyer2
                const price2 = 4000;
                const add2 = 4920; // including CT fee
                await this.mint.mint(0, buyer2, add2, { from: creator }).should.be.fulfilled;

                // 2 - ticket is resold for $40.00
                // this will call onSell2 without ref
                await this.eventMock.callSellFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer, // now he is seller
                    buyer2,
                    org,
                    firstPrice, // first price
                    price, // last price
                    price2, // new price
                    true, // burn from buyer2
                    { from: creator }
                ).should.be.fulfilled;

                await this.eventMock.callBuyFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer2,
                    price,
                    price2,
                    { from: creator }
                ).should.be.fulfilled;

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(1000, price2);

                // 3 - check balances
                //   Organizer gets nothing immediately
                //   Seller (i.e. buyer account) gets last price immediately = $20
                const balanceSeller = await this.st.balanceOf(seller);
                assert.equal(balanceSeller.toNumber(), 1000); // from first sale

                const balanceBuyer = await this.st.balanceOf(buyer);
                assert.equal(balanceBuyer.toNumber(), 2000);

                const balanceBuyer2 = await this.st.balanceOf(buyer2);
                assert.equal(balanceBuyer2.toNumber(), 0);

                const balanceOrg = await this.st.balanceOf(org);
                assert.equal(balanceOrg.toNumber(), 0);

                // 4 - check escrows
                // see escrow rules here - https://hackmd.io/FNE791I7SpWlmsMzA1UB9A?view
                //   Seller (i.e. buyer account) gets 50% of markup = $10 (escrow on our side)
                //   Organizer gets 50% of a markup = $10 (escrow on our side)
                const balanceEscrowSeller = await this.billing.getEscrowBalance(this.eventMock.address, seller);
                assert.equal(balanceEscrowSeller.toNumber(), 500); // from first sale

                const balanceEscrowBuyer = await this.billing.getEscrowBalance(this.eventMock.address, buyer);
                assert.equal(balanceEscrowBuyer.toNumber(), 1000);

                const balanceEscrowBuyer2 = await this.billing.getEscrowBalance(this.eventMock.address, buyer2);
                assert.equal(balanceEscrowBuyer2.toNumber(), 0);

                const balanceEscrowOrg = await this.billing.getEscrowBalance(this.eventMock.address, org);
                assert.equal(balanceEscrowOrg.toNumber(), 500 + 1000); // 500 is from first sale
            });
        });

        describe('unlockEscrow', () => {
            beforeEach(async function () {
                this.eventMock = await Event3RefundMock1.new({ from: creator });

                // 1 - add event
                await this.billing.registerEventContract(this.eventMock.address, { from: creator }).should.be.fulfilled;

                // 2 - add currency to mint
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;

                // 3 - add billing as minter
                await this.mint.addMinter(0, creator, { from: creator }).should.be.fulfilled;
                await this.mint.addMinter(0, this.billing.address, { from: creator }).should.be.fulfilled;

                const tokenAddress = await this.mint.getTokenAddress(0);
                this.st = await StableToken.at(tokenAddress);

                // 4 - allocate
                const ticketUnused = web3.utils.fromAscii('');
                const seller = acc2;
                const buyer = acc3;
                const org = acc4;
                let price = 1000;// $10.00

                // dont forget to update mock
                await this.eventMock.mockFirstLastPrice(1000, 1000);

                await this.eventMock.callAllocateFromWithin(
                    this.billing.address, ticketUnused, this.st.address, seller, org, price, { from: creator }
                ).should.be.fulfilled;

                // 1 - mint money to buyer
                price = 2000;
                const add = 2460; // including CT fee
                await this.mint.mint(0, buyer, add, { from: creator }).should.be.fulfilled;

                // 2 - ticket is resold for $20.00
                // this will call onSell2 without ref
                await this.eventMock.callSellFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    seller,
                    buyer,
                    org,
                    1000,
                    1000,
                    price,
                    true, // burn from buyer
                    { from: creator }
                ).should.be.fulfilled;

                await this.eventMock.callBuyFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer,
                    1000,
                    price,
                    { from: creator }
                ).should.be.fulfilled;

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(1000, price);
            });

            it('should not unlock if not owner', async function () {
                const tokenAddress = await this.mint.getTokenAddress(0);
                this.st = await StableToken.at(tokenAddress);

                const seller = acc2;
                // should be creator!
                await this.billing.unlockEscrow(this.st.address, this.eventMock.address, seller, { from: acc1 })
                    .should.be.rejectedWith('revert');
            });

            it('should unlock even if escrow is ZERO', async function () {
                const tokenAddress = await this.mint.getTokenAddress(0);
                this.st = await StableToken.at(tokenAddress);

                const buyer = acc3;
                await this.billing.unlockEscrow(this.st.address, this.eventMock.address, buyer, { from: creator })
                    .should.be.fulfilled;

                // balances shouldn't change
                const balanceBuyer = await this.st.balanceOf(buyer);
                assert.equal(balanceBuyer.toNumber(), 0);

                const balanceEscrowBuyer = await this.billing.getEscrowBalance(this.eventMock.address, buyer);
                assert.equal(balanceEscrowBuyer.toNumber(), 0);
            });

            it('should unlock escrow after 1 sale', async function () {
                const seller = acc2;
                const buyer = acc3;
                const org = acc4;

                // 1 - check pre conditions
                const balanceSeller = await this.st.balanceOf(seller);
                assert.equal(balanceSeller.toNumber(), 1000);

                const balanceEscrowSeller = await this.billing.getEscrowBalance(this.eventMock.address, seller);
                assert.equal(balanceEscrowSeller.toNumber(), 500);

                const balanceEscrowBuyer = await this.billing.getEscrowBalance(this.eventMock.address, buyer);
                assert.equal(balanceEscrowBuyer.toNumber(), 0);

                const balanceOrg = await this.st.balanceOf(org);
                assert.equal(balanceOrg.toNumber(), 0);

                const balanceEscrowOrg = await this.billing.getEscrowBalance(this.eventMock.address, org);
                assert.equal(balanceEscrowOrg.toNumber(), 500);

                // 2 - unlock escrows for all
                await this.billing.unlockEscrow(this.st.address, this.eventMock.address, seller, { from: creator })
                    .should.be.fulfilled;

                // ////////
                const balanceSeller2 = await this.st.balanceOf(seller);
                assert.equal(balanceSeller2.toNumber(), 1000 + 500);

                const balanceEscrowSeller2 = await this.billing.getEscrowBalance(this.eventMock.address, seller);
                assert.equal(balanceEscrowSeller2.toNumber(), 0);

                await this.billing.unlockEscrow(this.st.address, this.eventMock.address, org, { from: creator })
                    .should.be.fulfilled;

                const balanceOrg2 = await this.st.balanceOf(org);
                assert.equal(balanceOrg2.toNumber(), 500);

                const balanceEscrowOrg2 = await this.billing.getEscrowBalance(this.eventMock.address, org);
                assert.equal(balanceEscrowOrg2.toNumber(), 0);
            });
        });

        describe('onRefund', () => {
            beforeEach(async function () {
                this.eventMock = await Event3RefundMock1.new({ from: creator });

                // 1 - add event
                await this.billing.registerEventContract(this.eventMock.address, { from: creator }).should.be.fulfilled;

                // 2 - add currency to mint
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;

                // 3 - add billing as minter
                await this.mint.addMinter(0, creator, { from: creator }).should.be.fulfilled;
                await this.mint.addMinter(0, this.billing.address, { from: creator }).should.be.fulfilled;

                const tokenAddress = await this.mint.getTokenAddress(0);
                this.st = await StableToken.at(tokenAddress);

                // 4 - allocate
                const ticketUnused = web3.utils.fromAscii('');
                const buyer = acc3;
                const org = acc4;
                const price = 1000;// $10.00

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(price, price);

                await this.eventMock.callAllocateFromWithin(
                    this.billing.address, ticketUnused, this.st.address, buyer, org, price, { from: creator }
                ).should.be.fulfilled;
            });

            it('should fail if Org has no money for refund', async function () {
                const ticketUnused = web3.utils.fromAscii('');
                const owner = acc3;
                const org = acc4;

                await this.eventMock.callRefundFromWithin(this.billing.address, ticketUnused, this.st.address, owner, org)
                    .should.be.rejectedWith('revert');

                // check orgs balance
                const b1 = await this.st.balanceOf(org);
                assert.equal(b1.toNumber(), 0);

                // check buyers balance
                const b2 = await this.st.balanceOf(owner);
                assert.equal(b2.toNumber(), 0);
            });

            // this is only to check that refund is returning lastPrice
            it('should refund the last price==first price (escrows are empty)', async function () {
                const owner = acc3;

                // PRE: mint money to Organizer
                const ticketUnused = web3.utils.fromAscii('');
                const org = acc4;
                const firstPrice = 1000;

                // org returns only the firstPrice, the rest is returned from the resellers (escrow)
                await this.mint.mint(0, org, firstPrice, { from: creator }).should.be.fulfilled;

                await this.eventMock.callRefundFromWithin(this.billing.address, ticketUnused, this.st.address, owner, org)
                    .should.be.fulfilled;

                // should update stats
                const s = await this.billing.getStats(this.eventMock.address).should.be.fulfilled;

                // this is 100% refund
                // to partially refund -> call onRefundPartial
                //
                // should refund lastPrice!!!
                assert.equal(s.refunded.toNumber(), 1000);
                assert.equal(s.refundedCount.toNumber(), 1);

                // check orgs balance
                const b1 = await this.st.balanceOf(org);
                assert.equal(b1.toNumber(), 0);

                // check buyers balance
                const b2 = await this.st.balanceOf(owner);
                assert.equal(b2.toNumber(), 1000);
            });

            it('should decrease escrow during refund (1 sale)', async function () {
                // ////////// 1  - first sale (same as in test above)
                // 1 - ticket is resold for $20.00
                const seller = acc2;
                const buyer = acc3;
                const org = acc4;
                const ticketUnused = web3.utils.fromAscii('');

                // 2 - mint money to buyer
                const firstPrice = 1000;
                const lastPrice = 1000; // during allocate lastPrice is set to firstPrice
                const price = 2000;
                const add = 2460; // including CT fee
                await this.mint.mint(0, buyer, add, { from: creator }).should.be.fulfilled;

                // 3 - ticket is resold for $20.00
                // this will call onSell2 without ref
                await this.eventMock.callSellFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    seller,
                    buyer,
                    org,
                    firstPrice,
                    lastPrice,
                    price,
                    true, // burn from buyer
                    { from: creator }
                ).should.be.fulfilled;

                await this.eventMock.callBuyFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer,
                    lastPrice,
                    price,
                    { from: creator }
                ).should.be.fulfilled;

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(firstPrice, price);

                // 4 - mint money to Organizer
                await this.mint.mint(0, org, firstPrice, { from: creator }).should.be.fulfilled;

                // 4 - do a refund
                await this.eventMock.callRefundFromWithin(this.billing.address, ticketUnused, this.st.address, buyer, org)
                    .should.be.fulfilled;

                // everything but CT fee should be returned to the buyer
                // 1000 is returned from Org
                // 500 is returned from Orgs escrow
                // 500 is returned from Sellers escrow
                const balanceBuyer = await this.st.balanceOf(buyer);
                assert.equal(balanceBuyer.toNumber(), 2000);

                const balanceOrg = await this.st.balanceOf(org);
                assert.equal(balanceOrg.toNumber(), 0);

                const balanceEscrowSeller2 = await this.billing.getEscrowBalance(this.eventMock.address, seller);
                assert.equal(balanceEscrowSeller2.toNumber(), 0);

                const balanceEscrowOrg2 = await this.billing.getEscrowBalance(this.eventMock.address, org);
                assert.equal(balanceEscrowOrg2.toNumber(), 0);
            });

            it('should decrease escrow during refund (2 sales)', async function () {
                // ////////// 1  - first sale (same as in test above)
                // 1 - ticket is resold for $20.00
                const seller = acc2;
                const buyer = acc3;
                const buyer2 = acc5;
                const org = acc4;
                const ticketUnused = web3.utils.fromAscii('');

                // 2 - mint money to buyer
                const firstPrice = 1000;
                const lastPrice = 1000; // during allocate lastPrice is set to firstPrice
                const price = 2000;
                const add = 2460; // including CT fee
                await this.mint.mint(0, buyer, add, { from: creator }).should.be.fulfilled;

                // 3 - ticket is resold for $20.00
                // this will call onSell2 without ref
                await this.eventMock.callSellFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    seller,
                    buyer,
                    org,
                    firstPrice,
                    lastPrice,
                    price,
                    true, // burn from buyer
                    { from: creator }
                ).should.be.fulfilled;

                await this.eventMock.callBuyFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer,
                    lastPrice,
                    price,
                    { from: creator }
                ).should.be.fulfilled;

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(1000, price);

                // ////////// 2  - second sale

                // 1 - mint money to buyer2
                const price2 = 4000;
                const add2 = 4920; // including CT fee
                await this.mint.mint(0, buyer2, add2, { from: creator }).should.be.fulfilled;

                // 2 - ticket is resold for $40.00
                // this will call onSell2 without ref
                await this.eventMock.callSellFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer, // now he is seller
                    buyer2,
                    org,
                    firstPrice, // first price
                    price, // last price
                    price2, // new price
                    true, // burn from buyer2
                    { from: creator }
                ).should.be.fulfilled;

                await this.eventMock.callBuyFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer2,
                    price,
                    price2,
                    { from: creator }
                ).should.be.fulfilled;

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(1000, price2);

                // 3 - check balances
                //   Organizer gets nothing immediately
                //   Seller (i.e. buyer account) gets last price immediately = $20
                const balanceSeller = await this.st.balanceOf(seller);
                assert.equal(balanceSeller.toNumber(), 1000); // from first sale

                const balanceBuyer = await this.st.balanceOf(buyer);
                assert.equal(balanceBuyer.toNumber(), 2000);

                const balanceBuyer2 = await this.st.balanceOf(buyer2);
                assert.equal(balanceBuyer2.toNumber(), 0);

                const balanceOrg = await this.st.balanceOf(org);
                assert.equal(balanceOrg.toNumber(), 0);

                // 4 - check escrows
                // see escrow rules here - https://hackmd.io/FNE791I7SpWlmsMzA1UB9A?view
                //   Seller (i.e. buyer account) gets 50% of markup = $10 (escrow on our side)
                //   Organizer gets 50% of a markup = $10 (escrow on our side)
                const balanceEscrowSeller = await this.billing.getEscrowBalance(this.eventMock.address, seller);
                assert.equal(balanceEscrowSeller.toNumber(), 500); // from first sale

                const balanceEscrowBuyer = await this.billing.getEscrowBalance(this.eventMock.address, buyer);
                assert.equal(balanceEscrowBuyer.toNumber(), 1000);

                const balanceEscrowBuyer2 = await this.billing.getEscrowBalance(this.eventMock.address, buyer2);
                assert.equal(balanceEscrowBuyer2.toNumber(), 0);

                const balanceEscrowOrg = await this.billing.getEscrowBalance(this.eventMock.address, org);
                assert.equal(balanceEscrowOrg.toNumber(), 500 + 1000); // 500 is from first sale

                // 5 - do a refund
                await this.mint.mint(0, org, firstPrice, { from: creator }).should.be.fulfilled;

                await this.eventMock.callRefundFromWithin(this.billing.address, ticketUnused, this.st.address, buyer2, org)
                    .should.be.fulfilled;

                // 6 - check balances
                const balanceSellerAfter = await this.st.balanceOf(seller);
                assert.equal(balanceSellerAfter.toNumber(), 1000); // from first sale

                const balanceBuyerAfter = await this.st.balanceOf(buyer);
                assert.equal(balanceBuyerAfter.toNumber(), 2000); // from second sale

                const balanceBuyer2After = await this.st.balanceOf(buyer2);
                assert.equal(balanceBuyer2After.toNumber(), 4000); // got everything back!

                const balanceOrgAfter = await this.st.balanceOf(org);
                assert.equal(balanceOrgAfter.toNumber(), 0); // got nothing

                // 7 - check escrows
                // everything but CT fee should be returned to the buyer
                // 1000 is returned from Org
                // 1000 + 500 is returned from Orgs escrow
                // 500 is returned from seller1 escrow
                // 1000 is returned from seller2 escrow
                const balanceEscrowSellerAfter = await this.billing.getEscrowBalance(this.eventMock.address, seller);
                assert.equal(balanceEscrowSellerAfter.toNumber(), 0);

                const balanceEscrowBuyerAfter = await this.billing.getEscrowBalance(this.eventMock.address, buyer);
                assert.equal(balanceEscrowBuyerAfter.toNumber(), 0);

                const balanceEscrowBuyer2After = await this.billing.getEscrowBalance(this.eventMock.address, buyer2);
                assert.equal(balanceEscrowBuyer2After.toNumber(), 0);

                const balanceEscrowOrgAfter = await this.billing.getEscrowBalance(this.eventMock.address, org);
                assert.equal(balanceEscrowOrgAfter.toNumber(), 0);
            });

            it('should decrease escrow during refund (price is lower, 1 sale)', async function () {
                // ////////// 1  - first sale (same as in test above)
                // 1 - ticket is resold for $20.00
                const seller = acc2;
                const buyer = acc3;
                const org = acc4;
                const ticketUnused = web3.utils.fromAscii('');

                // 2 - mint money to buyer
                const firstPrice = 1000;
                const lastPrice = 1000; // during allocate lastPrice is set to firstPrice
                const price = 500; // price is LOWER!!!

                const add = 615; // including CT fee
                await this.mint.mint(0, buyer, add, { from: creator }).should.be.fulfilled;

                // 3 - ticket is resold for $5.00
                // this will call onSell2 without ref
                await this.eventMock.callSellFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    seller,
                    buyer,
                    org,
                    firstPrice,
                    lastPrice,
                    price,
                    true, // burn from buyer
                    { from: creator }
                ).should.be.fulfilled;

                await this.eventMock.callBuyFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer,
                    lastPrice,
                    price,
                    { from: creator }
                ).should.be.fulfilled;

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(firstPrice, price);

                // 4 - mint money to Organizer
                await this.mint.mint(0, org, price, { from: creator }).should.be.fulfilled;

                // 4 - do a refund
                await this.eventMock.callRefundFromWithin(this.billing.address, ticketUnused, this.st.address, buyer, org)
                    .should.be.fulfilled;

                // everything but CT fee should be returned to the buyer
                // 500 is returned from Org
                const balanceBuyer = await this.st.balanceOf(buyer);
                assert.equal(balanceBuyer.toNumber(), 500);

                const balanceOrg = await this.st.balanceOf(org);
                assert.equal(balanceOrg.toNumber(), 0);

                const balanceEscrowSeller2 = await this.billing.getEscrowBalance(this.eventMock.address, seller);
                assert.equal(balanceEscrowSeller2.toNumber(), 0);

                const balanceEscrowOrg2 = await this.billing.getEscrowBalance(this.eventMock.address, org);
                assert.equal(balanceEscrowOrg2.toNumber(), 0);
            });

            // see examples here: https://hackmd.io/bzJr6oUlRG-gAqMd6QLIZA?edit
            it('should decrease escrow during refund (price is lower, 2 sales)', async function () {
                // ////////// 1  - first sale (same as in test above)
                // 1 - ticket is resold for $5.00
                const seller = acc2;
                const buyer = acc3;
                const buyer2 = acc5;
                const org = acc4;
                const ticketUnused = web3.utils.fromAscii('');

                // 2 - mint money to buyer
                const firstPrice = 1000;
                const lastPrice = 1000; // during allocate lastPrice is set to firstPrice
                const price = 500;
                const add = 615; // including CT fee
                await this.mint.mint(0, buyer, add, { from: creator }).should.be.fulfilled;

                // 3 - ticket is resold for $5.00
                // this will call onSell2 without ref
                await this.eventMock.callSellFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    seller,
                    buyer,
                    org,
                    firstPrice,
                    lastPrice,
                    price,
                    true, // burn from buyer
                    { from: creator }
                ).should.be.fulfilled;

                await this.eventMock.callBuyFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer,
                    lastPrice,
                    price,
                    { from: creator }
                ).should.be.fulfilled;

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(1000, price);

                // ////////// 2  - second sale

                // 1 - mint money to buyer2
                const price2 = 2000;
                const add2 = 2460; // including CT fee
                await this.mint.mint(0, buyer2, add2, { from: creator }).should.be.fulfilled;

                // 2 - ticket is resold for $20.00
                // this will call onSell2 without ref
                await this.eventMock.callSellFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer, // now he is seller
                    buyer2,
                    org,
                    firstPrice, // first price
                    price, // last price
                    price2, // new price
                    true, // burn from buyer2
                    { from: creator }
                ).should.be.fulfilled;

                await this.eventMock.callBuyFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer2,
                    price,
                    price2,
                    { from: creator }
                ).should.be.fulfilled;

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(1000, price2);

                // 3 - check balances
                //   Organizer gets nothing immediately
                const balanceSeller = await this.st.balanceOf(seller);
                assert.equal(balanceSeller.toNumber(), 500); // from first sale

                //   Seller (i.e. buyer account) gets what is left immediately = $5
                const balanceBuyer = await this.st.balanceOf(buyer);
                assert.equal(balanceBuyer.toNumber(), 500);

                const balanceBuyer2 = await this.st.balanceOf(buyer2);
                assert.equal(balanceBuyer2.toNumber(), 0);

                const balanceOrg = await this.st.balanceOf(org);
                assert.equal(balanceOrg.toNumber(), 0);

                // 4 - check escrows
                // see escrow rules here - https://hackmd.io/bzJr6oUlRG-gAqMd6QLIZA?edit
                //   Seller (i.e. buyer account) gets 50% of markup = $7.5 (escrow on our side)
                //   Organizer gets 50% of a markup = $7.5 (escrow on our side)
                const balanceEscrowSeller = await this.billing.getEscrowBalance(this.eventMock.address, seller);
                assert.equal(balanceEscrowSeller.toNumber(), 0); // from first sale

                const balanceEscrowBuyer = await this.billing.getEscrowBalance(this.eventMock.address, buyer);
                assert.equal(balanceEscrowBuyer.toNumber(), 750);

                const balanceEscrowBuyer2 = await this.billing.getEscrowBalance(this.eventMock.address, buyer2);
                assert.equal(balanceEscrowBuyer2.toNumber(), 0);

                const balanceEscrowOrg = await this.billing.getEscrowBalance(this.eventMock.address, org);
                assert.equal(balanceEscrowOrg.toNumber(), 750);

                // 5 - do a refund
                await this.mint.mint(0, org, price, { from: creator }).should.be.fulfilled;

                await this.eventMock.callRefundFromWithin(this.billing.address, ticketUnused, this.st.address, buyer2, org)
                    .should.be.fulfilled;

                // 6 - check balances
                const balanceSellerAfter = await this.st.balanceOf(seller);
                assert.equal(balanceSellerAfter.toNumber(), 500); // from first sale

                const balanceBuyerAfter = await this.st.balanceOf(buyer);
                assert.equal(balanceBuyerAfter.toNumber(), 500); // from second sale

                const balanceBuyer2After = await this.st.balanceOf(buyer2);
                assert.equal(balanceBuyer2After.toNumber(), 2000); // got everything back!

                const balanceOrgAfter = await this.st.balanceOf(org);
                assert.equal(balanceOrgAfter.toNumber(), 0); // got nothing

                // 7 - check escrows
                // everything but CT fee should be returned to the buyer
                const balanceEscrowSellerAfter = await this.billing.getEscrowBalance(this.eventMock.address, seller);
                assert.equal(balanceEscrowSellerAfter.toNumber(), 0);

                const balanceEscrowBuyerAfter = await this.billing.getEscrowBalance(this.eventMock.address, buyer);
                assert.equal(balanceEscrowBuyerAfter.toNumber(), 0);

                const balanceEscrowBuyer2After = await this.billing.getEscrowBalance(this.eventMock.address, buyer2);
                assert.equal(balanceEscrowBuyer2After.toNumber(), 0);

                const balanceEscrowOrgAfter = await this.billing.getEscrowBalance(this.eventMock.address, org);
                assert.equal(balanceEscrowOrgAfter.toNumber(), 0);
            });
        });

        describe('onPartialRefund', () => {
            beforeEach(async function () {
                this.eventMock = await Event3RefundMock1.new({ from: creator });

                // 1 - add event
                await this.billing.registerEventContract(this.eventMock.address, { from: creator }).should.be.fulfilled;

                // 2 - add currency to mint
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;

                // 3 - add billing as minter
                await this.mint.addMinter(0, creator, { from: creator }).should.be.fulfilled;
                await this.mint.addMinter(0, this.billing.address, { from: creator }).should.be.fulfilled;

                const tokenAddress = await this.mint.getTokenAddress(0);
                this.st = await StableToken.at(tokenAddress);

                // 4 - allocate
                const ticketUnused = web3.utils.fromAscii('');
                const buyer = acc3;
                const org = acc4;
                const price = 1000;// $10.00

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(price, price);

                await this.eventMock.callAllocateFromWithin(
                    this.billing.address, ticketUnused, this.st.address, buyer, org, price, { from: creator }
                ).should.be.fulfilled;
            });

            it('should fail if Org has no money for refund', async function () {
                const ticketUnused = web3.utils.fromAscii('');
                const owner = acc3;
                const org = acc4;

                const halfPart = 1000000 / 2;
                await this.eventMock.callRefundPartialFromWithin(this.billing.address, ticketUnused, this.st.address,
                    owner, org, halfPart).should.be.rejectedWith('revert');
            });

            // this is only to check that refund is returning lastPrice
            it('should refund the last price==first price (escrows are empty)', async function () {
                const owner = acc3;

                // PRE: mint money to Organizer
                const ticketUnused = web3.utils.fromAscii('');
                const org = acc4;
                const firstPrice = 1000;

                // org returns only the firstPrice, the rest is returned from the resellers (escrow)
                await this.mint.mint(0, org, firstPrice, { from: creator }).should.be.fulfilled;

                const halfPart = 1000000 / 2;
                await this.eventMock.callRefundPartialFromWithin(this.billing.address, ticketUnused,
                    this.st.address, owner, org, halfPart).should.be.fulfilled;

                // should update stats
                const s = await this.billing.getStats(this.eventMock.address).should.be.fulfilled;

                // this is 100% refund
                // to partially refund -> call onRefundPartial
                //
                // should refund lastPrice!!!
                assert.equal(s.refunded.toNumber(), 500); // stats are updated too
                assert.equal(s.refundedCount.toNumber(), 1);

                // check orgs balance
                const b1 = await this.st.balanceOf(org);
                assert.equal(b1.toNumber(), 500);

                // check buyers balance
                const b2 = await this.st.balanceOf(owner);
                assert.equal(b2.toNumber(), 500);
            });

            it('should decrease escrow during refund (1 sale)', async function () {
                // ////////// 1  - first sale (same as in test above)
                // 1 - ticket is resold for $20.00
                const seller = acc2;
                const buyer = acc3;
                const org = acc4;
                const ticketUnused = web3.utils.fromAscii('');

                // 2 - mint money to buyer
                const firstPrice = 1000;
                const lastPrice = 1000; // during allocate lastPrice is set to firstPrice
                const price = 2000;
                const add = 2460; // including CT fee
                await this.mint.mint(0, buyer, add, { from: creator }).should.be.fulfilled;

                // 3 - ticket is resold for $20.00
                // this will call onSell2 without ref
                await this.eventMock.callSellFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    seller,
                    buyer,
                    org,
                    firstPrice,
                    lastPrice,
                    price,
                    true, // burn from buyer
                    { from: creator }
                ).should.be.fulfilled;

                await this.eventMock.callBuyFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer,
                    lastPrice,
                    price,
                    { from: creator }
                ).should.be.fulfilled;

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(firstPrice, price);

                // 4 - mint money to Organizer
                await this.mint.mint(0, org, firstPrice, { from: creator }).should.be.fulfilled;

                // 4 - do a refund
                const halfPart = 1000000 / 2;
                await this.eventMock.callRefundPartialFromWithin(this.billing.address, ticketUnused,
                    this.st.address, buyer, org, halfPart).should.be.fulfilled;

                // everything but CT fee should be returned to the buyer
                // 1000/2 is returned from Org
                //
                // 500/2 is returned from Orgs escrow
                // 500/2 is returned to Orgs from escrow
                //
                // 500/2 is returned from Sellers escrow
                // 500/2 is returned to Sellers from escrow
                const balanceBuyer = await this.st.balanceOf(buyer);
                assert.equal(balanceBuyer.toNumber(), 1000);

                const balanceOrg = await this.st.balanceOf(org);
                assert.equal(balanceOrg.toNumber(), 750);

                const balanceEscrowSeller2 = await this.billing.getEscrowBalance(this.eventMock.address, seller);
                assert.equal(balanceEscrowSeller2.toNumber(), 0);

                const balanceEscrowOrg2 = await this.billing.getEscrowBalance(this.eventMock.address, org);
                assert.equal(balanceEscrowOrg2.toNumber(), 0);

                const balanceSeller = await this.st.balanceOf(seller);
                assert.equal(balanceSeller.toNumber(), 1250);
            });

            it('should decrease escrow during refund (2 sales)', async function () {
                // ////////// 1  - first sale (same as in test above)
                // 1 - ticket is resold for $20.00
                const seller = acc2;
                const buyer = acc3;
                const buyer2 = acc5;
                const org = acc4;
                const ticketUnused = web3.utils.fromAscii('');

                // 2 - mint money to buyer
                const firstPrice = 1000;
                const lastPrice = 1000; // during allocate lastPrice is set to firstPrice
                const price = 2000;
                const add = 2460; // including CT fee
                await this.mint.mint(0, buyer, add, { from: creator }).should.be.fulfilled;

                // 3 - ticket is resold for $20.00
                // this will call onSell2 without ref
                await this.eventMock.callSellFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    seller,
                    buyer,
                    org,
                    firstPrice,
                    lastPrice,
                    price,
                    true, // burn from buyer
                    { from: creator }
                ).should.be.fulfilled;

                await this.eventMock.callBuyFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer,
                    lastPrice,
                    price,
                    { from: creator }
                ).should.be.fulfilled;

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(1000, price);

                // ////////// 2  - second sale

                // 1 - mint money to buyer2
                const price2 = 4000;
                const add2 = 4920; // including CT fee
                await this.mint.mint(0, buyer2, add2, { from: creator }).should.be.fulfilled;

                // 2 - ticket is resold for $40.00
                // this will call onSell2 without ref
                await this.eventMock.callSellFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer, // now he is seller
                    buyer2,
                    org,
                    firstPrice, // first price
                    price, // last price
                    price2, // new price
                    true, // burn from buyer2
                    { from: creator }
                ).should.be.fulfilled;

                await this.eventMock.callBuyFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer2,
                    price,
                    price2,
                    { from: creator }
                ).should.be.fulfilled;

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(1000, price2);

                // 3 - check balances
                //   Organizer gets nothing immediately
                //   Seller (i.e. buyer account) gets last price immediately = $20
                const balanceSeller = await this.st.balanceOf(seller);
                assert.equal(balanceSeller.toNumber(), 1000); // from first sale

                const balanceBuyer = await this.st.balanceOf(buyer);
                assert.equal(balanceBuyer.toNumber(), 2000);

                const balanceBuyer2 = await this.st.balanceOf(buyer2);
                assert.equal(balanceBuyer2.toNumber(), 0);

                const balanceOrg = await this.st.balanceOf(org);
                assert.equal(balanceOrg.toNumber(), 0);

                // 4 - check escrows
                // see escrow rules here - https://hackmd.io/FNE791I7SpWlmsMzA1UB9A?view
                //   Seller (i.e. buyer account) gets 50% of markup = $10 (escrow on our side)
                //   Organizer gets 50% of a markup = $10 (escrow on our side)
                const balanceEscrowSeller = await this.billing.getEscrowBalance(this.eventMock.address, seller);
                assert.equal(balanceEscrowSeller.toNumber(), 500); // from first sale

                const balanceEscrowBuyer = await this.billing.getEscrowBalance(this.eventMock.address, buyer);
                assert.equal(balanceEscrowBuyer.toNumber(), 1000);

                const balanceEscrowBuyer2 = await this.billing.getEscrowBalance(this.eventMock.address, buyer2);
                assert.equal(balanceEscrowBuyer2.toNumber(), 0);

                const balanceEscrowOrg = await this.billing.getEscrowBalance(this.eventMock.address, org);
                assert.equal(balanceEscrowOrg.toNumber(), 500 + 1000); // 500 is from first sale

                // 5 - do a refund
                await this.mint.mint(0, org, firstPrice, { from: creator }).should.be.fulfilled;

                const halfPart = 1000000 / 2;
                await this.eventMock.callRefundPartialFromWithin(this.billing.address, ticketUnused, this.st.address, buyer2, org, halfPart)
                    .should.be.fulfilled;

                // 6 - check balances
                const balanceSellerAfter = await this.st.balanceOf(seller);
                assert.equal(balanceSellerAfter.toNumber(), 1000 + 250); // from first sale

                const balanceBuyerAfter = await this.st.balanceOf(buyer);
                assert.equal(balanceBuyerAfter.toNumber(), 2000 + 500); // from second sale

                const balanceBuyer2After = await this.st.balanceOf(buyer2);
                assert.equal(balanceBuyer2After.toNumber(), 4000 / 2); // got everything back!

                const balanceOrgAfter = await this.st.balanceOf(org);
                assert.equal(balanceOrgAfter.toNumber(), 500 + 750);

                // 7 - check escrows
                // everything but CT fee should be returned to the buyer
                // 1000/2 is returned from Org
                // 1000/2 + 500/2 is returned from Orgs escrow
                // 1000/2 + 500/2 is returned to Orgs from escrow
                //
                // 500/2 is returned from seller1 escrow
                // 500/2 is returned to seller1 from escrow
                //
                // 1000/2 is returned from seller2 escrow
                // 1000/2 is returned to seller2 from escrow
                const balanceEscrowSellerAfter = await this.billing.getEscrowBalance(this.eventMock.address, seller);
                assert.equal(balanceEscrowSellerAfter.toNumber(), 0);

                const balanceEscrowBuyerAfter = await this.billing.getEscrowBalance(this.eventMock.address, buyer);
                assert.equal(balanceEscrowBuyerAfter.toNumber(), 0);

                const balanceEscrowBuyer2After = await this.billing.getEscrowBalance(this.eventMock.address, buyer2);
                assert.equal(balanceEscrowBuyer2After.toNumber(), 0);

                const balanceEscrowOrgAfter = await this.billing.getEscrowBalance(this.eventMock.address, org);
                assert.equal(balanceEscrowOrgAfter.toNumber(), 0);
            });

            it('should decrease escrow during refund (lower price, 1 sale)', async function () {
                // ////////// 1  - first sale (same as in test above)
                // 1 - ticket is resold for $20.00
                const seller = acc2;
                const buyer = acc3;
                const org = acc4;
                const ticketUnused = web3.utils.fromAscii('');

                // 2 - mint money to buyer
                const firstPrice = 1000;
                const lastPrice = 1000; // during allocate lastPrice is set to firstPrice
                const price = 500;
                const add = 615; // including CT fee
                await this.mint.mint(0, buyer, add, { from: creator }).should.be.fulfilled;

                // 3 - ticket is resold for $5
                // this will call onSell2 without ref
                await this.eventMock.callSellFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    seller,
                    buyer,
                    org,
                    firstPrice,
                    lastPrice,
                    price,
                    true, // burn from buyer
                    { from: creator }
                ).should.be.fulfilled;

                await this.eventMock.callBuyFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer,
                    lastPrice,
                    price,
                    { from: creator }
                ).should.be.fulfilled;

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(firstPrice, price);

                // 4 - mint money to Organizer
                await this.mint.mint(0, org, firstPrice, { from: creator }).should.be.fulfilled;

                // 4 - do a refund
                const halfPart = 1000000 / 2;
                await this.eventMock.callRefundPartialFromWithin(this.billing.address, ticketUnused,
                    this.st.address, buyer, org, halfPart).should.be.fulfilled;

                // everything but CT fee should be returned to the buyer
                // 500/2 is returned from Orgs escrow
                // 500/2 is returned from Sellers escrow
                // 1000/2 is returned from Org
                const balanceBuyer = await this.st.balanceOf(buyer);
                assert.equal(balanceBuyer.toNumber(), 250);

                const balanceOrg = await this.st.balanceOf(org);
                assert.equal(balanceOrg.toNumber(), 750);

                const balanceEscrowSeller2 = await this.billing.getEscrowBalance(this.eventMock.address, seller);
                assert.equal(balanceEscrowSeller2.toNumber(), 0);

                const balanceEscrowOrg2 = await this.billing.getEscrowBalance(this.eventMock.address, org);
                assert.equal(balanceEscrowOrg2.toNumber(), 0);
            });

            it('should decrease escrow during refund (price is lower, 2 sales)', async function () {
                // ////////// 1  - first sale (same as in test above)
                // 1 - ticket is resold for $5.00
                const seller = acc2;
                const buyer = acc3;
                const buyer2 = acc5;
                const org = acc4;
                const ticketUnused = web3.utils.fromAscii('');

                // 2 - mint money to buyer
                const firstPrice = 1000;
                const lastPrice = 1000; // during allocate lastPrice is set to firstPrice
                const price = 500;
                const add = 615; // including CT fee
                await this.mint.mint(0, buyer, add, { from: creator }).should.be.fulfilled;

                // 3 - ticket is resold for $5.00
                // this will call onSell2 without ref
                await this.eventMock.callSellFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    seller,
                    buyer,
                    org,
                    firstPrice,
                    lastPrice,
                    price,
                    true, // burn from buyer
                    { from: creator }
                ).should.be.fulfilled;

                await this.eventMock.callBuyFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer,
                    lastPrice,
                    price,
                    { from: creator }
                ).should.be.fulfilled;

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(1000, price);

                // ////////// 2  - second sale

                // 1 - mint money to buyer2
                const price2 = 2000;
                const add2 = 2460; // including CT fee
                await this.mint.mint(0, buyer2, add2, { from: creator }).should.be.fulfilled;

                // 2 - ticket is resold for $20.00
                // this will call onSell2 without ref
                await this.eventMock.callSellFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer, // now he is seller
                    buyer2,
                    org,
                    firstPrice, // first price
                    price, // last price
                    price2, // new price
                    true, // burn from buyer2
                    { from: creator }
                ).should.be.fulfilled;

                await this.eventMock.callBuyFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer2,
                    price,
                    price2,
                    { from: creator }
                ).should.be.fulfilled;

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(1000, price2);

                // 3 - check balances
                //   Organizer gets nothing immediately
                const balanceSeller = await this.st.balanceOf(seller);
                assert.equal(balanceSeller.toNumber(), 500); // from first sale

                //   Seller (i.e. buyer account) gets what is left immediately = $5
                const balanceBuyer = await this.st.balanceOf(buyer);
                assert.equal(balanceBuyer.toNumber(), 500);

                const balanceBuyer2 = await this.st.balanceOf(buyer2);
                assert.equal(balanceBuyer2.toNumber(), 0);

                const balanceOrg = await this.st.balanceOf(org);
                assert.equal(balanceOrg.toNumber(), 0);

                // 4 - check escrows
                // see escrow rules here - https://hackmd.io/bzJr6oUlRG-gAqMd6QLIZA?edit
                //   Seller (i.e. buyer account) gets 50% of markup = $7.5 (escrow on our side)
                //   Organizer gets 50% of a markup = $7.5 (escrow on our side)
                const balanceEscrowSeller = await this.billing.getEscrowBalance(this.eventMock.address, seller);
                assert.equal(balanceEscrowSeller.toNumber(), 0); // from first sale

                const balanceEscrowBuyer = await this.billing.getEscrowBalance(this.eventMock.address, buyer);
                assert.equal(balanceEscrowBuyer.toNumber(), 750);

                const balanceEscrowBuyer2 = await this.billing.getEscrowBalance(this.eventMock.address, buyer2);
                assert.equal(balanceEscrowBuyer2.toNumber(), 0);

                const balanceEscrowOrg = await this.billing.getEscrowBalance(this.eventMock.address, org);
                assert.equal(balanceEscrowOrg.toNumber(), 750);

                // 5 - do a refund
                await this.mint.mint(0, org, price, { from: creator }).should.be.fulfilled;

                const halfPart = 1000000 / 2;
                await this.eventMock.callRefundPartialFromWithin(this.billing.address, ticketUnused,
                    this.st.address, buyer2, org, halfPart).should.be.fulfilled;

                // 6 - check balances
                const balanceSellerAfter = await this.st.balanceOf(seller);
                assert.equal(balanceSellerAfter.toNumber(), 500); // from first sale

                const balanceBuyerAfter = await this.st.balanceOf(buyer);
                assert.equal(balanceBuyerAfter.toNumber(), 500 + 375);

                const balanceBuyer2After = await this.st.balanceOf(buyer2);
                assert.equal(balanceBuyer2After.toNumber(), 2000 / 2); // got everything back!

                const balanceOrgAfter = await this.st.balanceOf(org);
                assert.equal(balanceOrgAfter.toNumber(), 250 + 375);

                // 7 - check escrows
                // everything but CT fee should be returned to the buyer
                const balanceEscrowSellerAfter = await this.billing.getEscrowBalance(this.eventMock.address, seller);
                assert.equal(balanceEscrowSellerAfter.toNumber(), 0);

                const balanceEscrowBuyerAfter = await this.billing.getEscrowBalance(this.eventMock.address, buyer);
                assert.equal(balanceEscrowBuyerAfter.toNumber(), 0);

                const balanceEscrowBuyer2After = await this.billing.getEscrowBalance(this.eventMock.address, buyer2);
                assert.equal(balanceEscrowBuyer2After.toNumber(), 0);

                const balanceEscrowOrgAfter = await this.billing.getEscrowBalance(this.eventMock.address, org);
                assert.equal(balanceEscrowOrgAfter.toNumber(), 0);
            });

            it('should unlock all escrow during 0% refund (1 sale)', async function () {
                // ////////// 1  - first sale (same as in test above)
                // 1 - ticket is resold for $20.00
                const seller = acc2;
                const buyer = acc3;
                const org = acc4;
                const ticketUnused = web3.utils.fromAscii('');

                // 2 - mint money to buyer
                const firstPrice = 1000;
                const lastPrice = 1000; // during allocate lastPrice is set to firstPrice
                const price = 2000;
                const add = 2460; // including CT fee
                await this.mint.mint(0, buyer, add, { from: creator }).should.be.fulfilled;

                // 3 - ticket is resold for $20.00
                // this will call onSell2 without ref
                await this.eventMock.callSellFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    seller,
                    buyer,
                    org,
                    firstPrice,
                    lastPrice,
                    price,
                    true, // burn from buyer
                    { from: creator }
                ).should.be.fulfilled;

                await this.eventMock.callBuyFromWithin(
                    this.billing.address,
                    ticketUnused,
                    this.st.address,
                    buyer,
                    lastPrice,
                    price,
                    { from: creator }
                ).should.be.fulfilled;

                // update lastPrice manually in the mock
                await this.eventMock.mockFirstLastPrice(firstPrice, price);

                const balanceBuyerPre = await this.st.balanceOf(buyer);
                assert.equal(balanceBuyerPre.toNumber(), 0);

                const balanceOrgPre = await this.st.balanceOf(org);
                assert.equal(balanceOrgPre.toNumber(), 0);

                const balanceSellerPre = await this.st.balanceOf(seller);
                assert.equal(balanceSellerPre.toNumber(), 1000);

                // 4 - mint money to Organizer
                // await this.mint.mint(0, org, firstPrice, { from: creator }).should.be.fulfilled;

                // 4 - do a refund
                const nothing = 0;
                await this.eventMock.callRefundPartialFromWithin(this.billing.address, ticketUnused,
                    this.st.address, buyer, org, nothing).should.be.fulfilled;

                // nothing should be returned to the buyer
                //
                // 500 goes to org from escrow
                // 500 goes to seller from escrow
                const balanceBuyer = await this.st.balanceOf(buyer);
                assert.equal(balanceBuyer.toNumber(), 0);

                const balanceOrg = await this.st.balanceOf(org);
                assert.equal(balanceOrg.toNumber(), 500);

                const balanceSeller = await this.st.balanceOf(seller);
                assert.equal(balanceSeller.toNumber(), 1000 + 500);

                const balanceEscrowSeller2 = await this.billing.getEscrowBalance(this.eventMock.address, seller);
                assert.equal(balanceEscrowSeller2.toNumber(), 0);

                const balanceEscrowOrg2 = await this.billing.getEscrowBalance(this.eventMock.address, org);
                assert.equal(balanceEscrowOrg2.toNumber(), 0);
            });
        });
    });
});
