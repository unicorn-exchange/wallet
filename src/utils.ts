import Web3 from "web3";

export const initProvider = (network: string) => {
  const url =
    network === "testnet"
      ? "https://rinkeby.infura.io/JCnK5ifEPH9qcQkX0Ahl"
      : "https://mainnet.infura.io/5lcMmHUURYg8F20GLGSr";

  return new Web3(new Web3.providers.HttpProvider(url));
};

const LOG_EVENTS = true;

export const log = (...props: any) => {
  if (LOG_EVENTS) {
    return;
  }

  // if (typeof props === 'object') {
  //   return console.log('👉', `[${moment().format('hh:mm:ss')}]`, JSON.parse(JSON.stringify(props)))
  // }

  return console.log("👉", `[${Date.now()}]`, ...props);
};

export const logGroup = (...props: any) => LOG_EVENTS && console.group("🔥", ...props);
export const closeGroup = () => console.groupEnd();
