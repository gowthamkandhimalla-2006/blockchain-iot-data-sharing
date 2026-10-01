const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const {
    createPublicClient,
    createWalletClient,
    http,
    defineChain
} = require("viem");

const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// ============================================================
// CONFIGURATION
// ============================================================

const PORT = 5000;
const RPC_URL = "http://127.0.0.1:8545";

const contractAddress =
    "0x5fbdb2315678afecb367f032d93f642f64180aa3";

// ============================================================
// HARDHAT LOCAL CHAIN
// ============================================================

const hardhatChain = defineChain({
    id: 31337,
    name: "Hardhat Local",
    nativeCurrency: {
        name: "Ether",
        symbol: "ETH",
        decimals: 18
    },
    rpcUrls: {
        default: {
            http: [RPC_URL]
        }
    }
});

// ============================================================
// AES-256-GCM KEY
// ============================================================

const AES_KEY = crypto
    .createHash("sha256")
    .update("blockchain-iot-secure-key")
    .digest();

// ============================================================
// ENCRYPT DATA
// ============================================================

function encryptData(data) {
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(
        "aes-256-gcm",
        AES_KEY,
        iv
    );

    let encrypted = cipher.update(
        data,
        "utf8",
        "base64"
    );

    encrypted += cipher.final("base64");

    const authTag = cipher.getAuthTag();

    return (
        iv.toString("base64") +
        ":" +
        authTag.toString("base64") +
        ":" +
        encrypted
    );
}

// ============================================================
// DECRYPT DATA
// ============================================================

function decryptData(encryptedData) {
    const parts = encryptedData.split(":");

    if (parts.length !== 3) {
        throw new Error("Invalid encrypted data format");
    }

    const iv = Buffer.from(parts[0], "base64");
    const authTag = Buffer.from(parts[1], "base64");
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        AES_KEY,
        iv
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(
        encrypted,
        "base64",
        "utf8"
    );

    decrypted += decipher.final("utf8");

    return decrypted;
}

// ============================================================
// LOAD SMART CONTRACT ABI
// ============================================================

const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "IoTDataSharing.sol",
    "IoTDataSharing.json"
);

if (!fs.existsSync(artifactPath)) {
    console.error("ERROR: Smart contract artifact not found:");
    console.error(artifactPath);
    process.exit(1);
}

const contractArtifact = JSON.parse(
    fs.readFileSync(artifactPath, "utf8")
);

const contractABI = contractArtifact.abi;

// ============================================================
// BLOCKCHAIN CLIENT
// ============================================================

const publicClient = createPublicClient({
    chain: hardhatChain,
    transport: http(RPC_URL)
});

// ============================================================
// GET HARDHAT WALLET
// ============================================================

async function getWalletClient() {
    const accounts = await publicClient.request({
        method: "eth_accounts"
    });

    if (!accounts || accounts.length === 0) {
        throw new Error(
            "No Hardhat accounts found. Make sure npx hardhat node is running."
        );
    }

    const account = accounts[0];

    const walletClient = createWalletClient({
        account,
        chain: hardhatChain,
        transport: http(RPC_URL)
    });

    return {
        walletClient,
        account
    };
}

// ============================================================
// ROOT
// ============================================================

