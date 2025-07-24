/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

export interface BatchProcessorOptions {
    batchSize?: number;
    delay?: number;
    onProgress?: (completed: number, total: number) => void;
}

export interface BatchProcessorResult {
    success: number;
    failed: number;
}

/**
 * Process an array of items in batches to avoid blocking the main thread
 * @param items Array of items to process
 * @param processor Function that processes each item and returns a Promise<boolean>
 * @param options Configuration options for batch processing
 * @returns Promise with success and failure counts
 */
export async function processBatch<T>(
    items: T[],
    processor: (item: T) => Promise<boolean>,
    options: BatchProcessorOptions = {}
): Promise<BatchProcessorResult> {
    const { batchSize = 10, delay = 100, onProgress } = options;
    let success = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        
        // Process current batch
        const results = await Promise.all(
            batch.map(async (item) => {
                try {
                    const result = await processor(item);
                    return result;
                } catch {
                    return false;
                }
            })
        );

        // Count results
        success += results.filter(r => r).length;
        failed += results.filter(r => !r).length;

        // Call progress callback if provided
        onProgress?.(success + failed, items.length);

        // Add delay between batches (except for the last batch)
        if (i + batchSize < items.length) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    return { success, failed };
}

/**
 * Process items in batches asynchronously without blocking the main thread
 * Sends immediate response to user and processes in background
 * @param items Array of items to process
 * @param processor Function that processes each item
 * @param options Configuration options
 * @param onComplete Callback when processing is complete
 */
export function processBatchAsync<T>(
    items: T[],
    processor: (item: T) => Promise<boolean>,
    options: BatchProcessorOptions = {},
    onComplete?: (result: BatchProcessorResult) => void
): void {
    setImmediate(async () => {
        const result = await processBatch(items, processor, options);
        onComplete?.(result);
    });
}