pragma solidity ^0.5.0;

import "./IBilling.sol";
import "../Rounding.sol";
import "../events/IEvent.sol";
import "../tokens/TokenMint.sol";

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


// IBillingProcessorHandler3 inherits from IBillingProcessorHandler2
// so this contract supports all methods
contract SimpleBillingProcessor3 is IBillingProcessor2, IBillingProcessorHandler3, Ownable, Rounding {
	using SafeMath for uint;

// Fields:
	// 3d version supports partial refund and escrows
	string public contractVersion = "SimpleBillingProcessor3";

	address public cryptoTicketsFeeAccount;

	struct EscrowPerUser {
		address user;
		uint underEscrow;
	}

	struct EventStruct {
		bool switchedOn;
		uint totalFeePpm;
		uint orgGetsPpm;
		uint referalGetsPpm;

		// these escrows are per event per user
		// user -> locked under escrow and is available for unlock
		mapping(address=>uint) escrowMap;

		// these escrows are per event per ticket
		mapping(bytes32=>EscrowPerUser[]) tickets;
	}
	mapping(address=>EventStruct) public events;
	address[] eventsArray;

	TokenMint public tokenMint;

	struct Stats {
		uint soldCount;
		uint sold;

		uint resoldCount;
		uint resold;

		uint refundedCount;
		uint refunded;
	}
	mapping (address=>Stats) stats;

// Methods:
	/**
	 * @dev Constructor.
	 * @param _cryptoTicketsFeeAccount The account that will receive crypto.tickets fees
	 * @param _tokenMint Token mint that is going to mint some tokens as a result.  WARNING: Current contract (this) should be added as a minter to the token mint after deployment
	 */
	constructor(address _cryptoTicketsFeeAccount, TokenMint _tokenMint) public {
		cryptoTicketsFeeAccount = _cryptoTicketsFeeAccount;
		tokenMint = _tokenMint;
	}

	modifier onlyByEvent(){
		require(events[msg.sender].switchedOn==true, "Not an event");
		_;
	}

// IBillingProcessor
	function getContractVersion() external view returns(string memory) {
		return contractVersion;
	}

	/**
	 * @dev Register event contract to work with this billing (default parameters)
	 * You should call that after event is created. Otherwise BP will not be able to process
	 * and will throw in onAllocate, onTransfer, etc.
	 * @param _eventContract Event contract that you are registering
	 */
	function registerEventContract(address _eventContract) external onlyOwner {
		// add with default params
		events[_eventContract].switchedOn = true;
		events[_eventContract].totalFeePpm = 23 * 10000;
		events[_eventContract].orgGetsPpm = 50 * 10000;
		// if referal is present -> ORG gets less than 50%
		events[_eventContract].referalGetsPpm = 10 * 10000;

		eventsArray.push(_eventContract);
	}

	/**
	 * @dev Register event contract to work with this billing (custom parameters)
	 * You should call that after event is created. Otherwise BP will not be able to process
	 * and will throw in onAllocate, onTransfer, etc.
	 * @param _eventContract Event contract that you are registering
	 * @param _totalFeePpm - Fee that is added on top of the _newPrice (in PPMs, see below, can be more than 100%)
	 * @param _orgGetsPpm - How much does Organizer get out of a markup
	 * (in PPMs, can not be more than 100%, see below)
	 *
	 * PPMs:
	 * 100.00 % = 1 000 000 units
	 * 1.00 % = 10 000 units
	 * 0.01% = 100 units
	*/
	function registerEventContractCustomRules2(address _eventContract, uint _totalFeePpm, uint _orgGetsPpm, uint _referalGetsPpm) external onlyOwner {
		require(_orgGetsPpm <= 1000000, "Org cant get >100%");
		require(_referalGetsPpm <= _orgGetsPpm, "Ref cant get > Org");	// referal cant get more than ORG

		events[_eventContract].switchedOn = true;
		events[_eventContract].totalFeePpm = _totalFeePpm;
		events[_eventContract].orgGetsPpm = _orgGetsPpm;
		events[_eventContract].referalGetsPpm = _referalGetsPpm;

		eventsArray.push(_eventContract);
	}

	/**
	 * @dev Change billing params
	 * @param _eventContract Event contract that you are registering
	 * @param _totalFeePpmNew - Fee that is added on top of the _newPrice (in PPMs, see below, can be more than 100%)
	 * @param _orgGetsPpmNew - How much does Organizer get out of a markup
	 * @param _referalGetsPpmNew - How much does Referal get out of a markup
	*/
	function updateEventContractCustomRules2(address _eventContract, uint _totalFeePpmNew, uint _orgGetsPpmNew, uint _referalGetsPpmNew) external onlyOwner {
		require(_orgGetsPpmNew <= 1000000, "Org cant get >100%");
		require(_referalGetsPpmNew <= _orgGetsPpmNew, "Ref cant get > Org"); // referal cant get more than ORG
		require(events[_eventContract].switchedOn==true, "Event not registered");

		events[_eventContract].totalFeePpm = _totalFeePpmNew;
		events[_eventContract].orgGetsPpm = _orgGetsPpmNew;
		events[_eventContract].referalGetsPpm = _referalGetsPpmNew;
	}

	/**
	 * @dev Check whether event contract is registered in the current BP
	 * @param _eventContract Event contract that you want to check
	 */
	function isEventRegistered(address _eventContract) external view returns(bool) {
		return (events[_eventContract].switchedOn);
	}

	/**
	 * @dev Get total amount of events registered
	 */
	function getEventsCount() external view returns(uint) {
		return eventsArray.length;
	}

	/**
	 * @dev Get event parameters by address
	 */
	function getEventContractRules2(address _eventContract) external view returns(uint totalFeePpm, uint orgGetsPpm, uint referalGetsPpm) {
		totalFeePpm = events[_eventContract].totalFeePpm;
		orgGetsPpm = events[_eventContract].orgGetsPpm;
		referalGetsPpm = events[_eventContract].referalGetsPpm;
	}

	/**
	 * @dev Get event parameters at specific index
	 */
	function getEventAtIndex2(uint _i) external view returns(address eventAddress, uint totalFeePpm, uint orgGetsPpm, uint referalGetsPpm) {
		require(_i<eventsArray.length, "Event not found");
		address e = eventsArray[_i];

		EventStruct memory es = events[e];

		// return
		eventAddress = e;
		totalFeePpm = es.totalFeePpm;
		orgGetsPpm = es.orgGetsPpm;
		referalGetsPpm = es.referalGetsPpm;
	}

// IBillingProcessorHandler

	/**
	 * @dev Calculate final price for particular ticket
	 * Price types:
	 * @param _ticket The ticket ID connected with particular Event.
	 * @param _lastPrice - Last ticket price (in the token units, $1.00 = 100 units)
	 * @param _newPrice - New ticket price (in the token units, $1.00 = 100 units)
	 * Returns Final price (in the token units, $1.00 = 100 units)
	 * Example: _lastPrice is $10; _newPrice is $30 _finalPrice will be $36.90
	 * >>>>>>>> See scenarios explained here - https://hackmd.io/QnHrgmCdSve0g0e5KOXKKw
	 */
	function calculateFinalPrice(bytes32 _ticket, uint _lastPrice, uint _newPrice) external onlyByEvent view returns(uint) {
		return _calculateSecondarySalePrice(_lastPrice, _newPrice);
	}

	function _calculateSecondarySalePrice(uint _lastPrice, uint _newPrice) internal view returns(uint) {
		// 1 - crypto tickets gets 23% of a resale price
		uint cryptoTicketsGets = bankersRoundedDiv(_newPrice.mul(events[msg.sender].totalFeePpm),1000000);
		return _newPrice.add(cryptoTicketsGets);
	}

	/**
	 * @dev onAllocate handler. Called when new ticket is allocated. Will mint some tokens to organizer
	 * This method should be called from the Event contract directly.
	 * @param _ticket The ticket ID connected with particular Event.
	 * @param _token StableToken instance connected with Event. This currency will be issued by onAllocate.
	 * @param _buyer Who buys the ticket.
	 * @param _organizer Organizer of the event
	 * @param _price At what price ticket is sold (in the token units, $1.00 = 100 units)
	 */
	function onAllocate(
		bytes32 _ticket,
		StableToken _token,
		address _buyer,
		address _organizer,
		uint _price) external onlyByEvent
	{
		stats[msg.sender].soldCount++;
		stats[msg.sender].sold+=_price;
	}

	/**
	 * @dev onSell2 handler. Called when ticket is sold by the current owner.
	 * (NEW money is introduced to the system from the real world)
	 * This method should be called from the Event contract directly.
	 * @param _ticket The ticket ID connected with particular Event.
	 * @param _tokenForMints StableToken instance connected with Event. This currency will be used to mint to org, seller, etc
	 * @param _from Current ticket owner (not checked!)
	 * @param _to Who buys the ticket.
	 * @param _organizer Organizer of the event.
	 * @param _ref Referal address.
	 * @param _firstPrice - First ticket price (in the token units, $1.00 = 100 units)
	 * @param _lastPrice - Last ticket price (in the token units, $1.00 = 100 units)
	 * @param _newPrice - New ticket price (in the token units, $1.00 = 100 units)
	 * @param _fromTheBalance - NOT USED ANYMORE, left for compatibility
	 * Otherwise - bying from the external system
	 */
	function onSell2(
		bytes32 _ticket,
		StableToken _tokenForMints,
		address _from,
		address _to,
		address _organizer,
		address _ref,
		uint _firstPrice,
		uint _lastPrice,
		uint _newPrice,
		bool _fromTheBalance) external onlyByEvent
	{
		// 1 - calc
		uint markup = 0;
		if(_newPrice>_lastPrice) {
			markup = _newPrice.sub(_lastPrice);
		}

		uint currencyIndex = tokenMint.stableTokenToIndex(_tokenForMints);
		require(currencyIndex!=uint(-1), "Wrong currencyIndex");

		sendToOrgRefAndSeller(
			_ticket,
			_lastPrice,
			markup,
			_newPrice,
			currencyIndex,
			_from,
			_organizer,
			_ref);

		// crypto tickets gets 23% of a resale price
		uint cryptoTicketsGets = bankersRoundedDiv(_newPrice.mul(events[msg.sender].totalFeePpm),1000000);
		tokenMint.mint(currencyIndex, cryptoTicketsFeeAccount, cryptoTicketsGets);

		// 3 - update stats
		stats[msg.sender].resoldCount++;
		stats[msg.sender].resold+=_lastPrice;
	}

	/**
	 * @dev onBuy handler. Called to burn money from buyer (if acquiring is INTERNAL)
	 * This method should be called from the Event contract directly.
	 * @param _ticket The ticket ID connected with particular Event.
	 * @param _tokenForBurns StableToken instance used to burn money (can be different from _tokenForMints above)
	 * @param _to Who buys the ticket.
	 * @param _lastPrice - Last ticket price (in the token units, $1.00 = 100 units)
	 * @param _newPrice - New ticket price (in the token units, $1.00 = 100 units)
	 */
	function onBuy(
		bytes32 _ticket,
		StableToken _tokenForBurns,
		address _to,
		uint _lastPrice,
		uint _newPrice)
		external onlyByEvent
	{
		uint currencyIndex = tokenMint.stableTokenToIndex(_tokenForBurns);
		require(currencyIndex!=uint(-1), "Wrong currencyIndex");
		tokenMint.burnFor(currencyIndex, _to, _calculateSecondarySalePrice(_lastPrice, _newPrice));
	}

	/**
	 * @dev onRefund handler. Will return only the INITIAL price of ticket from Org -> last Buyer (current owner)
	 * WARNING: refund will not return crypto.tickets FEE or buyer profit
	 * This method should be called from the Event contract directly.
	 * see more info about how we calculate refund here - https://hackmd.io/_D0bcn2rRh-WLHADAt2iaQ?view
	 * @param _ticket The ticket ID connected with particular Event.
	 * @param _token StableToken instance connected with Event. This currency will be issued by onAllocate.
	 * @param _owner Current ticket owner (not checked!)
	 * @param _organizer Organizer of the event.
	 */
	function onRefund(bytes32 _ticket, StableToken _token, address _owner, address _organizer) external onlyByEvent {
		refund(_ticket, _token, _owner, _organizer, 1000000);
	}

	function onTransfer(bytes32 _ticket, StableToken _token, address _from, address _to, address _organizer) external onlyByEvent { }
	function onRedeem(bytes32 _ticket, StableToken _token, address _by, address _organizer) external onlyByEvent {}

	function getStats(address _event) external view
		returns(uint sold, uint soldCount, uint resold, uint resoldCount, uint refunded, uint refundedCount)
	{
		sold = stats[_event].sold;
		soldCount = stats[_event].soldCount;

		resold = stats[_event].resold;
		resoldCount = stats[_event].resoldCount;

		refunded = stats[_event].refunded;
		refundedCount = stats[_event].refundedCount;
	}

// IBillingProcessorHandler3
	/**
	 * @dev onRefundPartial handler. Will return only the INITIAL price of ticket from Org -> last Buyer (current owner)
	 * WARNING: refund will not return crypto.tickets FEE or buyer profit
	 * This method should be called from the Event contract directly.
	 * see more info about how we calculate refund here - https://hackmd.io/_D0bcn2rRh-WLHADAt2iaQ?view
	 * @param _ticket The ticket ID connected with particular Event.
	 * @param _token StableToken instance connected with Event. This currency will be issued by onAllocate.
	 * @param _owner Current ticket owner (not checked!)
	 * @param _organizer Organizer of the event.
	 * @param _partialPpm Part of the refund (ФЗ-193, i.e. 5 days before event -> 50%).
	 */
	function onRefundPartial(bytes32 _ticket, StableToken _token, address _owner, address _organizer, uint _partialPpm) external onlyByEvent {
		refund(_ticket, _token, _owner, _organizer, _partialPpm);
	}

	function refund(bytes32 _ticket, StableToken _token, address _owner, address _organizer, uint _partialPpm) internal {
		uint currencyIndex = tokenMint.stableTokenToIndex(_token);
		require(currencyIndex!=uint(-1), "Wrong currencyIndex");

		ITicketManagement_v1 tm = ITicketManagement_v1(msg.sender);
		(uint firstPrice, uint lastPrice) = tm.getTicketData(_ticket);

		// 1 - first return from escrows!
		uint totalInEscrow = refundFromEscrow(currencyIndex, _ticket, _owner, _partialPpm);

		// 2 - the rest is returned from Organizer
		uint rest = 0;
		if(lastPrice>totalInEscrow) {
			rest = lastPrice.sub(totalInEscrow);
		}

		uint orgRefunds = bankersRoundedDiv(rest.mul(_partialPpm),1000000);
		tokenMint.burnFor(currencyIndex, _organizer, orgRefunds);
		tokenMint.mint(currencyIndex, _owner, orgRefunds);

		// 3 - update stats
		stats[msg.sender].refundedCount++;
		stats[msg.sender].refunded+=orgRefunds;
	}

	function setTokenMint(TokenMint _tokenMint) external onlyOwner {
		tokenMint = _tokenMint;
	}

	function getEscrowBalance(address _event, address _who) external view returns(uint) {
		return events[_event].escrowMap[_who];
	}

	function unlockEscrow(StableToken _token, address _event, address _who) external onlyOwner returns(uint) {
		uint currencyIndex = tokenMint.stableTokenToIndex(_token);
		require(currencyIndex!=uint(-1), "Wrong currencyIndex");

		// get everything from the escrow -> balance
		uint currentEscrowBalance = events[_event].escrowMap[_who];
		tokenMint.mint(currencyIndex, _who, currentEscrowBalance);
		events[_event].escrowMap[_who] = 0;
		return 0;
	}

// INTERNAL
	function sendToOrgRefAndSeller(
		bytes32 _ticket,
		uint _lastPrice,
		uint markup,
		uint _newPrice,
		uint currencyIndex,
		address _from,
		address _organizer,
		address _ref) internal returns(uint)
	{
		uint orgGetsEscrow = 0;
		uint refGetsEscrow = 0;

		// 1 - escrow: org gets (X% of markup)
		if(_ref!=address(0x0)) {
			// if referal present -> then org gets less
			orgGetsEscrow = bankersRoundedDiv(markup.mul(events[msg.sender].orgGetsPpm - events[msg.sender].referalGetsPpm),1000000);
			refGetsEscrow = bankersRoundedDiv(markup.mul(events[msg.sender].referalGetsPpm),1000000);
		} else {
			orgGetsEscrow = bankersRoundedDiv(markup.mul(events[msg.sender].orgGetsPpm),1000000);
		}

		// 2 - escrow: seller gets (Y% of markup)
		uint sellerGetsEscrow = 0;
		if(markup > (orgGetsEscrow + refGetsEscrow)) {
			sellerGetsEscrow = markup.sub(orgGetsEscrow + refGetsEscrow);
		}

		// 3 - put in the escrow everything
		putInEscrow(_ticket, _from, sellerGetsEscrow);
		putInEscrow(_ticket, _organizer, orgGetsEscrow);
		putInEscrow(_ticket, _ref, refGetsEscrow);

		// 4 - seller always gets the rest
		uint sellerGets = _newPrice.sub(orgGetsEscrow + sellerGetsEscrow + refGetsEscrow);
		tokenMint.mint(currencyIndex, _from, sellerGets);
	}

	function putInEscrow(bytes32 _ticket, address _who, uint _howMuch) internal {
		if(_howMuch==0) {
			return;
		}

		// 1 - add to map per event/per user
		events[msg.sender].escrowMap[_who]+=_howMuch;

		// 2 - add to map per event/per ticket
		EscrowPerUser memory epu;
		epu.user = _who;
		epu.underEscrow = _howMuch;

		events[msg.sender].tickets[_ticket].push(epu);
	}

	function refundFromEscrow(uint _currencyIndex, bytes32 _ticket, address _to, uint _partialPpm) internal returns(uint) {
		// 1 - move from escrow to balance
		uint wasTotalUnderEscrow = 0;

		for(uint8 i=0; i<events[msg.sender].tickets[_ticket].length; ++i) {
			EscrowPerUser storage epu = events[msg.sender].tickets[_ticket][i];

			if(0!=epu.underEscrow) {
				wasTotalUnderEscrow+=epu.underEscrow;

				uint refundThat = bankersRoundedDiv(epu.underEscrow.mul(_partialPpm),1000000);

				require(events[msg.sender].escrowMap[epu.user]>=refundThat, "Escrow: less than needed");

				// return that amount (N%) to the current ticket owner
				tokenMint.mint(_currencyIndex, _to, refundThat);

				// 2 - dont forget to reduce total escrow per user
				// sub all 100% of a ticket
				events[msg.sender].escrowMap[epu.user] =
					events[msg.sender].escrowMap[epu.user].sub(epu.underEscrow);

				// 3 - send the rest back (100% - N%) to user
				uint rest = epu.underEscrow.sub(refundThat);
				tokenMint.mint(_currencyIndex, epu.user, rest);

				// nothing should be left in the escrow for this ticket
				epu.underEscrow = 0;

				// ^^^ this will update struct automatically, because we use 'storage' modifier
				// so next line is not needed and is commented...
				//events[msg.sender].tickets[_ticket][i].underEscrow = 0;
			}
		}

		return wasTotalUnderEscrow;
	}
}
