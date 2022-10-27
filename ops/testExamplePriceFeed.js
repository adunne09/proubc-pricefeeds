const { Ident, identClientFactory, nchainClientFactory } = require('provide-js')
const { faker } = require('@faker-js/faker')

const priceFeedABI = require('../example-price-feed.abi.json')

const userParams = {
  first_name: faker.name.firstName(),
  last_name: faker.name.lastName(),
  email: faker.internet.email(),
  password: faker.internet.password(),
}

const organizationParams = {
  name: faker.company.name(),
}

async function main() {
  try {
    // create user
    await Ident.createUser(userParams, 'http', 'localhost:8081')

    // user authorization
    const userToken = await Ident.authenticate(
      { email: userParams.email, password: userParams.password },
      'http',
      'localhost:8081'
    )

    const ident = identClientFactory(
      userToken.token.access_token,
      'http',
      'localhost:8081'
    )

    // create organization
    const organization = await ident.createOrganization(organizationParams)

    // organization authorization
    const organizationToken = await ident.createToken({
      organization_id: organization.id,
      scope: 'offline_access',
    })

    const nchain = nchainClientFactory(
      organizationToken.accessToken,
      'http',
      'localhost:8085'
    )

    // organization wallet
    const organizationWallet = await nchain.createWallet({
      purpose: 44,
    })

    // create price feed contract
    const priceFeedContract = await nchain.createContract({
      address: '0x0715A7794a1dc8e42615F059dD6e406A6594651A', // eth/usd pair -- see https://docs.chain.link/docs/consuming-data-feeds/ & https://docs.chain.link/docs/data-feeds/price-feeds/addresses/?network=polygon#Mumbai%20Testnet
      name: 'ETH/USD',
      network_id: '4251b6fd-c98d-4017-87a3-d691a77a52a7', // polygon mumbai testnet nchain id
      params: {
        argv: [],
        wallet_id: organizationWallet.id,
        compiled_artifact: {
          name: 'EACAggregatorProxy',
          abi: priceFeedABI,
        },
      },
      type: 'price-feed',
    })

    // execute contract method
    const priceResult = await nchain.executeContract(priceFeedContract.id, {
      wallet_id: organizationWallet.id,
      method: 'latestRoundData',
      params: [],
      value: 0,
    })
    console.log('price feed result:', priceResult)
  } catch (e) {
    console.error('failed to use chainlink price feed;', e)
  }
}

main()
