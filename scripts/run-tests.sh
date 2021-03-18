#!/bin/bash

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the ganachecli instance that we started (if we started one).
  if [ -n "$ganachecli_pid" ]; then
    kill -9 $ganachecli_pid
  fi
}

ganachecli_running() {
  nc -z localhost 8555
}

if ganachecli_running; then
  echo "Using existing ganache-cli instance"
else
  echo "Starting ganache-cli"

  #./node_modules/ganache-cli/build/cli.node.js --gasLimit 0xfffffffffff --port 8555 --defaultBalanceEther 200\
  #> /dev/null &
	#
	# !!! See this option: --allowUnlimitedContractSize
	# https://ethereum.stackexchange.com/questions/47239/truffle-eip-170-contract-couldnt-be-stored-please-check-your-gas-amount

  # Same accounts as in 'scripts/run-test-blockchain.sh'
  ./node_modules/ganache-cli/cli.js --networkId 1111 --gasLimit 0xfffffffffff --port 8555  --defaultBalanceEther 200\
  --account="0x5767f39a7e4c819fe766420ba49ed8513fa51bf200cc7d531e605318cd0b11cc, 30000000000000000000000000000000000000"\
  --account="0x6603e37b11c11f7e99dcf94c00339c9dd6f1a821083a2861bd41d8d07c736392, 30000000000000000000000000000000000000"\
  --account="0x082d0fb4f1d1fa5f8f53417d611e8f4a63f39c29f0c40d5dae522053fae295e4, 30000000000000000000000000000000000000"\
  --account="0xfbda66c49a985530cdb828d246b6c5a126cbb6903c32d4ac88fad8bc5970157a, 30000000000000000000000000000000000000"\
  --account="0x55031e7b0cae956a6841212a67c5311944213a50c7e9b54b3a3401b133b7ac2a, 30000000000000000000000000000000000000"\
  --account="0x5c87aedec852941aad6e9d488fcd662f0e76d0e1ed90105414ab3774a495dd04, 30000000000000000000000000000000000000"\
  --account="0x8e3870f4d7e395cb7f82332e94491f9f842224c0922e5b07df7a02f57766f5a9, 30000000000000000000000000000000000000"\
  --account="0x8c04791e3b90310f91c6c3caf45dc66deda53edef41fc80f1d91278b1b381a03, 30000000000000000000000000000000000000"\
  --account="0x5d3c2af5bbefe31726d89b2c025f9b4166512de3da31a4f9e1e1df6b92806919, 30000000000000000000000000000000000000"\
  > /dev/null &

  ganachecli_pid=$!
fi

#truffle migrate
#truffle test $1

# Run tests from custom folder
./node_modules/truffle/build/cli.bundled.js test test/contracts/*.js

