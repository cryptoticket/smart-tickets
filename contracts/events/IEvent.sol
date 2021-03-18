pragma solidity ^0.5.0;

import "../tokens/StableToken.sol";

interface IEvent {
	function getContractVersion() external view returns(string memory);
}

interface IEventData_v1 {
	function getMetadata() external view returns(string memory);
	function getMetadataVersion() external view returns(string memory);
	function updateMetadata(string calldata _metadataVersion, string calldata _metadata) external returns(bool);
}

interface IEventAccessControl_v1 {
	function getTS() external view returns(address);
	function getOG() external view returns(address);

	function setTS(address _newAddress) external;
	function setOG(address _newAddress) external;

	function isPaused() external view returns(bool);
	function isCancelled() external view returns(bool);

	function pause() external;
	function unpause() external;
	function cancel() external;
}

interface IEventSettings_v1 {
	function getStableToken()external view returns(address);

	// WARNING: no way to change that option!!!
	function getAllocationSettings()external view
		returns(uint limitTotal, uint limitPerHolder);

	// WARNING: no way to change that option!!!
	function getSaleDatesSettings() external view
		returns(uint saleStart, uint saleEnd);

	// will return true only when time is elapsed...
	function isSaleActive() external view returns(bool);

	// WARNING: no way to change that option!!!
	function getTransferSettings()external view returns(bool isTransferAllowed);

	// WARNING: no way to change that option!!!
	function getResaleSettings()external view returns(bool isResellAllowed);

	// WARNING: no way to change that option!!!
	function getRefundSettings()external view returns(bool isRefundAllowed);
}

interface ITicketManagement_v1 {
	function allocate(
		address _to,
		bytes32 _ticket,
		string calldata _metadataVersion,
		string calldata _metadata,
		uint _firstPrice
	) external;

	// currently all tickets have same flow rules
	function calculateFinalPrice(bytes32 _ticket, uint _resalePrice) external view returns(uint);

	// As an Admin i would like to tranfer any ticket to any account
	// can't transferTo if redeemed!
	function transferTo(bytes32 _ticket, address _to, bool _processBiliing) external;

	// As an Admin i would like to sell any ticket from any account to any account
	//
	// 1. Last ticket price (e.g.: $10.00)
	// 2. Resale price (e.g.: $20.00)
	// 3. Total price (e.g.: $24.60)
	// if _resalePrice is ZERO -> we get no profit!!!!
	//
	// can't sellTo if redeemed!
	function sellTo(bytes32 _ticket, address _to, uint _resalePrice, bool _runBilling) external;

	function buy(bytes32 _ticket, address _buyer, uint _resalePrice, bool _runBilling) external;

	function redeem(bytes32 _ticket) external;

	function getOwner(bytes32 _ticket) external view returns(address);

	// can't refund if redeemed!
	function refund(bytes32 _ticket, bool _runBilling) external;

	function isIdUnique(bytes32 _id) external view returns(bool);

	function getTicketData(bytes32 _ticket) external view returns(uint firstPrice, uint lastPrice);
	function setTicketData(bytes32 _ticket, uint _firstPrice) external;

	function getTicketMetadata(bytes32 _id) external view
		returns(string memory metadataVersion, string memory metadata);

	// No owners enumeration interface!
	// No allocatedTickets enumeration interface!
	// No redeemedTickets enumeration interface!
}

interface IEventAccounting_v1 {
	function getBillingProcessor()external view returns(address);
	function setBillingProcessor(address _newBp)external;
}

interface IEventSettings_v1_2 {
	function getAdditionalSettings()external view
		returns(uint maxTransfersPerWallet, uint minResellPrice, uint maxResellPrice);

	function setAdditionalSettings(
		uint _maxTransfersPerWallet,
		uint _minResellPrice,
		uint _maxResellPrice) external;
}

interface IEvent2 {
	function sellToWithRef(bytes32 _ticket, address _to, address _ref, uint _resalePrice, bool _runBilling) external;
	function buyWithRef(bytes32 _ticket, address _to, address _ref, uint _resalePrice, bool _runBilling) external;
}

interface IEvent3 {
	function refundPartial(bytes32 _ticket, bool _runBilling, uint _partialPpm) external;

	function sellTo3(bytes32 _ticket, address _to, uint _resalePrice) external;
	function buy3(bytes32 _ticket, address _buyer, uint _resalePrice, StableToken _token) external;

	function sellToWithRef3(bytes32 _ticket, address _to, address _ref, uint _resalePrice) external;
	function buyWithRef3(bytes32 _ticket, address _to, address _ref, uint _resalePrice, StableToken _token) external;
}
