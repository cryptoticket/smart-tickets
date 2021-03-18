pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "./StableToken.sol";


/**
 * @title Minting facility
 * @author crypto.tickets Team
 * @dev Controls all stable-tokens
 *
 * 1 - Owner should first add some tokens by calling 'addCurrency'
 * 2 - Owner should then add minters by calling 'addMinter'
 */
contract TokenMint is Ownable {
	using SafeMath for uint256;

// Fields:
	string public controlledBy = "";

	// all tokens are in ppm-s (parts per million)
	// all tokens' Owner is TokenMint (this contract)
	StableToken[] public tokens;

	struct CallsHistory {
		uint time;
		uint amount;
		bool minting;
	}

	struct MinterHistory {
		uint mintedTotal;
		uint burnedTotal;
		CallsHistory[] calls;
	}

	struct CurrencyInfo {
		address[] _minters;

		// minter address => history
		mapping(address=>MinterHistory) mintingHistory;
	}
	// for particular currency index
	CurrencyInfo[] currencyInfos;

// Events:
	event MinterAdded(address indexed account);
	event MinterRemoved(uint indexed index, address indexed account);

	event OnNewCurrency(string indexed _tokenSymbol, string indexed _currencyName, uint _newCurrencyIndex);
	event OnMint(address indexed _caller, uint indexed _currencyIndex, address indexed _to, uint256 _amount);
	event OnBurn(address indexed _caller, uint indexed _currencyIndex, address indexed _who, uint256 _value);
	event OnEnableTransfers(uint indexed _currencyIndex, bool _transfersEnabled);
	event OnPause(uint indexed _currencyIndex);
	event OnUnpause(uint indexed _currencyIndex);
	event OnUpgrade(address indexed _newContract);

	modifier onlyMinter(uint _currencyIndex) {
		require(_currencyIndex < tokens.length, "Wrong currency");
		require(isMinter(_currencyIndex, msg.sender), "Not a minter");
		_;
	}

// Methods:
	constructor(string memory _controlledBy) public {
		controlledBy = _controlledBy;
	}

	/**
	 * @dev Internally all tokens are stored in the array (accessed by index).
	 * This method converts StableToken address to index (e.g.: 2)
	 */
	function stableTokenToIndex(StableToken _stableToken) public view returns(uint) {
		for(uint i=0; i<tokens.length; ++i) {
			if(tokens[i]==_stableToken) {
				return i;
			}
		}

		// WARNING
		return uint(-1);
	}

	/**
	 * @dev Get attached to the currency stable token (ERC20)
	 * @param _currencyIndex The index of the currency, starting from 0
	 */
	function getTokenAddress(uint _currencyIndex) public view returns(address) {
		require(_currencyIndex < tokens.length, "Wrong currency");
		return address(tokens[_currencyIndex]);
	}

	/**
	 * @dev Owner can add new currecy types (e.g.: USD, EUR, RUB, GBP)
	 * @param _tokenSymbol e.g.: "CTUSDT"
	 * @param _currencyName e.g.: "USD"
	 */
	function addCurrency(string memory _tokenSymbol, string memory _currencyName) public onlyOwner {
		StableToken st = new StableToken("StableToken", _tokenSymbol, _currencyName, true, true);
		tokens.push(st);

		CurrencyInfo memory ci;
		currencyInfos.push(ci);

		uint newIndex = (tokens.length - 1);
		emit OnNewCurrency(_tokenSymbol, _currencyName, newIndex);
	}

	/**
	 * @dev Get total currencies (tokens) count
	 */
	function getCurrenciesCount() public view returns(uint) {
		return tokens.length;
	}

	/**
	 * @dev Get currency string by index
	 */
	function getCurrencyInfo(uint _index)
		public view returns(string memory tokenSymbol, string memory currencyName)
	{
		require(_index<tokens.length, "Wrong token");

		StableToken st = StableToken(tokens[_index]);
		tokenSymbol = st.symbol();
		currencyName = st.currency();
	}

	/**
	 * @dev Check if _account can mint/burn currencies
	 * @param _currencyIndex The index of the currency, starting from 0
	 * @param _account Account's address you want to check
	 */
	function isMinter(uint _currencyIndex, address _account) public view returns (bool) {
		for(uint i=0; i<currencyInfos[_currencyIndex]._minters.length; ++i) {
			if(currencyInfos[_currencyIndex]._minters[i]==_account) {
				return true;
			}
		}

		return false;
	}

	/**
	 * @dev Add _account to minters of a selected currency
	 * @param _currencyIndex The index of the currency, starting from 0
	 * @param _account Account that you want to add as a minter (will be able to mint/burn)
	 */
	function addMinter(uint _currencyIndex, address _account) public onlyOwner {
		require(_currencyIndex < currencyInfos.length, "Wrong currency");

		// WARNING: does not check if _currencyIndex is correct!
		// WARNING: does not check if already in the list
		currencyInfos[_currencyIndex]._minters.push(_account);
		emit MinterAdded(_account);
	}

	/**
	 * @dev Remove _account from minters of a selected currency
	 * @param _currencyIndex The index of the currency, starting from 0
	 * @param _index Account index
	 */
	function removeMinter(uint _currencyIndex, uint _index) public onlyOwner {
		require(_currencyIndex < currencyInfos.length, "Wrong currency");
		require(_index < currencyInfos[_currencyIndex]._minters.length, "Wrong minter");

		address was = currencyInfos[_currencyIndex]._minters[_index];

		// still history will not be erased
		currencyInfos[_currencyIndex]._minters[_index] = address(0x0);
		emit MinterRemoved(_index, was);
	}

	/**
	 * @dev Get count of minters for selected currency only
	 * @param _currencyIndex The index of the currency, starting from 0
	 */
	function getMintersCount(uint _currencyIndex) public view returns(uint) {
		require(_currencyIndex < currencyInfos.length, "Wrong currency");

		return currencyInfos[_currencyIndex]._minters.length;
	}

	/**
	 * @dev Get minter address for selected currency only
	 * @param _currencyIndex The index of the currency, starting from 0
	 * @param _index Minter's index, starting from 0
	 */
	function getMinterAt(uint _currencyIndex, uint _index) public view returns(address) {
		require(_currencyIndex < currencyInfos.length, "Wrong currency");

		return currencyInfos[_currencyIndex]._minters[_index];
	}

	/**
	 * @dev Get the minter history
	 * @param _minterAddress You can get the address by iterating minters using 'getMinterAt'
	 * @param _currencyIndex Currency index
	 */
	function getMinterHistoryAtIndex(uint _currencyIndex, address _minterAddress)
		public view returns(uint mintedTotal, uint burnedTotal)
	{
		mintedTotal = currencyInfos[_currencyIndex].mintingHistory[_minterAddress].mintedTotal;
		burnedTotal = currencyInfos[_currencyIndex].mintingHistory[_minterAddress].burnedTotal;
	}

	/**
	 * @dev Mint any amount of tokens to any account
	 * @notice WARNING: use 2 decimals instead of default 18!
	 * @param _to Destination address
	 * @param _amount Token amount in PPMs:
	 * 1 cent = 1 unit
	 * 1 USD = 100 units
	 */
	function mint(uint _currencyIndex, address _to, uint256 _amount)
		public onlyMinter(_currencyIndex) returns(bool)
	{
		require(_currencyIndex < tokens.length, "Wrong currency");

		// 1 - mint
		tokens[_currencyIndex].mint(_to, _amount);

		// 2 - update history
		currencyInfos[_currencyIndex].mintingHistory[msg.sender].mintedTotal+=_amount;

		CallsHistory memory ch;
		ch.time = now;
		ch.amount = _amount;
		ch.minting = true;
		currencyInfos[_currencyIndex].mintingHistory[msg.sender].calls.push(ch);

		// 3 - emit event
		emit OnMint(msg.sender, _currencyIndex, _to, _amount);
	}

	/**
	 * @dev Burn any amount of tokens from any account
	 * @notice WARNING: use 2 decimals instead of default 18!
	 * @param _who Destination address
	 * @param _value Token amount in PPMs:
	 * 1 cent = 1 unit
	 * 1 USD = 100 units
	 */
	function burnFor(uint _currencyIndex, address _who, uint256 _value)
		public onlyMinter(_currencyIndex)
	{
		require(_currencyIndex < tokens.length, "Wrong currency");
		// 1 - burn
		tokens[_currencyIndex].burnFor(_who, _value);

		// 2 - update history
		currencyInfos[_currencyIndex].mintingHistory[msg.sender].burnedTotal+=_value;
		CallsHistory memory ch;
		ch.time = now;
		ch.amount = _value;
		ch.minting = false;
		currencyInfos[_currencyIndex].mintingHistory[msg.sender].calls.push(ch);

		// 3 - emit event
		emit OnBurn(msg.sender, _currencyIndex, _who, _value);
	}

	/**
	 * @dev Enable/disable transfers
	 * @param _currencyIndex What currency's transfers you would like to enable/disable
	 * @notice This function should be called only by owner
	 */
	function enableTransfers(uint _currencyIndex, bool _transfersEnabled) public onlyOwner {
		require(_currencyIndex < tokens.length, "Wrong currency");
		// 1 - swith on/off
		tokens[_currencyIndex].enableTransfers(_transfersEnabled);

		// 2 - emit event
		emit OnEnableTransfers(_currencyIndex, _transfersEnabled);
	}

	/**
	 * @dev Pause token
	 * @param _currencyIndex What currency you would like to pause
	 * @notice This function should be called only by owner
	 */
	function pause(uint _currencyIndex) public onlyOwner {
		require(_currencyIndex < tokens.length, "Wrong currency");
		// 1 - pause
		tokens[_currencyIndex].pause();

		// 2 - emit event
		emit OnPause(_currencyIndex);
	}

	/**
	 * @dev Unpause token
	 * @param _currencyIndex What currency you would like to unpause
	 * @notice This function should be called only by owner
	 */
	function unpause(uint _currencyIndex) public onlyOwner {
		require(_currencyIndex < tokens.length, "Wrong currency");
		// 1 - unpause
		tokens[_currencyIndex].unpause();

		// 2 - emit event
		emit OnUnpause(_currencyIndex);
	}

	/**
	 * @dev Transfer ownership to someone else
	 * @param _newContract new Mint
	 * @notice This function should be called only by owner
	 */
	function upgradeContract(address _newContract) public onlyOwner {
		for(uint i=0; i<tokens.length; ++i) {
			tokens[i].transferOwnership(_newContract);
		}

		emit OnUpgrade(_newContract);
	}
}

