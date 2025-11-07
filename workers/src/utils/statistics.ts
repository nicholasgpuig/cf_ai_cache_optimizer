// Statistical calculation utilities

import { Statistics } from '../types';

/**
 * Calculate statistical metrics from an array of numbers
 * @param values Array of numeric values
 * @returns Statistics object with median, mean, p95, p99
 */
export function calculateStatistics(values: number[]): Statistics {
	if (values.length === 0) {
		return {
			Median: 0,
			Mean: 0,
			NinetyFifthPercentile: 0,
			NinetyNinthPercentile: 0
		};
	}

	// Sort values for percentile calculations
	const sorted = [...values].sort((a, b) => a - b);

	// Calculate mean
	const sum = values.reduce((acc, val) => acc + val, 0);
	const mean = sum / values.length;

	// Calculate median (50th percentile)
	const median = percentile(sorted, 0.5);

	// Calculate 95th percentile
	const p95 = percentile(sorted, 0.95);

	// Calculate 99th percentile
	const p99 = percentile(sorted, 0.99);

	return {
		Median: median,
		Mean: mean,
		NinetyFifthPercentile: p95,
		NinetyNinthPercentile: p99
	};
}

/**
 * Calculate a specific percentile from sorted array
 * @param sortedValues Sorted array of numbers
 * @param p Percentile as decimal (0.5 = 50th percentile)
 * @returns The value at the given percentile
 */
function percentile(sortedValues: number[], p: number): number {
	if (sortedValues.length === 0) return 0;
	if (sortedValues.length === 1) return sortedValues[0];

	const index = p * (sortedValues.length - 1);
	const lower = Math.floor(index);
	const upper = Math.ceil(index);
	const weight = index - lower;

	if (lower === upper) {
		return sortedValues[lower];
	}

	return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}
