# CodeMint Contract

ERC-721 contract for storing code on Ritual blockchain. Each mint creates an NFT with the code stored on-chain.

## Contract Details

- **Name**: Ritual Code
- **Symbol**: RCODE
- **Chain**: Ritual Testnet (1979)
- **RPC**: `https://rpc.ritualfoundation.org`

## Compile

```bash
npx solc@0.8.24 contracts/CodeMint.sol --bin --abi --optimize --base-path . -o out/
```

Or install solc:
```bash
npm install -g solc@0.8.24
solc contracts/CodeMint.sol --bin --abi --optimize --base-path . -o out/
```

## Deploy

1. Set your private key:
   ```powershell
   $env:PRIVATE_KEY="0x..."
   ```

2. Paste the compiled bytecode into `scripts/deploy-mint.ts` (replace the `BYTECODE` placeholder)

3. Run:
   ```bash
   npx tsx scripts/deploy-mint.ts
   ```

4. Update `CODE_MINT_ADDRESS` in `components/chat/code-mint.tsx` with the deployed address

## Functions

| Function | Description |
|----------|-------------|
| `mintCode(string)` | Store code on-chain, mints ERC-721 token |
| `getCode(uint256)` | Retrieve code entry by token ID |
| `getUserCodes(address)` | Get all token IDs owned by address |
| `totalCodes()` | Total codes minted |
