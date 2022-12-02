import { ethers } from "hardhat";

async function main() {
 
  const initialSalaryAmount = ethers.utils.parseEther("200000")

  const Token = await ethers.getContractFactory("MaticToken");
  const token = await Token.deploy("MaticB","MTB");

  const PayRoll = await ethers.getContractFactory("PayRoll");
  const payroll = await PayRoll.deploy(token.address, initialSalaryAmount);

  await payroll.deployed();

  console.log(`PayRoll with initial deposite of ${initialSalaryAmount} deployed to ${payroll.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
