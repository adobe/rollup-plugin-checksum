import crypto from "crypto";
import type { OutputAsset, OutputChunk, Plugin } from "rollup";

type ChecksumOptions = {
  filename?: string;
  includeAssets?: boolean;
  sri?: string;
};

// Valid SRI hash algorithms
const VALID_SRI_ALGORITHMS = ["sha256", "sha384", "sha512"];

export default function checksum(options: ChecksumOptions = {}): Plugin {
  const {
    filename = "checksum",
    includeAssets = true,
    sri = undefined
  } = options;

  // Validate SRI algorithm if provided
  if (sri !== undefined && !VALID_SRI_ALGORITHMS.includes(sri)) {
    throw new Error(`Invalid SRI algorithm: ${sri}. Valid values are: ${VALID_SRI_ALGORITHMS.join(", ")}`);
  }

  // Track if we've processed a chunk for SRI already
  let sriProcessed = false;

  return {
    name: "checksum",
    generateBundle: function (_options, bundle, isWrite) {
      if (!isWrite) {
        return;
      }

      if (sri) {
        // Find all chunks in the bundle
        const chunks = Object.values(bundle).filter(
          (assetOrChunk): assetOrChunk is OutputChunk =>
            assetOrChunk.type === "chunk"
        );

        // For SRI, we require exactly one chunk
        if (chunks.length === 0) {
          this.error("No chunks found in the bundle. SRI hash generation requires exactly one chunk.");
          return;
        }

        // When using multiple outputs with rollup, generateBundle can be called multiple times
        // Each time with different chunks. We'll process only the first valid chunk found.
        if (sriProcessed) {
          this.error("Multiple chunks detected across outputs. SRI hash generation requires exactly one chunk total. " +
            "Please configure Rollup to output a single chunk or use a different plugin for multi-chunk SRI calculation.");
          return;
        }

        if (chunks.length > 1) {
          this.error(`Found ${chunks.length} chunks in the bundle. SRI hash generation requires exactly one chunk. ` +
            `Please configure Rollup to output a single chunk or use a different plugin for multi-chunk SRI calculation.`);
          return;
        }

        // Generate SRI hash for the single chunk
        const chunk = chunks[0];
        const hash = crypto.createHash(sri);
        hash.update(chunk.code);
        const digest = hash.digest("base64");
        const sriHash = `${sri}-${digest}`;

        // Mark that we've processed a chunk for SRI
        sriProcessed = true;

        this.emitFile({
          type: "asset",
          name: filename,
          fileName: sri ? `${filename}.sri` : filename,
          source: sriHash,
        });
      } else {
      // Generate MD5 hash (original behavior)
        const hash = crypto.createHash("md5");

        if (includeAssets) {
          Object.values(bundle)
            .filter(
              (assetOrChunk): assetOrChunk is OutputAsset =>
                assetOrChunk.type === "asset"
            )
            .forEach((asset) => {
              hash.update(asset.fileName);
              hash.update(asset.source);
            });
        }

        Object.values(bundle)
          .filter(
            (assetOrChunk): assetOrChunk is OutputChunk =>
              assetOrChunk.type === "chunk"
          )
          .forEach((chunk) => {
            hash.update(chunk.fileName);
            hash.update(chunk.code);
          });

        this.emitFile({
          type: "asset",
          name: filename,
          fileName: filename,
          source: hash.digest("hex"),
        });
      }
    },
  };
}
