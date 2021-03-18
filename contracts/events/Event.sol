pragma solidity ^0.5.0;

import "./IEvent.sol";

import "../tokens/StableToken.sol";
import "../billing/IBilling.sol";


contract AccessControl is IEventAccessControl_v1 {
	address public addressCT;
	address public addressTS;
	address public addressOG;

	bool isPausedVar = false;
	bool isCancelledVar = false;

	modifier onlyCT() {require(msg.sender == addressCT, "Access restricted"); _;}
	modifier onlyTS() {require(msg.sender == addressTS, "Access restricted"); _;}
	modifier onlyAdmin() {
		require(
			msg.sender == addressCT ||
			msg.sender == addressTS ||
			msg.sender == addressOG, "Access restricted"
		);
		_;
	}
	modifier isEventActive() {
		require(!isPausedVar && !isCancelledVar, "Event is paused");
		require(!isPausedVar && !isCancelledVar, "Event is canceled");
		_;
	}

	constructor(address _addressTS, address _addressOG) public {
		addressCT = msg.sender;	// TODO: change to owner
		addressTS = _addressTS;
		addressOG = _addressOG;
	}

	function isPaused() external view returns(bool) { return isPausedVar; }
	function isCancelled() external view returns(bool) { return isCancelledVar; }

	function getTS() external view returns(address) {
		return addressTS;
	}

	function getOG() external view returns(address) {
		return addressOG;
	}

	function setTS(address _addressTS) external onlyCT() {
		require(_addressTS != address(0), "Invalid address");
		addressTS = _addressTS;
	}

	function setOG(address _addressOG) external onlyCT() {
		require(_addressOG != address(0), "Invalid address");
		addressOG = _addressOG;
	}

	function pause() external onlyAdmin() isEventActive() {
		isPausedVar = true;
	}

	function unpause() external onlyAdmin() {
		require(isPausedVar, "Event is active");
		require(!isCancelledVar, "Event is cancelled");
		isPausedVar = false;
	}

	function cancel() external onlyCT() {
		isCancelledVar = true;
	}
}


contract EventSettings is IEventSettings_v1 {
	uint public saleStart;
	uint public saleEnd;

	uint public allocated;
	uint public limitTotal;
	uint public limitPerHolder;

	bool isRefundable;
	bool isTransferable;

	uint maxTransfersPerWallet;
	uint minResellPrice;
	uint maxResellPrice;

	// Each Event has single StableToken attached (only one currency)
	// this token is controlled by crypto.tickets!
	// CAN BE ZERO!!!
	StableToken token;

	modifier refundable() {require(isRefundable, "Event tickets is not refundable"); _;}
	modifier transferable() {require(isTransferable, "Event tickets is not transferable"); _;}

	modifier isSaleActiveMod() {
		require(now > saleStart, "Event tickets sale not started yet");
		require(now < saleEnd, "Event tickets sale is finished");
		_;
	}

	constructor (
		StableToken _token,
		uint _saleStart,
		uint _saleEnd,
		uint _limitTotal,
		uint _limitPerHolder,
		bool _isRefundable,
		bool _isTransferable
	)
	public
	{
		token = _token;
		saleStart = _saleStart;
		saleEnd = _saleEnd;

		// tickets per event
		limitTotal = _limitTotal;
		// tickets per holder
		limitPerHolder = _limitPerHolder;

		isRefundable = _isRefundable;
		isTransferable = _isTransferable;
	}

	function getAllocationSettings() external view
	returns(uint limitTotalOut, uint limitPerHolderOut)
	{
		limitTotalOut = limitTotal;
		limitPerHolderOut = limitPerHolder;
	}

	function getSaleDatesSettings() external view returns(uint saleStartOut, uint saleEndOut) {
		saleStartOut = saleStart;
		saleEndOut = saleEnd;
	}

	function getTransferSettings()external view returns(bool isTransferAllowed) {
		isTransferAllowed = isTransferable;
	}

	function getResaleSettings()external view returns(bool isResellAllowed) {
		// always return TRUE in this version
		isResellAllowed = true;
	}

	function getRefundSettings()external view returns(bool isRefundAllowed) {
		isRefundAllowed = isRefundable;
	}

	function isSaleActive() external view returns(bool) {
		return ((now > saleStart) && (now < saleEnd));
	}

	function getStableToken()external view returns(address) {
		return address(token);
	}
}


