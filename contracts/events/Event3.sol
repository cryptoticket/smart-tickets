pragma solidity ^0.5.0;

import "./Event.sol";


// Event contract was upgraded to support both IEvent and IEvent2
// This contract is not compatible with SimpleBillingProcessor
contract Event3 is Event, IEvent3 {
	string public contractVersion = "Event3";

	IBillingProcessorHandler3 bp3;

	string public metadataVersion;
	string public metadata;

	event MetadataUpdated(string indexed _metadataVersion, string _metadata);

	constructor (
		StableToken _token,
		IBillingProcessorHandler3 _bp,
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
	) Event (
		_token,
		_bp,
		_metadataVersion,
		_metadata,
		_addressTS,
		_addressORG,
		_saleStart,
		_saleEnd,
		_limit,
		_limitPerHolder,
		_isRefundable,
		_isTransferable
		)
	public
	{
		bp3 = _bp;
	}

// IEvent
	function getContractVersion() external view returns(string memory) {
		return contractVersion;
	}

// OVERRIDES:
	// the method will be still available in the Eventv3
	// It will do the full return
	function refund(bytes32 _ticket, bool _runBilling ) external onlyAdmin refundable() {
		// return 100%
		_refundPartial(_ticket, _runBilling, 1000000);
	}

// IEvent3:
	function refundPartial(bytes32 _ticket, bool _runBilling, uint _partialPpm) external onlyAdmin refundable() {
		_refundPartial(_ticket, _runBilling, _partialPpm);
	}

	/**
	 * @dev sellTo3. Sell ticket (acquiring is external, so buyer's tokens will not be burned at all...)
	 */
	function sellTo3(bytes32 _ticket, address _to, uint _resalePrice) external onlyAdmin() {
		_sell3(
			_ticket,
			_to,
			address(0x0),
			_resalePrice,
			false,		// do not burn from buyer! only mint to seller, org, ct, etc
			token		// using event's native currency (can not use other currency!)
		);
	}

	/**
	 * @dev buy3. Sell ticket (acquiring is internal, so buyer's tokens will BE burned ...)
	 * @param _tokenToBurnFrom This will be used to burn from buyer
	 * but native event's currency will be used to mint to seller, org, ct, ref, etc!
	*/
	function buy3(bytes32 _ticket, address _to, uint _resalePrice, StableToken _tokenToBurnFrom) external onlyAdmin {
		_sell3(
			_ticket,
			_to,
			address(0x0),
			_resalePrice,
			true,		// burn from buyer
			_tokenToBurnFrom);
	}

	/**
	 * @dev sellToWithRef3. Same as sellTo3 but with extra _ref param
	 */
	function sellToWithRef3(bytes32 _ticket, address _to, address _ref, uint _resalePrice) external onlyAdmin {
		_sell3(_ticket, _to, _ref, _resalePrice, false, token);
	}

	/**
	 * @dev buyWithRef3. Same as buy3 but with extra _ref param
	 * @param _tokenToBurnFrom This will be used to burn from buyer
	 * but native event's currency will be used to mint to seller, org, ct, ref, etc!
	 */
	function buyWithRef3(bytes32 _ticket, address _to, address _ref, uint _resalePrice, StableToken _tokenToBurnFrom) external onlyAdmin {
		_sell3(_ticket, _to, _ref, _resalePrice, true, _tokenToBurnFrom);
	}

	/**
	 * @dev updateResalePrice Extra method to fix lastPrice in case of emergency or error
	 */
	function updateResalePrice(bytes32 _ticket, uint _resalePrice) external onlyAdmin {
		ticketData[_ticket].lastPrice = _resalePrice;
	}

////////////////////////
// INTERNAL
	function _refundPartial(bytes32 _ticket, bool _runBilling, uint _partialPpm) internal {
		address currentOwner = ticketData[_ticket].currentHolder;
		require(currentOwner != address(0), "Wrong ticket ID");
		require(ticketData[_ticket].redeemedBy == address(0), "Ticket redeemed");

		// 1 - run billing
		if(token!=StableToken(0x0) && (bp!=IBillingProcessorHandler2(0x0)) && _runBilling) {
			bp3.onRefundPartial(_ticket, token, currentOwner, addressOG, _partialPpm);
		}

		// 2 - process everything
		allocated--;
		ticketData[_ticket].currentHolder = address(0);
		owners[currentOwner] -= 1;

		emit TicketRefunded(currentOwner, _ticket, msg.sender);
	}

	function _sell3(bytes32 _ticket, address _to, address _ref, uint _resalePrice, bool _burnBuyersTokens, StableToken _token) internal {
		// check if price is OK
		_checkResalePrice(_resalePrice);

		// 1 - calculate totalPrice
		address from = ticketData[_ticket].currentHolder;
		uint firstPrice = ticketData[_ticket].firstPrice;
		uint lastPrice = ticketData[_ticket].lastPrice;

		bp.onSell2(
			_ticket,
			token,		// use events currency for mints
			from,
			_to,
			addressOG,
			_ref,
			firstPrice,
			lastPrice,
			_resalePrice,
			false			// this params is not used anymore
		);

		if (_burnBuyersTokens) {
			// _token is optional
			StableToken tokenToBurn = token;		// default event's token
			if (_token!=StableToken(0x0)) {
				tokenToBurn = _token;
			}

			bp3.onBuy(
				_ticket,
				tokenToBurn,		// use passed token, not event's token!
				_to,
				lastPrice,
				_resalePrice
			);
		}

		// 3 - update last price
		ticketData[_ticket].lastPrice = _resalePrice;

		// 4 - update owner
		_transferTo(_ticket, _to);
	}
}

