var SafeMath = artifacts.require("./SafeMath.sol");
var TTC = artifacts.require("./TTC.sol");
var CrowdsaleMain = artifacts.require("./CrowdsaleMain.sol");


module.exports = function(deployer) {
	
	var owner = web3.eth.accounts[0];
	var main_wallet = web3.eth.accounts[2];

	console.log("Owner address: " + owner);	
	console.log("Main ICO wallet address: " + main_wallet);	

	deployer.deploy(SafeMath, { from: owner });
	deployer.link(SafeMath, TTC);
	return deployer.deploy(TTC, { from: owner }).then(function() {
		console.log("TTC address: " + TTC.address);
		return deployer.deploy(CrowdsaleMain,{ from: owner }).then(function() {
			console.log("Crowdsale address: " + CrowdsaleMain.address);
			return CrowdsaleMain.deployed().then(function(crowdsale){
				crowdsale.setTTCAddress(TTC.address, {from: owner});
				crowdsale.setMultisigMain(main_wallet, {from: owner});	
			}).then(function(){
				return TTC.deployed().then(function(coin) {
					return coin.owner.call().then(function(owner) {
						console.log("TTC owner : " + owner);
						return coin.transferOwnership(CrowdsaleMain.address, {from: owner}).then(function(txn) {
							console.log("TTC owner was changed: " + CrowdsaleMain.address);		
						});
					})
				});
			})

		});
	});
};