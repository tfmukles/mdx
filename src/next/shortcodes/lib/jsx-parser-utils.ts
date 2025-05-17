import { codes } from "micromark-util-symbol/codes";
import { values } from "micromark-util-symbol/values";

/**
 * Finds the key in the `values` object that matches the provided string value.
 * @param symbol - The string value to look up.
 * @returns The key corresponding to the value, or null if not found.
 */
const getValueKey = (symbol: string): string | null => {
  for (const [symbolKey, symbolValue] of Object.entries(values)) {
    if (symbolValue === symbol) {
      return symbolKey;
    }
  }
  return null;
};

/**
 * Finds the code (number) in the `codes` object that corresponds to the given string value.
 * @param symbol - The string value to look up.
 * @returns The code as a number, or null if not found.
 */
export const findCode = (symbol: string | undefined | null): number | null => {
  if (!symbol) {
    return null;
  }
  const symbolKey = getValueKey(symbol);
  if (symbolKey && Object.prototype.hasOwnProperty.call(codes, symbolKey)) {
    return codes[symbolKey as keyof typeof codes];
  }
  return null;
};

/**
 * Prints the key name in `codes` that matches the provided code number.
 * @param codeValue - The code number to look up.
 */
export const printCodeKey = (codeValue: number): void => {
  for (const [codeKey, codeNum] of Object.entries(codes)) {
    if (codeNum === codeValue) {
      console.log(codeKey);
      return;
    }
  }
  console.log(null);
};

/**
 * Logs the events of a given item, showing event type and serialized slice.
 * @param node - The object containing events and a sliceSerialize method.
 */
export const logNodeEvents = (node: any): void => {
  console.log(
    node.events.map((event: any) => {
      return `${event[0]} - ${event[1].type} | ${node.sliceSerialize(
        event[1]
      )}`;
    })
  );
};
