var lightwallet = require('eth-lightwallet');
var Web3 = require('web3');
var fs = require('fs');
var keystoreFile = "wallet.json";
var myArgs = require('optimist').argv;
var HookedWeb3Provider = require("hooked-web3-provider");
var contract = require('../app/contracts/LocalsMembership.json');

var poezencontract = "0x65e7e77fa70f408257f1d9f3d3e8e20485ac5589";

var global_keystore;
var account;
var web3;
var web3_monitor;

var commands = ['balances', 'sendether'];

if (!fs.existsSync(keystoreFile)) {

	// maak nieuwe wallet en exit
	var secretSeed = lightwallet.keystore.generateRandomSeed();
	global_keystore = new lightwallet.keystore(secretSeed, 'testing');
	global_keystore.generateNewAddress("testing", 10);
	var keyStoreString = global_keystore.serialize();

	fs.writeFile(keystoreFile, keyStoreString, function(err) {
		if (err) {
			return console.log(err);
		}
		console.log("The keystore was saved! ==> ", keystoreFile);
	});

	account = global_keystore.getAddresses()[0];
	console.log('Your main account is ', account);
	console.log('now send this guy some ether in your geth client please');
	console.log("eth.sendTransaction({from:eth.coinbase, to:'" + account + "',value: web3.toWei(20, \"ether\")})");

} else {
	console.log('Keystore file found.');
	var contents = fs.readFileSync(keystoreFile, 'utf8');
	var global_keystore = lightwallet.keystore.deserialize(contents);

	global_keystore.passwordProvider = function(callback) {
		callback(null, 'testing')
	};

	//console.log(global_keystore);
	console.log

	account = global_keystore.getAddresses()[0];
	console.log('Your account is ', account);

	web3 = new Web3();
	var provider = new HookedWeb3Provider({
		host: "http://localhost:8545",
		transaction_signer: global_keystore
	});
	web3.setProvider(provider);



	web3_monitor = new Web3();
	web3_monitor.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

	var gasPrice;

	web3.eth.getGasPrice(function(err, result) {

		var gasPrice = result.toNumber(10);
		console.log('gasprice is ', gasPrice);

		console.log(myArgs._[0]);
		var command = myArgs._[0];
		switch (command) {
			case "balances":
			default:
				showBalances();
				break;
			case "deploycontract":
				console.log(contract.bytecode);
				var MyContract = web3.eth.contract(contract.abi);
				var contractInstance = MyContract.new({
					from: account,
					gasPrice: gasPrice,
					gasLimit: 3000000,
					gas: 2000000,
					nonce: 4,
					data: contract.bytecode
				}, function(err, myContract) {
					if (!err) {
						// NOTE: The callback will fire twice!
						// Once the contract has the transactionHash property set and once its deployed on an address.

						// e.g. check tx hash on the first call (transaction send)
						if (!myContract.address) {
							console.log(myContract.transactionHash) // The hash of the transaction, which deploys the contract

							// check address on the second call (contract deployed)
						} else {
							console.log(myContract.address) // the contract address
						}
					} else {
						console.log('error:', err);
					}
				});
				break;
			case "addmember":
				// creation of contract object
				var MyContract = web3.eth.contract(contract.abi);
				var myContractInstance = MyContract.at(poezencontract);

				var options = {
					from: account,
//					to: poezencontract,
					value: 4 * 1e18,
					gas: 3141590,
					gasPrice: gasPrice,
					nonce: Math.floor(Math.random(999999)) + new Date().getTime(),
				};

				var newMember = '0x' + global_keystore.getAddresses()[2];

				console.log('adding member ',newMember);
				console.log('contract options',options);


				var result = myContractInstance.addMember.sendTransaction(newMember, options,
					function(err, result) {
						if (err != null) {
							console.log(err);
							console.log("ERROR: Transaction didn't go through. See console.");
						} else {
							console.log("Transaction Successful!");
							console.log(result);
							monitorBalances();
						}
					}
				);
				break;
			case "transfer":

				var to = global_keystore.getAddresses()[1];
				var options = {
					from: account,
					to: to,
					value: 1000000000000000000,
					gas: 3141590,
					gasPrice: gasPrice,
					nonce: Math.floor(Math.random(999999)) + new Date().getTime(),
				};
				console.log(options);
				web3.eth.sendTransaction(options, function(err, result) {

					if (err != null) {
						console.log(err);
						console.log("ERROR: Transaction didn't go through. See console.");
					} else {
						console.log("Transaction Successful!");
						console.log(result);
						monitorBalances();
					}
				});
				/*

								global_keystore.signTransaction(txOptions, function(err, signedTx) {
									console.log(err);
									console.log(signedTx);
									//        expect(signedTx.slice(2)).to.equal(fixtures.valid[0].rawSignedTx)


									web3.eth.sendRawTransaction(signedTx, function(err, txhash) {
										console.log('error: ' + err);
										console.log('txhash: ' + txhash);
									});

								});

				*/

				/*
								var t = lightwallet.txutils.valueTx(txOptions);
								console.log(t);

								var signedTx = global_keystore.signTx(t, 'testing', account);
								console.log(signedTx);


				*/

				break;

		}
	});

}

function monitorBalances() {
	setInterval(showBalances, 2000);
}

function showBalances() {

	if (poezencontract) {
		// creation of contract object
		var MyContract = web3.eth.contract(contract.abi);
		// initiate contract for an address
		var myContractInstance = MyContract.at(poezencontract);
		//console.log('instance', myContractInstance);
	}
	console.log('----Balances of wallet----');
	global_keystore.getAddresses().forEach(function(adress) {
		var status = 0;
		if (myContractInstance) {
			result = myContractInstance.membershipStatus('0x' + adress);
		}

		var wei = web3_monitor.eth.getBalance(adress).toNumber(10);
		console.log('Account', adress, 'has', wei / 1e18, 'ether - islid', result.toNumber(10));
	});
}

//this.account = this.global_keystore.getAddresses()[0];
//this.globalkeystore = this.global_keystore;