contract TicketsManagement is AccessControl, EventSettings, ITicketManagement_v1 {
	mapping (address => uint) public owners;

	IBillingProcessorHandler2 public bp;

	struct TicketData {
		string metadataVersion;
		string rawMetadata;
		uint firstPrice;
		uint lastPrice;

		address firstHolder;
		address currentHolder;
		address redeemedBy;
	}

	mapping (address => uint) public transfersPerHolder;
	mapping (bytes32 => TicketData) public ticketData;

	event TicketAllocated(address _to, bytes32 _ticket, address _manager);
	event TicketRefunded(address _to, bytes32 _ticket, address _manager);
	event TicketRedeemed(address _from, bytes32 _ticket, address _manager);
	event TicketTransferred(address _from, address _to, bytes32 _ticket, address _manager);

	constructor(IBillingProcessorHandler2 _bp) public {
		bp = _bp;
	}

	function getOwner(bytes32 _ticket) external view returns(address) {
		return ticketData[_ticket].currentHolder;
	}

	function allocate(
		address _to,
		bytes32 _ticket,
		string calldata _metadataVersion,
		string calldata _metadata,
		// always in StableToken units (see StableToken comments)
		// 1 cent = 1 unit
		uint _firstPrice
	)
		external
		onlyAdmin()
		isEventActive()
		isSaleActiveMod()
	{
		// 1 - check event rules here
		require(_to != address(0), "Invalid address");
		require(ticketData[_ticket].currentHolder==address(0), "Ticket allocated");

		// in reality ticketData[_ticket].currentHolder==0x0 and redeemedTickets[_ticket]!=0x0
		// can't happen! so this check is not really neeeded
		//require(ticketData[_ticket].redeemedBy == address(0), "Ticket redeemed");

		if(limitTotal > 0) {
			require(allocated < limitTotal, "Ticket limit exceeded");
		}
		if(limitPerHolder > 0) {
			require(owners[_to] < limitPerHolder, "Customer ticket limit exceeded");
		}

		// TODO:
		//require(_firstPrice >= minAllocationPrice, "Min allocation price not reached");
		//require(_firstPrice <= maxAllocationPrice, "Max allocation price reached");

		// 1 - do some accounting/billing
		if (token!=StableToken(0x0) && (bp!=IBillingProcessorHandler2(0x0))) {
			bp.onAllocate(
				_ticket,
				token,
				_to,
				addressOG,
				_firstPrice);
		}

		// 2 - issue new ticket
		allocated++;
		owners[_to] += 1;

		// 3 - save data
		TicketData memory td;
		td.metadataVersion = _metadataVersion;
		td.rawMetadata = _metadata;
		td.firstPrice = td.lastPrice = _firstPrice;
		td.firstHolder = _to;
		td.currentHolder = _to;
		ticketData[_ticket] = td;

		emit TicketAllocated(_to, _ticket, msg.sender);
	}

	function transferTo(bytes32 _ticket, address _to, bool _processBiliing)
		external
		onlyAdmin()
		isEventActive()
		isSaleActiveMod()
	{
		// TODO: isTransferable not checked here...
		address from = ticketData[_ticket].currentHolder;

		// check if more transfers than maxTransfersPerWallet
		if(0!=maxTransfersPerWallet) {
			require(transfersPerHolder[from] < maxTransfersPerWallet, "Max transfers per wallet reached");
		}

		if (token!=StableToken(0x0) && (bp!=IBillingProcessorHandler2(0x0))) {
			if (_processBiliing) {
				bp.onTransfer(
					_ticket,
					token,
					from,
					_to,
					addressOG);
			}
		}
		_transferTo(_ticket, _to);
	}

	function calculateFinalPrice(bytes32 _ticket, uint _resalePrice)
		external view returns(uint)
	{
		uint lastPrice = ticketData[_ticket].lastPrice;

		// call billing rules and calculate rules
		// WARNING: this won't work without BP set!
		return bp.calculateFinalPrice(_ticket, lastPrice, _resalePrice);
	}

	// As an Admin i would like to sell any ticket from any account to any account
	//
	// 1. Last ticket price (e.g.: $10 USD)
	// 2. Resale price (e.g.: $20 USD)
	// 3. Total price (e.g.: $24.6 USD)
	function sellTo(bytes32 _ticket, address _to, uint _resalePrice, bool _runBilling) external onlyAdmin() {
		_sell(
			_ticket,
			_to,
			_resalePrice,
			false,
			_runBilling);
	}

	// buying ticket from the current _to token balance
	function buy(bytes32 _ticket, address _to, uint _resalePrice, bool _runBilling) external onlyAdmin {
		_sell(_ticket, _to, _resalePrice, true, _runBilling);
	}

	function redeem(bytes32 _ticket)
		external
		onlyAdmin()
		isEventActive()
	{
		address currentOwner = ticketData[_ticket].currentHolder;
		require(currentOwner != address(0), "Wrong ticket ID");
		require(ticketData[_ticket].redeemedBy == address(0), "Ticket redeemed");

		// 1 - run billing
		if (token!=StableToken(0x0) && (bp!=IBillingProcessorHandler2(0x0))) {
			bp.onRedeem(_ticket, token, currentOwner, addressOG);
		}

		// 2 - process everything
		ticketData[_ticket].redeemedBy = currentOwner;
		owners[currentOwner] -= 1;

		emit TicketRedeemed(currentOwner, _ticket, msg.sender);
	}

	//
	function refund(bytes32 _ticket, bool _runBilling)
		external
		onlyAdmin()
		refundable()
	{
		address currentOwner = ticketData[_ticket].currentHolder;
		require(currentOwner != address(0), "Wrong ticket ID");
		require(ticketData[_ticket].redeemedBy == address(0), "Ticket redeemed");

		// 1 - run billing
		if(token!=StableToken(0x0) && (bp!=IBillingProcessorHandler2(0x0)) && _runBilling) {
			bp.onRefund(_ticket, token, currentOwner, addressOG);
		}

		// 2 - process everything
		allocated--;
		ticketData[_ticket].currentHolder = address(0);
		owners[currentOwner] -= 1;

		emit TicketRefunded(currentOwner, _ticket, msg.sender);
	}

	// Check if ticket ID is already present
	function isIdUnique(bytes32 _id) external view returns(bool) {
		return (ticketData[_id].currentHolder==address(0));
	}

	function getTicketData(bytes32 _id) external view
		returns(uint firstPrice, uint lastPrice)
	{
		// TODO: check ID

		firstPrice = ticketData[_id].firstPrice;
		lastPrice = ticketData[_id].lastPrice;
	}

	function setTicketData(bytes32 _id, uint _firstPrice) external onlyAdmin {
		// only if not sold or transferred before!
		require(ticketData[_id].firstHolder==ticketData[_id].currentHolder, "Ticket was transferred");

		ticketData[_id].firstPrice = ticketData[_id].lastPrice = _firstPrice;
	}

	function getTicketMetadata(bytes32 _id) external view
		returns(string memory metadataVersion, string memory metadata)
	{
		// TODO: check ID

		metadataVersion = ticketData[_id].metadataVersion;
		metadata = ticketData[_id].rawMetadata;
	}

// Internal:
	function _checkResalePrice(uint _resalePrice) internal view {
		if (maxResellPrice!=0) {
			require(_resalePrice <= maxResellPrice, "Max resale price reached");
		}
		require(_resalePrice >= minResellPrice, "Price is lower than min");

		// TODO: can _resalePrice be less then _lastPrice?
	}

	function _transferTo(bytes32 _ticket, address _to) internal {
		address from = ticketData[_ticket].currentHolder;

		require((_to != address(0)) && (_to != from), "Invalid address");
		require((ticketData[_ticket].redeemedBy==address(0x0)), "Ticket redeemed");

		if(limitPerHolder > 0) {
			require((owners[_to] < limitPerHolder), "Customer ticket limit exceeded");
		}

		ticketData[_ticket].currentHolder = _to;
		owners[from] -= 1;
		owners[_to] += 1;

		transfersPerHolder[from] += 1;

		emit TicketTransferred(from, _to, _ticket, msg.sender);
	}

	function _sell(bytes32 _ticket, address _to, uint _resalePrice, bool _fromTheBalance, bool _runBilling) internal {
		// check if price is OK
		_checkResalePrice(_resalePrice);

		// 1 - calculate totalPrice
		address from = ticketData[_ticket].currentHolder;
		uint firstPrice = ticketData[_ticket].firstPrice;
		uint lastPrice = ticketData[_ticket].lastPrice;

		// WARNING: this won't work without billing enabled!!!
		if (_runBilling) {
			bp.onSell2(_ticket, token, from, _to,
				addressOG,
				address(0x0),	// if _sell is called -> no ref will be used
				firstPrice, lastPrice, _resalePrice, _fromTheBalance);
		}

		// 3 - update last price
		ticketData[_ticket].lastPrice = _resalePrice;

		// 4 - update owner
		_transferTo(_ticket, _to);
	}
}


