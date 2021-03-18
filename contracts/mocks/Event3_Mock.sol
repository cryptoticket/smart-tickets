pragma solidity ^0.5.0;

import "../events/IEvent.sol";

import "../tokens/StableToken.sol";
import "../billing/IBilling.sol";


contract Event3RefundMock {
	function callAllocateFromWithin(IBillingProcessorHandler _bp, bytes32 _ticket, StableToken _st, address _buyer, address _org, uint _price) external {
		// this method should be called from within the "event"
		_bp.onAllocate(_ticket, _st, _buyer, _org, _price);
	}

	// This is for refunds tests
	//	See the 'Billing3::refund' method
	function callRefundFromWithin(IBillingProcessorHandler _bp, bytes32 _ticket, StableToken _st, address _owner, address _org) external {
		// this method should be called from within the "event"
		_bp.onRefund(_ticket, _st, _owner, _org);
	}

	function callRefundPartialFromWithin(IBillingProcessorHandler3 _bp3, bytes32 _ticket, StableToken _st, address _owner, address _org, uint _part) external {
		// this method should be called from within the "event"
		_bp3.onRefundPartial(_ticket, _st, _owner, _org, _part);
	}

	function callSellFromWithin(
		IBillingProcessorHandler2 _bp,
		bytes32 _ticket,
		StableToken _token,
		address _from,
		address _to,
		address _organizer,
		//address _ref,
		uint _firstPrice,
		uint _lastPrice,
		uint _newPrice,
		bool _fromTheBalance) external
	{

		// this method should be called from within the "event"
		//
		// do not pass REF, it is not needed...this test is without referal
		_bp.onSell2(
			_ticket,
			_token,
			_from,
			_to,
			_organizer,
			address(0x0),
			_firstPrice,
			_lastPrice,
			_newPrice,
			_fromTheBalance);
	}

	function callBuyFromWithin(
		IBillingProcessorHandler3 _bp,
		bytes32 _ticket,
		StableToken _token,
		address _to,
		uint _lastPrice,
		uint _newPrice) external
	{
		// this method should be called from within the "event"
		//
		// do not pass REF, it is not needed...this test is without referal
		_bp.onBuy(
			_ticket,
			_token,
			_to,
			_lastPrice,
			_newPrice);
	}
}


contract Event3RefundMock1 is Event3RefundMock {
	// as if after first resale...
	uint fp = 1000;
	uint lp = 2000;

	// Example of how you can override anything to mimick the contract behaviour
	function getTicketData(bytes32 _id) external view
		returns(uint firstPrice, uint lastPrice)
	{
		// THESE values are different specialy for test!
		firstPrice = fp;

		// refunds should refund the lastPrice!!!
		// but not firstPrice
		lastPrice = lp;
	}

	function mockFirstLastPrice(uint _fp, uint _lp) external {
		fp = _fp;
		lp = _lp;
	}
}
