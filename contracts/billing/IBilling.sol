pragma solidity ^0.5.0;
// TODO: write good comments

import "../tokens/StableToken.sol";

interface IBillingProcessor {
	function getContractVersion() external view returns(string memory);

	// call that after Event is created
	function registerEventContract(address _event) external;

	// call that after Event is created
	function registerEventContractCustomRules(address _event, uint totalFeePpm, uint orgGetsPpm) external;

	function updateEventContractCustomRules(address _eventContract, uint totalFeePpmNew, uint orgGetsPpmNew) external;

	function getEventContractRules(address _eventContract) external view returns(uint totalFeePpm, uint orgGetsPpm);

	function isEventRegistered(address _event) external view returns(bool);
	function getEventsCount() external view returns(uint);
	function getEventAtIndex(uint _i)
		external view returns(address eventAddress, uint totalFeePpm, uint orgGetsPpm);
}

interface IBillingProcessorHandler {
	function calculateFinalPrice(bytes32 _ticket, uint _lastPrice, uint _newPrice) external view returns(uint);

	function onAllocate(
		bytes32 _ticket,
		StableToken _token,
		address _buyer,
		address _organizer,
		uint _price) external;

	function onTransfer(
		bytes32 _ticket,
		StableToken _token,
		address _from,
		address _to,
		address _organizer) external;

	function onRedeem(
		bytes32 _ticket,
		StableToken _token,
		address _by,
		address _organizer) external;

	function onSell(
		bytes32 _ticket,
		StableToken _token,
		address _from,
		address _to,
		address _organizer,
		uint _firstPrice,
		uint _lastPrice,
		uint _newPrice,
		bool _fromTheBalance) external;

	function onRefund(
		bytes32 _ticket,
		StableToken _token,
		address _owner,
		address _organizer) external;

	function getStats(address _event) external view
		returns(uint sold, uint soldCount, uint resold, uint resoldCount, uint refunded, uint refundedCount);
}

// Billing2 supports this interface
interface IBillingProcessor2 {
	function getContractVersion() external view returns(string memory);

	function isEventRegistered(address _event) external view returns(bool);

	function getEventsCount() external view returns(uint);

	function registerEventContractCustomRules2(address _event, uint totalFeePpm, uint orgGetsPpm, uint referalGetsPpm) external;

	function updateEventContractCustomRules2(address _eventContract, uint totalFeePpmNew, uint orgGetsPpmNew, uint referalGetsPpm) external;

	function getEventContractRules2(address _eventContract) external view returns(uint totalFeePpm, uint orgGetsPpm, uint referalGetsPpm);

	function getEventAtIndex2(uint _i)
		external view returns(address eventAddress, uint totalFeePpm, uint orgGetsPpm, uint referalGetsPpm);
}

// Billing2 supports this interface
interface IBillingProcessorHandler2 {
	function calculateFinalPrice(bytes32 _ticket, uint _lastPrice, uint _newPrice) external view returns(uint);

	function onAllocate(
		bytes32 _ticket,
		StableToken _token,
		address _buyer,
		address _organizer,
		uint _price) external;

	function onTransfer(
		bytes32 _ticket,
		StableToken _token,
		address _from,
		address _to,
		address _organizer) external;

	function onRedeem(
		bytes32 _ticket,
		StableToken _token,
		address _by,
		address _organizer) external;

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
		bool _fromTheBalance) external;

	function onRefund(
		bytes32 _ticket,
		StableToken _token,
		address _owner,
		address _organizer) external;

	function getStats(address _event) external view
		returns(uint sold, uint soldCount, uint resold, uint resoldCount, uint refunded, uint refundedCount);
}


contract IBillingProcessorHandler3 is IBillingProcessorHandler2 {
	function onRefundPartial(
		bytes32 _ticket,
		StableToken _token,
		address _owner,
		address _organizer,
		uint _partialPpm) external;

	// returns how much is locked currently for this event/user
	// (in the StableToken of the event!)
	function getEscrowBalance(
		address _event,
		address _user) external view returns(uint);

	// will:
	// 1) release escrow
	// 2) mint money to the user
	function unlockEscrow(
		StableToken _token,
		address _event,
		address _user) external returns(uint);

	// call to burn money from buyer
	function onBuy(
		bytes32 _ticket,
		StableToken _tokenForBurns,
		address _to,
		uint _lastPrice,
		uint _newPrice) external;
}

