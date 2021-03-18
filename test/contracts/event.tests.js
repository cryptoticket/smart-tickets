let latestTime = require('../utils/latestTime');
let increaseTimeTo = require('../utils/increaseTime');

const BigNumber = web3.BigNumber;

const SimpleBillingProcessor2 = artifacts.require('SimpleBillingProcessor2');
const StableToken = artifacts.require('StableToken');
const TokenMint = artifacts.require('TokenMint');
const Event = artifacts.require('Event');

// interfaces
const IEvent = artifacts.require('IEvent');
const IEvent2 = artifacts.require('IEvent2');
const IEventData_v1 = artifacts.require('IEventData_v1');
const IEventAccessControl_v1 = artifacts.require('IEventAccessControl_v1');
const IEventSettings_v1 = artifacts.require('IEventSettings_v1');
const ITicketManagement_v1 = artifacts.require('ITicketManagement_v1');
const IEventAccounting_v1 = artifacts.require('IEventAccounting_v1');
const IEventSettings_v1_2 = artifacts.require('IEventSettings_v1_2');

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
    const acc5 = accounts[8];
    const acc6 = accounts[4];

    beforeEach(async function () {
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
    });

    describe('(unit tests)', () => {
        describe('IEvent interface', () => {
            beforeEach(async function () {
                const endTime = await latestTime(); // + duration.weeks(1);

                this.e = await Event.new(
                    this.st.address,
                    this.billing.address,
                    'metadata_v1',
                    'SOME-METADATA',
                    ts,
                    org,
                    0, // _saleStart
                    endTime, // _saleEnd
                    0, // _limit
                    0, // _limitPerHolder
                    true, // _isRefundable
                    true, // _isTransferable
                    { from: ct }
                );
            });

            describe('initialized contract', () => {
                it('should return proper params that was set before', async function () {
                    const ie = await new IEvent(this.e.address);
                    let cv = await ie.getContractVersion();
                    assert.equal(cv, 'Event2');
                });
            });
        });

        describe('IEventData_v1 interface', () => {
            beforeEach(async function () {
                const endTime = await latestTime(); // + duration.weeks(1);

                this.e = await Event.new(
                    this.st.address,
                    this.billing.address,
                    'metadata_v1',
                    'SOME-METADATA',
                    ts,
                    org,
                    0, // _saleStart
                    endTime, // _saleEnd
                    0, // _limit
                    0, // _limitPerHolder
                    true, // _isRefundable
                    true, // _isTransferable
                    { from: ct }
                );
            });

            describe('initialized contract', () => {
                it('should return proper params that was set before', async function () {
                    const ie = await new IEventData_v1(this.e.address);
                    let md = await ie.getMetadata();
                    let mdv = await ie.getMetadataVersion();
                    assert.equal(md, 'SOME-METADATA');
                    assert.equal(mdv, 'metadata_v1');
                });
            });

            describe('updateMetadata', () => {
                it('should not update metata if called by non-owner', async function () {
                    const ie = await new IEventData_v1(this.e.address);
                    await ie.updateMetadata('metadata_v2', 'SOME_METADATA-2')
                        .should.be.rejectedWith('revert');

                    let md = await ie.getMetadata();
                    let mdv = await ie.getMetadataVersion();
                    assert.equal(md, 'SOME-METADATA');
                    assert.equal(mdv, 'metadata_v1');
                });

                it('should update metata', async function () {
                    const ie = await new IEventData_v1(this.e.address);
                    await ie.updateMetadata('metadata_v2', 'SOME_METADATA-2', { from: ct })
                        .should.be.fulfilled;

                    let md = await ie.getMetadata();
                    let mdv = await ie.getMetadataVersion();
                    assert.equal(md, 'SOME_METADATA-2');
                    assert.equal(mdv, 'metadata_v2');
                });
            });
        });

        describe('IEventAccessControl_v1 interface', () => {
            beforeEach(async function () {
                const endTime = await latestTime(); // + duration.weeks(1);

                this.e = await Event.new(
                    this.st.address,
                    this.billing.address,
                    'metadata_v1',
                    'SOME-METADATA',
                    ts,
                    org,
                    0, // _saleStart
                    endTime, // _saleEnd
                    0, // _limit
                    0, // _limitPerHolder
                    true, // _isRefundable
                    true, // _isTransferable
                    { from: ct }
                );
            });

            describe('initialized contract', () => {
                it('should return proper params that was set before', async function () {
                    const ie = await new IEventAccessControl_v1(this.e.address);
                    let ts2 = await ie.getTS();
                    let og2 = await ie.getOG();
                    assert.equal(ts2, ts);
                    assert.equal(og2, org);

                    const isP = await ie.isPaused();
                    assert.equal(isP, false);

                    const isC = await ie.isCancelled();
                    assert.equal(isC, false);
                });
            });

            describe('setTS', () => {
                it('should fail if called from wrong account', async function () {
                    const ie = await new IEventAccessControl_v1(this.e.address);
                    await ie.setTS(acc4).should.be.rejectedWith('revert');

                    let ts2 = await ie.getTS();
                    assert.equal(ts2, ts);
                });

                it('should set proper TS', async function () {
                    const ie = await new IEventAccessControl_v1(this.e.address);
                    await ie.setTS(acc4, { from: ct });

                    let ts2 = await ie.getTS();
                    assert.equal(ts2, acc4);
                });
            });

            describe('setOG', () => {
                it('should fail if called from wrong account', async function () {
                    const ie = await new IEventAccessControl_v1(this.e.address);
                    await ie.setOG(acc4).should.be.rejectedWith('revert');

                    let ts2 = await ie.getOG();
                    assert.equal(ts2, org);
                });

                it('should set proper ORG', async function () {
                    const ie = await new IEventAccessControl_v1(this.e.address);
                    await ie.setOG(acc4, { from: ct });

                    let ts2 = await ie.getOG();
                    assert.equal(ts2, acc4);
                });
            });

            describe('pause', () => {
                it('should not pause if called from wrong contract', async function () {
                    const ie = await new IEventAccessControl_v1(this.e.address);
                    await ie.pause().should.be.rejectedWith('revert');
                    const p = await ie.isPaused();
                    assert.equal(p, false);
                });

                it('should pause contract', async function () {
                    const ie = await new IEventAccessControl_v1(this.e.address);
                    await ie.pause({ from: ct });
                    const p = await ie.isPaused();
                    assert.equal(p, true);
                });
            });

            describe('unpause', () => {
                it('should not unpause if contract is still not paused', async function () {
                    const ie = await new IEventAccessControl_v1(this.e.address);
                    await ie.unpause({ from: ct }).should.be.rejectedWith('revert');
                });

                it('should not unpause if called from wrong contract', async function () {
                    const ie = await new IEventAccessControl_v1(this.e.address);
                    await ie.pause({ from: ct });
                    await ie.unpause().should.be.rejectedWith('revert');
                });

                it('should unpause contract', async function () {
                    const ie = await new IEventAccessControl_v1(this.e.address);
                    await ie.pause({ from: ct });
                    await ie.unpause({ from: ct }).should.be.fulfilled;
                    const p = await ie.isPaused();
                    assert.equal(p, false);
                });
            });

            describe('cancel', () => {
                it('should not cancel if called from wrong account', async function () {
                    const ie = await new IEventAccessControl_v1(this.e.address);
                    await ie.cancel().should.be.rejectedWith('revert');
                    const c2 = await ie.isCancelled();
                    assert.equal(c2, false);
                });

                it('should cancel the event', async function () {
                    const ie = await new IEventAccessControl_v1(this.e.address);
                    const c = await ie.isCancelled();
                    assert.equal(c, false);

                    await ie.cancel({ from: ct });
                    const c2 = await ie.isCancelled();
                    assert.equal(c2, true);
                });
            });
        });

        describe('IEventSettings_v1 interface', () => {
            beforeEach(async function () {
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
            });

            describe('initialized contract', () => {
                it('should return proper params that was set before', async function () {
                    const ie = await new IEventSettings_v1(this.e.address);

                    const stt = await ie.getStableToken();
                    assert.equal(stt, this.st.address);

                    const as = await ie.getAllocationSettings();
                    assert.equal(as[0].toNumber(), 0);
                    assert.equal(as[1].toNumber(), 0);

                    const sds = await ie.getSaleDatesSettings();
                    assert.equal(sds[0].toNumber(), 0);
                    assert.equal(sds[1].toNumber(), this.endTime);

                    const isa = await ie.isSaleActive();
                    assert.equal(isa, true);

                    const ts = await ie.getTransferSettings();
                    assert.equal(ts, true);

                    // WARNING: no way to change that option!!!
                    const rs = await ie.getResaleSettings();
                    assert.equal(rs, true);

                    const refs = await ie.getRefundSettings();
                    assert.equal(refs, true);
                });

                it('should return proper params that was set before 2', async function () {
                    let e = await Event.new(
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
                        false, // _isRefundable
                        false, // _isTransferable
                        { from: ct }
                    );

                    const ie = await new IEventSettings_v1(e.address);

                    const stt = await ie.getStableToken();
                    assert.equal(stt, this.st.address);

                    const as = await ie.getAllocationSettings();
                    assert.equal(as[0].toNumber(), 0);
                    assert.equal(as[1].toNumber(), 0);

                    const sds = await ie.getSaleDatesSettings();
                    assert.equal(sds[0].toNumber(), 0);
                    assert.equal(sds[1].toNumber(), this.endTime);

                    const isa = await ie.isSaleActive();
                    assert.equal(isa, true);

                    const transs = await ie.getTransferSettings();
                    assert.equal(transs, false);

                    // WARNING: no way to change that option!!!
                    const rs = await ie.getResaleSettings();
                    assert.equal(rs, true);

                    const refs = await ie.getRefundSettings();
                    assert.equal(refs, false);
                });
            });

            describe('isSaleActive', () => {
                // TODO: think about changing that behaviour
                it('should return true even if paused', async function () {
                    const ie = await new IEventAccessControl_v1(this.e.address);
                    await ie.pause({ from: ct });
                    const p = await ie.isPaused();
                    assert.equal(p, true);

                    const ies = await new IEventSettings_v1(this.e.address);
                    const isa = await ies.isSaleActive();
                    assert.equal(isa, true);
                });

                // TODO: think about changing that behaviour
                it('should return true even if cancelled', async function () {
                    const ie = await new IEventAccessControl_v1(this.e.address);
                    const c = await ie.isCancelled();
                    assert.equal(c, false);

                    await ie.cancel({ from: ct });
                    const c2 = await ie.isCancelled();
                    assert.equal(c2, true);

                    const ies = await new IEventSettings_v1(this.e.address);
                    const isa = await ies.isSaleActive();
                    assert.equal(isa, true);
                });

                it('should return false if time elapsed', async function () {
                    const ies = await new IEventSettings_v1(this.e.address);
                    const isa = await ies.isSaleActive();
                    assert.equal(isa, true);

                    // move time
                    await increaseTimeTo(duration.days(2));

                    // check again
                    const isa2 = await ies.isSaleActive();
                    assert.equal(isa2, false);
                });
            });

            /*
   // TODO: there is no way to change that
   describe('getTransferSettings', function() {
    it('should return false if transfers are blocked', async function() {

    });
   });

   // TODO: there is no way to change that
   describe('getResaleSettings', function() {
    it('should return false if transfers are blocked', async function() {

    });
   });

   // TODO: there is no way to change that
   describe('getRefundSettings', function() {
    it('should return false if transfers are blocked', async function() {

    });
   });
   */
        });

        describe('ITicketManagement_v1 interface', () => {
            beforeEach(async function () {
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

            describe('isIdUnique', () => {
                it('should return true if no tickets', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('123');
                    const iiu = await ie.isIdUnique(id);
                    assert.equal(iiu, true);
                });
            });

            describe('allocate', () => {
                it('should not allocate new tickets if called by wrong account', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('123');
                    // 1 dollar
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: acc3 }
                    ).should.be.rejectedWith('revert');
                });

                it('should not allocate new tickets if event is not active', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('123'); // 1 dollar const firstPrice = 1 * 1000000;
                    // move time
                    await increaseTimeTo(duration.days(2));

                    const firstPrice = 1 * 1000000;
                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.rejectedWith('revert');
                });

                it('should not allocate new tickets if paused', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123'); // 1 dollar const firstPrice = 1 * 1000000;

                    // pause
                    const ieac = await new IEventAccessControl_v1(this.e.address);
                    await ieac.pause({ from: ct });

                    const firstPrice = 1 * 1000000;
                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.rejectedWith('revert');
                });

                it('should not allocate new tickets if cancelled', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123'); // 1 dollar const firstPrice = 1 * 1000000;

                    // cancel
                    const ieac = await new IEventAccessControl_v1(this.e.address);
                    await ieac.cancel({ from: ct });

                    const firstPrice = 1 * 1000000;
                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.rejectedWith('revert');
                });

                // TODO:
                /*
                it('should not allocate new tickets if _to is bad', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123'); // 1 dollar const firstPrice = 1 * 1000000;

                    const firstPrice = 1 * 1000000;
                    const badAddress = 0;
                    await ie.allocate(
                        badAddress,
                        id,
                        "meta1",
                        "{SOME-DATA-HERE}",
                        firstPrice,
                        {from: ct}
                    ).should.be.rejectedWith('revert');
                });
                */

                it('should not allocate new tickets if already allocated', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123'); // 1 dollar const firstPrice = 1 * 1000000;

                    const firstPrice = 1 * 1000000;
                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.rejectedWith('revert');
                });

                it('should not allocate new tickets if ticket redeemed', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123'); // 1 dollar const firstPrice = 1 * 1000000;

                    const firstPrice = 1 * 1000000;
                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;

                    // redeem
                    await ie.redeem(id, { from: ct }).should.be.fulfilled;

                    // allocate again
                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.rejectedWith('revert');
                });

                it('should not allocate new tickets if event is not registered in the Billing', async function () {
                    const endTime = await latestTime() + duration.days(1);

                    const e = await Event.new(
                        this.st.address,
                        this.billing.address,
                        'metadata_v1',
                        'SOME-METADATA',
                        ts,
                        org,
                        0, // _saleStart
                        endTime, // _saleEnd
                        0, // _limit
                        0, // _limitPerHolder
                        true, // _isRefundable
                        true, // _isTransferable
                        { from: ct }
                    );

                    // register event in the billing
                    // await this.billing.registerEventContract(this.e.address).should.be.fulfilled;

                    const ie = await new ITicketManagement_v1(e.address);

                    const id = web3.utils.fromAscii('123');
                    // 1 dollar
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.rejectedWith('revert');
                });

                it('should not allocate new ticket if total limit reached', async function () {
                    const endTime = await latestTime() + duration.days(1);

                    const e = await Event.new(
                        this.st.address,
                        this.billing.address,
                        'metadata_v1',
                        'SOME-METADATA',
                        ts,
                        org,
                        0, // _saleStart
                        endTime, // _saleEnd
                        1, // _limit
                        0, // _limitPerHolder
                        true, // _isRefundable
                        true, // _isTransferable
                        { from: ct }
                    );

                    // register event in the billing
                    await this.billing.registerEventContract(e.address).should.be.fulfilled;
                    const ie = await new ITicketManagement_v1(e.address);

                    const id = web3.utils.fromAscii('123');
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;

                    // allocate #2
                    const id2 = web3.utils.fromAscii('345');
                    const firstPrice2 = 2 * 1000000;

                    await ie.allocate(
                        acc4,
                        id2,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice2,
                        { from: ct }
                    ).should.be.rejectedWith('revert');
                });

                it('should not allocate new ticket if limit per client reached', async function () {
                    const endTime = await latestTime() + duration.days(1);

                    const e = await Event.new(
                        this.st.address,
                        this.billing.address,
                        'metadata_v1',
                        'SOME-METADATA',
                        ts,
                        org,
                        0, // _saleStart
                        endTime, // _saleEnd
                        0, // _limit
                        1, // _limitPerHolder
                        true, // _isRefundable
                        true, // _isTransferable
                        { from: ct }
                    );

                    // register event in the billing
                    await this.billing.registerEventContract(e.address).should.be.fulfilled;
                    const ie = await new ITicketManagement_v1(e.address);

                    // allocate #1 to client#1
                    const id = web3.utils.fromAscii('123');
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;

                    // allocate #1 to client#2
                    const id2 = web3.utils.fromAscii('345');
                    const firstPrice2 = 2 * 1000000;

                    await ie.allocate(
                        acc3,
                        id2,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice2,
                        { from: ct }
                    ).should.be.fulfilled;

                    // allocate #2 to client#1
                    const id21 = web3.utils.fromAscii('888');

                    await ie.allocate(
                        acc4,
                        id21,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.rejectedWith('revert');
                });

                it('should allocate new tickets when called by Ticketing system', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('123');
                    // 1 dollar
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ts }
                    ).should.be.fulfilled;

                    // check that ticket was allocated
                    const td = await ie.getTicketData(id).should.be.fulfilled;
                    assert.equal(td[0].toNumber(), firstPrice);
                    assert.equal(td[1].toNumber(), firstPrice);

                    const iiu = await ie.isIdUnique(id);
                    assert.equal(iiu, false);
                });

                it('should allocate new tickets when called by Organizer', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('123');
                    // 1 dollar
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: org }
                    ).should.be.fulfilled;

                    // check that ticket was allocated
                    const td = await ie.getTicketData(id).should.be.fulfilled;
                    assert.equal(td[0].toNumber(), firstPrice);
                    assert.equal(td[1].toNumber(), firstPrice);

                    const iiu = await ie.isIdUnique(id);
                    assert.equal(iiu, false);
                });

                it('should allocate new tickets when called by CryptoTickets', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('123');
                    // 1 dollar
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;

                    // check that ticket was allocated
                    const td = await ie.getTicketData(id).should.be.fulfilled;
                    assert.equal(td[0].toNumber(), firstPrice);
                    assert.equal(td[1].toNumber(), firstPrice);

                    const iiu = await ie.isIdUnique(id);
                    assert.equal(iiu, false);

                    // check all balances
                    const bOrg = await this.st.balanceOf(org);
                    assert.equal(bOrg.toNumber(), 0);
                });

                it('should allocate ticket with ZERO firstPrice', async function () {
                    // allocate ticket at $0.00 price
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('555');
                    const firstPrice = 0;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;
                });
            });

            describe('calculateFinalPrice', () => {
                beforeEach(async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('123');
                    // 1 dollar
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;
                });

                // see info here - https://hackmd.io/730KV6wFRXqRu75w9eXtWw
                it('should return correct values for default billing', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    const resalePrice = 2 * 1000000;
                    const fp1 = await ie.calculateFinalPrice(id, resalePrice);
                    assert.equal(fp1.toNumber(), 2460000);
                });

                // see info here - https://hackmd.io/730KV6wFRXqRu75w9eXtWw
                it('should return correct values for default billing 2', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    // same price
                    const resalePrice = 1 * 100;
                    const fp1 = await ie.calculateFinalPrice(id, resalePrice);
                    assert.equal(fp1.toNumber(), 123);
                });

                // see info here - https://hackmd.io/730KV6wFRXqRu75w9eXtWw
                it('should return correct values for default billing 3', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    // same price
                    const resalePrice = 500000;
                    const fp1 = await ie.calculateFinalPrice(id, resalePrice);
                    assert.equal(fp1.toNumber(), 615000);
                });

                // see info here - https://hackmd.io/730KV6wFRXqRu75w9eXtWw
                it('should return correct values for default billing 4', async function () {
                    // allocate ticket at $0.00 price
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('555');
                    const firstPrice = 0;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;

                    // same price
                    const resalePrice = 0;
                    const fp1 = await ie.calculateFinalPrice(id, resalePrice);
                    assert.equal(fp1.toNumber(), 0);
                });
            });

            describe('transferTo', () => {
                beforeEach(async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('123');
                    // 1 dollar
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;
                });

                it('should not transfer ticket if user is the same', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    const o1 = await ie.getOwner(id);
                    assert.equal(o1, acc4);

                    const processBilling = true;
                    await ie.transferTo(id, acc4, processBilling, { from: ct })
                        .should.be.rejectedWith('revert');
                });

                it('should not transfer ticket if paused', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    const o1 = await ie.getOwner(id);
                    assert.equal(o1, acc4);

                    const ieac = await new IEventAccessControl_v1(this.e.address);
                    await ieac.pause({ from: ct });

                    const processBilling = true;
                    await ie.transferTo(id, acc3, processBilling, { from: ct })
                        .should.be.rejectedWith('revert');
                });

                it('should not transfer ticket if cancelled', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    const o1 = await ie.getOwner(id);
                    assert.equal(o1, acc4);

                    const ieac = await new IEventAccessControl_v1(this.e.address);
                    await ieac.cancel({ from: ct });

                    const processBilling = true;
                    await ie.transferTo(id, acc3, processBilling, { from: ct })
                        .should.be.rejectedWith('revert');
                });

                it('should not transfer ticket if time elapsed', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    const o1 = await ie.getOwner(id);
                    assert.equal(o1, acc4);

                    // move time
                    await increaseTimeTo(duration.days(2));

                    const processBilling = true;
                    await ie.transferTo(id, acc3, processBilling, { from: ct })
                        .should.be.rejectedWith('revert');
                });

                it('should not transfer ticket if wrong user', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    const o1 = await ie.getOwner(id);
                    assert.equal(o1, acc4);

                    const processBilling = true;
                    await ie.transferTo(id, acc3, processBilling, { from: acc3 })
                        .should.be.rejectedWith('revert');

                    const o2 = await ie.getOwner(id);
                    assert.equal(o2, acc4);
                });

                it('should not transfer ticket if wrong user 2', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    const o1 = await ie.getOwner(id);
                    assert.equal(o1, acc4);

                    const processBilling = true;
                    await ie.transferTo(id, acc3, processBilling, { from: acc4 })
                        .should.be.rejectedWith('revert');

                    const o2 = await ie.getOwner(id);
                    assert.equal(o2, acc4);
                });

                it('should not transfer tickets if max transfer per user exceeded', async function () {
                    const maxTransfersPerWallet = 2;
                    const minResellPrice = 0;
                    const maxResellPrice = 0;

                    await this.e.setAdditionalSettings(
                        maxTransfersPerWallet, minResellPrice, maxResellPrice, { from: ct }
                    ).should.be.fulfilled;

                    // transfer ticket 1
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');
                    const processBilling = true;
                    await ie.transferTo(id, acc3, processBilling, { from: ct }).should.be.fulfilled;

                    // allocate new ticket2
                    const id2 = web3.utils.fromAscii('234');
                    const firstPrice = 2 * 1000000;

                    await ie.allocate(
                        acc4,
                        id2,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;

                    // transfer ticket 2
                    await ie.transferTo(id2, acc3, processBilling, { from: ct }).should.be.fulfilled;

                    // allocate new ticket3
                    const id3 = web3.utils.fromAscii('345');
                    await ie.allocate(
                        acc4,
                        id3,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;

                    // transfer ticket 3
                    await ie.transferTo(id3, acc3, processBilling, { from: ct }).should.be.rejectedWith('revert');
                });

                it('should transfer ticket to user#2', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    const o1 = await ie.getOwner(id);
                    assert.equal(o1, acc4);

                    const processBilling = true;
                    await ie.transferTo(id, acc3, processBilling, { from: ct }).should.be.fulfilled;

                    const o2 = await ie.getOwner(id);
                    assert.equal(o2, acc3);
                });

                it('should transfer ticket to user#2 with no billing', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    const o1 = await ie.getOwner(id);
                    assert.equal(o1, acc4);

                    const processBilling = false;
                    await ie.transferTo(id, acc3, processBilling, { from: ct }).should.be.fulfilled;

                    const o2 = await ie.getOwner(id);
                    assert.equal(o2, acc3);
                });
            });

            // TODO: test with multiple currencies!
            describe('sellTo', () => {
                beforeEach(async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('123');
                    // 1 dollar
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;
                });

                it('should not sell ticket if called by wrong account', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    const resalePrice = 0;
                    const runBilling = true;
                    await ie.sellTo(id, acc3, resalePrice, runBilling).should.be.rejectedWith('revert');
                });

                it('should not sell ticket with bad ID', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('555');

                    // sell ticket ...
                    const resalePrice = 2 * 1000000;
                    const runBilling = true;
                    await ie.sellTo(id, acc3, resalePrice, runBilling, { from: ct }).should.be.rejectedWith('revert');
                });

                it('should not sell ticket to buyer if resalePrice is > maxResellPrice', async function () {
                    // sepricet max price
                    const maxTransfersPerWallet = 0;
                    const minResellPrice = 0;
                    const maxResellPrice = 1 * 1000000;

                    await this.e.setAdditionalSettings(
                        maxTransfersPerWallet, minResellPrice, maxResellPrice, { from: ct }
                    ).should.be.fulfilled;

                    //
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    // sell ticket ...
                    const resalePrice = 2 * 1000000;
                    const runBilling = true;
                    await ie.sellTo(id, acc3, resalePrice, runBilling, { from: ct }).should.be.rejectedWith('revert');
                });

                it('should not sell ticket to buyer if resalePrice is < minResellPrice', async function () {
                    // sepricet max price
                    const maxTransfersPerWallet = 0;
                    const minResellPrice = 2 * 1000000;
                    const maxResellPrice = 5 * 1000000;

                    await this.e.setAdditionalSettings(
                        maxTransfersPerWallet, minResellPrice, maxResellPrice, { from: ct }
                    ).should.be.fulfilled;

                    //
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    // sell ticket ...
                    const resalePrice = 1 * 1000000;
                    const runBilling = true;
                    await ie.sellTo(id, acc3, resalePrice, runBilling, { from: ct }).should.be.rejectedWith('revert');
                });

                it('should sell ticket to buyer', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    // must get a 50% of the upside
                    const bOrg1 = await this.st.balanceOf(org);
                    const bBuyer1 = await this.st.balanceOf(acc3);
                    const bSeller1 = await this.st.balanceOf(acc4);
                    assert.equal(bOrg1.toNumber(), 0);
                    assert.equal(bBuyer1.toNumber(), 0);
                    assert.equal(bSeller1.toNumber(), 0);

                    // sell ticket ...
                    const resalePrice = 2 * 1000000;
                    // this is going to be a sceondary sale,
                    // because selling from acc4, not ORG
                    const runBilling = true;
                    await ie.sellTo(id, acc3, resalePrice, runBilling, { from: ct }).should.be.fulfilled;

                    const bOrg = await this.st.balanceOf(org);
                    const bBuyer = await this.st.balanceOf(acc3);
                    const bSeller = await this.st.balanceOf(acc4);

                    // (50% of markup)
                    assert.equal(bOrg - bOrg1, 500000);
                    assert.equal(bBuyer - bBuyer1, 0);
                    assert.equal(bSeller - bSeller1, 1500000);

                    const bCryptoTickets = await this.st.balanceOf(ct);
                    assert.equal(bCryptoTickets.toNumber(), 460000);
                });
            });

            // TODO: test with multiple currencies!
            describe('buy', () => {
                beforeEach(async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('123');
                    // 1 dollar
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;

                    // add some tokens to acc3
                    const amount = 10 * 1000000;
                    await this.mint.mint(0, acc3, amount, { from: ct });
                });

                it('should not sell ticket if called by wrong account', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    const resalePrice = 0;
                    const runBilling = true;
                    await ie.buy(id, acc3, resalePrice, runBilling, { from: acc3 }).should.be.rejectedWith('revert');
                });

                it('should not sell ticket with bad ID', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('555');

                    // buy a ticket ...
                    const resalePrice = 2 * 1000000;
                    const runBilling = true;
                    await ie.buy(id, acc3, resalePrice, runBilling, { from: ct }).should.be.rejectedWith('revert');
                });

                it('should not buy ticket if not enough money', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    const neededSum = 2460000;
                    // will be 10 short
                    const amount = neededSum - 10;
                    await this.mint.mint(0, acc3, amount, { from: ct });

                    // buy a ticket ...
                    const resalePrice = 2 * 1000000;
                    const runBilling = true;
                    await ie.buy(id, acc5, resalePrice, runBilling, { from: ct }).should.be.rejectedWith('revert');
                });

                it('should buy ticket from acc4 to acc3', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    // must get a 50% of the upside
                    let bOrg = await this.st.balanceOf(org);
                    let bBuyer = await this.st.balanceOf(acc3);
                    let bSeller = await this.st.balanceOf(acc4);

                    // buy a ticket ...
                    const resalePrice = 2 * 1000000;
                    const runBilling = true;
                    await ie.buy(id, acc3, resalePrice, runBilling, { from: ct }).should.be.fulfilled;

                    // check balances again
                    const bOrg2 = await this.st.balanceOf(org);
                    const bBuyer2 = await this.st.balanceOf(acc3);
                    const bSeller2 = await this.st.balanceOf(acc4);

                    // seller earns $1.00 + $0.50 = $1.50
                    assert.equal(bSeller2.toNumber() - bSeller.toNumber(), 1500000);
                    // buyer pays $2.46
                    assert.equal(bBuyer.toNumber() - bBuyer2.toNumber(), 2460000);
                    // org gets $0.50
                    assert.equal(bOrg2.toNumber() - bOrg.toNumber(), 500000);
                });
            });

            describe('getOwner', () => {
                beforeEach(async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('123');
                    // 1 dollar
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;
                });

                it('should return no owner if wrong ticket', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('456');

                    const o1 = await ie.getOwner(id);
                    assert.equal(o1, 0);
                });

                it('should return correct ticket owner', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    const o1 = await ie.getOwner(id);
                    assert.equal(o1, acc4);
                });
            });

            describe('getTicketData', () => {
                beforeEach(async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('123');
                    // 1 dollar
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;
                });

                it('should return proper ticket data after ticket is allocated', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    // 1 dollar
                    const firstPrice = 1 * 1000000;
                    const id = web3.utils.fromAscii('123');

                    const td = await ie.getTicketData(id).should.be.fulfilled;
                    assert.equal(td[0].toNumber(), firstPrice);
                    assert.equal(td[1].toNumber(), firstPrice);
                });

                it('should return proper ticket data after ticket is resold', async function () {
                    // 1 dollar
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');
                    const firstPrice = 1 * 1000000;

                    // sell ticket ...
                    const resalePrice = 2 * 1000000;
                    const runBilling = true;
                    await ie.sellTo(id, acc3, resalePrice, runBilling, { from: ct }).should.be.fulfilled;
                    // const fp1 = await ie.calculateFinalPrice(id, resalePrice);

                    const td = await ie.getTicketData(id).should.be.fulfilled;
                    assert.equal(td[0].toNumber(), firstPrice);
                    assert.equal(td[1].toNumber(), resalePrice);
                });
            });

            describe('setTicketData', () => {
                beforeEach(async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('123');
                    // 1 dollar
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;
                });

                it('should not set new price if wrong acc', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const oldPrice = 1 * 1000000;
                    const newPrice = 2 * 1000000;
                    const id = web3.utils.fromAscii('123');

                    await ie.setTicketData(id, newPrice, { from: acc4 }).should.be.rejectedWith('revert');

                    const td = await ie.getTicketData(id).should.be.fulfilled;
                    assert.equal(td[0].toNumber(), oldPrice);
                    assert.equal(td[1].toNumber(), oldPrice);
                });

                it('should not set new price if transferred ticket', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const oldPrice = 1 * 1000000;
                    const newPrice = 2 * 1000000;
                    const id = web3.utils.fromAscii('123');

                    // transfer
                    const processBilling = true;
                    await ie.transferTo(id, acc3, processBilling, { from: ct }).should.be.fulfilled;

                    await ie.setTicketData(id, newPrice, { from: org }).should.be.rejectedWith('revert');

                    const td = await ie.getTicketData(id).should.be.fulfilled;
                    assert.equal(td[0].toNumber(), oldPrice);
                    assert.equal(td[1].toNumber(), oldPrice);
                });

                it('should not set new price if sold ticket', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const oldPrice = 1 * 1000000;
                    const newPrice = 2 * 1000000;
                    const id = web3.utils.fromAscii('123');

                    // transfer
                    const resalePrice = 2 * 1000000;
                    const runBilling = true;
                    await ie.sellTo(id, acc5, resalePrice, runBilling, { from: ct }).should.be.fulfilled;

                    await ie.setTicketData(id, newPrice, { from: org }).should.be.rejectedWith('revert');

                    const td = await ie.getTicketData(id).should.be.fulfilled;
                    assert.equal(td[0].toNumber(), oldPrice);
                });

                it('should set new price if ticket was never sold/transferred', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const newPrice = 2 * 1000000;
                    const id = web3.utils.fromAscii('123');

                    // from org
                    await ie.setTicketData(id, newPrice, { from: org }).should.be.fulfilled;

                    const td = await ie.getTicketData(id).should.be.fulfilled;
                    assert.equal(td[0].toNumber(), newPrice);
                    assert.equal(td[1].toNumber(), newPrice);
                });
            });

            describe('getTicketMetadata', () => {
                beforeEach(async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('123');
                    // 1 dollar
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;
                });

                it('should not return data for wrong ticket ID', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('555');

                    const md = await ie.getTicketMetadata(id);
                    const one = md[0];
                    const two = md[1];
                    assert.equal(one, '');
                    assert.equal(two, '');
                });

                it('should return proper ticket metadata after ticket is allocated', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    const md = await ie.getTicketMetadata(id);
                    const one = md[0];
                    const two = md[1];
                    assert.equal(one, 'meta1');
                    assert.equal(two, '{SOME-DATA-HERE}');
                });
            });

            describe('redeem', () => {
                beforeEach(async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('123');
                    // 1 dollar
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;
                });

                it('should not redeem ticket if called by non admin', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');
                    await ie.redeem(id, { from: acc3 }).should.be.rejectedWith('revert');
                });

                it('should not redeem ticket event if called by ticket owner', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');
                    await ie.redeem(id, { from: acc4 }).should.be.rejectedWith('revert');
                });

                it('should not redeem a ticket if bad ID', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const badID = web3.utils.fromAscii('555');
                    await ie.redeem(badID, { from: ct }).should.be.rejectedWith('revert');
                });

                it('should redeem ticket', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');
                    await ie.redeem(id, { from: ct }).should.be.fulfilled;
                });

                it('should not redeem ticket twice', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');
                    await ie.redeem(id, { from: ct }).should.be.fulfilled;
                    await ie.redeem(id, { from: ct }).should.be.rejectedWith('revert');
                });
            });

            describe('refund', () => {
                beforeEach(async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('123');
                    // 1 dollar
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;

                    // mint
                    const amount = 1 * 1000000;
                    await this.mint.mint(0, org, amount, { from: ct });
                });

                it('should not refund ticket if called by non admin', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');
                    const runBilling = true;
                    await ie.refund(id, runBilling, { from: acc3 }).should.be.rejectedWith('revert');
                });

                it('should not refund ticket event if called by ticket owner', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');
                    const runBilling = true;
                    await ie.refund(id, runBilling, { from: acc4 }).should.be.rejectedWith('revert');
                });

                it('should not refund a ticket if bad ID', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const badID = web3.utils.fromAscii('555');
                    const runBilling = true;
                    await ie.refund(badID, runBilling, { from: ct }).should.be.rejectedWith('revert');
                });

                it('should not refund ticket twice', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');
                    const runBilling = true;

                    await ie.refund(id, runBilling, { from: ct }).should.be.fulfilled;
                    await ie.refund(id, runBilling, { from: ct }).should.be.rejectedWith('revert');
                });

                it('should refund allocated ticket', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    const bOrg1 = await this.st.balanceOf(org);
                    const bOwner1 = await this.st.balanceOf(acc4);

                    const runBilling = true;
                    await ie.refund(id, runBilling, { from: ct }).should.be.fulfilled;

                    // TODO: check owner count

                    // should be burned from ORG
                    const bOrg = await this.st.balanceOf(org);
                    assert.equal(bOrg1 - bOrg, 1000000);

                    // should be minted to last owner
                    const bOwner = await this.st.balanceOf(acc4);
                    assert.equal(bOwner - bOwner1, 1000000);
                });

                it('should refund allocated and transferred ticket', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    // 1 - transfer to acc5
                    const processBilling = true;
                    await ie.transferTo(id, acc5, processBilling, { from: ct }).should.be.fulfilled;

                    // 2 - refund
                    const bOrg1 = await this.st.balanceOf(org);
                    const bOwner1 = await this.st.balanceOf(acc5);
                    const runBilling = true;
                    await ie.refund(id, runBilling, { from: ct }).should.be.fulfilled;

                    // should be burned from ORG
                    const bOrg = await this.st.balanceOf(org);
                    assert.equal(bOrg1 - bOrg, 1000000);

                    // should be minted to last owner!
                    const bOwner = await this.st.balanceOf(acc5);
                    assert.equal(bOwner - bOwner1, 1000000);
                });

                it('should refund allocated and sold ticket', async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    // 1 - sell to acc5
                    const resalePrice = 2 * 1000000;
                    const runBilling = true;
                    await ie.sellTo(id, acc5, resalePrice, runBilling, { from: ct }).should.be.fulfilled;

                    // 2 - refund
                    const bOrg1 = await this.st.balanceOf(org);
                    const bOwner1 = await this.st.balanceOf(acc5);
                    await ie.refund(id, runBilling, { from: ct }).should.be.fulfilled;

                    // should be burned from ORG
                    const bOrg = await this.st.balanceOf(org);
                    assert.equal(bOrg1 - bOrg, 1000000);

                    // should be minted to last owner!
                    const bOwner = await this.st.balanceOf(acc5);
                    assert.equal(bOwner - bOwner1, 1000000);
                });
            });
        });

        describe('IEventAccounting_v1 interface', () => {
            beforeEach(async function () {
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

            describe('getBillingProcessor', () => {
                it('should get default BP', async function () {
                    const ie = await new IEventAccounting_v1(this.e.address);
                    const bp = await ie.getBillingProcessor();
                    assert.equal(bp, this.billing.address);
                });
            });

            describe('setBillingProcessor', () => {
                it('should not set new BP if called from wrong acc', async function () {
                    const ie = await new IEventAccounting_v1(this.e.address);

                    const bpNew = await SimpleBillingProcessor2.new(ct, this.mint.address);
                    await ie.setBillingProcessor(bpNew.address).should.be.rejectedWith('revert');

                    const bp = await ie.getBillingProcessor();
                    assert.equal(bp, this.billing.address);
                });

                it('should set new BP', async function () {
                    const ie = await new IEventAccounting_v1(this.e.address);

                    const bpNew = await SimpleBillingProcessor2.new(ct, this.mint.address);
                    await ie.setBillingProcessor(bpNew.address, { from: ct }).should.be.fulfilled;

                    const bp = await ie.getBillingProcessor();
                    assert.equal(bp, bpNew.address);
                });
            });
        });

        describe('IEventSettings_v1_2 interface', () => {
            beforeEach(async function () {
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

            describe('setAdditionalSettings', () => {
                it('should not set params if called not by ct', async function () {
                    const maxTransfersPerWallet = 10;
                    const minResellPrice = 100;
                    const maxResellPrice = 200;

                    await this.e.setAdditionalSettings(
                        maxTransfersPerWallet, minResellPrice, maxResellPrice
                    ).should.be.rejectedWith('revert');

                    const out = await this.e.getAdditionalSettings();
                    assert.equal(out[0], 0);
                    assert.equal(out[1], 0);
                    assert.equal(out[2], 0);
                });

                it('should allow to set params by ct', async function () {
                    const maxTransfersPerWallet = 10;
                    const minResellPrice = 100;
                    const maxResellPrice = 200;

                    await this.e.setAdditionalSettings(
                        maxTransfersPerWallet, minResellPrice, maxResellPrice, { from: ct }
                    ).should.be.fulfilled;

                    const out = await this.e.getAdditionalSettings();
                    assert.equal(out[0], maxTransfersPerWallet);
                    assert.equal(out[1], minResellPrice);
                    assert.equal(out[2], maxResellPrice);
                });
            });
        });

        describe('IEvent2 interface', () => {
            beforeEach(async function () {
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

            describe('sellToWithRef', () => {
                beforeEach(async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('123');
                    // 1 dollar
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;
                });

                it('should not sell ticket if called by wrong account', async function () {
                    const ie = await new IEvent2(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    const resalePrice = 0;
                    const runBilling = true;
                    await ie.sellToWithRef(id, acc3, acc6, resalePrice, runBilling).should.be.rejectedWith('revert');
                });

                it('should not sell ticket with bad ID', async function () {
                    const ie = await new IEvent2(this.e.address);
                    const id = web3.utils.fromAscii('555');

                    // sell ticket ...
                    const resalePrice = 2 * 1000000;
                    const runBilling = true;
                    await ie.sellToWithRef(id, acc3, acc6, resalePrice, runBilling, { from: ct }).should.be.rejectedWith('revert');
                });

                it('should not sell ticket to buyer if resalePrice is > maxResellPrice', async function () {
                    // sepricet max price
                    await new IEventSettings_v1_2(this.e.address);

                    const maxTransfersPerWallet = 0;
                    const minResellPrice = 0;
                    const maxResellPrice = 1 * 1000000;

                    await this.e.setAdditionalSettings(
                        maxTransfersPerWallet, minResellPrice, maxResellPrice, { from: ct }
                    ).should.be.fulfilled;

                    //
                    const ie = await new IEvent2(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    // sell ticket ...
                    const resalePrice = 2 * 1000000;
                    const runBilling = true;
                    await ie.sellToWithRef(id, acc3, acc6, resalePrice, runBilling, { from: ct }).should.be.rejectedWith('revert');
                });

                it('should not sell ticket to buyer if resalePrice is < minResellPrice', async function () {
                    // sepricet max price
                    await new IEventSettings_v1_2(this.e.address);

                    const maxTransfersPerWallet = 0;
                    const minResellPrice = 2 * 1000000;
                    const maxResellPrice = 5 * 1000000;

                    await this.e.setAdditionalSettings(
                        maxTransfersPerWallet, minResellPrice, maxResellPrice, { from: ct }
                    ).should.be.fulfilled;

                    //
                    const ie = await new IEvent2(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    // sell ticket ...
                    const resalePrice = 1 * 1000000;
                    const runBilling = true;
                    await ie.sellToWithRef(id, acc3, acc6, resalePrice, runBilling, { from: ct }).should.be.rejectedWith('revert');
                });

                it('should sell ticket to buyer', async function () {
                    const ie = await new IEvent2(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    // must get a 50% of the upside
                    const bOrg1 = await this.st.balanceOf(org);
                    const bBuyer1 = await this.st.balanceOf(acc3);
                    const bSeller1 = await this.st.balanceOf(acc4);
                    assert.equal(bOrg1.toNumber(), 0);
                    assert.equal(bBuyer1.toNumber(), 0);
                    assert.equal(bSeller1.toNumber(), 0);

                    // sell ticket ...
                    const resalePrice = 2 * 1000000;
                    // this is going to be a sceondary sale,
                    // because selling from acc4, not ORG
                    const runBilling = true;
                    await ie.sellToWithRef(id, acc3, acc6, resalePrice, runBilling, { from: ct }).should.be.fulfilled;

                    const bOrg = await this.st.balanceOf(org);
                    const bBuyer = await this.st.balanceOf(acc3);
                    const bSeller = await this.st.balanceOf(acc4);

                    // (40% of markup)
                    assert.equal(bOrg - bOrg1, 400000);
                    assert.equal(bBuyer - bBuyer1, 0);
                    assert.equal(bSeller - bSeller1, 1500000);

                    const bCryptoTickets = await this.st.balanceOf(ct);
                    assert.equal(bCryptoTickets.toNumber(), 460000);
                });
            });

            // TODO: test with multiple currencies!
            describe('buyWithRef', () => {
                beforeEach(async function () {
                    const ie = await new ITicketManagement_v1(this.e.address);

                    const id = web3.utils.fromAscii('123');
                    // 1 dollar
                    const firstPrice = 1 * 1000000;

                    await ie.allocate(
                        acc4,
                        id,
                        'meta1',
                        '{SOME-DATA-HERE}',
                        firstPrice,
                        { from: ct }
                    ).should.be.fulfilled;

                    // add some tokens to acc3
                    const amount = 10 * 1000000;
                    await this.mint.mint(0, acc3, amount, { from: ct });
                });

                it('should not sell ticket if called by wrong account', async function () {
                    const ie = await new IEvent2(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    const resalePrice = 0;
                    const runBilling = true;
                    await ie.buyWithRef(id, acc3, acc6, resalePrice, runBilling, { from: acc3 }).should.be.rejectedWith('revert');
                });

                it('should not sell ticket with bad ID', async function () {
                    const ie = await new IEvent2(this.e.address);
                    const id = web3.utils.fromAscii('555');

                    // buy a ticket ...
                    const resalePrice = 2 * 1000000;
                    const runBilling = true;
                    await ie.buyWithRef(id, acc3, acc6, resalePrice, runBilling, { from: ct }).should.be.rejectedWith('revert');
                });

                it('should not buy ticket if not enough money', async function () {
                    const ie = await new IEvent2(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    const neededSum = 2460000;
                    // will be 10 short
                    const amount = neededSum - 10;
                    await this.mint.mint(0, acc3, amount, { from: ct });

                    // buy a ticket ...
                    const resalePrice = 2 * 1000000;
                    const runBilling = true;
                    await ie.buyWithRef(id, acc5, acc6, resalePrice, runBilling, { from: ct }).should.be.rejectedWith('revert');
                });

                it('should buy ticket from acc4 to acc3', async function () {
                    const ie = await new IEvent2(this.e.address);
                    const id = web3.utils.fromAscii('123');

                    // must get a 50% of the upside
                    let bOrg = await this.st.balanceOf(org);
                    let bBuyer = await this.st.balanceOf(acc3);
                    let bSeller = await this.st.balanceOf(acc4);

                    // buy a ticket ...
                    const resalePrice = 2 * 1000000;
                    const runBilling = true;
                    await ie.buyWithRef(id, acc3, acc6, resalePrice, runBilling, { from: ct }).should.be.fulfilled;

                    // check balances again
                    const bOrg2 = await this.st.balanceOf(org);
                    const bBuyer2 = await this.st.balanceOf(acc3);
                    const bSeller2 = await this.st.balanceOf(acc4);

                    // seller earns $1.00 + $0.50 = $1.50
                    assert.equal(bSeller2.toNumber() - bSeller.toNumber(), 1500000);
                    // buyer pays $2.46
                    assert.equal(bBuyer.toNumber() - bBuyer2.toNumber(), 2460000);
                    // org gets $0.40
                    assert.equal(bOrg2.toNumber() - bOrg.toNumber(), 400000);
                });
            });
        });
    });
});
