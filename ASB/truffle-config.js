const HDWalletProvider = require('truffle-hdwallet-provider');

const mnemonic = process.env.ROPSTEN_SECRET;

module.exports = {
  networks: {
    ropsten: {
      provider: () => new HDWalletProvider(mnemonic, process.env.ROPSTEN_INFURA_URL, 0, 10),
      network_id: '3',
    },
    ganache: {
      host: 'localhost',
      port: 7545,
      network_id: '5777',
    },
  },
  compilers: {
    solc: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      version: '0.4.24',
    },
  },
};
