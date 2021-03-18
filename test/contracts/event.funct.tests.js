let latestTime = require('../utils/latestTime');

const BigNumber = web3.BigNumber;

const SimpleBillingProcessor2 = artifacts.require('SimpleBillingProcessor2');
const StableToken = artifacts.require('StableToken');
const TokenMint = artifacts.require('TokenMint');
const Event = artifacts.require('Event');

// interfaces
const IEvent2 = artifacts.require('IEvent2');
const ITicketManagement_v1 = artifacts.require('ITicketManagement_v1');

const duration = {
    seconds(val) { return val; },
    minutes(val) { return val * this.seconds(60); },
    hours(val) { return val * this.minutes(60); },
    days(val) { return val * this.hours(24); },
    weeks(val) { return val * this.days(7); },
    years(val) { return val * this.days(365); },
};

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

contract('Event', (accounts) => {
    const creator = accounts[0];

    const ct = accounts[3];
    const ts = accounts[4];
    const org = accounts[5];

    const acc3 = accounts[6];
    const acc4 = accounts[7];
    const acc6 = accounts[4];

    describe('(func tests)', () => {
        // 1 - allocate to org
        // 2 - org transfers to acc4
        // 3 - acc4 refunds
        describe('Scenario 1 - Allocate, transfer, refund', () => {
            it('should create new Event', async function () {
                // 1 - create mint
                this.mint = await TokenMint.new('Crypto.Tickets');
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;

                // 2 - create billing
                this.billing = await SimpleBillingProcessor2.new(ct, this.mint.address);

                // 3 - add minter to mint
                await this.mint.addMinter(0, ct, { from: creator }).should.be.fulfilled;
                await this.mint.addMinter(0, this.billing.address, { from: creator }).should.be.fulfilled;

                // 4 - now create new event
                const tokenAddress = await this.mint.getTokenAddress(0);
                this.st = await StableToken.at(tokenAddress);

                // 5 - create event
                this.endTime = await latestTime() + duration.days(1);

                this.e = await Event.new(
                    this.st.address,
                    this.billing.address,
                    'metadata_v1',
                    'SOME-METADATA',
                    ts,
                    org,
                    0, // _saleStart
                    this.endTime, // _saleEnd
                    0, // _limit
                    0, // _limitPerHolder
                    true, // _isRefundable
                    true, // _isTransferable
                    { from: ct }
                );

                // register event in the billing
                await this.billing.registerEventContract(this.e.address).should.be.fulfilled;
            });

            it('should allocate ticket to org', async function () {
                const ie = await new ITicketManagement_v1(this.e.address);

                const id = web3.utils.fromAscii('123');
                // 1 dollar
                const firstPrice = 1 * 1000000;

                await ie.allocate(
                    org,
                    id,
                    'meta1',
                    '{SOME-DATA-HERE}',
                    firstPrice,
                    { from: ct }
                ).should.be.fulfilled;
            });

            it('should transfer ticket to acc4', async function () {
                const ie = await new ITicketManagement_v1(this.e.address);
                const id = web3.utils.fromAscii('123');

                const bOrg1 = await this.st.balanceOf(org);
                const bBuyer1 = await this.st.balanceOf(acc4);

                // transfer ticket ...
                await ie.transferTo(id, acc4, false, { from: ct }).should.be.fulfilled;

                const bOrg = await this.st.balanceOf(org);
                const bBuyer = await this.st.balanceOf(acc4);
                const bCryptoTickets = await this.st.balanceOf(ct);

                assert.equal(bOrg - bOrg1, 0);
                assert.equal(bBuyer - bBuyer1, 0);
                assert.equal(bCryptoTickets.toNumber(), 0);
            });

            it('should ask for the refund', async function () {
                const ie = await new ITicketManagement_v1(this.e.address);
                const id = web3.utils.fromAscii('123');

                // mint some money to org!
                const firstPrice = 1 * 1000000;
                await this.mint.mint(0, org, firstPrice, { from: ct });

                const bOrg1 = await this.st.balanceOf(org);
                const bSeller1 = await this.st.balanceOf(acc3);
                const bBuyer1 = await this.st.balanceOf(acc4);
                const bCryptoTickets1 = await this.st.balanceOf(ct);

                const runBilling = true;
                await ie.refund(id, runBilling, { from: ct }).should.be.fulfilled;

                const bOrg = await this.st.balanceOf(org);
                const bSeller = await this.st.balanceOf(acc3);
                const bBuyer = await this.st.balanceOf(acc4);
                const bCryptoTickets = await this.st.balanceOf(ct);

                // should burn from ORG!
                // will fail if out of money
                assert.equal(bOrg1 - bOrg, 1000000);

                // should return to buyer initial price
                assert.equal(bBuyer - bBuyer1, 1000000);

                assert.equal(bSeller - bSeller1, 0);
                assert.equal(bCryptoTickets - bCryptoTickets1, 0);
            });
        });

        // 1 - allocate to org
        // 2 - org sells to acc3
        // 3 - acc3 sells to acc4
        // 4 - acc4 refunds
        describe('Scenario 2 - Primary sale, sale, refund', () => {
            it('should create new Event', async function () {
                // 1 - create mint
                this.mint = await TokenMint.new('Crypto.Tickets');
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;

                // 2 - create billing
                this.billing = await SimpleBillingProcessor2.new(ct, this.mint.address);

                // 3 - add minter to mint
                await this.mint.addMinter(0, ct, { from: creator }).should.be.fulfilled;
                await this.mint.addMinter(0, this.billing.address, { from: creator }).should.be.fulfilled;

                // 4 - now create new event
                const tokenAddress = await this.mint.getTokenAddress(0);
                this.st = await StableToken.at(tokenAddress);

                // 5 - create event
                this.endTime = await latestTime() + duration.days(1);

                this.e = await Event.new(
                    this.st.address,
                    this.billing.address,
                    'metadata_v1',
                    'SOME-METADATA',
                    ts,
                    org,
                    0, // _saleStart
                    this.endTime, // _saleEnd
                    0, // _limit
                    0, // _limitPerHolder
                    true, // _isRefundable
                    true, // _isTransferable
                    { from: ct }
                );

                // register event in the billing
                await this.billing.registerEventContract(this.e.address).should.be.fulfilled;
            });

            it('should allocate ticket to org', async function () {
                const ie = await new ITicketManagement_v1(this.e.address);

                const id = web3.utils.fromAscii('123');
                // 1 dollar
                const firstPrice = 1 * 1000000;

                await ie.allocate(
                    org,
                    id,
                    'meta1',
                    '{SOME-DATA-HERE}',
                    firstPrice,
                    { from: ct }
                ).should.be.fulfilled;
            });

            it('should sell ticket to acc3', async function () {
                const ie = await new ITicketManagement_v1(this.e.address);
                const id = web3.utils.fromAscii('123');

                const bOrg1 = await this.st.balanceOf(org);
                const bBuyer1 = await this.st.balanceOf(acc3);
                const bCryptoTickets1 = await this.st.balanceOf(ct);

                // sell ticket ...
                const salePrice = 1 * 1000000;
                const runBilling = true;
                await ie.sellTo(id, acc3, salePrice, runBilling, { from: ct }).should.be.fulfilled;

                const bOrg = await this.st.balanceOf(org);
                const bBuyer = await this.st.balanceOf(acc3);
                const bCryptoTickets = await this.st.balanceOf(ct);

                assert.equal(bOrg - bOrg1, salePrice);
                // no 'buyer' money is burned in this case!!!
                assert.equal(bBuyer - bBuyer1, 0);
                assert.equal(bCryptoTickets - bCryptoTickets1, 230000);
            });

            it('should sell ticket to acc4', async function () {
                const ie = await new ITicketManagement_v1(this.e.address);
                const id = web3.utils.fromAscii('123');

                // must get a 50% of the upside
                const bOrg1 = await this.st.balanceOf(org);
                const bSeller1 = await this.st.balanceOf(acc3);
                const bBuyer1 = await this.st.balanceOf(acc4);
                const bCryptoTickets1 = await this.st.balanceOf(ct);

                const td = await ie.getTicketData(id).should.be.fulfilled;
                assert.equal(td[0], 1000000); // first price
                assert.equal(td[1], 1000000); // last price

                // sell ticket ...
                const salePrice = 2 * 1000000;
                const runBilling = true;
                await ie.sellTo(id, acc4, salePrice, runBilling, { from: ct }).should.be.fulfilled;

                const bOrg = await this.st.balanceOf(org);
                const bSeller = await this.st.balanceOf(acc3);
                const bBuyer = await this.st.balanceOf(acc4);
                const bCryptoTickets = await this.st.balanceOf(ct);

                assert.equal(bBuyer - bBuyer1, 0);
                assert.equal(bOrg - bOrg1, 500000);// 50% of markup
                assert.equal(bSeller - bSeller1, 1500000);
                assert.equal(bCryptoTickets - bCryptoTickets1, 460000);
            });

            it('should ask for the refund', async function () {
                const ie = await new ITicketManagement_v1(this.e.address);
                const id = web3.utils.fromAscii('123');

                const bOrg1 = await this.st.balanceOf(org);
                const bSeller1 = await this.st.balanceOf(acc3);
                const bBuyer1 = await this.st.balanceOf(acc4);
                const bCryptoTickets1 = await this.st.balanceOf(ct);

                const runBilling = true;
                await ie.refund(id, runBilling, { from: ct }).should.be.fulfilled;

                const bOrg = await this.st.balanceOf(org);
                const bSeller = await this.st.balanceOf(acc3);
                const bBuyer = await this.st.balanceOf(acc4);
                const bCryptoTickets = await this.st.balanceOf(ct);

                // should burn from ORG!
                assert.equal(bOrg1 - bOrg, 1000000);
                // should return to buyer initial price
                assert.equal(bBuyer - bBuyer1, 1000000);
                assert.equal(bSeller - bSeller1, 0);
                assert.equal(bCryptoTickets - bCryptoTickets1, 0);
            });
        });

        // 1 - allocate to acc3 DIRECTLY (it is same as allocate to me + transfer)
        // 2 - acc3 sells to acc4
        // 3 - acc4 refunds
        describe('Scenario 3 - Primary sale, sale, refund', () => {
            it('should create new Event', async function () {
                // 1 - create mint
                this.mint = await TokenMint.new('Crypto.Tickets');
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;

                // 2 - create billing
                this.billing = await SimpleBillingProcessor2.new(ct, this.mint.address);

                // 3 - add minter to mint
                await this.mint.addMinter(0, ct, { from: creator }).should.be.fulfilled;
                await this.mint.addMinter(0, this.billing.address, { from: creator }).should.be.fulfilled;

                // 4 - now create new event
                const tokenAddress = await this.mint.getTokenAddress(0);
                this.st = await StableToken.at(tokenAddress);

                // 5 - create new event
                this.endTime = await latestTime() + duration.days(1);
                this.e = await Event.new(
                    this.st.address,
                    this.billing.address,
                    'metadata_v1',
                    'SOME-METADATA',
                    ts,
                    org,
                    0, // _saleStart
                    this.endTime, // _saleEnd
                    0, // _limit
                    0, // _limitPerHolder
                    true, // _isRefundable
                    true, // _isTransferable
                    { from: ct }
                );

                // register event in the billing
                await this.billing.registerEventContract(this.e.address).should.be.fulfilled;
            });

            it('should allocate ticket to acc3', async function () {
                const ie = await new ITicketManagement_v1(this.e.address);

                const id = web3.utils.fromAscii('123');
                // 1 dollar
                const firstPrice = 1 * 1000000;

                await ie.allocate(
                    acc3,
                    id,
                    'meta1',
                    '{SOME-DATA-HERE}',
                    firstPrice,
                    { from: ct }
                ).should.be.fulfilled;
            });

            it('should sell ticket to acc4 (secondary)', async function () {
                const ie = await new ITicketManagement_v1(this.e.address);
                const id = web3.utils.fromAscii('123');

                // must get a 50% of the upside
                const bOrg1 = await this.st.balanceOf(org);
                const bSeller1 = await this.st.balanceOf(acc3);
                const bBuyer1 = await this.st.balanceOf(acc4);
                const bCryptoTickets1 = await this.st.balanceOf(ct);

                // sell ticket ...
                const salePrice = 2 * 1000000;
                const runBilling = true;
                await ie.sellTo(id, acc4, salePrice, runBilling, { from: ct }).should.be.fulfilled;

                const bOrg = await this.st.balanceOf(org);
                const bSeller = await this.st.balanceOf(acc3);
                const bBuyer = await this.st.balanceOf(acc4);
                const bCryptoTickets = await this.st.balanceOf(ct);

                assert.equal(bOrg - bOrg1, 500000);
                assert.equal(bBuyer - bBuyer1, 0);
                assert.equal(bSeller - bSeller1, 1500000);
                assert.equal(bCryptoTickets - bCryptoTickets1, 460000);
            });

            it('should ask for the refund', async function () {
                const ie = await new ITicketManagement_v1(this.e.address);
                const id = web3.utils.fromAscii('123');

                // 1 - mint some to ORG!!!
                // otherwise org will have no money to return!
                const firstPrice = 1 * 1000000;
                await this.mint.mint(0, org, firstPrice, { from: ct });

                // 2 - ask for refund!
                const bOrg1 = await this.st.balanceOf(org);
                const bSeller1 = await this.st.balanceOf(acc3);
                const bBuyer1 = await this.st.balanceOf(acc4);
                const bCryptoTickets1 = await this.st.balanceOf(ct);

                const runBilling = true;
                await ie.refund(id, runBilling, { from: ct }).should.be.fulfilled;

                const bOrg = await this.st.balanceOf(org);
                const bSeller = await this.st.balanceOf(acc3);
                const bBuyer = await this.st.balanceOf(acc4);
                const bCryptoTickets = await this.st.balanceOf(ct);

                assert.equal(bOrg1 - bOrg, firstPrice);
                assert.equal(bBuyer - bBuyer1, 1000000);
                assert.equal(bSeller - bSeller1, 0);
                assert.equal(bCryptoTickets - bCryptoTickets1, 0);
            });
        });

        // 1 - allocate to org
        // 2 - org sells to acc3
        // 3 - acc3 sells to acc4
        // 4 - acc4 refunds
        describe('Scenario 4 - Primary sale, sale, refund (with ref)', () => {
            it('should create new Event', async function () {
                // 1 - create mint
                this.mint = await TokenMint.new('Crypto.Tickets');
                await this.mint.addCurrency('CTUSDT', 'USD', { from: creator }).should.be.fulfilled;

                // 2 - create billing
                this.billing = await SimpleBillingProcessor2.new(ct, this.mint.address);

                // 3 - add minter to mint
                await this.mint.addMinter(0, ct, { from: creator }).should.be.fulfilled;
                await this.mint.addMinter(0, this.billing.address, { from: creator }).should.be.fulfilled;

                // 4 - now create new event
                const tokenAddress = await this.mint.getTokenAddress(0);
                this.st = await StableToken.at(tokenAddress);

                // 5 - create event
                this.endTime = await latestTime() + duration.days(1);

                this.e = await Event.new(
                    this.st.address,
                    this.billing.address,
                    'metadata_v1',
                    'SOME-METADATA',
                    ts,
                    org,
                    0, // _saleStart
                    this.endTime, // _saleEnd
                    0, // _limit
                    0, // _limitPerHolder
                    true, // _isRefundable
                    true, // _isTransferable
                    { from: ct }
                );

                // register event in the billing
                await this.billing.registerEventContract(this.e.address).should.be.fulfilled;
            });

            it('should allocate ticket to org', async function () {
                const ie = await new ITicketManagement_v1(this.e.address);

                const id = web3.utils.fromAscii('123');
                // 1 dollar
                const firstPrice = 1 * 1000000;

                await ie.allocate(
                    org,
                    id,
                    'meta1',
                    '{SOME-DATA-HERE}',
                    firstPrice,
                    { from: ct }
                ).should.be.fulfilled;
            });

            it('should sell ticket to acc3', async function () {
                const ie = await new IEvent2(this.e.address);
                const id = web3.utils.fromAscii('123');

                const bOrg1 = await this.st.balanceOf(org);
                const bBuyer1 = await this.st.balanceOf(acc3);
                const bCryptoTickets1 = await this.st.balanceOf(ct);

                // sell ticket ...
                const salePrice = 1 * 1000000;
                const runBilling = true;
                await ie.sellToWithRef(id, acc3, acc6, salePrice, runBilling, { from: ct }).should.be.fulfilled;

                const bOrg = await this.st.balanceOf(org);
                const bBuyer = await this.st.balanceOf(acc3);
                const bCryptoTickets = await this.st.balanceOf(ct);

                assert.equal(bOrg - bOrg1, salePrice);
                // no 'buyer' money is burned in this case!!!
                assert.equal(bBuyer - bBuyer1, 0);
                assert.equal(bCryptoTickets - bCryptoTickets1, 230000);
            });

            it('should sell ticket to acc4', async function () {
                const ie = await new IEvent2(this.e.address);
                const id = web3.utils.fromAscii('123');

                // must get a 50% of the upside
                const bOrg1 = await this.st.balanceOf(org);
                const bSeller1 = await this.st.balanceOf(acc3);
                const bBuyer1 = await this.st.balanceOf(acc4);
                const bCryptoTickets1 = await this.st.balanceOf(ct);
                const bRef1 = await this.st.balanceOf(acc6);

                const itm = await new ITicketManagement_v1(this.e.address);
                const td = await itm.getTicketData(id).should.be.fulfilled;
                assert.equal(td[0], 1000000); // first price
                assert.equal(td[1], 1000000); // last price

                // sell ticket ...
                const salePrice = 2 * 1000000;
                const runBilling = true;
                await ie.sellToWithRef(id, acc4, acc6, salePrice, runBilling, { from: ct }).should.be.fulfilled;

                const bOrg = await this.st.balanceOf(org);
                const bSeller = await this.st.balanceOf(acc3);
                const bBuyer = await this.st.balanceOf(acc4);
                const bCryptoTickets = await this.st.balanceOf(ct);
                const bRef = await this.st.balanceOf(acc6);

                assert.equal(bBuyer - bBuyer1, 0);
                assert.equal(bOrg - bOrg1, 400000); // 40% of markup
                assert.equal(bRef - bRef1, 100000); // 10% of markup
                assert.equal(bSeller - bSeller1, 1500000);
                assert.equal(bCryptoTickets - bCryptoTickets1, 460000);
            });

            it('should ask for the refund', async function () {
                const ie = await new ITicketManagement_v1(this.e.address);
                const id = web3.utils.fromAscii('123');

                const bOrg1 = await this.st.balanceOf(org);
                const bSeller1 = await this.st.balanceOf(acc3);
                const bBuyer1 = await this.st.balanceOf(acc4);
                const bCryptoTickets1 = await this.st.balanceOf(ct);

                const runBilling = true;
                await ie.refund(id, runBilling, { from: ct }).should.be.fulfilled;

                const bOrg = await this.st.balanceOf(org);
                const bSeller = await this.st.balanceOf(acc3);
                const bBuyer = await this.st.balanceOf(acc4);
                const bCryptoTickets = await this.st.balanceOf(ct);

                // should burn from ORG!
                assert.equal(bOrg1 - bOrg, 1000000);
                // should return to buyer initial price
                assert.equal(bBuyer - bBuyer1, 1000000);
                assert.equal(bSeller - bSeller1, 0);
                assert.equal(bCryptoTickets - bCryptoTickets1, 0);
            });
        });
    });
});
