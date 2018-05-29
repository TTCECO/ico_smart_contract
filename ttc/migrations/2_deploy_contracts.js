var SafeMath = artifacts.require("./SafeMath.sol");
var TTC = artifacts.require("./TTC.sol");
var Crowdsale = artifacts.require("./Crowdsale.sol");


module.exports = function(deployer) {
	
	var owner = web3.eth.accounts[0];
	var pre_wallet = web3.eth.accounts[1];
	var main_wallet = web3.eth.accounts[2];

	console.log("Owner address: " + owner);	
	console.log("Pre ICO wallet address: " + pre_wallet);	
	console.log("Main ICO wallet address: " + main_wallet);	

	deployer.deploy(SafeMath, { from: owner });
	deployer.link(SafeMath, TTC);
	return deployer.deploy(TTC, { from: owner }).then(function() {
		console.log("TTC address: " + TTC.address);
		return deployer.deploy(Crowdsale,{ from: owner }).then(function() {
			console.log("Crowdsale address: " + Crowdsale.address);
			return Crowdsale.deployed().then(function(crowdsale){
				crowdsale.setTTCAddress(TTC.address, {from: owner});
				crowdsale.setMultisigPre(pre_wallet, {from: owner});
				crowdsale.setMultisigMain(main_wallet, {from: owner});	
			}).then(function(){
				return TTC.deployed().then(function(coin) {
					return coin.owner.call().then(function(owner) {
						console.log("TTC owner : " + owner);
						return coin.transferOwnership(Crowdsale.address, {from: owner}).then(function(txn) {
							console.log("TTC owner was changed: " + Crowdsale.address);		
						});
					})
				});
			})

		});
	});
};