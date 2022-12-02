import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { assert, expect } from "chai";
import { ethers } from "hardhat";

const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");

describe("PayRoll", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployPayRollFixture() {

    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    const initialSalaryAmount = ONE_GWEI;
    const payDayTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [owner,otherAccount, address1, address2, address3, address4, address5, address6, address7, address8, ] = await ethers.getSigners();
    
    //deploying erc20 contract
    const Token = await ethers.getContractFactory("MaticToken");
    const token = await Token.deploy("MATIC", "MT");

    const PayRoll = await ethers.getContractFactory("PayRoll");
    const payroll = await PayRoll.deploy(token.address, initialSalaryAmount);

     // merkle tree for staff addresses

   let staffAddresses = [address1.address, address2.address, address3.address, address4.address, address5.address, address6.address, address7.address, address8.address]
   const encodeLeaf = staffAddresses.map(addr => keccak256(addr));
   const merkleTree = new MerkleTree(encodeLeaf, keccak256, {sortPairs: true});

   const rootHash = merkleTree.getHexRoot();

    return { payroll,token, initialSalaryAmount,rootHash,merkleTree, owner, address1, otherAccount, payDayTime };
  }

  describe("Deployment", function () {
    it("Should deploy the payroll contract right", async function () {
        const { payroll } = await loadFixture(deployPayRollFixture);
        assert.ok(payroll.address);
    });

    it("Should set the right owner", async function () {
      const { payroll, owner } = await loadFixture(deployPayRollFixture);

      expect(await payroll.owner()).to.equal(owner.address);
    });

    it("Should receive and store the initial salary funds", async function () {
      const { payroll, initialSalaryAmount,token } = await loadFixture(
        deployPayRollFixture
      );

      expect(await payroll.totalSalaryFunds()).to.equal(
        initialSalaryAmount
      );
    });

    // it("Should fail if the unlockTime is not in the future", async function () {
    //   // We don't use the fixture here because we want a different deployment
    //   const latestTime = await time.latest();
    //   const Lock = await ethers.getContractFactory("Lock");
    //   await expect(Lock.deploy(latestTime, { value: 1 })).to.be.revertedWith(
    //     "Unlock time should be in the future"
    //   );
    // });
  });

  describe("Withdrawals", function () {
    describe("Validations", function () {
      it("Should deposited funds is equal to the contract balance", async function () {
        const { payroll,token, merkleTree,rootHash,address1,owner,payDayTime } = await loadFixture(deployPayRollFixture);

        await token.mint(address1.address, ethers.utils.parseEther("200000"));
        const staffSalary = ethers.utils.parseEther("20");
        const amount = ethers.utils.parseEther("200");
        const leaf = keccak256(address1.address);
        const proof = merkleTree.getHexProof(leaf);

        await payroll.connect(owner).setPaymentDeatils(rootHash,staffSalary,payDayTime);

        await token
       .connect(address1)
       .approve(payroll.address, amount);
  
       const depositFunds = await payroll.connect(address1).depositSalaryFunds(amount);
  
       const addressBalance = await token.balanceOf(address1.address);
       
       const contractBalance = await token.balanceOf(payroll.address);
      
  
       expect(contractBalance).to.equal(amount);

        
      });
      it("Should be able to claim salary by staff", async function () {
        const { payroll,token, merkleTree,rootHash,address1,owner,payDayTime } = await loadFixture(deployPayRollFixture);

        await token.mint(owner.address, ethers.utils.parseEther("200000"));
        const staffSalary = ethers.utils.parseEther("20");
        const amount = ethers.utils.parseEther("200");
        const leaf = keccak256(address1.address);
        const proof = merkleTree.getHexProof(leaf);

        await payroll.connect(owner).setPaymentDeatils(rootHash,staffSalary,payDayTime);

        await token
       .connect(owner)
       .approve(payroll.address, amount);
  
      await payroll.connect(owner).depositSalaryFunds(amount);

       const claimToken = await payroll.connect(address1).claimSalary(
        proof
      );
      const staff = await payroll.isStaff(address1.address);

      expect(staff.claimed).to.equal(true);

        
      });

    
    });

   
  });
});
