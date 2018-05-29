pragma solidity ^0.4.16;

import "./StandardToken.sol";
import "./Ownable.sol";


/**
 *  TTC token contract. Implements
 */
contract TTC is StandardToken, Ownable {
  string public constant name = "TTC";
  string public constant symbol = "TTC";
  uint public constant decimals = 18;


  // Constructor
  function TTC() public {
      totalSupply = 1000000000000000000000000000;
      balances[msg.sender] = totalSupply; // Send all tokens to owner
  }

  /**
   *  Burn away the specified amount of TTC tokens
   */
  function burn(uint _value) onlyOwner public returns (bool) {
    balances[msg.sender] = balances[msg.sender].sub(_value);
    totalSupply = totalSupply.sub(_value);
    Transfer(msg.sender, 0x0, _value);
    return true;
  }

}






