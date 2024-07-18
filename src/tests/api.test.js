const axios = require('axios');
const { getFailSafeWalletAddress } = require('../services/api');

jest.mock('axios');

describe('getFailSafeWalletAddress', () => {
  const walletAddress = '0xYourWalletAddress';
  const chainId = 1; // Example for Ethereum mainnet
  const accessToken = 'your_access_token_here';
  const baseURL = 'https://api.getfailsafe.com/v1.0';

  it('should fetch the FailSafe Wallet Address successfully', async () => {
    const responseData = { data: '0xFailSafeWalletAddress' };
    axios.mockResolvedValue({ data: responseData });

    const result = await getFailSafeWalletAddress(walletAddress, chainId, accessToken);

    expect(result).toEqual(responseData);
    expect(axios).toHaveBeenCalledWith({
      method: 'get',
      url: `${baseURL}/failsafe/wallet-address`,
      params: { wallet_address: walletAddress, chainId: chainId },
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
  });

  it('should throw an error if the API call fails', async () => {
    const errorMessage = 'Network Error';
    axios.mockRejectedValue(new Error(errorMessage));

    await expect(getFailSafeWalletAddress(walletAddress, chainId, accessToken)).rejects.toThrow(errorMessage);
    expect(axios).toHaveBeenCalledWith({
      method: 'get',
      url: `${baseURL}/failsafe/wallet-address`,
      params: { wallet_address: walletAddress, chainId: chainId },
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
  });
});
