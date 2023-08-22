import * as spendingLimit from '@/services/contracts/spendingLimitContracts'
import { JsonRpcProvider } from '@ethersproject/providers'
import { ZERO_ADDRESS } from '@safe-global/safe-core-sdk/dist/src/utils/constants'
import type { AllowanceModule } from '@/types/contracts'
import { ERC20__factory } from '@/types/contracts'
import { getSpendingLimits, getTokenAllowanceForDelegate, getTokensForDelegate } from '../useSpendingLimits'
import { BigNumber } from '@ethersproject/bignumber'
import * as web3 from '../wallets/web3'
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils'
import { TokenType } from '@safe-global/safe-gateway-typescript-sdk'

const mockProvider = new JsonRpcProvider()

describe('getSpendingLimits', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.resetAllMocks()
  })

  it('should return a flat list of spending limits', async () => {
    const getTokensMock = jest.fn(() => ['0x10', '0x11'])
    const getTokenAllowanceMock = jest.fn(() => [
      BigNumber.from(1),
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
    ])

    jest.spyOn(spendingLimit, 'getSpendingLimitModuleAddress').mockReturnValue('0x1')
    jest.spyOn(spendingLimit, 'getSpendingLimitContract').mockImplementation(
      jest.fn(() => {
        return {
          getTokens: getTokensMock,
          getTokenAllowance: getTokenAllowanceMock,
        } as unknown as AllowanceModule
      }),
    )

    const result = await getSpendingLimits(mockProvider, ZERO_ADDRESS, '4', ['0x2', '0x3'], [])

    expect(result?.length).toBe(4)
  })

  it('should filter out empty allowances', async () => {
    const getTokensMock = jest.fn(() => ['0x10', '0x11'])
    const getTokenAllowanceMock = jest.fn(() => [
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
    ])

    jest.spyOn(spendingLimit, 'getSpendingLimitModuleAddress').mockReturnValue('0x1')
    jest.spyOn(spendingLimit, 'getSpendingLimitContract').mockImplementation(
      jest.fn(() => {
        return {
          getTokens: getTokensMock,
          getTokenAllowance: getTokenAllowanceMock,
        } as unknown as AllowanceModule
      }),
    )

    const result = await getSpendingLimits(mockProvider, ZERO_ADDRESS, '4', ['0x2', '0x3'], [])

    expect(result?.length).toBe(0)
  })
})

describe('getTokensForDelegate', () => {
  it('should fetch tokens for a given delegate', async () => {
    const getTokensMock = jest.fn(() => [])
    const mockContract = { getTokens: getTokensMock } as unknown as AllowanceModule

    await getTokensForDelegate(mockContract, ZERO_ADDRESS, '0x1', [])

    expect(getTokensMock).toHaveBeenCalledWith(ZERO_ADDRESS, '0x1')
  })
})

describe('getTokenAllowanceForDelegate', () => {
  it('should return contract values as strings', async () => {
    const getTokenAllowanceMock = jest.fn(() => [
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
    ])
    const mockContract = { getTokenAllowance: getTokenAllowanceMock } as unknown as AllowanceModule

    const result = await getTokenAllowanceForDelegate(mockContract, ZERO_ADDRESS, '0x1', '0x10', [])

    expect(result.beneficiary).toBe('0x1')
    expect(result.nonce).toBe('0')
    expect(result.amount).toBe('0')
    expect(result.spent).toBe('0')
    expect(result.lastResetMin).toBe('0')
    expect(result.resetTimeMin).toBe('0')
  })

  it('should return tokenInfo from balance', async () => {
    const getTokenAllowanceMock = jest.fn(() => [
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
    ])
    const mockContract = { getTokenAllowance: getTokenAllowanceMock } as unknown as AllowanceModule

    const mockTokenInfoFromBalances = [
      {
        address: '0x10',
        name: 'Test',
        type: TokenType.ERC20,
        symbol: 'TST',
        decimals: 10,
        logoUri: 'https://mock.images/0x10.png',
      },
    ]

    const result = await getTokenAllowanceForDelegate(
      mockContract,
      ZERO_ADDRESS,
      '0x1',
      '0x10',
      mockTokenInfoFromBalances,
    )

    expect(result.token.address).toBe('0x10')
    expect(result.token.decimals).toBe(10)
    expect(result.token.symbol).toBe('TST')
    expect(result.token.logoUri).toBe('https://mock.images/0x10.png')
  })

  it('should return tokenInfo from on-chain if not in balance', async () => {
    const getTokenAllowanceMock = jest.fn(() => [
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
    ])

    jest.spyOn(web3, 'getWeb3ReadOnly').mockImplementation(
      () =>
        ({
          call: (tx: { data: string; to: string }) => {
            {
              const decimalsSigHash = keccak256(toUtf8Bytes('decimals()')).slice(0, 10)
              const symbolSigHash = keccak256(toUtf8Bytes('symbol()')).slice(0, 10)

              if (tx.data.startsWith(decimalsSigHash)) {
                return ERC20__factory.createInterface().encodeFunctionResult('decimals', [10])
              }
              if (tx.data.startsWith(symbolSigHash)) {
                return ERC20__factory.createInterface().encodeFunctionResult('symbol', ['TST'])
              }
            }
          },
          _isProvider: true,
          resolveName: (name: string) => name,
        } as any),
    )

    const mockContract = { getTokenAllowance: getTokenAllowanceMock } as unknown as AllowanceModule

    const result = await getTokenAllowanceForDelegate(mockContract, ZERO_ADDRESS, '0x1', '0x10', [])

    expect(result.token.address).toBe('0x10')
    expect(result.token.decimals).toBe(10)
    expect(result.token.symbol).toBe('TST')
    expect(result.token.logoUri).toBe(undefined)
  })
})