// Import libraries we need.
import { default as Web3 } from 'web3';
import { default as contract } from 'truffle-contract'
import { default as BigNumber} from 'bignumber.js'

// Import out contract artifacts
import mytrade_artifacts from '../../build/contracts/Trade.json'

var MyTrade = contract(mytrade_artifacts)

var account_list
var default_buyer
var default_seller
var buyer_balance
var seller_balance

window.App = {

    start: function() {
        var self = this
        MyTrade.setProvider(web3.currentProvider)

        web3.eth.getAccounts(function(err, accs) {
            if (err != null) {
              alert("There was an error fetching your accounts.")
              return
            }
      
            if (accs.length == 0) {
              alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.")
              return
            }
            // 以后需要替换为用户的实际账户
            account_list = accs
            default_buyer = account_list[0]
            default_seller = account_list[1]
           
            console.log("Check account")
            console.log(default_buyer)
           
            // 设置初始合约默认地址，否则会报错invalid address
            web3.eth.defaultAccount = default_buyer

            self.refreshBalance(default_buyer)

           
          })
    
    },

    // 返回新的地址给注册的新用户
    getNewAccount: function() {

    },

    setStatus: function(message) {
        return message
    },

    refreshBalance: function(account) {
        
        web3.eth.getBalance(account, function(err, result){
            console.log("Refresh Balance")
            if (!err) {
                 var balance = web3.fromWei(result ,'ether').toString()
                 console.log(balance)
                 return balance
            }
            else {
                console.log(err)
            }
        })
        
    },

    checkBalanceEnough: function(account, total) {
        var self = this
        if (total < self.refreshBalance(account)) {
            return false
        }
        else {
            return true
        }
    },

    makeTrade: function(cart_list, callback) {

        var self = this
        var txHashList = []
        var transaction_num = cart_list.length
        var waiting_for = 0 //异步等待标志
        var flag = true
        function waitingEnd(flag) {
            if (flag === transaction_num) {
                callback(flag, cart_list)
            }
        }
        //统计购物车总价是否超过用户余额
        var total = 0
        for (var i in cart_list){
            total += cart_list[i].number * cart_list[i].price
        }
        // 尚未添加价格确认

        for (var i in cart_list) {
            MyTrade.deployed().then(function(instance) {
                // 如果买卖双方地址没有被赋值，使用默认地址交易
                var tradeDetail = cart_list[i]
                if (tradeDetail.buyerAddress === undefined) {
                    tradeDetail.buyerAddress = default_buyer
                }
                if (tradeDetail.sellerAddress === undefined) {
                    tradeDetail.sellerAddress = default_seller
                }
                console.log("Show trade addresses:")
                console.log(tradeDetail.buyerAddress)
                console.log(tradeDetail.sellerAddress)
                //
                var contractAddress = instance.getContractAddress().value
                var contractBalance = instance.getContractBalance()
                console.log("Show contract info")
                console.log(contractAddress)
                console.log(contractBalance)

                var txHash = instance.setTrade.sendTransaction(tradeDetail.selleruid, tradeDetail.uid, tradeDetail.pid,
                    tradeDetail.number, web3.toWei(tradeDetail.productPrice, 'ether')
                    , tradeDetail.sellerAddress, 
                    {from:tradeDetail.buyerAddress, value:web3.toWei(total, 'ether'), gas:3000000})

                txHash.then(function(value) {
                    console.log("Waiting for transaction:")
                    console.log(value.tx)
                    //在输入的购物车里面添加交易成功的Hash
                   
                    var contractBalance = instance.getContractBalance()
                    console.log("Show contract balance")
                    
                    console.log(contractBalance)

                    tradeDetail.hash = value.tx
                    waiting_for += 1
                    waitingEnd(waiting_for)
                })
            }).then(function() {
                console.log("Trade Complete!")
                
            }).catch(function(e) {
                console.log(e)
                console.log("Error making trade, check log")
            })
        }
       
    },

    testTrade: function() {
        var tempAddr = "0x2b98f779b6eb273caa9cf73607be899625c3ac6d"
        MyTrade.deployed().then(function(instance) {
            var contractAddress = instance.getContractAddress()
            contractAddress.then(function(value) {
                var testAddr = value.toString()
                console.log("Contract Address")
                console.log(value)
                console.log(typeof(value))
                var contractBalance = web3.eth.getBalance(testAddr).toNumber()
                console.log("Show contract info before trade")
                console.log(contractBalance)
                var txHash = web3.eth.sendTransaction(
                    {from:default_buyer, to:testAddr, value:web3.toWei(5, 'ether')}, function(){
                        contractBalance = web3.eth.getBalance(testAddr).toNumber()
                        console.log("Show contract info after trade")
                        console.log(contractBalance)
                    })
            })
           
        })
    },

    readTransaction: function(address) {
        return web3.eth.getTransaction(address)
    },

    tradeEvent: function() {
        MyTrade.deployed().then(function(instance) {
            instance.showTrade().watch(function(error, result) {
                console.log("Seller:" + result.args.seller + " Buyer:" + result.args.buyer + 
                " Product:" + result.args.item)
            })
        })
        
    }

}
        
window.addEventListener('load', function() {
    // Checking if Web3 has been injected by the browser (Mist/MetaMask)
    if (typeof web3 !== 'undefined') {
      console.warn("Using web3 detected from external source. ")
      // Use Mist/MetaMask's provider
      window.web3 = new Web3(web3.currentProvider)
    } else {
      console.warn("No web3 detected. Falling back to http://127.0.0.1:8545.")
      // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
      window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"))
    }
  
    App.start()
})