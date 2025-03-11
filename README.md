# rollup-plugin-checksum

Rollup plugin that emits a file containing the checksum of all emitted chunks and assets.

## Installation

```
npm install rollup-plugin-checksum --save-dev
```

or

```
yarn add rollup-plugin-checksum --dev
```

## Usage

The plugin must be added as last plugin.

```javascript
// rollup.config.js
import checksum from 'rollup-plugin-checksum';

export default {
	input: './index.js',
	plugins: [
		// other plugins
		checksum(/* options */)
	]
}
```

## Testing and Verification

For the SRI hash functionality, this plugin includes a verification script that compares the generated hashes with those produced by OpenSSL and Node.js crypto, ensuring correctness:

```bash
# Run the SRI verification
npm run verify:sri
```

This script:
1. Generates SRI hashes using the plugin
2. Calculates the same hashes using OpenSSL (using `openssl dgst -sha384 -binary | openssl base64 -A`)
3. Calculates the hashes using Node.js crypto module
4. Compares all methods to ensure they produce identical results

The verification runs automatically on each commit in the CI pipeline to ensure the SRI hash implementation remains correct.

## Options

* `filename`: `"filename"`

  Name of the emitted file that contains the checksum

* `includeAssets`: `true`

  Whether or not to include assets when calculating the checksum

* `sri`: `undefined` (default) or `"sha256"`, `"sha384"`, or `"sha512"`

  When set to a valid hash algorithm (`"sha256"`, `"sha384"`, or `"sha512"`), the plugin will generate a Subresource Integrity (SRI) hash for a chunk instead of a single MD5 checksum. The SRI hash is calculated using only the chunk code (content), not the filename, and assets are never included in SRI hash calculation.
  
  **Important**: When using SRI mode, the plugin requires exactly one chunk in the bundle. If there are multiple chunks, the plugin will throw an error. Configure your Rollup output to produce a single chunk when using this option.
  
  When using SRI mode, the output file will be named `<filename>.sri` and will contain a single SRI hash in the format: `algorithm-base64Hash`.

  Example:
  ```javascript
  checksum({ sri: "sha384" })
  ```

  This will generate a file with content like:
  ```
  sha384-AbCdEfGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGhIjKlMnOpQrStUvWxYz123
  ```
  
  This hash can be used in HTML `integrity` attributes for scripts and stylesheets.