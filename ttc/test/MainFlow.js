var TTC = artifacts.require("./TTC.sol");
var Crowdsale = artifacts.require("./Crowdsale.sol");

var TOTAL_COINS = 1000000000000000000000000000;
var PRE_MAX_CAP = 25000000000000000000000000;
var MAIN_MAX_CAP = 125000000000000000000000000
var DAYS_TO_PRE_ICO = 1;
var DAYS_TO_MAIN_ICO = DAYS_TO_PRE_ICO + 14;
var SEND_ETHER =  4;
var SEND_ETHER2 = 1;
var PRE_TTC_PER_ETHER = 5000000000000000000000;
var MAIN_TTC_PER_ETHER = 4000000000000000000000;


contract('MainFlow', function(accounts) {

  var eth = web3.eth;
  var owner = eth.accounts[0];
  var preWallet = eth.accounts[1];
  var mainWallet = eth.accounts[2];
  var buyer = eth.accounts[3];
  var buyer2 = eth.accounts[4];

  function getBalance(addr){
    return web3.fromWei(web3.eth.getBalance(addr), "ether");
  }

  function printBalance() {
    const ownerBalance = web3.eth.getBalance(owner);
    const preWalletBalance = web3.eth.getBalance(preWallet);
    const mainWalletBalance = web3.eth.getBalance(mainWallet);
    const buyerBalance = web3.eth.getBalance(buyer);
    const buyer2Balance = web3.eth.getBalance(buyer2);
    const crowdSaleBalance = web3.eth.getBalance(Crowdsale.address);

    console.log("Owner balance", web3.fromWei(ownerBalance, "ether").toString(), " ETHER");
    console.log("Pre wallet balance", web3.fromWei(preWalletBalance, "ether").toString(), " ETHER");
    console.log("Main wallet balance", web3.fromWei(mainWalletBalance, "ether").toString(), " ETHER");
    console.log("Buyer balance", web3.fromWei(buyerBalance, "ether").toString(), " ETHER");
    console.log("Buyer2 balance", web3.fromWei(buyer2Balance, "ether").toString(), " ETHER");
    console.log("Crowdsale balance", web3.fromWei(crowdSaleBalance, "ether").toString(), " ETHER");
  }


  it("Should put 1,000,000,000.000000 TTC in the owner account", function() {
    return TTC.deployed().then(function(instance) {
      return instance.balanceOf.call(owner);
    }).then(function(balance) {
      assert.equal(balance.valueOf(), TOTAL_COINS, "1,000,000,000.000000 wasn't in the owner account");
    });
  });

  it("Send 150,000,000.000000 TTC to Crowdsale contract", function() {
    return TTC.deployed().then(function(coin) {
      return coin.transfer(Crowdsale.address, PRE_MAX_CAP + MAIN_MAX_CAP, {from: owner}).then(function () {
        return coin.balanceOf.call(Crowdsale.address);
      });
    }).then(function (balance) {
      console.log("Crowdsale balance: " + balance);
      assert.equal(balance.valueOf(), PRE_MAX_CAP + MAIN_MAX_CAP , "150,000,000.000000 wasn't in the Crowdsale account");
    });
  });

  it("Before pre ico, buy 100 coins, should fail ",function(){
    return Crowdsale.deployed().then(function(crowd) {
        return crowd.sendTransaction({from: buyer, to: crowd.address, value: web3.toWei(SEND_ETHER, "ether")});
     }).catch(function(error) {
      console.log("Throw was happened. Test succeeded.");
    });

  });

  it("Set the evm time to pre ico",function(){
    web3.evm.increaseTime(DAYS_TO_PRE_ICO*24*3600);
  });

  it("During pre ico, address not in white list, buy 100 coins, should fail ",function(){
    return Crowdsale.deployed().then(function(crowd) {
        return crowd.sendTransaction({from: buyer, to: crowd.address, value: web3.toWei(SEND_ETHER, "ether")});
     }).catch(function(error) {
      console.log("Throw was happened. Test succeeded.");
    });

  });


  it("Add buyer to whiteList", function() {
    return Crowdsale.deployed().then(function(crowd) {
        return crowd.addWhiteList([buyer],{from:owner}).then(function(){
          return crowd.whiteList.call(buyer);
        })
     }).then(function(exist) {
        assert.equal(exist, true, "buyer is not in WhiteList ");
     });
  });

  it("set maximum per address can buy to 1 ether", function() {
    return Crowdsale.deployed().then(function(crowd) {
        return crowd.setMaximumCoinsPerAddress(web3.toWei(1, "ether"),{from: owner}).then(function(txn) {
 
       })

        }).then(function(balance) {

     });
  });

  it("Buy TTC using 10 ETH should fail, beyond the maximum per address can buy", function() {
    return Crowdsale.deployed().then(function(crowd) {
        return crowd.sendTransaction({from: buyer, to: crowd.address, value: web3.toWei(10, "ether")}).then(function(txn) {
          return TTC.deployed().then(function(coin) {
            return coin.balanceOf.call(buyer) ;
          });
       })

        }).catch(function(error) {
      console.log("Throw was happened. Test succeeded.");
    });
  });

  it("set maximum per address can buy to 10 ether", function() {
    return Crowdsale.deployed().then(function(crowd) {
        return crowd.setMaximumCoinsPerAddress(web3.toWei(10, "ether"),{from: owner}).then(function(txn) {
 
       })

        }).then(function(balance) {

     });
  });


  it("Buy TTC using 100 ETH", function() {
    return Crowdsale.deployed().then(function(crowd) {
        
        var logReceivedETH = crowd.LogReceivedETH();
        logReceivedETH.watch(function(err, result) {
          if (err) {
            console.log("Error event ", err);
            return;
          }
          console.log("LogReceivedETH event = ",result.args.addr,result.args.value);
        }); 

        return crowd.sendTransaction({from: buyer, to: crowd.address, value: web3.toWei(SEND_ETHER, "ether")}).then(function(txn) {
          return TTC.deployed().then(function(coin) {
            return coin.balanceOf.call(buyer) ;
          });
       })

     }).then(function(balance) {
         
        console.log("Buyer TTC balance: ", balance.valueOf(), " TTC");
        assert.equal(balance.valueOf(), 0, "TTC should not send by owner now");       
        console.log("Buyer Eth balance: ", getBalance(buyer).valueOf(), " ETH");
        assert.equal((999999- SEND_ETHER  <= getBalance(buyer).valueOf()) && (getBalance(buyer).valueOf() <= 1000000 - SEND_ETHER), true, "100 ETH was't not charge");

        console.log("Crowdsale ETH balance: ", getBalance(Crowdsale.address).valueOf(), " ETH");
        assert.equal(getBalance(Crowdsale.address).valueOf(), SEND_ETHER , "100 ETH was't in Crowdsale contract address");
        console.log("Pre wallet ETH balance: ", getBalance(preWallet).valueOf(), " ETH");
        assert.equal(getBalance(preWallet).valueOf(), 0 , "0 ETH was't in pre wallet");
        console.log("Main wallet ETH balance: ", getBalance(mainWallet).valueOf(), " ETH");
        assert.equal(getBalance(mainWallet).valueOf(), 0 , "0 ETH was't in main wallet");

     });
  });


  it("Add buyer2 into whiteList", function() {
    return Crowdsale.deployed().then(function(crowd) {
        return crowd.addWhiteList([buyer2],{from:owner}).then(function(){
          return crowd.whiteList.call(buyer2);
        })
     }).then(function(exist) {
        assert.equal(exist, true, "buyer is not in WhiteList ");
     });
  });

  it("Another buyer buy TTC using 50 ETH ", function() {
    return Crowdsale.deployed().then(function(crowd) {
        return crowd.sendTransaction({from: buyer2, to: crowd.address, value: web3.toWei(SEND_ETHER2, "ether")}).then(function(txn) {
          return TTC.deployed().then(function(coin) {
            return coin.balanceOf.call(buyer2) ;
          });
       })

     }).then(function(balance) {
         
        console.log("Buyer TTC balance: ", balance.valueOf(), " TTC");
        assert.equal(balance.valueOf(), 0, "TTC should not send by owner now");       
        console.log("Buyer Eth balance: ", getBalance(buyer2).valueOf(), " ETH");
        assert.equal((999999 - SEND_ETHER2 <= getBalance(buyer2).valueOf()) && (getBalance(buyer2).valueOf() <= 1000000 - SEND_ETHER2), true, "50 ETH was't not charge");

        console.log("Crowdsale ETH balance: ", getBalance(Crowdsale.address).valueOf(), " ETH");
        assert.equal(getBalance(Crowdsale.address).valueOf(), SEND_ETHER + SEND_ETHER2 , "100 ETH was't in Crowdsale contract address");
        console.log("Pre wallet ETH balance: ", getBalance(preWallet).valueOf(), " ETH");
        assert.equal(getBalance(preWallet).valueOf(), 0 , "0 ETH was't in pre wallet");
        console.log("Main wallet ETH balance: ", getBalance(mainWallet).valueOf(), " ETH");
        assert.equal(getBalance(mainWallet).valueOf(), 0 , "0 ETH was't in main wallet");

     });
  });




  it("Send TTC to buyers by owner",function(){
    return Crowdsale.deployed().then(function(crowd){
        var logCoinsEmited = crowd.LogCoinsEmited();
        logCoinsEmited.watch(function(err, result) {
          if (err) {
            console.log("Error event ", err);
            return;
          }
          console.log("LogCoinsEmited event = ",result.args.from,result.args.amount);
        }); 

        return crowd.preSendTTC({from:owner}).then(function(){
          return TTC.deployed().then(function(coin){
            //return coin.balanceOf.call(buyer) ;
            return coin.balanceOf.call(buyer2) ;
          })
      });
      
    }).then(function(balance){
            console.log("TTC balance: ", balance.valueOf(), " TTC");
            //assert.equal(balance.valueOf(), SEND_ETHER * PRE_TTC_PER_ETHER, "TTC not received correct");   
            assert.equal(balance.valueOf(), SEND_ETHER2 * PRE_TTC_PER_ETHER, "TTC not received correct");   
   
            console.log("Crowdsale ETH balance: ", getBalance(Crowdsale.address).valueOf(), " ETH");
            assert.equal(getBalance(Crowdsale.address).valueOf(), 0 , "100 ETH was't in Crowdsale contract address");
            console.log("Pre wallet ETH balance: ", getBalance(preWallet).valueOf(), " ETH");
            assert.equal(getBalance(preWallet).valueOf(), SEND_ETHER + SEND_ETHER2 , "0 ETH was't in pre wallet");
            console.log("Main wallet ETH balance: ", getBalance(mainWallet).valueOf(), " ETH");
            assert.equal(getBalance(mainWallet).valueOf(), 0 , "0 ETH was't in main wallet");


   })
  });


  it("Send TTC to buyers by owner, should not change any account",function(){
    return Crowdsale.deployed().then(function(crowd){
        var logCoinsEmited = crowd.LogCoinsEmited();
        logCoinsEmited.watch(function(err, result) {
          if (err) {
            console.log("Error event ", err);
            return;
          }
          console.log("LogCoinsEmited event = ",result.args.from,result.args.amount);
        }); 

        return crowd.preSendTTC({from:owner}).then(function(){
          return TTC.deployed().then(function(coin){
            //return coin.balanceOf.call(buyer) ;
            return coin.balanceOf.call(buyer2) ;
          })
      });
      
    }).then(function(balance){
            console.log("TTC balance: ", balance.valueOf(), " TTC");
            //assert.equal(balance.valueOf(), SEND_ETHER * PRE_TTC_PER_ETHER, "TTC not received correct");   
            assert.equal(balance.valueOf(), SEND_ETHER2 * PRE_TTC_PER_ETHER, "TTC not received correct");   
   
            console.log("Crowdsale ETH balance: ", getBalance(Crowdsale.address).valueOf(), " ETH");
            assert.equal(getBalance(Crowdsale.address).valueOf(), 0 , "100 ETH was't in Crowdsale contract address");
            console.log("Pre wallet ETH balance: ", getBalance(preWallet).valueOf(), " ETH");
            assert.equal(getBalance(preWallet).valueOf(), SEND_ETHER + SEND_ETHER2 , "0 ETH was't in pre wallet");
            console.log("Main wallet ETH balance: ", getBalance(mainWallet).valueOf(), " ETH");
            assert.equal(getBalance(mainWallet).valueOf(), 0 , "0 ETH was't in main wallet");


   })
  });


  it("Buy 100 coins Again by buyer", function() {
    return Crowdsale.deployed().then(function(crowd) {
        return crowd.sendTransaction({from: buyer, to: crowd.address, value: web3.toWei(SEND_ETHER, "ether")});
     }).then(function() {
        console.log("buyer ETH balance: ", getBalance(buyer).valueOf(), " ETH");
        assert.equal((999999 - 2*SEND_ETHER <= getBalance(buyer).valueOf()) && (getBalance(buyer).valueOf() <= 1000000 - 2*SEND_ETHER), true, "100 ETH was't not charge");
        console.log("Crowdsale ETH balance: ", getBalance(Crowdsale.address).valueOf(), " ETH");
        assert.equal(getBalance(Crowdsale.address), SEND_ETHER , "crowdsale balance is not 100 ");

        
     });
  });

  it("Refund eth to buyer", function(){
    return Crowdsale.deployed().then(function(crowd) {
      crowd.refund(buyer,{from:owner});
    });

  });


  it("check the refund result",function(){       
      console.log("buyer ETH balance: ", getBalance(buyer).valueOf(), " ETH");
      assert.equal((999999 - SEND_ETHER  <= getBalance(buyer).valueOf()) && (getBalance(buyer).valueOf() <= 1000000 - SEND_ETHER), true, "100 ETH was't not charge");
  });


  it("Buy 100 coins Again by buyer, Buy 200 coins Again by buyer2,Refund eth to buyer  ", function() {
    return Crowdsale.deployed().then(function(crowd) {
        return crowd.sendTransaction({from: buyer, to: crowd.address, value: web3.toWei(SEND_ETHER, "ether")});
     });
  });

  it("Buy 200 coins Again by buyer2 ", function() {
    return Crowdsale.deployed().then(function(crowd) {
        return crowd.sendTransaction({from: buyer2, to: crowd.address, value: web3.toWei(SEND_ETHER * 2, "ether")});
     });
  });

  it("Refund eth to buyer", function(){
    return Crowdsale.deployed().then(function(crowd) {
      crowd.refundAll({from:owner});
    });

  });

  it("check the refund result",function(){       
      console.log("buyer ETH balance: ", getBalance(buyer).valueOf(), " ETH");
      assert.equal((999999 - SEND_ETHER  <= getBalance(buyer).valueOf()) && (getBalance(buyer).valueOf() <= 1000000 - SEND_ETHER), true, "100 ETH was't not charge");
      assert.equal((999999 - SEND_ETHER2 <= getBalance(buyer2).valueOf()) && (getBalance(buyer2).valueOf() <= 1000000 - SEND_ETHER2), true, "50 ETH was't not charge");

  });

  it("Buy 100 coins Again", function() {
    return Crowdsale.deployed().then(function(crowd) {
        var logReceivedETH = crowd.LogReceivedETH();
        logReceivedETH.watch(function(err, result) {
          if (err) {
            console.log("Error event ", err);
            return;
          }
          console.log("LogReceivedETH event = ",result.args.addr,result.args.value);
        }); 

        return crowd.sendTransaction({from: buyer, to: crowd.address, value: web3.toWei(SEND_ETHER, "ether")}).then(function(txn) {
          return TTC.deployed().then(function(coin) {
            return coin.balanceOf.call(buyer);
            
          });
       })

     }).then(function(balance) {
        console.log("Buyer balance: ", balance.valueOf(), " TTC");
        
     });
  });


  it("Finalize ",function(){
    web3.evm.increaseTime(40000000);
    return Crowdsale.deployed().then(function(crowd){
      return crowd.finalize({from:owner}).then(function(){printBalance();});
    });
  });


  function rpc(method, arg) {
    var req = {
      jsonrpc: "2.0",
      method: method,
      id: new Date().getTime()
    };

    if (arg) req.params = arg;

    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync(req, (err, result) => {
        if (err) return reject(err)
        if (result && result.error) {
          return reject(new Error("RPC Error: " + (result.error.message || result.error)))
        }
        resolve(result)
      });
    })
  }

  // Change block time using the rpc call "evm_increaseTime"
  web3.evm = web3.evm || {}
  web3.evm.increaseTime = function (time) {
    return rpc('evm_increaseTime', [time]);
  }

});
