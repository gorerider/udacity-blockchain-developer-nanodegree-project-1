/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     *
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't for get 
     * to update the `this.height`
     *
     * Note: the symbol `_` in the method name indicates in the javascript convention
     * that this method is a private method. 
     */
    _addBlock(block) {
        let self = this;
        return new Promise(async (resolve, reject) => {
           try {
               // temporary determine next block height
               const lastBlockHeight = self.height
               const nextHeight = lastBlockHeight + 1

               // use the height of the new block to add
               // in order to determine if we can set the previousBlockHash
               if (nextHeight > 0) {
                   block.previousBlockHash = self.chain[lastBlockHeight].hash
               }

               block.height = nextHeight
               block.time = new Date().getTime().toString().slice(0, -3)
               block.hash = SHA256(JSON.stringify(block)).toString()

               // push block on blockchain
               self.chain.push(block)

               // if everything went good so far, increase the block height in blockchain
               self.height = nextHeight

               // validate chain
               const errorLog = await self.validateChain()
               if (errorLog.length === 0) {
                   resolve(block)
               } else {
                   // create an error to add the list of errors to it,
                   // so we have access to it in the controller
                   const blockchainInvalidError = new Error("Blockchain is invalid")
                   blockchainInvalidError.errorLog = errorLog
                   throw blockchainInvalidError
               }
           } catch (e) {
               // this try-catch is very broad, but should suffice for this project
               reject(e)
           }
        });
    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            resolve(`${address}:${new Date().getTime().toString().slice(0,-3)}:starRegistry`)
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Verify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            try {
                // get and validate time from `message`
                const messageTime = parseInt(message.split(':')[1])
                if (!!!messageTime) {
                    throw new Error('Invalid message format')
                }

                // check time elapsed < 5 min
                const currentTime = parseInt(new Date().getTime().toString().slice(0, -3))
                if ((currentTime - (5 * 60)) > messageTime) {
                    throw new Error('Message is old. Request new message and resubmit the request')
                }

                // verify message
                if (!bitcoinMessage.verify(message, address, signature)) {
                    throw new Error('Message verification failed')
                }

                // along with the star, we store the owner wallet address too
                const data = {
                    owner: address,
                    star: star,
                }

                resolve(await self._addBlock(new BlockClass.Block(data)))
            } catch (e) {
                reject(e)
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
            resolve(self.chain.filter(b => b.hash === hash)[0] || null)
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if(block){
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress (address) {
        let self = this;
        let stars = [];

        return new Promise(async (resolve, reject) => {
            for (let block of self.chain) {
                try {
                    const data = await block.getBData()
                    const { owner } = data
                    if (owner === address) {
                        stars.push(data)
                    }
                } catch (e) {
                    // just skip
                }
            }

            resolve(stars)
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validate`
     * 2. Each Block should check the hash with the previousBlockHash
     */
    validateChain() {
        let self = this;
        let errorLog = [];
        return new Promise(async (resolve, reject) => {
            // in case that there is only the Genesis block, we dont validate the blockchain
            if (self.chain.length > 1) {
                // we start from last block
                let block = self.chain[self.chain.length - 1]
                while (block) {
                    if (!(await block.validate())) {
                        errorLog.push(`Block with hash ${block.hash} is invalid`)
                    }
                    // and go all the way from back to the Genesis block
                    block = await self.getBlockByHash(block.previousBlockHash)

                    // if we hit the Genesis block, get out of the loop
                    if (block.height === 0) {
                        break;
                    }
                }
                // suppose we are now out of the while-loop,
                // we need to check if the last seen block is the Genesis block
                if (block.height !== 0) {
                    errorLog.push(`Blockchain is broken. Last seen block with hash. ${block.hash}`)
                }
            }

            resolve(errorLog)
        });
    }

}

module.exports.Blockchain = Blockchain;   