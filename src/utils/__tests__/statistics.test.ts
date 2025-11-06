import { calculateStatistics } from '../statistics';
import { Statistics } from '../../types';

describe('calculateStatistics', () => {
	describe('Edge Cases', () => {
		test('should return zeros for empty array', () => {
			const result = calculateStatistics([]);

			expect(result).toEqual({
				Median: 0,
				Mean: 0,
				NinetyFifthPercentile: 0,
				NinetyNinthPercentile: 0
			});
		});

		test('should handle single value', () => {
			const result = calculateStatistics([42]);

			expect(result).toEqual({
				Median: 42,
				Mean: 42,
				NinetyFifthPercentile: 42,
				NinetyNinthPercentile: 42
			});
		});

		test('should handle two values', () => {
			const result = calculateStatistics([10, 20]);

			expect(result.Median).toBe(15); // Average of 10 and 20
			expect(result.Mean).toBe(15);
			expect(result.NinetyFifthPercentile).toBe(19.5); // 95% between 10 and 20
			expect(result.NinetyNinthPercentile).toBeCloseTo(19.9, 1); // 99% between 10 and 20
		});

		test('should handle negative numbers', () => {
			const result = calculateStatistics([-10, -5, 0, 5, 10]);

			expect(result.Median).toBe(0);
			expect(result.Mean).toBe(0);
		});

		test('should handle floating point numbers', () => {
			const result = calculateStatistics([1.5, 2.7, 3.3, 4.1]);

			expect(result.Mean).toBeCloseTo(2.9, 1);
			expect(result.Median).toBe(3.0); // Average of 2.7 and 3.3
		});

		test('should handle very large numbers', () => {
			const result = calculateStatistics([1e6, 2e6, 3e6, 4e6, 5e6]);

			expect(result.Mean).toBe(3e6);
			expect(result.Median).toBe(3e6);
		});

		test('should handle zero values', () => {
			const result = calculateStatistics([0, 0, 0, 0]);

			expect(result).toEqual({
				Median: 0,
				Mean: 0,
				NinetyFifthPercentile: 0,
				NinetyNinthPercentile: 0
			});
		});
	});

	describe('Mean Calculation', () => {
		test('should calculate mean for odd-length array', () => {
			const result = calculateStatistics([1, 2, 3, 4, 5]);

			expect(result.Mean).toBe(3);
		});

		test('should calculate mean for even-length array', () => {
			const result = calculateStatistics([2, 4, 6, 8]);

			expect(result.Mean).toBe(5);
		});

		test('should calculate mean with mixed positive and negative', () => {
			const result = calculateStatistics([-10, -5, 5, 10]);

			expect(result.Mean).toBe(0);
		});

		test('should calculate mean with decimals', () => {
			const result = calculateStatistics([1.1, 2.2, 3.3]);

			expect(result.Mean).toBeCloseTo(2.2, 1);
		});
	});

	describe('Median Calculation', () => {
		test('should calculate median for odd-length sorted array', () => {
			const result = calculateStatistics([1, 2, 3, 4, 5]);

			expect(result.Median).toBe(3);
		});

		test('should calculate median for even-length sorted array', () => {
			const result = calculateStatistics([1, 2, 3, 4]);

			expect(result.Median).toBe(2.5); // Average of 2 and 3
		});

		test('should calculate median for unsorted array', () => {
			const result = calculateStatistics([5, 1, 4, 2, 3]);

			expect(result.Median).toBe(3);
		});

		test('should calculate median with duplicates', () => {
			const result = calculateStatistics([1, 2, 2, 2, 3]);

			expect(result.Median).toBe(2);
		});

		test('should calculate median for large unsorted array', () => {
			const result = calculateStatistics([100, 50, 75, 25, 90, 10, 60]);

			expect(result.Median).toBe(60); // Middle of sorted: [10, 25, 50, 60, 75, 90, 100]
		});
	});

	describe('95th Percentile Calculation', () => {
		test('should calculate p95 for small array', () => {
			const result = calculateStatistics([1, 2, 3, 4, 5]);

			// p95 with 5 elements: index = 0.95 * (5-1) = 3.8
			// Interpolate between index 3 (value=4) and index 4 (value=5)
			// 4 * 0.2 + 5 * 0.8 = 4.8
			expect(result.NinetyFifthPercentile).toBe(4.8);
		});

		test('should calculate p95 for array of 100 values', () => {
			const values = Array.from({ length: 100 }, (_, i) => i + 1);
			const result = calculateStatistics(values);

			// p95 of 1-100: should be around 95
			expect(result.NinetyFifthPercentile).toBeCloseTo(95.05, 1);
		});

		test('should calculate p95 for array with outliers', () => {
			const result = calculateStatistics([1, 2, 3, 4, 5, 100, 200, 300]);

			// p95 should capture the high outliers
			expect(result.NinetyFifthPercentile).toBeGreaterThan(100);
		});

		test('should calculate p95 for uniform values', () => {
			const result = calculateStatistics([10, 10, 10, 10, 10]);

			expect(result.NinetyFifthPercentile).toBe(10);
		});
	});

	describe('99th Percentile Calculation', () => {
		test('should calculate p99 for small array', () => {
			const result = calculateStatistics([1, 2, 3, 4, 5]);

			// p99 with 5 elements: index = 0.99 * (5-1) = 3.96
			// Interpolate between index 3 (value=4) and index 4 (value=5)
			// 4 * 0.04 + 5 * 0.96 = 4.96
			expect(result.NinetyNinthPercentile).toBe(4.96);
		});

		test('should calculate p99 for array of 100 values', () => {
			const values = Array.from({ length: 100 }, (_, i) => i + 1);
			const result = calculateStatistics(values);

			// p99 of 1-100: should be around 99
			expect(result.NinetyNinthPercentile).toBeCloseTo(99.01, 1);
		});

		test('should calculate p99 higher than p95', () => {
			const values = Array.from({ length: 100 }, (_, i) => i + 1);
			const result = calculateStatistics(values);

			expect(result.NinetyNinthPercentile).toBeGreaterThan(result.NinetyFifthPercentile);
		});

		test('should handle p99 with outliers', () => {
			const values = [...Array(99).fill(1), 1000];
			const result = calculateStatistics(values);

			// p99 with 100 elements: index = 0.99 * 99 = 98.01
			// This is close to index 98, which is still value=1
			// Only value at index 99 is 1000, so p99 will be close to 1
			expect(result.NinetyNinthPercentile).toBeGreaterThan(1);
			expect(result.NinetyNinthPercentile).toBeLessThan(100);
		});
	});

	describe('Real-World CDN Scenarios', () => {
		test('should handle typical response times (ms)', () => {
			// Simulating CDN response times: mostly fast, some slow
			const responseTimes = [
				10, 15, 20, 25, 30, // Fast responses
				50, 75, 100, // Medium responses
				200, 500, 1000 // Slow responses
			];

			const result = calculateStatistics(responseTimes);

			expect(result.Mean).toBeCloseTo(184.09, 1);
			expect(result.Median).toBe(50); // Middle value of 11 sorted elements
			expect(result.NinetyFifthPercentile).toBeGreaterThan(500);
			expect(result.NinetyNinthPercentile).toBeGreaterThan(900);
		});

		test('should handle byte amounts', () => {
			// Simulating various response sizes
			const bytes = [
				1024, 2048, 4096, // Small files (1-4 KB)
				10240, 20480, // Medium files (10-20 KB)
				102400, 1048576 // Large files (100 KB, 1 MB)
			];

			const result = calculateStatistics(bytes);

			expect(result.Mean).toBeGreaterThan(50000);
			expect(result.Median).toBe(10240); // Middle value of sorted 7-element array
		});

		test('should handle bot scores (0-100)', () => {
			const botScores = [1, 5, 10, 15, 20, 25, 30, 35, 40, 99];

			const result = calculateStatistics(botScores);

			expect(result.Median).toBe(22.5);
			expect(result.Mean).toBe(28);
			expect(result.NinetyFifthPercentile).toBeGreaterThan(70);
		});

		test('should handle threat scores', () => {
			// Most traffic should be low threat
			const threatScores = [0, 0, 0, 0, 5, 10, 15, 20, 50, 100];

			const result = calculateStatistics(threatScores);

			expect(result.Median).toBe(7.5);
			expect(result.NinetyNinthPercentile).toBeGreaterThan(90);
		});

		test('should handle large dataset of origin response times', () => {
			// Simulate 1000 requests with realistic distribution
			const responseTimes = [
				...Array(700).fill(20), // 70% fast (20ms)
				...Array(200).fill(100), // 20% medium (100ms)
				...Array(80).fill(500), // 8% slow (500ms)
				...Array(20).fill(2000) // 2% very slow (2000ms)
			];

			const result = calculateStatistics(responseTimes);

			expect(result.Mean).toBeCloseTo(114, 1);
			expect(result.Median).toBe(20);
			expect(result.NinetyFifthPercentile).toBeGreaterThanOrEqual(500);
			expect(result.NinetyNinthPercentile).toBeGreaterThanOrEqual(2000);
		});
	});

	describe('Statistical Properties', () => {
		test('median should always be less than or equal to mean for right-skewed distribution', () => {
			// Right-skewed: most values low, few high outliers
			const values = [1, 2, 3, 4, 5, 100];
			const result = calculateStatistics(values);

			expect(result.Median).toBeLessThan(result.Mean);
		});

		test('all metrics should be equal for uniform distribution', () => {
			const values = Array(10).fill(50);
			const result = calculateStatistics(values);

			expect(result.Median).toBe(50);
			expect(result.Mean).toBe(50);
			expect(result.NinetyFifthPercentile).toBe(50);
			expect(result.NinetyNinthPercentile).toBe(50);
		});

		test('percentiles should be in ascending order: median <= p95 <= p99', () => {
			const values = Array.from({ length: 100 }, (_, i) => i);
			const result = calculateStatistics(values);

			expect(result.Median).toBeLessThanOrEqual(result.NinetyFifthPercentile);
			expect(result.NinetyFifthPercentile).toBeLessThanOrEqual(result.NinetyNinthPercentile);
		});

		test('should not mutate input array', () => {
			const values = [5, 1, 4, 2, 3];
			const original = [...values];

			calculateStatistics(values);

			expect(values).toEqual(original);
		});
	});

	describe('Type Compliance', () => {
		test('should return Statistics type structure', () => {
			const result = calculateStatistics([1, 2, 3]);

			expect(result).toHaveProperty('Median');
			expect(result).toHaveProperty('Mean');
			expect(result).toHaveProperty('NinetyFifthPercentile');
			expect(result).toHaveProperty('NinetyNinthPercentile');

			expect(typeof result.Median).toBe('number');
			expect(typeof result.Mean).toBe('number');
			expect(typeof result.NinetyFifthPercentile).toBe('number');
			expect(typeof result.NinetyNinthPercentile).toBe('number');
		});

		test('should match Statistics interface', () => {
			const result: Statistics = calculateStatistics([1, 2, 3]);

			// TypeScript will catch any type mismatches at compile time
			expect(result).toBeDefined();
		});
	});

	describe('Performance Edge Cases', () => {
		test('should handle large array efficiently', () => {
			const largeArray = Array.from({ length: 10000 }, (_, i) => Math.random() * 1000);

			const start = Date.now();
			const result = calculateStatistics(largeArray);
			const duration = Date.now() - start;

			expect(result).toBeDefined();
			expect(duration).toBeLessThan(100); // Should complete in under 100ms
		});

		test('should handle array with many duplicates', () => {
			const duplicates = [
				...Array(1000).fill(1),
				...Array(1000).fill(2),
				...Array(1000).fill(3)
			];

			const result = calculateStatistics(duplicates);

			expect(result.Median).toBe(2);
			expect(result.Mean).toBe(2);
		});
	});
});
