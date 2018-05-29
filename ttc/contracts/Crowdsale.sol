pragma solidity ^0.4.16;


import "./Ownable.sol";
import "./TTC.sol";


contract Crowdsale is Ownable{
    
    using SafeMath for uint;

  	struct Backer {
		uint weiReceived; 
		uint coinSent;
		uint coinReadyToSend;
	}

	/*
	* Constants
	*/

	/**
    * ICO Phases.
    *
    * - PreStart: 	tokens are not yet sold/issued
    * - PreIco:  	new tokens sold/issued at the discounted price
    * - PauseIco: 	tokens are not sold/issued
    * - MainIco   	new tokens sold/issued at the regular price
    * - AfterIco: 	tokens are not sold/issued
    */
    enum Phases {PreStart, PreIco, PauseIco, MainIco, AfterIco}

	/* Maximum number of TTC to pre ico sell */
	uint public constant PRE_MAX_CAP = 25000000000000000000000000; // 25,000,000 TTC

	/* Maximum number of TTC to main ico sell */
	uint public constant MAIN_MAX_CAP = 125000000000000000000000000; // 125,000,000 TTC

	/* Minimum amount to invest */
	uint public constant MIN_INVEST_ETHER = 100 finney;

	/* Crowdsale period */
	uint private constant PRE_START_TIME = 1520820000; 	// 2018-03-12 10:00 AM (UTC + 08:00)
	uint private constant PRE_END_TIME = 1521079200;  	// 2018-03-15 10:00 AM (UTC + 08:00)
	uint private constant MAIN_START_TIME = 1522029600;	// 2018-03-26 10:00 AM (UTC + 08:00)
	uint private constant MAIN_END_TIME = 1524189600;	// 2018-04-20 10:00 AM (UTC + 08:00)

	/* Number of TTC per Ether */
	uint public constant PRE_COIN_PER_ETHER_ICO = 5000000000000000000000; // 5,000 TTC
	uint public constant MAIN_COIN_PER_ETHER_ICO = 4000000000000000000000; // 4,000 TTC

	/*
	* Variables
	*/
	/* TTC contract reference */
	TTC public coin;

	/*Maximum Ether for one address during pre ico or main ico */
	uint public maximumCoinsPerAddress = 10 ether;
    
    /* Multisig contract that will receive the Ether during pre ico*/
	address public preMultisigEther;
	/* Number of Ether received during pre ico */
	uint public preEtherReceived;
	/* Number of TTC sent to Ether contributors during pre ico */
	uint public preCoinSentToEther;

	/* Multisig contract that will receive the Ether during main ico*/
	address public mainMultisigEther;
	/* Number of Ether received during main ico */
	uint public mainEtherReceived;
	/* Number of TTC sent to Ether contributors during main ico */
	uint public mainCoinSentToEther;

	/* Backers Ether indexed by their Ethereum address */
	mapping(address => Backer) public preBackers;
	address[] internal preReadyToSendAddress;
	mapping(address => Backer) public mainBackers;
	address[] internal mainReadyToSendAddress;

	/* White List */
	mapping(address => bool) public whiteList;

    /* Current Phase */
    Phases public phase = Phases.PreStart;

	/*
	* Modifiers
	*/

	modifier respectTimeFrame() {
		require((now >= PRE_START_TIME) && (now < PRE_END_TIME ) || (now >= MAIN_START_TIME) && (now < MAIN_END_TIME ));
		_;
	}

	/*
	 * Event
	*/
	event LogReceivedETH(address addr, uint value);
	event LogCoinsEmited(address indexed from, uint amount);

	/*
	 * Constructor
	*/
	function Crowdsale() public{
		
	}

	/**
	*	Allow to set TTC address
	*/
	function setTTCAddress(address _addr) onlyOwner public {
		require(_addr != address(0));
		coin = TTC(_addr);
	}

	/**
	 * Allow to change the team multisig address in the case of emergency.
	 */
	function setMultisigPre(address _addr) onlyOwner public {
		require(_addr != address(0));
		preMultisigEther = _addr;
	}

	/**
	 * Allow to change the team multisig address in the case of emergency.
	 */
	function setMultisigMain(address _addr) onlyOwner public {
		require(_addr != address(0));
		mainMultisigEther = _addr;
	}

	/**
	*	Allow to change the maximum Coin one address can buy during the ico
	*/
	function setMaximumCoinsPerAddress(uint _cnt) onlyOwner public{
		maximumCoinsPerAddress = _cnt;
	}

	/* 
	 * The fallback function corresponds to a donation in ETH
	 */
	function() respectTimeFrame  payable public{
		require(whiteList[msg.sender]);
		receiveETH(msg.sender);
	}

	/*
	 *	Receives a donation in Ether
	*/
	function receiveETH(address _beneficiary) internal {
		require(msg.value >= MIN_INVEST_ETHER) ; 
		adjustPhaseBasedOnTime();
		uint coinToSend ;

		if(phase == Phases.PreIco) {
			Backer storage preBacker = preBackers[_beneficiary];
			require(preBacker.weiReceived.add(msg.value) <= maximumCoinsPerAddress);

			coinToSend = msg.value.mul(PRE_COIN_PER_ETHER_ICO).div(1 ether); 
			require(coinToSend.add(preCoinSentToEther) <= PRE_MAX_CAP) ;

			preBacker.coinSent = preBacker.coinSent.add(coinToSend);
			preBacker.weiReceived = preBacker.weiReceived.add(msg.value);   
			preBacker.coinReadyToSend = preBacker.coinReadyToSend.add(coinToSend);
			preReadyToSendAddress.push(_beneficiary);

			// Update the total wei collected during the crowdfunding
			preEtherReceived = preEtherReceived.add(msg.value); 
			preCoinSentToEther = preCoinSentToEther.add(coinToSend);

			// Send events
			LogReceivedETH(_beneficiary, preEtherReceived); 

		}else if (phase == Phases.MainIco){
			Backer storage mainBacker = mainBackers[_beneficiary];
			require(mainBacker.weiReceived.add(msg.value) <= maximumCoinsPerAddress);

			coinToSend = msg.value.mul(MAIN_COIN_PER_ETHER_ICO).div(1 ether); 	
			require(coinToSend.add(mainCoinSentToEther) <= MAIN_MAX_CAP) ;

			mainBacker.coinSent = mainBacker.coinSent.add(coinToSend);
			mainBacker.weiReceived = mainBacker.weiReceived.add(msg.value);   
			mainBacker.coinReadyToSend = mainBacker.coinReadyToSend.add(coinToSend);
			mainReadyToSendAddress.push(_beneficiary);

			// Update the total wei collected during the crowdfunding
			mainEtherReceived = mainEtherReceived.add(msg.value); 
			mainCoinSentToEther = mainCoinSentToEther.add(coinToSend);

			// Send events
			LogReceivedETH(_beneficiary, mainEtherReceived); 
		}
	}

	/*
	*	Adjust phase base on time
	*/
    function adjustPhaseBasedOnTime() internal {

        if (now < PRE_START_TIME) {
            if (phase != Phases.PreStart) {
                phase = Phases.PreStart;
            }
        } else if (now >= PRE_START_TIME && now < PRE_END_TIME) {
            if (phase != Phases.PreIco) {
                phase = Phases.PreIco;
            }
        } else if (now >= PRE_END_TIME && now < MAIN_START_TIME) {
            if (phase != Phases.PauseIco) {
                phase = Phases.PauseIco;
            }
        }else if (now >= MAIN_START_TIME && now < MAIN_END_TIME) {
            if (phase != Phases.MainIco) {
                phase = Phases.MainIco;
            }
        }else {
        	if (phase != Phases.AfterIco){
        		phase = Phases.AfterIco;
        	}
        }
    }
	

	/*
	*	Durign the pre ico, should be called by owner to send TTC to beneficiary address
	*/
	function preSendTTC() onlyOwner public {
		for(uint i=0; i < preReadyToSendAddress.length ; i++){
			address backerAddress = preReadyToSendAddress[i];
			uint coinReadyToSend = preBackers[backerAddress].coinReadyToSend;
			if ( coinReadyToSend > 0) {
				preBackers[backerAddress].coinReadyToSend = 0;
				coin.transfer(backerAddress, coinReadyToSend);
				LogCoinsEmited(backerAddress, coinReadyToSend);
			}
		}
		delete preReadyToSendAddress;
		require(preMultisigEther.send(this.balance)) ; 
	}

	/*
	*	Durign the main ico, should be called by owner to send TTC to beneficiary address
	*/
	function mainSendTTC() onlyOwner public{
		for(uint i=0; i < mainReadyToSendAddress.length ; i++){
			address backerAddress = mainReadyToSendAddress[i];
			uint coinReadyToSend = mainBackers[backerAddress].coinReadyToSend;
			if ( coinReadyToSend > 0) {
				mainBackers[backerAddress].coinReadyToSend = 0;
				coin.transfer(backerAddress, coinReadyToSend);
				LogCoinsEmited(backerAddress, coinReadyToSend);
			}
		}
		delete mainReadyToSendAddress;
		require(mainMultisigEther.send(this.balance)) ; 

	}

	/*
	*  White list, only address in white list can buy TTC
	*/
	function addWhiteList(address[] _whiteList) onlyOwner public{
		for (uint i =0;i<_whiteList.length;i++){
			whiteList[_whiteList[i]] = true;
		}	
	}

	/*	
	 * Finalize the crowdsale, should be called after the refund period
	*/
	function finalize() onlyOwner public {
		adjustPhaseBasedOnTime();
		require(phase == Phases.AfterIco);
		require(this.balance > 0);
		require(mainMultisigEther.send(this.balance)) ; 
		uint remains = coin.balanceOf(this);
		if (remains > 0) { 
			coin.transfer(owner,remains);
		}
	}


	/**
	 * Manually back TTC owner address.
	 */
	function backTTCOwner() onlyOwner public {
		coin.transferOwnership(owner);
	}


	/**
	 * Transfer remains to owner in case if impossible to do min invest
	 */
	function getPreRemainCoins() onlyOwner public {
		uint preRemains = PRE_MAX_CAP - preCoinSentToEther;
		Backer storage backer = preBackers[owner];
		coin.transfer(owner, preRemains); 
		backer.coinSent = backer.coinSent.add(preRemains);
		preCoinSentToEther = preCoinSentToEther.add(preRemains);
		
		LogCoinsEmited(this ,preRemains);
		LogReceivedETH(owner, preEtherReceived); 
	}


	/**
	 * Transfer remains to owner in case if impossible to do min invest
	 */
	function getMainRemainCoins() onlyOwner public {
		uint mainRemains = MAIN_MAX_CAP - mainCoinSentToEther;
		Backer storage backer = mainBackers[owner];
		coin.transfer(owner, mainRemains); 
		backer.coinSent = backer.coinSent.add(mainRemains);
		mainCoinSentToEther = mainCoinSentToEther.add(mainRemains);

		LogCoinsEmited(this ,mainRemains);
		LogReceivedETH(owner, mainEtherReceived); 
	}

	/**
	*	Refund to specific address 
	*/
	function refund(address _beneficiary) onlyOwner public {

		uint valueToSend = 0;
		Backer storage preBacker = preBackers[_beneficiary];
		if (preBacker.coinReadyToSend > 0){ 
			uint preValueToSend = preBacker.coinReadyToSend.mul(1 ether).div(PRE_COIN_PER_ETHER_ICO);
			preBacker.coinSent = preBacker.coinSent.sub(preBacker.coinReadyToSend);
			preBacker.weiReceived = preBacker.weiReceived.sub(preValueToSend);   
			preEtherReceived = preEtherReceived.sub(preValueToSend); 
			preCoinSentToEther = preCoinSentToEther.sub(preBacker.coinReadyToSend);
			preBacker.coinReadyToSend = 0;
			valueToSend = valueToSend + preValueToSend;

		}

		Backer storage mainBacker = mainBackers[_beneficiary];
		if (mainBacker.coinReadyToSend > 0){ 
			uint mainValueToSend = mainBacker.coinReadyToSend.mul(1 ether).div(MAIN_COIN_PER_ETHER_ICO);
			mainBacker.coinSent = mainBacker.coinSent.sub(mainBacker.coinReadyToSend);
			mainBacker.weiReceived = mainBacker.weiReceived.sub(mainValueToSend);   
			mainEtherReceived = mainEtherReceived.sub(mainValueToSend); 
			mainCoinSentToEther = mainCoinSentToEther.sub(mainBacker.coinReadyToSend);
			mainBacker.coinReadyToSend = 0;
			valueToSend = valueToSend + mainValueToSend;

		}
		if (valueToSend > 0){
			require(_beneficiary.send(valueToSend));
		}
		
	}


	/**
	*	Refund to all address
	*/	
	function refundAll() onlyOwner public {

		for(uint i=0; i < preReadyToSendAddress.length ; i++){
			refund(preReadyToSendAddress[i]);

		}
		
		for(uint j=0; j < mainReadyToSendAddress.length ; j++){
			refund(mainReadyToSendAddress[j]);

		}

		delete preReadyToSendAddress;
		delete mainReadyToSendAddress;

	}
	

}




