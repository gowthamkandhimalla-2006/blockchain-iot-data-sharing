import { network } from "hardhat";

const { viem } = await network.connect();

console.log("Deploying IoTDataSharing contract...");

const contract = await viem.deployContract("IoTDataSharing");

console.log("IoTDataSharing deployed successfully!");
console.log("Contract address:", contract.address);