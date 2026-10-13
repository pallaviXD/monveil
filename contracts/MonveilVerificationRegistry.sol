// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MonveilVerificationRegistry
 * @notice Privacy-preserving on-chain verification registry and settlement coordinator for Monveil.
 * @dev Commits zero-knowledge-ready SHA-256 / keccak256 hashes of verification reports and bills off-chain.
 *      Never stores sensitive receipt contents (line items, customer notes, raw PII) on-chain.
 *      Supports native MON and Agora AUSD ERC-20 atomic settlement.
 */

interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract MonveilVerificationRegistry {
    enum ResultCode {
        Unknown, // 0
        Safe,    // 1 - All 5 Guardian checks passed
        Review,  // 2 - Discrepancy flagged for manual review
        Blocked  // 3 - Signature mismatch, tampered amount, replay, or policy breach
    }

    struct VerificationReceipt {
        bytes32 reportHash;      // keccak256 hash of the off-chain verification audit report
        ResultCode resultCode;   // Verdict code
        uint256 amountPaise;     // Exact monetary amount in integer paise (1 INR = 100 paise)
        address merchant;        // Merchant settlement address
        address payer;           // Payer address
        uint256 timestamp;       // Block timestamp
        bytes32 billIdHash;      // keccak256(bytes(billId)) for replay protection
        bool exists;             // Existence guard
    }

    address public owner;
    bool public paused;

    // billIdHash => VerificationReceipt
    mapping(bytes32 => VerificationReceipt) private _receipts;

    // billIdHash => replay prevention flag
    mapping(bytes32 => bool) public isRecorded;

    // Statistics
    uint256 public totalReceiptsCount;
    uint256 public totalSettledAmountPaise;

    // Events for Envio HyperIndex and client monitoring
    event ReceiptRecorded(
        bytes32 indexed billIdHash,
        bytes32 indexed reportHash,
        address indexed payer,
        address merchant,
        ResultCode resultCode,
        uint256 amountPaise,
        uint256 timestamp
    );

    event PaymentSettled(
        bytes32 indexed billIdHash,
        address indexed payer,
        address indexed merchant,
        address settlementToken,
        uint256 tokenAmount,
        bytes32 reportHash,
        uint256 timestamp
    );

    event PausedStateChanged(bool isPaused);

    modifier onlyOwner() {
        require(msg.sender == owner, "Monveil: caller is not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Monveil: contract is paused");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedStateChanged(_paused);
    }

    /**
     * @notice Records an off-chain verified receipt without moving funds on-chain.
     * @param billId The unique off-chain bill identifier (e.g. MV-HONEST-001)
     * @param reportHash keccak256 digest of the canonical verification report
     * @param resultCode 1: Safe, 2: Review, 3: Blocked
     * @param amountPaise Monetary total in paise
     * @param merchant Destination merchant address
     */
    function recordReceipt(
        string calldata billId,
        bytes32 reportHash,
        ResultCode resultCode,
        uint256 amountPaise,
        address merchant
    ) external whenNotPaused returns (bytes32 billIdHash) {
        require(bytes(billId).length > 0, "Monveil: empty billId");
        require(reportHash != bytes32(0), "Monveil: invalid reportHash");
        require(merchant != address(0), "Monveil: invalid merchant");
        require(resultCode != ResultCode.Unknown, "Monveil: invalid resultCode");

        billIdHash = keccak256(bytes(billId));
        require(!isRecorded[billIdHash], "Monveil: bill already recorded (replay prevented)");

        _receipts[billIdHash] = VerificationReceipt({
            reportHash: reportHash,
            resultCode: resultCode,
            amountPaise: amountPaise,
            merchant: merchant,
            payer: msg.sender,
            timestamp: block.timestamp,
            billIdHash: billIdHash,
            exists: true
        });

        isRecorded[billIdHash] = true;
        totalReceiptsCount += 1;

        emit ReceiptRecorded(
            billIdHash,
            reportHash,
            msg.sender,
            merchant,
            resultCode,
            amountPaise,
            block.timestamp
        );
    }

    /**
     * @notice Settle payment using an ERC-20 token (such as Agora AUSD) and record the verified receipt atomically.
     * @dev Payer must approve this contract prior to invocation.
     */
    function settleWithToken(
        string calldata billId,
        bytes32 reportHash,
        address settlementToken,
        uint256 tokenAmount,
        uint256 amountPaise,
        address merchant
    ) external whenNotPaused returns (bytes32 billIdHash) {
        require(bytes(billId).length > 0, "Monveil: empty billId");
        require(reportHash != bytes32(0), "Monveil: invalid reportHash");
        require(settlementToken != address(0), "Monveil: invalid token");
        require(merchant != address(0), "Monveil: invalid merchant");
        require(tokenAmount > 0, "Monveil: zero token amount");

        billIdHash = keccak256(bytes(billId));
        require(!isRecorded[billIdHash], "Monveil: bill already recorded (replay prevented)");

        // Atomic settlement transfer
        bool success = IERC20Minimal(settlementToken).transferFrom(msg.sender, merchant, tokenAmount);
        require(success, "Monveil: token settlement transfer failed");

        _receipts[billIdHash] = VerificationReceipt({
            reportHash: reportHash,
            resultCode: ResultCode.Safe,
            amountPaise: amountPaise,
            merchant: merchant,
            payer: msg.sender,
            timestamp: block.timestamp,
            billIdHash: billIdHash,
            exists: true
        });

        isRecorded[billIdHash] = true;
        totalReceiptsCount += 1;
        totalSettledAmountPaise += amountPaise;

        emit ReceiptRecorded(
            billIdHash,
            reportHash,
            msg.sender,
            merchant,
            ResultCode.Safe,
            amountPaise,
            block.timestamp
        );

        emit PaymentSettled(
            billIdHash,
            msg.sender,
            merchant,
            settlementToken,
            tokenAmount,
            reportHash,
            block.timestamp
        );
    }

    /**
     * @notice Settle payment using Monad native MON currency and record verified receipt atomically.
     */
    function settleWithNative(
        string calldata billId,
        bytes32 reportHash,
        uint256 amountPaise,
        address payable merchant
    ) external payable whenNotPaused returns (bytes32 billIdHash) {
        require(bytes(billId).length > 0, "Monveil: empty billId");
        require(reportHash != bytes32(0), "Monveil: invalid reportHash");
        require(merchant != address(0), "Monveil: invalid merchant");
        require(msg.value > 0, "Monveil: zero native value sent");

        billIdHash = keccak256(bytes(billId));
        require(!isRecorded[billIdHash], "Monveil: bill already recorded (replay prevented)");

        // Native transfer
        (bool sent, ) = merchant.call{value: msg.value}("");
        require(sent, "Monveil: native payment transfer failed");

        _receipts[billIdHash] = VerificationReceipt({
            reportHash: reportHash,
            resultCode: ResultCode.Safe,
            amountPaise: amountPaise,
            merchant: merchant,
            payer: msg.sender,
            timestamp: block.timestamp,
            billIdHash: billIdHash,
            exists: true
        });

        isRecorded[billIdHash] = true;
        totalReceiptsCount += 1;
        totalSettledAmountPaise += amountPaise;

        emit ReceiptRecorded(
            billIdHash,
            reportHash,
            msg.sender,
            merchant,
            ResultCode.Safe,
            amountPaise,
            block.timestamp
        );

        emit PaymentSettled(
            billIdHash,
            msg.sender,
            merchant,
            address(0), // Native coin representation
            msg.value,
            reportHash,
            block.timestamp
        );
    }

    function getReceipt(string calldata billId) external view returns (
        bytes32 reportHash,
        ResultCode resultCode,
        uint256 amountPaise,
        address merchant,
        address payer,
        uint256 timestamp,
        bytes32 billIdHash,
        bool exists
    ) {
        bytes32 hash = keccak256(bytes(billId));
        VerificationReceipt memory r = _receipts[hash];
        return (r.reportHash, r.resultCode, r.amountPaise, r.merchant, r.payer, r.timestamp, r.billIdHash, r.exists);
    }

    function hasReceipt(string calldata billId) external view returns (bool) {
        return isRecorded[keccak256(bytes(billId))];
    }
}