// Event contract was upgraded to support both IEvent and IEvent2
// This contract is not compatible with SimpleBillingProcessor
contract Event is TicketsManagement, IEvent, IEvent2, IEventData_v1, IEventSettings_v1_2 {
	// Event2 version supports new IEvent2 interface
	string public contractVersion = "Event2";

	string public metadataVersion;
	string public metadata;

	event MetadataUpdated(string indexed _metadataVersion, string _metadata);

	constructor (
		StableToken _token,
		IBillingProcessorHandler2 _bp,
		string memory _metadataVersion,
		string memory _metadata,
		address _addressTS,
		address _addressORG,
		uint _saleStart,
		uint _saleEnd,
		uint _limit,
		uint _limitPerHolder,
		bool _isRefundable,
		bool _isTransferable
	) AccessControl(
		_addressTS,
		_addressORG
		) EventSettings(
			_token,
			_saleStart,
			_saleEnd,
			_limit,
			_limitPerHolder,
			_isRefundable,
			_isTransferable
			) TicketsManagement(_bp)
	public
	{
		metadataVersion = _metadataVersion;
		metadata = _metadata;
	}

// IEvent
	function getContractVersion() external view returns(string memory) {
		return contractVersion;
	}

// IEventData_v1
	function getMetadata() external view returns(string memory) {
		return metadata;
	}

	function getMetadataVersion() external view returns(string memory) {
		return metadataVersion;
	}

	function updateMetadata(string calldata _metadataVersion, string calldata _metadata) external onlyAdmin() returns(bool) {
		metadataVersion = _metadataVersion;
		metadata = _metadata;

		emit MetadataUpdated(_metadataVersion, _metadata);
		return true;
	}

// IEventAccounting_v1
	function getBillingProcessor()external view returns(address) {
		return address(bp);
	}

	function setBillingProcessor(address _newBp) external onlyCT() {
		bp = IBillingProcessorHandler2(_newBp);
	}

// IEventSettings_v1_2
	function setAdditionalSettings(
		uint _maxTransfersPerWallet,
		uint _minResellPrice,
		uint _maxResellPrice) external
	{
		// somehow adding modifier is not working ((
		require(msg.sender == addressCT, "Not owner");

		maxTransfersPerWallet = _maxTransfersPerWallet;
		minResellPrice = _minResellPrice;
		maxResellPrice = _maxResellPrice;
	}

	function getAdditionalSettings() external view
		returns(uint maxTransfersPerWalletOut, uint minResellPriceOut, uint maxResellPriceOut)
	{
		maxTransfersPerWalletOut = maxTransfersPerWallet;
		minResellPriceOut = minResellPrice;
		maxResellPriceOut = maxResellPrice;
	}

// IEvent2
	function sellToWithRef(bytes32 _ticket, address _to, address _ref, uint _resalePrice, bool _runBilling) external onlyAdmin {
		_sellWithRef(_ticket, _to, _ref, _resalePrice, false, _runBilling);
	}

	function buyWithRef(bytes32 _ticket, address _to, address _ref, uint _resalePrice, bool _runBilling) external onlyAdmin {
		_sellWithRef(_ticket, _to, _ref, _resalePrice, true, _runBilling);
	}

	function _sellWithRef(bytes32 _ticket, address _to, address _ref, uint _resalePrice, bool _fromTheBalance, bool _runBilling) internal {
		// check if price is OK
		_checkResalePrice(_resalePrice);

		// 1 - calculate totalPrice
		address from = ticketData[_ticket].currentHolder;
		uint firstPrice = ticketData[_ticket].firstPrice;
		uint lastPrice = ticketData[_ticket].lastPrice;

		// WARNING: this won't work without billing enabled!!!
		if(_runBilling) {
			bp.onSell2(_ticket, token, from, _to,
				addressOG, _ref,
				firstPrice, lastPrice, _resalePrice, _fromTheBalance);
		}

		// 3 - update last price
		ticketData[_ticket].lastPrice = _resalePrice;

		// 4 - update owner
		_transferTo(_ticket, _to);
	}
}

