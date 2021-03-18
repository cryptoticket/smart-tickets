pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";


/**
 * @title StableToken ERC20 token
 * @author crypto.tickets Team
 * @dev Stable token contract that is used to issue different USD/EUR/etc-backed tokens
 *
 * Features:
 * 1) Owner should be able to stop transfers
 * 2) Owner should be able to pause token
 * 3) Owner should be able to mint
 * 4) Owner should be able to burn
 *
 * When paused:
 * 1) can't mint
 * 2) can't burn
 * 3) can't transfer, transferFrom tokens
 * 4) can approve
 */
contract StableToken is Ownable, ERC20Detailed, ERC20Pausable, ERC20Mintable, ERC20Burnable {
	bool public isBurnable = true;
	bool public isPausable = true;
	bool public transfersEnabled = true;
	string public currency = "";

	modifier isBurnable_() {
		require (isBurnable, "Not burnable");
		_;
	}

	modifier isPausable_() {
		require (isPausable, "Not pausable");
		_;
	}

	modifier isTransfersEnabled() {
		require (transfersEnabled, "Non transferrable");
		_;
	}

	/**
	 * @dev Constructor
	 * @notice _isBurnable and _isPausable can't be changed later!
	 * @param _isBurnable whether owner can burn anyones tokens
	 * @param _isPausable whether owner can pause/unpause contract
	 */
	constructor(
		string memory _name,
		string memory _symbol,
		string memory _currency,
		bool _isBurnable,
		bool _isPausable) public
		// WARNING: using 2 decimals instead of default 18!
		// For example:
		// 1 cent = 1 unit
		// 1 USD = 100 units
		// 100 USD = 10000 units
		// 10000 USD = 1000000 units
		ERC20Detailed(_name, _symbol, 2)
	{
		currency = _currency;

		isBurnable = _isBurnable;
		isPausable = _isPausable;
	}

	/**
	 * @notice Easy to use method that converts units -> cents (for current currency, like EUR or USD)
	 */
	function balanceOfInCents(address _who) public view returns(uint) {
		return balanceOf(_who);
	}

	/**
	 * @notice Enable or disable transfer, transferFrom methods only
	 * @param _transfersEnabled enable or disable
	 */
	function enableTransfers(bool _transfersEnabled) public onlyOwner {
		transfersEnabled = _transfersEnabled;
	}

	/**
	 * @notice This function should be called only when token not paused
	 * @param _to address
	 * @param _value amount of tokens which will be transfered
	 * @return true
	 */
	function transfer(address _to, uint256 _value) public whenNotPaused isTransfersEnabled returns (bool) {
		return super.transfer(_to, _value);
	}

	/**
	 * @notice This function should be called only when token not paused
	 * @param _from address
	 * @param _to address
	 * @param _value amount of tokens which will be transfered
	 * @return true
	 */
	function transferFrom(address _from, address _to, uint256 _value) public whenNotPaused isTransfersEnabled returns (bool) {
		return super.transferFrom(_from, _to, _value);
	}

	/**
	 * @notice This is an override of MintableToken method
	 */
	function mint(address _to, uint256 _amount) public whenNotPaused onlyOwner returns(bool) {
		return super.mint(_to, _amount);
	}

	/**
	 * @notice This is an override of BurnableToken method
	 * @dev do not call this method. Instead use burnFor()
	 */
	function burn(uint256) public {
		revert("Not burnable");
	}

	/**
	 * @notice This function should be called only by owner
	 * @param _who address
	 * @param _value amount of tokens which will be burned
	 */
	function burnFor(address _who, uint256 _value) public isBurnable_ whenNotPaused onlyOwner {
		super._burn(_who, _value);
	}

	/**
	 * @dev This is an override of PausableToken method
	 * @notice This function should be called only by owner
	 */
	function pause() public isPausable_ onlyOwner {
		super.pause();
	}

	/**
	 * @dev This is an override of PausableToken method
	 * @notice This function should be called only by owner
	 */
	function unpause() public isPausable_ onlyOwner {
		super.unpause();
	}

	/**
	 * @dev Fallback function can be used to buy tokens
	 */
	function() external payable {
		revert("Non payable");
	}
}

