/**
 * Zolto Chart Statistical & Transformation Utilities — Phase 6
 *
 * Provides data processing algorithms: min, max, mean, median, standard deviation,
 * rolling average, sorting, filtering, aggregations, and normalization.
 */

export function computeMin(arr) {
  const nums = arr.filter(n => typeof n === 'number' && !isNaN(n));
  if (!nums.length) return 0;
  return Math.min(...nums);
}

export function computeMax(arr) {
  const nums = arr.filter(n => typeof n === 'number' && !isNaN(n));
  if (!nums.length) return 0;
  return Math.max(...nums);
}

export function computeMean(arr) {
  const nums = arr.filter(n => typeof n === 'number' && !isNaN(n));
  if (!nums.length) return 0;
  const sum = nums.reduce((acc, val) => acc + val, 0);
  return sum / nums.length;
}

export function computeMedian(arr) {
  const nums = arr.filter(n => typeof n === 'number' && !isNaN(n)).sort((a, b) => a - b);
  if (!nums.length) return 0;
  const mid = Math.floor(nums.length / 2);
  if (nums.length % 2 === 0) {
    return (nums[mid - 1] + nums[mid]) / 2;
  }
  return nums[mid];
}

export function computeStdev(arr) {
  const nums = arr.filter(n => typeof n === 'number' && !isNaN(n));
  if (nums.length <= 1) return 0;
  const mean = computeMean(nums);
  const variance = nums.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

export function computeRollingAverage(arr, windowSize = 3) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const subset = arr.slice(start, i + 1);
    result.push(Number(computeMean(subset).toFixed(2)));
  }
  return result;
}

export function normalizeData(arr, targetMin = 0, targetMax = 1) {
  const minVal = computeMin(arr);
  const maxVal = computeMax(arr);
  const range = maxVal - minVal;
  if (range === 0) return arr.map(() => targetMin);
  return arr.map(val => Number((targetMin + ((val - minVal) / range) * (targetMax - targetMin)).toFixed(4)));
}

export function sortData(arr, order = 'ascending') {
  const copy = [...arr];
  return copy.sort((a, b) => order === 'descending' ? b - a : a - b);
}

export function aggregateData(arr, mode = 'sum') {
  const nums = arr.filter(n => typeof n === 'number' && !isNaN(n));
  if (!nums.length) return 0;
  switch (mode.toLowerCase()) {
    case 'sum': return nums.reduce((a, b) => a + b, 0);
    case 'mean':
    case 'avg': return computeMean(nums);
    case 'min': return computeMin(nums);
    case 'max': return computeMax(nums);
    case 'median': return computeMedian(nums);
    case 'count': return nums.length;
    default: return nums.reduce((a, b) => a + b, 0);
  }
}

export function computeStatsSummary(arr) {
  return {
    min: computeMin(arr),
    max: computeMax(arr),
    mean: Number(computeMean(arr).toFixed(2)),
    median: computeMedian(arr),
    stdev: Number(computeStdev(arr).toFixed(2)),
    count: arr.length,
  };
}
