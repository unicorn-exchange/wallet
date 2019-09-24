type ABIDataTypes = "tuple" | "uint256" | "boolean" | "string" | "bytes" | string;

export interface AbiIO {
  name: string;
  type: ABIDataTypes;
  indexed?: boolean;
  components?: AbiIO[];
}

export interface ABIDefinition {
  constant?: boolean;
  payable?: boolean;
  stateMutability?: "view" | "pure" | "nonpayable";
  anonymous?: boolean;
  inputs?: AbiIO[];
  name?: string;
  outputs?: AbiIO[];
  type: "function" | "constructor" | "event" | "fallback";
  signature?: string;
}
