/**
 * Utility functions for transforming object keys
 */

/**
 * Converts a string from snake_case to camelCase
 * @param str - The string to convert
 * @returns The converted camelCase string
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Recursively transforms all object keys from snake_case to camelCase
 * Preserves data types and handles nested objects/arrays
 * @param obj - The object to transform
 * @returns The transformed object with camelCase keys
 */
export function transformKeysToCamelCase(obj: any): any {
  // Return primitive values as-is
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(transformKeysToCamelCase);
  }

  // Handle objects
  const transformed: any = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = snakeToCamel(key);
      transformed[camelKey] = transformKeysToCamelCase(obj[key]);
    }
  }

  return transformed;
}
