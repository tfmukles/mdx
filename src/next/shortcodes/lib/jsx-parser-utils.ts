import { codes } from "micromark-util-symbol/codes";
import { values } from "micromark-util-symbol/values";

/**
 * Finds the key in the `values` object that matches the provided string value.
 * @param value - The string value to look up.
 * @returns The key corresponding to the value, or null if not found.
 */
const getValueKey = (value: string): string | null => {
  for (const [key, val] of Object.entries(values)) {
    if (val === value) {
      return key;
    }
  }
  return null;
};

/**
 * Finds the code (number) in the `codes` object that corresponds to the given string value.
 * @param value - The string value to look up.
 * @returns The code as a number, or null if not found.
 */
export const findCode = (value: string | undefined | null): number | null => {
  if (!value) {
    return null;
  }
  const key = getValueKey(value);
  if (key && Object.prototype.hasOwnProperty.call(codes, key)) {
    return codes[key as keyof typeof codes];
  }
  return null;
};

/**
 * Prints the key name in `codes` that matches the provided code number.
 * @param code - The code number to look up.
 */
export const printCode = (code: number): void => {
  for (const [key, val] of Object.entries(codes)) {
    if (val === code) {
      console.log(key);
      return;
    }
  }
  console.log(null);
};

/**
 * Logs the events of a given item, showing event type and serialized slice.
 * @param item - The object containing events and a sliceSerialize method.
 */
export const logSelf = (item: any): void => {
  console.log(
    item.events.map((event: any) => {
      return `${event[0]} - ${event[1].type} | ${item.sliceSerialize(
        event[1]
      )}`;
    })
  );
};
