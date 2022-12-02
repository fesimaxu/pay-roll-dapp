// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract PayRoll is Ownable {

    // ===========================
    // EVENTS
    // ===========================

     event TokenClaimed(address StaffAddress, uint256 AmountPaid);

    // ===========================
    // CUSTOM ERROR
    // ===========================

    error amountEqualZero();
    error transferFailed();

    // ===========================
    // STATE VARIABLE
    // ===========================

    bytes32 private merkleRoot;
    uint256 public totalSalaryFunds;
    uint256 public actualStaffSalary;
    uint256 public payDayTime;
    address public  admin;
    ERC20 public MATIC;

   

      struct StaffDetails {
        uint256 salary;
        bool claimed;
        uint40 timeOfLastPayment;
    }

  mapping (address => bool ) public isBlackListed;
  mapping (address => StaffDetails) public isStaff;

   // @param _maticContractAddress is the MATIC Token Contract Address
   // @param initalSalaryFunds is the inital Fund to pay salary deposited into the conntract my the company admin
    constructor(address _maticContractAddress, uint256 initalSalaryFunds) {

        admin = msg.sender;
        MATIC = ERC20(_maticContractAddress);
        totalSalaryFunds = initalSalaryFunds;
    }

    // @notic this function can only called by the admin to set the salary and address of company staffs
    function setPaymentDeatils(bytes32 _merkleroot, uint256 staffSalary, uint40 _payDayTime) public onlyOwner{

        merkleRoot = _merkleroot;
        actualStaffSalary = staffSalary;
        payDayTime = _payDayTime;

    }

    // @notice this function deposite can only be called by the admin to make it unique to deposite Matic Token on the contract
     function depositSalaryFunds(uint256 amount) public payable  {
        require(msg.sender != address(0x0), "Invalid Address");
        require(
            ERC20(MATIC).balanceOf(msg.sender) > 0,
            "Insufficient matic balance"
        );

        if(amount == 0) revert amountEqualZero();

       bool success = ERC20(MATIC).transferFrom(
            msg.sender,
            address(this),
            amount
        );

        if(!success) revert transferFailed();

        totalSalaryFunds += amount;
    }
    
    // @notice this function is used to check the balance of the contract
    function balanceOfSalaryFunds() public view returns(uint256 contractBalance){
        return ERC20(MATIC).balanceOf(address(this));
    }



   
    // @notice this function is used by the company staffs to claim their salary at the end of the month
    function claimSalary(bytes32[] calldata _merkleProof) public {

          StaffDetails storage sd = isStaff[msg.sender];

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        if (MerkleProof.verify(_merkleProof, merkleRoot, leaf)) {

            //assert(checkIfPaid(msg.sender));

            if (sd.timeOfLastPayment < payDayTime) {

            uint256 currentBalance = ERC20(MATIC).balanceOf(address(this));
            

            bool success = ERC20(MATIC).transfer(msg.sender,actualStaffSalary);
             if(!success) revert transferFailed();

            currentBalance -= actualStaffSalary;

            sd.salary = actualStaffSalary;

            emit TokenClaimed(msg.sender, sd.salary);
            } 
        }

        sd.claimed = true;

    }


    // @notice this function is used to check if the staff have been paid at the end of the month
    function checkIfPaid(address _staffAddress) public view returns (bool) {
        StaffDetails memory sd = isStaff[_staffAddress];
        if (!sd.claimed) {
            return false;
        } else {
            return true;
        }
    }

    // @notice this function is used to check for the details of the staff
    function checkStaff(address _staffAddress) public view returns(StaffDetails memory aStaff){

        aStaff = isStaff[_staffAddress];
    }

   
    // @notice this function is used to blacklist a staff address incase of staff resignation or sack from the company
    function addBlackList(address badStaff) external onlyOwner{
        if(badStaff == address(0x0)){
            
            revert("Invalid Staff Address");
        }
        if(!isBlackListed[badStaff]){

            isBlackListed[badStaff] = true;
        }
        revert ("Staff BlackListed");

    }

    // @notice this function is used to change the admin of the contract to a new address
    function updateAdmin(address newAdmin) external onlyOwner{
        assert(newAdmin != address(0x0));
        admin = newAdmin;
    }
         
    



}