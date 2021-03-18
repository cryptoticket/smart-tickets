pragma solidity ^0.5.0;

import "./IBilling.sol";
import "../Rounding.sol";
import "../events/IEvent.sol";
import "../tokens/TokenMint.sol";

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract SimpleBillingProcessor2 is IBillingProcessor2, IBillingProcessorHandler2, Ownable, Rounding {
	using SafeMath for uint;

// Fields:
	// 2nd version supports referals (_ref param was added)
	string public contractVersion = "SimpleBillingProcessor2";

	address public cryptoTicketsFeeAccount;

	struct EventStruct {
		bool switchedOn;
		uint totalFeePpm;
		uint orgGetsPpm;
		uint referalGetsPpm;
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
	 * @param _token StableToken instance connected with Event. This currency will be issued by onAllocate.
	 * @param _from Current ticket owner (not checked!)
	 * @param _to Who buys the ticket.
	 * @param _organizer Organizer of the event.
	 * @param _ref Referal address.
	 * @param _firstPrice - First ticket price (in the token units, $1.00 = 100 units)
	 * @param _lastPrice - Last ticket price (in the token units, $1.00 = 100 units)
	 * @param _newPrice - New ticket price (in the token units, $1.00 = 100 units)
	 * @param _fromTheBalance - Buying from the _to balance (will burn the _to balance in this case!).
	 * Otherwise - bying from the external system
	 */
	function onSell2(
		bytes32 _ticket,
		StableToken _token,
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

		uint currencyIndex = tokenMint.stableTokenToIndex(_token);
		require(currencyIndex!=uint(-1), "Wrong currencyIndex");

		sendToOrgRefAndSeller(markup, currencyIndex, _from, _organizer, _ref, _newPrice);

		// crypto tickets gets 23% of a resale price
		uint cryptoTicketsGets = bankersRoundedDiv(_newPrice.mul(events[msg.sender].totalFeePpm),1000000);

		// 2 - distribute everything
		if(_fromTheBalance) {
			tokenMint.burnFor(currencyIndex, _to, _calculateSecondarySalePrice(_lastPrice, _newPrice));
		}

		tokenMint.mint(currencyIndex, cryptoTicketsFeeAccount, cryptoTicketsGets);

		// 3 - update stats
		stats[msg.sender].resoldCount++;
		stats[msg.sender].resold+=_lastPrice;
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
		uint currencyIndex = tokenMint.stableTokenToIndex(_token);
		require(currencyIndex!=uint(-1), "Wrong currencyIndex");

		///////////////////////////////////////////////////
		// TODO: check if ORG never earned the firstPrice!
		ITicketManagement_v1 tm = ITicketManagement_v1(msg.sender);
		(uint firstPrice, uint lastPrice) = tm.getTicketData(_ticket);

		// will fail if ORG is out of money...
		// burn from org
		//
		// TODO: fix if referal was present
		tokenMint.burnFor(currencyIndex, _organizer, firstPrice);

		// mint to current owner
		tokenMint.mint(currencyIndex, _owner, firstPrice);

		// update stats
		stats[msg.sender].refundedCount++;
		stats[msg.sender].refunded+=firstPrice;
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

	function sendToOrgRefAndSeller(uint markup, uint currencyIndex, address _from, address _organizer, address _ref, uint _newPrice) internal returns(uint) {
		uint orgGets = 0;
		uint refGets = 0;

		if(_ref!=address(0x0)) {
			// if referal present -> then org gets less
			orgGets = bankersRoundedDiv(markup.mul(events[msg.sender].orgGetsPpm - events[msg.sender].referalGetsPpm),1000000);
			refGets = bankersRoundedDiv(markup.mul(events[msg.sender].referalGetsPpm),1000000);
		} else {
			orgGets = bankersRoundedDiv(markup.mul(events[msg.sender].orgGetsPpm),1000000);
		}

		// seller gets resale price - (50% markup)
		uint sellerGets = _newPrice.sub(orgGets + refGets);

		tokenMint.mint(currencyIndex, _from, sellerGets);
		tokenMint.mint(currencyIndex, _organizer, orgGets);
		if(_ref!=address(0x0) && (refGets!=0)) {
			tokenMint.mint(currencyIndex, _ref, refGets);
		}
	}

	function setTokenMint(TokenMint _tokenMint) external onlyOwner {
		tokenMint = _tokenMint;
	}
}