app.get("/", async (req, res) => {
    try {
        const blockNumber =
            await publicClient.getBlockNumber();

        res.json({
            success: true,
            message:
                "Blockchain-Based Secure IoT Data Sharing System",
            backend: "Node.js + Express",
            blockchain: "Hardhat Local Ethereum Network",
            security: [
                "Role-Based Access Control",
                "AES-256-GCM Encryption",
                "SHA-256 Hashing"
            ],
            contractAddress,
            latestBlock: blockNumber.toString(),
            endpoints: {
                project: "GET /project",
                blockchain: "GET /blockchain",
                admin: "GET /admin",
                authorization:
                    "GET /authorization/:address",
                authorizeUser:
                    "POST /authorize-user",
                revokeUser:
                    "POST /revoke-user",
                storeIoTData:
                    "POST /iot-data",
                getIoTData:
                    "GET /iot-data",
                verifyData:
                    "GET /verify/:index"
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================
// GET PROJECT NAME
// ============================================================

app.get("/project", async (req, res) => {
    try {
        const projectName =
            await publicClient.readContract({
                address: contractAddress,
                abi: contractABI,
                functionName: "getProjectName"
            });

        res.json({
            success: true,
            projectName
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================
// BLOCKCHAIN STATUS
// ============================================================

app.get("/blockchain", async (req, res) => {
    try {
        const blockNumber =
            await publicClient.getBlockNumber();

        res.json({
            success: true,
            rpc: RPC_URL,
            contract: contractAddress,
            latestBlock: blockNumber.toString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================
// ADMIN ADDRESS
// ============================================================

app.get("/admin", async (req, res) => {
    try {
        const admin =
            await publicClient.readContract({
                address: contractAddress,
                abi: contractABI,
                functionName: "admin"
            });

        res.json({
            success: true,
            admin
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================
// CHECK USER AUTHORIZATION
// ============================================================

app.get(
    "/authorization/:address",
    async (req, res) => {
        try {
            const address = req.params.address;

            const authorized =
                await publicClient.readContract({
                    address: contractAddress,
                    abi: contractABI,
                    functionName: "authorizedUsers",
                    args: [address]
                });

            res.json({
                success: true,
                address,
                authorized
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// ============================================================
// AUTHORIZE USER
// ============================================================

app.post(
    "/authorize-user",
    async (req, res) => {
        try {
            const { address } = req.body;

            if (!address) {
                return res.status(400).json({
                    success: false,
                    error:
                        "User wallet address is required"
                });
            }

            const {
                walletClient,
                account
            } = await getWalletClient();

            const admin =
                await publicClient.readContract({
                    address: contractAddress,
                    abi: contractABI,
                    functionName: "admin"
                });

            if (
                admin.toLowerCase() !==
                account.toLowerCase()
            ) {
                return res.status(403).json({
                    success: false,
                    error:
                        "Backend account is not the contract admin"
                });
            }

            const hash =
                await walletClient.writeContract({
                    address: contractAddress,
                    abi: contractABI,
                    functionName: "authorizeUser",
                    args: [address]
                });

            const receipt =
                await publicClient.waitForTransactionReceipt({
                    hash
                });

            res.json({
                success: true,
                message:
                    "User authorized successfully",
                user: address,
                transactionHash: hash,
                blockNumber:
                    receipt.blockNumber.toString()
            });
        } catch (error) {
            console.error(
                "AUTHORIZE USER ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// ============================================================
// REVOKE USER
// ============================================================

app.post(
    "/revoke-user",
    async (req, res) => {
        try {
            const { address } = req.body;

            if (!address) {
                return res.status(400).json({
                    success: false,
                    error:
                        "User wallet address is required"
                });
            }

            const {
                walletClient,
                account
            } = await getWalletClient();

            const admin =
                await publicClient.readContract({
                    address: contractAddress,
                    abi: contractABI,
                    functionName: "admin"
                });

            if (
                admin.toLowerCase() !==
                account.toLowerCase()
            ) {
                return res.status(403).json({
                    success: false,
                    error:
                        "Backend account is not the contract admin"
                });
            }

            const hash =
                await walletClient.writeContract({
                    address: contractAddress,
                    abi: contractABI,
                    functionName: "revokeUser",
                    args: [address]
                });

            const receipt =
                await publicClient.waitForTransactionReceipt({
                    hash
                });

            res.json({
                success: true,
                message:
                    "User revoked successfully",
                user: address,
                transactionHash: hash,
                blockNumber:
                    receipt.blockNumber.toString()
            });
        } catch (error) {
            console.error(
                "REVOKE USER ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// ============================================================
// STORE IoT DATA
// ============================================================

app.post(
    "/iot-data",
    async (req, res) => {
        try {
            const {
                deviceId,
                temperature,
                humidity
            } = req.body;

            // ------------------------------------------------
            // VALIDATION
            // ------------------------------------------------

            if (!deviceId) {
                return res.status(400).json({
                    success: false,
                    error: "deviceId is required"
                });
            }

            if (
                temperature === undefined ||
                temperature === null
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "temperature is required"
                });
            }

            if (
                humidity === undefined ||
                humidity === null
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "humidity is required"
                });
            }

            const temperatureNumber =
                Number(temperature);

            const humidityNumber =
                Number(humidity);

            if (
                !Number.isFinite(
                    temperatureNumber
                )
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "temperature must be a number"
                });
            }

            if (
                !Number.isFinite(
                    humidityNumber
                )
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "humidity must be a number"
                });
            }

            // ------------------------------------------------
            // CREATE DATA OBJECT
            // ------------------------------------------------

            const dataObject = {
                deviceId: String(deviceId),
                temperature: temperatureNumber,
                humidity: humidityNumber
            };

            const originalData =
                JSON.stringify(dataObject);

            // ------------------------------------------------
            // SHA-256 HASH
            // ------------------------------------------------

            const dataHash =
                "0x" +
                crypto
                    .createHash("sha256")
                    .update(
                        originalData,
                        "utf8"
                    )
                    .digest("hex");

            // ------------------------------------------------
            // AES-256-GCM ENCRYPTION
            // ------------------------------------------------

            const encryptedData =
                encryptData(originalData);

            // ------------------------------------------------
            // GET BACKEND WALLET
            // ------------------------------------------------

            const {
                walletClient,
                account
            } = await getWalletClient();

            // ------------------------------------------------
            // CHECK AUTHORIZATION
            // ------------------------------------------------

            const authorized =
                await publicClient.readContract({
                    address: contractAddress,
                    abi: contractABI,
                    functionName:
                        "authorizedUsers",
                    args: [account]
                });

            const admin =
                await publicClient.readContract({
                    address: contractAddress,
                    abi: contractABI,
                    functionName: "admin"
                });

            const isAdmin =
                admin.toLowerCase() ===
                account.toLowerCase();

            if (!authorized && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    error:
                        "Backend account is not authorized to store IoT data",
                    account
                });
            }

            // ------------------------------------------------
            // STORE DATA ON BLOCKCHAIN
            // ------------------------------------------------

            const transactionHash =
                await walletClient.writeContract({
                    address: contractAddress,
                    abi: contractABI,
                    functionName:
                        "storeIoTData",
                    args: [
                        String(deviceId),
                        dataHash,
                        encryptedData
                    ]
                });

            // ------------------------------------------------
            // WAIT FOR TRANSACTION
            // ------------------------------------------------

            const receipt =
                await publicClient.waitForTransactionReceipt({
                    hash: transactionHash
                });

            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            res.json({
                success: true,
                message:
                    "IoT data securely stored on blockchain",
                deviceId:
                    String(deviceId),
                temperature:
                    temperatureNumber,
                humidity:
                    humidityNumber,
                dataHash,
                encrypted: true,
                encryption:
                    "AES-256-GCM",
                hashing:
                    "SHA-256",
                sender: account,
                transactionHash,
                blockNumber:
                    receipt.blockNumber.toString()
            });

        } catch (error) {
            console.error(
                "IoT DATA ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// ============================================================
// GET ALL IoT DATA
// ============================================================

app.get(
    "/iot-data",
    async (req, res) => {
        try {
            const count =
                await publicClient.readContract({
                    address: contractAddress,
                    abi: contractABI,
                    functionName:
                        "getIoTDataCount"
                });

            const records = [];

            for (
                let i = 0;
                i < Number(count);
                i++
            ) {
                const data =
                    await publicClient.readContract({
                        address: contractAddress,
                        abi: contractABI,
                        functionName:
                            "getIoTData",
                        args: [BigInt(i)]
                    });

                const [
                    deviceId,
                    timestamp,
                    sender,
                    dataHash,
                    encryptedData
                ] = data;

                let decryptedData;

                try {
                    decryptedData =
                        JSON.parse(
                            decryptData(
                                encryptedData
                            )
                        );
                } catch (error) {
                    decryptedData = {
                        error:
                            "Unable to decrypt data"
                    };
                }

                records.push({
                    index: i,
                    deviceId,
                    timestamp:
                        timestamp.toString(),
                    sender,
                    blockchainHash:
                        dataHash,
                    encryptedData,
                    data: decryptedData
                });
            }

            res.json({
                success: true,
                count: Number(count),
                records
            });

        } catch (error) {
            console.error(
                "GET IoT DATA ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// ============================================================
// VERIFY IoT DATA
// ============================================================

app.get(
    "/verify/:index",
    async (req, res) => {
        try {
            // ------------------------------------------------
            // VALIDATE INDEX
            // ------------------------------------------------

            const index =
                Number(req.params.index);

            if (
                !Number.isInteger(index) ||
                index < 0
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Invalid data index"
                });
            }

            // ------------------------------------------------
            // GET RECORD COUNT
            // ------------------------------------------------

            const count =
                await publicClient.readContract({
                    address: contractAddress,
                    abi: contractABI,
                    functionName:
                        "getIoTDataCount"
                });

            if (index >= Number(count)) {
                return res.status(404).json({
                    success: false,
                    error:
                        "IoT data record not found",
                    availableRecords:
                        Number(count)
                });
            }

            // ------------------------------------------------
            // GET DATA FROM BLOCKCHAIN
            // ------------------------------------------------

            const data =
                await publicClient.readContract({
                    address: contractAddress,
                    abi: contractABI,
                    functionName:
                        "getIoTData",
                    args: [BigInt(index)]
                });

            const [
                deviceId,
                timestamp,
                sender,
                blockchainHash,
                encryptedData
            ] = data;

            // ------------------------------------------------
            // DECRYPT DATA
            // ------------------------------------------------

            const decryptedString =
                decryptData(encryptedData);

            const decryptedData =
                JSON.parse(decryptedString);

            // ------------------------------------------------
            // RECONSTRUCT ORIGINAL DATA
            // ------------------------------------------------

            const reconstructedData = {
                deviceId:
                    String(
                        decryptedData.deviceId
                    ),
                temperature:
                    Number(
                        decryptedData.temperature
                    ),
                humidity:
                    Number(
                        decryptedData.humidity
                    )
            };

            const reconstructedString =
                JSON.stringify(
                    reconstructedData
                );

            // ------------------------------------------------
            // CALCULATE SHA-256 AGAIN
            // ------------------------------------------------

            const calculatedHash =
                "0x" +
                crypto
                    .createHash("sha256")
                    .update(
                        reconstructedString,
                        "utf8"
                    )
                    .digest("hex");

            // ------------------------------------------------
            // COMPARE HASHES
            // ------------------------------------------------

            const hashMatch =
                blockchainHash.toLowerCase() ===
                calculatedHash.toLowerCase();

            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            res.json({
                success: true,
                verified: hashMatch,
                hashMatch,
                index,
                deviceId,
                timestamp:
                    timestamp.toString(),
                sender,
                blockchainHash,
                calculatedHash,
                data: decryptedData,
                message:
                    hashMatch
                        ? "Data is authentic and has not been modified"
                        : "WARNING: Data integrity verification failed"
            });

        } catch (error) {
            console.error(
                "VERIFY ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
    console.log(
        "========================================"
    );

    console.log(
        "Blockchain IoT Backend Server"
    );

    console.log(
        "========================================"
    );

    console.log(
        "Backend server running on http://localhost:" +
        PORT
    );

    console.log(
        "Security: RBAC + AES-256-GCM + SHA-256"
    );

    console.log(
        "Blockchain RPC: " +
        RPC_URL
    );

    console.log(
        "Contract: " +
        contractAddress
    );

    console.log(
        "========================================"
    );
});